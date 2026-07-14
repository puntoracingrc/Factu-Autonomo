export const AEAT_SUPPORTED_TAX_FORM_CODES = [
  "115",
  "130",
  "131",
  "303",
] as const;

export type AeatSupportedTaxFormCode =
  (typeof AEAT_SUPPORTED_TAX_FORM_CODES)[number];

export interface AeatTaxFormCandidate {
  modelCode: AeatSupportedTaxFormCode | "UNKNOWN";
  status: "RESOLVED" | "REVIEW_REQUIRED" | "BLOCKED";
  isSubmitted: boolean;
  taxYear?: number;
  period?: string;
  receiptNumber?: string;
  warnings: string[];
}

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

function detectModel(value: string): AeatTaxFormCandidate["modelCode"] {
  const hasLayout = value.includes("NIF") && value.includes("EJERCICIO");
  if (!hasLayout) return "UNKNOWN";
  if (
    /\bMODELO\s*115\b/.test(value) &&
    value.includes("RETENCIONES E INGRESOS A CUENTA") &&
    /ARRENDAMIENTO|INMUEBLES URBANOS/.test(value)
  ) {
    return "115";
  }
  if (
    /\bMODELO\s*130\b/.test(value) &&
    value.includes("PAGO FRACCIONADO") &&
    value.includes("ESTIMACION DIRECTA")
  ) {
    return "130";
  }
  if (
    /\bMODELO\s*131\b/.test(value) &&
    value.includes("PAGO FRACCIONADO") &&
    value.includes("ESTIMACION OBJETIVA")
  ) {
    return "131";
  }
  if (
    /\bMODELO\s*303\b/.test(value) &&
    value.includes("IMPUESTO SOBRE EL VALOR ANADIDO") &&
    value.includes("AUTOLIQUIDACION")
  ) {
    return "303";
  }
  return "UNKNOWN";
}

export function parseAeatTaxFormText(text: string): AeatTaxFormCandidate {
  const value = normalize(text.slice(0, 250_000));
  const modelCode = detectModel(value);
  if (modelCode === "UNKNOWN") {
    return {
      modelCode,
      status: "BLOCKED",
      isSubmitted: false,
      warnings: [
        "El archivo no coincide con una plantilla compatible de los modelos 115, 130, 131 o 303.",
      ],
    };
  }

  const yearMatch = value.match(/\bEJERCICIO\s*[:.\-]?\s*(20\d{2})\b/);
  const periodMatch = value.match(
    /\bPERIODO\s*[:.\-]?\s*(0A|[1-4]T|0[1-9]|1[0-2])\b/,
  );
  const receiptMatch = value.match(
    /\b(?:N(?:UMERO|O)?\.?\s+DE\s+)?JUSTIFICANTE\s*[:.\-]?\s*(\d{10,16})\b/,
  );
  const isSubmitted =
    Boolean(receiptMatch) ||
    /\bFECHA\s+DE\s+PRESENTACION\s*[:.\-]?\s*\d{2}[\/-]\d{2}[\/-]20\d{2}\b/.test(
      value,
    ) ||
    /\bCODIGO\s+SEGURO\s+DE\s+VERIFICACION\b/.test(value);
  const warnings = [
    isSubmitted
      ? `Los datos leídos del modelo ${modelCode} corresponden al período indicado; confirma que quieres usarlos en el cuestionario.`
      : `Se reconoce la plantilla del modelo ${modelCode}, pero no una presentación cumplimentada; no se propondrán respuestas a partir de una plantilla vacía.`,
  ];
  if (!yearMatch || !periodMatch) {
    warnings.push(
      "No se han podido leer con seguridad el ejercicio y el período; revisa el documento antes de usarlo como evidencia.",
    );
  }

  return {
    modelCode,
    status:
      yearMatch && periodMatch && isSubmitted ? "RESOLVED" : "REVIEW_REQUIRED",
    isSubmitted,
    ...(yearMatch ? { taxYear: Number(yearMatch[1]) } : {}),
    ...(periodMatch ? { period: periodMatch[1] } : {}),
    ...(receiptMatch ? { receiptNumber: receiptMatch[1] } : {}),
    warnings,
  };
}
