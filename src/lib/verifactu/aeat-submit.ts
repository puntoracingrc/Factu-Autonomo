import * as https from "node:https";
import {
  getAeatEndpointUrl,
  getServerVerifactuEnvironment,
  getVerifactuCertificateConfig,
  isAeatSubmitConfigured,
  type VerifactuCertificateConfig,
} from "./config";
import { AEAT_VERIFACTU_NAMESPACES } from "./constants";
import type { VerifactuEnvironment } from "./types";
import { stripXmlDeclaration } from "./xml";

const AEAT_SUBMIT_TIMEOUT_MS = 30_000;

export interface AeatSubmitResult {
  ok: boolean;
  csv?: string;
  estadoEnvio?: string;
  estadoRegistro?: string;
  errorCode?: string;
  errorMessage?: string;
  rawResponse?: string;
}

interface SoapPostResult {
  statusCode: number;
  rawResponse: string;
}

export function buildVerifactuSoapEnvelope(xml: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="${AEAT_VERIFACTU_NAMESPACES.soapEnvelope}" xmlns:sum="${AEAT_VERIFACTU_NAMESPACES.suministroLR}" xmlns:sum1="${AEAT_VERIFACTU_NAMESPACES.suministroInformacion}" xmlns:xd="${AEAT_VERIFACTU_NAMESPACES.xmlSignature}">
  <soapenv:Header/>
  <soapenv:Body>
    ${stripXmlDeclaration(xml).trim()}
  </soapenv:Body>
</soapenv:Envelope>`;
}

function decodeXmlText(value: string): string {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .trim();
}

function readXmlTag(xml: string, tagName: string): string | undefined {
  const match = xml.match(
    new RegExp(
      `<(?:[\\w.-]+:)?${tagName}\\b[^>]*>([\\s\\S]*?)</(?:[\\w.-]+:)?${tagName}>`,
      "i",
    ),
  );
  return match?.[1] ? decodeXmlText(match[1]) : undefined;
}

function normalizeStatus(value: string | undefined): string {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "")
    .toLowerCase();
}

export function parseAeatSubmitResponse(input: {
  statusCode: number;
  rawResponse: string;
}): AeatSubmitResult {
  const csv = readXmlTag(input.rawResponse, "CSV");
  const estadoEnvio = readXmlTag(input.rawResponse, "EstadoEnvio");
  const estadoRegistro = readXmlTag(input.rawResponse, "EstadoRegistro");
  const fault = readXmlTag(input.rawResponse, "faultstring");
  const errorCode =
    readXmlTag(input.rawResponse, "CodigoErrorRegistro") ??
    readXmlTag(input.rawResponse, "CodigoError");
  const errorMessage =
    fault ??
    readXmlTag(input.rawResponse, "DescripcionErrorRegistro") ??
    readXmlTag(input.rawResponse, "DescripcionError");

  const normalizedEnvio = normalizeStatus(estadoEnvio);
  const normalizedRegistro = normalizeStatus(estadoRegistro);
  const envioOk =
    normalizedEnvio === "correcto" || normalizedEnvio === "correcta";
  const registroOk =
    normalizedRegistro === "correcta" ||
    normalizedRegistro === "correcto";
  const httpOk = input.statusCode >= 200 && input.statusCode < 300;
  const hasPositiveAeatStatus = Boolean(normalizedRegistro && csv);

  return {
    ok: httpOk && hasPositiveAeatStatus && envioOk && registroOk && !fault,
    ...(csv ? { csv } : {}),
    ...(estadoEnvio ? { estadoEnvio } : {}),
    ...(estadoRegistro ? { estadoRegistro } : {}),
    ...(errorCode ? { errorCode } : {}),
    ...(errorMessage ? { errorMessage } : {}),
    rawResponse: input.rawResponse,
  };
}

export async function postSoapWithMutualTls(input: {
  endpointUrl: string;
  envelope: string;
  certificate: VerifactuCertificateConfig;
  timeoutMs?: number;
}): Promise<SoapPostResult> {
  const url = new URL(input.endpointUrl);
  const body = Buffer.from(input.envelope, "utf8");

  return new Promise((resolve, reject) => {
    const request = https.request(
      url,
      {
        method: "POST",
        pfx: Buffer.from(input.certificate.p12Base64, "base64"),
        passphrase: input.certificate.password,
        headers: {
          Accept: "text/xml",
          "Content-Type": "text/xml; charset=utf-8",
          "Content-Length": body.byteLength,
          SOAPAction: '""',
        },
      },
      (response) => {
        const chunks: Buffer[] = [];
        response.on("data", (chunk: Buffer) => chunks.push(chunk));
        response.on("end", () => {
          resolve({
            statusCode: response.statusCode ?? 0,
            rawResponse: Buffer.concat(chunks).toString("utf8"),
          });
        });
      },
    );

    request.setTimeout(input.timeoutMs ?? AEAT_SUBMIT_TIMEOUT_MS, () => {
      request.destroy(new Error("Tiempo de espera agotado con AEAT"));
    });
    request.on("error", reject);
    request.write(body);
    request.end();
  });
}

export async function submitRegistroToAeat(input: {
  xml: string;
  environment?: VerifactuEnvironment;
}): Promise<AeatSubmitResult> {
  const environment = input.environment ?? getServerVerifactuEnvironment();
  const wantsRealSubmit = process.env.VERIFACTU_AEAT_SUBMIT === "true";
  const certificate = getVerifactuCertificateConfig();

  if (!isAeatSubmitConfigured()) {
    if (wantsRealSubmit && !certificate) {
      return {
        ok: false,
        errorMessage:
          "Envío AEAT activado, pero falta el certificado .p12/.pfx o su contraseña.",
        rawResponse: "AEAT_CERTIFICATE_NOT_CONFIGURED",
      };
    }

    if (environment !== "test") {
      return {
        ok: false,
        errorMessage:
          "Producción AEAT no configurada. Usa el entorno de pruebas.",
        rawResponse: "REAL_AEAT_TRANSPORT_NOT_ENABLED",
      };
    }

    return {
      ok: false,
      errorMessage:
        "El transporte AEAT real no está configurado; no se simula un registro aceptado.",
      rawResponse: "SIMULATED_TEST_MODE_DISABLED",
    };
  }

  if (!certificate) {
    return {
      ok: false,
      errorMessage:
        "Envío AEAT activado, pero falta el certificado .p12/.pfx o su contraseña.",
      rawResponse: "AEAT_CERTIFICATE_NOT_CONFIGURED",
    };
  }

  try {
    const envelope = buildVerifactuSoapEnvelope(input.xml);
    const response = await postSoapWithMutualTls({
      endpointUrl: getAeatEndpointUrl(environment),
      envelope,
      certificate,
    });
    const parsed = parseAeatSubmitResponse(response);
    if (!parsed.ok && !parsed.errorMessage) {
      return {
        ...parsed,
        errorMessage: `AEAT devolvió HTTP ${response.statusCode}.`,
      };
    }
    return parsed;
  } catch (error) {
    return {
      ok: false,
      errorMessage:
        error instanceof Error
          ? error.message
          : "No se pudo conectar con AEAT.",
      rawResponse: "AEAT_TRANSPORT_ERROR",
    };
  }
}
