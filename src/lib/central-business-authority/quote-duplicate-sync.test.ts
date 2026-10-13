import { describe, expect, it, vi } from "vitest";
import { EMPTY_DATA, type AppData, type Document } from "@/lib/types";
import { documentTotals } from "@/lib/calculations";
import { buildDuplicatedDocumentDraft } from "@/lib/document-duplication";
import { normalizeLoadedData } from "@/lib/storage";
import { stableStringifySnapshot } from "@/lib/document-integrity/snapshots";
import { buildCentralBusinessNumberedDocumentLocalCommit } from "./numbered-document-local-commit";
import { createQuoteWithCentralCanary } from "./quote-create-canary";
import { commitSharedTransition } from "./shared-transition-mutation";
import { editSharedQuoteFromOpenedVersion } from "./shared-business-transitions";
import { buildCentralBusinessEventAppDataTransition } from "./events-app-data-sync";
import { loadCentralBusinessDurableQueue } from "./durable-queue";
import type { CentralBusinessAuthorityStatusResult } from "./status-client";
import type { CentralBusinessBrowserBatchMutationInput } from "./batch-mutation-client";
import type { CentralBusinessJson } from "./mutation-command";

const now = "2026-10-13T10:00:00.000Z";
const original: Document = {
  id: "synthetic-original",
  type: "presupuesto",
  number: "P-2026-0001",
  date: "2026-10-13",
  status: "enviado",
  documentLifecycle: "draft",
  integrityLock: "unlocked",
  client: { name: "Synthetic client" },
  items: [
    {
      id: "original-line",
      description: "Synthetic work",
      quantity: 1,
      unitPrice: 12000,
      ivaPercent: 21,
    },
  ],
  createdAt: now,
  updatedAt: now,
};

describe("duplicate quote edit synchronization", () => {
  it("keeps the opened duplicate unchanged when its saved cache is read", () => {
    const before = normalizeLoadedData({
      ...EMPTY_DATA,
      documents: [original],
    });
    const duplicate = {
      ...buildDuplicatedDocumentDraft(original, {
        date: "2026-10-13",
        lineIdFactory: () => "duplicate-line",
      }),
      id: "synthetic-duplicate",
      number: "P-2026-0002",
      createdAt: now,
      updatedAt: now,
    };
    const created = buildCentralBusinessNumberedDocumentLocalCommit(
      before,
      "quote",
      {
        schema: "CENTRAL_BUSINESS_NUMBERED_DOCUMENT_CLIENT_V1",
        action: "create",
        status: "committed",
        eventId: "synthetic-create-event",
        eventSequence: 2,
        entityVersion: 1,
        fullNumber: duplicate.number,
        sequence: 2,
        scopeYear: 2026,
        contentHash: "a".repeat(64),
        documentPayload: JSON.parse(JSON.stringify(duplicate)),
      },
    );
    const loaded = normalizeLoadedData(
      JSON.parse(JSON.stringify(created.data)),
    );
    const cached = loaded.documents.find((doc) => doc.id === duplicate.id);
    expect(stableStringifySnapshot(cached)).toBe(
      stableStringifySnapshot(created.value),
    );
  });

  it("duplicates, edits behind pending pages, and shares the edited amount with a second device", async () => {
    const owner = "00000000-0000-4000-8000-000000000001";
    const values = new Map<string, string>();
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => {
        values.set(key, value);
      },
    };
    let state = normalizeLoadedData({ ...EMPTY_DATA, documents: [original] });
    const ready = async () =>
      ({
        ok: true,
        summary: { writesPossible: true },
      }) as CentralBusinessAuthorityStatusResult;
    const emptySync = async () => ({
      ok: true as const,
      schema: "CENTRAL_BUSINESS_EVENTS_APP_DATA_SYNC_V1" as const,
      pulled: 0,
      applied: 0,
      skipped: 0,
      nextSequence: 0,
      hasMore: false,
    });
    const created = await createQuoteWithCentralCanary({
      userId: owner,
      draft: buildDuplicatedDocumentDraft(original, {
        date: "2026-10-13",
        lineIdFactory: () => "duplicate-line",
      }) as ReturnType<typeof buildDuplicatedDocumentDraft> & {
        type: "presupuesto";
      },
      dependencies: {
        environment: { enabled: "true", userIds: owner },
        storage,
        getCurrentData: () => state,
        addDocumentFallback: () => {
          throw new Error("No local fallback");
        },
        createId: () => "synthetic-duplicate",
        now: () => now,
        fetchStatus: ready,
        syncEventsBeforeWrite: emptySync,
        mutate: async (input) =>
          input.action === "reconcile_series"
            ? {
                ok: true,
                result: {
                  schema: "CENTRAL_BUSINESS_NUMBERED_DOCUMENT_CLIENT_V1",
                  action: "reconcile_series",
                  status: "committed",
                  reconciliationId: "synthetic-reconciliation",
                  scopeYear: 2026,
                  previousSequence: 0,
                  resultingSequence: input.observedMaxSequence,
                },
              }
            : {
                ok: true,
                result: {
                  schema: "CENTRAL_BUSINESS_NUMBERED_DOCUMENT_CLIENT_V1",
                  action: "create",
                  status: "committed",
                  eventId: "synthetic-create",
                  eventSequence: 1401,
                  entityVersion: 1,
                  fullNumber: "P-2026-0002",
                  sequence: 2,
                  scopeYear: 2026,
                  contentHash: "a".repeat(64),
                  documentPayload: {
                    ...(input.payloadWithoutNumber as Record<
                      string,
                      CentralBusinessJson
                    >),
                    number: "P-2026-0002",
                  },
                },
              },
        addCentralDocumentDurably: async (expected, type, confirmation) => {
          expect(expected).toBe(state);
          const local = buildCentralBusinessNumberedDocumentLocalCommit(
            state,
            type,
            confirmation,
          );
          state = local.data;
          return {
            status: "applied",
            data: state,
            value: local.value,
            replayed: false,
          };
        },
      },
    });
    expect(created.ok).toBe(true);
    if (!created.ok) throw new Error(created.error);
    const opened = created.document;
    const changes = {
      ...opened,
      status: "enviado" as const,
      items: opened.items.map((line) => ({ ...line, unitPrice: 6000 })),
    };
    const sync = vi
      .fn(emptySync)
      .mockResolvedValueOnce({
        ...(await emptySync()),
        nextSequence: 500,
        hasMore: true,
      })
      .mockResolvedValueOnce({ ...(await emptySync()), nextSequence: 1401 });
    const mutateBatch = vi.fn(
      async (operations: CentralBusinessBrowserBatchMutationInput[]) => {
        expect(operations).toHaveLength(1);
        expect(operations[0]).toMatchObject({
          entityType: "quote",
          entityId: opened.id,
          expectedVersion: 1,
        });
        // No edited business value is visible until the server confirms it.
        expect(
          state.documents.find((doc) => doc.id === opened.id)?.items,
        ).toEqual(opened.items);
        return {
          ok: true as const,
          schema: "CENTRAL_BUSINESS_BATCH_MUTATION_CLIENT_V1" as const,
          operations: [
            {
              operationIndex: 0,
              status: "committed" as const,
              eventId: "synthetic-edit",
              eventSequence: 1402,
              entityVersion: 2,
              deleted: false,
              contentHash: "b".repeat(64),
            },
          ],
        };
      },
    );
    const dependencies = {
      getCurrentData: () => state,
      prepare: (data: AppData, time: string) =>
        editSharedQuoteFromOpenedVersion(data, changes, opened, time),
      sync,
      storage,
      isCurrent: () => true,
      fetchStatus: ready,
      mutateBatch,
      now: () => now,
      commit: async (
        expected: AppData,
        transition: { data: AppData; value: Document },
      ) => {
        expect(expected).toBe(state);
        state = transition.data;
        return {
          status: "applied" as const,
          data: state,
          value: transition.value,
          replayed: false,
        };
      },
    };
    const edited = await commitSharedTransition(owner, dependencies);
    expect(edited.ok).toBe(true);
    expect(sync).toHaveBeenCalledTimes(2);
    expect(mutateBatch).toHaveBeenCalledOnce();
    const command = mutateBatch.mock.calls[0][0][0];
    expect(command.expectedVersion).toBe(1);
    const secondDevice = buildCentralBusinessEventAppDataTransition({
      data: { ...state, documents: [original, opened] },
      event: {
        schema: "CENTRAL_BUSINESS_EVENTS_RPC_ADAPTER_V1",
        eventId: "synthetic-edit",
        eventSequence: 1402,
        entityType: "quote",
        entityId: opened.id,
        entityVersion: 2,
        operationKind: "upsert",
        payload: JSON.parse(JSON.stringify(command.payload)),
        contentHash: "b".repeat(64),
        actorDeviceId: "synthetic-first-device",
        createdAt: now,
      },
      knownVersion: {
        entityType: "quote",
        entityId: opened.id,
        version: 1,
        deleted: false,
        contentHash: "a".repeat(64),
      },
    }).data;
    expect(
      documentTotals(
        secondDevice.documents.find((doc) => doc.id === opened.id)!,
      ).total,
    ).toBe(7260);
    expect(
      secondDevice.documents.find((doc) => doc.id === original.id),
    ).toEqual(original);
    expect(
      loadCentralBusinessDurableQueue(owner, storage).lastAppliedEventSequence,
    ).toBe(0);
    expect(
      loadCentralBusinessDurableQueue("other-company", storage).entityVersions,
    ).toEqual({});
    expect(
      (
        await commitSharedTransition(owner, {
          ...dependencies,
          sync: emptySync,
        })
      ).ok,
    ).toBe(false);
    expect(mutateBatch).toHaveBeenCalledOnce();
  });
});
