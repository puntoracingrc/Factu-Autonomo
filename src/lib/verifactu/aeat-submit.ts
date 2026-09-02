import * as https from "node:https";
import {
  getOfficialAeatEndpointUrl,
  isOfficialAeatPreproductionEndpoint,
  type AeatCertificateChannel,
  type VerifactuCertificateConfig,
} from "./config";
import { AEAT_VERIFACTU_NAMESPACES } from "./constants";
import { stripXmlDeclaration } from "./xml";

const AEAT_SUBMIT_TIMEOUT_MS = 30_000;
const AEAT_MAX_RESPONSE_BYTES = 2 * 1024 * 1024;

export type AeatSubmitOutcome =
  | "accepted"
  | "accepted_with_errors"
  | "accepted_duplicate"
  | "rejected"
  | "delivery_unknown"
  | "not_sent";

export interface AeatSubmitResult {
  ok: boolean;
  outcome: AeatSubmitOutcome;
  httpStatus?: number;
  csv?: string;
  estadoEnvio?: string;
  estadoRegistro?: string;
  duplicateState?: string;
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
  const duplicateState = readXmlTag(
    input.rawResponse,
    "EstadoRegistroDuplicado",
  );
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
  const normalizedDuplicate = normalizeStatus(duplicateState);
  const envioOk =
    normalizedEnvio === "correcto" || normalizedEnvio === "correcta";
  const envioAccepted =
    envioOk || normalizedEnvio === "parcialmentecorrecto";
  const registroOk =
    normalizedRegistro === "correcta" ||
    normalizedRegistro === "correcto";
  const registroAcceptedWithErrors = [
    "aceptadoconerrores",
    "aceptadaconerrores",
  ].includes(normalizedRegistro);
  const duplicateConfirmsCleanPriorRecord = [
    "correcta",
    "correcto",
    "anulada",
    "anulado",
  ].includes(normalizedDuplicate);
  const duplicateConfirmsPriorRecordWithErrors = [
    "aceptadaconerrores",
    "aceptadoconerrores",
  ].includes(normalizedDuplicate);
  const httpOk = input.statusCode >= 200 && input.statusCode < 300;
  const acceptedDuplicate =
    httpOk &&
    Boolean(csv) &&
    envioAccepted &&
    duplicateConfirmsCleanPriorRecord;
  const acceptedWithErrors =
    httpOk &&
    Boolean(csv) &&
    envioAccepted &&
    (registroAcceptedWithErrors || duplicateConfirmsPriorRecordWithErrors);
  const accepted =
    httpOk && Boolean(csv) && envioOk && registroOk && !fault;
  const hasDefinitiveAeatResponse = Boolean(
    fault || normalizedEnvio || normalizedRegistro || errorCode || errorMessage,
  );
  const outcome: AeatSubmitOutcome = acceptedDuplicate
    ? "accepted_duplicate"
    : accepted
      ? "accepted"
      : acceptedWithErrors
        ? "accepted_with_errors"
        : hasDefinitiveAeatResponse
          ? "rejected"
          : "delivery_unknown";

  return {
    ok: outcome === "accepted" || outcome === "accepted_duplicate",
    outcome,
    httpStatus: input.statusCode,
    ...(csv ? { csv } : {}),
    ...(estadoEnvio ? { estadoEnvio } : {}),
    ...(estadoRegistro ? { estadoRegistro } : {}),
    ...(duplicateState ? { duplicateState } : {}),
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
  const pfx = Buffer.from(input.certificate.p12Base64, "base64");

  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (action: () => void) => {
      if (settled) return;
      settled = true;
      pfx.fill(0);
      action();
    };
    const request = https.request(
      url,
      {
        method: "POST",
        pfx,
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
        let receivedBytes = 0;
        response.on("data", (chunk: Buffer) => {
          receivedBytes += chunk.byteLength;
          if (receivedBytes > AEAT_MAX_RESPONSE_BYTES) {
            response.destroy(new Error("AEAT_RESPONSE_TOO_LARGE"));
            return;
          }
          chunks.push(chunk);
        });
        response.on("end", () => {
          finish(() =>
            resolve({
              statusCode: response.statusCode ?? 0,
              rawResponse: Buffer.concat(chunks).toString("utf8"),
            }),
          );
        });
        response.on("error", (error) => finish(() => reject(error)));
      },
    );

    request.setTimeout(input.timeoutMs ?? AEAT_SUBMIT_TIMEOUT_MS, () => {
      request.destroy(new Error("Tiempo de espera agotado con AEAT"));
    });
    request.on("error", (error) => finish(() => reject(error)));
    request.write(body);
    request.end();
  });
}

export async function submitRegistroToAeatPreproduction(input: {
  xml: string;
  certificate: VerifactuCertificateConfig;
  certificateChannel: AeatCertificateChannel;
  endpointUrl?: string;
  timeoutMs?: number;
  post?: typeof postSoapWithMutualTls;
}): Promise<AeatSubmitResult> {
  const endpointUrl =
    input.endpointUrl ??
    getOfficialAeatEndpointUrl("test", input.certificateChannel);
  if (
    endpointUrl !==
      getOfficialAeatEndpointUrl("test", input.certificateChannel) ||
    !isOfficialAeatPreproductionEndpoint(endpointUrl)
  ) {
    return {
      ok: false,
      outcome: "not_sent",
      errorCode: "INVALID_AEAT_PREPRODUCTION_ENDPOINT",
      errorMessage: "El destino AEAT de preproducción no es válido.",
    };
  }

  try {
    const response = await (input.post ?? postSoapWithMutualTls)({
      endpointUrl,
      envelope: buildVerifactuSoapEnvelope(input.xml),
      certificate: input.certificate,
      timeoutMs: input.timeoutMs,
    });
    const parsed = parseAeatSubmitResponse(response);
    if (!parsed.ok && !parsed.errorMessage) {
      return {
        ...parsed,
        errorMessage:
          parsed.outcome === "delivery_unknown"
            ? "AEAT respondió sin un resultado verificable. El envío queda pendiente de confirmación."
            : `AEAT devolvió HTTP ${response.statusCode}.`,
      };
    }
    return parsed;
  } catch {
    return {
      ok: false,
      outcome: "delivery_unknown",
      errorCode: "AEAT_TRANSPORT_ERROR",
      errorMessage:
        "No se pudo confirmar la respuesta de AEAT. Se conservará el mismo registro para reintentarlo.",
    };
  }
}
