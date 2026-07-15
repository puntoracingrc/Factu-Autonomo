import { parseAeatTaxFormText } from "@/lib/fiscal-profile";
import {
  MODEL_190_KEY_DICTIONARY_VERSION,
  model190KeyDefinitions,
  model349OperationKeys,
} from "./codebooks";
import type {
  DocumentKind,
  ExtractedFact,
  FilingStatus,
  FiscalDocumentType,
  JsonValue,
  StructuredExtractionMethod,
  TemporalScope,
  TaxDocumentModelCode,
} from "./contracts";
import type { DeepTextExtraction } from "./first-block";
import {
  createExtractedFact,
  extractDateAfterLabel,
  maskSpanishTaxId,
  normalizeDocumentText,
} from "./normalization";

export const MAXIMUM_PRIORITY_DEEP_MODEL_CODES = [
  "035",
  "111",
  "115",
  "130",
  "131",
  "180",
  "184",
  "190",
  "303",
  "349",
  "369",
  "390",
] as const satisfies readonly TaxDocumentModelCode[];

type MaximumPriorityModelCode =
  (typeof MAXIMUM_PRIORITY_DEEP_MODEL_CODES)[number];

interface PriorityModelInput {
  documentId: string;
  documentType: FiscalDocumentType;
  text: string;
  extractionMethod: StructuredExtractionMethod;
  totalPages?: number;
  detectedPages?: readonly number[];
  pages?: readonly { page: number; text: string }[];
}

interface PeriodBounds {
  from: string | null;
  to: string | null;
}

const ANNUAL_MODELS = new Set<MaximumPriorityModelCode>([
  "180",
  "184",
  "190",
  "390",
]);

function asPriorityModel(
  documentType: FiscalDocumentType,
): MaximumPriorityModelCode | null {
  if (!documentType.startsWith("MODEL_")) return null;
  const code = documentType.slice("MODEL_".length) as TaxDocumentModelCode;
  return (MAXIMUM_PRIORITY_DEEP_MODEL_CODES as readonly string[]).includes(code)
    ? (code as MaximumPriorityModelCode)
    : null;
}

function pageFor(
  input: PriorityModelInput,
  anchors: readonly string[],
): number | null {
  if (input.pages && anchors.length > 0) {
    const normalizedAnchors = anchors.map(normalizeDocumentText);
    const matchingPages = input.pages.filter((page) => {
      const pageText = normalizeDocumentText(page.text);
      return normalizedAnchors.some((anchor) => pageText.includes(anchor));
    });
    if (matchingPages.length === 1) return matchingPages[0].page;
  }
  return input.detectedPages?.length === 1 ? input.detectedPages[0] : null;
}

function parseSpanishNumber(value: string | undefined): number | null {
  if (!value) return null;
  const compact = value.replace(/\s/g, "");
  const normalized = compact.includes(",")
    ? compact.replace(/\./g, "").replace(",", ".")
    : compact;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function filledOverlayLines(pageText: string): readonly string[] {
  const lines = pageText
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);
  const identityIndex = lines.findIndex((line) =>
    /^(?:[XYZ]\d{7}[A-Z]|\d{8}[A-Z]|[A-Z]\d{7}[A-Z0-9])$/i.test(line),
  );
  if (identityIndex < 0) return [];
  const endIndex = lines.findIndex(
    (line, index) =>
      index > identityIndex &&
      /^(?:DOCUMENTO SINTETICO|DOCUMENTO SINTÉTICO|FIXTURE\b)/i.test(line),
  );
  return lines.slice(identityIndex, endIndex < 0 ? lines.length : endIndex);
}

function filledOverlayPages(input: PriorityModelInput): readonly (readonly string[])[] {
  const pages =
    input.pages?.map((page) => page.text) ?? input.text.split(/\n?\f\n?/);
  return pages.map(filledOverlayLines).filter((lines) => lines.length > 0);
}

function exactNumericValues(lines: readonly string[]): readonly number[] {
  return lines.flatMap((line) => {
    if (!/^[+-]?(?:\d{1,3}(?:\.\d{3})*|\d+)(?:,\d{1,2})?$/.test(line)) {
      return [];
    }
    const parsed = parseSpanishNumber(line);
    return parsed == null ? [] : [parsed];
  });
}

function valuesAfterPeriod(
  lines: readonly string[],
  period: string | undefined,
): readonly number[] {
  if (!period) return [];
  const periodIndex = lines.findIndex((line) => line === period);
  return periodIndex < 0 ? [] : exactNumericValues(lines.slice(periodIndex + 1));
}

function explicitBoxNumber(text: string, box: string): number | null {
  const normalized = normalizeDocumentText(text);
  const escaped = box.replace(/^0+/, "0*");
  const patterns = [
    new RegExp(
      `\\bCASILLA\\s*0*${Number(box)}\\s*[:.=\\-]?\\s*([+-]?[0-9][0-9. ]*(?:,[0-9]{1,2})?)\\b`,
    ),
    new RegExp(
      `\\b0*${Number(box)}\\s*[-.:]?\\s*(?:N(?:UMERO|O\\.?)\\s+DE\\s+)?(?:PERCEPTORES?|REGISTROS?|OPERACIONES?)\\s*[:.=\\-]?\\s*([+-]?[0-9][0-9. ]*(?:,[0-9]{1,2})?)\\b`,
    ),
    new RegExp(
      `\\b(?:N(?:UMERO|O\\.?)\\s+DE\\s+)?(?:PERCEPTORES?|REGISTROS?|OPERACIONES?)\\s*\\(?CASILLA\\s*${escaped}\\)?\\s*[:.=\\-]?\\s*([+-]?[0-9][0-9. ]*(?:,[0-9]{1,2})?)\\b`,
    ),
  ];
  for (const pattern of patterns) {
    const parsed = parseSpanishNumber(normalized.match(pattern)?.[1]);
    if (parsed != null) return parsed;
  }
  return null;
}

function hasPositiveBox(text: string, boxes: readonly string[]): boolean {
  return boxes.some((box) => (explicitBoxNumber(text, box) ?? 0) > 0);
}

function hasExplicitPositiveLabel(
  text: string,
  labels: readonly string[],
): boolean {
  const normalized = normalizeDocumentText(text);
  return labels.some((label) => {
    const anchor = normalizeDocumentText(label)
      .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
      .replace(/\\ /g, "\\s+");
    const match = normalized.match(
      new RegExp(
        `${anchor}[^A-Z0-9]{0,12}([+-]?[0-9][0-9. ]*(?:,[0-9]{1,2})?)\\b`,
      ),
    );
    return (parseSpanishNumber(match?.[1]) ?? 0) > 0;
  });
}

function periodBounds(
  year: number | undefined,
  period: string | undefined,
): PeriodBounds {
  if (!year) return { from: null, to: null };
  if (!period || period === "0A" || period === "ANUAL") {
    return { from: `${year}-01-01`, to: `${year}-12-31` };
  }
  const quarter = period.match(/^([1-4])T$/);
  if (quarter) {
    const startMonth = (Number(quarter[1]) - 1) * 3 + 1;
    const endMonth = startMonth + 2;
    const endDay = new Date(Date.UTC(year, endMonth, 0)).getUTCDate();
    return {
      from: `${year}-${String(startMonth).padStart(2, "0")}-01`,
      to: `${year}-${String(endMonth).padStart(2, "0")}-${String(endDay).padStart(2, "0")}`,
    };
  }
  if (/^(0[1-9]|1[0-2])$/.test(period)) {
    const month = Number(period);
    const endDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
    return {
      from: `${year}-${period}-01`,
      to: `${year}-${period}-${String(endDay).padStart(2, "0")}`,
    };
  }
  return { from: null, to: null };
}

function completePages(input: PriorityModelInput): boolean {
  return (
    input.totalPages == null || input.detectedPages?.length === input.totalPages
  );
}

function filingSignals(text: string): {
  filingDate: string | null;
  csvDetected: boolean;
} {
  const normalized = normalizeDocumentText(text);
  return {
    filingDate: extractDateAfterLabel(text, [
      "FECHA DE PRESENTACION",
      "PRESENTACION REALIZADA EL",
    ]),
    csvDetected: /\b(?:CODIGO SEGURO DE VERIFICACION|CSV)\b/.test(normalized),
  };
}

function sourceAnchors(code: MaximumPriorityModelCode): readonly string[] {
  const anchors: Record<MaximumPriorityModelCode, readonly string[]> = {
    "035": [
      "CAUSA DE PRESENTACION",
      "REGIMEN DE LA UNION",
      "REGIMEN DE IMPORTACION",
    ],
    "111": ["RENDIMIENTOS DEL TRABAJO", "ACTIVIDADES ECONOMICAS"],
    "115": ["ARRENDAMIENTO", "INMUEBLES URBANOS"],
    "130": ["ESTIMACION DIRECTA", "PAGO FRACCIONADO"],
    "131": ["ESTIMACION OBJETIVA", "PAGO FRACCIONADO"],
    "180": ["ARRENDAMIENTO", "RESUMEN ANUAL"],
    "184": ["ENTIDADES EN REGIMEN DE ATRIBUCION DE RENTAS"],
    "190": ["CLAVE DE PERCEPCION", "RESUMEN ANUAL"],
    "303": ["AUTOLIQUIDACION", "INVERSION DEL SUJETO PASIVO"],
    "349": ["OPERACIONES INTRACOMUNITARIAS", "CLAVE DE OPERACION"],
    "369": ["ESTADO MIEMBRO DE CONSUMO", "REGIMEN DE LA UNION"],
    "390": ["RESUMEN ANUAL", "REGIMEN GENERAL", "REGIMEN SIMPLIFICADO"],
  };
  return anchors[code];
}

function extractPerceptionKeys(text: string): readonly string[] {
  const normalized = normalizeDocumentText(text);
  const keys = new Set<string>();
  const patterns = [
    /\bCLAVE(?:\s+DE)?\s+PERCEPCION\s*[:.\-]?\s*([A-L])\b/g,
    /\bCLAVE\s*[:.\-]?\s*([A-L])\s+SUBCLAVE\b/g,
  ];
  for (const pattern of patterns) {
    for (const match of normalized.matchAll(pattern)) keys.add(match[1]);
  }
  return [...keys].sort();
}

function markedLabel(text: string, label: string): boolean {
  const normalized = normalizeDocumentText(text);
  const normalizedLabel = normalizeDocumentText(label).replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&",
  );
  return new RegExp(
    `(?:\\bX\\b.{0,24}${normalizedLabel}|${normalizedLabel}.{0,24}(?:\\bX\\b|\\bSI\\b|MARCADO))`,
  ).test(normalized);
}

function extractVatRegimes(
  text: string,
  model: "303" | "390",
): readonly string[] {
  const normalized = normalizeDocumentText(text);
  const regimes = new Set<string>();
  const generalBoxes =
    model === "303"
      ? [
          "01",
          "02",
          "03",
          "04",
          "05",
          "06",
          "07",
          "08",
          "09",
          "10",
          "11",
          "12",
          "13",
        ]
      : ["01", "02", "03", "04", "05", "06", "700", "701", "702", "703"];
  if (
    markedLabel(normalized, "Régimen general") ||
    hasPositiveBox(text, generalBoxes)
  ) {
    regimes.add("GENERAL");
  }
  if (
    markedLabel(normalized, "Régimen simplificado") ||
    hasExplicitPositiveLabel(text, [
      "Volumen de ingresos en régimen simplificado",
      "Cuota devengada en régimen simplificado",
    ])
  ) {
    regimes.add("SIMPLIFIED");
  }
  if (
    markedLabel(normalized, "Recargo de equivalencia") ||
    hasPositiveBox(
      text,
      model === "303"
        ? [
            "19",
            "20",
            "21",
            "22",
            "23",
            "24",
            "156",
            "157",
            "158",
            "168",
            "169",
            "170",
          ]
        : ["655", "656", "657"],
    )
  ) {
    regimes.add("EQUIVALENCE_SURCHARGE");
  }
  if (
    markedLabel(
      normalized,
      "Régimen especial de la agricultura ganadería y pesca",
    )
  ) {
    regimes.add("AGRICULTURE_LIVESTOCK_FISHING");
  }
  if (markedLabel(normalized, "Régimen especial del criterio de caja")) {
    regimes.add("CASH_ACCOUNTING");
  }
  return [...regimes];
}

function extractOssScheme(text: string): string | null {
  const normalized = normalizeDocumentText(text);
  if (/REGIMEN(?:\s+ESPECIAL)?\s+DE\s+IMPORTACION/.test(normalized)) {
    return "IMPORT_SCHEME";
  }
  if (/REGIMEN(?:\s+ESPECIAL)?\s+EXTERIOR\s+DE\s+LA\s+UNION/.test(normalized)) {
    return "NON_UNION_SCHEME";
  }
  if (/REGIMEN(?:\s+ESPECIAL)?\s+DE\s+LA\s+UNION/.test(normalized)) {
    return "UNION_SCHEME";
  }
  return null;
}

function extractionForSubmittedModel(
  input: PriorityModelInput,
  code: MaximumPriorityModelCode,
): DeepTextExtraction {
  const candidate = parseAeatTaxFormText(input.text);
  const signals = filingSignals(input.text);
  const normalized = normalizeDocumentText(input.text);
  const validCandidate =
    candidate.modelCode === code &&
    (candidate.isSubmitted || candidate.hasPopulatedData);
  const temporalScope: TemporalScope = ANNUAL_MODELS.has(code)
    ? "TARGET_FISCAL_YEAR"
    : "SPECIFIC_PERIOD";
  const bounds = periodBounds(candidate.taxYear, candidate.period);
  const facts: ExtractedFact[] = [];
  const page = pageFor(input, sourceAnchors(code));
  const confidence = input.extractionMethod === "OCR_LOCAL" ? 0.78 : 0.92;
  const add = (
    factType: string,
    value: JsonValue,
    sourceLabel: string,
    sourceField: string | null = null,
    overrides: Partial<
      Pick<ExtractedFact, "effectiveFrom" | "effectiveTo">
    > = {},
  ) => {
    facts.push(
      createExtractedFact({
        documentId: input.documentId,
        index: facts.length,
        factType,
        value,
        temporalScope,
        effectiveFrom: overrides.effectiveFrom ?? bounds.from,
        effectiveTo: overrides.effectiveTo ?? bounds.to,
        sourcePage: page,
        sourceField,
        sourceLabel,
        extractionMethod: input.extractionMethod,
        extractionConfidence: confidence,
        filingVerified: false,
        status: "PREFILLED_NEEDS_CONFIRMATION",
        warnings: [
          "Este hecho solo acredita el ejercicio o periodo indicado en la declaración.",
        ],
      }),
    );
  };

  if (!validCandidate) {
    const documentKind: DocumentKind = candidate.isSubmitted
      ? "FILED_DECLARATION_COPY"
      : "DRAFT";
    const filingStatus: FilingStatus = candidate.isSubmitted
      ? "APPARENTLY_FILED"
      : "DRAFT";
    return {
      facts: [],
      documentKind,
      filingStatus,
      fiscalYear: candidate.taxYear ?? null,
      period: candidate.period ?? null,
      taxpayerNifMasked: maskSpanishTaxId(
        normalized.match(
          /\b(?:NIF|NIE)\s*[:.\-]?\s*([XYZ]?\d{7,8}[A-Z]|[A-Z]\d{7}[A-Z0-9])\b/,
        )?.[1],
      ),
      issueDate: null,
      filingDate: signals.filingDate,
      effectiveDate: extractDateAfterLabel(input.text, [
        "FECHA EFECTIVA",
        "FECHA DE EFECTO",
      ]),
      csvDetected: signals.csvDetected,
      isComplete: false,
      confidence: candidate.isSubmitted ? 0.7 : 0.55,
      warnings: candidate.warnings,
    };
  }

  if (candidate.isSubmitted) {
    add(
      "FILING.MODEL",
      {
        model: code,
        ...(candidate.taxYear ? { fiscalYear: candidate.taxYear } : {}),
        ...(candidate.period ? { period: candidate.period } : {}),
        status: "APPARENTLY_FILED",
      },
      `Modelo ${code} presentado`,
      null,
    );
  }

  const overlayPages = filledOverlayPages(input);
  const mainOverlay =
    overlayPages.find((lines) => lines.includes(candidate.period ?? "")) ??
    overlayPages[0] ??
    [];
  const valuesAfterVisiblePeriod = valuesAfterPeriod(
    mainOverlay,
    candidate.period,
  );
  const mainValues =
    valuesAfterVisiblePeriod.length > 0
      ? valuesAfterVisiblePeriod
      : exactNumericValues(mainOverlay);

  if (code === "130") {
    add(
      "IRPF.PAYMENT_130",
      {
        method: "DIRECT_ESTIMATION",
        filingStatus: candidate.isSubmitted ? "APPARENTLY_FILED" : "DRAFT",
      },
      "Actividades económicas en estimación directa",
    );
  }

  if (code === "131") {
    add(
      "IRPF.PAYMENT_131",
      {
        method: "OBJECTIVE_ESTIMATION",
        filingStatus: candidate.isSubmitted ? "APPARENTLY_FILED" : "DRAFT",
      },
      "Actividades económicas en estimación objetiva",
    );
    add("IRPF.METHOD", "OBJECTIVE_ESTIMATION", "Estimación objetiva");
  }

  if (code === "111") {
    const overlayWorkRecipients = mainValues[0] ?? 0;
    const overlayProfessionalRecipients = mainValues[3] ?? 0;
    if (
      hasPositiveBox(input.text, ["01", "04"]) ||
      overlayWorkRecipients > 0 ||
      hasExplicitPositiveLabel(input.text, [
        "Rendimientos del trabajo número de perceptores",
      ])
    ) {
      add(
        "WITHHOLDING.WORK_RECIPIENTS",
        { paid: true },
        "Rendimientos del trabajo · N.º perceptores",
        "01/04",
      );
    }
    if (
      hasPositiveBox(input.text, ["07", "10"]) ||
      overlayProfessionalRecipients > 0
    ) {
      add(
        "WITHHOLDING.ECONOMIC_ACTIVITY_RECIPIENTS",
        { paid: true, categoryRequiresAnnualDetail: true },
        "Rendimientos de actividades económicas · N.º perceptores",
        "07/10",
      );
    }
    if (
      /ACTIVIDADES\s+PROFESIONALES/.test(normalized) &&
      hasExplicitPositiveLabel(input.text, [
        "Actividades profesionales número de perceptores",
      ])
    ) {
      add(
        "WITHHOLDING.PROFESSIONAL_RECIPIENTS",
        { paid: true },
        "Actividades profesionales · N.º perceptores",
        "07/10",
      );
    }
    if (
      hasPositiveBox(input.text, ["13", "16", "19", "22", "25", "28"]) ||
      hasExplicitPositiveLabel(input.text, [
        "Premios número de perceptores",
        "Ganancias patrimoniales número de perceptores",
        "Cesión de derechos de imagen número de perceptores",
      ])
    ) {
      add(
        "WITHHOLDING.OTHER_IRPF_RECIPIENTS",
        { paid: true },
        "Otras rentas sujetas a retención · N.º perceptores",
        "13/16/19/22/25/28",
      );
    }
  }

  if (code === "115" || code === "180") {
    const rentValues = exactNumericValues(mainOverlay);
    const overlayRentRecipients =
      rentValues.length >= 5 ? rentValues[rentValues.length - 5] : 0;
    const positiveRentData =
      hasPositiveBox(input.text, ["01", "02", "03"]) ||
      overlayRentRecipients > 0 ||
      hasExplicitPositiveLabel(input.text, [
        "Número total de perceptores",
        "Número de perceptores",
        "Base de las retenciones",
        "Base retenciones e ingresos a cuenta",
        "Retenciones e ingresos a cuenta",
      ]);
    if (positiveRentData) {
      add(
        "WITHHOLDING.RENT",
        {
          urbanPropertyRent: true,
          subjectToWithholding: true,
          declarationModel: code,
        },
        "Arrendamiento o subarrendamiento de inmuebles urbanos",
        "01/02/03",
      );
    }
  }

  if (code === "190") {
    const keys = extractPerceptionKeys(input.text);
    const keyDefinitions = model190KeyDefinitions(candidate.taxYear, keys);
    if (keys.length > 0) {
      add(
        "WITHHOLDING.PERCEPTION_KEYS",
        keys,
        "Clave de percepción",
        "clave/subclave",
      );
    }
    if (keyDefinitions.some((entry) => entry.employeeIndicator)) {
      add(
        "WITHHOLDING.EMPLOYEES",
        {
          paid: true,
          keys: ["A"],
          dictionaryVersion: MODEL_190_KEY_DICTIONARY_VERSION,
        },
        "Clave A · empleados por cuenta ajena",
        "A",
      );
    }
    if (keyDefinitions.some((entry) => entry.professionalIndicator)) {
      add(
        "WITHHOLDING.PROFESSIONAL_RECIPIENTS",
        {
          paid: true,
          keys: ["G"],
          dictionaryVersion: MODEL_190_KEY_DICTIONARY_VERSION,
        },
        "Clave G · rendimientos de actividades profesionales",
        "G",
      );
    }
    const otherKeys = keyDefinitions
      .filter((entry) => entry.otherIndicator)
      .map((entry) => entry.key);
    if (otherKeys.length > 0) {
      add(
        "WITHHOLDING.OTHER_IRPF_RECIPIENTS",
        {
          paid: true,
          keys: otherKeys,
          dictionaryVersion: MODEL_190_KEY_DICTIONARY_VERSION,
        },
        "Otras claves de percepción sujetas a retención",
        otherKeys.join("/"),
      );
    }
  }

  if (code === "303" || code === "390") {
    const regimes = extractVatRegimes(input.text, code);
    if (regimes.length > 0) {
      add("VAT.REGIMES", regimes, "Regímenes de IVA declarados");
    }
    if (code === "303") {
      add(
        "VAT.FILING_303",
        {
          periodicVatReturnObserved: true,
          filingStatus: candidate.isSubmitted ? "APPARENTLY_FILED" : "DRAFT",
        },
        "IVA · Autoliquidación",
      );
      const additionalValues = overlayPages
        .filter((lines) => lines !== mainOverlay)
        .map(exactNumericValues)
        .find((values) => values.length >= 6) ?? [];
      if (
        hasPositiveBox(input.text, ["12", "13", "125"]) ||
        (mainValues[5] ?? 0) > 0 ||
        (additionalValues[3] ?? 0) > 0 ||
        hasExplicitPositiveLabel(input.text, [
          "Operaciones con inversión del sujeto pasivo",
          "Otras operaciones con inversión del sujeto pasivo",
        ])
      ) {
        add(
          "VAT.REVERSE_CHARGE",
          { occurred: true },
          "Operaciones con inversión del sujeto pasivo",
          "12/13/125",
        );
      }
      const euKeys = new Set<string>();
      if (
        hasPositiveBox(input.text, ["10", "11"]) ||
        (mainValues[3] ?? 0) > 0 ||
        hasExplicitPositiveLabel(input.text, [
          "Adquisiciones intracomunitarias de bienes",
        ])
      ) {
        euKeys.add("A");
      }
      if ((additionalValues[0] ?? 0) > 0) euKeys.add("E");
      if (
        hasExplicitPositiveLabel(input.text, [
          "Entregas intracomunitarias de bienes",
        ])
      ) {
        euKeys.add("E");
      }
      if (
        hasExplicitPositiveLabel(input.text, [
          "Prestaciones intracomunitarias de servicios",
        ])
      ) {
        euKeys.add("S");
      }
      if (
        hasExplicitPositiveLabel(input.text, [
          "Adquisiciones intracomunitarias de servicios",
        ])
      ) {
        euKeys.add("I");
      }
      if (euKeys.size > 0) {
        add(
          "EU.OPERATIONS",
          { keys: [...euKeys] },
          "Operaciones intracomunitarias declaradas",
        );
      }
    } else {
      add(
        "VAT.ANNUAL_SUMMARY",
        {
          annualVatSummaryObserved: true,
          filingStatus: candidate.isSubmitted ? "APPARENTLY_FILED" : "DRAFT",
        },
        "IVA · Resumen anual",
      );
      const annualEuKeys = new Set<string>();
      if (
        hasExplicitPositiveLabel(input.text, [
          "Adquisiciones intracomunitarias de bienes",
        ])
      ) {
        annualEuKeys.add("A");
      }
      if (
        hasExplicitPositiveLabel(input.text, [
          "Entregas intracomunitarias de bienes",
        ])
      ) {
        annualEuKeys.add("E");
      }
      if (
        hasExplicitPositiveLabel(input.text, [
          "Prestaciones intracomunitarias de servicios",
        ])
      ) {
        annualEuKeys.add("S");
      }
      if (
        hasExplicitPositiveLabel(input.text, [
          "Adquisiciones intracomunitarias de servicios",
        ])
      ) {
        annualEuKeys.add("I");
      }
      if (annualEuKeys.size > 0) {
        add(
          "EU.OPERATIONS",
          { keys: [...annualEuKeys] },
          "Operaciones intracomunitarias del resumen anual",
        );
      }
      add(
        "VAT.MODEL_390_FACTORS",
        {
          annualSummaryObserved: true,
          explicitRegimes: regimes,
          euOperationKeys: [...annualEuKeys],
        },
        "Factores observados en el resumen anual de IVA",
      );
    }
  }

  if (code === "349") {
    const keys = model349OperationKeys(
      candidate.taxYear,
      candidate.euOperationKeys,
    ).map((entry) => entry.key);
    if (keys.length > 0) {
      add(
        "EU.OPERATIONS",
        { keys },
        "Clave de operación intracomunitaria",
        "E/A/S/I",
      );
    }
  }

  if (code === "035") {
    const action = candidate.ossAction;
    const scheme = extractOssScheme(input.text);
    const effectiveDate = extractDateAfterLabel(input.text, [
      "FECHA EFECTIVA",
      "FECHA DE EFECTO",
      "FECHA DE INICIO",
      "FECHA DE BAJA",
    ]);
    if (action) {
      add(
        "ECOMMERCE.OSS_IOSS_REGISTRATION",
        {
          action,
          ...(scheme ? { scheme } : {}),
          ...(effectiveDate ? { effectiveDate } : {}),
        },
        "Causa de presentación y régimen especial",
        "causa/régimen",
        { effectiveFrom: effectiveDate, effectiveTo: null },
      );
    }
  }

  if (code === "369") {
    const scheme = extractOssScheme(input.text);
    add(
      "ECOMMERCE.OSS_IOSS_OPERATIONS",
      {
        consumerOperationsDeclared: true,
        ...(scheme ? { scheme } : {}),
      },
      "Operaciones declaradas en régimen OSS/IOSS",
    );
  }

  if (code === "184") {
    add(
      "ENTITY.INCOME_ATTRIBUTION",
      { annualReturnFiled: true },
      "Entidad en régimen de atribución de rentas",
    );
    const explicitActivity =
      /(?:REALIZA|DESARROLLA|EJERCE)\s+ACTIVIDAD(?:ES)?\s+ECONOMICA(?:S)?\s*[:.\-]?\s*(?:SI|X)\b/.test(
        normalized,
      ) ||
      /\bACTIVIDAD(?:ES)?\s+ECONOMICA(?:S)?\s*[:.\-]?\s*(?:SI|X)\b/.test(
        normalized,
      );
    const explicitThreshold = hasExplicitPositiveLabel(input.text, [
      "Importe neto de la cifra de negocios",
      "Rentas obtenidas por la entidad",
    ]);
    if (explicitActivity || explicitThreshold) {
      add(
        "ENTITY.ATTRIBUTION_REQUIREMENT",
        {
          economicActivity: explicitActivity,
          thresholdEvidence: explicitThreshold,
        },
        explicitActivity
          ? "Actividad económica de la entidad"
          : "Rentas declaradas por la entidad",
      );
    }
  }

  return {
    facts,
    documentKind: candidate.isSubmitted ? "FILED_DECLARATION_COPY" : "DRAFT",
    filingStatus: candidate.isSubmitted ? "APPARENTLY_FILED" : "DRAFT",
    fiscalYear: candidate.taxYear ?? null,
    period: candidate.period ?? null,
    taxpayerNifMasked: maskSpanishTaxId(candidate.detectedNif),
    issueDate: null,
    filingDate: signals.filingDate,
    effectiveDate: extractDateAfterLabel(input.text, [
      "FECHA EFECTIVA",
      "FECHA DE EFECTO",
    ]),
    csvDetected: signals.csvDetected,
    isComplete: candidate.isSubmitted && completePages(input),
    confidence: facts.length > 1 ? confidence : 0.76,
    warnings: [
      ...candidate.warnings,
      ...(!candidate.isSubmitted
        ? [
            "Los campos se han leído de un impreso cumplimentado sin prueba de presentación; deben confirmarse y solo describen el periodo visible.",
          ]
        : []),
    ],
  };
}

export function extractPriorityModelText(
  input: PriorityModelInput,
): DeepTextExtraction | null {
  const code = asPriorityModel(input.documentType);
  return code ? extractionForSubmittedModel(input, code) : null;
}
