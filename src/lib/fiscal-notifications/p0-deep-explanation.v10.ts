import {
  FISCAL_NOTIFICATION_DOCUMENT_EXPLANATION_ENGINE_ID_V2,
  FISCAL_NOTIFICATION_DOCUMENT_EXPLANATION_ENGINE_VERSION_V2,
  FISCAL_NOTIFICATION_DOCUMENT_EXPLANATION_SCHEMA_VERSION_V2,
  type FiscalNotificationDocumentExplanationV2,
  type FiscalNotificationExplanationAssertionLevelV2,
  type FiscalNotificationExplanationAssertionV2,
  type FiscalNotificationExplanationSectionIdV2,
  type FiscalNotificationExplanationSectionV2,
} from "./structured-document-explanation.v2";
import {
  AEAT_P0_DEEP_RELEASE_ID_V10,
  AEAT_P0_OFFICIAL_SOURCES_V10,
  resolveAeatP0DeepProfileV10,
  type AeatP0DeepProfileIdV10,
  type AeatP0OfficialSourceV10,
} from "./knowledge/p0-deep-contracts.v10";
import { AEAT_P0_RELATION_RULES_V10 } from "./p0-relations.v10";

export const AEAT_P0_DEEP_EXPLANATION_VERSION_V10 = "10.0.0" as const;

const TITLES: Readonly<Record<FiscalNotificationExplanationSectionIdV2, string>> = Object.freeze({
  WHAT_DOCUMENT_SAYS: "Qué es este documento",
  WHY_RECEIVED: "Por qué puede haber llegado",
  RESULT: "Qué resultado refleja",
  KEY_DATA: "Datos que debes comprobar",
  NEXT_STEP: "Qué conviene hacer ahora",
  DEADLINE: "Qué plazo debes localizar",
  CONSEQUENCE: "Qué puede ocurrir después",
  NOT_PROVEN: "Qué no demuestra este documento",
  RELATIONSHIPS: "Cómo encaja con otros documentos",
  OFFICIAL_SOURCES: "Fuentes oficiales en las que se basa el escáner",
});

function sourceVersion(source: AeatP0OfficialSourceV10) {
  return Object.freeze({
    sourceId: source.sourceId,
    lastChecked: source.lastChecked,
    effectiveFrom: source.effectiveFrom,
    effectiveTo: source.effectiveTo,
    legalVersion: source.legalVersion,
  });
}

function assertion(code: string, level: FiscalNotificationExplanationAssertionLevelV2, text: string, source?: AeatP0OfficialSourceV10): FiscalNotificationExplanationAssertionV2 {
  return Object.freeze({ code, level, text, ...(source ? { sourceVersion: sourceVersion(source) } : {}) });
}

function section(id: FiscalNotificationExplanationSectionIdV2, assertions: readonly FiscalNotificationExplanationAssertionV2[]): FiscalNotificationExplanationSectionV2 {
  return Object.freeze({ id, title: TITLES[id], assertions: Object.freeze([...assertions]) });
}

export function explainAeatP0DeepDocumentV10(familyId: AeatP0DeepProfileIdV10): FiscalNotificationDocumentExplanationV2 {
  const profile = resolveAeatP0DeepProfileV10(familyId);
  if (!profile) throw new Error("AEAT_P0_DEEP_EXPLANATION_V10_INVALID");
  const sources = profile.officialSourceIds.map((sourceId) => AEAT_P0_OFFICIAL_SOURCES_V10[sourceId]);
  const primarySource = sources[0]!;
  const relationRules = AEAT_P0_RELATION_RULES_V10.filter((rule) =>
    rule.sourceProfiles.includes(profile.profileId) ||
    (Array.isArray(rule.target) && rule.target.includes(profile.profileId)),
  );
  const requiredFields = profile.canonicalFields.filter((field) => field.required).map((field) => field.id.toLocaleLowerCase("es-ES").replaceAll("_", " "));
  const correctedContext = profile.profileId === "assessment.rectification_resolution"
    ? [assertion("V10_DIRECT_RESOLUTION", "OFFICIAL_CONTEXT", "Puede existir una resolución directa sin propuesta previa cuando el resultado coincide con lo solicitado.", primarySource)]
    : profile.profileId === "certificate.correction_or_disagreement"
      ? [assertion("V10_CERTIFICATE_SPECIFIC_ROUTE", "OFFICIAL_CONTEXT", "La disconformidad es la vía específica para corregir el certificado; no es un recurso ordinario.", primarySource)]
      : [];
  const missingData: FiscalNotificationDocumentExplanationV2["missingData"] = [
    "STRUCTURED_FACTS",
    "REQUIRED_PROFILE_FIELDS",
    ...(profile.deadlineRuleIds.length > 0 ? ["DEADLINE_TRIGGER" as const] : []),
  ];
  const sections = Object.freeze([
    section("WHAT_DOCUMENT_SAYS", [assertion("V10_WHAT", "OFFICIAL_CONTEXT", profile.explanationTemplate.whatItIs, primarySource)]),
    section("WHY_RECEIVED", [assertion("V10_WHY", "OFFICIAL_CONTEXT", `Forma parte de la fase «${profile.procedurePhase.toLocaleLowerCase("es-ES").replaceAll("_", " ")}» del trámite que figure en la ficha.`, primarySource)]),
    section("RESULT", [assertion("V10_RESULT", "OFFICIAL_CONTEXT", profile.explanationTemplate.result, primarySource)]),
    section("KEY_DATA", [assertion("V10_KEY_DATA", "OFFICIAL_CONTEXT", `Comprueba especialmente: ${requiredFields.join(", ")}. Los valores ausentes permanecen pendientes; no se inventan.`, primarySource)]),
    section("NEXT_STEP", [assertion("V10_NEXT", "OFFICIAL_CONTEXT", profile.explanationTemplate.whatToDo, primarySource)]),
    section("DEADLINE", [assertion("V10_DEADLINE", "OFFICIAL_CONTEXT", profile.explanationTemplate.deadline, primarySource)]),
    section("CONSEQUENCE", [assertion("V10_AFTER", "OFFICIAL_CONTEXT", profile.explanationTemplate.after, primarySource)]),
    section("NOT_PROVEN", [
      assertion("V10_NOT_PROVEN_TEMPLATE", "NOT_PROVEN_BY_DOCUMENT", profile.explanationTemplate.notProven, primarySource),
      ...profile.notProvenByDocument.map((text, index) => assertion(`V10_NOT_PROVEN_${index + 1}`, "NOT_PROVEN_BY_DOCUMENT", text, primarySource)),
    ]),
    section("RELATIONSHIPS", relationRules.length > 0 || correctedContext.length > 0
      ? [
          ...correctedContext,
          ...relationRules.flatMap((rule, index) => [
          assertion(`V10_RELATION_EXACT_${index + 1}`, "OFFICIAL_CONTEXT", rule.exactPhrase, primarySource),
          assertion(`V10_RELATION_LIMIT_${index + 1}`, "NOT_PROVEN_BY_DOCUMENT", rule.forbidden, primarySource),
          ]),
        ]
      : [assertion("V10_RELATION_PENDING", "NOT_PROVEN_BY_DOCUMENT", "La relación solo se propone cuando existen referencias o contexto estructurado compatibles; nunca por proximidad visual.", primarySource)]),
    section("OFFICIAL_SOURCES", sources.map((source) => assertion(
      `V10_SOURCE_${source.sourceId}`,
      "OFFICIAL_CONTEXT",
      `${source.authority}: ${source.title}. Conocimiento local comprobado el ${source.lastChecked}; no se consulta internet durante el escaneo.`,
      source,
    ))),
  ]);
  return Object.freeze({
    schemaVersion: FISCAL_NOTIFICATION_DOCUMENT_EXPLANATION_SCHEMA_VERSION_V2,
    engineId: FISCAL_NOTIFICATION_DOCUMENT_EXPLANATION_ENGINE_ID_V2,
    engineVersion: FISCAL_NOTIFICATION_DOCUMENT_EXPLANATION_ENGINE_VERSION_V2,
    knowledgeReleaseId: AEAT_P0_DEEP_RELEASE_ID_V10,
    status: "INFORMATION_PENDING",
    familyId: profile.profileId,
    familyName: profile.titleEs,
    specializationId: `p0-deep-v10:${profile.profileId}`,
    fallbackUsed: false,
    sections,
    relationships: Object.freeze([]),
    officialSources: Object.freeze(sources.map((source) => Object.freeze({
      id: source.sourceId,
      title: source.title,
      authority: source.authority,
      canonicalUrl: source.url,
      assertionLevel: "OFFICIAL_CONTEXT" as const,
      sourceVersion: Object.freeze({
        lastChecked: source.lastChecked,
        effectiveFrom: source.effectiveFrom,
        effectiveTo: source.effectiveTo,
        legalVersion: source.legalVersion,
      }),
    }))),
    deadlineTrigger: profile.deadlineRuleIds.join(" | ") || "NONE",
    deadlineTriggerAvailable: false,
    missingData: Object.freeze([...missingData]),
    missingProfileFields: Object.freeze({
      references: Object.freeze(profile.canonicalFields.filter((field) => field.type.includes("REFERENCE") || ["MODEL", "YEAR", "PERIOD"].includes(field.type)).map((field) => field.id)),
      dates: Object.freeze(profile.canonicalFields.filter((field) => field.type.startsWith("DATE")).map((field) => field.id)),
      money: Object.freeze(profile.canonicalFields.filter((field) => field.type === "MONEY").map((field) => field.id)),
      facts: Object.freeze(profile.canonicalFields.filter((field) => !field.type.includes("REFERENCE") && !field.type.startsWith("DATE") && field.type !== "MONEY").map((field) => field.id)),
      participantRoles: Object.freeze([]),
    }),
    ambiguities: Object.freeze([]),
    documentFactsPolicy: "DOCUMENT_IS_PRIMARY",
    legalContextPolicy: "OFFICIAL_CONTEXT_SEPARATE",
    privacyPolicy: "NO_FREE_TEXT_PII_OR_SENSITIVE_REFERENCE_VALUES",
    networkPolicy: "NO_NETWORK",
    requiresHumanReview: true,
    materializationPolicy: "PROHIBITED_UNTIL_REVIEW",
  });
}
