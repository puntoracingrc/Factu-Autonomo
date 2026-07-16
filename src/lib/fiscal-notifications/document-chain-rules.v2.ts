import {
  AEAT_DOCUMENT_CHAINS_V1,
  AEAT_DOCUMENT_CHAIN_IDS_V1,
  AEAT_DOCUMENT_CHAIN_WILDCARDS_V1,
  AEAT_DOCUMENT_KNOWLEDGE_V1,
  AEAT_DOCUMENT_PROFILE_IDS_V1,
  AEAT_DOCUMENT_RELATION_TYPE_IDS_V1,
  type AeatDocumentChainNodeV1,
  type AeatDocumentChainIdV1,
  type AeatDocumentChainWildcardV1,
  type AeatDocumentRelationTypeIdV1,
} from "./knowledge/aeat-document-knowledge.v1";

export const FISCAL_NOTIFICATION_DOCUMENT_CHAIN_RULES_VERSION_V2 =
  "2.0.0" as const;

export const FISCAL_NOTIFICATION_DOCUMENT_CHAIN_IDS_V2 =
  AEAT_DOCUMENT_CHAIN_IDS_V1;

export type FiscalNotificationDocumentChainIdV2 =
  AeatDocumentChainIdV1;
export type FiscalNotificationDocumentFamilyIdV2 =
  (typeof AEAT_DOCUMENT_PROFILE_IDS_V1)[number];
export type FiscalNotificationRelationTypeIdV2 =
  AeatDocumentRelationTypeIdV1;
export type FiscalNotificationAbstractNodeIdV2 =
  AeatDocumentChainWildcardV1;

const ANY_ADMINISTRATIVE_ACT_MEMBERS = Object.freeze([
  "registry.tax_registration_resolution",
  "registry.census_requirement",
  "registry.census_proposal",
  "registry.tax_domicile_resolution",
  "registry.nif_revocation",
  "registry.nif_rehabilitation",
  "compliance.informal_missing_return_notice",
  "compliance.formal_filing_requirement",
  "compliance.document_request",
  "compliance.individual_information_requirement",
  "assessment.procedure_start",
  "assessment.allegations_and_proposal",
  "assessment.final_provisional_assessment",
  "assessment.no_adjustment_resolution",
  "assessment.value_check",
  "sanction.initiation_and_hearing",
  "sanction.resolution",
  "sanction.loss_of_reduction",
  "collection.deferral_request_receipt",
  "collection.deferral_substantiation_requirement",
  "collection.deferral_grant",
  "collection.deferral_modification",
  "collection.deferral_denial",
  "collection.deferral_inadmissibility_or_archival",
  "collection.deferral_breach",
  "collection.interest_assessment",
  "collection.enforcement_order",
  "collection.precautionary_measure",
  "collection.asset_sale",
  "collection.late_filing_surcharge",
  "collection.external_debt",
  "collection.offset_requested",
  "collection.offset_ex_officio",
  "collection.offset_resolution",
  "collection.extinction_or_balance_notice",
  "refund.request_or_recognition",
  "refund.payment_communication",
  "refund.undue_payment",
  "refund.withholding_or_offset",
  "irpf.spouse_refund_suspension",
  "review.guarantee_cost_reimbursement",
  "seizure.bank_account",
  "seizure.movable_asset",
  "seizure.real_estate",
  "seizure.commercial_credits",
  "seizure.compliance_reiteration",
  "seizure.release",
  "seizure.wages_or_pensions",
  "seizure.securities_or_financial_assets",
  "seizure.cash_or_refund",
  "seizure.tpv_receipts",
  "seizure.business_income_or_rents",
  "seizure.third_party_response",
  "seizure.third_party_payment",
  "review.suspension_decision",
  "review.resolution",
  "review.material_error",
  "review.revocation",
  "review.nullity",
  "review.lesivity",
  "review.third_party_claim",
  "liability.proposal",
  "liability.final_resolution",
  "liability.solidary",
  "liability.subsidiary",
  "liability.successors",
  "inspection.procedure",
  "inspection.communication",
  "inspection.diligence",
  "inspection.act_agreement",
  "inspection.act_conformity",
  "inspection.act_disagreement",
  "inspection.assessment",
] as const satisfies readonly FiscalNotificationDocumentFamilyIdV2[]);

const ANY_APPEALABLE_ACT_MEMBERS = Object.freeze([
  "registry.tax_registration_resolution",
  "registry.tax_domicile_resolution",
  "registry.nif_revocation",
  "registry.nif_rehabilitation",
  "assessment.final_provisional_assessment",
  "assessment.value_check",
  "sanction.resolution",
  "sanction.loss_of_reduction",
  "collection.deferral_grant",
  "collection.deferral_modification",
  "collection.deferral_denial",
  "collection.deferral_inadmissibility_or_archival",
  "collection.deferral_breach",
  "collection.interest_assessment",
  "collection.enforcement_order",
  "collection.precautionary_measure",
  "collection.asset_sale",
  "collection.late_filing_surcharge",
  "collection.external_debt",
  "collection.offset_requested",
  "collection.offset_ex_officio",
  "collection.offset_resolution",
  "collection.extinction_or_balance_notice",
  "refund.request_or_recognition",
  "refund.undue_payment",
  "refund.withholding_or_offset",
  "irpf.spouse_refund_suspension",
  "review.guarantee_cost_reimbursement",
  "seizure.bank_account",
  "seizure.movable_asset",
  "seizure.real_estate",
  "seizure.commercial_credits",
  "seizure.release",
  "seizure.wages_or_pensions",
  "seizure.securities_or_financial_assets",
  "seizure.cash_or_refund",
  "seizure.tpv_receipts",
  "seizure.business_income_or_rents",
  "review.suspension_decision",
  "review.resolution",
  "review.material_error",
  "review.revocation",
  "review.nullity",
  "review.lesivity",
  "review.third_party_claim",
  "liability.final_resolution",
  "liability.solidary",
  "liability.subsidiary",
  "liability.successors",
  "inspection.assessment",
] as const satisfies readonly FiscalNotificationDocumentFamilyIdV2[]);

const ANY_SEIZURE_MEMBERS = Object.freeze([
  "seizure.bank_account",
  "seizure.movable_asset",
  "seizure.real_estate",
  "seizure.commercial_credits",
  "seizure.wages_or_pensions",
  "seizure.securities_or_financial_assets",
  "seizure.cash_or_refund",
  "seizure.tpv_receipts",
  "seizure.business_income_or_rents",
] as const satisfies readonly FiscalNotificationDocumentFamilyIdV2[]);

const ANY_THIRD_PARTY_SEIZURE_MEMBERS = Object.freeze([
  "seizure.commercial_credits",
  "seizure.wages_or_pensions",
  "seizure.tpv_receipts",
  "seizure.business_income_or_rents",
] as const satisfies readonly FiscalNotificationDocumentFamilyIdV2[]);

const ANY_ASSET_SEIZURE_MEMBERS = Object.freeze([
  "seizure.movable_asset",
  "seizure.real_estate",
  "seizure.securities_or_financial_assets",
] as const satisfies readonly FiscalNotificationDocumentFamilyIdV2[]);

const ANY_FAVORABLE_ACT_MEMBERS = Object.freeze([
  "registry.tax_registration_resolution",
  "registry.tax_domicile_resolution",
  "registry.nif_rehabilitation",
  "assessment.final_provisional_assessment",
  "assessment.no_adjustment_resolution",
  "assessment.value_check",
  "collection.deferral_grant",
  "collection.deferral_modification",
  "collection.offset_resolution",
  "collection.extinction_or_balance_notice",
  "refund.request_or_recognition",
  "refund.payment_communication",
  "refund.undue_payment",
  "refund.withholding_or_offset",
  "irpf.spouse_refund_suspension",
  "review.guarantee_cost_reimbursement",
  "seizure.release",
  "review.suspension_decision",
  "review.resolution",
  "review.material_error",
  "review.revocation",
  "review.nullity",
  "review.third_party_claim",
  "inspection.assessment",
] as const satisfies readonly FiscalNotificationDocumentFamilyIdV2[]);

export interface FiscalNotificationAbstractNodeDefinitionV2 {
  readonly id: FiscalNotificationAbstractNodeIdV2;
  readonly members: readonly FiscalNotificationDocumentFamilyIdV2[];
  readonly requiresPrintedFavorableOutcome: boolean;
  readonly matchingPolicy: "EXPLICIT_MEMBERS_ONLY";
}

export const FISCAL_NOTIFICATION_ABSTRACT_NODES_V2 = Object.freeze({
  ANY_ADMINISTRATIVE_ACT: Object.freeze({
    id: "ANY_ADMINISTRATIVE_ACT",
    members: ANY_ADMINISTRATIVE_ACT_MEMBERS,
    requiresPrintedFavorableOutcome: false,
    matchingPolicy: "EXPLICIT_MEMBERS_ONLY",
  }),
  ANY_APPEALABLE_ACT: Object.freeze({
    id: "ANY_APPEALABLE_ACT",
    members: ANY_APPEALABLE_ACT_MEMBERS,
    requiresPrintedFavorableOutcome: false,
    matchingPolicy: "EXPLICIT_MEMBERS_ONLY",
  }),
  ANY_SEIZURE: Object.freeze({
    id: "ANY_SEIZURE",
    members: ANY_SEIZURE_MEMBERS,
    requiresPrintedFavorableOutcome: false,
    matchingPolicy: "EXPLICIT_MEMBERS_ONLY",
  }),
  ANY_THIRD_PARTY_SEIZURE: Object.freeze({
    id: "ANY_THIRD_PARTY_SEIZURE",
    members: ANY_THIRD_PARTY_SEIZURE_MEMBERS,
    requiresPrintedFavorableOutcome: false,
    matchingPolicy: "EXPLICIT_MEMBERS_ONLY",
  }),
  ANY_ASSET_SEIZURE: Object.freeze({
    id: "ANY_ASSET_SEIZURE",
    members: ANY_ASSET_SEIZURE_MEMBERS,
    requiresPrintedFavorableOutcome: false,
    matchingPolicy: "EXPLICIT_MEMBERS_ONLY",
  }),
  ANY_FAVORABLE_ACT: Object.freeze({
    id: "ANY_FAVORABLE_ACT",
    members: ANY_FAVORABLE_ACT_MEMBERS,
    requiresPrintedFavorableOutcome: true,
    matchingPolicy: "EXPLICIT_MEMBERS_ONLY",
  }),
} as const satisfies Readonly<
  Record<
    FiscalNotificationAbstractNodeIdV2,
    FiscalNotificationAbstractNodeDefinitionV2
  >
>);

export interface FiscalNotificationDocumentChainEdgeV2 {
  readonly chainId: FiscalNotificationDocumentChainIdV2;
  readonly rawFromNode: AeatDocumentChainNodeV1;
  readonly rawToNode: AeatDocumentChainNodeV1;
  readonly fromFamilyId: FiscalNotificationDocumentFamilyIdV2;
  readonly toFamilyId: FiscalNotificationDocumentFamilyIdV2;
  readonly relationType: FiscalNotificationRelationTypeIdV2;
  readonly requiresPrintedFavorableOutcome: boolean;
}

export interface FiscalNotificationDocumentChainV2 {
  readonly id: FiscalNotificationDocumentChainIdV2;
  readonly description: string;
  readonly nodes: readonly AeatDocumentChainNodeV1[];
  readonly edges: readonly {
    readonly from: AeatDocumentChainNodeV1;
    readonly to: AeatDocumentChainNodeV1;
    readonly relationType: FiscalNotificationRelationTypeIdV2;
  }[];
}

export interface FiscalNotificationFamilyChainAdjacencyV2 {
  readonly familyId: FiscalNotificationDocumentFamilyIdV2;
  readonly incoming: readonly FiscalNotificationDocumentChainEdgeV2[];
  readonly outgoing: readonly FiscalNotificationDocumentChainEdgeV2[];
}

export class FiscalNotificationDocumentChainRulesErrorV2 extends Error {
  readonly code = "INVALID_FISCAL_NOTIFICATION_DOCUMENT_CHAIN_RULES_V2" as const;

  constructor(readonly path: string) {
    super(`Invalid fiscal notification document-chain rule at ${path}`);
    this.name = "FiscalNotificationDocumentChainRulesErrorV2";
  }
}

const PROFILE_ID_SET = new Set<string>(AEAT_DOCUMENT_PROFILE_IDS_V1);
const RELATION_TYPE_SET = new Set<string>(AEAT_DOCUMENT_RELATION_TYPE_IDS_V1);
const CHAIN_ID_SET = new Set<string>(FISCAL_NOTIFICATION_DOCUMENT_CHAIN_IDS_V2);
const ABSTRACT_NODE_ID_SET = new Set<string>(AEAT_DOCUMENT_CHAIN_WILDCARDS_V1);

function invalid(path: string): never {
  throw new FiscalNotificationDocumentChainRulesErrorV2(path);
}

function isAbstractNode(
  node: unknown,
): node is FiscalNotificationAbstractNodeIdV2 {
  return typeof node === "string" && ABSTRACT_NODE_ID_SET.has(node);
}

export function isFiscalNotificationDocumentFamilyIdV2(
  value: unknown,
): value is FiscalNotificationDocumentFamilyIdV2 {
  return typeof value === "string" && PROFILE_ID_SET.has(value);
}

export function isFiscalNotificationRelationTypeIdV2(
  value: unknown,
): value is FiscalNotificationRelationTypeIdV2 {
  return typeof value === "string" && RELATION_TYPE_SET.has(value);
}

function nodeMembers(
  node: AeatDocumentChainNodeV1,
): readonly FiscalNotificationDocumentFamilyIdV2[] {
  if (isAbstractNode(node)) return FISCAL_NOTIFICATION_ABSTRACT_NODES_V2[node].members;
  if (isFiscalNotificationDocumentFamilyIdV2(node)) return Object.freeze([node]);
  return invalid("node");
}

function requiresPrintedFavorableOutcome(
  from: AeatDocumentChainNodeV1,
  to: AeatDocumentChainNodeV1,
): boolean {
  return (
    (isAbstractNode(from) &&
      FISCAL_NOTIFICATION_ABSTRACT_NODES_V2[from]
        .requiresPrintedFavorableOutcome) ||
    (isAbstractNode(to) &&
      FISCAL_NOTIFICATION_ABSTRACT_NODES_V2[to]
        .requiresPrintedFavorableOutcome)
  );
}

function assertExactSet(
  actual: readonly string[],
  expected: readonly string[],
  path: string,
): void {
  if (
    actual.length !== expected.length ||
    new Set(actual).size !== actual.length ||
    expected.some((item) => !actual.includes(item))
  ) {
    invalid(path);
  }
}

function validateAbstractNodes(): void {
  assertExactSet(
    Object.keys(FISCAL_NOTIFICATION_ABSTRACT_NODES_V2),
    AEAT_DOCUMENT_CHAIN_WILDCARDS_V1,
    "abstractNodes",
  );
  for (const wildcard of AEAT_DOCUMENT_CHAIN_WILDCARDS_V1) {
    const definition = FISCAL_NOTIFICATION_ABSTRACT_NODES_V2[wildcard];
    const members = definition.members as readonly FiscalNotificationDocumentFamilyIdV2[];
    if (
      members.length === 0 ||
      new Set(members).size !== members.length
    ) {
      invalid(`abstractNodes.${wildcard}.members`);
    }
    for (const familyId of members) {
      if (!PROFILE_ID_SET.has(familyId)) {
        invalid(`abstractNodes.${wildcard}.members.${familyId}`);
      }
    }
  }
}

function compileDocumentChains(): {
  readonly chains: readonly FiscalNotificationDocumentChainV2[];
  readonly edges: readonly FiscalNotificationDocumentChainEdgeV2[];
} {
  if (
    AEAT_DOCUMENT_KNOWLEDGE_V1.meta.chainCount !== 15 ||
    AEAT_DOCUMENT_KNOWLEDGE_V1.meta.relationTypeCount !== 48
  ) {
    invalid("knowledge.meta");
  }
  assertExactSet(
    AEAT_DOCUMENT_CHAINS_V1.map((chain) => chain.id),
    FISCAL_NOTIFICATION_DOCUMENT_CHAIN_IDS_V2,
    "chains.ids",
  );
  assertExactSet(
    Object.keys(AEAT_DOCUMENT_KNOWLEDGE_V1.relationTypes),
    AEAT_DOCUMENT_RELATION_TYPE_IDS_V1,
    "relationTypes.ids",
  );
  validateAbstractNodes();

  const concreteEdges: FiscalNotificationDocumentChainEdgeV2[] = [];
  const chains = AEAT_DOCUMENT_CHAINS_V1.map((chain) => {
    if (!CHAIN_ID_SET.has(chain.id)) invalid(`chains.${chain.id}`);
    const normalizedNodes = new Set<AeatDocumentChainNodeV1>(chain.nodes);
    const edgeSignatures = new Set<string>();
    const edges = chain.edges.map((edge, edgeIndex) => {
      if (!isFiscalNotificationRelationTypeIdV2(edge.relationType)) {
        invalid(`chains.${chain.id}.edges[${edgeIndex}].relationType`);
      }
      nodeMembers(edge.from);
      nodeMembers(edge.to);
      normalizedNodes.add(edge.from);
      normalizedNodes.add(edge.to);
      const signature = `${edge.from}|${edge.relationType}|${edge.to}`;
      if (edgeSignatures.has(signature)) {
        invalid(`chains.${chain.id}.edges[${edgeIndex}]`);
      }
      edgeSignatures.add(signature);

      const requiresFavorable = requiresPrintedFavorableOutcome(
        edge.from,
        edge.to,
      );
      for (const fromFamilyId of nodeMembers(edge.from)) {
        for (const toFamilyId of nodeMembers(edge.to)) {
          concreteEdges.push(
            Object.freeze({
              chainId: chain.id as FiscalNotificationDocumentChainIdV2,
              rawFromNode: edge.from,
              rawToNode: edge.to,
              fromFamilyId,
              toFamilyId,
              relationType: edge.relationType,
              requiresPrintedFavorableOutcome: requiresFavorable,
            }),
          );
        }
      }
      return Object.freeze({
        from: edge.from,
        to: edge.to,
        relationType: edge.relationType,
      });
    });
    return Object.freeze({
      id: chain.id as FiscalNotificationDocumentChainIdV2,
      description: chain.description,
      nodes: Object.freeze([...normalizedNodes]),
      edges: Object.freeze(edges),
    });
  });

  return Object.freeze({
    chains: Object.freeze(chains),
    edges: Object.freeze(concreteEdges),
  });
}

const COMPILED = compileDocumentChains();

export const FISCAL_NOTIFICATION_DOCUMENT_CHAINS_V2 = COMPILED.chains;
export const FISCAL_NOTIFICATION_DOCUMENT_CHAIN_EDGES_V2 = COMPILED.edges;

const ADJACENCY_BY_FAMILY = Object.freeze(
  Object.fromEntries(
    AEAT_DOCUMENT_PROFILE_IDS_V1.map((familyId) => [
      familyId,
      Object.freeze({
        familyId,
        incoming: Object.freeze(
          FISCAL_NOTIFICATION_DOCUMENT_CHAIN_EDGES_V2.filter(
            (edge) => edge.toFamilyId === familyId,
          ),
        ),
        outgoing: Object.freeze(
          FISCAL_NOTIFICATION_DOCUMENT_CHAIN_EDGES_V2.filter(
            (edge) => edge.fromFamilyId === familyId,
          ),
        ),
      }),
    ]),
  ) as Readonly<
    Record<
      FiscalNotificationDocumentFamilyIdV2,
      FiscalNotificationFamilyChainAdjacencyV2
    >
  >,
);

export const FISCAL_NOTIFICATION_DOCUMENT_CHAIN_ADJACENCY_V2 =
  ADJACENCY_BY_FAMILY;

export const FISCAL_NOTIFICATION_DOCUMENT_CHAIN_VALIDATION_V2 = Object.freeze({
  version: FISCAL_NOTIFICATION_DOCUMENT_CHAIN_RULES_VERSION_V2,
  chainCount: FISCAL_NOTIFICATION_DOCUMENT_CHAINS_V2.length,
  relationTypeCount: AEAT_DOCUMENT_RELATION_TYPE_IDS_V1.length,
  profileCount: AEAT_DOCUMENT_PROFILE_IDS_V1.length,
  abstractNodeCount: AEAT_DOCUMENT_CHAIN_WILDCARDS_V1.length,
  concreteEdgeCount: FISCAL_NOTIFICATION_DOCUMENT_CHAIN_EDGES_V2.length,
  matchingPolicy: "DECLARED_EDGES_AND_EXPLICIT_MEMBERS_ONLY" as const,
  undeclaredEdgePolicy: "INACTIVE" as const,
});

export function getFiscalNotificationFamilyChainAdjacencyV2(
  familyId: unknown,
): FiscalNotificationFamilyChainAdjacencyV2 {
  if (!isFiscalNotificationDocumentFamilyIdV2(familyId)) {
    return invalid("familyId");
  }
  return FISCAL_NOTIFICATION_DOCUMENT_CHAIN_ADJACENCY_V2[familyId];
}

export function matchesFiscalNotificationAbstractNodeV2(input: {
  readonly nodeId: unknown;
  readonly familyId: unknown;
  readonly printedFavorableOutcome?: boolean;
}): boolean {
  if (!isAbstractNode(input.nodeId)) {
    return invalid("nodeId");
  }
  if (!isFiscalNotificationDocumentFamilyIdV2(input.familyId)) {
    return invalid("familyId");
  }
  if (
    input.printedFavorableOutcome !== undefined &&
    typeof input.printedFavorableOutcome !== "boolean"
  ) {
    return invalid("printedFavorableOutcome");
  }
  const definition = FISCAL_NOTIFICATION_ABSTRACT_NODES_V2[input.nodeId];
  const members = definition.members as readonly FiscalNotificationDocumentFamilyIdV2[];
  if (!members.includes(input.familyId)) return false;
  return (
    !definition.requiresPrintedFavorableOutcome ||
    input.printedFavorableOutcome === true
  );
}

export interface EvaluateFiscalNotificationDocumentChainEdgeInputV2 {
  readonly chainId: unknown;
  readonly fromFamilyId: unknown;
  readonly toFamilyId: unknown;
  readonly relationType: unknown;
  readonly printedFavorableOutcome?: boolean;
}

export type FiscalNotificationDocumentChainEdgeEvaluationV2 =
  | Readonly<{
      declared: true;
      reason: "DECLARED_TOPOLOGY";
      relationEvidenceStatus: "NOT_EVALUATED";
      edge: FiscalNotificationDocumentChainEdgeV2;
    }>
  | Readonly<{
      declared: false;
      reason:
        | "EDGE_NOT_DECLARED"
        | "PRINTED_FAVORABLE_OUTCOME_NOT_PROVEN";
      relationEvidenceStatus: "NOT_EVALUATED";
      edge: FiscalNotificationDocumentChainEdgeV2 | null;
    }>;

export function evaluateFiscalNotificationDocumentChainEdgeV2(
  input: EvaluateFiscalNotificationDocumentChainEdgeInputV2,
): FiscalNotificationDocumentChainEdgeEvaluationV2 {
  if (
    typeof input.chainId !== "string" ||
    !CHAIN_ID_SET.has(input.chainId)
  ) {
    return invalid("chainId");
  }
  if (!isFiscalNotificationDocumentFamilyIdV2(input.fromFamilyId)) {
    return invalid("fromFamilyId");
  }
  if (!isFiscalNotificationDocumentFamilyIdV2(input.toFamilyId)) {
    return invalid("toFamilyId");
  }
  if (!isFiscalNotificationRelationTypeIdV2(input.relationType)) {
    return invalid("relationType");
  }
  if (
    input.printedFavorableOutcome !== undefined &&
    typeof input.printedFavorableOutcome !== "boolean"
  ) {
    return invalid("printedFavorableOutcome");
  }
  const edge = FISCAL_NOTIFICATION_DOCUMENT_CHAIN_EDGES_V2.find(
    (candidate) =>
      candidate.chainId === input.chainId &&
      candidate.fromFamilyId === input.fromFamilyId &&
      candidate.toFamilyId === input.toFamilyId &&
      candidate.relationType === input.relationType,
  );
  if (!edge) {
    return Object.freeze({
      declared: false,
      reason: "EDGE_NOT_DECLARED",
      relationEvidenceStatus: "NOT_EVALUATED",
      edge: null,
    });
  }
  if (
    edge.requiresPrintedFavorableOutcome &&
    input.printedFavorableOutcome !== true
  ) {
    return Object.freeze({
      declared: false,
      reason: "PRINTED_FAVORABLE_OUTCOME_NOT_PROVEN",
      relationEvidenceStatus: "NOT_EVALUATED",
      edge,
    });
  }
  return Object.freeze({
    declared: true,
    reason: "DECLARED_TOPOLOGY",
    relationEvidenceStatus: "NOT_EVALUATED",
    edge,
  });
}

export const resolveFiscalNotificationDocumentChainEdgeV2 =
  evaluateFiscalNotificationDocumentChainEdgeV2;
