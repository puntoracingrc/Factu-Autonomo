import { execFileSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { beforeAll, afterAll, describe, expect, it } from "vitest";
import { buildCentralInvoiceAuthorityDocumentFormIssueRequest } from "./document-form-canary";
import { buildAmendedCentralInvoice, invoiceAmendmentPatch } from "./amendment";
import { applyCentralInvoiceAuthorityPulledEventsToDocuments } from "./events-local-apply";
import { listCentralInvoiceAuthorityEventsThroughRpc } from "./events-rpc-adapter";
import { DEFAULT_PROFILE, EMPTY_DATA, type Document } from "@/lib/types";
import {
  buildCentralManualReceiptPayloadWithoutNumber,
  materializeCentralBusinessReceipt,
} from "@/lib/central-business-authority/central-receipt-materialization";

const enabled = process.env.CENTRAL_GLOBAL_SYNTHETIC_LOCAL_ENABLED === "true";
const acceptance = enabled ? describe : describe.skip;
const profile = {
  ...DEFAULT_PROFILE,
  name: "Empresa de prueba",
  nif: "B12345678",
  address: "Calle Uno 1",
  city: "Barcelona",
  postalCode: "08001",
};
const now = "2026-10-07T10:00:00.000Z";
let admin: SupabaseClient;
let anon: SupabaseClient;
let owner = "";
let other = "";
let dbUrl = "";
let seq = 0;
function mutateBusinessBatch(...commands: Record<string, unknown>[]) {
  const first = commands[0];
  return admin.rpc("mutate_central_business_batch_v1", {
    p_user_id: first.p_user_id,
    p_device_id: first.p_device_id,
    p_session_hash: first.p_session_hash,
    p_operations: commands.map((command, operationIndex) => ({
      operationIndex,
      idempotencyKeyHash: command.p_idempotency_key_hash,
      requestHash: command.p_request_hash,
      operationKind: command.p_operation_kind,
      entityType: command.p_entity_type,
      entityId: command.p_entity_id,
      expectedVersion: command.p_expected_version,
      payload: command.p_payload,
      contentHash: command.p_content_hash,
    })),
  });
}
async function issue(
  userId: string,
  series = "SYN-2026",
  savedDraft?: { id: string; version: number },
) {
  const digest = createHash("sha256")
    .update(`${userId}:${series}:baseline`)
    .digest("hex");
  const baseline = await admin.rpc("reconcile_central_invoice_series_v1", {
    p_user_id: userId,
    p_device_id: "synthetic-device",
    p_session_hash: "synthetic-session",
    p_idempotency_key_hash: digest,
    p_request_hash: digest,
    p_environment: "test",
    p_issuer_nif: profile.nif,
    p_series_code: series,
    p_fiscal_year: 2026,
    p_observed_max_sequence: 0,
    p_source_document_count: 0,
    p_source_digest: `sha256:${digest}`,
  });
  expect(baseline.error).toBeNull();
  const form = buildCentralInvoiceAuthorityDocumentFormIssueRequest({
    localDocumentId: savedDraft?.id ?? randomUUID(),
    profile,
    issuedAt: now,
    payload: {
      type: "factura",
      date: "2026-10-07",
      status: "enviado",
      centralBusinessDraftVersion: savedDraft?.version,
      client: {
        name: "Inquilina de prueba",
        nif: "12345678Z",
        address: "Calle Dos 2",
        city: "Barcelona",
        postalCode: "08002",
      },
      items: [
        {
          id: randomUUID(),
          description: "Servicio de prueba",
          quantity: 1,
          unitPrice: 100,
          ivaPercent: 21,
        },
      ],
    },
  });
  const { data, error } = await admin.rpc("issue_central_invoice_v1", {
    p_user_id: userId,
    p_device_id: "synthetic-device",
    p_session_hash: "synthetic-session",
    p_idempotency_key_hash: form.idempotencyKey,
    p_request_hash: form.idempotencyKey,
    p_kind: "invoice",
    p_local_document_id: form.draft.localDocumentId,
    p_expected_version: 0,
    p_draft_hash: form.draft.draftHash,
    p_environment: "test",
    p_issuer_nif: profile.nif,
    p_series_code: series,
    p_fiscal_year: 2026,
    p_issued_at: now,
    p_document_payload: form.documentPayload,
    p_emitted_snapshot: form.emittedSnapshot,
    p_emitted_hash: form.emittedHash,
    p_rectifies_identity_id: null,
  });
  expect(error).toBeNull();
  return { ...data[0], localId: form.draft.localDocumentId };
}
async function events(userId: string) {
  return listCentralInvoiceAuthorityEventsThroughRpc(
    {
      rpc: async (name, args) => {
        const { data, error } = await admin.rpc(name, args);
        return { data, error };
      },
    },
    { userId, deviceId: "synthetic-mobile", limit: 100 },
  );
}
function args(
  row: Awaited<ReturnType<typeof issue>>,
  action: "update" | "delete",
  version = row.document_version,
  userId = owner,
) {
  const key = `management:${++seq}`;
  return {
    p_user_id: userId,
    p_device_id: "synthetic-device",
    p_session_hash: "synthetic-session",
    p_idempotency_key_hash: key,
    p_request_hash: key,
    p_document_id: row.document_id,
    p_identity_id: row.identity_id,
    p_expected_version: version,
    p_action: action,
    p_document_payload: null as unknown,
    p_emitted_snapshot: null as unknown,
  };
}
acceptance(
  "invoice management PostgreSQL acceptance (synthetic localhost only)",
  { timeout: 60_000 },
  () => {
    beforeAll(async () => {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      dbUrl =
        process.env.CENTRAL_GLOBAL_SYNTHETIC_DATABASE_URL ??
        process.env.PHASE1_ACCEPTANCE_DATABASE_URL ??
        "";
      for (const value of [url, dbUrl]) {
        if (
          !["127.0.0.1", "localhost", "::1"].includes(new URL(value).hostname)
        )
          throw new Error("Synthetic acceptance must use localhost.");
      }
      admin = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
        auth: { persistSession: false },
      });
      anon = createClient(url, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
        auth: { persistSession: false },
      });
      for (const target of ["owner", "other"]) {
        const result = await admin.auth.admin.createUser({
          email: `invoice-management-${target}-${randomUUID()}@example.test`,
          email_confirm: true,
        });
        if (result.error || !result.data.user) throw result.error;
        if (target === "owner") owner = result.data.user.id;
        else other = result.data.user.id;
      }
    });
    afterAll(async () => {
      const users = [owner, other].filter(Boolean);
      if (users.length && dbUrl) {
        const ids = users.map((id) => `'${id}'::uuid`).join(",");
        execFileSync(
          "psql",
          [
            dbUrl,
            "-X",
            "-v",
            "ON_ERROR_STOP=1",
            "-c",
            `begin;
        set local session_replication_role = replica;
        delete from public.central_business_outbox where user_id in (${ids});
        delete from public.central_business_commands where user_id in (${ids});
        delete from public.central_business_entities where user_id in (${ids});
        delete from public.central_invoice_event_wakeups where user_id in (${ids});
        delete from public.central_invoice_outbox where user_id in (${ids});
        delete from public.central_invoice_commands where user_id in (${ids});
        delete from public.central_invoice_document_versions where user_id in (${ids});
        delete from public.central_invoice_identities where user_id in (${ids});
        delete from public.central_invoice_documents where user_id in (${ids});
        delete from public.central_invoice_series_reconciliations where user_id in (${ids});
        delete from public.central_invoice_series_state where user_id in (${ids});
        set local session_replication_role = origin; commit;`,
          ],
          { stdio: "pipe" },
        );
        for (const id of users) await admin.auth.admin.deleteUser(id);
      }
    });
    it("corrects the customer, rejects stale edits and other companies, and propagates the new PDF", async () => {
      const row = await issue(owner, "EDIT-SYN");
      const stored = await admin
        .from("central_invoice_documents")
        .select("current_payload,emitted_snapshot")
        .eq("id", row.document_id)
        .single();
      expect(stored.error).toBeNull();
      const current = stored.data!.current_payload.document as Document;
      const amended = buildAmendedCentralInvoice({
        current,
        originalSnapshot: stored.data!.emitted_snapshot,
        profile,
        patch: {
          ...invoiceAmendmentPatch(current),
          client: { ...current.client, name: "Propietaria de prueba" },
        },
        fiscalYear: 2026,
        issuedAt: now,
        now,
      });
      const command = {
        ...args(row, "update"),
        p_document_payload: {
          ...stored.data!.current_payload,
          document: amended,
        },
        p_emitted_snapshot: amended.documentSnapshot,
      };
      const result = await admin.rpc("manage_central_invoice_v1", command);
      expect(result.error).toBeNull();
      expect(result.data[0].document_version).toBe(2);
      const replay = await admin.rpc("manage_central_invoice_v1", command);
      expect(replay.error).toBeNull();
      expect(replay.data[0].result_status).toBe("replayed");
      expect(
        (await admin.rpc("manage_central_invoice_v1", args(row, "update", 1)))
          .error?.code,
      ).toBe("P4103");
      expect(
        (
          await admin.rpc(
            "manage_central_invoice_v1",
            args(row, "delete", 2, other),
          )
        ).error?.code,
      ).toBe("P4104");
      expect(
        (await anon.rpc("manage_central_invoice_v1", command)).error,
      ).not.toBeNull();
      const mobile = applyCentralInvoiceAuthorityPulledEventsToDocuments({
        documents: [],
        profile,
        events: await events(owner),
      });
      expect(mobile.conflicts).toEqual([]);
      expect(
        mobile.documents.find((doc) => doc.id === row.localId)?.documentSnapshot
          ?.customer.name,
      ).toBe("Propietaria de prueba");
      const changedKey = { ...command, p_request_hash: "different-content" };
      expect(
        (await admin.rpc("manage_central_invoice_v1", changedKey)).error?.code,
      ).toBe("P4102");
    });
    it("reuses an explicitly deleted number without races, renumbering or cross-company leakage", async () => {
      const first = await issue(owner);
      const second = await issue(owner);
      const untouchedOther = await issue(other);
      const mobileBefore = applyCentralInvoiceAuthorityPulledEventsToDocuments({
        documents: [],
        profile,
        events: await events(owner),
      });
      const command = args(first, "delete");
      const deleted = await admin.rpc("manage_central_invoice_v1", command);
      expect(deleted.error).toBeNull();
      expect(
        (await admin.rpc("manage_central_invoice_v1", command)).data[0]
          .result_status,
      ).toBe("replayed");
      const stored = await admin
        .from("central_invoice_documents")
        .select("current_payload,emitted_snapshot,lifecycle_status")
        .eq("id", first.document_id)
        .single();
      expect(stored.data).toMatchObject({
        lifecycle_status: "retired",
        emitted_snapshot: null,
        current_payload: { deleted: true, localDocumentId: first.localId },
      });
      expect(Object.keys(stored.data!.current_payload).sort()).toEqual([
        "deleted",
        "localDocumentId",
      ]);
      const concurrent = await Promise.all([issue(owner), issue(owner)]);
      expect(concurrent.map((item) => item.sequence).sort()).toEqual([1, 3]);
      expect(
        concurrent.find((item) => item.sequence === 1)!.identity_id,
      ).not.toBe(first.identity_id);
      expect(
        concurrent.find((item) => item.sequence === 1)!.document_id,
      ).not.toBe(first.document_id);
      expect(
        (
          await admin
            .from("central_invoice_identities")
            .select("full_number")
            .eq("id", second.identity_id)
            .single()
        ).data!.full_number,
      ).toBe(second.full_number);
      expect(
        (
          await admin
            .from("central_invoice_identities")
            .select("released_at")
            .eq("id", untouchedOther.identity_id)
            .single()
        ).data!.released_at,
      ).toBeNull();
      const after = applyCentralInvoiceAuthorityPulledEventsToDocuments({
        documents: mobileBefore.documents,
        profile,
        events: await events(owner),
      });
      expect(after.conflicts).toEqual([]);
      expect(after.documents.some((doc) => doc.id === first.localId)).toBe(
        false,
      );
      expect(
        after.documents.filter((doc) => doc.number === first.full_number),
      ).toHaveLength(1);
    });
    it("deletes a sent receipt centrally and unlinks its paid invoice without changing fiscal content", async () => {
      const row = await issue(owner, "RECEIPT-SYN");
      const receiptId = randomUUID();
      const receiptHash = createHash("sha256").update(receiptId).digest("hex");
      const deletionHash = createHash("sha256")
        .update(`delete:${receiptId}`)
        .digest("hex");
      const stored = await admin
        .from("central_invoice_documents")
        .select("current_payload,emitted_snapshot")
        .eq("id", row.document_id)
        .single();
      const paid = {
        ...stored.data!.current_payload.document,
        status: "pagado",
        paymentStatus: "paid",
        paidAt: now,
        receiptDocumentId: receiptId,
      };
      const collection = await admin.rpc(
        "update_central_invoice_collection_v1",
        {
          p_user_id: owner,
          p_device_id: "synthetic-device",
          p_session_hash: "synthetic-session",
          p_idempotency_key_hash: `paid:${receiptId}`,
          p_request_hash: `paid:${receiptId}`,
          p_document_id: row.document_id,
          p_identity_id: row.identity_id,
          p_expected_version: row.document_version,
          p_status: "pagado",
          p_payment_status: "paid",
          p_paid_at: now,
          p_document_payload: {
            ...stored.data!.current_payload,
            document: paid,
          },
        },
      );
      expect(collection.error).toBeNull();
      const receiptArgs = {
        p_user_id: owner,
        p_device_id: "synthetic-device",
        p_session_hash: "synthetic-session",
        p_idempotency_key_hash: receiptHash,
        p_request_hash: receiptHash,
        p_entity_type: "receipt",
        p_entity_id: receiptId,
        p_expected_version: 0,
        p_operation_kind: "upsert",
        p_content_hash: receiptHash,
        p_payload: {
          ...paid,
          id: receiptId,
          type: "recibo",
          sourceDocumentId: row.localId,
          number: "R-SYN-1",
          deliveryStatus: "sent",
          sentAt: now,
        },
      };
      const template = "R-SYN-{year}-{num}";
      expect(
        (
          await admin.rpc("reconcile_central_business_document_series_v1", {
            p_user_id: owner,
            p_device_id: "synthetic-device",
            p_session_hash: "synthetic-session",
            p_idempotency_key_hash: receiptHash,
            p_request_hash: receiptHash,
            p_entity_type: "receipt",
            p_number_template: template,
            p_fiscal_year: 2026,
            p_observed_max_sequence: 0,
            p_source_document_count: 0,
            p_source_digest: `sha256:${receiptHash}`,
          })
        ).error,
      ).toBeNull();
      const receiptPayload: Record<string, unknown> = {
        ...receiptArgs.p_payload,
      };
      delete receiptPayload.number;
      expect(
        (
          await admin.rpc("create_central_business_document_v1", {
            p_user_id: owner,
            p_device_id: "synthetic-device",
            p_session_hash: "synthetic-session",
            p_idempotency_key_hash: receiptArgs.p_idempotency_key_hash,
            p_request_hash: receiptArgs.p_request_hash,
            p_entity_type: "receipt",
            p_entity_id: receiptId,
            p_number_template: template,
            p_padding: 4,
            p_fiscal_year: 2026,
            p_payload_without_number: receiptPayload,
          })
        ).error,
      ).toBeNull();
      expect(
        (await admin.rpc("manage_central_invoice_v1", args(row, "delete", 2)))
          .error?.code,
      ).toBe("P4141");
      const deletion = {
        ...receiptArgs,
        p_idempotency_key_hash: deletionHash,
        p_request_hash: deletionHash,
        p_expected_version: 1,
        p_operation_kind: "delete",
        p_payload: null,
        p_content_hash: createHash("sha256").update("null").digest("hex"),
      };
      expect(
        (await admin.rpc("mutate_central_business_entity_v1", deletion)).error,
      ).toBeNull();
      const invoiceAfter = await admin
        .from("central_invoice_documents")
        .select("current_payload,emitted_snapshot,current_version")
        .eq("id", row.document_id)
        .single();
      expect(
        invoiceAfter.data!.current_payload.document.receiptDocumentId,
      ).toBeUndefined();
      expect(invoiceAfter.data!.current_payload.document).toMatchObject({
        status: "pagado",
        paymentStatus: "paid",
        paidAt: now,
      });
      expect(invoiceAfter.data!.emitted_snapshot).toEqual(
        stored.data!.emitted_snapshot,
      );
      expect(invoiceAfter.data!.current_version).toBe(3);
      const pull = await events(owner);
      expect(
        pull.some(
          (item) =>
            item.documentId === row.document_id &&
            (item.safeSummary as Record<string, unknown>).relationship ===
              "receipt_deleted",
        ),
      ).toBe(true);
      expect(
        (await admin.rpc("manage_central_invoice_v1", args(row, "delete", 2)))
          .error?.code,
      ).toBe("P4103");
      expect(
        (await admin.rpc("manage_central_invoice_v1", args(row, "delete", 3)))
          .error,
      ).toBeNull();
      const freshDevice = await admin.rpc("list_central_business_events_v1", {
        p_user_id: owner,
        p_device_id: "synthetic-fresh-device",
        p_after_sequence: 0,
        p_limit: 100,
      });
      expect(freshDevice.error).toBeNull();
      const receiptEvents = freshDevice.data.filter(
        (item: { entity_id: string }) => item.entity_id === receiptId,
      );
      expect(receiptEvents).toHaveLength(2);
      for (const item of receiptEvents)
        expect(item).toMatchObject({
          operation_kind: "delete",
          entity_version: 2,
          payload: null,
          content_hash: deletion.p_content_hash,
        });
    });
    it("edits and deletes quotes through the atomic RPC and rolls back a mixed stale batch", async () => {
      const id = randomUUID();
      const hash = createHash("sha256").update(id).digest("hex");
      const template = "QUOTE-BATCH-SYN-{year}-{num}";
      const context = {
        p_user_id: owner,
        p_device_id: "synthetic-device",
        p_session_hash: "synthetic-session",
      };
      expect(
        (
          await admin.rpc("reconcile_central_business_document_series_v1", {
            ...context,
            p_idempotency_key_hash: hash,
            p_request_hash: hash,
            p_entity_type: "quote",
            p_number_template: template,
            p_fiscal_year: 2026,
            p_observed_max_sequence: 0,
            p_source_document_count: 0,
            p_source_digest: `sha256:${hash}`,
          })
        ).error,
      ).toBeNull();
      expect(
        (
          await admin.rpc("create_central_business_document_v1", {
            ...context,
            p_idempotency_key_hash: hash,
            p_request_hash: hash,
            p_entity_type: "quote",
            p_entity_id: id,
            p_number_template: template,
            p_padding: 4,
            p_fiscal_year: 2026,
            p_payload_without_number: {
              id,
              type: "presupuesto",
              status: "enviado",
              date: "2026-10-07",
              client: { name: "Cliente sintético" },
              items: [],
              createdAt: now,
              updatedAt: now,
            },
          })
        ).error,
      ).toBeNull();
      const stored = await admin
        .from("central_business_entities")
        .select("current_payload")
        .eq("user_id", owner)
        .eq("entity_type", "quote")
        .eq("entity_id", id)
        .single();
      expect(stored.error).toBeNull();
      const command = {
        ...context,
        p_idempotency_key_hash: `edit:${hash}`,
        p_request_hash: `edit:${hash}`,
        p_entity_type: "quote",
        p_entity_id: id,
        p_expected_version: 1,
        p_operation_kind: "upsert",
        p_payload: {
          ...stored.data!.current_payload,
          notes: "Edición compartida",
        },
        p_content_hash: hash,
      };
      const edited = await mutateBusinessBatch(command);
      expect(edited.error).toBeNull();
      expect(edited.data[0]).toMatchObject({
        result_status: "committed",
        entity_version: 2,
      });
      const draftId = randomUUID();
      const mixed = await mutateBusinessBatch(
        {
          ...command,
          p_entity_type: "document_draft",
          p_entity_id: draftId,
          p_expected_version: 0,
          p_idempotency_key_hash: `draft:${hash}`,
          p_request_hash: `draft:${hash}`,
          p_payload: {
            id: draftId,
            type: "factura",
            status: "borrador",
            number: "BORRADOR",
            date: "2026-10-07",
            client: { name: "Cliente sintético" },
            items: [],
            createdAt: now,
            updatedAt: now,
          },
        },
        {
          ...command,
          p_idempotency_key_hash: `stale:${hash}`,
          p_request_hash: `stale:${hash}`,
          p_payload: { ...command.p_payload, notes: "Cambio obsoleto" },
          p_content_hash: createHash("sha256").update(`stale:${id}`).digest("hex"),
        },
      );
      expect(mixed.error?.code).toBe("P4103");
      expect(
        (
          await admin
            .from("central_business_entities")
            .select("entity_id")
            .eq("user_id", owner)
            .eq("entity_id", draftId)
        ).data,
      ).toEqual([]);
      const deleted = await mutateBusinessBatch({
        ...command,
        p_expected_version: 2,
        p_operation_kind: "delete",
        p_payload: null,
        p_idempotency_key_hash: `delete:${hash}`,
        p_request_hash: `delete:${hash}`,
      });
      expect(deleted.error).toBeNull();
      expect(deleted.data[0]).toMatchObject({
        entity_version: 3,
        deleted: true,
      });
    });
    it("promotes a saved manual receipt and shares its delivery without altering its seal", async () => {
      const id = randomUUID();
      const hash = createHash("sha256").update(id).digest("hex");
      const draft = {
        type: "recibo" as const,
        status: "borrador" as const,
        date: "2026-10-07",
        client: {
          name: "Cliente sintético",
          nif: "12345678Z",
          address: "Calle 1",
          postalCode: "08001",
          city: "Barcelona",
        },
        items: [
          {
            id: "line",
            description: "Servicio",
            quantity: 1,
            unitPrice: 100,
            ivaPercent: 21,
          },
        ],
      };
      const mutation = {
        p_user_id: owner,
        p_device_id: "synthetic-device",
        p_session_hash: "synthetic-session",
        p_idempotency_key_hash: `draft:${id}`,
        p_request_hash: `draft:${id}`,
        p_entity_type: "document_draft",
        p_entity_id: id,
        p_expected_version: 0,
        p_operation_kind: "upsert",
        p_payload: {
          ...draft,
          id,
          number: "BORRADOR",
          createdAt: now,
          updatedAt: now,
        },
        p_content_hash: hash,
      };
      expect((await mutateBusinessBatch(mutation)).error).toBeNull();
      const template = "MANUAL-SYN-{year}-{num}";
      expect(
        (
          await admin.rpc("reconcile_central_business_document_series_v1", {
            p_user_id: owner,
            p_device_id: "synthetic-device",
            p_session_hash: "synthetic-session",
            p_idempotency_key_hash: hash,
            p_request_hash: hash,
            p_entity_type: "receipt",
            p_number_template: template,
            p_fiscal_year: 2026,
            p_observed_max_sequence: 0,
            p_source_document_count: 0,
            p_source_digest: `sha256:${hash}`,
          })
        ).error,
      ).toBeNull();
      const issued = await admin.rpc("create_central_business_document_v1", {
        p_user_id: owner,
        p_device_id: "synthetic-device",
        p_session_hash: "synthetic-session",
        p_idempotency_key_hash: hash,
        p_request_hash: hash,
        p_entity_type: "receipt",
        p_entity_id: id,
        p_number_template: template,
        p_padding: 4,
        p_fiscal_year: 2026,
        p_payload_without_number: buildCentralManualReceiptPayloadWithoutNumber(
          { ...draft, status: "pagado", centralBusinessDraftVersion: 1 },
          profile,
          id,
          now,
        ),
      });
      expect(issued.error).toBeNull();
      const stored = await admin
        .from("central_business_entities")
        .select("current_payload")
        .eq("user_id", owner)
        .eq("entity_type", "receipt")
        .eq("entity_id", id)
        .single();
      const raw = stored.data!.current_payload as Document;
      const first = materializeCentralBusinessReceipt({
        data: { ...EMPTY_DATA, profile },
        receiptPayload: raw,
      }).receipt;
      const sent = {
        ...raw,
        centralBusinessReceiptAuthority: {
          ...raw.centralBusinessReceiptAuthority!,
          sentAt: now,
        },
      };
      const delivery = await mutateBusinessBatch({
        ...mutation,
        p_entity_type: "receipt",
        p_expected_version: 1,
        p_idempotency_key_hash: `sent:${id}`,
        p_request_hash: `sent:${id}`,
        p_payload: sent,
        p_content_hash: createHash("sha256").update(`sent:${id}`).digest("hex"),
      });
      expect(delivery.error).toBeNull();
      const fresh = materializeCentralBusinessReceipt({
        data: { ...EMPTY_DATA, profile },
        receiptPayload: sent,
      }).receipt;
      expect(fresh.documentSnapshot).toEqual(first.documentSnapshot);
      expect(fresh.deliveryStatus).toBe("sent");
      const retired = await admin
        .from("central_business_entities")
        .select("deleted,current_version")
        .eq("user_id", owner)
        .eq("entity_type", "document_draft")
        .eq("entity_id", id)
        .single();
      expect(retired.data).toEqual({ deleted: true, current_version: 2 });
    });
    it("shares drafts with CAS and retires them atomically on issuance without consuming numbers on stale versions", async () => {
      const id = randomUUID();
      const payload = {
        id,
        type: "factura",
        number: "BORRADOR",
        status: "borrador",
        date: "2026-10-07",
        client: { name: "Cliente sintético" },
        items: [],
        createdAt: now,
        updatedAt: now,
      };
      const command = (version: number, note: string) => ({
        p_user_id: owner,
        p_device_id: "synthetic-device",
        p_session_hash: "synthetic-session",
        p_idempotency_key_hash: `draft:${id}:${version}:${note}`,
        p_request_hash: `draft:${id}:${version}:${note}`,
        p_entity_type: "document_draft",
        p_entity_id: id,
        p_expected_version: version,
        p_operation_kind: "upsert",
        p_payload: { ...payload, notes: note },
        p_content_hash: createHash("sha256").update(note).digest("hex"),
      });
      const first = await mutateBusinessBatch(command(0, "primero"));
      expect(first.error).toBeNull();
      expect(
        (await mutateBusinessBatch(command(0, "primero"))).data[0]
          .result_status,
      ).toBe("replayed");
      expect((await mutateBusinessBatch(command(1, "socio"))).error).toBeNull();
      expect(
        (await mutateBusinessBatch(command(1, "obsoleto"))).error?.code,
      ).toBe("P4103");
      await expect(
        issue(owner, "SHARED-DRAFT-SYN", { id, version: 1 }),
      ).rejects.toThrow();
      expect(
        (
          await admin
            .from("central_invoice_documents")
            .select("id")
            .eq("user_id", owner)
            .eq("local_document_id", id)
        ).data,
      ).toEqual([]);
      const issued = await issue(owner, "SHARED-DRAFT-SYN", { id, version: 2 });
      expect(issued.sequence).toBe(1);
      const tombstone = await admin
        .from("central_business_entities")
        .select("deleted,current_version,current_payload")
        .eq("user_id", owner)
        .eq("entity_type", "document_draft")
        .eq("entity_id", id)
        .single();
      expect(tombstone.data).toEqual({
        deleted: true,
        current_version: 3,
        current_payload: null,
      });
      expect(
        (
          await admin.rpc(
            "mutate_central_business_entity_v1",
            command(2, "resucitar"),
          )
        ).error?.code,
      ).toBe("P4101");
      const fresh = await admin.rpc("list_central_business_events_v1", {
        p_user_id: owner,
        p_device_id: "synthetic-new-mobile",
        p_after_sequence: 0,
        p_limit: 100,
      });
      expect(fresh.error).toBeNull();
      const draftEvents = fresh.data.filter(
        (row: { entity_id: string }) => row.entity_id === id,
      );
      expect(draftEvents).toHaveLength(3);
      for (const row of draftEvents)
        expect(row).toMatchObject({
          entity_type: "document_draft",
          operation_kind: "delete",
          entity_version: 3,
          payload: null,
        });
      expect(
        (
          await anon.rpc(
            "mutate_central_business_entity_v1",
            command(0, "sin-permiso"),
          )
        ).error,
      ).not.toBeNull();
    });
  },
);
