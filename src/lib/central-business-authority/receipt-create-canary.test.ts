import { describe, expect, it, vi } from "vitest";

import type { AppDataDurabilityResult } from "@/lib/app-data-durability";
import type { CentralInvoiceAuthorityEventsAppDataSyncValue } from "@/lib/central-invoice-authority/events-app-data-sync";
import { issueDocument, markDocumentPaid } from "@/lib/document-integrity";
import type { ReceiptGenerationCommandResult } from "@/lib/receipt-generation-command";
import {
  DEFAULT_PROFILE,
  EMPTY_DATA,
  type AppData,
  type Document,
} from "@/lib/types";

import { buildCentralBusinessNumberedDocumentLocalCommit } from "./numbered-document-local-commit";
import type { CentralBusinessJson } from "./mutation-command";
import type {
  CentralBusinessNumberedDocumentBrowserInput,
  CentralBusinessNumberedDocumentBrowserResult,
} from "./numbered-document-client";
import {
  loadCentralBusinessNumberedDocumentJournal,
  type CentralBusinessNumberedDocumentJournalStorage,
} from "./numbered-document-journal";
import {
  createReceiptWithCentralCanary,
  isCentralReceiptCreateCanaryEnabledForUser,
  type CentralReceiptCreateCanaryDependencies,
} from "./receipt-create-canary";
import type { CentralBusinessAuthorityStatusResult } from "./status-client";

class MemoryStorage
  implements CentralBusinessNumberedDocumentJournalStorage
{
  readonly values = new Map<string, string>();

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
}

const ownerScope = "synthetic-receipt-user-0001";
const now = "2026-08-03T12:00:00.000Z";
const PROFILE = {
  ...DEFAULT_PROFILE,
  name: "Emisor sintetico",
  nif: "B12345678",
  address: "Calle Central 1",
  postalCode: "28001",
  city: "Madrid",
};

function invoice(withCentralIdentity = true): Document {
  const paid = markDocumentPaid(
    issueDocument(
      {
        id: "invoice-central-1",
        type: "factura",
        number: "F-2026-0042",
        date: "2026-08-01",
        client: {
          name: "Cliente sintetico",
          nif: "X1234567L",
          address: "Calle Cliente 2",
          postalCode: "28002",
          city: "Madrid",
        },
        items: [
          {
            id: "invoice-line-1",
            description: "Trabajo sintetico",
            quantity: 1,
            unitPrice: 100,
            ivaPercent: 21,
          },
        ],
        status: "borrador",
        createdAt: "2026-08-01T09:00:00.000Z",
        updatedAt: "2026-08-01T09:00:00.000Z",
      },
      PROFILE,
      "2026-08-01T09:00:00.000Z",
    ),
    "2026-08-01T10:00:00.000Z",
  );
  if (!withCentralIdentity) return paid;
  return attachCentralIdentity(paid);
}

function attachCentralIdentity(document: Document): Document {
  return {
    ...document,
    centralInvoiceAuthority: {
      schemaVersion: 1,
      source: "central_invoice_authority",
      serverDocumentId: "server-invoice-1",
      identityId: "identity-invoice-1",
      outboxEventId: "event-invoice-1",
      eventType: "invoice_issued",
      fullNumber: document.number,
      sequence: 42,
      documentVersion: 2,
      emittedHash: "sha256:invoice",
      receivedAt: "2026-08-01T10:01:00.000Z",
    },
  };
}

function data(source = invoice()): AppData {
  return {
    ...EMPTY_DATA,
    profile: {
      ...PROFILE,
      numbering: {
        ...PROFILE.numbering,
        year: 2026,
        lastSequence: {
          factura: 42,
          factura_rectificativa: 1,
          presupuesto: 4,
          recibo: 2,
        },
      },
    },
    documents: [source],
    counters: {
      factura: 42,
      factura_rectificativa: 1,
      presupuesto: 4,
      recibo: 2,
    },
  };
}

function readyStatus(): CentralBusinessAuthorityStatusResult {
  return {
    ok: true,
    schema: "CENTRAL_BUSINESS_AUTHORITY_STATUS_CLIENT_V1",
    activation: {
      requestedMode: "canary",
      effectiveMode: "canary",
      enabled: true,
      writesEnabled: true,
      appliesToUser: true,
      production: true,
      reason: "ready",
    },
    readiness: {
      schema: "CENTRAL_BUSINESS_AUTHORITY_STATUS_READINESS_V1",
      checkedAt: now,
      ready: true,
      checks: [],
      blockers: [],
    },
    summary: {
      writesPossible: true,
      modeAllowsWrites: true,
      serverSchemaReady: true,
      deviceVerified: true,
    },
  };
}

function serverMutation(options: { loseFirstCreate?: boolean } = {}) {
  let createAttempts = 0;
  return vi.fn(
    async (
      input: CentralBusinessNumberedDocumentBrowserInput,
    ): Promise<CentralBusinessNumberedDocumentBrowserResult> => {
      if (input.action === "reconcile_series") {
        return {
          ok: true,
          result: {
            schema: "CENTRAL_BUSINESS_NUMBERED_DOCUMENT_CLIENT_V1",
            action: "reconcile_series",
            status: "committed",
            reconciliationId: "reconciliation-1",
            scopeYear: 2026,
            previousSequence: 0,
            resultingSequence: Math.max(input.observedMaxSequence, 2),
          },
        };
      }
      createAttempts += 1;
      if (options.loseFirstCreate && createAttempts === 1) {
        return {
          ok: false,
          status: 0,
          code: "NETWORK_ERROR",
          message: "lost response",
          retryable: true,
          conflict: false,
        };
      }
      const sequence = 3;
      const fullNumber = input.numberTemplate
        .replaceAll("{year}", String(input.fiscalYear))
        .replaceAll("{num}", String(sequence).padStart(input.padding, "0"));
      return {
        ok: true,
        result: {
          schema: "CENTRAL_BUSINESS_NUMBERED_DOCUMENT_CLIENT_V1",
          action: "create",
          status: createAttempts > 1 ? "replayed" : "committed",
          eventId: "event-receipt-1",
          eventSequence: 10,
          entityVersion: 1,
          fullNumber,
          sequence,
          scopeYear: 2026,
          contentHash: "a".repeat(64),
          documentPayload: {
            ...(input.payloadWithoutNumber as {
              [key: string]: CentralBusinessJson;
            }),
            number: fullNumber,
          },
        },
      };
    },
  );
}

function successfulInvoiceSync(
  current: AppData,
): AppDataDurabilityResult<CentralInvoiceAuthorityEventsAppDataSyncValue> {
  return {
    status: "applied",
    data: current,
    replayed: false,
    value: {
      schema: "CENTRAL_INVOICE_AUTHORITY_EVENTS_APP_DATA_SYNC_V1",
      localSync: {
        ok: true,
        schema: "CENTRAL_INVOICE_AUTHORITY_EVENTS_LOCAL_SYNC_V1",
        documents: current.documents,
        pulledEvents: 0,
        applied: [],
        skipped: [],
        conflicts: [],
        cursorToPersist: null,
        serverNextCursor: null,
      },
      state: {
        schemaVersion: 1,
        source: "central_invoice_authority_events",
        cursor: null,
      },
    },
  };
}

function idSequence(...ids: string[]): () => string {
  let index = 0;
  return () => {
    const id = ids[index++];
    if (!id) throw new Error("Secuencia sintetica agotada");
    return id;
  };
}

function harness(options: {
  initial?: AppData;
  mutation?: ReturnType<typeof serverMutation>;
} = {}) {
  let current = options.initial ?? data();
  let historicalImported = false;
  const storage = new MemoryStorage();
  const mutate = options.mutation ?? serverMutation();
  const fallbackReceipt: Document = {
    id: "receipt-local-1",
    type: "recibo",
    number: "R-2026-LOCAL",
    date: "2026-08-03",
    client: { name: "Cliente sintetico" },
    items: [],
    status: "pagado",
    createdAt: now,
    updatedAt: now,
  };
  const fallback = vi.fn(
    (): ReceiptGenerationCommandResult => ({
      status: "created",
      receipt: fallbackReceipt,
      data: current,
    }),
  );
  const addCentralDocumentDurably = vi.fn(
    async (
      expected: AppData,
      _entityType: "receipt",
      confirmation: Parameters<
        CentralReceiptCreateCanaryDependencies["addCentralDocumentDurably"]
      >[2],
    ): Promise<AppDataDurabilityResult<Document>> => {
      if (current !== expected) {
        return { status: "blocked", reason: "stale_precondition" };
      }
      try {
        const transition = buildCentralBusinessNumberedDocumentLocalCommit(
          current,
          "receipt",
          confirmation,
        );
        current = transition.data;
        return {
          status: "applied",
          data: current,
          value: transition.value,
          replayed: transition.replayed,
        };
      } catch {
        return { status: "blocked", reason: "transition_failed" };
      }
    },
  );
  const syncInvoiceEventsBeforeWrite = vi.fn(async () => {
    if (historicalImported) {
      current = {
        ...current,
        documents: current.documents.map((entry) =>
          entry.id === "invoice-central-1" ? attachCentralIdentity(entry) : entry,
        ),
      };
    }
    return successfulInvoiceSync(current);
  });
  const importHistoricalOriginal = vi.fn(async () => {
    historicalImported = true;
    return {
      ok: true as const,
      schema: "CENTRAL_INVOICE_AUTHORITY_HISTORICAL_IMPORT_CLIENT_V1" as const,
      imported: [
        {
          status: "committed" as const,
          documentId: "server-invoice-1",
          identityId: "identity-invoice-1",
          outboxEventId: "event-invoice-1",
          fullNumber: "F-2026-0042",
          sequence: 42,
          documentVersion: 1,
        },
      ],
      counts: { committed: 1, replayed: 0, alreadyPresent: 0 },
    };
  });
  const syncBusinessEventsBeforeWrite = vi.fn(async () => ({
    ok: true as const,
    schema: "CENTRAL_BUSINESS_EVENTS_APP_DATA_SYNC_V1" as const,
    pulled: 0,
    applied: 0,
    skipped: 0,
    nextSequence: 0,
    hasMore: false,
  }));
  const fetchStatus = vi.fn(async () => readyStatus());

  return {
    storage,
    mutate,
    fallback,
    importHistoricalOriginal,
    syncInvoiceEventsBeforeWrite,
    fetchStatus,
    get current() {
      return current;
    },
    dependencies: {
      getCurrentData: () => current,
      generateReceiptFallback: fallback,
      addCentralDocumentDurably,
      syncBusinessEventsBeforeWrite,
      syncInvoiceEventsBeforeWrite,
      importHistoricalOriginal,
      fetchStatus,
      mutate,
      storage,
      createId: idSequence("receipt-central-1", "receipt-line-1"),
      now: () => now,
      withLock: async (_scope, task) => task(),
      environment: { enabled: "true", userIds: ownerScope },
    } satisfies CentralReceiptCreateCanaryDependencies,
  };
}

describe("central receipt create canary", () => {
  it("solo se activa para usuarios incluidos literalmente", () => {
    expect(
      isCentralReceiptCreateCanaryEnabledForUser(ownerScope, {
        enabled: "true",
        userIds: `other-user,${ownerScope}`,
      }),
    ).toBe(true);
    expect(
      isCentralReceiptCreateCanaryEnabledForUser("missing", {
        enabled: "true",
        userIds: ownerScope,
      }),
    ).toBe(false);
  });

  it("conserva la generacion local fuera del canario", async () => {
    const test = harness();
    const result = await createReceiptWithCentralCanary({
      userId: ownerScope,
      invoiceId: "invoice-central-1",
      dependencies: {
        ...test.dependencies,
        environment: { enabled: "false", userIds: ownerScope },
      },
    });

    expect(result).toMatchObject({
      ok: true,
      delivery: "local",
      receipt: { number: "R-2026-LOCAL" },
    });
    expect(test.fallback).toHaveBeenCalledOnce();
    expect(test.mutate).not.toHaveBeenCalled();
  });

  it("concilia, numera, sella, enlaza y acusa el recibo central", async () => {
    const test = harness();
    const result = await createReceiptWithCentralCanary({
      userId: ownerScope,
      invoiceId: "invoice-central-1",
      dependencies: test.dependencies,
    });

    expect(result).toMatchObject({
      ok: true,
      delivery: "central_confirmed",
      receipt: {
        id: "receipt-central-1",
        number: "R-2026-0003",
        type: "recibo",
        status: "pagado",
        sourceDocumentId: "invoice-central-1",
        centralBusinessReceiptAuthority: {
          source: "central_business_authority",
        },
      },
    });
    expect(test.mutate.mock.calls.map(([input]) => input.action)).toEqual([
      "reconcile_series",
      "create",
    ]);
    expect(test.current.documents).toHaveLength(2);
    expect(test.current.documents[0]?.receiptDocumentId).toBe(
      "receipt-central-1",
    );
    expect(test.current.counters.recibo).toBe(3);
    expect(test.importHistoricalOriginal).not.toHaveBeenCalled();
    expect(
      loadCentralBusinessNumberedDocumentJournal(ownerScope, test.storage)
        .operations,
    ).toEqual([]);
  });

  it("registra bajo demanda una factura historica antes de crear su recibo", async () => {
    const test = harness({ initial: data(invoice(false)) });
    const result = await createReceiptWithCentralCanary({
      userId: ownerScope,
      invoiceId: "invoice-central-1",
      dependencies: test.dependencies,
    });

    expect(result).toMatchObject({ ok: true, delivery: "central_confirmed" });
    expect(test.importHistoricalOriginal).toHaveBeenCalledOnce();
    expect(test.syncInvoiceEventsBeforeWrite).toHaveBeenCalledTimes(2);
    expect(test.current.documents[0]?.centralInvoiceAuthority).toBeDefined();
  });

  it("retiene la operacion si se pierde la respuesta y recupera la misma identidad", async () => {
    const mutation = serverMutation({ loseFirstCreate: true });
    const test = harness({ mutation });
    const first = await createReceiptWithCentralCanary({
      userId: ownerScope,
      invoiceId: "invoice-central-1",
      dependencies: test.dependencies,
    });
    const pending = loadCentralBusinessNumberedDocumentJournal(
      ownerScope,
      test.storage,
    ).operations[0];

    expect(first.ok).toBe(false);
    expect(pending).toMatchObject({
      operationId: "CENTRAL_RECEIPT_CREATE:receipt-central-1",
      status: "pending",
    });

    const second = await createReceiptWithCentralCanary({
      userId: ownerScope,
      invoiceId: "invoice-central-1",
      dependencies: {
        ...test.dependencies,
        environment: { enabled: "false", userIds: ownerScope },
      },
    });

    expect(second).toMatchObject({
      ok: true,
      delivery: "central_recovered",
      receipt: { number: "R-2026-0003" },
    });
    const creates = mutation.mock.calls
      .map(([input]) => input)
      .filter((input) => input.action === "create");
    expect(creates).toHaveLength(2);
    expect(creates[0]).toEqual(creates[1]);
    expect(test.current.documents).toHaveLength(2);
  });
});
