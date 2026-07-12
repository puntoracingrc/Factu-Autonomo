export type FiscalEntityRelationType =
  | "EXACT_FILE_DUPLICATE"
  | "COPY_OF_SAME_ACT"
  | "PART_OF_DOCUMENT_PACKAGE"
  | "NOTIFIES_ACT"
  | "DELIVERY_ATTEMPT_FOR"
  | "TEMPLATE_LINEAGE"
  | "LANGUAGE_EQUIVALENT_TEMPLATE"
  | "SAME_CASE"
  | "SAME_CANONICAL_DEBT"
  | "DERIVES_FROM_ASSESSMENT"
  | "SANCTION_FOR"
  | "LOSS_OF_REDUCTION_FROM"
  | "INSTALLMENT_OF"
  | "ENFORCEMENT_FOR_INSTALLMENT"
  | "ACCELERATES_REMAINING_BALANCE"
  | "SUPERSEDES_PAYMENT_PLAN"
  | "SETTLED_BY_OFFSET"
  | "PARTIALLY_SETTLED_BY_OFFSET"
  | "CROSS_AGENCY_DEDUCTION"
  | "PAYMENT_FORM_FOR"
  | "SEIZURE_FOR_DEBT"
  | "SEIZURE_RELEASES"
  | "REITERATES_OBLIGATION"
  | "CALCULATION_DEPENDS_ON_PRIOR_ASSESSMENT"
  | "REFUND_OFFSET_AND_RESIDUAL_PAYMENT"
  | "SNAPSHOT_CONTAINS_DEBT"
  | "POSSIBLY_RELATED"
  | "USER_CONFIRMED_RELATION";

export type RelationActivation =
  | "ACTIVE_EXACT_IDENTITY"
  | "ACTIVE_EXPLICIT_REFERENCE"
  | "CATALOG_ONLY_REVIEW_REQUIRED"
  | "HUMAN_ACTION_ONLY";

export type AutomatedRelationBasis =
  | "EXACT_FILE_HASH"
  | "EXPLICIT_REFERENCE"
  | "EXPLICIT_PARENT_ID";

export interface FiscalEntityRelationCatalogEntry {
  readonly type: FiscalEntityRelationType;
  readonly descriptionEs: string;
  readonly activation: RelationActivation;
  readonly catalogSource: "ANONYMIZED_CORPUS_SEED";
  readonly catalogVersion: 1;
}

export const FISCAL_RELATION_ENGINE_ID =
  "fiscal-notification-entity-relations" as const;
export const FISCAL_RELATION_ENGINE_VERSION = 1 as const;
export const MAX_FISCAL_RELATION_CANDIDATES = 1_000 as const;

export const FISCAL_ENTITY_RELATION_CATALOG = Object.freeze([
  entry("EXACT_FILE_DUPLICATE", "Mismo hash de archivo", "ACTIVE_EXACT_IDENTITY"),
  entry("COPY_OF_SAME_ACT", "Mismo acto en archivos diferentes"),
  entry("PART_OF_DOCUMENT_PACKAGE", "Parte lógica del mismo paquete documental"),
  entry("NOTIFIES_ACT", "Notifica o acredita la notificación de otro acto"),
  entry("DELIVERY_ATTEMPT_FOR", "Intento o reenvío asociado a un acto"),
  entry("TEMPLATE_LINEAGE", "Misma familia visual; no implica el mismo expediente"),
  entry("LANGUAGE_EQUIVALENT_TEMPLATE", "Variante lingüística del mismo esquema"),
  entry("SAME_CASE", "Mismo expediente"),
  entry("SAME_CANONICAL_DEBT", "Actos distintos sobre la misma deuda"),
  entry("DERIVES_FROM_ASSESSMENT", "Deuda o sanción derivada de liquidación"),
  entry("SANCTION_FOR", "Sanción vinculada a una infracción"),
  entry("LOSS_OF_REDUCTION_FROM", "Recuperación de una reducción condicionada"),
  entry("INSTALLMENT_OF", "Cuota de un plan"),
  entry("ENFORCEMENT_FOR_INSTALLMENT", "Apremio de una cuota concreta"),
  entry("ACCELERATES_REMAINING_BALANCE", "Vencimiento anticipado del principal restante"),
  entry("SUPERSEDES_PAYMENT_PLAN", "Nuevo calendario que sustituye al anterior"),
  entry("SETTLED_BY_OFFSET", "Extinción total por compensación"),
  entry("PARTIALLY_SETTLED_BY_OFFSET", "Extinción parcial por compensación"),
  entry("CROSS_AGENCY_DEDUCTION", "Deducción por deuda de otro organismo"),
  entry("PAYMENT_FORM_FOR", "Carta de pago de una obligación"),
  entry("SEIZURE_FOR_DEBT", "Embargo sobre una deuda existente"),
  entry("SEIZURE_RELEASES", "Levantamiento de una diligencia"),
  entry("REITERATES_OBLIGATION", "Segundo requerimiento de una obligación previa"),
  entry("CALCULATION_DEPENDS_ON_PRIOR_ASSESSMENT", "Cálculo que depende de una regularización previa"),
  entry("REFUND_OFFSET_AND_RESIDUAL_PAYMENT", "Devolución, compensación y pago residual"),
  entry("SNAPSHOT_CONTAINS_DEBT", "Fotografía histórica que contiene una deuda"),
  entry("POSSIBLY_RELATED", "Relación sugerida no probada", "ACTIVE_EXPLICIT_REFERENCE"),
  entry("USER_CONFIRMED_RELATION", "Relación confirmada expresamente por el usuario", "HUMAN_ACTION_ONLY"),
] as const satisfies readonly FiscalEntityRelationCatalogEntry[]);

const RELATION_BY_TYPE = new Map(
  FISCAL_ENTITY_RELATION_CATALOG.map((item) => [item.type, item]),
);
const AUTOMATED_RELATION_BASES = new Set<AutomatedRelationBasis>([
  "EXACT_FILE_HASH",
  "EXPLICIT_REFERENCE",
  "EXPLICIT_PARENT_ID",
]);

export function getFiscalEntityRelationCatalogEntry(
  type: FiscalEntityRelationType,
): FiscalEntityRelationCatalogEntry {
  const item = RELATION_BY_TYPE.get(type);
  if (!item) throw new Error("FISCAL_NOTIFICATIONS_UNKNOWN_RELATION_TYPE");
  return item;
}

export function automatedStatusForRelation(
  type: FiscalEntityRelationType,
  basis: AutomatedRelationBasis,
): "SUGGESTED" | "SYSTEM_CONFIRMED_EXACT" {
  if (!AUTOMATED_RELATION_BASES.has(basis)) {
    throw new Error("FISCAL_NOTIFICATIONS_INVALID_RELATION_BASIS");
  }
  const item = getFiscalEntityRelationCatalogEntry(type);
  if (item.activation === "HUMAN_ACTION_ONLY") {
    throw new Error("FISCAL_NOTIFICATIONS_RELATION_REQUIRES_HUMAN_ACTION");
  }
  if (item.activation === "CATALOG_ONLY_REVIEW_REQUIRED") {
    throw new Error("FISCAL_NOTIFICATIONS_RELATION_NOT_ACTIVE");
  }
  if (type === "EXACT_FILE_DUPLICATE") {
    if (basis !== "EXACT_FILE_HASH") {
      throw new Error("FISCAL_NOTIFICATIONS_EXACT_RELATION_BASIS_REQUIRED");
    }
    return "SYSTEM_CONFIRMED_EXACT";
  }
  if (basis === "EXACT_FILE_HASH") {
    throw new Error("FISCAL_NOTIFICATIONS_INVALID_RELATION_BASIS");
  }
  return "SUGGESTED";
}

function entry(
  type: FiscalEntityRelationType,
  descriptionEs: string,
  activation: RelationActivation = "CATALOG_ONLY_REVIEW_REQUIRED",
): FiscalEntityRelationCatalogEntry {
  return Object.freeze({
    type,
    descriptionEs,
    activation,
    catalogSource: "ANONYMIZED_CORPUS_SEED",
    catalogVersion: 1,
  });
}
