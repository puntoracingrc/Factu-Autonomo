import { containsInternalFiscalNotificationToken } from "./document-fact-observation.v1";
import { resolveAeatDocumentProfileV1 } from "./knowledge/aeat-document-knowledge.v1";
import type {
  FiscalNotificationDocumentLibraryGroupV1,
  FiscalNotificationDocumentLibraryLinkV1,
} from "./structured-review-document-library.v1";
import type {
  FiscalNotificationStructuredHistoryEntryV1,
  FiscalNotificationStructuredHistoryOrderedFactV1,
} from "./structured-review-history-view-model.v1";
import type { FiscalNotificationMathematicalIntegrityV11 } from "./mathematical-integrity-contract.v11";

export const FISCAL_NOTIFICATION_DETAIL_PREVIEW_LIMIT_V1 = 8;
export const FISCAL_NOTIFICATION_DETAIL_TABLE_LIMIT_V1 = 12;

export type FiscalNotificationDetailFactGroupIdV1 =
  | "DATES"
  | "REFERENCES"
  | "PARTIES"
  | "FACTS"
  | "OBLIGATIONS"
  | "OUTCOME"
  | "APPEALS"
  | "FAMILY_SPECIFIC";

export interface FiscalNotificationDetailProvenanceV1 {
  readonly key: string;
  readonly fieldLabel: string;
  readonly value: string;
  readonly pageNumber: number;
  readonly pageNumbers?: readonly number[];
  readonly basis: "PRINTED";
  readonly sourceReference: string | null;
}

export interface FiscalNotificationDetailFieldV1 {
  readonly key: string;
  readonly label: string;
  readonly value: string;
  readonly provenance: FiscalNotificationDetailProvenanceV1;
}

export interface FiscalNotificationDetailFactGroupV1 {
  readonly id: FiscalNotificationDetailFactGroupIdV1;
  readonly title: string;
  readonly fields: readonly FiscalNotificationDetailFieldV1[];
  readonly previewLimit: number;
}

export interface FiscalNotificationDetailHeaderMetaV1 {
  readonly key: string;
  readonly label: string;
  readonly value: string;
}

export interface FiscalNotificationDetailHeaderV1 {
  readonly categoryLabel: string;
  readonly familyLabel: string;
  readonly typeLabel: string;
  readonly title: string;
  readonly literalTitle: string | null;
  readonly description: string;
  readonly authority: string;
  readonly issuingUnit: string | null;
  readonly primaryDateLabel: string;
  readonly primaryDateValue: string;
  readonly primaryDateProvenance: FiscalNotificationDetailProvenanceV1 | null;
  readonly reviewStatus: "PENDING" | "REVIEWED";
  readonly reviewLabel: string;
  readonly originalLabel: string;
  readonly metadata: readonly FiscalNotificationDetailHeaderMetaV1[];
}

export interface FiscalNotificationDetailAmountRowV1 {
  readonly key: string;
  readonly label: string;
  readonly value: string;
  readonly currencyLabel: string;
  readonly sourceReference: string | null;
  readonly pageNumbers: readonly number[];
}

export interface FiscalNotificationDetailInstallmentRowV1 {
  readonly key: string;
  readonly label: string;
  readonly dueDate: string | null;
  readonly dueDatePageNumbers: readonly number[];
  readonly total: string | null;
  readonly totalPageNumbers: readonly number[];
  readonly components: readonly {
    readonly label: string;
    readonly value: string;
    readonly pageNumbers: readonly number[];
  }[];
  readonly pageNumbers: readonly number[];
}

export interface FiscalNotificationDetailInstallmentTotalsV1 {
  readonly count: number;
  readonly principal: string;
  readonly interest: string;
  readonly surcharge: string;
  readonly total: string;
  readonly pageNumbers: readonly number[];
}

export interface FiscalNotificationDetailEconomyV1 {
  readonly summary: readonly FiscalNotificationDetailAmountRowV1[];
  readonly rows: readonly FiscalNotificationDetailAmountRowV1[];
  readonly installments: readonly FiscalNotificationDetailInstallmentRowV1[];
  readonly installmentTotals: FiscalNotificationDetailInstallmentTotalsV1 | null;
  readonly featuredInstallment: Readonly<{
    readonly label: string;
    readonly dueDate: string;
    readonly total: string;
    readonly pageNumbers: readonly number[];
  }> | null;
  readonly showInstallmentSurcharge: boolean;
  readonly showSourceReference: boolean;
  readonly previewLimit: number;
}

export interface FiscalNotificationDetailIntegrityV11 {
  readonly status:
    | "VALIDATED"
    | "PARTIAL"
    | "REVIEW_REQUIRED"
    | "INCONSISTENT"
    | "NOT_APPLICABLE";
  readonly statusLabel: string;
  readonly messages: readonly string[];
}

export interface FiscalNotificationDetailExplanationV1 {
  readonly documentSays: string;
  readonly officialMeaning: string;
  readonly reviewTitle: string;
  readonly reviewDetail: string;
  readonly deadlineTitle: string;
  readonly deadlineDetail: string;
  readonly deadlineBasis: "PRINTED" | "NOT_IDENTIFIED";
  readonly calculatedFacts: readonly {
    readonly key: string;
    readonly label: string;
    readonly value: string;
  }[];
}

export interface FiscalNotificationDetailRelationV1 {
  readonly key: string;
  readonly title: string;
  readonly explanation: string;
  readonly status: "CONFIRMED" | "SUGGESTED";
  readonly statusLabel:
    "Relación sugerida" | "Relación confirmada" | "Referencia exacta";
  readonly relatedDocumentId: string;
  readonly relatedDocumentTitle: string;
  readonly relatedDocumentDate: string | null;
  readonly matches: readonly {
    readonly label: string;
    readonly value: string;
    readonly currentDocumentPages: readonly number[];
    readonly relatedDocumentPages: readonly number[];
  }[];
}

export interface FiscalNotificationDetailTimelineEntryV1 {
  readonly documentId: string;
  readonly title: string;
  readonly date: string | null;
  readonly dateLabel: string;
  readonly datePageNumber: number | null;
  readonly current: boolean;
}

export interface FiscalNotificationDetailOfficialSourceV1 {
  readonly key: string;
  readonly authority: "AEAT" | "BOE";
  readonly title: string;
  readonly href: string;
}

export interface FiscalNotificationDetailConnectionsV1 {
  readonly relations: readonly FiscalNotificationDetailRelationV1[];
  readonly timeline: readonly FiscalNotificationDetailTimelineEntryV1[];
  readonly sources: readonly FiscalNotificationDetailOfficialSourceV1[];
}

export interface FiscalNotificationDetailSiblingActV1 {
  readonly documentId: string;
  readonly title: string;
  readonly current: boolean;
}

export interface FiscalNotificationDocumentDetailViewModelV1 {
  readonly documentId: string;
  readonly header: FiscalNotificationDetailHeaderV1;
  readonly factGroups: readonly FiscalNotificationDetailFactGroupV1[];
  readonly economy: FiscalNotificationDetailEconomyV1 | null;
  readonly integrity: FiscalNotificationDetailIntegrityV11 | null;
  readonly explanation: FiscalNotificationDetailExplanationV1;
  readonly connections: FiscalNotificationDetailConnectionsV1 | null;
  readonly siblingActs: readonly FiscalNotificationDetailSiblingActV1[];
  readonly actions: Readonly<{
    canDelete: boolean;
    driveFileId: string | null;
  }>;
}

export function fiscalNotificationDetailPrimaryDateLabelV1(
  familyId: string | null,
  fallback: string,
): string {
  const normalizedFallback = normalizeText(fallback);
  const canDescribePrimaryAct =
    /fecha (?:del documento|del acto|de emision|del acuerdo|de la providencia)/u.test(
      normalizedFallback,
    );
  if (
    canDescribePrimaryAct &&
    (familyId === "collection.deferral_grant" ||
      familyId === "collection.deferral_modification")
  ) {
    return "Fecha del acuerdo";
  }
  if (canDescribePrimaryAct && familyId === "collection.enforcement_order") {
    return "Fecha de la providencia";
  }
  return fallback;
}

export function fiscalNotificationDetailReviewLabelV1(
  status: "PENDING" | "REVIEWED",
): string {
  return status === "REVIEWED"
    ? "Revisión personal completada"
    : "Revisión personal pendiente";
}

export function fiscalNotificationDetailAmountLabelV1(
  familyId: string | null,
  label: string,
): string {
  if (familyId !== "assessment.final_provisional_assessment") return label;
  const normalized = normalizeText(label);
  if (/cuota (?:final|liquidada|resultante)|^cuota$/u.test(normalized)) return "Cuota resultante";
  if (/interes/u.test(normalized)) return "Intereses de demora";
  if (/total (?:del documento|a ingresar|reclamado)|importe a ingresar/u.test(normalized)) return "Total a ingresar";
  return label;
}

export function projectFiscalNotificationFamilyExplanationV1(
  familyId: string | null,
  economy: FiscalNotificationDetailEconomyV1 | null,
  fallback: FiscalNotificationDetailExplanationV1,
): FiscalNotificationDetailExplanationV1 {
  const totals = economy?.installmentTotals;
  if (familyId === "collection.enforcement_order" && economy) {
    const amount = (pattern: RegExp): string | null =>
      economy.rows.find((row) => pattern.test(normalizeText(row.label)))
        ?.value ?? null;
    const principal = amount(/principal pendiente/u);
    const reducedTotal = amount(/recargo reducido/u);
    const ordinaryTotal = amount(/total.*ordinario/u);
    if (principal && reducedTotal && ordinaryTotal) {
      return Object.freeze({
        ...fallback,
        documentSays: `La providencia muestra un principal de ${principal}, un total con recargo reducido de ${reducedTotal} y un total ordinario de ${ordinaryTotal}. Los recargos son alternativas y no se suman entre sí.`,
        officialMeaning: `Hacienda considera pendiente un principal de ${principal}. El documento ofrece un pago con recargo reducido por ${reducedTotal} dentro del plazo aplicable y muestra un total ordinario de ${ordinaryTotal}.`,
        reviewTitle: "Comprueba la deuda, el origen y la recepción",
        reviewDetail:
          "Revisa la clave de liquidación, el modelo y periodo, si existe un pago, compensación o aplazamiento previo, y la fecha efectiva de recepción.",
      });
    }
  }
  if (familyId === "assessment.final_provisional_assessment" && economy) {
    const amount = (pattern: RegExp): string | null =>
      economy.rows.find((row) => pattern.test(normalizeText(row.label)))?.value ?? null;
    const quota = amount(/cuota resultante/u);
    const interest = amount(/intereses de demora/u);
    const total = amount(/total a ingresar/u);
    const annual = amount(/retenciones anuales declaradas/u);
    const periodic = amount(/pagos periodicos declarados/u);
    if (quota && interest && total) {
      const comparison = annual && periodic
        ? ` Según las cifras impresas, se declararon ${annual} en el resumen anual y constan ${periodic} mediante autoliquidaciones periódicas.`
        : "";
      return Object.freeze({
        ...fallback,
        documentSays: `La resolución fija una cuota de ${quota}, añade ${interest} de intereses de demora y establece un total a ingresar de ${total}.`,
        officialMeaning: `Hacienda ha terminado la comprobación del resumen anual de retenciones por alquileres.${comparison} La diferencia liquidada es ${quota}; con los intereses, el total asciende a ${total}.`,
        reviewTitle: "Comprueba la liquidación y la carta de pago",
        reviewDetail: "Revisa el modelo 180, el ejercicio, la cuota, los intereses, la clave de liquidación y que el modelo 002 figure solo como documento de ingreso.",
      });
    }
  }
  if (
    (familyId !== "collection.deferral_grant" &&
      familyId !== "collection.deferral_modification") ||
    !totals
  ) {
    return fallback;
  }
  const installmentWord = totals.count === 1 ? "cuota" : "cuotas";
  return Object.freeze({
    ...fallback,
    documentSays: `El acuerdo fija ${totals.count} ${installmentWord} con sus respectivos vencimientos, principales e intereses.`,
    officialMeaning: `Hacienda ha aceptado que el principal de ${totals.principal} se pague en ${totals.count} ${installmentWord}. Con los intereses del aplazamiento, el total programado asciende a ${totals.total}.`,
    reviewTitle: "Comprueba el calendario y la domiciliación",
    reviewDetail:
      "Revisa la cuenta domiciliada, las fechas de todas las cuotas y que exista saldo suficiente en cada vencimiento.",
    deadlineTitle: "Cada cuota tiene su propio vencimiento",
    deadlineDetail:
      "Cada cuota tiene su propio vencimiento impreso. No existe una única fecha límite para todo el acuerdo.",
    deadlineBasis: "PRINTED" as const,
  });
}

export const FISCAL_NOTIFICATION_DETAIL_GROUP_TITLES_V1: Readonly<
  Record<FiscalNotificationDetailFactGroupIdV1, string>
> = Object.freeze({
  DATES: "Fechas y plazos",
  REFERENCES: "Referencias y expedientes",
  PARTIES: "Sujetos y roles",
  FACTS: "Hechos que constan",
  OBLIGATIONS: "Obligaciones e instrucciones",
  OUTCOME: "Resultado y efectos",
  APPEALS: "Recursos y alegaciones",
  FAMILY_SPECIFIC: "Otros datos del documento",
});

const GROUP_ORDER: readonly FiscalNotificationDetailFactGroupIdV1[] =
  Object.freeze([
    "DATES",
    "REFERENCES",
    "PARTIES",
    "FACTS",
    "OBLIGATIONS",
    "OUTCOME",
    "APPEALS",
    "FAMILY_SPECIFIC",
  ]);

const CATEGORY_LABELS: Readonly<Record<string, string>> = Object.freeze({
  ASSESSMENT: "Liquidaciones",
  CENSUS: "Censos y registros",
  CERTIFICATE: "Certificados",
  COLLECTION: "Recaudación",
  COMPLIANCE: "Requerimientos",
  IDENTITY: "Identificación",
  INFORMATION: "Información tributaria",
  INSPECTION: "Inspección",
  LIABILITY: "Responsabilidad",
  NOTIFICATION: "Notificaciones",
  OFFSET: "Compensaciones",
  PAYMENT: "Pagos",
  REFUND: "Devoluciones",
  REVIEW: "Recursos y revisión",
  SANCTION: "Sanciones",
  SEIZURE: "Embargos",
});

const DOCUMENT_TYPE_LABELS: Readonly<Record<string, string>> = Object.freeze({
  AEAT_ENFORCEMENT_ORDER: "Acto de recaudación ejecutiva",
  AEAT_INSTALLMENT_OR_DEFERRAL_GRANT: "Acuerdo de aplazamiento",
  AEAT_INSTALLMENT_OR_DEFERRAL_DENIAL: "Resolución de aplazamiento",
  AEAT_OFFSET_AGREEMENT: "Acuerdo de compensación",
  AEAT_PAYMENT_FORM: "Documento de pago",
  AEAT_INFORMATION_REQUEST: "Requerimiento de información",
  AEAT_ASSESSMENT_PROPOSAL: "Propuesta de liquidación",
  AEAT_ASSESSMENT: "Liquidación",
  AEAT_SANCTION_PROPOSAL: "Propuesta de sanción",
  AEAT_SANCTION_DECISION: "Resolución sancionadora",
  AEAT_SEIZURE_ORDER: "Diligencia de embargo",
  TGSS_DEBT_NOTICE: "Reclamación de deuda",
  TGSS_ENFORCEMENT_NOTICE: "Providencia de apremio",
  MUNICIPAL_FINE: "Sanción municipal",
  MUNICIPAL_TAX_NOTICE: "Notificación tributaria municipal",
  REGIONAL_AUTHORITY_NOTICE: "Notificación autonómica",
  GENERIC_ADMINISTRATIVE_NOTICE: "Documento administrativo",
  UNKNOWN: "Documento fiscal",
});

const NATURE_LABELS: Readonly<Record<string, string>> = Object.freeze({
  APPEAL: "Recurso",
  APPLICATION_OR_RESOLUTION: "Solicitud o resolución",
  APPLICATION_RECEIPT: "Justificante de solicitud",
  ASSESSMENT: "Liquidación",
  CERTIFICATE: "Certificado",
  COLLECTION_ACT: "Acto de recaudación",
  ENFORCEMENT_ACT: "Acto ejecutivo",
  FORMAL_REQUEST: "Requerimiento formal",
  INFORMATIONAL: "Comunicación informativa",
  INFORMATIONAL_WARNING: "Aviso informativo",
  INSPECTION_ACT: "Acto de inspección",
  NOTIFICATION_EVIDENCE: "Justificante de notificación",
  PAYMENT_EVIDENCE: "Justificante de pago",
  PAYMENT_INSTRUMENT: "Instrumento de pago",
  PAYMENT_NOTICE: "Comunicación de pago",
  PRECAUTIONARY_ACT: "Medida cautelar",
  PROCEDURAL_RECORD: "Diligencia de procedimiento",
  PROCEDURE_CONTAINER: "Expediente",
  PROCEDURE_START: "Inicio de procedimiento",
  PROCEDURE_START_OR_PROPOSAL: "Inicio o propuesta",
  PROPOSAL: "Propuesta",
  PROPOSAL_OR_RESOLUTION: "Propuesta o resolución",
  REGISTRATION_EVIDENCE: "Justificante de registro",
  RESOLUTION: "Resolución",
  RESOLUTION_OR_COLLECTION_ACT: "Resolución o acto de recaudación",
  RESPONSE_EVIDENCE: "Justificante de respuesta",
  SPECIAL_REVIEW: "Procedimiento especial de revisión",
  STATUS_NOTICE: "Comunicación de estado",
  STATUS_NOTICE_OR_RESOLUTION: "Comunicación o resolución",
  THIRD_PARTY_ENFORCEMENT_ACT: "Acto ejecutivo dirigido a tercero",
  THIRD_PARTY_FOLLOWUP: "Actuación posterior de tercero",
  THIRD_PARTY_REVIEW: "Revisión de tercero",
});

export function fiscalNotificationDetailCategoryLabelV1(
  category: string | undefined,
): string {
  return category
    ? (CATEGORY_LABELS[category] ?? "Documento fiscal")
    : "Documento fiscal";
}

export function fiscalNotificationDetailNatureLabelV1(nature: string): string {
  return NATURE_LABELS[nature] ?? "Documento fiscal";
}

const GENERIC_TITLES = new Set(["datos fiscales", "documento fiscal"]);

export function projectFiscalNotificationDocumentDetailV1(input: {
  readonly document: FiscalNotificationStructuredHistoryEntryV1;
  readonly group: FiscalNotificationDocumentLibraryGroupV1;
  readonly allDocuments: readonly FiscalNotificationStructuredHistoryEntryV1[];
}): FiscalNotificationDocumentDetailViewModelV1 {
  const { document, group, allDocuments } = input;
  const profile = resolveAeatDocumentProfileV1(document.documentSubtype);
  const familyLabel =
    profile?.nameEs ?? documentTypeLabel(document.documentType);
  const storedTitle = cleanDisplayText(document.title) ?? familyLabel;
  const title = familyLabel;
  const literalTitle =
    !GENERIC_TITLES.has(normalizeText(storedTitle)) &&
    normalizeText(storedTitle) !== normalizeText(title)
      ? storedTitle
      : null;
  const rawVisibleFacts = document.orderedFacts.filter(
    (fact) =>
      isVisibleFact(fact) &&
      (document.installments.length === 0 || !isProjectedInstallmentFact(fact)),
  );
  const visibleFacts = deduplicateVisibleFacts(rawVisibleFacts);
  const issuingUnit = findHeaderFact(visibleFacts, [
    /\borgano\b/u,
    /\bunidad\b/u,
    /\bdependencia\b/u,
    /\badministracion\b/u,
  ]);
  const model = findHeaderFact(visibleFacts, [
    /^(?:modelo tributario|modelo)$/u,
  ]);
  const period = findHeaderFact(visibleFacts, [
    /^(?:periodo fiscal|periodo)$/u,
  ]);
  const exercise = findHeaderFact(visibleFacts, [
    /^(?:ejercicio fiscal|ejercicio)$/u,
  ]);
  const act = findHeaderFact(visibleFacts, [
    /\bacto principal\b/u,
    /\btipo de acto\b/u,
    /\bprocedimiento\b/u,
  ]);
  const primaryDateFact = document.documentDate
    ? findPrimaryDateFact(
        rawVisibleFacts,
        document.documentDate,
        document.documentDateBasis,
      )
    : null;
  const headerFactKeys = new Set(
    [issuingUnit, model, period, exercise, act, primaryDateFact].flatMap(
      (fact) => (fact ? [fact.key] : []),
    ),
  );

  const factsByGroup = new Map<
    FiscalNotificationDetailFactGroupIdV1,
    FiscalNotificationDetailFieldV1[]
  >();
  for (const fact of visibleFacts) {
    if (fact.semantic === "MONEY" || headerFactKeys.has(fact.key)) continue;
    const groupId = classifyFact(fact);
    const fields = factsByGroup.get(groupId) ?? [];
    appendUniqueDisplayField(
      fields,
      projectField(fact, document.documentSubtype),
    );
    factsByGroup.set(groupId, fields);
  }

  const factGroups = GROUP_ORDER.flatMap((id) => {
    const fields = factsByGroup.get(id) ?? [];
    return fields.length === 0
      ? []
      : [
          Object.freeze({
            id,
            title: FISCAL_NOTIFICATION_DETAIL_GROUP_TITLES_V1[id],
            fields: Object.freeze(fields),
            previewLimit: FISCAL_NOTIFICATION_DETAIL_PREVIEW_LIMIT_V1,
          }),
        ];
  });

  const economy = projectEconomy(document);
  const integrity = projectFiscalNotificationDetailIntegrityV11(
    document.mathematicalIntegrity ?? null,
  );
  const directLinks = group.links.filter(
    (link) =>
      link.fromDocumentId === document.key ||
      link.toDocumentId === document.key,
  );
  const relations = directLinks.flatMap((link) => {
    const projected = projectRelation(link, document, group);
    return projected ? [projected] : [];
  });
  const timeline =
    relations.length > 0 && group.documents.length > 1
      ? [...group.documents]
          .sort(compareTimelineDocuments)
          .map((item) => projectTimelineEntry(item, document.key))
      : [];
  const sources = document.explanation.officialSources.flatMap((source) => {
    const title = cleanDisplayText(source.title);
    return title
      ? [
          Object.freeze({
            key: source.id,
            authority: source.authority,
            title,
            href: source.canonicalUrl,
          }),
        ]
      : [];
  });
  const connections =
    relations.length === 0 && timeline.length === 0 && sources.length === 0
      ? null
      : Object.freeze({
          relations: Object.freeze(relations),
          timeline: Object.freeze(timeline),
          sources: Object.freeze(sources),
        });

  const siblingIds = new Set(document.originalArchive?.documentIds ?? []);
  const siblingActs =
    siblingIds.size > 1
      ? allDocuments
          .filter((candidate) => siblingIds.has(candidate.key))
          .map((candidate) =>
            Object.freeze({
              documentId: candidate.key,
              title: displayDocumentTitle(candidate),
              current: candidate.key === document.key,
            }),
          )
      : [];

  const metadata = [
    act ? meta("act", "Acto", act.value) : null,
    model ? meta("model", "Modelo", model.value) : null,
    period ? meta("period", "Periodo", period.value) : null,
    exercise ? meta("exercise", "Ejercicio", exercise.value) : null,
    meta(
      "pages",
      document.pageCount === 1 ? "Página" : "Páginas",
      String(document.pageCount),
    ),
  ].filter(
    (item): item is FiscalNotificationDetailHeaderMetaV1 => item !== null,
  );
  const baseExplanation: FiscalNotificationDetailExplanationV1 = Object.freeze({
    documentSays: displayTextOrFallback(
      document.explanation.result,
      "Revisa los datos impresos que aparecen en esta ficha.",
    ),
    officialMeaning: displayTextOrFallback(
      document.explanation.whyReceived,
      "La explicación oficial de esta familia documental está pendiente de revisión.",
    ),
    reviewTitle: displayTextOrFallback(
      document.explanation.nextStep.title,
      "Revisa el documento",
    ),
    reviewDetail: displayTextOrFallback(
      document.explanation.nextStep.detail,
      "Comprueba los datos impresos antes de decidir cualquier actuación.",
    ),
    deadlineTitle: displayTextOrFallback(
      document.explanation.deadline.title,
      "Plazo por localizar",
    ),
    deadlineDetail: displayTextOrFallback(
      document.explanation.deadline.detail,
      "No se ha identificado un vencimiento explícito en los datos guardados.",
    ),
    deadlineBasis:
      document.explanation.deadline.status === "DOCUMENT_STATED"
        ? ("PRINTED" as const)
        : ("NOT_IDENTIFIED" as const),
    calculatedFacts: Object.freeze(
      document.explanation.keyFacts.flatMap((fact, index) =>
        fact.basis === "CALCULATED_FROM_PRINTED_VALUES" &&
        cleanDisplayText(fact.label) &&
        cleanDisplayText(fact.value)
          ? [
              Object.freeze({
                key: `calculated:${index}`,
                label: fact.label,
                value: fact.value,
              }),
            ]
          : [],
      ),
    ),
  });

  return Object.freeze({
    documentId: document.key,
    header: Object.freeze({
      categoryLabel: fiscalNotificationDetailCategoryLabelV1(profile?.category),
      familyLabel,
      typeLabel: profile
        ? fiscalNotificationDetailNatureLabelV1(profile.documentNature)
        : documentTypeLabel(document.documentType),
      title,
      literalTitle,
      description: displayTextOrFallback(
        document.explanation.whatItIs,
        "Documento fiscal reconocido a partir de sus datos impresos.",
      ),
      authority: displayTextOrFallback(
        document.authority,
        "Organismo no identificado",
      ),
      issuingUnit: issuingUnit?.value ?? null,
      primaryDateLabel: fiscalNotificationDetailPrimaryDateLabelV1(
        document.documentSubtype,
        document.documentDate
          ? formatDocumentDateBasis(document.documentDateBasis)
          : "Fecha del documento",
      ),
      primaryDateValue: document.documentDate
        ? formatCalendarDate(document.documentDate)
        : "No identificada",
      primaryDateProvenance: primaryDateFact
        ? projectField(primaryDateFact, document.documentSubtype).provenance
        : null,
      reviewStatus: document.reviewStatus,
      reviewLabel: fiscalNotificationDetailReviewLabelV1(document.reviewStatus),
      originalLabel: document.originalArchive
        ? "Original en Drive"
        : "PDF original no archivado",
      metadata: Object.freeze(metadata),
    }),
    factGroups: Object.freeze(factGroups),
    economy,
    integrity,
    explanation: projectFiscalNotificationFamilyExplanationV1(
      document.documentSubtype,
      economy,
      baseExplanation,
    ),
    connections,
    siblingActs: Object.freeze(siblingActs),
    actions: Object.freeze({
      canDelete: true as const,
      driveFileId: document.originalArchive?.driveFileId ?? null,
    }),
  });
}

function appendUniqueDisplayField(
  fields: FiscalNotificationDetailFieldV1[],
  candidate: FiscalNotificationDetailFieldV1,
): void {
  const existingIndex = fields.findIndex(
    (field) =>
      normalizeText(field.label) === normalizeText(candidate.label) &&
      normalizeText(field.value) === normalizeText(candidate.value),
  );
  if (existingIndex >= 0) {
    const existing = fields[existingIndex]!;
    const pageNumbers = Object.freeze(
      [
        ...new Set([
          ...(existing.provenance.pageNumbers ?? [existing.provenance.pageNumber]),
          ...(candidate.provenance.pageNumbers ?? [candidate.provenance.pageNumber]),
        ]),
      ].sort((left, right) => left - right),
    );
    fields[existingIndex] = Object.freeze({
      ...existing,
      provenance: Object.freeze({
        ...existing.provenance,
        pageNumber: pageNumbers[0]!,
        pageNumbers,
      }),
    });
    return;
  }
  fields.push(candidate);
}

export function projectFiscalNotificationDetailIntegrityV11(
  integrity: FiscalNotificationMathematicalIntegrityV11 | null,
): FiscalNotificationDetailIntegrityV11 | null {
  if (!integrity) return null;
  const messages = [...new Set(integrity.checks.map((check) => check.safeMessage))];
  const presentation = (() => {
    switch (integrity.status) {
      case "VALIDATED_EXACT":
      case "VALIDATED_WITH_ROUNDING":
        return { status: "VALIDATED" as const, statusLabel: "Comprobación correcta" };
      case "VALIDATED_PARTIAL_COMPONENTS":
        return { status: "PARTIAL" as const, statusLabel: "Comprobación parcial" };
      case "REVIEW_REQUIRED":
        return { status: "REVIEW_REQUIRED" as const, statusLabel: "Revisión necesaria" };
      case "INCONSISTENT_PRINTED_VALUES":
        return { status: "INCONSISTENT" as const, statusLabel: "Diferencia detectada" };
      case "NOT_APPLICABLE_NO_ARITHMETIC":
        return { status: "NOT_APPLICABLE" as const, statusLabel: "Sin cálculo aritmético" };
    }
  })();
  return Object.freeze({
    ...presentation,
    messages: Object.freeze(messages),
  });
}

function projectField(
  fact: FiscalNotificationStructuredHistoryOrderedFactV1,
  familyId: string | null,
): FiscalNotificationDetailFieldV1 {
  const presentation = storedFieldPresentation(fact, familyId);
  const value = maskSensitiveIdentifiers(
    presentation.label,
    presentation.value,
  );
  return Object.freeze({
    key: fact.key,
    label: presentation.label,
    value,
    provenance: Object.freeze({
      key: `provenance:${fact.key}`,
      fieldLabel: presentation.label,
      value,
      pageNumber: fact.pageNumber,
      basis: "PRINTED" as const,
      sourceReference: fact.sourceReference,
    }),
  });
}

function projectEconomy(
  document: FiscalNotificationStructuredHistoryEntryV1,
): FiscalNotificationDetailEconomyV1 | null {
  if (document.money.length === 0 && document.installments.length === 0) {
    return null;
  }
  const installmentAmounts = projectedInstallmentAmounts(document);
  const rows = deduplicateAmountRows(
    document.money.flatMap((fact) => {
      const label = cleanDisplayText(
        fiscalNotificationDetailAmountLabelV1(document.documentSubtype, fact.label),
      );
      if (
        !label ||
        (document.installments.length > 0 &&
          isInstallmentMoneyDuplicate(
            label,
            fact.amountCents,
            installmentAmounts,
          ))
      ) {
        return [];
      }
      return [
        Object.freeze({
          key: fact.key,
          label,
          value: formatMoney(fact.amountCents, fact.currency),
          currencyLabel: fact.currency === "EUR" ? "EUR" : "No indicada",
          sourceReference: fact.sourceReference
            ? cleanDisplayText(fact.sourceReference)
            : null,
          pageNumbers: Object.freeze([...fact.pageNumbers]),
        }),
      ];
    }),
  );
  const installments = document.installments.flatMap((installment) => {
    const label = cleanDisplayText(installment.label);
    if (!label) return [];
    const dueDate = installment.dueDate
      ? formatOptionalCalendarDate(installment.dueDate)
      : null;
    const total =
      installment.amountCents === null
        ? null
        : formatMoney(installment.amountCents, "EUR");
    const components = installment.components.flatMap((component) => {
      const componentLabel = cleanDisplayText(component.label);
      return componentLabel
        ? [
            Object.freeze({
              label: componentLabel,
              value: formatMoney(component.amountCents, "EUR"),
              pageNumbers: Object.freeze([...component.pageNumbers]),
            }),
          ]
        : [];
    });
    if (!dueDate && !total && components.length === 0) return [];
    return [
      Object.freeze({
        key: installment.key,
        label,
        dueDate,
        dueDatePageNumbers: Object.freeze([...installment.dueDatePageNumbers]),
        total,
        totalPageNumbers: Object.freeze([...installment.totalPageNumbers]),
        components: Object.freeze(components),
        pageNumbers: Object.freeze([...installment.pageNumbers]),
      }),
    ];
  });
  const installmentTotals = projectInstallmentTotals(document.installments);
  const firstInstallment = installments.find(
    (installment) => installment.dueDate && installment.total,
  );
  const summary = installmentTotals
    ? installmentSummaryRows(installmentTotals)
    : [...rows]
        .sort(
          (left, right) =>
            amountSummaryPriority(left.label, document.documentSubtype) -
            amountSummaryPriority(right.label, document.documentSubtype),
        )
        .slice(0, 4);
  if (rows.length === 0 && installments.length === 0) return null;
  return Object.freeze({
    summary: Object.freeze(summary),
    rows: Object.freeze(rows),
    installments: Object.freeze(installments),
    installmentTotals,
    featuredInstallment:
      firstInstallment?.dueDate && firstInstallment.total
        ? Object.freeze({
            label: "Primera cuota del calendario",
            dueDate: firstInstallment.dueDate,
            total: firstInstallment.total,
            pageNumbers: firstInstallment.pageNumbers,
          })
        : null,
    showInstallmentSurcharge:
      installmentTotals !== null && installmentTotals.surcharge !== "0,00 €",
    showSourceReference: rows.some((row) => row.sourceReference !== null),
    previewLimit: FISCAL_NOTIFICATION_DETAIL_TABLE_LIMIT_V1,
  });
}

function projectInstallmentTotals(
  installments: FiscalNotificationStructuredHistoryEntryV1["installments"],
): FiscalNotificationDetailInstallmentTotalsV1 | null {
  if (installments.length === 0) return null;
  const componentTotal = (pattern: RegExp): number =>
    installments.reduce(
      (sum, installment) =>
        sum +
        installment.components.reduce(
          (componentSum, component) =>
            componentSum +
            (pattern.test(normalizeText(component.label))
              ? component.amountCents
              : 0),
          0,
        ),
      0,
    );
  const pageNumbers = Object.freeze(
    [...new Set(installments.flatMap((item) => item.pageNumbers))].sort(
      (left, right) => left - right,
    ),
  );
  return Object.freeze({
    count: installments.length,
    principal: formatMoney(componentTotal(/principal|base/u), "EUR"),
    interest: formatMoney(componentTotal(/interes/u), "EUR"),
    surcharge: formatMoney(componentTotal(/recargo/u), "EUR"),
    total: formatMoney(
      installments.reduce(
        (sum, installment) => sum + (installment.amountCents ?? 0),
        0,
      ),
      "EUR",
    ),
    pageNumbers,
  });
}

function installmentSummaryRows(
  totals: FiscalNotificationDetailInstallmentTotalsV1,
): readonly FiscalNotificationDetailAmountRowV1[] {
  const values = [
    ["count", "Número de cuotas", String(totals.count)],
    ["principal", "Principal total", totals.principal],
    ["interest", "Intereses totales", totals.interest],
    ["total", "Total programado", totals.total],
  ] as const;
  return Object.freeze(
    values.map(([key, label, value]) =>
      Object.freeze({
        key: `installment-summary:${key}`,
        label,
        value,
        currencyLabel: "EUR",
        sourceReference: null,
        pageNumbers: totals.pageNumbers,
      }),
    ),
  );
}

function projectedInstallmentAmounts(
  document: FiscalNotificationStructuredHistoryEntryV1,
): ReadonlySet<number> {
  const values = document.installments.flatMap((installment) => [
    ...(installment.amountCents === null ? [] : [installment.amountCents]),
    ...installment.components.map((component) => component.amountCents),
  ]);
  if (document.installments.length > 0) {
    values.push(
      document.installments.reduce(
        (sum, installment) => sum + (installment.amountCents ?? 0),
        0,
      ),
    );
    for (const pattern of [/principal|base/u, /interes/u, /recargo/u]) {
      values.push(
        document.installments.reduce(
          (sum, installment) =>
            sum +
            installment.components.reduce(
              (componentSum, component) =>
                componentSum +
                (pattern.test(normalizeText(component.label))
                  ? component.amountCents
                  : 0),
              0,
            ),
          0,
        ),
      );
    }
  }
  return new Set(values);
}

function isInstallmentMoneyDuplicate(
  label: string,
  amountCents: number,
  installmentAmounts: ReadonlySet<number>,
): boolean {
  return (
    installmentAmounts.has(amountCents) &&
    /principal|base|interes|recargo|cuota|total|plan/u.test(normalizeText(label))
  );
}

function projectRelation(
  link: FiscalNotificationDocumentLibraryLinkV1,
  document: FiscalNotificationStructuredHistoryEntryV1,
  group: FiscalNotificationDocumentLibraryGroupV1,
): FiscalNotificationDetailRelationV1 | null {
  const relatedId =
    link.fromDocumentId === document.key
      ? link.toDocumentId
      : link.fromDocumentId;
  const related = group.documents.find(
    (candidate) => candidate.key === relatedId,
  );
  if (!related) return null;
  const currentIsSource = link.fromDocumentId === document.key;
  const matches = link.matches.flatMap((match) => {
    const label = cleanDisplayText(match.label);
    const value = cleanDisplayText(match.value);
    if (
      !label ||
      !value ||
      !isStrongRelationMatchLabel(label) ||
      match.sourcePageNumbers.length === 0 ||
      match.targetPageNumbers.length === 0
    ) {
      return [];
    }
    return [
      Object.freeze({
        label,
        value: maskSensitiveIdentifiers(label, value),
        currentDocumentPages: Object.freeze(
          currentIsSource
            ? [...match.sourcePageNumbers]
            : [...match.targetPageNumbers],
        ),
        relatedDocumentPages: Object.freeze(
          currentIsSource
            ? [...match.targetPageNumbers]
            : [...match.sourcePageNumbers],
        ),
      }),
    ];
  });
  if (matches.length === 0) return null;
  return Object.freeze({
    key: link.key,
    title: displayTextOrFallback(link.label, "Relación documental"),
    explanation: displayTextOrFallback(
      link.explanation,
      "La relación se basa en un identificador documental coincidente.",
    ),
    status:
      link.relationStatus === "SUGGESTED"
        ? ("SUGGESTED" as const)
        : ("CONFIRMED" as const),
    statusLabel:
      link.relationStatus === "SUGGESTED"
        ? "Relación sugerida"
        : link.relationStatus === "USER_CONFIRMED"
          ? "Relación confirmada"
          : "Referencia exacta",
    relatedDocumentId: related.key,
    relatedDocumentTitle: displayDocumentTitle(related),
    relatedDocumentDate: related.documentDate,
    matches: Object.freeze(matches),
  });
}

function classifyFact(
  fact: FiscalNotificationStructuredHistoryOrderedFactV1,
): FiscalNotificationDetailFactGroupIdV1 {
  return classifyFiscalNotificationDetailFactV1(fact);
}

export function classifyFiscalNotificationDetailFactV1(fact: {
  readonly semantic: string;
  readonly label: string;
}): FiscalNotificationDetailFactGroupIdV1 {
  if (fact.semantic === "DATE") return "DATES";
  if (fact.semantic === "REFERENCE") return "REFERENCES";
  if (fact.semantic === "PARTY" || fact.semantic === "MASKED_VALUE") {
    return "PARTIES";
  }
  if (fact.semantic === "OBLIGATION") return "OBLIGATIONS";
  const label = normalizeText(fact.label);
  if (/recurso|alegacion|impugn|suspension/u.test(label)) return "APPEALS";
  if (
    /oblig|debe|documentacion solicitada|requerid|canal de respuesta/u.test(
      label,
    )
  ) {
    return "OBLIGATIONS";
  }
  if (
    /resultado|resolucion|decision|consecuencia|incumpl|efecto|estado/u.test(
      label,
    )
  ) {
    return "OUTCOME";
  }
  if (/hecho|motivo|fundamento|objeto|concepto|alcance|canal/u.test(label)) {
    return "FACTS";
  }
  return "FAMILY_SPECIFIC";
}

function isVisibleFact(
  fact: FiscalNotificationStructuredHistoryOrderedFactV1,
): boolean {
  if (
    fact.semantic === "REFERENCE" &&
    normalizeText(fact.label) === "referencia oficial" &&
    /^\d{1,3}$/u.test(fact.value.trim())
  ) {
    return false;
  }
  return (
    fact.label.trim().length > 0 &&
    fact.value.trim().length > 0 &&
    fact.value !== "Consta en el documento" &&
    Number.isSafeInteger(fact.pageNumber) &&
    fact.pageNumber > 0 &&
    !containsInternalFiscalNotificationToken(fact.label) &&
    !containsInternalFiscalNotificationToken(fact.value) &&
    !containsInternalFiscalNotificationToken(fact.sourceReference)
  );
}

function deduplicateVisibleFacts(
  facts: readonly FiscalNotificationStructuredHistoryOrderedFactV1[],
): readonly FiscalNotificationStructuredHistoryOrderedFactV1[] {
  const identities = new Set<string>();
  return facts.filter((fact) => {
    const duplicateGroup = knownDuplicateDisplayGroup(
      fact.semantic,
      fact.label,
    );
    const identity = `${fact.semantic}\u0000${duplicateGroup ?? normalizeText(fact.label)}\u0000${normalizeText(fact.value)}\u0000${duplicateGroup ? "" : fact.pageNumber}`;
    if (identities.has(identity)) return false;
    identities.add(identity);
    return true;
  });
}

function knownDuplicateDisplayGroup(
  semantic: string,
  label: string,
): string | null {
  const normalized = normalizeText(label);
  if (
    semantic === "DATE" &&
    (/vencimiento de la cuota/u.test(normalized) ||
      /limite de pago voluntario/u.test(normalized))
  ) {
    return "INSTALLMENT_DEADLINE";
  }
  if (
    semantic === "REFERENCE" &&
    (/numero de expediente/u.test(normalized) ||
      /identificador del acuerdo/u.test(normalized))
  ) {
    return "CASE_OR_AGREEMENT";
  }
  if (
    semantic === "REFERENCE" &&
    (/clave de liquidacion/u.test(normalized) ||
      /clave de deuda/u.test(normalized) ||
      /acto o requerimiento/u.test(normalized))
  ) {
    return "DEBT_OR_LIQUIDATION";
  }
  return null;
}

function storedFieldPresentation(
  fact: FiscalNotificationStructuredHistoryOrderedFactV1,
  familyId: string | null,
): Readonly<{ label: string; value: string }> {
  if (
    (fact.semantic === "PARTY" || fact.semantic === "MASKED_VALUE") &&
    (/deudor principal/u.test(normalizeText(fact.label)) ||
      normalizeText(fact.label) === normalizeText(fact.value))
  ) {
    return Object.freeze({
      label: "Tu papel en el documento",
      value: "Obligado al pago",
    });
  }
  if (
    familyId === "collection.enforcement_order" &&
    fact.semantic === "REFERENCE" &&
    normalizeText(fact.label) === "justificante de pago"
  ) {
    return Object.freeze({
      label: "Número de la carta de pago",
      value: fact.value,
    });
  }
  return Object.freeze({ label: fact.label, value: fact.value });
}

function isProjectedInstallmentFact(
  fact: FiscalNotificationStructuredHistoryOrderedFactV1,
): boolean {
  return (
    fact.semantic === "DETAIL" &&
    /^cuota \d+$/u.test(normalizeText(fact.label)) &&
    /^vence .+ · (?:principal|base) .+ · interes .+ · (?:recargo .+ · )?total /u.test(
      normalizeText(fact.value),
    )
  );
}

function findHeaderFact(
  facts: readonly FiscalNotificationStructuredHistoryOrderedFactV1[],
  patterns: readonly RegExp[],
): FiscalNotificationStructuredHistoryOrderedFactV1 | null {
  return (
    facts.find((fact) => {
      const label = normalizeText(fact.label);
      return patterns.some((pattern) => pattern.test(label));
    }) ?? null
  );
}

function findPrimaryDateFact(
  facts: readonly FiscalNotificationStructuredHistoryOrderedFactV1[],
  documentDate: string,
  basis: FiscalNotificationStructuredHistoryEntryV1["documentDateBasis"],
): FiscalNotificationStructuredHistoryOrderedFactV1 | null {
  const matching = facts.filter(
    (fact) =>
      fact.semantic === "DATE" &&
      normalizeComparableDate(fact.value) === documentDate,
  );
  return (
    matching.find((fact) => dateLabelMatchesBasis(fact.label, basis)) ?? null
  );
}

function projectTimelineEntry(
  document: FiscalNotificationStructuredHistoryEntryV1,
  currentDocumentId: string,
): FiscalNotificationDetailTimelineEntryV1 {
  const dateFact = document.documentDate
    ? findPrimaryDateFact(
        document.orderedFacts.filter(isVisibleFact),
        document.documentDate,
        document.documentDateBasis,
      )
    : null;
  return Object.freeze({
    documentId: document.key,
    title: displayDocumentTitle(document),
    date: document.documentDate,
    dateLabel: document.documentDate
      ? formatDocumentDateBasis(document.documentDateBasis)
      : "Fecha del documento",
    datePageNumber: dateFact?.pageNumber ?? null,
    current: document.key === currentDocumentId,
  });
}

function dateLabelMatchesBasis(
  label: string,
  basis: FiscalNotificationStructuredHistoryEntryV1["documentDateBasis"],
): boolean {
  const normalized = normalizeText(label);
  switch (basis) {
    case "Fecha de emision":
      return /emision|expedicion/u.test(normalized);
    case "Fecha de firma":
      return /firma/u.test(normalized);
    case "Fecha del acto":
      return /acto|acuerdo|diligencia|resolucion/u.test(normalized);
    case "Fecha de notificacion":
      return /notificacion|acceso|recepcion/u.test(normalized);
    default:
      return false;
  }
}

function isStrongRelationMatchLabel(label: string): boolean {
  const normalized = normalizeText(label);
  return !/\b(?:importe|total|principal|recargo|interes|cuota|fecha|nombre|razon social)\b/u.test(
    normalized,
  );
}

function maskSensitiveIdentifiers(label: string, value: string): string {
  return maskFiscalNotificationDetailValueV1(label, value);
}

export function maskFiscalNotificationDetailValueV1(
  label: string,
  value: string,
): string {
  const normalizedLabel = normalizeText(label);
  if (!/\b(?:nif|nie|cif|identificador fiscal)\b/u.test(normalizedLabel)) {
    return value;
  }
  return value.replace(
    /\b(?:[XYZ]\d{7}[A-Z]|\d{8}[A-Z]|[A-Z]\d{7}[A-Z0-9])\b/giu,
    (identifier) =>
      identifier.length <= 4
        ? "****"
        : `${identifier.slice(0, 2)}${"*".repeat(identifier.length - 4)}${identifier.slice(-2)}`,
  );
}

function cleanDisplayText(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length > 0 && !containsInternalFiscalNotificationToken(trimmed)
    ? trimmed
    : null;
}

function displayTextOrFallback(value: string, fallback: string): string {
  return cleanDisplayText(value) ?? fallback;
}

function displayDocumentTitle(
  document: FiscalNotificationStructuredHistoryEntryV1,
): string {
  const profile = resolveAeatDocumentProfileV1(document.documentSubtype);
  const familyLabel =
    profile?.nameEs ?? documentTypeLabel(document.documentType);
  const storedTitle = cleanDisplayText(document.title);
  return !storedTitle || GENERIC_TITLES.has(normalizeText(storedTitle))
    ? familyLabel
    : storedTitle;
}

function meta(
  key: string,
  label: string,
  value: string,
): FiscalNotificationDetailHeaderMetaV1 {
  return Object.freeze({ key, label, value });
}

function documentTypeLabel(value: string): string {
  return DOCUMENT_TYPE_LABELS[value] ?? "Documento fiscal";
}

function amountSummaryPriority(label: string, familyId: string | null): number {
  const normalized = normalizeText(label);
  if (familyId === "collection.enforcement_order") {
    if (/principal pendiente/u.test(normalized)) return 0;
    if (/recargo reducido/u.test(normalized)) return 1;
    if (/total.*ordinario/u.test(normalized)) return 2;
    if (/recargo.*5/u.test(normalized)) return 3;
  }
  if (familyId === "assessment.final_provisional_assessment") {
    if (/cuota resultante/u.test(normalized)) return 0;
    if (/intereses de demora/u.test(normalized)) return 1;
    if (/total a ingresar/u.test(normalized)) return 2;
  }
  if (/total|importe a ingresar|importe a devolver/u.test(normalized)) return 0;
  if (/pendiente|principal|cuota/u.test(normalized)) return 1;
  if (/recargo|interes|costas/u.test(normalized)) return 2;
  return 3;
}

function deduplicateAmountRows(
  rows: readonly FiscalNotificationDetailAmountRowV1[],
): readonly FiscalNotificationDetailAmountRowV1[] {
  const identities = new Set<string>();
  return rows.filter((row) => {
    const identity = `${normalizeText(row.label)}\u0000${row.value}`;
    if (identities.has(identity)) return false;
    identities.add(identity);
    return true;
  });
}

function compareTimelineDocuments(
  left: FiscalNotificationStructuredHistoryEntryV1,
  right: FiscalNotificationStructuredHistoryEntryV1,
): number {
  if (left.documentDate && right.documentDate) {
    const dateOrder = left.documentDate.localeCompare(right.documentDate);
    if (dateOrder !== 0) return dateOrder;
  }
  if (left.documentDate && !right.documentDate) return -1;
  if (!left.documentDate && right.documentDate) return 1;
  return left.key.localeCompare(right.key);
}

function formatCalendarDate(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/u.exec(value);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : value;
}

function formatOptionalCalendarDate(value: string): string | null {
  const cleaned = cleanDisplayText(value);
  return cleaned ? formatCalendarDate(cleaned) : null;
}

function normalizeComparableDate(value: string): string | null {
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/u.exec(value.trim());
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const local = /^(\d{2})\/(\d{2})\/(\d{4})$/u.exec(value.trim());
  return local ? `${local[3]}-${local[2]}-${local[1]}` : null;
}

function formatDocumentDateBasis(
  value: FiscalNotificationStructuredHistoryEntryV1["documentDateBasis"],
): string {
  switch (value) {
    case "Fecha de emision":
      return "Fecha de emisión";
    case "Fecha de firma":
      return "Fecha de firma";
    case "Fecha del acto":
      return "Fecha del acto";
    case "Fecha de notificacion":
      return "Fecha de notificación";
    default:
      return "Fecha del documento";
  }
}

function formatMoney(amountCents: number, currency: "EUR" | "UNKNOWN"): string {
  const amount = (amountCents / 100).toLocaleString("es-ES", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return currency === "EUR" ? `${amount} €` : `${amount} · moneda no indicada`;
}

function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/gu, "")
    .toLocaleLowerCase("es-ES")
    .trim();
}
