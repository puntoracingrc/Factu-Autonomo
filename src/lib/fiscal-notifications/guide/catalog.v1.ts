import {
  FISCAL_NOTIFICATION_DOCUMENT_FAMILIES_V2,
  FISCAL_NOTIFICATION_PROHIBITED_INFERENCE_IDS_V2,
  resolveFiscalNotificationDocumentFamilyV2,
  type FiscalNotificationDocumentFamilyCategoryV2,
  type FiscalNotificationDocumentFamilyIdV2,
  type FiscalNotificationKnowledgePriorityV2,
  type FiscalNotificationProhibitedInferenceIdV2,
} from "@/lib/fiscal-notifications/knowledge/document-families.v2";
import type { FiscalNotificationKnowledgeBlockerV2 } from "@/lib/fiscal-notifications/knowledge/coverage.v2";
import {
  FISCAL_NOTIFICATION_OFFICIAL_SOURCES_V4,
  type FiscalNotificationOfficialSourceIdV4,
} from "@/lib/fiscal-notifications/knowledge/official-sources.v4";
import {
  AEAT_DOCUMENT_COMPLETION_GATE_V2,
} from "@/lib/fiscal-notifications/knowledge/completion-gate.v2";
import {
  AEAT_DOCUMENT_RELATION_TYPES_V1,
  resolveAeatDocumentProfileV1,
  type AeatDocumentRelationTypeIdV1,
} from "@/lib/fiscal-notifications/knowledge/aeat-document-knowledge.v1";
import {
  FISCAL_NOTIFICATION_DOCUMENT_CHAINS_V2,
  getFiscalNotificationFamilyChainAdjacencyV2,
  isFiscalNotificationDocumentFamilyIdV2,
  isFiscalNotificationRelationTypeIdV2,
  matchesFiscalNotificationAbstractNodeV2,
  type FiscalNotificationAbstractNodeIdV2,
  type FiscalNotificationDocumentChainIdV2,
  type FiscalNotificationRelationTypeIdV2,
} from "@/lib/fiscal-notifications/document-chain-rules.v2";
import {
  FISCAL_NOTIFICATION_PLAIN_LANGUAGE_GUIDANCE_RELEASE_ID_V1,
  resolveFiscalNotificationPlainLanguageGuidanceV1,
  type FiscalNotificationPlainLanguageGuidanceV1,
} from "@/lib/fiscal-notifications/guide/plain-language-guidance.v1";
import {
  resolveFiscalNotificationKnowledgeGuidanceV2,
  type FiscalNotificationGuideRecognitionModeV2,
} from "@/lib/fiscal-notifications/guide/knowledge-guidance-adapter.v2";
import type { AeatDocumentOfficialSourceIdV1 } from "@/lib/fiscal-notifications/knowledge/aeat-document-knowledge.v1";
import {
  AEAT_OFFICIAL_CATALOG_PROFILES_V9,
  AEAT_OFFICIAL_CATALOG_SOURCES_V9,
  type AeatOfficialCatalogMaturityV9,
  type AeatOfficialCatalogProfileIdV9,
  type AeatOfficialCatalogProfileV9,
} from "@/lib/fiscal-notifications/knowledge/official-catalog-expansion.v9";
import { AEAT_OFFICIAL_CATALOG_CHAINS_V9 } from "@/lib/fiscal-notifications/official-catalog-relations.v9";

export const FISCAL_NOTIFICATION_GUIDE_SCHEMA_VERSION_V1 = 1 as const;
export const FISCAL_NOTIFICATION_GUIDE_RELEASE_ID_V1 =
  "fiscal-notification-guide.2026-07-17.v3" as const;

export type FiscalNotificationGuideFamilyIdV1 =
  | FiscalNotificationDocumentFamilyIdV2
  | AeatOfficialCatalogProfileIdV9;

export type FiscalNotificationGuideCategoryV1 =
  | FiscalNotificationDocumentFamilyCategoryV2
  | "EVIDENCE"
  | "PROCEDURE"
  | "FILING"
  | "REPRESENTATION"
  | "CENSUS"
  | "INSOLVENCY"
  | "CUSTOMS"
  | "TECHNICAL";

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

const OFFICIAL_CATALOG_CATEGORY_PRESENTATION_V9: Readonly<
  Record<string, CategoryPresentationV1>
> = Object.freeze({
  EVIDENCE: Object.freeze({
    label: "Justificantes y evidencias",
    aliases: Object.freeze(["justificante", "registro", "presentación"]),
  }),
  PROCEDURE: Object.freeze({
    label: "Trámites y plazos",
    aliases: Object.freeze(["trámite", "plazo", "ampliación"]),
  }),
  ASSESSMENT: CATEGORY_PRESENTATION_V1.ASSESSMENT,
  FILING: Object.freeze({
    label: "Declaraciones presentadas",
    aliases: Object.freeze(["autoliquidación", "rectificativa", "complementaria"]),
  }),
  REVIEW: CATEGORY_PRESENTATION_V1.REVIEW,
  NOTIFICATION: CATEGORY_PRESENTATION_V1.NOTIFICATION,
  REPRESENTATION: Object.freeze({
    label: "Apoderamientos",
    aliases: Object.freeze(["poder", "representante", "revocación"]),
  }),
  CENSUS: Object.freeze({
    label: "Registros tributarios",
    aliases: Object.freeze(["REDEME", "SII", "registro"]),
  }),
  CERTIFICATE: CATEGORY_PRESENTATION_V1.CERTIFICATE,
  COLLECTION: CATEGORY_PRESENTATION_V1.COLLECTION,
  SANCTION: CATEGORY_PRESENTATION_V1.SANCTION,
  REFUND: CATEGORY_PRESENTATION_V1.REFUND,
  INSOLVENCY: Object.freeze({
    label: "Insolvencia y concurso",
    aliases: Object.freeze(["concurso", "insolvencia", "microempresa"]),
  }),
  CUSTOMS: Object.freeze({
    label: "Aduanas e importación",
    aliases: Object.freeze(["aduana", "importación", "levante"]),
  }),
  TECHNICAL: Object.freeze({
    label: "Respuestas técnicas",
    aliases: Object.freeze(["VERI*FACTU", "registro de facturación", "rechazo técnico"]),
  }),
});

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
    | AeatDocumentOfficialSourceIdV1
    | string;
  readonly title: string;
  readonly authority: "AEAT" | "BOE" | "Gobierno de España";
  readonly sourceKind: "PROCEDURE_INFORMATION" | "LEGAL_TEXT";
  readonly canonicalUrl: string;
  readonly urlCheckedOn:
    | "2026-07-12"
    | "2026-07-13"
    | "2026-07-15"
    | "2026-07-16"
    | "2026-07-17";
  readonly verificationStatus: "OFFICIAL_URL_VERIFIED";
  readonly legalReviewStatus: "LEGAL_REVIEW_PENDING";
  readonly usagePolicy: "CONTEXT_ONLY";
}

export interface FiscalNotificationGuideRelatedFamilyV1 {
  readonly relationId: `${FiscalNotificationDocumentChainIdV2}:${FiscalNotificationRelationTypeIdV2}`;
  readonly chainId: FiscalNotificationDocumentChainIdV2;
  readonly relationType: FiscalNotificationRelationTypeIdV2;
  readonly familyId: FiscalNotificationDocumentFamilyIdV2;
  readonly nameEs: string;
  readonly direction: "POSSIBLE_PREVIOUS" | "POSSIBLE_NEXT";
  readonly status: "SUGGESTED_ONLY";
  readonly matchPolicy: "EXPLICIT_REFERENCE_OR_HUMAN_CONFIRMATION_REQUIRED";
  readonly requiresPrintedFavorableOutcome: boolean;
  readonly autoConfirm: false;
}

export interface FiscalNotificationGuideAbstractRelationContextV1 {
  readonly contextKind:
    | "DECLARED_CHAIN_WILDCARD"
    | "DECLARED_RELATION_WITHOUT_TARGET";
  readonly chainId: FiscalNotificationDocumentChainIdV2 | null;
  readonly relationType: AeatDocumentRelationTypeIdV1;
  readonly abstractNodeId: FiscalNotificationAbstractNodeIdV2 | null;
  readonly counterpartFamilyId: FiscalNotificationDocumentFamilyIdV2 | null;
  readonly direction:
    | "POSSIBLE_PREVIOUS"
    | "POSSIBLE_NEXT"
    | "CONTEXT_ONLY";
  readonly status: "SUGGESTED_ONLY";
  readonly prudentPhrase: string;
  readonly requiresPrintedFavorableOutcome: boolean;
  readonly autoConfirm: false;
}

export type FiscalNotificationGuideCoverageStatusV1 =
  | "AUTOMATIC_REVIEW_ONLY"
  | "MANUAL_REVIEW_ONLY";

export interface FiscalNotificationGuideProhibitionV1 {
  readonly id: FiscalNotificationProhibitedInferenceIdV2;
  readonly label: string;
}

export interface FiscalNotificationGuideEntryV1 {
  readonly schemaVersion: typeof FISCAL_NOTIFICATION_GUIDE_SCHEMA_VERSION_V1;
  readonly releaseId: typeof FISCAL_NOTIFICATION_GUIDE_RELEASE_ID_V1;
  readonly familyId: FiscalNotificationGuideFamilyIdV1;
  readonly nameEs: string;
  readonly category: FiscalNotificationGuideCategoryV1;
  readonly categoryLabel: string;
  readonly aliases: readonly string[];
  readonly knowledgePriority: FiscalNotificationKnowledgePriorityV2 | "P2";
  readonly recognitionMode: FiscalNotificationGuideRecognitionModeV2;
  readonly recognitionMaturity:
    | "LEGACY_CATALOG"
    | AeatOfficialCatalogMaturityV9;
  readonly summary: string;
  readonly plainLanguage: FiscalNotificationPlainLanguageGuidanceV1;
  readonly documentChecks: readonly string[];
  readonly possiblePrevious: readonly FiscalNotificationGuideRelatedFamilyV1[];
  readonly possibleNext: readonly FiscalNotificationGuideRelatedFamilyV1[];
  readonly abstractRelationContexts: readonly FiscalNotificationGuideAbstractRelationContextV1[];
  readonly relationHints: readonly string[];
  readonly sources: readonly FiscalNotificationGuideSourceV1[];
  readonly coverage: Readonly<{
    status: FiscalNotificationGuideCoverageStatusV1;
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
const completionByFamilyId = new Map(
  AEAT_DOCUMENT_COMPLETION_GATE_V2.profiles.map((profile) => [
    profile.familyId,
    profile,
  ] as const),
);

const GUIDE_REVIEW_ONLY_BLOCKERS_V1 = Object.freeze([
  "OFFICIAL_CONTEXT_ONLY_NOT_A_RULE",
  "LEGAL_REVIEW_PENDING",
  "OPERATIONAL_ACTIVATION_PROHIBITED",
] as const satisfies readonly FiscalNotificationKnowledgeBlockerV2[]);

function relatedFamilies(
  familyId: FiscalNotificationDocumentFamilyIdV2,
  direction: FiscalNotificationGuideRelatedFamilyV1["direction"],
): readonly FiscalNotificationGuideRelatedFamilyV1[] {
  const related = new Map<string, FiscalNotificationGuideRelatedFamilyV1>();
  const adjacency = getFiscalNotificationFamilyChainAdjacencyV2(familyId);
  const edges =
    direction === "POSSIBLE_PREVIOUS"
      ? adjacency.incoming
      : adjacency.outgoing;

  for (const edge of edges) {
    if (
      !isFiscalNotificationDocumentFamilyIdV2(edge.rawFromNode) ||
      !isFiscalNotificationDocumentFamilyIdV2(edge.rawToNode)
    ) {
      continue;
    }
    const otherId =
      direction === "POSSIBLE_PREVIOUS"
        ? edge.fromFamilyId
        : edge.toFamilyId;
    if (otherId === familyId) continue;
    const otherFamily = resolveFiscalNotificationDocumentFamilyV2(otherId);
    if (!otherFamily) continue;
    const relationId = `${edge.chainId}:${edge.relationType}` as const;
    const key = `${relationId}:${otherFamily.id}:${direction}`;
    related.set(
      key,
      Object.freeze({
        relationId,
        chainId: edge.chainId,
        relationType: edge.relationType,
        familyId: otherFamily.id,
        nameEs: otherFamily.nameEs,
        direction,
        status: "SUGGESTED_ONLY",
        matchPolicy: "EXPLICIT_REFERENCE_OR_HUMAN_CONFIRMATION_REQUIRED",
        requiresPrintedFavorableOutcome:
          edge.requiresPrintedFavorableOutcome,
        autoConfirm: false,
      }),
    );
  }

  return Object.freeze(
    [...related.values()].sort((left, right) =>
      `${left.chainId}:${left.relationType}:${left.familyId}`.localeCompare(
        `${right.chainId}:${right.relationType}:${right.familyId}`,
      ),
    ),
  );
}

function isAbstractNodeId(
  value: string,
): value is FiscalNotificationAbstractNodeIdV2 {
  return !isFiscalNotificationDocumentFamilyIdV2(value);
}

function abstractRelationContexts(
  familyId: FiscalNotificationDocumentFamilyIdV2,
): readonly FiscalNotificationGuideAbstractRelationContextV1[] {
  const profile = resolveAeatDocumentProfileV1(familyId);
  if (!profile) throw new Error("Missing fiscal notification knowledge profile");
  const contexts = new Map<
    string,
    FiscalNotificationGuideAbstractRelationContextV1
  >();

  for (const chain of FISCAL_NOTIFICATION_DOCUMENT_CHAINS_V2) {
    for (const edge of chain.edges) {
      const fromAbstract = isAbstractNodeId(edge.from);
      const toAbstract = isAbstractNodeId(edge.to);
      if (!fromAbstract && !toAbstract) continue;
      const familyMatchesFrom = fromAbstract
        ? matchesFiscalNotificationAbstractNodeV2({
            nodeId: edge.from,
            familyId,
            printedFavorableOutcome: true,
          })
        : edge.from === familyId;
      const familyMatchesTo = toAbstract
        ? matchesFiscalNotificationAbstractNodeV2({
            nodeId: edge.to,
            familyId,
            printedFavorableOutcome: true,
          })
        : edge.to === familyId;
      if (!familyMatchesFrom && !familyMatchesTo) continue;
      const followsFrom =
        (!fromAbstract && edge.from === familyId) ||
        (!toAbstract && edge.to !== familyId && familyMatchesFrom);
      const direction = followsFrom
        ? ("POSSIBLE_NEXT" as const)
        : ("POSSIBLE_PREVIOUS" as const);
      const abstractNodeId = (fromAbstract
        ? edge.from
        : edge.to) as FiscalNotificationAbstractNodeIdV2;
      const counterpart = followsFrom ? edge.to : edge.from;
      const counterpartFamilyId = isFiscalNotificationDocumentFamilyIdV2(
        counterpart,
      )
        ? counterpart
        : null;
      const requiresPrintedFavorableOutcome =
        edge.from === "ANY_FAVORABLE_ACT" ||
        edge.to === "ANY_FAVORABLE_ACT";
      const key = `${chain.id}:${edge.relationType}:${abstractNodeId}:${counterpartFamilyId ?? "*"}:${direction}`;
      contexts.set(
        key,
        Object.freeze({
          contextKind: "DECLARED_CHAIN_WILDCARD",
          chainId: chain.id,
          relationType: edge.relationType,
          abstractNodeId,
          counterpartFamilyId,
          direction,
          status: "SUGGESTED_ONLY",
          prudentPhrase:
            AEAT_DOCUMENT_RELATION_TYPES_V1[edge.relationType].suggestedPhrase,
          requiresPrintedFavorableOutcome,
          autoConfirm: false,
        }),
      );
    }
  }

  const representedTypes = new Set(
    [
      ...getFiscalNotificationFamilyChainAdjacencyV2(familyId).incoming,
      ...getFiscalNotificationFamilyChainAdjacencyV2(familyId).outgoing,
    ].map((edge) => edge.relationType),
  );
  for (const role of profile.chainRole) {
    if (!role.startsWith("RELATION:")) continue;
    const relationType = role.slice("RELATION:".length);
    if (!isFiscalNotificationRelationTypeIdV2(relationType)) {
      throw new Error("Missing fiscal notification relation role");
    }
    if (representedTypes.has(relationType)) continue;
    contexts.set(
      `role:${relationType}`,
      Object.freeze({
        contextKind: "DECLARED_RELATION_WITHOUT_TARGET",
        chainId: null,
        relationType,
        abstractNodeId: null,
        counterpartFamilyId: null,
        direction: "CONTEXT_ONLY",
        status: "SUGGESTED_ONLY",
        prudentPhrase:
          AEAT_DOCUMENT_RELATION_TYPES_V1[relationType].suggestedPhrase,
        requiresPrintedFavorableOutcome: false,
        autoConfirm: false,
      }),
    );
  }
  return Object.freeze(
    [...contexts.values()].sort((left, right) =>
      `${left.chainId ?? "~"}:${left.relationType}:${left.abstractNodeId ?? "~"}:${left.counterpartFamilyId ?? "~"}`.localeCompare(
        `${right.chainId ?? "~"}:${right.relationType}:${right.abstractNodeId ?? "~"}:${right.counterpartFamilyId ?? "~"}`,
      ),
    ),
  );
}

function guideEntry(
  family: (typeof FISCAL_NOTIFICATION_DOCUMENT_FAMILIES_V2)[number],
): FiscalNotificationGuideEntryV1 {
  const category = CATEGORY_PRESENTATION_V1[family.category];
  const completion = completionByFamilyId.get(family.id);
  if (!completion || completion.guideStatus !== "EXPLAINED") {
    throw new Error("Missing fiscal notification completion evidence");
  }

  const legacyGuidance = resolveFiscalNotificationPlainLanguageGuidanceV1(
    family.id,
  );
  const knowledge = resolveFiscalNotificationKnowledgeGuidanceV2(family.id);
  const plainLanguage = knowledge.guidance;

  const legacySources = Array.from(
    new Set<string>([
      ...family.sourceIds,
      ...(legacyGuidance?.sourceIds ?? []),
    ]),
  ).map((sourceId) => {
    const source = sourceById.get(
      sourceId as FiscalNotificationOfficialSourceIdV4,
    );
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
    recognitionMaturity: "LEGACY_CATALOG",
    summary: plainLanguage.inShort,
    plainLanguage,
    documentChecks: FISCAL_NOTIFICATION_GUIDE_DOCUMENT_CHECKS_V1,
    possiblePrevious: relatedFamilies(family.id, "POSSIBLE_PREVIOUS"),
    possibleNext: relatedFamilies(family.id, "POSSIBLE_NEXT"),
    abstractRelationContexts: abstractRelationContexts(family.id),
    relationHints: Object.freeze([]),
    sources: Object.freeze(sources),
    coverage: Object.freeze({
      status: knowledge.recognitionMode,
      candidateHandlerImplemented:
        completion.recognitionStatus ===
        "SPECIALIZED_RECOGNITION_IMPLEMENTED_REVIEW_ONLY",
      explicitFactExtractorImplemented:
        completion.extractionStatus === "EXTRACTOR_IMPLEMENTED_REVIEW_ONLY",
      syntheticTestCaseAvailable: Object.values(completion.testCoverage).every(
        (status) => status === "COVERED",
      ),
      legalRuleActive: false,
      operationalActionActive: false,
      automaticRelationConfirmationActive: false,
      blockers: GUIDE_REVIEW_ONLY_BLOCKERS_V1,
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

const OFFICIAL_CATALOG_GUIDE_BLOCKERS_V9 = Object.freeze([
  "EXPLICIT_FACT_EXTRACTOR_MISSING",
  "OFFICIAL_CONTEXT_ONLY_NOT_A_RULE",
  "LEGAL_REVIEW_PENDING",
  "OPERATIONAL_ACTIVATION_PROHIBITED",
] as const satisfies readonly FiscalNotificationKnowledgeBlockerV2[]);

function officialCatalogGuideEntryV9(
  profile: AeatOfficialCatalogProfileV9,
): FiscalNotificationGuideEntryV1 {
  const category = OFFICIAL_CATALOG_CATEGORY_PRESENTATION_V9[profile.category];
  if (!category) throw new Error("Missing official catalog category presentation");
  const sources = profile.officialSourceIds.map((sourceId) => {
    const source = AEAT_OFFICIAL_CATALOG_SOURCES_V9[sourceId];
    if (!source) throw new Error("Missing official catalog source");
    return Object.freeze({
      sourceId: source.sourceId,
      title: source.title,
      authority: "AEAT" as const,
      sourceKind: "PROCEDURE_INFORMATION" as const,
      canonicalUrl: source.url,
      urlCheckedOn: "2026-07-17" as const,
      verificationStatus: "OFFICIAL_URL_VERIFIED" as const,
      legalReviewStatus: "LEGAL_REVIEW_PENDING" as const,
      usagePolicy: "CONTEXT_ONLY" as const,
    });
  });
  const relationHints = AEAT_OFFICIAL_CATALOG_CHAINS_V9
    .filter((chain) => chain.nodes.includes(profile.id))
    .flatMap((chain) => [
      chain.explanation,
      `No permite concluir: ${chain.forbiddenInference}`,
    ]);
  const expectedFieldNames = [
    ...profile.mustExtract.references,
    ...profile.mustExtract.dates,
    ...profile.mustExtract.money,
    ...profile.mustExtract.facts,
  ].map((fieldId) => fieldId.toLocaleLowerCase("es").replaceAll("_", " "));
  const plainLanguage: FiscalNotificationPlainLanguageGuidanceV1 = Object.freeze({
    schemaVersion: 1,
    releaseId: FISCAL_NOTIFICATION_PLAIN_LANGUAGE_GUIDANCE_RELEASE_ID_V1,
    profileId: profile.id,
    profileVersion: "1.0.0",
    familyId: profile.id,
    status: "GENERAL_CONTEXT_EXPLAINED",
    inShort: profile.whatItIs,
    whyItUsuallyArrives:
      profile.notes ||
      `La AEAT lo emite dentro de ${category.label.toLocaleLowerCase("es")} para comunicar el paso y el resultado que figuran en el propio documento.`,
    usualNextStep:
      `Comprueba el resultado, las referencias y las fechas impresas. El analizador buscará, entre otros, estos campos: ${expectedFieldNames.slice(0, 6).join(", ")}.`,
    deadline: Object.freeze({
      title:
        profile.deadlineTrigger === "NONE"
          ? "No crea un plazo por sí solo"
          : "Localiza el inicio exacto del plazo",
      detail:
        profile.deadlineTrigger === "NONE"
          ? "Este perfil no atribuye un plazo a este documento. Si el PDF incluye uno, debe revisarse literalmente y no se calcula desde la fecha de subida."
          : "El plazo depende del hecho o la fecha que indique el documento y, cuando proceda, de la notificación efectiva. Nunca se calcula desde la fecha de escaneo o subida.",
      basis: "RECEIPT_OR_DOCUMENT_ONLY",
    }),
    keyPoints: Object.freeze([...profile.notProvenByThisDocument]),
    searchTerms: Object.freeze([
      ...profile.id.split(/[._-]/u).filter(Boolean),
      ...profile.phases,
      ...profile.relationRules,
      profile.nameEs,
      category.label,
    ]),
    sourceIds: Object.freeze([...profile.officialSourceIds]),
    documentPolicy: "DOCUMENT_IS_PRIMARY",
    networkPolicy: "NO_RUNTIME_NETWORK",
    inferencePolicy: "NO_DOCUMENT_SPECIFIC_INFERENCE",
    deadlinePolicy: "NEVER_CALCULATE_FROM_ISSUE_OR_SCAN_DATE",
    operationalPolicy: "INFORMATION_ONLY_NO_AUTOMATIC_ACTION",
  });

  return Object.freeze({
    schemaVersion: FISCAL_NOTIFICATION_GUIDE_SCHEMA_VERSION_V1,
    releaseId: FISCAL_NOTIFICATION_GUIDE_RELEASE_ID_V1,
    familyId: profile.id,
    nameEs: profile.nameEs,
    category: profile.category as FiscalNotificationGuideCategoryV1,
    categoryLabel: category.label,
    aliases: Object.freeze([
      ...category.aliases,
      ...profile.id.split(/[._-]/u).filter(Boolean),
      ...profile.phases,
      ...profile.relationRules,
    ]),
    knowledgePriority: profile.priority,
    recognitionMode:
      profile.priority === "P2"
        ? "MANUAL_REVIEW_ONLY"
        : "AUTOMATIC_REVIEW_ONLY",
    recognitionMaturity: profile.recognitionMaturity,
    summary: profile.whatItIs,
    plainLanguage,
    documentChecks: FISCAL_NOTIFICATION_GUIDE_DOCUMENT_CHECKS_V1,
    possiblePrevious: Object.freeze([]),
    possibleNext: Object.freeze([]),
    abstractRelationContexts: Object.freeze([]),
    relationHints: Object.freeze(relationHints),
    sources: Object.freeze(sources),
    coverage: Object.freeze({
      status:
        profile.priority === "P2"
          ? "MANUAL_REVIEW_ONLY"
          : "AUTOMATIC_REVIEW_ONLY",
      candidateHandlerImplemented: true,
      explicitFactExtractorImplemented: false,
      syntheticTestCaseAvailable: true,
      legalRuleActive: false,
      operationalActionActive: false,
      automaticRelationConfirmationActive: false,
      blockers: OFFICIAL_CATALOG_GUIDE_BLOCKERS_V9,
    }),
    prohibitions: Object.freeze(
      FISCAL_NOTIFICATION_PROHIBITED_INFERENCE_IDS_V2.map((id) =>
        Object.freeze({ id, label: PROHIBITED_INFERENCE_LABELS_V1[id] }),
      ),
    ),
    printedDocumentPolicy: "EXTRACT_EXACTLY_THEN_REQUIRE_REVIEW",
    officialContextPolicy: "INTERPRET_ONLY_NEVER_OVERRIDE_DOCUMENT",
    legalReviewStatus: "LEGAL_REVIEW_PENDING",
    operationalPolicy: "PROHIBITED_UNTIL_HUMAN_REVIEW",
    requiresHumanReview: true,
    permitsDebtCreation: false,
    permitsDeadlineCreation: false,
    permitsPaymentAction: false,
    permitsAccountingAction: false,
    permitsAutomaticRelationConfirmation: false,
  });
}

export const FISCAL_NOTIFICATION_GUIDE_ENTRIES_V1 = Object.freeze(
  [
    ...FISCAL_NOTIFICATION_DOCUMENT_FAMILIES_V2.map(guideEntry),
    ...AEAT_OFFICIAL_CATALOG_PROFILES_V9.map(officialCatalogGuideEntryV9),
  ],
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
    rawFamilyId as FiscalNotificationGuideFamilyIdV1,
  );
  return entry
    ? Object.freeze({ status: "SELECTED", entry })
    : Object.freeze({ status: "UNKNOWN_OR_INVALID", entry: null });
}
