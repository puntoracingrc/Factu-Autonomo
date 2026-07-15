import {
  parseAeatTaxFormText,
  parseSupportingDocumentText,
} from "@/lib/fiscal-profile";
import type {
  ExtractedFact,
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
  hasExplicitIncompleteEvidence,
  maskSpanishTaxId,
  normalizeDocumentText,
} from "./normalization";

export const REMAINING_DEEP_MODEL_CODES = [
  "100",
  "123",
  "151",
  "193",
  "200",
  "202",
  "216",
  "296",
  "308",
  "309",
  "341",
  "347",
  "714",
  "720",
  "721",
  "840",
] as const satisfies readonly TaxDocumentModelCode[];

export const REMAINING_DEEP_DOCUMENT_TYPES = [
  "ROI_CERTIFICATE",
  "LANDLORD_WITHHOLDING_EXEMPTION_CERTIFICATE",
] as const satisfies readonly FiscalDocumentType[];

type RemainingModelCode = (typeof REMAINING_DEEP_MODEL_CODES)[number];
type RemainingDocumentType =
  | `MODEL_${RemainingModelCode}`
  | (typeof REMAINING_DEEP_DOCUMENT_TYPES)[number];

interface RemainingModelInput {
  documentId: string;
  documentType: FiscalDocumentType;
  text: string;
  extractionMethod: StructuredExtractionMethod;
  totalPages?: number;
  detectedPages?: readonly number[];
  pages?: readonly { page: number; text: string }[];
}

const ANNUAL_MODELS = new Set<RemainingModelCode>([
  "100",
  "151",
  "193",
  "200",
  "296",
  "347",
  "714",
  "720",
  "721",
]);

const EVENT_MODELS = new Set<RemainingModelCode>(["308", "309", "341", "840"]);

function asRemainingType(
  documentType: FiscalDocumentType,
): RemainingDocumentType | null {
  if (
    (REMAINING_DEEP_DOCUMENT_TYPES as readonly string[]).includes(documentType)
  ) {
    return documentType as RemainingDocumentType;
  }
  if (!documentType.startsWith("MODEL_")) return null;
  const code = documentType.slice("MODEL_".length);
  return (REMAINING_DEEP_MODEL_CODES as readonly string[]).includes(code)
    ? (documentType as RemainingDocumentType)
    : null;
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

function explicitBoxNumber(text: string, box: string): number | null {
  const normalized = normalizeDocumentText(text);
  const number = Number(box);
  const patterns = [
    new RegExp(
      `\\bCASILLA\\s*0*${number}\\s*[:.=\\-]?\\s*([+-]?[0-9][0-9. ]*(?:,[0-9]{1,2})?)\\b`,
    ),
    new RegExp(
      `\\b0*${number}\\s*[-.:]?\\s*(?:N(?:UMERO|O\\.?)\\s+DE\\s+)?(?:PERCEPTORES?|REGISTROS?|OPERACIONES?)\\s*[:.=\\-]?\\s*([+-]?[0-9][0-9. ]*(?:,[0-9]{1,2})?)\\b`,
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

function hasPositiveLabel(text: string, labels: readonly string[]): boolean {
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

function markedLabel(text: string, label: string): boolean {
  const normalized = normalizeDocumentText(text);
  const anchor = normalizeDocumentText(label).replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&",
  );
  return new RegExp(
    `(?:\\bX\\b.{0,28}${anchor}|${anchor}.{0,28}(?:\\bX\\b|\\bSI\\b|MARCADO))`,
  ).test(normalized);
}

function periodBounds(
  year: number | undefined,
  period: string | undefined,
): { from: string | null; to: string | null } {
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

function pageFor(
  input: RemainingModelInput,
  anchors: readonly string[],
): number | null {
  if (input.pages && anchors.length > 0) {
    const normalizedAnchors = anchors.map(normalizeDocumentText);
    const matching = input.pages.filter((page) => {
      const pageText = normalizeDocumentText(page.text);
      return normalizedAnchors.some((anchor) => pageText.includes(anchor));
    });
    if (matching.length === 1) return matching[0].page;
  }
  return input.detectedPages?.length === 1 ? input.detectedPages[0] : null;
}

function completePages(input: RemainingModelInput): boolean {
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

function taxpayerNif(text: string): string | null {
  const normalized = normalizeDocumentText(text);
  return maskSpanishTaxId(
    normalized.match(
      /\b(?:NIF|NIE)\s*[:.\-]?\s*([XYZ]?\d{7,8}[A-Z]|[A-Z]\d{7}[A-Z0-9])\b/,
    )?.[1],
  );
}

function modelAnchors(code: RemainingModelCode): readonly string[] {
  const anchors: Record<RemainingModelCode, readonly string[]> = {
    "100": ["ACTIVIDADES ECONOMICAS", "RENTA DE LAS PERSONAS FISICAS"],
    "123": ["CAPITAL MOBILIARIO", "RETENCIONES E INGRESOS A CUENTA"],
    "151": ["PERSONAS DESPLAZADAS", "REGIMEN ESPECIAL"],
    "193": ["CAPITAL MOBILIARIO", "CLAVE DE PERCEPCION"],
    "200": ["IMPUESTO SOBRE SOCIEDADES"],
    "202": ["PAGO FRACCIONADO", "IMPUESTO SOBRE SOCIEDADES"],
    "216": ["RENTA DE NO RESIDENTES", "RETENCIONES E INGRESOS A CUENTA"],
    "296": ["RENTA DE NO RESIDENTES", "CLAVE DE RENTA"],
    "308": ["SOLICITUD DE DEVOLUCION"],
    "309": ["LIQUIDACION NO PERIODICA"],
    "341": ["REINTEGRO DE COMPENSACIONES"],
    "347": ["OPERACIONES CON TERCERAS PERSONAS"],
    "714": ["IMPUESTO SOBRE EL PATRIMONIO"],
    "720": ["BIENES Y DERECHOS SITUADOS EN EL EXTRANJERO"],
    "721": ["MONEDAS VIRTUALES SITUADAS EN EL EXTRANJERO"],
    "840": ["IMPUESTO SOBRE ACTIVIDADES ECONOMICAS", "EPIGRAFE"],
  };
  return anchors[code];
}

function extractSubmittedModel(
  input: RemainingModelInput,
  code: RemainingModelCode,
): DeepTextExtraction {
  const candidate = parseAeatTaxFormText(input.text);
  const signals = filingSignals(input.text);
  const normalized = normalizeDocumentText(input.text);
  const effectiveDate = extractDateAfterLabel(input.text, [
    "FECHA EFECTIVA",
    "FECHA DE EFECTO",
    "FECHA DE EFECTOS",
    "FECHA DE ALTA",
    "FECHA DE BAJA",
    "FECHA DE VARIACION",
  ]);
  const eventHasTime =
    !EVENT_MODELS.has(code) || Boolean(candidate.taxYear || effectiveDate);
  const valid =
    candidate.modelCode === code &&
    (candidate.isSubmitted || candidate.hasPopulatedData) &&
    eventHasTime;
  const temporalScope: TemporalScope = ANNUAL_MODELS.has(code)
    ? "TARGET_FISCAL_YEAR"
    : "SPECIFIC_PERIOD";
  const bounds = periodBounds(candidate.taxYear, candidate.period);
  const confidence = input.extractionMethod === "OCR_LOCAL" ? 0.76 : 0.91;
  const page = pageFor(input, modelAnchors(code));
  const facts: ExtractedFact[] = [];
  const add = (
    factType: string,
    value: JsonValue,
    sourceLabel: string,
    sourceField: string | null = null,
    overrides: Partial<
      Pick<ExtractedFact, "effectiveFrom" | "effectiveTo" | "temporalScope">
    > = {},
  ) => {
    facts.push(
      createExtractedFact({
        documentId: input.documentId,
        index: facts.length,
        factType,
        value,
        temporalScope: overrides.temporalScope ?? temporalScope,
        effectiveFrom: overrides.effectiveFrom ?? effectiveDate ?? bounds.from,
        effectiveTo: overrides.effectiveTo ?? bounds.to,
        sourcePage: page,
        sourceField,
        sourceLabel,
        extractionMethod: input.extractionMethod,
        extractionConfidence: confidence,
        filingVerified: false,
        status: "PREFILLED_NEEDS_CONFIRMATION",
        warnings: [
          "Este hecho solo acredita el ejercicio, periodo o fecha visible en la declaración.",
        ],
      }),
    );
  };

  if (!valid) {
    return {
      facts: [],
      documentKind: candidate.isSubmitted ? "FILED_DECLARATION_COPY" : "DRAFT",
      filingStatus: candidate.isSubmitted ? "APPARENTLY_FILED" : "DRAFT",
      fiscalYear: candidate.taxYear ?? null,
      period: candidate.period ?? null,
      taxpayerNifMasked: taxpayerNif(input.text),
      issueDate: null,
      filingDate: signals.filingDate,
      effectiveDate,
      csvDetected: signals.csvDetected,
      isComplete: false,
      confidence: candidate.isSubmitted ? 0.68 : 0.52,
      warnings: [
        ...candidate.warnings,
        ...(!eventHasTime
          ? [
              "Falta una fecha o ejercicio que sitúe temporalmente el hecho declarado.",
            ]
          : []),
      ],
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
    );
  }

  if (code === "100") {
    add(
      candidate.isSubmitted ? "PERSONAL.IRPF_RETURN" : "IRPF.PRIOR_ANNUAL_FILING",
      candidate.isSubmitted
        ? { annualReturnFiled: true }
        : { documentObserved: true, officialSubmissionVerified: false },
      "Declaración anual del IRPF observada",
    );
    if (
      markedLabel(input.text, "Estimación directa simplificada") ||
      /\bDIRECTA\b.{0,140}\bSIMPLIFICADA\b/.test(normalized)
    ) {
      add(
        "IRPF.METHOD",
        "DIRECT_SIMPLIFIED",
        "Estimación directa simplificada",
      );
    } else if (
      markedLabel(input.text, "Estimación directa normal") ||
      /\bDIRECTA\s+NORMAL\b/.test(normalized)
    ) {
      add("IRPF.METHOD", "DIRECT_NORMAL", "Estimación directa normal");
    } else if (markedLabel(input.text, "Estimación objetiva")) {
      add("IRPF.METHOD", "OBJECTIVE_ESTIMATION", "Estimación objetiva");
    }
    const activityRows = [
      ...normalized.matchAll(
        /\b(A\d{2})\s+(.{2,100}?)\s+(?:DIRECTA(?:\s+(?:NORMAL|SIMPLIFICADA))?|OBJETIVA|CAPITAL\s+INMOBILIARIO)\b/g,
      ),
    ].map((match) => ({
      code: match[1],
      description: match[2].trim(),
    }));
    if (activityRows.length > 0) {
      add(
        "ACTIVITY.LIST",
        activityRows,
        "Actividades económicas de la declaración anual",
      );
    }
    if (hasPositiveLabel(input.text, ["Rentas atribuidas"])) {
      add(
        "ENTITY.INCOME_ATTRIBUTION",
        { attributedIncomeDeclared: true },
        "Rentas atribuidas declaradas en el IRPF",
      );
    }
  }

  if (code === "123" || code === "193") {
    const positiveCapital =
      hasPositiveBox(input.text, ["01", "02", "03"]) ||
      hasPositiveLabel(input.text, [
        "Perceptores",
        "Base total",
        "Número de perceptores",
        "Número total de perceptores",
        "Base de retenciones e ingresos a cuenta",
        "Retenciones e ingresos a cuenta",
      ]) ||
      (code === "193" &&
        /\bCLAVE(?:\s+DE)?\s+PERCEPCION\s*[:.\-]?\s*[A-Z0-9]\b/.test(
          normalized,
        ));
    if (positiveCapital) {
      add(
        "WITHHOLDING.CAPITAL",
        { paid: true, declarationModel: code },
        "Rendimientos o rentas del capital mobiliario",
        code === "123" ? "01/02/03" : "clave/registro",
      );
    }
  }

  if (code === "151") {
    add(
      "PERSONAL.SPECIAL_ARTICLE_93",
      { documentObserved: true, officialSubmissionVerified: false },
      "Régimen especial de personas desplazadas a España",
    );
  }

  if (code === "200") {
    add(
      "COMPANY.CORPORATE_TAX",
      { documentObserved: true, officialSubmissionVerified: false },
      "Impuesto sobre Sociedades",
    );
  }

  if (code === "202") {
    add(
      candidate.isSubmitted
        ? "COMPANY.INSTALLMENT_PAYMENT"
        : "COMPANY.PRIOR_MODEL_202_FILING",
      candidate.isSubmitted
        ? { installmentPaymentFiled: true }
        : { documentObserved: true, officialSubmissionVerified: false },
      "Pago fraccionado del Impuesto sobre Sociedades",
    );
  }

  if (code === "216" || code === "296") {
    const positiveNonResident =
      hasPositiveBox(input.text, [
        "05",
        "06",
        "07",
        "08",
        "09",
        "10",
        "11",
        "12",
        "13",
        "14",
        "15",
        "16",
        "17",
        "18",
        "19",
        "20",
        "21",
      ]) ||
      hasPositiveLabel(input.text, [
        "Perceptores",
        "Base total",
        "Número de rentas",
        "Número de perceptores",
        "Base de retenciones e ingresos a cuenta",
        "Retenciones e ingresos a cuenta",
      ]) ||
      (code === "296" &&
        /\bCLAVE(?:\s+DE)?\s+RENTA\s*[:.\-]?\s*[A-Z0-9]{1,2}\b/.test(
          normalized,
        ));
    if (positiveNonResident) {
      add(
        "WITHHOLDING.NON_RESIDENTS",
        { paid: true, declarationModel: code },
        "Rentas satisfechas a no residentes declaradas como retenedor",
        code === "216" ? "05-21" : "clave/registro",
      );
    }
  }

  if (code === "308") {
    if (
      hasPositiveLabel(input.text, [
        "Importe de la devolución solicitada",
        "Cantidad cuya devolución se solicita",
        "Resultado a devolver",
        "Devolución solicitada",
      ])
    ) {
      add(
        "VAT.SPECIAL_REFUND",
        { requested: true, declarationModel: "308" },
        "Solicitud de devolución especial de IVA",
      );
    }
  }

  if (code === "309") {
    if (
      /\bSUPUESTOS?\b.{0,180}\b(?:ADQUISICION|ADQUISICIONES)\s+INTRACOMUNITARI/.test(
        normalized,
      ) ||
      hasPositiveLabel(input.text, [
        "Adquisiciones intracomunitarias de bienes",
        "Adquisición intracomunitaria de medios de transporte nuevos",
      ])
    ) {
      add(
        "EU.OPERATIONS",
        { keys: ["A"] },
        "Adquisición intracomunitaria declarada",
      );
    }
    if (
      /\bSUPUESTOS?\b.{0,180}\bINVERSION\s+DEL\s+SUJETO\s+PASIVO/.test(
        normalized,
      ) ||
      hasPositiveLabel(input.text, [
        "Operaciones con inversión del sujeto pasivo",
        "Adquisiciones de bienes y servicios por inversión del sujeto pasivo",
      ])
    ) {
      add(
        "VAT.REVERSE_CHARGE",
        { occurred: true, declarationModel: "309" },
        "Operación con inversión del sujeto pasivo",
      );
    }
  }

  if (code === "341") {
    const positiveCompensation =
      hasPositiveBox(input.text, [
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
      ]) ||
      hasPositiveLabel(input.text, [
        "Importe de las compensaciones",
        "Compensación solicitada",
        "Importe a reintegrar",
        "Resultado a devolver",
      ]);
    if (positiveCompensation) {
      add(
        "VAT.SPECIAL_REFUND",
        { requested: true, declarationModel: "341" },
        "Reintegro de compensaciones de agricultura, ganadería o pesca",
        "01-10",
      );
      const activityNatures = [
        ...(normalized.includes("HORTICOLAS") || normalized.includes("CEREAL")
          ? (["AGRICULTURAL"] as const)
          : []),
        ...(normalized.includes("GANADO")
          ? (["LIVESTOCK"] as const)
          : []),
        ...(normalized.includes("PESCA") ? (["FISHING"] as const) : []),
      ];
      if (activityNatures.length > 0) {
        add(
          "ACTIVITY.NATURE",
          [...new Set(activityNatures)],
          "Naturaleza de los productos objeto de compensación",
        );
      }
    }
  }

  if (code === "347") {
    const hasRecord =
      /\bCLAVE(?:\s+DE)?\s+OPERACION\s*[:.\-]?\s*[A-Z]\b/.test(normalized) ||
      hasPositiveLabel(input.text, [
        "Número de terceros",
        "Importe anual declarado",
        "Importe anual de las operaciones",
        "Importe total de las operaciones",
        "Número de declarados",
        "Número de registros",
      ]);
    if (hasRecord) {
      add(
        "THIRD_PARTIES.MODEL_347_CANDIDATE",
        { annualThresholdEvidence: true },
        "Registro anual de operaciones con terceras personas",
        "clave/importe anual",
      );
    }
  }

  if (code === "714") {
    add(
      "PERSONAL.WEALTH_TAX",
      { documentObserved: true, officialSubmissionVerified: false },
      "Impuesto sobre el Patrimonio",
    );
  }

  if (code === "720") {
    const categories = [
      ...normalized.matchAll(
        /\bCLAVE(?:\s+TIPO)?\s+DE\s+BIEN\s*[:.\-]?\s*([ABC])\b/g,
      ),
    ].map((match) => match[1]);
    for (const match of normalized.matchAll(
      /\b([CVI])\s+[A-Z]{2}\s+[A-Z][A-Z ]{2,100}?\s+(?:TITULAR|AUTORIZADO|BENEFICIARIO)\b/g,
    )) {
      categories.push(match[1]);
    }
    if (
      categories.length > 0 ||
      hasPositiveLabel(input.text, [
        "Registros",
        "Número de registros",
        "Número de bienes o derechos",
      ])
    ) {
      add(
        "PERSONAL.FOREIGN_ASSETS",
        { categories: [...new Set(categories)], recordsDeclared: true },
        "Bienes y derechos situados en el extranjero",
        "clave tipo de bien",
      );
    }
  }

  if (code === "721") {
    const hasCryptoRecord =
      /\b(?:IDENTIFICADOR|TIPO|DENOMINACION)\s+(?:DE\s+LA\s+)?MONEDA\s+VIRTUAL\s*[:.\-]?\s*[A-Z0-9]/.test(
        normalized,
      ) ||
      hasPositiveLabel(input.text, [
        "Registros",
        "Número de registros",
        "Número de monedas virtuales",
      ]);
    if (hasCryptoRecord) {
      add(
        "PERSONAL.FOREIGN_CRYPTO",
        { recordsDeclared: true },
        "Monedas virtuales custodiadas en el extranjero",
        "registro de moneda virtual",
      );
    }
  }

  if (code === "840") {
    const labelledAction = normalized.match(
      /\bTIPO\s+DE\s+DECLARACION\s*[:.\-]?\s*(ALTA|VARIACION|BAJA)\b/,
    )?.[1];
    const action = labelledAction === "ALTA" || markedLabel(input.text, "Alta")
      ? "REGISTRATION"
      : labelledAction === "VARIACION" || markedLabel(input.text, "Variación")
        ? "MODIFICATION"
        : labelledAction === "BAJA" || markedLabel(input.text, "Baja")
          ? "DEREGISTRATION"
          : null;
    const heading = normalized.match(
      /\b(?:GRUPO\s*(?:\/|O)\s*)?EPIGRAFE\s*[:.\-]?\s*([0-9]{1,4}(?:\.[0-9])?)\b/,
    )?.[1];
    const activityDescription = normalized.match(
      /\bACTIVIDAD(?!\s+Y\s+EFECTOS)\s*[:.\-]?\s*(.{2,160}?)(?=\s+TIPO DE CUOTA\b|\s+MUNICIPIO\b|\s+FECHA DE EFECTOS\b|$)/,
    )?.[1]?.trim();
    if (action && effectiveDate && heading) {
      add(
        "IAE.EVENT",
        { action, heading, effectiveDate },
        "Alta, variación o baja en el Impuesto sobre Actividades Económicas",
        "acción/epígrafe/fecha",
        { effectiveFrom: effectiveDate, effectiveTo: null },
      );
      if (activityDescription && !/\[(?:NO VISIBLE|ILEGIBLE)/.test(activityDescription)) {
        add(
          "ACTIVITY.LIST",
          [{ code: heading, description: activityDescription }],
          "Actividad y epígrafe del IAE",
          "actividad/epígrafe",
          { effectiveFrom: effectiveDate, effectiveTo: null },
        );
      }
    }
  }

  return {
    facts,
    documentKind: candidate.isSubmitted
      ? "FILED_DECLARATION_COPY"
      : "PREDECLARATION",
    filingStatus: candidate.isSubmitted ? "APPARENTLY_FILED" : "NOT_VERIFIED",
    fiscalYear: candidate.taxYear ?? null,
    period: candidate.period ?? null,
    taxpayerNifMasked: taxpayerNif(input.text),
    issueDate: null,
    filingDate: signals.filingDate,
    effectiveDate,
    csvDetected: signals.csvDetected,
    isComplete:
      candidate.isSubmitted &&
      facts.length > 0 &&
      completePages(input) &&
      !hasExplicitIncompleteEvidence(input.text),
    confidence: facts.length > 1 ? confidence : 0.74,
    warnings: [
      ...candidate.warnings,
      ...(!candidate.isSubmitted
        ? [
            "Los campos se han leído de un impreso cumplimentado sin prueba de presentación; requieren confirmación y solo describen el periodo visible.",
          ]
        : []),
    ],
  };
}

function extractSupportingCertificate(
  input: RemainingModelInput,
  documentType:
    "ROI_CERTIFICATE" | "LANDLORD_WITHHOLDING_EXEMPTION_CERTIFICATE",
): DeepTextExtraction {
  const candidate = parseSupportingDocumentText(input.text);
  const issueDate = extractDateAfterLabel(input.text, [
    "FECHA DE EXPEDICION",
    "FECHA DE EMISION",
    "EXPEDIDO EL",
  ]);
  const facts: ExtractedFact[] = [];
  const add = (factType: string, value: JsonValue, sourceLabel: string) => {
    facts.push(
      createExtractedFact({
        documentId: input.documentId,
        index: facts.length,
        factType,
        value,
        temporalScope: "CURRENT_AS_OF_DATE",
        effectiveFrom: issueDate,
        effectiveTo: null,
        sourcePage: pageFor(input, [sourceLabel]),
        sourceLabel,
        extractionMethod: input.extractionMethod,
        extractionConfidence:
          input.extractionMethod === "OCR_LOCAL" ? 0.8 : 0.93,
        filingVerified: false,
        status: "PREFILLED_NEEDS_CONFIRMATION",
        warnings: [
          "Confirma que no existe una baja, revocación o certificado posterior.",
        ],
      }),
    );
  };

  if (
    documentType === "ROI_CERTIFICATE" &&
    candidate.documentType === "INTRACOMMUNITY_OPERATOR_CERTIFICATE" &&
    candidate.roiRegistered != null
  ) {
    add(
      "EU.ROI",
      { registered: candidate.roiRegistered === "YES" },
      "Registro de Operadores Intracomunitarios",
    );
  }
  if (
    documentType === "LANDLORD_WITHHOLDING_EXEMPTION_CERTIFICATE" &&
    candidate.documentType === "LANDLORD_WITHHOLDING_EXEMPTION_CERTIFICATE" &&
    candidate.landlordWithholdingExemption != null
  ) {
    add(
      "WITHHOLDING.RENT_EXEMPTION",
      {
        exemptionAccredited:
          candidate.landlordWithholdingExemption === "YES",
      },
      "Exoneración de retención del arrendador",
    );
  }

  return {
    facts,
    documentKind: "CURRENT_CERTIFICATE",
    filingStatus: "NOT_VERIFIED",
    fiscalYear: null,
    period: null,
    taxpayerNifMasked: taxpayerNif(input.text),
    issueDate,
    filingDate: null,
    effectiveDate: issueDate,
    csvDetected: /\b(?:CODIGO SEGURO DE VERIFICACION|CSV)\b/.test(
      normalizeDocumentText(input.text),
    ),
    isComplete:
      facts.length > 0 &&
      completePages(input) &&
      !hasExplicitIncompleteEvidence(input.text),
    confidence: facts.length > 0 ? 0.91 : 0.58,
    warnings: candidate.warnings,
  };
}

export function extractRemainingModelText(
  input: RemainingModelInput,
): DeepTextExtraction | null {
  const type = asRemainingType(input.documentType);
  if (!type) return null;
  if (
    type === "ROI_CERTIFICATE" ||
    type === "LANDLORD_WITHHOLDING_EXEMPTION_CERTIFICATE"
  ) {
    return extractSupportingCertificate(input, type);
  }
  return extractSubmittedModel(
    input,
    type.slice("MODEL_".length) as RemainingModelCode,
  );
}
