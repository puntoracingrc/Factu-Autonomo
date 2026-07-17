import rawContracts from "./aeat-p0-deep-contracts.v10.json";
import {
  AEAT_OFFICIAL_CATALOG_PROFILE_IDS_V9,
  type AeatOfficialCatalogProfileIdV9,
} from "./official-catalog-expansion.v9";

export const AEAT_P0_DEEP_SCHEMA_VERSION_V10 = 10 as const;
export const AEAT_P0_DEEP_RELEASE_ID_V10 =
  "aeat-p0-deep-contracts.2026-07-17.v10" as const;

export const AEAT_P0_DEEP_PROFILE_IDS_V10 = Object.freeze([
  "evidence.submission_receipt",
  "procedure.deadline_extension_request",
  "procedure.deadline_extension_decision",
  "assessment.rectification_request",
  "assessment.rectification_requirement",
  "assessment.rectification_proposal",
  "assessment.rectification_resolution",
  "filing.rectifying_self_assessment_receipt",
  "review.execution_resolution",
  "certificate.specialized",
  "certificate.correction_or_disagreement",
] as const satisfies readonly AeatOfficialCatalogProfileIdV9[]);
export type AeatP0DeepProfileIdV10 =
  (typeof AEAT_P0_DEEP_PROFILE_IDS_V10)[number];

export const AEAT_P0_ASSERTION_LAYERS_V10 = Object.freeze([
  "PRINTED",
  "NORMALIZED",
  "CALCULATED_FROM_PRINTED_VALUES",
  "LEGAL_RULE_APPLIED",
  "RELATION_INFERRED",
  "CONFIRMED_BY_LATER_DOCUMENT",
  "NOT_PROVEN",
] as const);
export type AeatP0AssertionLayerV10 =
  (typeof AEAT_P0_ASSERTION_LAYERS_V10)[number];

export type AeatP0FieldTypeV10 =
  | "BOOLEAN" | "DATE" | "DATE_OR_RULE" | "DATE_TIME" | "DURATION"
  | "ENUM" | "ENUM_LIST" | "ENUM_TEXT" | "INTEGER" | "MODEL" | "MONEY"
  | "PERIOD" | "REFERENCE" | "ROLE" | "SENSITIVE_REFERENCE" | "TIME"
  | "TYPED_LIST" | "TYPED_TEXT" | "YEAR";
export type AeatP0FieldAssertionV10 =
  | "EXTERNAL_EVIDENCE" | "NORMALIZED" | "PRINTED"
  | "PRINTED_OR_CALCULATED" | "PRINTED_OR_DERIVED_WITH_EVIDENCE"
  | "PRINTED_OR_EXTERNAL_EVIDENCE" | "PRINTED_OR_RELATION"
  | "PRINTED_SUMMARY_ONLY";
export type AeatP0FieldPrivacyV10 =
  | "PERSIST" | "FINGERPRINT_ONLY" | "ROLE_ONLY";

export interface AeatP0CanonicalFieldV10 {
  readonly id: string;
  readonly type: AeatP0FieldTypeV10;
  readonly required: boolean;
  readonly labelVariants: readonly string[];
  readonly assertionType: AeatP0FieldAssertionV10;
  readonly privacy: AeatP0FieldPrivacyV10;
  readonly notes: string;
}

export interface AeatP0ProfileV10 {
  readonly profileId: AeatP0DeepProfileIdV10;
  readonly titleEs: string;
  readonly procedurePhase: string;
  readonly maturity: string;
  readonly expectedParts: readonly Readonly<{
    kind: string;
    pattern: string;
    effect: string;
  }>[];
  readonly recognition: Readonly<{
    strongAnchorSets: readonly (readonly string[])[];
    weakAnchors: readonly string[];
    incompatibleAnchors: readonly string[];
    titlePrecedence: "EXACT_OR_NEAR_EXACT_TITLE_BEATS_GENERIC_BODY_TERMS";
    minimumStrongSetsRequired: 1;
  }>;
  readonly canonicalFields: readonly AeatP0CanonicalFieldV10[];
  readonly states: readonly string[];
  readonly relationRuleIds: readonly string[];
  readonly deadlineRuleIds: readonly string[];
  readonly officialSourceIds: readonly AeatP0OfficialSourceIdV10[];
  readonly explanationTemplate: Readonly<{
    whatItIs: string;
    result: string;
    whatToDo: string;
    deadline: string;
    after: string;
    notProven: string;
  }>;
  readonly notProvenByDocument: readonly string[];
  readonly warnings: readonly string[];
  readonly requiredTests: readonly string[];
  readonly requiresHumanReview: true;
  readonly materializationPolicy: "PROHIBITED_UNTIL_REVIEW";
  readonly permitsDebtCreation: false;
  readonly permitsDeadlineCreation: false;
  readonly permitsPaymentAction: false;
  readonly permitsAccountingAction: false;
}

export const AEAT_P0_OFFICIAL_SOURCE_IDS_V10 = Object.freeze([
  "AEAT_SUBMISSION_HELP",
  "AEAT_SUBMISSION_REPORT",
  "AEAT_INFORMATION_RETURN_RECEIPT",
  "BOE_RD1065_ART91",
  "AEAT_RECTIFICATION_GZ28",
  "BOE_RD1065_ART126_129",
  "AEAT_VAT_RECTIFYING_303",
  "AEAT_VAT_RECTIFYING_MANUAL",
  "BOE_RD520_ART66",
  "AEAT_CERT_CONTRACTORS_G303",
  "AEAT_CERT_CENSUS_G313",
  "AEAT_CERT_GENERAL_FAQ",
] as const);
export type AeatP0OfficialSourceIdV10 =
  (typeof AEAT_P0_OFFICIAL_SOURCE_IDS_V10)[number];

export interface AeatP0OfficialSourceV10 {
  readonly sourceId: AeatP0OfficialSourceIdV10;
  readonly title: string;
  readonly url: string;
  readonly authority: "AEAT" | "BOE";
  readonly lastChecked: "2026-07-17";
  readonly effectiveFrom: string | null;
  readonly effectiveTo: null;
  readonly legalVersion: string | null;
  readonly profileIds: readonly AeatP0DeepProfileIdV10[];
  readonly loadBearingFacts: string;
  readonly usagePolicy: "VERSIONED_OFFICIAL_CONTEXT_AND_CLOSED_RULES";
}

export interface AeatP0CorrectionV10 {
  readonly correctionId: `V10-CORR-00${1 | 2 | 3 | 4 | 5}`;
  readonly area: string;
  readonly previousSimplification: string;
  readonly correctRule: string;
  readonly engineChange: string;
  readonly sourceId: AeatP0OfficialSourceIdV10;
  readonly severity: "HIGH" | "MEDIUM";
}

export interface AeatP0DeepContractsV10 {
  readonly schemaVersion: 10;
  readonly releaseId: typeof AEAT_P0_DEEP_RELEASE_ID_V10;
  readonly meta: Readonly<{
    title: string;
    version: "10.0.0";
    createdAt: "2026-07-17";
    profileCount: 11;
    purpose: string;
    privacy: string;
  }>;
  readonly architecture: Readonly<{
    sourceVersioning: Readonly<{
      requiredFields: readonly string[];
      rule: string;
    }>;
    assertionLayers: readonly AeatP0AssertionLayerV10[];
    confidenceGates: Readonly<{
      AUTO_ACTION_BLOCKED: readonly string[];
      USER_REVIEW_REQUIRED: readonly string[];
    }>;
    graphReconciliation: Readonly<{
      when: readonly string[];
      allowStateUpgrade: readonly string[];
      auditFields: readonly string[];
    }>;
  }>;
  readonly correctionsToPreviousResearch: readonly AeatP0CorrectionV10[];
  readonly profiles: readonly AeatP0ProfileV10[];
}

type DataRecord = Record<string, unknown>;
const CONTROL = /[\u0000-\u001f\u007f-\u009f]/u;
const CLOSED_ID = /^[A-Z][A-Z0-9_]{0,159}$/u;
const PROFILE_ID = /^[a-z][a-z0-9]*(?:[._][a-z0-9]+)+$/u;
const DIRECT_EMAIL = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/iu;
const IBAN = /\bES\d{22}\b/u;
const TAX_ID = /\b(?:\d{8}[A-Z]|[XYZ]\d{7}[A-Z]|[ABCDEFGHJNPQRSUVW]\d{7}[0-9A-J])\b/u;
const FIELD_TYPES = new Set<AeatP0FieldTypeV10>([
  "BOOLEAN", "DATE", "DATE_OR_RULE", "DATE_TIME", "DURATION", "ENUM",
  "ENUM_LIST", "ENUM_TEXT", "INTEGER", "MODEL", "MONEY", "PERIOD",
  "REFERENCE", "ROLE", "SENSITIVE_REFERENCE", "TIME", "TYPED_LIST",
  "TYPED_TEXT", "YEAR",
]);
const FIELD_ASSERTIONS = new Set<AeatP0FieldAssertionV10>([
  "EXTERNAL_EVIDENCE", "NORMALIZED", "PRINTED", "PRINTED_OR_CALCULATED",
  "PRINTED_OR_DERIVED_WITH_EVIDENCE", "PRINTED_OR_EXTERNAL_EVIDENCE",
  "PRINTED_OR_RELATION", "PRINTED_SUMMARY_ONLY",
]);
const FIELD_PRIVACY = new Set<AeatP0FieldPrivacyV10>([
  "PERSIST", "FINGERPRINT_ONLY", "ROLE_ONLY",
]);
const PROFILE_KEYS = Object.freeze([
  "profileId", "titleEs", "procedurePhase", "maturity", "expectedParts",
  "recognition", "canonicalFields", "states", "relationRuleIds",
  "deadlineRuleIds", "officialSourceIds", "explanationTemplate",
  "notProvenByDocument", "warnings", "requiredTests",
] as const);

function invalid(path: string): never {
  throw new Error(`AEAT_P0_DEEP_V10_INVALID:${path}`);
}

function record(value: unknown, path: string): DataRecord {
  if (value === null || typeof value !== "object" || Array.isArray(value)) invalid(path);
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) invalid(path);
  const descriptors = Object.getOwnPropertyDescriptors(value);
  if (Object.values(descriptors).some((item) => item.get || item.set || !("value" in item))) {
    invalid(path);
  }
  return value as DataRecord;
}

function exact(value: DataRecord, path: string, keys: readonly string[]): void {
  const actual = Object.keys(value);
  if (actual.length !== keys.length || actual.some((key) => !keys.includes(key))) invalid(path);
  for (const key of keys) if (!(key in value)) invalid(`${path}.${key}`);
}

function text(value: unknown, path: string, options?: { empty?: boolean; max?: number }): string {
  if (
    typeof value !== "string" ||
    (!options?.empty && value.length === 0) ||
    value.length > (options?.max ?? 2_000) ||
    value.trim() !== value ||
    CONTROL.test(value)
  ) invalid(path);
  return value;
}

function strings(value: unknown, path: string, min: number, max = 80): readonly string[] {
  if (!Array.isArray(value) || value.length < min || value.length > max) invalid(path);
  const output = value.map((item, index) => text(item, `${path}[${index}]`, { max: 1_000 }));
  if (new Set(output).size !== output.length) invalid(path);
  return Object.freeze(output);
}

function assertSafeGraph(value: unknown): void {
  const stack = [value];
  const seen = new WeakSet<object>();
  let nodes = 0;
  let chars = 0;
  while (stack.length > 0) {
    const item = stack.pop();
    nodes += 1;
    if (nodes > 30_000) invalid("graph");
    if (typeof item === "string") {
      chars += item.length;
      if (chars > 300_000 || DIRECT_EMAIL.test(item) || IBAN.test(item) || TAX_ID.test(item)) {
        invalid("privacy");
      }
      continue;
    }
    if (item === null || typeof item !== "object") continue;
    if (seen.has(item)) invalid("graph");
    seen.add(item);
    const prototype = Object.getPrototypeOf(item);
    if (!Array.isArray(item) && prototype !== Object.prototype && prototype !== null) invalid("graph");
    if (Reflect.ownKeys(item).some((key) => typeof key === "symbol")) invalid("graph");
    for (const [key, descriptor] of Object.entries(Object.getOwnPropertyDescriptors(item))) {
      if (descriptor.get || descriptor.set || !("value" in descriptor)) invalid(`graph.${key}`);
      stack.push(descriptor.value);
    }
  }
}

function freezeDeep<T>(value: T, seen = new WeakSet<object>()): T {
  if (value !== null && typeof value === "object") {
    if (seen.has(value)) return value;
    seen.add(value);
    Object.values(value as DataRecord).forEach((item) => freezeDeep(item, seen));
    Object.freeze(value);
  }
  return value;
}

function parseField(value: unknown, path: string): AeatP0CanonicalFieldV10 {
  const field = record(value, path);
  exact(field, path, ["id", "type", "required", "labelVariants", "assertionType", "privacy", "notes"]);
  const id = text(field.id, `${path}.id`, { max: 160 });
  const type = text(field.type, `${path}.type`, { max: 80 }) as AeatP0FieldTypeV10;
  const assertionType = text(field.assertionType, `${path}.assertionType`, { max: 80 }) as AeatP0FieldAssertionV10;
  const privacy = text(field.privacy, `${path}.privacy`, { max: 80 }) as AeatP0FieldPrivacyV10;
  if (!CLOSED_ID.test(id) || !FIELD_TYPES.has(type) || !FIELD_ASSERTIONS.has(assertionType) || !FIELD_PRIVACY.has(privacy) || typeof field.required !== "boolean") invalid(path);
  return Object.freeze({
    id,
    type,
    required: field.required,
    labelVariants: strings(field.labelVariants, `${path}.labelVariants`, 1, 12),
    assertionType,
    privacy,
    notes: text(field.notes, `${path}.notes`, { empty: true, max: 1_000 }),
  });
}

function parseProfile(value: unknown, path: string): AeatP0ProfileV10 {
  const profile = record(value, path);
  exact(profile, path, PROFILE_KEYS);
  const profileId = text(profile.profileId, `${path}.profileId`, { max: 160 }) as AeatP0DeepProfileIdV10;
  if (!PROFILE_ID.test(profileId) || !AEAT_P0_DEEP_PROFILE_IDS_V10.includes(profileId)) invalid(`${path}.profileId`);
  const canonicalFieldsInput = profile.canonicalFields;
  if (!Array.isArray(canonicalFieldsInput) || canonicalFieldsInput.length === 0 || canonicalFieldsInput.length > 32) invalid(`${path}.canonicalFields`);
  const canonicalFields = canonicalFieldsInput.map((item, index) => parseField(item, `${path}.canonicalFields[${index}]`));
  if (new Set(canonicalFields.map((field) => field.id)).size !== canonicalFields.length) invalid(`${path}.canonicalFields`);
  const recognition = record(profile.recognition, `${path}.recognition`);
  exact(recognition, `${path}.recognition`, ["strongAnchorSets", "weakAnchors", "incompatibleAnchors", "titlePrecedence", "minimumStrongSetsRequired"]);
  if (!Array.isArray(recognition.strongAnchorSets) || recognition.strongAnchorSets.length === 0 || recognition.strongAnchorSets.length > 8) invalid(`${path}.recognition.strongAnchorSets`);
  const strongAnchorSets = recognition.strongAnchorSets.map((item, index) => strings(item, `${path}.recognition.strongAnchorSets[${index}]`, 2, 8));
  if (recognition.titlePrecedence !== "EXACT_OR_NEAR_EXACT_TITLE_BEATS_GENERIC_BODY_TERMS" || recognition.minimumStrongSetsRequired !== 1) invalid(`${path}.recognition`);
  if (!Array.isArray(profile.expectedParts) || profile.expectedParts.length === 0 || profile.expectedParts.length > 8) invalid(`${path}.expectedParts`);
  const expectedParts = profile.expectedParts.map((item, index) => {
    const part = record(item, `${path}.expectedParts[${index}]`);
    exact(part, `${path}.expectedParts[${index}]`, ["kind", "pattern", "effect"]);
    return Object.freeze({
      kind: text(part.kind, `${path}.expectedParts[${index}].kind`, { max: 160 }),
      pattern: text(part.pattern, `${path}.expectedParts[${index}].pattern`, { max: 500 }),
      effect: text(part.effect, `${path}.expectedParts[${index}].effect`, { max: 160 }),
    });
  });
  const sourceIds = strings(profile.officialSourceIds, `${path}.officialSourceIds`, 1, 12) as readonly AeatP0OfficialSourceIdV10[];
  if (sourceIds.some((id) => !AEAT_P0_OFFICIAL_SOURCE_IDS_V10.includes(id))) invalid(`${path}.officialSourceIds`);
  const explanation = record(profile.explanationTemplate, `${path}.explanationTemplate`);
  exact(explanation, `${path}.explanationTemplate`, ["whatItIs", "result", "whatToDo", "deadline", "after", "notProven"]);
  return Object.freeze({
    profileId,
    titleEs: text(profile.titleEs, `${path}.titleEs`),
    procedurePhase: text(profile.procedurePhase, `${path}.procedurePhase`, { max: 80 }),
    maturity: text(profile.maturity, `${path}.maturity`, { max: 120 }),
    expectedParts: Object.freeze(expectedParts),
    recognition: Object.freeze({
      strongAnchorSets: Object.freeze(strongAnchorSets),
      weakAnchors: strings(recognition.weakAnchors, `${path}.recognition.weakAnchors`, 1, 24),
      incompatibleAnchors: strings(recognition.incompatibleAnchors, `${path}.recognition.incompatibleAnchors`, 1, 24),
      titlePrecedence: "EXACT_OR_NEAR_EXACT_TITLE_BEATS_GENERIC_BODY_TERMS",
      minimumStrongSetsRequired: 1,
    }),
    canonicalFields: Object.freeze(canonicalFields),
    states: strings(profile.states, `${path}.states`, 1, 16),
    relationRuleIds: strings(profile.relationRuleIds, `${path}.relationRuleIds`, 1, 16),
    deadlineRuleIds: strings(profile.deadlineRuleIds, `${path}.deadlineRuleIds`, 0, 8),
    officialSourceIds: sourceIds,
    explanationTemplate: Object.freeze({
      whatItIs: text(explanation.whatItIs, `${path}.explanationTemplate.whatItIs`),
      result: text(explanation.result, `${path}.explanationTemplate.result`),
      whatToDo: text(explanation.whatToDo, `${path}.explanationTemplate.whatToDo`),
      deadline: text(explanation.deadline, `${path}.explanationTemplate.deadline`),
      after: text(explanation.after, `${path}.explanationTemplate.after`),
      notProven: text(explanation.notProven, `${path}.explanationTemplate.notProven`),
    }),
    notProvenByDocument: strings(profile.notProvenByDocument, `${path}.notProvenByDocument`, 1, 16),
    warnings: strings(profile.warnings, `${path}.warnings`, 0, 8),
    requiredTests: strings(profile.requiredTests, `${path}.requiredTests`, 4, 16),
    requiresHumanReview: true,
    materializationPolicy: "PROHIBITED_UNTIL_REVIEW",
    permitsDebtCreation: false,
    permitsDeadlineCreation: false,
    permitsPaymentAction: false,
    permitsAccountingAction: false,
  });
}

function parseCorrection(value: unknown, path: string): AeatP0CorrectionV10 {
  const item = record(value, path);
  exact(item, path, ["correctionId", "area", "previousSimplification", "correctRule", "engineChange", "sourceId", "severity"]);
  const correctionId = text(item.correctionId, `${path}.correctionId`, { max: 40 }) as AeatP0CorrectionV10["correctionId"];
  const sourceId = text(item.sourceId, `${path}.sourceId`, { max: 160 }) as AeatP0OfficialSourceIdV10;
  if (!/^V10-CORR-00[1-5]$/u.test(correctionId) || !AEAT_P0_OFFICIAL_SOURCE_IDS_V10.includes(sourceId) || !["HIGH", "MEDIUM"].includes(String(item.severity))) invalid(path);
  return Object.freeze({
    correctionId,
    area: text(item.area, `${path}.area`),
    previousSimplification: text(item.previousSimplification, `${path}.previousSimplification`),
    correctRule: text(item.correctRule, `${path}.correctRule`),
    engineChange: text(item.engineChange, `${path}.engineChange`),
    sourceId,
    severity: item.severity as "HIGH" | "MEDIUM",
  });
}

export function parseAeatP0DeepContractsV10(input: unknown): AeatP0DeepContractsV10 {
  assertSafeGraph(input);
  const root = record(structuredClone(input), "root");
  exact(root, "root", ["meta", "architecture", "correctionsToPreviousResearch", "profiles"]);
  const meta = record(root.meta, "meta");
  exact(meta, "meta", ["title", "version", "createdAt", "profileCount", "purpose", "privacy"]);
  if (meta.version !== "10.0.0" || meta.createdAt !== "2026-07-17" || meta.profileCount !== 11) invalid("meta");
  const architecture = record(root.architecture, "architecture");
  exact(architecture, "architecture", ["sourceVersioning", "assertionLayers", "confidenceGates", "graphReconciliation"]);
  const sourceVersioning = record(architecture.sourceVersioning, "architecture.sourceVersioning");
  exact(sourceVersioning, "architecture.sourceVersioning", ["requiredFields", "rule"]);
  const confidenceGates = record(architecture.confidenceGates, "architecture.confidenceGates");
  exact(confidenceGates, "architecture.confidenceGates", ["AUTO_ACTION_BLOCKED", "USER_REVIEW_REQUIRED"]);
  const graphReconciliation = record(architecture.graphReconciliation, "architecture.graphReconciliation");
  exact(graphReconciliation, "architecture.graphReconciliation", ["when", "allowStateUpgrade", "auditFields"]);
  const layers = strings(architecture.assertionLayers, "architecture.assertionLayers", 7, 7) as readonly AeatP0AssertionLayerV10[];
  if (layers.some((layer, index) => layer !== AEAT_P0_ASSERTION_LAYERS_V10[index])) invalid("architecture.assertionLayers");
  if (!Array.isArray(root.correctionsToPreviousResearch) || root.correctionsToPreviousResearch.length !== 5) invalid("correctionsToPreviousResearch");
  const corrections = root.correctionsToPreviousResearch.map((item, index) => parseCorrection(item, `correctionsToPreviousResearch[${index}]`));
  if (new Set(corrections.map((item) => item.correctionId)).size !== 5) invalid("correctionsToPreviousResearch");
  if (!Array.isArray(root.profiles) || root.profiles.length !== 11) invalid("profiles");
  const profiles = root.profiles.map((item, index) => parseProfile(item, `profiles[${index}]`));
  if (profiles.some((profile, index) => profile.profileId !== AEAT_P0_DEEP_PROFILE_IDS_V10[index])) invalid("profiles.order");
  const v9Ids = new Set<string>(AEAT_OFFICIAL_CATALOG_PROFILE_IDS_V9);
  if (profiles.some((profile) => !v9Ids.has(profile.profileId))) invalid("profiles.compatibility");
  return freezeDeep({
    schemaVersion: 10 as const,
    releaseId: AEAT_P0_DEEP_RELEASE_ID_V10,
    meta: {
      title: text(meta.title, "meta.title"),
      version: "10.0.0" as const,
      createdAt: "2026-07-17" as const,
      profileCount: 11 as const,
      purpose: text(meta.purpose, "meta.purpose"),
      privacy: text(meta.privacy, "meta.privacy"),
    },
    architecture: {
      sourceVersioning: {
        requiredFields: strings(sourceVersioning.requiredFields, "architecture.sourceVersioning.requiredFields", 7, 7),
        rule: text(sourceVersioning.rule, "architecture.sourceVersioning.rule"),
      },
      assertionLayers: layers,
      confidenceGates: {
        AUTO_ACTION_BLOCKED: strings(confidenceGates.AUTO_ACTION_BLOCKED, "architecture.confidenceGates.AUTO_ACTION_BLOCKED", 1, 16),
        USER_REVIEW_REQUIRED: strings(confidenceGates.USER_REVIEW_REQUIRED, "architecture.confidenceGates.USER_REVIEW_REQUIRED", 1, 16),
      },
      graphReconciliation: {
        when: strings(graphReconciliation.when, "architecture.graphReconciliation.when", 1, 16),
        allowStateUpgrade: strings(graphReconciliation.allowStateUpgrade, "architecture.graphReconciliation.allowStateUpgrade", 1, 16),
        auditFields: strings(graphReconciliation.auditFields, "architecture.graphReconciliation.auditFields", 6, 6),
      },
    },
    correctionsToPreviousResearch: Object.freeze(corrections),
    profiles: Object.freeze(profiles),
  });
}

export const AEAT_P0_DEEP_CONTRACTS_V10 = parseAeatP0DeepContractsV10(rawContracts as unknown);
export const AEAT_P0_DEEP_PROFILES_V10 = AEAT_P0_DEEP_CONTRACTS_V10.profiles;

const SOURCE_SEEDS: Readonly<Record<AeatP0OfficialSourceIdV10, readonly [string, string, string | null, string, string | null]>> = Object.freeze({
  AEAT_SUBMISSION_HELP: ["Cómo contestar requerimientos o presentar documentación relacionada con un documento recibido", "https://sede.agenciatributaria.gob.es/Sede/ayuda/consultas-informaticas/notificaciones-electronicas-ayuda-tecnica/contestar-requerimientos-aportar-documentacion.html", null, "La respuesta puede vincularse a una notificación mediante CSV; la vía depende de lo indicado en el acto.", null],
  AEAT_SUBMISSION_REPORT: ["Consulta por rango de fechas: estructura del justificante de presentación", "https://sede.agenciatributaria.gob.es/Sede/ayuda/consultas-informaticas/otros-servicios-ayuda-tecnica/consulta-rango-fechas.html", null, "La primera hoja puede incluir número de entrada, CSV, justificante, día, hora y presentador; después aparece la copia presentada.", null],
  AEAT_INFORMATION_RETURN_RECEIPT: ["Justificante de presentación de declaraciones informativas", "https://sede.agenciatributaria.gob.es/Sede/ayuda/consultas-informaticas/declaraciones-informativas-ayuda-tecnica/consulta-baja-declaraciones-informativas/justificante-grabacion-declaracion.html", null, "El justificante incluye número de entrada o expediente, CSV, NIF del presentador y número de justificante; puede adjuntar copia o resumen.", null],
  BOE_RD1065_ART91: ["Real Decreto 1065/2007, artículo 91: ampliación de plazos", "https://www.boe.es/buscar/act.php?id=BOE-A-2007-15984#a91", "2008-01-01", "Una sola ampliación, máximo mitad del plazo, solicitud antes de los tres días previos, justificación y ausencia de perjuicio a terceros; concesión automática salvo denegación expresa en plazo.", "RD_1065_2007_ART_91"],
  AEAT_RECTIFICATION_GZ28: ["Rectificación de autoliquidaciones de Gestión Tributaria", "https://sede.agenciatributaria.gob.es/Sede/procedimientos/GZ28.shtml", null, "Inicio a instancia, propuesta con 15 días salvo coincidencia total con lo solicitado, resolución estimatoria o denegatoria, plazo máximo de seis meses y recursos de un mes.", null],
  BOE_RD1065_ART126_129: ["Real Decreto 1065/2007, artículos 126 a 129", "https://www.boe.es/buscar/act.php?id=BOE-A-2007-15984#a126", "2008-01-01", "Regula inicio, tramitación, terminación y especialidades de la rectificación tradicional.", "RD_1065_2007_ARTS_126_129"],
  AEAT_VAT_RECTIFYING_303: ["Preguntas frecuentes de autoliquidación rectificativa del modelo 303", "https://sede.agenciatributaria.gob.es/Sede/todas-gestiones/impuestos-tasas/iva/modelo-303-iva-autoliquidacion_/autoliquidacion-rectificativa/preguntas-frecuentes-sobre-autoliquidacion-rectificativa-303.html", "2024-09-01", "Aplicable desde septiembre de 2024 para mensual y 3T 2024 para trimestral; exige identificar la autoliquidación anterior y motivo; contiene excepciones que siguen por solicitud tradicional.", null],
  AEAT_VAT_RECTIFYING_MANUAL: ["Manual IVA: modelo 303 y autoliquidación rectificativa", "https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/manual-iva-2025/capitulo-08-gestion-iva/modelo-303-autoliquidacion-rectificativa.html", "2024-09-01", "La rectificativa vuelve a declarar el período completo, marca casilla específica, indica justificante anterior y al menos un motivo.", null],
  BOE_RD520_ART66: ["Real Decreto 520/2005, artículo 66: ejecución de resoluciones", "https://www.boe.es/buscar/doc.php?id=BOE-A-2005-8662", "2005-06-27", "Las resoluciones se ejecutan en sus propios términos; los actos de ejecución se notifican en un mes desde la entrada de la resolución en el órgano competente y son actos separados del procedimiento original.", "RD_520_2005_ART_66"],
  AEAT_CERT_CONTRACTORS_G303: ["Certificado de contratistas y subcontratistas", "https://sede.agenciatributaria.gob.es/Sede/procedimientos/G303.shtml", null, "Resultado positivo o negativo; disconformidad en diez días desde la recepción.", null],
  AEAT_CERT_CENSUS_G313: ["Certificado de situación censal", "https://sede.agenciatributaria.gob.es/Sede/procedimientos/G313.shtml", null, "No procede recurso ordinario; se admite escrito de disconformidad en diez días; puede emitirse un nuevo certificado o comunicarse motivadamente la negativa.", null],
  AEAT_CERT_GENERAL_FAQ: ["Preguntas frecuentes sobre certificados tributarios", "https://sede.agenciatributaria.gob.es/Sede/certificaciones/contratistas-subcontratistas/certificados-trib_____cados-tributarios-contratistas-subcontratistas_/preguntas-frecuentes.html", null, "Carácter informativo; validez general de doce meses para obligaciones periódicas y tres para no periódicas, salvo norma específica o cambio de circunstancias.", null],
});

export const AEAT_P0_OFFICIAL_SOURCES_V10: Readonly<Record<AeatP0OfficialSourceIdV10, AeatP0OfficialSourceV10>> = Object.freeze(Object.fromEntries(
  AEAT_P0_OFFICIAL_SOURCE_IDS_V10.map((sourceId) => {
    const [title, url, effectiveFrom, loadBearingFacts, legalVersion] = SOURCE_SEEDS[sourceId];
    const profileIds = AEAT_P0_DEEP_PROFILES_V10.filter((profile) => profile.officialSourceIds.includes(sourceId)).map((profile) => profile.profileId);
    return [sourceId, Object.freeze({
      sourceId,
      title,
      url,
      authority: sourceId.startsWith("BOE_") ? "BOE" as const : "AEAT" as const,
      lastChecked: "2026-07-17" as const,
      effectiveFrom,
      effectiveTo: null,
      legalVersion,
      profileIds: Object.freeze(profileIds),
      loadBearingFacts,
      usagePolicy: "VERSIONED_OFFICIAL_CONTEXT_AND_CLOSED_RULES" as const,
    })];
  }),
)) as Readonly<Record<AeatP0OfficialSourceIdV10, AeatP0OfficialSourceV10>>;

const PROFILE_BY_ID = new Map(AEAT_P0_DEEP_PROFILES_V10.map((profile) => [profile.profileId, profile] as const));
export function resolveAeatP0DeepProfileV10(value: unknown): AeatP0ProfileV10 | null {
  return typeof value === "string" && value.length > 0 && value.length <= 160 && value.trim() === value && !CONTROL.test(value)
    ? (PROFILE_BY_ID.get(value as AeatP0DeepProfileIdV10) ?? null)
    : null;
}

export function isAeatP0DeepProfileIdV10(value: unknown): value is AeatP0DeepProfileIdV10 {
  return resolveAeatP0DeepProfileV10(value) !== null;
}
