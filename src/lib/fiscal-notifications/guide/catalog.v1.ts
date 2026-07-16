import {
  FISCAL_NOTIFICATION_CAUSAL_RELATIONS_V2,
  FISCAL_NOTIFICATION_DOCUMENT_FAMILIES_V2,
  FISCAL_NOTIFICATION_PROHIBITED_INFERENCE_IDS_V2,
  resolveFiscalNotificationDocumentFamilyV2,
  type FiscalNotificationCausalRelationIdV2,
  type FiscalNotificationDocumentFamilyCategoryV2,
  type FiscalNotificationDocumentFamilyIdV2,
  type FiscalNotificationKnowledgePriorityV2,
  type FiscalNotificationProhibitedInferenceIdV2,
} from "@/lib/fiscal-notifications/knowledge/document-families.v2";
import {
  FISCAL_NOTIFICATION_FAMILY_COVERAGE_V2,
  type FiscalNotificationKnowledgeBlockerV2,
  type FiscalNotificationKnowledgeCoverageStatusV2,
} from "@/lib/fiscal-notifications/knowledge/coverage.v2";
import {
  FISCAL_NOTIFICATION_OFFICIAL_SOURCES_V4,
  type FiscalNotificationOfficialSourceIdV4,
} from "@/lib/fiscal-notifications/knowledge/official-sources.v4";
import {
  resolveFiscalNotificationPlainLanguageGuidanceV1,
  type FiscalNotificationPlainLanguageGuidanceV1,
} from "@/lib/fiscal-notifications/guide/plain-language-guidance.v1";
import {
  resolveFiscalNotificationKnowledgeGuidanceV2,
  type FiscalNotificationGuideRecognitionModeV2,
} from "@/lib/fiscal-notifications/guide/knowledge-guidance-adapter.v2";
import type { AeatDocumentOfficialSourceIdV1 } from "@/lib/fiscal-notifications/knowledge/aeat-document-knowledge.v1";

export const FISCAL_NOTIFICATION_GUIDE_SCHEMA_VERSION_V1 = 1 as const;
export const FISCAL_NOTIFICATION_GUIDE_RELEASE_ID_V1 =
  "fiscal-notification-guide.2026-07-16.v2" as const;

interface CategoryPresentationV1 {
  readonly label: string;
  readonly aliases: readonly string[];
}

const CATEGORY_PRESENTATION_V1 = Object.freeze({
  NOTIFICATION: Object.freeze({
    label: "Notificación y entrega",
    aliases: Object.freeze(["notificación", "aviso", "comparecencia"]),
  }),
  INFORMATION: Object.freeze({
    label: "Información tributaria",
    aliases: Object.freeze(["información", "comunicación informativa"]),
  }),
  IDENTITY_AND_ACCESS: Object.freeze({
    label: "Identidad y acceso",
    aliases: Object.freeze(["identidad", "acceso", "clave"]),
  }),
  CERTIFICATE: Object.freeze({
    label: "Certificados",
    aliases: Object.freeze(["certificado", "acreditación"]),
  }),
  TAX_PROFILE: Object.freeze({
    label: "Censo y perfil tributario",
    aliases: Object.freeze(["censo", "nif", "domicilio fiscal"]),
  }),
  COMPLIANCE: Object.freeze({
    label: "Requerimientos y cumplimiento",
    aliases: Object.freeze(["requerimiento", "cumplimiento", "subsanación"]),
  }),
  ASSESSMENT: Object.freeze({
    label: "Comprobación y liquidación",
    aliases: Object.freeze(["comprobación", "liquidación", "regularización"]),
  }),
  SANCTION: Object.freeze({
    label: "Sanciones",
    aliases: Object.freeze(["sanción", "expediente sancionador"]),
  }),
  COLLECTION: Object.freeze({
    label: "Recaudación y deuda",
    aliases: Object.freeze(["recaudación", "deuda", "apremio", "aplazamiento"]),
  }),
  SETTLEMENT: Object.freeze({
    label: "Compensación y extinción",
    aliases: Object.freeze(["compensación", "extinción", "saldo"]),
  }),
  REFUND: Object.freeze({
    label: "Devoluciones",
    aliases: Object.freeze(["devolución", "reembolso"]),
  }),
  SEIZURE: Object.freeze({
    label: "Embargos",
    aliases: Object.freeze(["embargo", "diligencia", "levantamiento"]),
  }),
  PAYMENT_INSTRUMENT: Object.freeze({
    label: "Documentos para pagar",
    aliases: Object.freeze(["carta de pago", "documento de pago"]),
  }),
  PAYMENT_EVIDENCE: Object.freeze({
    label: "Evidencias de pago",
    aliases: Object.freeze(["justificante", "recibo", "nrc"]),
  }),
  REVIEW: Object.freeze({
    label: "Recursos y revisión",
    aliases: Object.freeze(["recurso", "reclamación", "revisión", "suspensión"]),
  }),
  LIABILITY: Object.freeze({
    label: "Responsabilidad tributaria",
    aliases: Object.freeze(["responsabilidad", "responsable", "sucesor"]),
  }),
  INSPECTION: Object.freeze({
    label: "Inspección",
    aliases: Object.freeze(["inspección", "acta", "diligencia inspectora"]),
  }),
} as const satisfies Readonly<
  Record<FiscalNotificationDocumentFamilyCategoryV2, CategoryPresentationV1>
>);

const PROHIBITED_INFERENCE_LABELS_V1 = Object.freeze({
  PAYMENT_FORM_IS_PAYMENT_RECEIPT:
    "Una carta o documento para pagar no acredita que el pago se haya realizado.",
  SAME_AMOUNT_CONFIRMS_PAYMENT:
    "Que dos documentos tengan el mismo importe no confirma un pago ni una relación.",
  SAME_TAXPAYER_CONFIRMS_RELATION:
    "Que figure la misma persona no confirma que dos documentos estén relacionados.",
  SAME_LIQUIDATION_KEY_MEANS_SAME_DOCUMENT:
    "Una clave de liquidación coincidente no convierte dos documentos en el mismo acto.",
  SEIZURE_PROVES_DEBT_VALID:
    "Una diligencia de embargo no demuestra por sí sola que la deuda sea válida.",
  REVIEW_PROVES_SUSPENSION:
    "Presentar un recurso o reclamación no acredita por sí solo una suspensión.",
  FAILED_PAYMENT_PROVES_REOPENED_DEBT:
    "Un pago fallido no demuestra por sí solo que una deuda se haya reabierto.",
  LATER_DOCUMENT_AUTHORIZES_SILENT_MUTATION:
    "Un documento posterior no autoriza a cambiar silenciosamente fichas, pagos, gastos o asientos.",
  OFFICIAL_CONTEXT_OVERRIDES_PRINTED_DOCUMENT:
    "El contexto oficial nunca sustituye ni corrige silenciosamente lo impreso en el documento.",
  PRIVATE_CORPUS_ACTIVATES_RULE:
    "Los ejemplos privados no activan reglas jurídicas ni acciones automáticas.",
} as const satisfies Readonly<
  Record<FiscalNotificationProhibitedInferenceIdV2, string>
>);

export const FISCAL_NOTIFICATION_GUIDE_DOCUMENT_CHECKS_V1 = Object.freeze([
  "Comprueba el título, el organismo emisor y a quién se dirige exactamente como aparecen impresos.",
  "Revisa fechas, plazos, importes, referencias y páginas de procedencia sin completar datos ausentes.",
  "Distingue la carátula de notificación, el acto principal y sus anexos antes de interpretar el conjunto.",
  "Si el texto impreso y el contexto oficial no encajan, conserva la contradicción y solicita revisión humana.",
]);

export interface FiscalNotificationGuideSourceV1 {
  readonly sourceId:
    | FiscalNotificationOfficialSourceIdV4
    | AeatDocumentOfficialSourceIdV1;
  readonly title: string;
  readonly authority: "AEAT" | "BOE" | "Gobierno de España";
  readonly sourceKind: "PROCEDURE_INFORMATION" | "LEGAL_TEXT";
  readonly canonicalUrl: string;
  readonly urlCheckedOn:
    | "2026-07-12"
    | "2026-07-13"
    | "2026-07-15"
    | "2026-07-16";
  readonly verificationStatus: "OFFICIAL_URL_VERIFIED";
  readonly legalReviewStatus: "LEGAL_REVIEW_PENDING";
  readonly usagePolicy: "CONTEXT_ONLY";
}

export interface FiscalNotificationGuideRelatedFamilyV1 {
  readonly relationId: FiscalNotificationCausalRelationIdV2;
  readonly familyId: FiscalNotificationDocumentFamilyIdV2;
  readonly nameEs: string;
  readonly direction: "POSSIBLE_PREVIOUS" | "POSSIBLE_NEXT";
  readonly status: "SUGGESTED_ONLY";
  readonly matchPolicy: "EXPLICIT_REFERENCE_OR_HUMAN_CONFIRMATION_REQUIRED";
  readonly autoConfirm: false;
}

export interface FiscalNotificationGuideProhibitionV1 {
  readonly id: FiscalNotificationProhibitedInferenceIdV2;
  readonly label: string;
}

export interface FiscalNotificationGuideEntryV1 {
  readonly schemaVersion: typeof FISCAL_NOTIFICATION_GUIDE_SCHEMA_VERSION_V1;
  readonly releaseId: typeof FISCAL_NOTIFICATION_GUIDE_RELEASE_ID_V1;
  readonly familyId: FiscalNotificationDocumentFamilyIdV2;
  readonly nameEs: string;
  readonly category: FiscalNotificationDocumentFamilyCategoryV2;
  readonly categoryLabel: string;
  readonly aliases: readonly string[];
  readonly knowledgePriority: FiscalNotificationKnowledgePriorityV2;
  readonly recognitionMode: FiscalNotificationGuideRecognitionModeV2;
  readonly summary: string;
  readonly plainLanguage: FiscalNotificationPlainLanguageGuidanceV1;
  readonly documentChecks: readonly string[];
  readonly possiblePrevious: readonly FiscalNotificationGuideRelatedFamilyV1[];
  readonly possibleNext: readonly FiscalNotificationGuideRelatedFamilyV1[];
  readonly sources: readonly FiscalNotificationGuideSourceV1[];
  readonly coverage: Readonly<{
    status: FiscalNotificationKnowledgeCoverageStatusV2;
    candidateHandlerImplemented: boolean;
    explicitFactExtractorImplemented: boolean;
    syntheticTestCaseAvailable: boolean;
    legalRuleActive: false;
    operationalActionActive: false;
    automaticRelationConfirmationActive: false;
    blockers: readonly FiscalNotificationKnowledgeBlockerV2[];
  }>;
  readonly prohibitions: readonly FiscalNotificationGuideProhibitionV1[];
  readonly printedDocumentPolicy: "EXTRACT_EXACTLY_THEN_REQUIRE_REVIEW";
  readonly officialContextPolicy: "INTERPRET_ONLY_NEVER_OVERRIDE_DOCUMENT";
  readonly legalReviewStatus: "LEGAL_REVIEW_PENDING";
  readonly operationalPolicy: "PROHIBITED_UNTIL_HUMAN_REVIEW";
  readonly requiresHumanReview: true;
  readonly permitsDebtCreation: false;
  readonly permitsDeadlineCreation: false;
  readonly permitsPaymentAction: false;
  readonly permitsAccountingAction: false;
  readonly permitsAutomaticRelationConfirmation: false;
}

const sourceById = new Map(
  FISCAL_NOTIFICATION_OFFICIAL_SOURCES_V4.map((source) => [
    source.id,
    source,
  ] as const),
);
const coverageByFamilyId = new Map(
  FISCAL_NOTIFICATION_FAMILY_COVERAGE_V2.map((coverage) => [
    coverage.familyId,
    coverage,
  ] as const),
);

function relatedFamilies(
  familyId: FiscalNotificationDocumentFamilyIdV2,
  direction: FiscalNotificationGuideRelatedFamilyV1["direction"],
): readonly FiscalNotificationGuideRelatedFamilyV1[] {
  const related = new Map<string, FiscalNotificationGuideRelatedFamilyV1>();

  for (const relation of FISCAL_NOTIFICATION_CAUSAL_RELATIONS_V2) {
    const selectedIds =
      direction === "POSSIBLE_PREVIOUS"
        ? relation.toFamilyIds
        : relation.fromFamilyIds;
    if (!selectedIds.includes(familyId)) continue;

    const otherIds =
      direction === "POSSIBLE_PREVIOUS"
        ? relation.fromFamilyIds
        : relation.toFamilyIds;
    for (const otherId of otherIds) {
      const otherFamily = resolveFiscalNotificationDocumentFamilyV2(otherId);
      if (!otherFamily || otherFamily.id === familyId) continue;
      const key = `${relation.id}:${otherFamily.id}:${direction}`;
      related.set(
        key,
        Object.freeze({
          relationId: relation.id,
          familyId: otherFamily.id,
          nameEs: otherFamily.nameEs,
          direction,
          status: relation.status,
          matchPolicy: relation.matchPolicy,
          autoConfirm: relation.autoConfirm,
        }),
      );
    }
  }

  return Object.freeze([...related.values()]);
}

function guideEntry(
  family: (typeof FISCAL_NOTIFICATION_DOCUMENT_FAMILIES_V2)[number],
): FiscalNotificationGuideEntryV1 {
  const category = CATEGORY_PRESENTATION_V1[family.category];
  const coverage = coverageByFamilyId.get(family.id);
  if (!coverage) {
    throw new Error("Missing fiscal notification guide coverage");
  }

  const legacyGuidance = resolveFiscalNotificationPlainLanguageGuidanceV1(
    family.id,
  );
  const knowledge = resolveFiscalNotificationKnowledgeGuidanceV2(family.id);
  const plainLanguage = knowledge.guidance;

  const legacySources = Array.from(
    new Set<FiscalNotificationOfficialSourceIdV4>([
      ...family.sourceIds,
      ...(legacyGuidance?.sourceIds ?? []),
    ]),
  ).map((sourceId) => {
    const source = sourceById.get(sourceId);
    if (!source) throw new Error("Missing fiscal notification guide source");
    return Object.freeze({
      sourceId: source.id,
      title: source.title,
      authority: source.authority,
      sourceKind: source.sourceKind,
      canonicalUrl: source.canonicalUrl,
      urlCheckedOn: source.urlCheckedOn,
      verificationStatus: source.verificationStatus,
      legalReviewStatus: source.legalReviewStatus,
      usagePolicy: source.usagePolicy,
    });
  });
  const sourcesByUrl = new Map<string, FiscalNotificationGuideSourceV1>();
  for (const source of [...legacySources, ...knowledge.sources]) {
    sourcesByUrl.set(source.canonicalUrl, Object.freeze({ ...source }));
  }
  const sources = [...sourcesByUrl.values()];

  return Object.freeze({
    schemaVersion: FISCAL_NOTIFICATION_GUIDE_SCHEMA_VERSION_V1,
    releaseId: FISCAL_NOTIFICATION_GUIDE_RELEASE_ID_V1,
    familyId: family.id,
    nameEs: family.nameEs,
    category: family.category,
    categoryLabel: category.label,
    aliases: Object.freeze([
      ...category.aliases,
      ...family.id.split(/[._-]/u).filter(Boolean),
      ...(legacyGuidance?.searchTerms ?? []),
      ...plainLanguage.searchTerms,
    ]),
    knowledgePriority: family.knowledgePriority,
    recognitionMode: knowledge.recognitionMode,
    summary: plainLanguage.inShort,
    plainLanguage,
    documentChecks: FISCAL_NOTIFICATION_GUIDE_DOCUMENT_CHECKS_V1,
    possiblePrevious: relatedFamilies(family.id, "POSSIBLE_PREVIOUS"),
    possibleNext: relatedFamilies(family.id, "POSSIBLE_NEXT"),
    sources: Object.freeze(sources),
    coverage: Object.freeze({
      status: coverage.status,
      candidateHandlerImplemented: coverage.candidateHandlerImplemented,
      explicitFactExtractorImplemented:
        coverage.explicitFactExtractorImplemented,
      syntheticTestCaseAvailable: coverage.syntheticTestCaseAvailable,
      legalRuleActive: coverage.legalRuleActive,
      operationalActionActive: coverage.operationalActionActive,
      automaticRelationConfirmationActive:
        coverage.automaticRelationConfirmationActive,
      blockers: Object.freeze([...coverage.blockers]),
    }),
    prohibitions: Object.freeze(
      FISCAL_NOTIFICATION_PROHIBITED_INFERENCE_IDS_V2.map((id) =>
        Object.freeze({ id, label: PROHIBITED_INFERENCE_LABELS_V1[id] }),
      ),
    ),
    printedDocumentPolicy: family.printedDocumentPolicy,
    officialContextPolicy: family.officialContextPolicy,
    legalReviewStatus: family.legalReviewStatus,
    operationalPolicy: family.operationalPolicy,
    requiresHumanReview: family.requiresHumanReview,
    permitsDebtCreation: family.permitsDebtCreation,
    permitsDeadlineCreation: family.permitsDeadlineCreation,
    permitsPaymentAction: family.permitsPaymentAction,
    permitsAccountingAction: family.permitsAccountingAction,
    permitsAutomaticRelationConfirmation:
      family.permitsAutomaticRelationConfirmation,
  });
}

export const FISCAL_NOTIFICATION_GUIDE_ENTRIES_V1 = Object.freeze(
  FISCAL_NOTIFICATION_DOCUMENT_FAMILIES_V2.map(guideEntry),
) satisfies readonly FiscalNotificationGuideEntryV1[];

const guideEntryByFamilyId = new Map(
  FISCAL_NOTIFICATION_GUIDE_ENTRIES_V1.map((entry) => [
    entry.familyId,
    entry,
  ] as const),
);
const CONTROL_CHARACTER_PATTERN = /[\u0000-\u001f\u007f-\u009f]/u;

export type FiscalNotificationGuideSelectionV1 =
  | Readonly<{ status: "INDEX"; entry: null }>
  | Readonly<{
      status: "SELECTED";
      entry: FiscalNotificationGuideEntryV1;
    }>
  | Readonly<{
      status: "UNKNOWN_OR_INVALID";
      entry: null;
    }>;

export function resolveFiscalNotificationGuideSelectionV1(
  rawFamilyId: unknown,
): FiscalNotificationGuideSelectionV1 {
  if (rawFamilyId === undefined) {
    return Object.freeze({ status: "INDEX", entry: null });
  }
  if (
    typeof rawFamilyId !== "string" ||
    rawFamilyId.length === 0 ||
    rawFamilyId.length > 160 ||
    rawFamilyId.trim() !== rawFamilyId ||
    CONTROL_CHARACTER_PATTERN.test(rawFamilyId)
  ) {
    return Object.freeze({ status: "UNKNOWN_OR_INVALID", entry: null });
  }
  const entry = guideEntryByFamilyId.get(
    rawFamilyId as FiscalNotificationDocumentFamilyIdV2,
  );
  return entry
    ? Object.freeze({ status: "SELECTED", entry })
    : Object.freeze({ status: "UNKNOWN_OR_INVALID", entry: null });
}
