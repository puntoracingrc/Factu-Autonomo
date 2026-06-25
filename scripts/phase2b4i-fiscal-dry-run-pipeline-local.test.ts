import { createClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  runFiscalOperationDryRunPipeline,
  type FiscalOperationDryRunLookupStore,
  type FiscalOperationDryRunPipelineDependencies,
} from "@/lib/fiscal-operation-pipeline";
import {
  SupabaseFiscalOperationProcessingStore,
  SupabaseFiscalOperationTransactionStore,
  type FiscalInvoiceIdentityRecord,
  type FiscalOperationRecord,
  type SupabaseFiscalOperationProcessingClient,
  type SupabaseFiscalOperationTransactionClient,
} from "@/lib/fiscal-operations";
import type { ServerDocumentRecord } from "@/lib/server-documents/types";

const enabled = process.env.PHASE2B4I_LOCAL_ACCEPTANCE === "1";
const maybeDescribe = enabled ? describe.sequential : describe.skip;
const prefix = `phase2b4i_${crypto.randomUUID().replaceAll("-", "_")}`;
const now = "2026-06-25T12:00:00.000Z";
const password = `Phase2B4I-${crypto.randomUUID()}!`;

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing ${name}.`);
  return value;
}

function fail(message: string): never {
  throw new Error(message);
}

function assertLocalUrl(rawUrl: string, label: string): void {
  const parsed = new URL(rawUrl);
  if (!["localhost", "127.0.0.1", "::1"].includes(parsed.hostname)) {
    fail(`${label} must be local. Refusing ${parsed.hostname}.`);
  }
}

function client(url: string, key: string) {
  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

type SupabaseClient = ReturnType<typeof client>;

function rpcAdapter(
  admin: SupabaseClient,
):
  & SupabaseFiscalOperationTransactionClient
  & SupabaseFiscalOperationProcessingClient {
  return {
    rpc(functionName: string, args: Record<string, unknown>) {
      return {
        async single() {
          const { data, error } = await admin.rpc(functionName, args).single();
          return {
            data: (data ?? null) as Record<string, unknown> | null,
            error,
          };
        },
      };
    },
  };
}

function mapServerDocument(row: Record<string, unknown>): Pick<
  ServerDocumentRecord,
  | "id"
  | "userId"
  | "snapshotHash"
  | "pdfContentHash"
  | "issuerNif"
  | "numserie"
  | "issueDate"
> {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    snapshotHash: typeof row.snapshot_hash === "string" ? row.snapshot_hash : null,
    pdfContentHash:
      typeof row.pdf_content_hash === "string" ? row.pdf_content_hash : null,
    issuerNif: typeof row.issuer_nif === "string" ? row.issuer_nif : null,
    numserie: typeof row.numserie === "string" ? row.numserie : null,
    issueDate: typeof row.issue_date === "string" ? row.issue_date : null,
  };
}

function mapIdentity(row: Record<string, unknown>): FiscalInvoiceIdentityRecord {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    serverDocumentId: String(row.server_document_id),
    environment: row.environment === "production" ? "production" : "test",
    issuerNif: String(row.issuer_nif),
    numserie: String(row.numserie),
    fechaExpedicion: String(row.fecha_expedicion),
    createdAt: String(row.created_at),
  };
}

class SupabaseFiscalPipelineLookupStore
  implements FiscalOperationDryRunLookupStore
{
  constructor(private readonly admin: SupabaseClient) {}

  async findServerDocumentForFiscalOperation(
    userId: string,
    serverDocumentId: string,
  ) {
    const { data, error } = await this.admin
      .from("server_documents")
      .select(
        "id, user_id, snapshot_hash, pdf_content_hash, issuer_nif, numserie, issue_date",
      )
      .eq("user_id", userId)
      .eq("id", serverDocumentId)
      .maybeSingle();
    if (error) throw new Error(`find server document failed: ${error.message}`);
    return data ? mapServerDocument(data) : null;
  }

  async findInvoiceIdentityForMaterial(input: {
    operation: FiscalOperationRecord;
    serverDocument: Pick<
      ServerDocumentRecord,
      "userId" | "issuerNif" | "numserie" | "issueDate"
    >;
  }) {
    const { operation, serverDocument } = input;
    const { data, error } = await this.admin
      .from("fiscal_invoice_identities")
      .select(
        "id, user_id, server_document_id, environment, issuer_nif, numserie, fecha_expedicion, created_at",
      )
      .eq("user_id", operation.userId)
      .eq("environment", operation.environment)
      .eq("issuer_nif", serverDocument.issuerNif)
      .eq("numserie", serverDocument.numserie)
      .eq("fecha_expedicion", serverDocument.issueDate)
      .maybeSingle();
    if (error) throw new Error(`find invoice identity failed: ${error.message}`);
    return data ? mapIdentity(data) : null;
  }
}

async function createUser(admin: SupabaseClient) {
  const email = `${prefix}@example.test`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error || !data.user) {
    fail(`Could not create local test user: ${error?.message ?? "unknown"}`);
  }
  return { id: data.user.id, email };
}

async function createServerDocument(
  admin: SupabaseClient,
  userId: string,
  label: string,
) {
  const { data, error } = await admin
    .from("server_documents")
    .insert({
      user_id: userId,
      local_document_id: `${prefix}_${label}_local_document`,
      document_type: "factura",
      document_kind: "standard",
      document_lifecycle: "issued",
      integrity_lock: "locked",
      status_legacy: "enviado",
      version: 9,
      payload: { source: "phase2b4i-redacted" },
      document_snapshot: { source: "phase2b4i-redacted" },
      pdf_snapshot: { source: "phase2b4i-redacted" },
      snapshot_hash: `fnv1a32:${label}`,
      pdf_content_hash: `fnv1a32:${label}_pdf`,
      issuer_nif: "B12345678",
      numserie: `${prefix.toUpperCase()}-${label}`,
      issue_date: "2026-06-25",
      issued_at: now,
    })
    .select("id, user_id, version")
    .single();
  if (error || !data) {
    fail(`Could not create local server document: ${error?.message ?? "unknown"}`);
  }
  return data as { id: string; user_id: string; version: number };
}

async function countRows(
  admin: SupabaseClient,
  table: string,
  filters: Record<string, unknown>,
): Promise<number> {
  let query = admin.from(table).select("user_id", { count: "exact", head: true });
  for (const [key, value] of Object.entries(filters)) query = query.eq(key, value);
  const { count, error } = await query;
  if (error) fail(`Could not count ${table}: ${error.message}`);
  return count ?? 0;
}

async function cleanup(admin: SupabaseClient, userId: string | null) {
  if (!userId) return;
  await admin.from("fiscal_operations").delete().eq("user_id", userId);
  await admin.from("fiscal_invoice_identities").delete().eq("user_id", userId);
  await admin.from("server_documents").delete().eq("user_id", userId);
  await admin.auth.admin.deleteUser(userId);
}

function assertSafeResponse(value: unknown): void {
  const serialized = JSON.stringify(value);
  expect(serialized).not.toContain('"payload"');
  expect(serialized).not.toContain('"documentSnapshot"');
  expect(serialized).not.toContain("xml");
  expect(serialized).not.toContain("AEAT");
  expect(serialized.toLowerCase()).not.toContain("token");
  expect(serialized).not.toContain("service_role");
  expect(serialized).not.toContain("fiscal_records");
  expect(serialized).not.toContain("fiscal_chain_state");
  expect(serialized).not.toContain("fiscal_transport_attempts");
  expect(serialized).not.toContain("stack");
}

maybeDescribe("Phase 2B.4I fiscal dry-run pipeline local acceptance", () => {
  let apiUrl = "";
  let anonKey = "";
  let admin: SupabaseClient;
  let dependencies: FiscalOperationDryRunPipelineDependencies;
  let userId: string | null = null;

  beforeAll(async () => {
    apiUrl = requiredEnv("PHASE2B4I_SUPABASE_URL");
    anonKey = requiredEnv("PHASE2B4I_SUPABASE_ANON_KEY");
    const adminKey = requiredEnv("PHASE2B4I_SUPABASE_ADMIN_KEY");
    assertLocalUrl(apiUrl, "Supabase API URL");

    admin = client(apiUrl, adminKey);
    const rpc = rpcAdapter(admin);
    dependencies = {
      reservationStore: new SupabaseFiscalOperationTransactionStore(rpc),
      processingStore: new SupabaseFiscalOperationProcessingStore(rpc),
      lookupStore: new SupabaseFiscalPipelineLookupStore(admin),
    };

    const user = await createUser(admin);
    userId = user.id;
    const authClient = client(apiUrl, anonKey);
    const { error } = await authClient.auth.signInWithPassword({
      email: user.email,
      password,
    });
    if (error) fail(`Could not sign in local test user: ${error.message}`);
  });

  afterAll(async () => {
    await cleanup(admin, userId);
  });

  it("valida el pipeline dry-run completo contra Supabase local", async () => {
    if (!userId) fail("Missing local test user.");
    const document = await createServerDocument(admin, userId, "DOC_A");
    const baseInput = {
      userId,
      serverDocumentId: document.id,
      operationType: "alta_inicial",
      environment: "test",
      expectedDocumentVersion: document.version,
      idempotencyKey: `${prefix}_alta_inicial`,
      requestedBy: userId,
      requestedAt: now,
      processingAt: now,
      materialCreatedAt: now,
    };

    const initial = await runFiscalOperationDryRunPipeline(
      baseInput,
      dependencies,
    );
    expect(initial.status).toBe("material_built");
    if (initial.status !== "material_built") fail("Expected material_built.");
    expect(initial).toMatchObject({
      reservation: "reserved",
      processing: "processing",
      dryRun: true,
      operationType: "alta_inicial",
      material: {
        dryRun: true,
        finality: "preliminary_not_aeat",
        schemaVersionCandidate: "phase2b4g-dry-run-v1",
      },
    });
    assertSafeResponse(initial);

    const repeated = await runFiscalOperationDryRunPipeline(
      baseInput,
      dependencies,
    );
    expect(repeated.status).toBe("material_built");
    if (repeated.status !== "material_built") fail("Expected material_built.");
    expect(repeated.reservation).toBe("existing");
    expect(repeated.processing).toBe("existing_processing");
    expect(repeated.operationId).toBe(initial.operationId);
    assertSafeResponse(repeated);

    const conflict = await runFiscalOperationDryRunPipeline(
      {
        ...baseInput,
        expectedDocumentVersion: document.version - 1,
        idempotencyKey: `${prefix}_version_conflict`,
      },
      dependencies,
    );
    expect(conflict).toMatchObject({
      status: "conflict",
      reason: "document_version_conflict",
      dryRun: true,
    });
    assertSafeResponse(conflict);

    const subsanacion = await runFiscalOperationDryRunPipeline(
      {
        ...baseInput,
        operationType: "alta_subsanacion",
        idempotencyKey: `${prefix}_alta_subsanacion`,
      },
      dependencies,
    );
    expect(subsanacion.status).toBe("material_built");
    if (subsanacion.status !== "material_built") {
      fail("Expected alta_subsanacion material_built.");
    }
    expect(subsanacion.operationType).toBe("alta_subsanacion");

    const anulacion = await runFiscalOperationDryRunPipeline(
      {
        ...baseInput,
        operationType: "anulacion",
        idempotencyKey: `${prefix}_anulacion`,
      },
      dependencies,
    );
    expect(anulacion.status).toBe("material_built");
    if (anulacion.status !== "material_built") {
      fail("Expected anulacion material_built.");
    }
    expect(anulacion.operationType).toBe("anulacion");

    const operationCount = await countRows(admin, "fiscal_operations", {
      user_id: userId,
    });
    const identityCount = await countRows(admin, "fiscal_invoice_identities", {
      user_id: userId,
    });
    const recordCount = await countRows(admin, "fiscal_records", {
      user_id: userId,
    });
    const chainCount = await countRows(admin, "fiscal_chain_state", {
      user_id: userId,
    });
    const transportCount = await countRows(admin, "fiscal_transport_attempts", {
      user_id: userId,
    });

    expect(operationCount).toBe(3);
    expect(identityCount).toBe(1);
    expect(recordCount).toBe(0);
    expect(chainCount).toBe(0);
    expect(transportCount).toBe(0);
  });
});
