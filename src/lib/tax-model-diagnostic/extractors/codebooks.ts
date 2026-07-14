export const MODEL_190_KEY_DICTIONARY_VERSION =
  "aeat-model-190-keys.2025.v1" as const;
export const MODEL_349_OPERATION_KEY_DICTIONARY_VERSION =
  "aeat-model-349-operation-keys.2025-2026.v1" as const;

export interface Model190KeyDefinition {
  fiscalYear: 2025;
  key: string;
  semanticCategory:
    | "EMPLOYEE"
    | "OTHER_WORK"
    | "ADMINISTRATOR"
    | "PROFESSIONAL"
    | "OTHER_ECONOMIC_ACTIVITY"
    | "IMAGE_RIGHTS"
    | "PRIZE_OR_FORESTRY_GAIN"
    | "EXEMPT_OR_ALLOWANCE";
  employeeIndicator: boolean;
  professionalIndicator: boolean;
  otherIndicator: boolean;
  officialSource: string;
}

const MODEL_190_2025_SOURCE =
  "https://sede.agenciatributaria.gob.es/static_files/Sede/Disenyo_registro/DR_100_199/archivos_25/DISENOS_LOGICOS_190_2025.pdf";

function model190Key(
  key: string,
  semanticCategory: Model190KeyDefinition["semanticCategory"],
  indicators: Pick<
    Model190KeyDefinition,
    "employeeIndicator" | "professionalIndicator" | "otherIndicator"
  >,
): Model190KeyDefinition {
  return {
    fiscalYear: 2025,
    key,
    semanticCategory,
    ...indicators,
    officialSource: MODEL_190_2025_SOURCE,
  };
}

export const MODEL_190_KEY_DICTIONARY: readonly Model190KeyDefinition[] = [
  model190Key("A", "EMPLOYEE", {
    employeeIndicator: true,
    professionalIndicator: false,
    otherIndicator: false,
  }),
  ...["B", "C", "D", "F"].map((key) =>
    model190Key(key, "OTHER_WORK", {
      employeeIndicator: false,
      professionalIndicator: false,
      otherIndicator: true,
    }),
  ),
  model190Key("E", "ADMINISTRATOR", {
    employeeIndicator: false,
    professionalIndicator: false,
    otherIndicator: true,
  }),
  model190Key("G", "PROFESSIONAL", {
    employeeIndicator: false,
    professionalIndicator: true,
    otherIndicator: false,
  }),
  ...["H", "I"].map((key) =>
    model190Key(key, "OTHER_ECONOMIC_ACTIVITY", {
      employeeIndicator: false,
      professionalIndicator: false,
      otherIndicator: true,
    }),
  ),
  model190Key("J", "IMAGE_RIGHTS", {
    employeeIndicator: false,
    professionalIndicator: false,
    otherIndicator: true,
  }),
  model190Key("K", "PRIZE_OR_FORESTRY_GAIN", {
    employeeIndicator: false,
    professionalIndicator: false,
    otherIndicator: true,
  }),
  model190Key("L", "EXEMPT_OR_ALLOWANCE", {
    employeeIndicator: false,
    professionalIndicator: false,
    otherIndicator: true,
  }),
];

export function model190KeyDefinitions(
  fiscalYear: number | undefined,
  keys: readonly string[],
): readonly Model190KeyDefinition[] {
  if (fiscalYear !== 2025) return [];
  const requested = new Set(keys);
  return MODEL_190_KEY_DICTIONARY.filter((entry) => requested.has(entry.key));
}

export interface Model349OperationKeyDefinition {
  fiscalYears: readonly [2025, 2026];
  key: "E" | "A" | "S" | "I";
  questionId:
    | "I_EU_GOODS_SALES"
    | "I_EU_GOODS_PURCHASES"
    | "I_EU_SERVICES_SALES"
    | "I_EU_SERVICES_PURCHASES";
  officialSource: string;
}

const MODEL_349_SOURCE =
  "https://sede.agenciatributaria.gob.es/static_files/Sede/Procedimiento_ayuda/GI28/instr_mod_349.pdf";

export const MODEL_349_OPERATION_KEY_DICTIONARY: readonly Model349OperationKeyDefinition[] =
  [
    {
      fiscalYears: [2025, 2026],
      key: "E",
      questionId: "I_EU_GOODS_SALES",
      officialSource: MODEL_349_SOURCE,
    },
    {
      fiscalYears: [2025, 2026],
      key: "A",
      questionId: "I_EU_GOODS_PURCHASES",
      officialSource: MODEL_349_SOURCE,
    },
    {
      fiscalYears: [2025, 2026],
      key: "S",
      questionId: "I_EU_SERVICES_SALES",
      officialSource: MODEL_349_SOURCE,
    },
    {
      fiscalYears: [2025, 2026],
      key: "I",
      questionId: "I_EU_SERVICES_PURCHASES",
      officialSource: MODEL_349_SOURCE,
    },
  ];

export function model349OperationKeys(
  fiscalYear: number | undefined,
  keys: readonly string[],
): readonly Model349OperationKeyDefinition[] {
  if (fiscalYear !== 2025 && fiscalYear !== 2026) return [];
  const requested = new Set(keys);
  return MODEL_349_OPERATION_KEY_DICTIONARY.filter((entry) =>
    requested.has(entry.key),
  );
}
