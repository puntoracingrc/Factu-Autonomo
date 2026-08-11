import { execFileSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  stableCentralBusinessJson,
  type CentralBusinessEntityType,
  type CentralBusinessJson,
} from "@/lib/central-business-authority/mutation-command";
import {
  createExpenseWorkDocumentUnlinkPayload,
  createExpenseWorkDocumentUpdatePayload,
} from "@/lib/rentabilidad-real/expense-linking/expense-linking";
import type { Expense } from "@/lib/types";

const acceptanceEnabled =
  process.env.CENTRAL_GLOBAL_SYNTHETIC_LOCAL_ENABLED === "true";
const describeAcceptance = acceptanceEnabled ? describe : describe.skip;
const localHosts = new Set(["127.0.0.1", "localhost", "::1"]);
const pendingNumber = "__CENTRAL_AUTHORITY_FULL_NUMBER__";
const issuedAt = "2026-08-10T10:00:00.000Z";
const paidAt = "2026-08-10T10:05:00.000Z";

interface CompanyContext {
  tag: string;
  userId: string;
  customerName: string;
  billingCustomerName: string;
  customerId: string;
  billingCustomerId: string;
  supplierId: string;
  productId: string;
  expenseId: string;
  quoteId: string;
  receiptId: string;
  invoiceLocalId: string;
  rectificationLocalId: string;
  signedIn: SupabaseClient;
}

interface CentralInvoiceIdentity {
  documentId: string;
  identityId: string;
  fullNumber: string;
  sequence: number;
  documentVersion: number;
}

let admin: SupabaseClient;
let databaseUrl = "";
let scope = "";
let companies: CompanyContext[] = [];

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required local env var: ${name}`);
  return value;
}

function requireDatabaseUrl(): string {
  const value =
    process.env.CENTRAL_GLOBAL_SYNTHETIC_DATABASE_URL ??
    process.env.PHASE1_ACCEPTANCE_DATABASE_URL;
  if (!value) {
    throw new Error(
      "Missing CENTRAL_GLOBAL_SYNTHETIC_DATABASE_URL or PHASE1_ACCEPTANCE_DATABASE_URL.",
    );
  }
  return value;
}

function assertLocalUrl(value: string, label: string): void {
  if (!localHosts.has(new URL(value).hostname)) {
    throw new Error(`${label} must point to localhost.`);
  }
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function jsonValue(value: unknown): CentralBusinessJson {
  return JSON.parse(JSON.stringify(value)) as CentralBusinessJson;
}

function contentHash(value: unknown): string {
  return sha256(stableCentralBusinessJson(jsonValue(value)));
}

function rpcRow(value: unknown): Record<string, unknown> {
  const row = Array.isArray(value) ? value[0] : value;
  if (!row || typeof row !== "object" || Array.isArray(row)) {
    throw new Error("Synthetic acceptance RPC did not return a result row.");
  }
  return row as Record<string, unknown>;
}

function invoiceIdentity(value: unknown): CentralInvoiceIdentity {
  const row = rpcRow(value);
  if (
    typeof row.document_id !== "string" ||
    typeof row.identity_id !== "string" ||
    typeof row.full_number !== "string" ||
    typeof row.sequence !== "number" ||
    typeof row.document_version !== "number"
  ) {
    throw new Error("Synthetic invoice RPC returned an incomplete identity.");
  }
  return {
    documentId: row.document_id,
    identityId: row.identity_id,
    fullNumber: row.full_number,
    sequence: row.sequence,
    documentVersion: row.document_version,
  };
}

async function mutateEntity(input: {
  company: CompanyContext;
  entityType: CentralBusinessEntityType;
  entityId: string;
  expectedVersion: number;
  payload: unknown;
  operation: string;
}) {
  const payload = jsonValue(input.payload);
  const { data, error } = await admin.rpc("mutate_central_business_entity_v1", {
    p_user_id: input.company.userId,
    p_device_id: `${input.company.tag}-pc`,
    p_session_hash: sha256(`${input.company.tag}-session`),
    p_idempotency_key_hash: sha256(`${input.company.tag}-${input.operation}`),
    p_request_hash: sha256(`${input.company.tag}-${input.operation}-request`),
    p_operation_kind: "upsert",
    p_entity_type: input.entityType,
    p_entity_id: input.entityId,
    p_expected_version: input.expectedVersion,
    p_payload: payload,
    p_content_hash: contentHash(payload),
  });
  if (error) throw error;
  return rpcRow(data);
}

async function reconcileBusinessSeries(
  company: CompanyContext,
  entityType: "quote" | "receipt",
  template: string,
) {
  const key = `${company.tag}-${entityType}-series`;
  const { data, error } = await admin.rpc(
    "reconcile_central_business_document_series_v1",
    {
      p_user_id: company.userId,
      p_device_id: `${company.tag}-pc`,
      p_session_hash: sha256(`${company.tag}-session`),
      p_idempotency_key_hash: sha256(key),
      p_request_hash: sha256(`${key}-request`),
      p_entity_type: entityType,
      p_number_template: template,
      p_fiscal_year: 2026,
      p_observed_max_sequence: 0,
      p_source_document_count: 0,
      p_source_digest: `sha256:${sha256(`${key}-source`)}`,
    },
  );
  if (error) throw error;
  expect(rpcRow(data)).toMatchObject({ result_status: "committed" });
}

async function createNumberedBusinessDocument(input: {
  company: CompanyContext;
  entityType: "quote" | "receipt";
  entityId: string;
  template: string;
  payload: Record<string, unknown>;
}) {
  const key = `${input.company.tag}-${input.entityType}-create`;
  const { data, error } = await admin.rpc(
    "create_central_business_document_v1",
    {
      p_user_id: input.company.userId,
      p_device_id: `${input.company.tag}-pc`,
      p_session_hash: sha256(`${input.company.tag}-session`),
      p_idempotency_key_hash: sha256(key),
      p_request_hash: sha256(`${key}-request`),
      p_entity_type: input.entityType,
      p_entity_id: input.entityId,
      p_number_template: input.template,
      p_padding: 4,
      p_fiscal_year: 2026,
      p_payload_without_number: input.payload,
    },
  );
  if (error) throw error;
  return rpcRow(data);
}

async function reconcileInvoiceSeries(
  company: CompanyContext,
  seriesCode: string,
) {
  const key = `${company.tag}-${seriesCode}-baseline`;
  const { data, error } = await admin.rpc(
    "reconcile_central_invoice_series_v1",
    {
      p_user_id: company.userId,
      p_device_id: `${company.tag}-pc`,
      p_session_hash: sha256(`${company.tag}-session`),
      p_idempotency_key_hash: sha256(key),
      p_request_hash: sha256(`${key}-request`),
      p_environment: "test",
      p_issuer_nif: "B00000000",
      p_series_code: seriesCode,
      p_fiscal_year: 2026,
      p_observed_max_sequence: 0,
      p_source_document_count: 0,
      p_source_digest: `sha256:${sha256(`${key}-source`)}`,
    },
  );
  if (error) throw error;
  expect(rpcRow(data)).toMatchObject({
    result_status: "committed",
    resulting_sequence: 0,
  });
}

async function issueFiscalDocument(input: {
  company: CompanyContext;
  kind: "invoice" | "rectification";
  localDocumentId: string;
  seriesCode: string;
  payload: Record<string, unknown>;
  rectifiesIdentityId?: string;
  operation: string;
}) {
  const snapshot = {
    document: input.payload,
    issuer: { name: "Empresa sintetica", nif: "B00000000" },
  };
  const key = `${input.company.tag}-${input.operation}`;
  const { data, error } = await admin.rpc("issue_central_invoice_v1", {
    p_user_id: input.company.userId,
    p_device_id: `${input.company.tag}-pc`,
    p_session_hash: sha256(`${input.company.tag}-session`),
    p_idempotency_key_hash: sha256(key),
    p_request_hash: sha256(`${key}-request`),
    p_kind: input.kind,
    p_local_document_id: input.localDocumentId,
    p_expected_version: 0,
    p_draft_hash: sha256(`${key}-draft`),
    p_environment: "test",
    p_issuer_nif: "B00000000",
    p_series_code: input.seriesCode,
    p_fiscal_year: 2026,
    p_issued_at: issuedAt,
    p_document_payload: input.payload,
    p_emitted_snapshot: snapshot,
    p_emitted_hash: `sha256:${contentHash(snapshot)}`,
    p_rectifies_identity_id: input.rectifiesIdentityId ?? null,
  });
  if (error) throw error;
  return invoiceIdentity(data);
}

function invoicePayload(input: {
  company: CompanyContext;
  quoteNumber: string;
}) {
  return {
    id: input.company.invoiceLocalId,
    type: "factura",
    number: pendingNumber,
    date: "2026-08-10",
    customerId: input.company.billingCustomerId,
    client: {
      name: input.company.billingCustomerName,
      nif: `B9${input.company.tag.replace(/\D/g, "").padStart(7, "0").slice(-7)}`,
    },
    items: [
      {
        id: `${input.company.tag}-invoice-line`,
        description: `Articulo sintetico ${input.company.tag}`,
        quantity: 2,
        unitPrice: 50,
        ivaPercent: 21,
      },
    ],
    status: "enviado",
    paymentStatus: "pending",
    sourceQuoteDocumentId: input.company.quoteId,
    sourceQuoteNumber: input.quoteNumber,
    createdAt: issuedAt,
    updatedAt: issuedAt,
  };
}

function cleanupSyntheticInvoices(): void {
  if (!databaseUrl || companies.length === 0) return;
  const userIds = companies
    .map((company) => `'${company.userId.replaceAll("'", "''")}'::uuid`)
    .join(", ");
  execFileSync(
    "psql",
    [
      databaseUrl,
      "-X",
      "-v",
      "ON_ERROR_STOP=1",
      "-c",
      `
        begin;
        set local session_replication_role = replica;
        delete from public.central_invoice_event_wakeups where user_id in (${userIds});
        delete from public.central_invoice_outbox where user_id in (${userIds});
        delete from public.central_invoice_commands where user_id in (${userIds});
        delete from public.central_invoice_document_versions where user_id in (${userIds});
        delete from public.central_invoice_identities where user_id in (${userIds});
        delete from public.central_invoice_documents where user_id in (${userIds});
        delete from public.central_invoice_series_reconciliations where user_id in (${userIds});
        delete from public.central_invoice_series_state where user_id in (${userIds});
        set local session_replication_role = origin;
        commit;
      `,
    ],
    { stdio: "pipe" },
  );
}

describeAcceptance(
  "global synthetic central authority PostgreSQL acceptance",
  { timeout: 60_000 },
  () => {
    beforeAll(async () => {
      const url = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
      const anonKey = requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
      const serviceRoleKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
      databaseUrl = requireDatabaseUrl();
      assertLocalUrl(url, "Supabase URL");
      assertLocalUrl(databaseUrl, "PostgreSQL URL");

      admin = createClient(url, serviceRoleKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      scope = randomUUID().replaceAll("-", "").slice(0, 8);

      companies = await Promise.all(
        Array.from({ length: 3 }, async (_, index) => {
          const tag = `company-${index + 1}-${scope}`;
          const email = `${tag}@example.test`;
          const password = `Synthetic-${randomUUID()}!`;
          const created = await admin.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
          });
          if (created.error || !created.data.user) {
            throw new Error(
              created.error?.message ?? "Could not create synthetic company.",
            );
          }

          const subscription = await admin.from("user_subscriptions").upsert({
            user_id: created.data.user.id,
            plan: "pro",
            status: "active",
            current_period_end: "2099-12-31T23:59:59.000Z",
          });
          if (subscription.error) throw subscription.error;

          const signedIn = createClient(url, anonKey, {
            auth: { persistSession: false, autoRefreshToken: false },
          });
          const login = await signedIn.auth.signInWithPassword({
            email,
            password,
          });
          if (login.error) throw login.error;

          return {
            tag,
            userId: created.data.user.id,
            customerName: `Cliente presupuesto ${index + 1}`,
            billingCustomerName: `Cliente facturacion ${index + 1}`,
            customerId: `${tag}-quote-customer`,
            billingCustomerId: `${tag}-billing-customer`,
            supplierId: `${tag}-supplier`,
            productId: `${tag}-product`,
            expenseId: `${tag}-expense`,
            quoteId: `${tag}-quote`,
            receiptId: `${tag}-receipt`,
            invoiceLocalId: `${tag}-invoice`,
            rectificationLocalId: `${tag}-rectification`,
            signedIn,
          } satisfies CompanyContext;
        }),
      );
    });

    afterAll(async () => {
      try {
        cleanupSyntheticInvoices();
      } finally {
        await Promise.all(
          companies.map(async (company) => {
            await company.signedIn.auth.signOut();
            await admin.auth.admin.deleteUser(company.userId);
          }),
        );
      }
    });

    it("runs complete isolated workflows for several synthetic companies", async () => {
      const quoteTemplate = `P-SYN-${scope}-{year}-{num}`;
      const receiptTemplate = `R-SYN-${scope}-{year}-{num}`;
      const invoiceSeries = `F-SYN-${scope}`;
      const rectificationSeries = `FR-SYN-${scope}`;
      const results: Array<{
        company: CompanyContext;
        quoteNumber: string;
        invoice: CentralInvoiceIdentity;
        rectification: CentralInvoiceIdentity;
        emittedHashBeforeUnlink: string;
      }> = [];

      for (const [index, company] of companies.entries()) {
        const customer = {
          id: company.customerId,
          customerType: "company",
          firstName: company.customerName,
          lastName: "",
          name: company.customerName,
          nif: `B1000000${index}`,
          createdAt: issuedAt,
          updatedAt: issuedAt,
        };
        const billingCustomer = {
          id: company.billingCustomerId,
          customerType: "company",
          firstName: company.billingCustomerName,
          lastName: "",
          name: company.billingCustomerName,
          nif: `B2000000${index}`,
          createdAt: issuedAt,
          updatedAt: issuedAt,
        };
        const product = {
          id: company.productId,
          name: `Articulo sintetico ${index + 1}`,
          saleDescription: `Articulo sintetico ${company.tag}`,
          salePrice: 50,
          ivaPercent: 21,
          source: "manual",
          createdAt: issuedAt,
        };
        const expense: Expense = {
          id: company.expenseId,
          date: "2026-08-10",
          origin: "scan",
          supplierId: company.supplierId,
          supplierName: `Proveedor escaneado ${index + 1}`,
          description: `Material sintetico ${index + 1}`,
          amount: 24.2,
          ivaPercent: 21,
          category: "materiales",
          paymentMethod: "Tarjeta",
          purchaseLines: [
            {
              id: `${company.tag}-expense-line`,
              description: "Material de prueba",
              quantity: 1,
              unitPrice: 20,
              ivaPercent: 21,
            },
          ],
          createdAt: issuedAt,
        };

        expect(
          await mutateEntity({
            company,
            entityType: "customer",
            entityId: company.customerId,
            expectedVersion: 0,
            payload: customer,
            operation: "quote-customer-create",
          }),
        ).toMatchObject({ result_status: "committed", entity_version: 1 });
        expect(
          await mutateEntity({
            company,
            entityType: "customer",
            entityId: company.billingCustomerId,
            expectedVersion: 0,
            payload: billingCustomer,
            operation: "billing-customer-create",
          }),
        ).toMatchObject({ result_status: "committed", entity_version: 1 });
        expect(
          await mutateEntity({
            company,
            entityType: "customer",
            entityId: company.billingCustomerId,
            expectedVersion: 1,
            payload: {
              ...billingCustomer,
              email: `${company.tag}@example.test`,
              updatedAt: paidAt,
            },
            operation: "billing-customer-update",
          }),
        ).toMatchObject({ result_status: "committed", entity_version: 2 });
        expect(
          await mutateEntity({
            company,
            entityType: "product",
            entityId: company.productId,
            expectedVersion: 0,
            payload: product,
            operation: "product-create",
          }),
        ).toMatchObject({ result_status: "committed", entity_version: 1 });

        const bundle = await admin.rpc("mutate_central_business_batch_v1", {
          p_user_id: company.userId,
          p_device_id: `${company.tag}-mobile`,
          p_session_hash: sha256(`${company.tag}-mobile-session`),
          p_operations: [
            {
              operationIndex: 0,
              idempotencyKeyHash: sha256(`${company.tag}-supplier-create`),
              requestHash: sha256(`${company.tag}-supplier-create-request`),
              operationKind: "upsert",
              entityType: "supplier",
              entityId: company.supplierId,
              expectedVersion: 0,
              payload: {
                id: company.supplierId,
                name: expense.supplierName,
                nif: `B3000000${index}`,
                createdAt: issuedAt,
              },
              contentHash: contentHash({
                id: company.supplierId,
                name: expense.supplierName,
                nif: `B3000000${index}`,
                createdAt: issuedAt,
              }),
            },
            {
              operationIndex: 1,
              idempotencyKeyHash: sha256(`${company.tag}-expense-create`),
              requestHash: sha256(`${company.tag}-expense-create-request`),
              operationKind: "upsert",
              entityType: "expense",
              entityId: company.expenseId,
              expectedVersion: 0,
              payload: expense,
              contentHash: contentHash(expense),
            },
          ],
        });
        expect(bundle.error).toBeNull();
        expect(bundle.data).toEqual([
          expect.objectContaining({
            operation_index: 0,
            result_status: "committed",
          }),
          expect.objectContaining({
            operation_index: 1,
            result_status: "committed",
          }),
        ]);

        await reconcileBusinessSeries(company, "quote", quoteTemplate);
        const quote = await createNumberedBusinessDocument({
          company,
          entityType: "quote",
          entityId: company.quoteId,
          template: quoteTemplate,
          payload: {
            id: company.quoteId,
            type: "presupuesto",
            date: "2026-08-10",
            customerId: company.customerId,
            client: { name: company.customerName, nif: customer.nif },
            items: [
              {
                id: `${company.tag}-quote-line`,
                description: product.saleDescription,
                quantity: 2,
                unitPrice: product.salePrice,
                ivaPercent: product.ivaPercent,
              },
            ],
            status: "aceptado",
            createdAt: issuedAt,
            updatedAt: issuedAt,
          },
        });
        expect(quote).toMatchObject({
          result_status: "committed",
          sequence: 1,
        });
        const quoteNumber = String(quote.full_number);

        await reconcileInvoiceSeries(company, invoiceSeries);
        await reconcileInvoiceSeries(company, rectificationSeries);
        const originalPayload = invoicePayload({ company, quoteNumber });
        const invoice = await issueFiscalDocument({
          company,
          kind: "invoice",
          localDocumentId: company.invoiceLocalId,
          seriesCode: invoiceSeries,
          payload: originalPayload,
          operation: "invoice-issue",
        });
        expect(invoice.sequence).toBe(1);

        const linkedExpense = createExpenseWorkDocumentUpdatePayload(
          expense,
          company.invoiceLocalId,
        );
        expect(
          await mutateEntity({
            company,
            entityType: "expense",
            entityId: company.expenseId,
            expectedVersion: 1,
            payload: linkedExpense,
            operation: "expense-link",
          }),
        ).toMatchObject({ result_status: "committed", entity_version: 2 });
        const unlinkedExpense = createExpenseWorkDocumentUnlinkPayload(
          linkedExpense,
          [company.invoiceLocalId],
        );
        expect(
          await mutateEntity({
            company,
            entityType: "expense",
            entityId: company.expenseId,
            expectedVersion: 2,
            payload: unlinkedExpense,
            operation: "expense-unlink",
          }),
        ).toMatchObject({ result_status: "committed", entity_version: 3 });

        const paidPayload = {
          ...originalPayload,
          number: invoice.fullNumber,
          status: "pagado",
          paymentStatus: "paid",
          paidAt,
          updatedAt: paidAt,
        };
        const collection = await admin.rpc(
          "update_central_invoice_collection_v1",
          {
            p_user_id: company.userId,
            p_device_id: `${company.tag}-mobile`,
            p_session_hash: sha256(`${company.tag}-mobile-session`),
            p_idempotency_key_hash: sha256(`${company.tag}-invoice-paid`),
            p_request_hash: sha256(`${company.tag}-invoice-paid-request`),
            p_document_id: invoice.documentId,
            p_identity_id: invoice.identityId,
            p_expected_version: invoice.documentVersion,
            p_status: "pagado",
            p_payment_status: "paid",
            p_paid_at: paidAt,
            p_document_payload: paidPayload,
          },
        );
        if (collection.error) throw collection.error;
        const paidIdentity = invoiceIdentity(collection.data);
        expect(paidIdentity.documentVersion).toBe(2);

        await reconcileBusinessSeries(company, "receipt", receiptTemplate);
        const receipt = await createNumberedBusinessDocument({
          company,
          entityType: "receipt",
          entityId: company.receiptId,
          template: receiptTemplate,
          payload: {
            id: company.receiptId,
            type: "recibo",
            date: "2026-08-10",
            client: paidPayload.client,
            items: paidPayload.items,
            status: "pagado",
            sourceDocumentId: company.invoiceLocalId,
            createdAt: paidAt,
            updatedAt: paidAt,
          },
        });
        expect(receipt).toMatchObject({
          result_status: "committed",
          sequence: 1,
        });

        const rectificationPayload = {
          id: company.rectificationLocalId,
          type: "factura",
          number: pendingNumber,
          date: "2026-08-10",
          customerId: company.billingCustomerId,
          client: paidPayload.client,
          items: paidPayload.items.map((item) => ({
            ...item,
            unitPrice: -Math.abs(item.unitPrice),
          })),
          status: "enviado",
          paymentStatus: "not_applicable",
          rectification: {
            originalDocumentId: company.invoiceLocalId,
            originalNumber: invoice.fullNumber,
            originalDate: "2026-08-10",
            reason: "Anulacion sintetica de regresion",
            type: "anulacion",
          },
          createdAt: paidAt,
          updatedAt: paidAt,
        };
        const rectification = await issueFiscalDocument({
          company,
          kind: "rectification",
          localDocumentId: company.rectificationLocalId,
          seriesCode: rectificationSeries,
          payload: rectificationPayload,
          rectifiesIdentityId: invoice.identityId,
          operation: "rectification-issue",
        });
        expect(rectification.sequence).toBe(1);

        const beforeUnlink = await admin
          .from("central_invoice_documents")
          .select(
            "lifecycle_status,current_version,current_payload,emitted_snapshot,emitted_hash",
          )
          .eq("id", invoice.documentId)
          .eq("user_id", company.userId)
          .single();
        expect(beforeUnlink.error).toBeNull();
        expect(beforeUnlink.data?.lifecycle_status).toBe("voided");
        const emittedHashBeforeUnlink = String(beforeUnlink.data?.emitted_hash);

        const unlink = await admin.rpc("unlink_central_invoice_quote_v1", {
          p_user_id: company.userId,
          p_device_id: `${company.tag}-mobile`,
          p_session_hash: sha256(`${company.tag}-mobile-session`),
          p_idempotency_key_hash: sha256(`${company.tag}-quote-unlink`),
          p_request_hash: sha256(`${company.tag}-quote-unlink-request`),
          p_document_id: invoice.documentId,
          p_identity_id: invoice.identityId,
          p_expected_version: invoice.documentVersion,
        });
        if (unlink.error) throw unlink.error;
        expect(invoiceIdentity(unlink.data).documentVersion).toBe(3);

        const afterUnlink = await admin
          .from("central_invoice_documents")
          .select(
            "lifecycle_status,current_version,current_payload,emitted_snapshot,emitted_hash",
          )
          .eq("id", invoice.documentId)
          .eq("user_id", company.userId)
          .single();
        expect(afterUnlink.error).toBeNull();
        const currentPayload = afterUnlink.data?.current_payload as Record<
          string,
          unknown
        >;
        const emittedSnapshot = afterUnlink.data?.emitted_snapshot as Record<
          string,
          unknown
        >;
        expect(afterUnlink.data).toMatchObject({
          lifecycle_status: "voided",
          current_version: 3,
          emitted_hash: emittedHashBeforeUnlink,
        });
        expect(currentPayload).not.toHaveProperty("sourceQuoteDocumentId");
        expect(currentPayload).not.toHaveProperty("sourceQuoteNumber");
        expect(emittedSnapshot).toHaveProperty(
          "document.sourceQuoteDocumentId",
          company.quoteId,
        );
        expect(emittedSnapshot).toHaveProperty(
          "document.client.name",
          company.billingCustomerName,
        );

        const finalExpense = await admin
          .from("central_business_entities")
          .select("current_version,current_payload,deleted")
          .eq("user_id", company.userId)
          .eq("entity_type", "expense")
          .eq("entity_id", company.expenseId)
          .single();
        expect(finalExpense.error).toBeNull();
        expect(finalExpense.data).toMatchObject({
          current_version: 3,
          deleted: false,
        });
        expect(finalExpense.data?.current_payload).toMatchObject({
          id: company.expenseId,
          amount: expense.amount,
          supplierId: company.supplierId,
        });
        expect(finalExpense.data?.current_payload).not.toHaveProperty(
          "workDocumentId",
        );
        expect(finalExpense.data?.current_payload).not.toHaveProperty(
          "workAllocations",
        );

        const storedQuote = await admin
          .from("central_business_entities")
          .select("current_payload")
          .eq("user_id", company.userId)
          .eq("entity_type", "quote")
          .eq("entity_id", company.quoteId)
          .single();
        expect(storedQuote.error).toBeNull();
        expect(storedQuote.data?.current_payload).toHaveProperty(
          "client.name",
          company.customerName,
        );

        results.push({
          company,
          quoteNumber,
          invoice,
          rectification,
          emittedHashBeforeUnlink,
        });
      }

      expect(results.map((result) => result.invoice.fullNumber)).toEqual([
        `${invoiceSeries}-0001`,
        `${invoiceSeries}-0001`,
        `${invoiceSeries}-0001`,
      ]);
      expect(results.map((result) => result.rectification.fullNumber)).toEqual([
        `${rectificationSeries}-0001`,
        `${rectificationSeries}-0001`,
        `${rectificationSeries}-0001`,
      ]);
      expect(results.map((result) => result.quoteNumber)).toEqual([
        `P-SYN-${scope}-2026-0001`,
        `P-SYN-${scope}-2026-0001`,
        `P-SYN-${scope}-2026-0001`,
      ]);

      const [first, second] = results;
      if (!first || !second)
        throw new Error("Synthetic companies unavailable.");
      const crossTenantCollection = await admin.rpc(
        "update_central_invoice_collection_v1",
        {
          p_user_id: first.company.userId,
          p_device_id: `${first.company.tag}-pc`,
          p_session_hash: sha256(`${first.company.tag}-session`),
          p_idempotency_key_hash: sha256(
            `${first.company.tag}-cross-collection`,
          ),
          p_request_hash: sha256(
            `${first.company.tag}-cross-collection-request`,
          ),
          p_document_id: second.invoice.documentId,
          p_identity_id: second.invoice.identityId,
          p_expected_version: 1,
          p_status: "enviado",
          p_payment_status: "pending",
          p_paid_at: null,
          p_document_payload: {},
        },
      );
      expect(crossTenantCollection.error?.message).toContain(
        "central invoice document not found",
      );

      const crossTenantRectification = await admin.rpc(
        "issue_central_invoice_v1",
        {
          p_user_id: first.company.userId,
          p_device_id: `${first.company.tag}-pc`,
          p_session_hash: sha256(`${first.company.tag}-session`),
          p_idempotency_key_hash: sha256(
            `${first.company.tag}-cross-rectification`,
          ),
          p_request_hash: sha256(
            `${first.company.tag}-cross-rectification-request`,
          ),
          p_kind: "rectification",
          p_local_document_id: `${first.company.tag}-cross-rectification`,
          p_expected_version: 0,
          p_draft_hash: sha256(`${first.company.tag}-cross-draft`),
          p_environment: "test",
          p_issuer_nif: "B00000000",
          p_series_code: rectificationSeries,
          p_fiscal_year: 2026,
          p_issued_at: issuedAt,
          p_document_payload: {
            id: `${first.company.tag}-cross-rectification`,
            type: "factura",
            number: pendingNumber,
          },
          p_emitted_snapshot: { number: pendingNumber },
          p_emitted_hash: `sha256:${sha256("cross-tenant")}`,
          p_rectifies_identity_id: second.invoice.identityId,
        },
      );
      expect(crossTenantRectification.error?.message).toContain(
        "central rectified identity scope mismatch",
      );

      for (const company of companies) {
        const businessEvents = await admin.rpc(
          "list_central_business_events_v1",
          {
            p_user_id: company.userId,
            p_device_id: `${company.tag}-second-device`,
            p_after_sequence: 0,
            p_limit: 100,
          },
        );
        expect(businessEvents.error).toBeNull();
        expect(businessEvents.data).toHaveLength(10);
        expect(
          (businessEvents.data as Array<Record<string, unknown>>).every(
            (event) =>
              typeof event.entity_id === "string" &&
              event.entity_id.startsWith(company.tag),
          ),
        ).toBe(true);

        const invoiceEvents = await admin.rpc(
          "list_central_invoice_events_v1",
          {
            p_user_id: company.userId,
            p_device_id: `${company.tag}-second-device`,
            p_after_created_at: null,
            p_after_event_id: null,
            p_limit: 100,
          },
        );
        expect(invoiceEvents.error).toBeNull();
        expect(invoiceEvents.data).toHaveLength(1);
        expect(invoiceEvents.data).toEqual([
          expect.objectContaining({
            event_type: "rectification_issued",
            full_number: `${rectificationSeries}-0001`,
          }),
        ]);
        expect(invoiceEvents.data?.[0]?.document_payload).toHaveProperty(
          "client.name",
          company.billingCustomerName,
        );

        const wakeups = await company.signedIn
          .from("central_invoice_event_wakeups")
          .select("user_id,outbox_event_id");
        expect(wakeups.error).toBeNull();
        expect(wakeups.data?.length).toBeGreaterThanOrEqual(4);
        expect(
          wakeups.data?.every((wakeup) => wakeup.user_id === company.userId),
        ).toBe(true);
      }
    });
  },
);
