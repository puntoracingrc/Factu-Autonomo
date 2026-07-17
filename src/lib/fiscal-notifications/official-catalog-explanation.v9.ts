import {
  FISCAL_NOTIFICATION_DOCUMENT_EXPLANATION_ENGINE_ID_V2,
  FISCAL_NOTIFICATION_DOCUMENT_EXPLANATION_ENGINE_VERSION_V2,
  FISCAL_NOTIFICATION_DOCUMENT_EXPLANATION_SCHEMA_VERSION_V2,
  type FiscalNotificationDocumentExplanationV2,
  type FiscalNotificationExplanationAssertionV2,
  type FiscalNotificationExplanationAssertionLevelV2,
  type FiscalNotificationExplanationSectionIdV2,
  type FiscalNotificationExplanationSectionV2,
} from "./structured-document-explanation.v2";
import {
  AEAT_OFFICIAL_CATALOG_EXPANSION_RELEASE_ID_V9,
  AEAT_OFFICIAL_CATALOG_SOURCES_V9,
  resolveAeatOfficialCatalogProfileV9,
  type AeatOfficialCatalogProfileIdV9,
} from "./knowledge/official-catalog-expansion.v9";
import { AEAT_OFFICIAL_CATALOG_CHAINS_V9 } from "./official-catalog-relations.v9";

const SECTION_TITLES: Readonly<
  Record<FiscalNotificationExplanationSectionIdV2, string>
> = Object.freeze({
  WHAT_DOCUMENT_SAYS: "Qué es este documento",
  WHY_RECEIVED: "Por qué puede haber llegado",
  RESULT: "Qué resultado puede reflejar",
  KEY_DATA: "Datos que debes comprobar",
  NEXT_STEP: "Qué conviene revisar ahora",
  DEADLINE: "Cómo localizar el plazo",
  CONSEQUENCE: "Qué puede ocurrir después",
  NOT_PROVEN: "Qué no demuestra este documento",
  RELATIONSHIPS: "Cómo puede relacionarse con otros documentos",
  OFFICIAL_SOURCES: "Fuentes oficiales incorporadas",
});

function assertion(
  code: string,
  level: FiscalNotificationExplanationAssertionLevelV2,
  text: string,
): FiscalNotificationExplanationAssertionV2 {
  return Object.freeze({ code, level, text });
}

function section(
  id: FiscalNotificationExplanationSectionIdV2,
  assertions: readonly FiscalNotificationExplanationAssertionV2[],
): FiscalNotificationExplanationSectionV2 {
  return Object.freeze({
    id,
    title: SECTION_TITLES[id],
    assertions: Object.freeze([...assertions]),
  });
}

function readableFields(values: readonly string[]): string {
  return values
    .map((value) => value.toLocaleLowerCase("es").replaceAll("_", " "))
    .join(", ");
}

export function explainAeatOfficialCatalogDocumentV9(
  familyId: AeatOfficialCatalogProfileIdV9,
): FiscalNotificationDocumentExplanationV2 {
  const profile = resolveAeatOfficialCatalogProfileV9(familyId);
  if (!profile) throw new Error("AEAT_OFFICIAL_CATALOG_EXPLANATION_V9_INVALID");
  const chains = AEAT_OFFICIAL_CATALOG_CHAINS_V9.filter((chain) =>
    chain.nodes.includes(profile.id),
  );
  const expectedFields = [
    ...profile.mustExtract.references,
    ...profile.mustExtract.dates,
    ...profile.mustExtract.money,
    ...profile.mustExtract.facts,
  ];
  const notProvenAssertions = profile.notProvenByThisDocument.map(
    (text, index) =>
      assertion(
        `V9_NOT_PROVEN_${index + 1}`,
        "NOT_PROVEN_BY_DOCUMENT",
        text,
      ),
  );
  const relationshipAssertions =
    chains.length > 0
      ? chains.flatMap((chain, index) => [
          assertion(
            `V9_RELATION_${index + 1}`,
            "OFFICIAL_CONTEXT",
            chain.explanation,
          ),
          assertion(
            `V9_RELATION_LIMIT_${index + 1}`,
            "NOT_PROVEN_BY_DOCUMENT",
            chain.forbiddenInference,
          ),
        ])
      : [
          assertion(
            "V9_RELATION_REVIEW_REQUIRED",
            "NOT_PROVEN_BY_DOCUMENT",
            "Las relaciones declaradas por este perfil solo se comprueban con referencias compatibles o revisión humana; nunca por cercanía de fecha o importe.",
          ),
        ];
  const officialSources = Object.freeze(
    profile.officialSourceIds.map((sourceId) => {
      const source = AEAT_OFFICIAL_CATALOG_SOURCES_V9[sourceId];
      if (!source) throw new Error("AEAT_OFFICIAL_CATALOG_EXPLANATION_V9_SOURCE");
      return Object.freeze({
        id: source.sourceId,
        title: source.title,
        authority: "AEAT" as const,
        canonicalUrl: source.url,
        assertionLevel: "OFFICIAL_CONTEXT" as const,
      });
    }),
  );
  const sections = Object.freeze([
    section("WHAT_DOCUMENT_SAYS", [
      assertion("V9_WHAT", "OFFICIAL_CONTEXT", profile.whatItIs),
    ]),
    section("WHY_RECEIVED", [
      assertion(
        "V9_WHY",
        "OFFICIAL_CONTEXT",
        profile.notes ||
          "La AEAT utiliza este documento para comunicar la fase, el alcance o el resultado que consten expresamente en él.",
      ),
    ]),
    section("RESULT", [
      assertion(
        "V9_RESULT_REVIEW",
        "NOT_PROVEN_BY_DOCUMENT",
        "El título permite proponer esta familia, pero el resultado concreto debe leerse y confirmarse en el documento.",
      ),
    ]),
    section("KEY_DATA", [
      assertion(
        "V9_KEY_DATA",
        "OFFICIAL_CONTEXT",
        `Comprueba estos campos cuando aparezcan: ${readableFields(expectedFields)}.`,
      ),
    ]),
    section("NEXT_STEP", [
      assertion(
        "V9_NEXT_STEP",
        "OFFICIAL_CONTEXT",
        "Revisa el resultado, las referencias, las fechas y las instrucciones impresas antes de actuar. La ficha no presenta, paga, recurre ni modifica nada por sí sola.",
      ),
    ]),
    section("DEADLINE", [
      assertion(
        "V9_DEADLINE",
        "OFFICIAL_CONTEXT",
        profile.deadlineTrigger === "NONE"
          ? "Este perfil no atribuye un plazo al documento. Si el PDF imprime uno, debe revisarse literalmente."
          : "Localiza en el documento el hecho o la fecha que inicia el plazo y usa la notificación efectiva cuando corresponda. Nunca se calcula desde la fecha de escaneo o subida.",
      ),
    ]),
    section("CONSEQUENCE", [
      assertion(
        "V9_CONSEQUENCE",
        "NOT_PROVEN_BY_DOCUMENT",
        "La consecuencia depende de la fase y del resultado impresos. El reconocimiento del tipo documental no confirma por sí solo una deuda, pago, suspensión, devolución o cierre.",
      ),
    ]),
    section("NOT_PROVEN", notProvenAssertions),
    section("RELATIONSHIPS", relationshipAssertions),
    section("OFFICIAL_SOURCES", [
      assertion(
        "V9_SOURCES",
        "OFFICIAL_CONTEXT",
        `El conocimiento local usa ${officialSources.length} fuente${officialSources.length === 1 ? "" : "s"} oficial${officialSources.length === 1 ? "" : "es"} de la AEAT. No se consulta internet durante el escaneo.`,
      ),
    ]),
  ]);

  return Object.freeze({
    schemaVersion: FISCAL_NOTIFICATION_DOCUMENT_EXPLANATION_SCHEMA_VERSION_V2,
    engineId: FISCAL_NOTIFICATION_DOCUMENT_EXPLANATION_ENGINE_ID_V2,
    engineVersion: FISCAL_NOTIFICATION_DOCUMENT_EXPLANATION_ENGINE_VERSION_V2,
    knowledgeReleaseId: AEAT_OFFICIAL_CATALOG_EXPANSION_RELEASE_ID_V9,
    status: "INFORMATION_PENDING",
    familyId: profile.id,
    familyName: profile.nameEs,
    specializationId: `official-catalog-v9:${profile.id}`,
    fallbackUsed: false,
    sections,
    relationships: Object.freeze([]),
    officialSources,
    deadlineTrigger: profile.deadlineTrigger,
    deadlineTriggerAvailable: false,
    missingData:
      profile.deadlineTrigger === "NONE"
        ? Object.freeze([
            "STRUCTURED_FACTS",
            "REQUIRED_PROFILE_FIELDS",
          ] as const)
        : Object.freeze([
            "STRUCTURED_FACTS",
            "REQUIRED_PROFILE_FIELDS",
            "DEADLINE_TRIGGER",
          ] as const),
    missingProfileFields: Object.freeze({
      references: profile.mustExtract.references,
      dates: profile.mustExtract.dates,
      money: profile.mustExtract.money,
      facts: profile.mustExtract.facts,
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
