import {
  emptyFiscalProfileDraft,
  inferTaxpayerTypeFromSpanishTaxId,
  normalizeFiscalActivities,
  normalizeSpanishTaxId,
} from "./profile";
import type {
  CensusCertificateCandidate,
  FiscalActivity,
  FiscalIdentityMatch,
} from "./types";

const MAX_CENSUS_TEXT_CHARS = 250_000;
const MAX_CENSUS_LINES = 8_000;

export interface CensusIdentityReconciliation {
  status: FiscalIdentityMatch | "MISMATCH";
  canConfirm: boolean;
  message: string;
}

function comparable(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanLine(value: string): string {
  return value
    .replace(/\u0000/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function toIsoDate(
  day: string,
  month: string,
  year: string,
): string | undefined {
  const yyyy = Number(year);
  const mm = Number(month);
  const dd = Number(day);
  const date = new Date(Date.UTC(yyyy, mm - 1, dd));
  if (
    date.getUTCFullYear() !== yyyy ||
    date.getUTCMonth() !== mm - 1 ||
    date.getUTCDate() !== dd
  ) {
    return undefined;
  }
  return `${year.padStart(4, "0")}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

function extractDocumentDate(text: string): string | undefined {
  const match = text.match(
    /fecha\s+(?:de\s+)?(?:expedici[oó]n|emisi[oó]n)\s*[:\-]?\s*(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})/i,
  );
  return match ? toIsoDate(match[1], match[2], match[3]) : undefined;
}

function extractCsv(text: string): string | undefined {
  const match = text.match(
    /(?:c[oó]digo\s+seguro\s+de\s+verificaci[oó]n|c\.?\s*s\.?\s*v\.?)\s*[:\-]?\s*([A-Z0-9][A-Z0-9\-]{7,79})/i,
  );
  return match?.[1]?.toUpperCase();
}

function extractNif(lines: string[]): string | null {
  const windows = lines.flatMap((line, index) => [
    line,
    `${line} ${lines[index + 1] ?? ""}`.trim(),
  ]);
  const preferred = windows.filter((line) =>
    /(?:obligado\s+tributario|interesado|titular|datos\s+identificativos)/i.test(
      line,
    ),
  );
  for (const line of [...preferred, ...windows]) {
    if (/agencia\s+estatal\s+de\s+administraci[oó]n\s+tributaria/i.test(line)) {
      continue;
    }
    const match = [
      /n\.?\s*i\.?\s*f\.?\s+del\s+obligado\s+tributario\s*[:\-]?\s+(?:ES\s*)?([A-Z0-9](?:[\s.\-]?[A-Z0-9]){8})/i,
      /n\.?\s*i\.?\s*f\.?\s+del\s+(?:titular|interesado)\s*[:\-]?\s+(?:ES\s*)?([A-Z0-9](?:[\s.\-]?[A-Z0-9]){8})/i,
      /n\.?\s*i\.?\s*f\.?\s+del\s+obligado\s*[:\-]\s*(?:ES\s*)?([A-Z0-9](?:[\s.\-]?[A-Z0-9]){8})/i,
      /(?:n\.?\s*i\.?\s*f\.?|n[uú]mero\s+de\s+identificaci[oó]n\s+fiscal)\s*[:\-]\s*(?:ES\s*)?([A-Z0-9](?:[\s.\-]?[A-Z0-9]){8})/i,
      /^n\.?\s*i\.?\s*f\.?\s+(?:ES\s*)?([A-Z0-9](?:[\s.\-]?[A-Z0-9]){8})$/i,
    ]
      .map((pattern) => line.match(pattern))
      .find(Boolean);
    if (!match) continue;
    const nif = normalizeSpanishTaxId(match[1]);
    if (/^[A-Z0-9]{9}$/.test(nif)) return nif;
  }
  return null;
}

function extractRepeatedFormNif(lines: string[]): string | null {
  const counts = new Map<string, number>();
  for (const line of lines) {
    const nif = normalizeSpanishTaxId(line);
    if (!/^(?:[XYZ]\d{7}[A-Z]|\d{8}[A-Z]|[A-Z]\d{7}[A-Z0-9])$/.test(nif)) {
      continue;
    }
    counts.set(nif, (counts.get(nif) ?? 0) + 1);
  }

  const [mostRepeated] = [...counts.entries()].sort(
    ([leftNif, leftCount], [rightNif, rightCount]) =>
      rightCount - leftCount || leftNif.localeCompare(rightNif),
  )[0] ?? [null, 0];
  return mostRepeated;
}

function parseActivityLine(line: string): FiscalActivity | null {
  const coded = line.match(
    /(?:ep[ií]grafe|grupo|c[oó]digo)(?:\s+(?:del\s+)?i\.?\s*a\.?\s*e\.?)?\s*[:\-]?\s*([A-Z0-9][A-Z0-9./\-]{0,19})(?:\s*[-–—:]\s*(.+))?$/i,
  );
  if (coded) {
    if (coded[1].toUpperCase() === "IAE") return null;
    const description = cleanLine(coded[2] ?? "");
    return {
      code: coded[1].toUpperCase(),
      description,
    };
  }
  const described = line.match(
    /(?:descripci[oó]n\s+de\s+la\s+actividad|actividad\s+econ[oó]mica|actividad\s+principal)\s*[:\-]\s*(.+)$/i,
  );
  if (!described) return null;
  return {
    description: cleanLine(described[1]),
    ...(/actividad\s+principal/i.test(line) ? { isPrimary: true } : {}),
  };
}

function extractActivities(lines: string[]): FiscalActivity[] {
  const activities: FiscalActivity[] = [];
  for (let index = 0; index < lines.length; index += 1) {
    const parsed = parseActivityLine(lines[index]);
    if (!parsed) {
      if (
        /^(?:ep[ií]grafe|grupo|c[oó]digo)(?:\s+(?:del\s+)?i\.?\s*a\.?\s*e\.?)?\s*[:\-]?$/i.test(
          lines[index],
        )
      ) {
        const next = cleanLine(lines[index + 1] ?? "").match(
          /^([A-Z0-9][A-Z0-9./\-]{0,19})(?:\s*[-–—:]\s*(.+))?$/i,
        );
        if (next) {
          const following = parseActivityLine(lines[index + 2] ?? "");
          activities.push({
            code: next[1].toUpperCase(),
            description: cleanLine(next[2] ?? following?.description ?? ""),
          });
          index += following?.description ? 2 : 1;
        }
      }
      continue;
    }
    if (parsed.code && !parsed.description) {
      const next = lines[index + 1]
        ? parseActivityLine(lines[index + 1])
        : null;
      if (next?.description && !next.code) {
        activities.push({ ...parsed, description: next.description });
        index += 1;
        continue;
      }
    }
    activities.push(parsed);
  }
  return normalizeFiscalActivities(activities);
}

function detectDocumentKind(
  normalizedText: string,
): CensusCertificateCandidate["documentKind"] {
  if (
    normalizedText.includes("certificado de situacion censal") ||
    normalizedText.includes("certificacion de situacion censal")
  ) {
    return "AEAT_CENSUS_CERTIFICATE";
  }
  if (
    /\bmodelo(?:\s+|.{0,220}\b)037\b/.test(normalizedText) ||
    (normalizedText.includes("declaracion censal simplificada") &&
      normalizedText.includes(
        "censo de empresarios, profesionales y retenedores",
      ))
  ) {
    return "MODEL_037";
  }
  if (
    /\bmodelo(?:\s+|.{0,220}\b)036\b/.test(normalizedText) ||
    (normalizedText.includes("declaracion censal") &&
      !normalizedText.includes("declaracion censal simplificada") &&
      normalizedText.includes(
        "censo de empresarios, profesionales y retenedores",
      ))
  ) {
    return "MODEL_036";
  }
  return "UNKNOWN";
}

function detectJurisdiction(normalizedText: string) {
  if (/\bterritorio(?:\s+fiscal)?\s*[:\-]?\s*comun\b/.test(normalizedText)) {
    return "ES_COMMON" as const;
  }
  if (
    /(?:territorio\s+fiscal|impuesto\s+indirecto|regimen\s+fiscal)\s*[:\-]?\s*(?:canarias|igic)\b/.test(
      normalizedText,
    )
  ) {
    return "ES_CANARY_IGIC" as const;
  }
  if (
    /(?:territorio\s+fiscal|regimen\s+fiscal)\s*[:\-]?\s*(?:foral\s+de\s+)?navarra\b/.test(
      normalizedText,
    )
  ) {
    return "ES_NAVARRA" as const;
  }
  if (
    /(?:territorio\s+fiscal|regimen\s+fiscal)\s*[:\-]?\s*(?:foral\s+(?:de|del)\s+)?(?:pais\s+vasco|alava|bizkaia|gipuzkoa)\b/.test(
      normalizedText,
    )
  ) {
    return "ES_BASQUE_COUNTRY" as const;
  }
  if (
    /(?:territorio\s+fiscal|impuesto\s+indirecto|regimen\s+fiscal)\s*[:\-]?\s*(?:ceuta|melilla|ipsi)\b/.test(
      normalizedText,
    )
  ) {
    return "ES_CEUTA_MELILLA" as const;
  }
  return "UNKNOWN" as const;
}

function detectExplicitTaxpayerType(normalizedText: string) {
  if (
    /(?:tipo\s+de\s+persona|naturaleza|tipo\s+de\s+contribuyente)\s*[:\-]?\s*(?:persona\s+)?fisica/.test(
      normalizedText,
    )
  ) {
    return "SELF_EMPLOYED_IRPF" as const;
  }
  if (
    /(?:tipo\s+de\s+persona|naturaleza|tipo\s+de\s+contribuyente|forma\s+juridica)\s*[:\-]?\s*(?:persona\s+)?juridica/.test(
      normalizedText,
    ) ||
    /\b(?:sociedad\s+limitada|sociedad\s+anonima)\b/.test(normalizedText)
  ) {
    return "COMPANY_IS" as const;
  }
  return "UNKNOWN" as const;
}

function detectDirectTaxRegime(normalizedText: string) {
  if (normalizedText.includes("estimacion directa simplificada")) {
    return "DIRECT_ESTIMATION_SIMPLIFIED" as const;
  }
  if (normalizedText.includes("estimacion directa normal")) {
    return "DIRECT_ESTIMATION_NORMAL" as const;
  }
  return "UNKNOWN" as const;
}

function detectVat(normalizedText: string) {
  const hasProrata =
    normalizedText.includes("regimen de prorrata") ||
    normalizedText.includes("porcentaje de prorrata");
  const hasExempt =
    normalizedText.includes("actividad exenta de iva") ||
    normalizedText.includes("sin derecho a deduccion de iva") ||
    normalizedText.includes("operaciones exentas de iva");
  const hasGeneral = normalizedText.includes("regimen general de iva");
  const detectedRegimes = [hasProrata, hasExempt, hasGeneral].filter(
    Boolean,
  ).length;

  if (detectedRegimes > 1) {
    return {
      vatRegime: "UNKNOWN" as const,
      vatDeductionRight: "UNKNOWN" as const,
      conflict: true,
    };
  }
  if (hasProrata) {
    return {
      vatRegime: "PRORATA" as const,
      vatDeductionRight: "PARTIAL" as const,
      conflict: false,
    };
  }
  if (hasExempt) {
    return {
      vatRegime: "EXEMPT" as const,
      vatDeductionRight: "NONE" as const,
      conflict: false,
    };
  }
  if (hasGeneral) {
    const fullRight =
      /(?:derecho\s+(?:general\s+)?a\s+(?:la\s+)?deduccion(?:\s+del\s+iva)?|porcentaje\s+de\s+deduccion)\s*[:\-]?\s*100\s*%/.test(
        normalizedText,
      );
    return {
      vatRegime: "GENERAL" as const,
      vatDeductionRight: fullRight ? ("FULL" as const) : ("UNKNOWN" as const),
      conflict: false,
    };
  }
  return {
    vatRegime: "UNKNOWN" as const,
    vatDeductionRight: "UNKNOWN" as const,
    conflict: false,
  };
}

export function parseCensusCertificateText(
  text: string,
): CensusCertificateCandidate {
  const bounded = text.slice(0, MAX_CENSUS_TEXT_CHARS);
  const lines = bounded
    .split(/\r?\n/)
    .map(cleanLine)
    .filter(Boolean)
    .slice(0, MAX_CENSUS_LINES);
  const joined = lines.join("\n");
  const normalizedText = comparable(joined);
  const documentKind = detectDocumentKind(normalizedText);
  const labelledNif = extractNif(lines);
  const repeatedFormNif =
    documentKind === "MODEL_036" || documentKind === "MODEL_037"
      ? extractRepeatedFormNif(lines)
      : null;
  const detectedNif =
    repeatedFormNif ??
    labelledNif ??
    (documentKind === "MODEL_036" || documentKind === "MODEL_037"
      ? (lines
          .map((line) => normalizeSpanishTaxId(line))
          .find((line) =>
            /^(?:[XYZ]\d{7}[A-Z]|\d{8}[A-Z]|[A-Z]\d{7}[A-Z0-9])$/.test(
              line,
            ),
          ) ?? null)
      : null);
  const explicitTaxpayerType = detectExplicitTaxpayerType(normalizedText);
  const inferredTaxpayerType = inferTaxpayerTypeFromSpanishTaxId(detectedNif);
  const taxpayerType =
    explicitTaxpayerType === "UNKNOWN"
      ? (inferredTaxpayerType ?? "UNKNOWN")
      : explicitTaxpayerType;
  const vat = detectVat(normalizedText);
  const activities = extractActivities(lines);
  const warnings: string[] = [];
  if (!detectedNif) {
    warnings.push(
      "No se ha podido localizar el NIF del titular en el documento.",
    );
  }
  if (explicitTaxpayerType === "UNKNOWN" && inferredTaxpayerType) {
    warnings.push(
      "El tipo de contribuyente se ha sugerido por el formato del NIF; debes confirmarlo.",
    );
  }
  if (activities.length === 0) {
    warnings.push(
      "No se ha detectado ninguna actividad económica de forma fiable.",
    );
  }
  if (vat.conflict) {
    warnings.push(
      "El documento contiene tratamientos de IVA distintos o actividades mixtas. Confirma el régimen y el derecho de deducción manualmente.",
    );
  }
  if (documentKind === "MODEL_036" || documentKind === "MODEL_037") {
    warnings.push(
      `El modelo ${documentKind === "MODEL_037" ? "037 histórico" : "036"} refleja una declaración concreta; confirma que los datos siguen vigentes.`,
    );
  } else if (documentKind === "UNKNOWN") {
    warnings.push(
      "El archivo no se ha reconocido como certificado censal o modelo 036 de la AEAT.",
    );
  }

  const documentDate = extractDocumentDate(joined);
  const csv = extractCsv(joined);
  return {
    ...emptyFiscalProfileDraft(),
    taxpayerType,
    jurisdiction: detectJurisdiction(normalizedText),
    directTaxRegime: detectDirectTaxRegime(normalizedText),
    vatRegime: vat.vatRegime,
    vatDeductionRight: vat.vatDeductionRight,
    activities,
    detectedNif,
    documentKind,
    ...(documentDate ? { documentDate } : {}),
    ...(csv ? { csv } : {}),
    warnings,
  };
}

function taxIdForComparison(value: string | null | undefined): string {
  const normalized = normalizeSpanishTaxId(value);
  return normalized.startsWith("ES") && normalized.length === 11
    ? normalized.slice(2)
    : normalized;
}

export function reconcileCensusIdentity(
  businessNif: string | null | undefined,
  detectedNif: string | null | undefined,
): CensusIdentityReconciliation {
  const expected = taxIdForComparison(businessNif);
  const detected = taxIdForComparison(detectedNif);
  if (!expected || !detected) {
    return {
      status: "NOT_CHECKED",
      canConfirm: false,
      message:
        "No se puede comprobar la identidad: completa el NIF de la empresa o revisa el documento.",
    };
  }
  if (expected !== detected) {
    return {
      status: "MISMATCH",
      canConfirm: false,
      message:
        "El NIF del documento no coincide con el NIF guardado en la empresa. No se importará.",
    };
  }
  return {
    status: "MATCHED",
    canConfirm: true,
    message: "El NIF del documento coincide con el perfil de la empresa.",
  };
}
