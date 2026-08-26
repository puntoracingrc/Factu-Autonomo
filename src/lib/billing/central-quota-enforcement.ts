import type {
  CentralBusinessEntityType,
  CentralBusinessJson,
  CentralBusinessOperationKind,
} from "@/lib/central-business-authority/mutation-command";
import type { CentralBusinessNumberedDocumentEntityType } from "@/lib/central-business-authority/numbered-document-command";
import type { CentralInvoiceAuthorityIssueKind } from "@/lib/central-invoice-authority/issue-command";

import {
  commitBillingQuotaServer,
  releaseBillingQuotaServer,
  removeBillingQuotaSubjectServer,
  reserveBillingQuotaServer,
  resolveServerBillingPlan,
} from "./quota-server";
import type {
  BillingQuotaBlock,
  BillingQuotaMetric,
  BillingQuotaSource,
} from "./quotas";

export interface CentralQuotaReservation {
  claimId: string;
  metric: BillingQuotaMetric;
  subjectId: string;
}

export type CentralQuotaDecision =
  | { allowed: true; reservations: CentralQuotaReservation[] }
  | { allowed: false; block: BillingQuotaBlock };

interface CentralBusinessQuotaMutation {
  operationKind: CentralBusinessOperationKind;
  entityType: CentralBusinessEntityType;
  entityId: string;
  expectedVersion: number;
  payload: CentralBusinessJson | null;
}

const EMPTY_DECISION: CentralQuotaDecision = {
  allowed: true,
  reservations: [],
};

function jsonRecord(
  value: CentralBusinessJson | null,
): Record<string, CentralBusinessJson> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value
    : null;
}

function quotaForBusinessCreation(
  mutation: CentralBusinessQuotaMutation,
): {
  metric: BillingQuotaMetric;
  operationKey: string;
  source: BillingQuotaSource;
} | null {
  if (mutation.operationKind !== "upsert") return null;
  const createsEntity = mutation.expectedVersion === 0;
  if (mutation.entityType === "customer") {
    if (!createsEntity) return null;
    return {
      metric: "customers",
      operationKey: `customer:${mutation.entityId}`,
      source: "app",
    };
  }
  if (mutation.entityType === "supplier") {
    if (!createsEntity) return null;
    return {
      metric: "suppliers",
      operationKey: `supplier:${mutation.entityId}`,
      source: "automatic_supplier",
    };
  }
  if (mutation.entityType === "product") {
    const payload = jsonRecord(mutation.payload);
    if (payload?.hidden === true) return null;
    if (!createsEntity && payload?.hidden !== false) return null;
    return {
      metric: "products",
      operationKey: `product:${mutation.entityId}`,
      source: "app",
    };
  }
  if (mutation.entityType === "expense") {
    if (!createsEntity) return null;
    const payload = jsonRecord(mutation.payload);
    if (payload?.origin !== "manual") return null;
    return {
      metric: "manual_expenses",
      operationKey: `manual-expense:${mutation.entityId}`,
      source: "app",
    };
  }
  return null;
}

async function reserveCentralQuota(input: {
  userId: string;
  metric: BillingQuotaMetric;
  operationKey: string;
  subjectId: string;
  source: BillingQuotaSource;
}): Promise<CentralQuotaDecision> {
  const plan = await resolveServerBillingPlan(input.userId);
  if (plan !== "free") return EMPTY_DECISION;
  const result = await reserveBillingQuotaServer({
    userId: input.userId,
    plan,
    metric: input.metric,
    operationKey: input.operationKey,
    subjectId: input.subjectId,
    source: input.source,
  });
  if (!result.allowed) return result;
  return {
    allowed: true,
    reservations: result.claimId
      ? [
          {
            claimId: result.claimId,
            metric: input.metric,
            subjectId: input.subjectId,
          },
        ]
      : [],
  };
}

export async function reserveCentralBusinessMutationQuota(input: {
  userId: string;
  mutation: CentralBusinessQuotaMutation;
}): Promise<CentralQuotaDecision> {
  const quota = quotaForBusinessCreation(input.mutation);
  if (!quota) return EMPTY_DECISION;
  return reserveCentralQuota({
    userId: input.userId,
    subjectId: input.mutation.entityId,
    ...quota,
  });
}

export async function reserveCentralBusinessBatchQuota(input: {
  userId: string;
  mutations: CentralBusinessQuotaMutation[];
}): Promise<CentralQuotaDecision> {
  const reservations: CentralQuotaReservation[] = [];
  for (const mutation of input.mutations) {
    let decision: CentralQuotaDecision;
    try {
      decision = await reserveCentralBusinessMutationQuota({
        userId: input.userId,
        mutation,
      });
    } catch (error) {
      await releaseCentralQuotaReservations({
        userId: input.userId,
        reservations,
      });
      throw error;
    }
    if (!decision.allowed) {
      await releaseCentralQuotaReservations({
        userId: input.userId,
        reservations,
      });
      return decision;
    }
    reservations.push(...decision.reservations);
  }
  return { allowed: true, reservations };
}

export async function reserveCentralNumberedDocumentQuota(input: {
  userId: string;
  action: "create" | "reconcile_series";
  entityType: CentralBusinessNumberedDocumentEntityType;
  entityId?: string;
  payloadWithoutNumber?: CentralBusinessJson;
}): Promise<CentralQuotaDecision> {
  if (input.action !== "create" || !input.entityId) return EMPTY_DECISION;
  const payload = jsonRecord(input.payloadWithoutNumber ?? null);
  if (payload?.status === "borrador") return EMPTY_DECISION;
  if (
    input.entityType === "receipt" &&
    typeof payload?.sourceDocumentId === "string" &&
    payload.sourceDocumentId.trim()
  ) {
    return EMPTY_DECISION;
  }
  return reserveCentralQuota({
    userId: input.userId,
    metric: "documents",
    operationKey: `document:${input.entityId}:definitive`,
    subjectId: input.entityId,
    source: "app",
  });
}

export async function reserveCentralInvoiceQuota(input: {
  userId: string;
  kind: CentralInvoiceAuthorityIssueKind;
  localDocumentId: string;
}): Promise<CentralQuotaDecision> {
  if (input.kind === "rectification") return EMPTY_DECISION;
  return reserveCentralQuota({
    userId: input.userId,
    metric: "documents",
    operationKey: `document:${input.localDocumentId}:definitive`,
    subjectId: input.localDocumentId,
    source: "app",
  });
}

export async function commitCentralQuotaReservations(input: {
  userId: string;
  reservations: CentralQuotaReservation[];
}): Promise<void> {
  for (const reservation of input.reservations) {
    await commitBillingQuotaServer({
      userId: input.userId,
      claimId: reservation.claimId,
      subjectId: reservation.subjectId,
    });
  }
}

export async function releaseCentralQuotaReservations(input: {
  userId: string;
  reservations: CentralQuotaReservation[];
}): Promise<void> {
  await Promise.allSettled(
    input.reservations.map((reservation) =>
      releaseBillingQuotaServer({
        userId: input.userId,
        claimId: reservation.claimId,
      }),
    ),
  );
}

export async function releaseDeletedCentralBusinessQuota(input: {
  userId: string;
  mutation: Pick<
    CentralBusinessQuotaMutation,
    "operationKind" | "entityType" | "entityId" | "payload"
  >;
}): Promise<void> {
  const payload = jsonRecord(input.mutation.payload);
  const archivesProduct =
    input.mutation.operationKind === "upsert" &&
    input.mutation.entityType === "product" &&
    payload?.hidden === true;
  if (input.mutation.operationKind !== "delete" && !archivesProduct) return;
  const metric =
    input.mutation.entityType === "customer"
      ? "customers"
      : input.mutation.entityType === "supplier"
        ? "suppliers"
        : input.mutation.entityType === "product"
          ? "products"
          : null;
  if (!metric) return;
  await removeBillingQuotaSubjectServer({
    userId: input.userId,
    metric,
    subjectId: input.mutation.entityId,
  });
}
