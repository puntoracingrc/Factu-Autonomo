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

export interface FiscalNotificationDetailEconomyV1 {
  readonly summary: readonly FiscalNotificationDetailAmountRowV1[];
  readonly rows: readonly FiscalNotificationDetailAmountRowV1[];
  readonly installments: readonly FiscalNotificationDetailInstallmentRowV1[];
  readonly showSourceReference: boolean;
  readonly previewLimit: number;
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
    | "Relación sugerida"
    | "Relación confirmada"
    | "Referencia exacta";
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
  readonly explanation: FiscalNotificationDetailExplanationV1;
  readonly connections: FiscalNotificationDetailConnectionsV1 | null;
  readonly siblingActs: readonly FiscalNotificationDetailSiblingActV1[];
  readonly actions: Readonly<{
    canDelete: true;
    driveFileId: string | null;
  }>;
}

const GROUP_TITLES: Readonly<
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

const GENERIC_TITLES = new Set(["datos fiscales", "documento fiscal"]);

export function projectFiscalNotificationDocumentDetailV1(input: {
  readonly document: FiscalNotificationStructuredHistoryEntryV1;
  readonly group: FiscalNotificationDocumentLibraryGroupV1;
  readonly allDocuments: readonly FiscalNotificationStructuredHistoryEntryV1[];
}): FiscalNotificationDocumentDetailViewModelV1 {
  const { document, group, allDocuments } = input;
  const profile = resolveAeatDocumentProfileV1(document.documentSubtype);
  const familyLabel = profile?.nameEs ?? documentTypeLabel(document.documentType);
  const storedTitle = cleanDisplayText(document.title) ?? familyLabel;
  const title = familyLabel;
  const literalTitle =
    !GENERIC_TITLES.has(normalizeText(storedTitle)) &&
    normalizeText(storedTitle) !== normalizeText(title)
      ? storedTitle
      : null;
  const visibleFacts = document.orderedFacts.filter(isVisibleFact);
  const issuingUnit = findHeaderFact(visibleFacts, [
    /\borgano\b/u,
    /\bunidad\b/u,
    /\bdependencia\b/u,
    /\badministracion\b/u,
  ]);
  const model = findHeaderFact(visibleFacts, [/\bmodelo\b/u]);
  const period = findHeaderFact(visibleFacts, [/\bperiodo\b/u]);
  const exercise = findHeaderFact(visibleFacts, [/\bejercicio\b/u]);
  const act = findHeaderFact(visibleFacts, [
    /\bacto principal\b/u,
    /\btipo de acto\b/u,
    /\bprocedimiento\b/u,
  ]);
  const primaryDateFact = document.documentDate
    ? findPrimaryDateFact(
        visibleFacts,
        document.documentDate,
        document.documentDateBasis,
      )
    : null;
  const headerFactKeys = new Set(
    [issuingUnit, model, period, exercise, act, primaryDateFact].flatMap((fact) =>
      fact ? [fact.key] : [],
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
    fields.push(projectField(fact));
    factsByGroup.set(groupId, fields);
  }

  const factGroups = GROUP_ORDER.flatMap((id) => {
    const fields = factsByGroup.get(id) ?? [];
    return fields.length === 0
      ? []
      : [
          Object.freeze({
            id,
            title: GROUP_TITLES[id],
            fields: Object.freeze(fields),
            previewLimit: FISCAL_NOTIFICATION_DETAIL_PREVIEW_LIMIT_V1,
          }),
        ];
  });

  const economy = projectEconomy(document);
  const directLinks = group.links.filter(
    (link) =>
      link.fromDocumentId === document.key || link.toDocumentId === document.key,
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
  ].filter((item): item is FiscalNotificationDetailHeaderMetaV1 => item !== null);

  return Object.freeze({
    documentId: document.key,
    header: Object.freeze({
      categoryLabel: profile
        ? CATEGORY_LABELS[profile.category] ?? "Documento fiscal"
        : "Documento fiscal",
      familyLabel,
      typeLabel:
        (profile ? NATURE_LABELS[profile.documentNature] : null) ??
        documentTypeLabel(document.documentType),
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
      primaryDateLabel: document.documentDate
        ? formatDocumentDateBasis(document.documentDateBasis)
        : "Fecha del documento",
      primaryDateValue: document.documentDate
        ? formatCalendarDate(document.documentDate)
        : "No identificada",
      primaryDateProvenance: primaryDateFact
        ? projectField(primaryDateFact).provenance
        : null,
      reviewStatus: document.reviewStatus,
      reviewLabel: document.reviewLabel,
      originalLabel: document.originalArchive
        ? "Original en Drive"
        : "Original no disponible",
      metadata: Object.freeze(metadata),
    }),
    factGroups: Object.freeze(factGroups),
    economy,
    explanation: Object.freeze({
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
    }),
    connections,
    siblingActs: Object.freeze(siblingActs),
    actions: Object.freeze({
      canDelete: true as const,
      driveFileId: document.originalArchive?.driveFileId ?? null,
    }),
  });
}

function projectField(
  fact: FiscalNotificationStructuredHistoryOrderedFactV1,
): FiscalNotificationDetailFieldV1 {
  const value = maskSensitiveIdentifiers(fact.label, fact.value);
  return Object.freeze({
    key: fact.key,
    label: fact.label,
    value,
    provenance: Object.freeze({
      key: `provenance:${fact.key}`,
      fieldLabel: fact.label,
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
  const rows = document.money.flatMap((fact) => {
    const label = cleanDisplayText(fact.label);
    if (!label) return [];
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
  });
  const summary = [...rows]
    .sort(
      (left, right) =>
        amountSummaryPriority(left.label) - amountSummaryPriority(right.label),
    )
    .slice(0, 4);
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
        dueDatePageNumbers: Object.freeze([
          ...installment.dueDatePageNumbers,
        ]),
        total,
        totalPageNumbers: Object.freeze([
          ...installment.totalPageNumbers,
        ]),
        components: Object.freeze(components),
        pageNumbers: Object.freeze([...installment.pageNumbers]),
      }),
    ];
  });
  if (rows.length === 0 && installments.length === 0) return null;
  return Object.freeze({
    summary: Object.freeze(summary),
    rows: Object.freeze(rows),
    installments: Object.freeze(installments),
    showSourceReference: rows.some((row) => row.sourceReference !== null),
    previewLimit: FISCAL_NOTIFICATION_DETAIL_TABLE_LIMIT_V1,
  });
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
  const related = group.documents.find((candidate) => candidate.key === relatedId);
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
  if (fact.semantic === "DATE") return "DATES";
  if (fact.semantic === "REFERENCE") return "REFERENCES";
  if (fact.semantic === "PARTY" || fact.semantic === "MASKED_VALUE") {
    return "PARTIES";
  }
  if (fact.semantic === "OBLIGATION") return "OBLIGATIONS";
  const label = normalizeText(fact.label);
  if (/recurso|alegacion|impugn|suspension/u.test(label)) return "APPEALS";
  if (/oblig|debe|documentacion solicitada|requerid|canal de respuesta/u.test(label)) {
    return "OBLIGATIONS";
  }
  if (/resultado|resolucion|decision|consecuencia|incumpl|efecto|estado/u.test(label)) {
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
  return (
    fact.label.trim().length > 0 &&
    fact.value.trim().length > 0 &&
    Number.isSafeInteger(fact.pageNumber) &&
    fact.pageNumber > 0 &&
    !containsInternalFiscalNotificationToken(fact.label) &&
    !containsInternalFiscalNotificationToken(fact.value) &&
    !containsInternalFiscalNotificationToken(fact.sourceReference)
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
  const familyLabel = profile?.nameEs ?? documentTypeLabel(document.documentType);
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

function amountSummaryPriority(label: string): number {
  const normalized = normalizeText(label);
  if (/total|importe a ingresar|importe a devolver/u.test(normalized)) return 0;
  if (/pendiente|principal|cuota/u.test(normalized)) return 1;
  if (/recargo|interes|costas/u.test(normalized)) return 2;
  return 3;
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
