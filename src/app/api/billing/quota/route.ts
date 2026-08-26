import { NextResponse } from "next/server";
import { getUserFromBearer } from "@/lib/billing/server-auth";
import {
  commitBillingQuotaServer,
  getBillingQuotaSnapshotServer,
  removeBillingQuotaSubjectServer,
  reconcileBillingQuotaServer,
  releaseBillingQuotaServer,
  reserveBillingQuotaServer,
  resolveServerBillingPlan,
} from "@/lib/billing/quota-server";
import {
  BILLING_QUOTA_METRICS,
  type BillingQuotaMetric,
  type BillingQuotaReconciliationInput,
  type BillingQuotaSource,
} from "@/lib/billing/quotas";
import {
  checkRateLimit,
  rateLimitExceededResponse,
} from "@/lib/server/rate-limit";
import { readJsonBody } from "@/lib/server/request-body";

const MAX_RECONCILIATION_SUBJECTS = 10000;
const MAX_QUOTA_REQUEST_BYTES = 12 * 1024 * 1024;

function isMetric(value: unknown): value is BillingQuotaMetric {
  return (
    typeof value === "string" &&
    BILLING_QUOTA_METRICS.includes(value as BillingQuotaMetric)
  );
}

function isSource(value: unknown): value is BillingQuotaSource {
  return (
    value === "app" ||
    value === "reconcile" ||
    value === "automatic_customer" ||
    value === "automatic_supplier"
  );
}

function validKey(value: unknown, maxLength: number): value is string {
  return (
    typeof value === "string" &&
    value.length >= 1 &&
    value.length <= maxLength
  );
}

function subjectArray(value: unknown): string[] | null {
  if (!Array.isArray(value) || value.length > MAX_RECONCILIATION_SUBJECTS) {
    return null;
  }
  const result = [...new Set(value)];
  return result.every((item) => validKey(item, 200))
    ? (result as string[])
    : null;
}

function reconciliationInput(value: unknown): BillingQuotaReconciliationInput | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const documents = subjectArray(record.documents);
  const manualExpenses = subjectArray(record.manualExpenses);
  const customers = subjectArray(record.customers);
  const suppliers = subjectArray(record.suppliers);
  const products = subjectArray(record.products);
  if (!documents || !manualExpenses || !customers || !suppliers || !products) {
    return null;
  }
  return { documents, manualExpenses, customers, suppliers, products };
}

async function authenticatedUser(request: Request) {
  return getUserFromBearer(request.headers.get("authorization"), {
    requireEmailConfirmed: true,
  });
}

export async function GET(request: Request) {
  const user = await authenticatedUser(request);
  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const rateLimit = await checkRateLimit(
    request,
    { namespace: "billing_quota_read", limit: 120, windowMs: 10 * 60_000 },
    user.id,
  );
  if (!rateLimit.allowed) return rateLimitExceededResponse(rateLimit);
  try {
    const plan = await resolveServerBillingPlan(user.id);
    const snapshot = await getBillingQuotaSnapshotServer(user.id, plan);
    return NextResponse.json({ snapshot });
  } catch {
    return NextResponse.json(
      { error: "No se pudo consultar el uso del plan" },
      { status: 503 },
    );
  }
}

export async function POST(request: Request) {
  const user = await authenticatedUser(request);
  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const rateLimit = await checkRateLimit(
    request,
    { namespace: "billing_quota_write", limit: 180, windowMs: 10 * 60_000 },
    user.id,
  );
  if (!rateLimit.allowed) return rateLimitExceededResponse(rateLimit);
  const parsedBody = await readJsonBody<Record<string, unknown>>(request, {
    maxBytes: MAX_QUOTA_REQUEST_BYTES,
    invalidMessage: "Solicitud inválida",
    tooLargeMessage: "La conciliación de uso es demasiado grande.",
  });
  if (!parsedBody.ok) return parsedBody.response;
  const body = parsedBody.data;
  if (!body || typeof body.action !== "string") {
    return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 });
  }

  try {
    const plan = await resolveServerBillingPlan(user.id);
    if (body.action === "reserve") {
      if (
        !isMetric(body.metric) ||
        !validKey(body.operationKey, 240) ||
        (body.subjectId !== undefined && !validKey(body.subjectId, 200)) ||
        (body.source !== undefined && !isSource(body.source))
      ) {
        return NextResponse.json({ error: "Reserva inválida" }, { status: 400 });
      }
      const result = await reserveBillingQuotaServer({
        userId: user.id,
        plan,
        metric: body.metric,
        operationKey: body.operationKey,
        subjectId:
          typeof body.subjectId === "string" ? body.subjectId : undefined,
        source: isSource(body.source) ? body.source : "app",
      });
      return NextResponse.json(result, { status: result.allowed ? 200 : 409 });
    }

    if (body.action === "commit") {
      if (!validKey(body.claimId, 64) || !validKey(body.subjectId, 200)) {
        return NextResponse.json({ error: "Confirmación inválida" }, { status: 400 });
      }
      await commitBillingQuotaServer({
        userId: user.id,
        claimId: body.claimId,
        subjectId: body.subjectId,
      });
      const snapshot = await getBillingQuotaSnapshotServer(user.id, plan);
      return NextResponse.json({ ok: true, snapshot });
    }

    if (body.action === "release") {
      if (!validKey(body.claimId, 64)) {
        return NextResponse.json({ error: "Liberación inválida" }, { status: 400 });
      }
      await releaseBillingQuotaServer({ userId: user.id, claimId: body.claimId });
      const snapshot = await getBillingQuotaSnapshotServer(user.id, plan);
      return NextResponse.json({ ok: true, snapshot });
    }

    if (body.action === "remove_subject") {
      if (
        (body.metric !== "customers" &&
          body.metric !== "suppliers" &&
          body.metric !== "products") ||
        !validKey(body.subjectId, 200)
      ) {
        return NextResponse.json(
          { error: "Eliminación de cupo inválida" },
          { status: 400 },
        );
      }
      await removeBillingQuotaSubjectServer({
        userId: user.id,
        metric: body.metric,
        subjectId: body.subjectId,
      });
      const snapshot = await getBillingQuotaSnapshotServer(user.id, plan);
      return NextResponse.json({ ok: true, snapshot });
    }

    if (body.action === "reconcile") {
      const claims = reconciliationInput(body.claims);
      if (!claims) {
        return NextResponse.json(
          { error: "Reconciliación inválida" },
          { status: 400 },
        );
      }
      const snapshot = await reconcileBillingQuotaServer({
        userId: user.id,
        plan,
        claims,
      });
      return NextResponse.json({ ok: true, snapshot });
    }

    return NextResponse.json({ error: "Acción desconocida" }, { status: 400 });
  } catch {
    return NextResponse.json(
      { error: "No se pudo registrar el uso del plan" },
      { status: 503 },
    );
  }
}
