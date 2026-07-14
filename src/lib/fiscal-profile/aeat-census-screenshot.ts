import type {
  ActivityKind,
  DiagnosticVatRegime,
  IncomeTaxRegime,
  TaxModelNumber,
} from "@/lib/tax-model-diagnostic/contracts";

export const AEAT_CENSUS_SCREENSHOT_CONTRACT_VERSION = "1.0.0" as const;
export const AEAT_ACTIVITY_SPARSE_OCR_MARKER =
  "AEAT OCR SPARSE ACTIVITY PASS" as const;

export type AeatCensusScreenshotKind =
  "ACTIVITIES" | "TAX_STATUS" | "OBLIGATIONS";

export type AeatCensusScreenshotStatus =
  "RESOLVED" | "REVIEW_REQUIRED" | "BLOCKED";

export interface AeatCensusActivityRow {
  section: "BUSINESS" | "PROFESSIONAL" | "ARTISTIC";
  code: string;
  description: string;
  state: "ACTIVE" | "INACTIVE";
  startDate?: string;
  endDate?: string;
}

export interface AeatCensusScreenshotCandidate {
  contractVersion: typeof AEAT_CENSUS_SCREENSHOT_CONTRACT_VERSION;
  expectedKind: AeatCensusScreenshotKind;
  detectedKind: AeatCensusScreenshotKind | "UNKNOWN";
  status: AeatCensusScreenshotStatus;
  isComplete: boolean;
  activities: AeatCensusActivityRow[];
  activityKinds: ActivityKind[];
  incomeTaxRegime: IncomeTaxRegime;
  vatRegimes: DiagnosticVatRegime[];
  activeTaxModels: TaxModelNumber[];
  warnings: string[];
}

const OBLIGATION_RULES: readonly {
  model: Extract<
    TaxModelNumber,
    "111" | "115" | "123" | "130" | "131" | "216" | "303"
  >;
  label: RegExp;
}[] = [
  { model: "111", label: /IRPF.{0,20}RET(?:ENCIONES?)?.{0,30}TRABAJO/ },
  {
    model: "115",
    label:
      /IRPF.{0,20}RET(?:ENCIONES?)?.{0,30}ARREND(?:AMIENTOS?)?.{0,30}INMUEBLES\s+URBANOS/,
  },
  {
    model: "123",
    label: /IRPF.{0,20}RET(?:ENCIONES?)?.{0,40}CAPITAL\s+MOBILIARIO/,
  },
  {
    model: "130",
    label: /IRPF\s+PAGO\s+FRACCIONADO.{0,30}(?:PROF|EMPRES)/,
  },
  {
    model: "131",
    label: /IRPF\s+PAGO\s+FRACCIONADO.{0,45}(?:MODULOS|ESTIMACION\s+OBJETIVA)/,
  },
  { model: "216", label: /IRNR.{0,35}RET(?:ENCIONES?)?/ },
  { model: "303", label: /IMP(?:UESTO)?\.?\s+SOBRE\s+EL\s+VALOR\s+ANADIDO/ },
] as const;

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/[|¦]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

function normalizedLines(text: string): string[] {
  return text.split(/\r?\n/).map(normalize).filter(Boolean);
}

function toIsoDate(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const match = value.match(/^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{4})$/);
  if (!match) return undefined;
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return undefined;
  }
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function detectAeatCensusScreenshotKind(
  text: string,
): AeatCensusScreenshotCandidate["detectedKind"] {
  const value = normalize(text);
  const lines = normalizedLines(text);
  if (
    (value.includes("RELACION DE ACTIVIDADES") &&
      value.includes("CENSO DE ACTIVIDADES Y LOCALES")) ||
    (value.includes("IMPUESTO SOBRE ACTIVIDADES ECONOMICAS") &&
      (value.includes("ACTIVIDAD EN ALTA") ||
        value.includes("ACTIVIDAD EN BAJA"))) ||
    parseActivities(lines).length > 0
  ) {
    return "ACTIVITIES";
  }
  if (
    value.includes("OBLIGACIONES TRIBUTARIAS") ||
    obligationFacts(lines).models.length > 0
  ) {
    return "OBLIGATIONS";
  }
  if (
    value.includes("SITUACION TRIBUTARIA") ||
    value.includes("IMPUESTO SOBRE LA RENTA DE LAS PERSONAS FISICAS") ||
    (value.includes("IMPUESTO SOBRE EL VALOR ANADIDO") &&
      (value.includes("REGIMENES APLICABLES") ||
        value.includes("INFORMACION OBLIGACIONES")))
  ) {
    return "TAX_STATUS";
  }
  return "UNKNOWN";
}

function parseActivities(lines: string[]): AeatCensusActivityRow[] {
  const rows: AeatCensusActivityRow[] = [];
  for (const line of lines) {
    const match = line.match(
      /\b(EMPRESARIAL|PROFESIONAL|ARTISTICA)\s+(\d{1,4}(?:[.,]\d{1,2})?)\s+(.+?)\s+(ALTA|BAJA)\b(.*)$/,
    );
    if (!match) continue;
    const dates = [
      ...match[5].matchAll(/\b\d{1,2}[/.\-]\d{1,2}[/.\-]\d{4}\b/g),
    ].map((date) => toIsoDate(date[0]));
    rows.push({
      section:
        match[1] === "EMPRESARIAL"
          ? "BUSINESS"
          : match[1] === "PROFESIONAL"
            ? "PROFESSIONAL"
            : "ARTISTIC",
      code: match[2].replace(",", "."),
      description: match[3].replace(/\s+/g, " ").trim(),
      state: match[4] === "ALTA" ? "ACTIVE" : "INACTIVE",
      ...(dates[0] ? { startDate: dates[0] } : {}),
      ...(dates[1] ? { endDate: dates[1] } : {}),
    });
  }
  return [
    ...new Map(
      rows.map((row) => [
        `${row.section}:${row.code}:${row.state}:${row.startDate ?? ""}`,
        row,
      ]),
    ).values(),
  ];
}

function parseFragmentedActivityRows(lines: string[]): AeatCensusActivityRow[] {
  const markerIndex = lines.lastIndexOf(AEAT_ACTIVITY_SPARSE_OCR_MARKER);
  const activityLines = markerIndex >= 0 ? lines.slice(markerIndex + 1) : lines;
  if (!lines.some((line) => line.includes("RELACION DE ACTIVIDADES"))) {
    return [];
  }
  const sectionIndexes = activityLines.flatMap((line, index) =>
    /^(EMPRESARIAL|PROFESIONAL|ARTISTICA)$/.test(line) ? [index] : [],
  );
  const rows: AeatCensusActivityRow[] = [];
  for (const [position, sectionIndex] of sectionIndexes.entries()) {
    const previousIndex = sectionIndexes[position - 1];
    const nextIndex = sectionIndexes[position + 1];
    const start = Math.max(
      sectionIndex - 4,
      previousIndex === undefined
        ? 0
        : Math.floor((previousIndex + sectionIndex) / 2) + 1,
    );
    const end = Math.min(
      sectionIndex + 6,
      nextIndex === undefined
        ? activityLines.length - 1
        : Math.floor((sectionIndex + nextIndex) / 2),
    );
    const segment = activityLines.slice(start, end + 1);
    const code = segment.find((line) => {
      if (!/^\d{1,3}(?:[.,]\d{1,2})?$/.test(line)) return false;
      return Number(line.replace(",", ".")) < 1000;
    });
    const dates = segment
      .flatMap((line) =>
        [...line.matchAll(/\b\d{1,2}[/.-]\d{1,2}[/.-]\d{4}\b/g)].map((match) =>
          toIsoDate(match[0]),
        ),
      )
      .filter((date): date is string => Boolean(date));
    const explicitState = segment.find((line) => /^(ALTA|BAJA)$/.test(line));
    const state =
      explicitState === "ALTA"
        ? "ACTIVE"
        : explicitState === "BAJA"
          ? "INACTIVE"
          : dates.length === 1
            ? "ACTIVE"
            : dates.length >= 2
              ? "INACTIVE"
              : null;
    const description = segment
      .filter(
        (line) =>
          line !== code &&
          line !== activityLines[sectionIndex] &&
          !/^(ALTA|BAJA)$/.test(line) &&
          !/\b\d{1,2}[/.-]\d{1,2}[/.-]\d{4}\b/.test(line) &&
          !/(RELACION DE ACTIVIDADES|CENSO DE ACTIVIDADES|TITULAR|AGENCIA TRIBUTARIA|CONTACTA CON NOSOTROS|ACCESIBILIDAD)/.test(
            line,
          ) &&
          /[A-Z]{3}/.test(line),
      )
      .sort((left, right) => right.length - left.length)[0];
    if (!code || !state || !description) continue;
    rows.push({
      section:
        activityLines[sectionIndex] === "EMPRESARIAL"
          ? "BUSINESS"
          : activityLines[sectionIndex] === "PROFESIONAL"
            ? "PROFESSIONAL"
            : "ARTISTIC",
      code: code.replace(",", "."),
      description,
      state,
      ...(dates[0] ? { startDate: dates[0] } : {}),
      ...(dates[1] ? { endDate: dates[1] } : {}),
    });
  }
  return rows;
}

function uniqueActivities(
  rows: AeatCensusActivityRow[],
): AeatCensusActivityRow[] {
  return [
    ...new Map(
      rows.map((row) => [
        `${row.section}:${row.code}:${row.state}:${row.startDate ?? ""}`,
        row,
      ]),
    ).values(),
  ];
}

function parseActivityDetail(lines: string[]): AeatCensusActivityRow | null {
  const allText = lines.join(" ");
  const section = allText.match(
    /\bSECCION\s*:?\s*(EMPRESARIAL|PROFESIONAL|ARTISTICA)\b/,
  )?.[1];
  const state = allText.match(/\bACTIVIDAD\s+EN\s+(ALTA|BAJA)\b/)?.[1];
  const codeAndDescription = lines
    .map((line) =>
      line.match(
        /(?:GRUPO\s*\/?\s*EPIGRAFE\s*:?\s*)?\b(\d{1,4}(?:[.,]\d{1,2})?)\s+([A-Z][A-Z0-9 ,.()\-/]{4,})$/,
      ),
    )
    .find((match) => Boolean(match));
  const labelledCode = lines
    .map((line) =>
      line.match(/GRUPO\s*\/?\s*EPIGRAFE\s*:?\s*(\d{1,4}(?:[.,]\d{1,2})?)/),
    )
    .find((match) => Boolean(match));
  const labelledDescription = lines
    .map((line) => line.match(/DESCRIPCION DE LA ACTIVIDAD\s+(.+)$/))
    .find((match) => Boolean(match));
  const code = codeAndDescription?.[1] ?? labelledCode?.[1];
  const description = (codeAndDescription?.[2] ?? labelledDescription?.[1])
    ?.replace(/\s+GRUPO\s*\/?\s*EPIGRAFE.*$/, "")
    .trim();
  if (!section || !state || !code || !description) return null;

  const startDate = lines
    .find((line) => line.includes("FECHA DE INICIO DE LA ACTIVIDAD"))
    ?.match(/\b\d{1,2}[/.-]\d{1,2}[/.-]\d{4}\b/)?.[0];
  return {
    section:
      section === "EMPRESARIAL"
        ? "BUSINESS"
        : section === "PROFESIONAL"
          ? "PROFESSIONAL"
          : "ARTISTIC",
    code: code.replace(",", "."),
    description,
    state: state === "ALTA" ? "ACTIVE" : "INACTIVE",
    ...(toIsoDate(startDate) ? { startDate: toIsoDate(startDate) } : {}),
  };
}

function hasDocumentEnd(lines: string[]): boolean {
  return lines.some(
    (line) =>
      line.includes("ACCESIBILIDAD") ||
      (line.includes("CALENDARIO") && line.includes("FECHA Y HORA OFICIAL")),
  );
}

function hasMarkedCode(lines: string[], code: string): boolean {
  return lines.some((line) => {
    const after = new RegExp(`\\b${code}\\b.{0,24}\\bX\\b`);
    const before = new RegExp(`\\bX\\b.{0,24}\\b${code}\\b`);
    return after.test(line) || before.test(line);
  });
}

function taxStatusFacts(lines: string[]) {
  const incomeCandidates: IncomeTaxRegime[] = [];
  if (hasMarkedCode(lines, "608")) incomeCandidates.push("DIRECT_NORMAL");
  if (hasMarkedCode(lines, "609")) incomeCandidates.push("DIRECT_SIMPLIFIED");
  if (hasMarkedCode(lines, "604"))
    incomeCandidates.push("OBJECTIVE_ESTIMATION");

  const vatRegimes: DiagnosticVatRegime[] = [];
  const vatCodes: readonly [string, DiagnosticVatRegime][] = [
    ["510", "GENERAL"],
    ["514", "EQUIVALENCE_SURCHARGE"],
    ["526", "AGRICULTURE_LIVESTOCK_FISHING"],
    ["550", "SIMPLIFIED"],
    ["517", "CASH_ACCOUNTING"],
    ["518", "OTHER_SPECIAL"],
    ["522", "OTHER_SPECIAL"],
    ["574", "OTHER_SPECIAL"],
  ];
  for (const [code, regime] of vatCodes) {
    if (hasMarkedCode(lines, code)) vatRegimes.push(regime);
  }

  return {
    incomeCandidates: [...new Set(incomeCandidates)],
    vatRegimes: [...new Set(vatRegimes)],
  };
}

function obligationFacts(lines: string[]) {
  const activeRows = lines.filter(
    (line) =>
      /\bALTA\b/.test(line) &&
      (/(?:TRIMESTRAL|MENSUAL|ANUAL)/.test(line) ||
        OBLIGATION_RULES.some((rule) => rule.label.test(line))),
  );
  const models = new Set<TaxModelNumber>();
  let unknownActiveRows = 0;
  for (const line of activeRows) {
    const matching = OBLIGATION_RULES.filter((rule) => rule.label.test(line));
    if (matching.length !== 1) {
      unknownActiveRows += 1;
      continue;
    }
    models.add(matching[0].model);
  }
  const explicitlyEmpty = lines.some((line) =>
    /NO\s+(?:CONSTAN|EXISTEN)\s+OBLIGACIONES/.test(line),
  );
  return {
    models: [...models].sort() as TaxModelNumber[],
    activeRowCount: activeRows.length,
    unknownActiveRows,
    explicitlyEmpty,
  };
}

function blockedCandidate(
  expectedKind: AeatCensusScreenshotKind,
  detectedKind: AeatCensusScreenshotCandidate["detectedKind"],
): AeatCensusScreenshotCandidate {
  return {
    contractVersion: AEAT_CENSUS_SCREENSHOT_CONTRACT_VERSION,
    expectedKind,
    detectedKind,
    status: "BLOCKED",
    isComplete: false,
    activities: [],
    activityKinds: [],
    incomeTaxRegime: "UNKNOWN",
    vatRegimes: [],
    activeTaxModels: [],
    warnings: [
      detectedKind === "UNKNOWN"
        ? "No se reconoce la pantalla de la AEAT. Repite la captura procurando que los campos con sus valores sean legibles."
        : "La captura pertenece a otro apartado. Colócala en el bloque que indica su título.",
    ],
  };
}

export function parseAeatCensusScreenshotText(
  text: string,
  expectedKind: AeatCensusScreenshotKind,
): AeatCensusScreenshotCandidate {
  const lines = normalizedLines(text.slice(0, 160_000));
  const detectedKind = detectAeatCensusScreenshotKind(text);
  if (detectedKind !== expectedKind) {
    return blockedCandidate(expectedKind, detectedKind);
  }

  const warnings: string[] = [];
  const base = {
    contractVersion: AEAT_CENSUS_SCREENSHOT_CONTRACT_VERSION,
    expectedKind,
    detectedKind,
  } as const;

  if (expectedKind === "ACTIVITIES") {
    const primaryActivities = parseActivities(lines);
    const primaryActivityKeys = new Set(
      primaryActivities.map((row) => `${row.section}:${row.code}:${row.state}`),
    );
    const fragmentedActivities = parseFragmentedActivityRows(lines).filter(
      (row) =>
        !primaryActivityKeys.has(`${row.section}:${row.code}:${row.state}`),
    );
    const tableActivities = uniqueActivities([
      ...primaryActivities,
      ...fragmentedActivities,
    ]);
    const detailActivity =
      tableActivities.length === 0 ? parseActivityDetail(lines) : null;
    const activities = detailActivity ? [detailActivity] : tableActivities;
    const active = activities.filter((row) => row.state === "ACTIVE");
    const activityKinds = [
      ...new Set(
        active.map<ActivityKind>((row) =>
          row.section === "BUSINESS"
            ? "BUSINESS"
            : row.section === "PROFESSIONAL"
              ? "PROFESSIONAL"
              : "OTHER",
        ),
      ),
    ];
    if (activities.some((row) => row.state === "INACTIVE")) {
      warnings.push(
        "Las filas en baja se conservan como histórico y no se aplican al perfil actual.",
      );
    }
    if (active.length === 0) {
      warnings.push(
        "No se ha podido confirmar ninguna actividad en alta; no se aplicará una actividad histórica.",
      );
    }
    if (detailActivity) {
      warnings.push(
        "El detalle confirma esta actividad, pero no permite saber si existen otras actividades en alta.",
      );
    }
    const hasTableHeaders =
      lines.some((line) => line.includes("EPIGRAFE")) &&
      lines.some((line) => line.includes("ESTADO"));
    const isActivityList = lines.some((line) =>
      line.includes("RELACION DE ACTIVIDADES"),
    );
    const isComplete =
      isActivityList &&
      (hasTableHeaders || hasDocumentEnd(lines)) &&
      activities.length > 0 &&
      active.length > 0;
    return {
      ...base,
      status: active.length > 0 ? "RESOLVED" : "REVIEW_REQUIRED",
      isComplete,
      activities,
      activityKinds,
      incomeTaxRegime: "UNKNOWN",
      vatRegimes: [],
      activeTaxModels: [],
      warnings,
    };
  }

  if (expectedKind === "TAX_STATUS") {
    const { incomeCandidates, vatRegimes } = taxStatusFacts(lines);
    const incomeTaxRegime =
      incomeCandidates.length === 1 ? incomeCandidates[0] : "UNKNOWN";
    if (incomeCandidates.length > 1) {
      warnings.push(
        "Se han leído varios regímenes de IRPF marcados. Deben revisarse antes de aplicar uno.",
      );
    }
    if (incomeTaxRegime === "UNKNOWN" && vatRegimes.length === 0) {
      warnings.push(
        "La pantalla se reconoce, pero no hay casillas fiscales compatibles leídas con seguridad.",
      );
    }
    const allText = lines.join(" ");
    const isComplete =
      allText.includes("SITUACION TRIBUTARIA") &&
      allText.includes("IMPUESTO SOBRE LA RENTA DE LAS PERSONAS FISICAS") &&
      allText.includes("IMPUESTO SOBRE EL VALOR ANADIDO");
    if (!isComplete) {
      warnings.push(
        "La situación tributaria parece parcial. Puedes añadir más capturas del mismo apartado.",
      );
    }
    const hasFacts = incomeTaxRegime !== "UNKNOWN" || vatRegimes.length > 0;
    return {
      ...base,
      status:
        hasFacts && incomeCandidates.length <= 1
          ? "RESOLVED"
          : "REVIEW_REQUIRED",
      isComplete,
      activities: [],
      activityKinds: [],
      incomeTaxRegime,
      vatRegimes,
      activeTaxModels: [],
      warnings,
    };
  }

  const obligations = obligationFacts(lines);
  if (obligations.unknownActiveRows > 0) {
    warnings.push(
      "Hay una fila en alta que no se ha podido asociar a un único código; no se aplicará una lista incompleta.",
    );
  }
  if (obligations.activeRowCount === 0 && !obligations.explicitlyEmpty) {
    warnings.push(
      "No se ha podido confirmar ninguna fila en alta ni una lista vacía expresa.",
    );
  }
  const hasTableHeaders =
    lines.some((line) => line.includes("DESCRIPCION DE LA OBLIGACION")) &&
    lines.some((line) => line.includes("PERIODICIDAD")) &&
    lines.some((line) => line.includes("ESTADO"));
  const hasUsableFacts =
    obligations.models.length > 0 || obligations.explicitlyEmpty;
  const isComplete =
    (hasTableHeaders || hasDocumentEnd(lines)) &&
    obligations.unknownActiveRows === 0 &&
    (obligations.activeRowCount > 0 || obligations.explicitlyEmpty);
  return {
    ...base,
    status:
      hasUsableFacts && obligations.unknownActiveRows === 0
        ? "RESOLVED"
        : "REVIEW_REQUIRED",
    isComplete,
    activities: [],
    activityKinds: [],
    incomeTaxRegime: "UNKNOWN",
    vatRegimes: [],
    // Los códigos leídos de filas inequívocas son útiles aunque la captura sea
    // parcial. `isComplete` separa esos hallazgos de una lista censal cerrada.
    activeTaxModels: obligations.models,
    warnings,
  };
}
