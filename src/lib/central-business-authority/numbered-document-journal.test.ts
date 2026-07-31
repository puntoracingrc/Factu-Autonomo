import { describe, expect, it, vi } from "vitest";

import {
  CENTRAL_BUSINESS_NUMBERED_DOCUMENT_CLIENT,
  type CentralBusinessNumberedDocumentBrowserResult,
} from "./numbered-document-client";
import type { CentralBusinessJson } from "./mutation-command";
import {
  acknowledgeCentralBusinessNumberedDocument,
  CentralBusinessNumberedDocumentJournalError,
  drainCentralBusinessNumberedDocumentJournal,
  enqueueCentralBusinessNumberedDocumentCreate,
  loadCentralBusinessNumberedDocumentJournal,
  type CentralBusinessNumberedDocumentCreateInput,
  type CentralBusinessNumberedDocumentJournalStorage,
} from "./numbered-document-journal";

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

const ownerScope = "dee25bc5-381c-40a7-9402-383d4b309052";
const operationId = "CENTRAL_QUOTE_CREATE:quote-synthetic-a";

function command(
  overrides: Partial<CentralBusinessNumberedDocumentCreateInput> = {},
): CentralBusinessNumberedDocumentCreateInput {
  return {
    action: "create",
    idempotencyKey: operationId,
    entityType: "quote",
    entityId: "quote-synthetic-a",
    numberTemplate: "P-{year}-{num}",
    padding: 4,
    fiscalYear: 2026,
    payloadWithoutNumber: {
      id: "quote-synthetic-a",
      type: "presupuesto",
      date: "2026-07-31",
      client: { name: "Cliente sintetico" },
      items: [],
      status: "borrador",
      createdAt: "2026-07-31T05:00:00.000Z",
      updatedAt: "2026-07-31T05:00:00.000Z",
    },
    ...overrides,
  };
}

function confirmation(
  overrides: Partial<
    Extract<CentralBusinessNumberedDocumentBrowserResult, { ok: true }>["result"]
  > = {},
): CentralBusinessNumberedDocumentBrowserResult {
  return {
    ok: true,
    result: {
      schema: CENTRAL_BUSINESS_NUMBERED_DOCUMENT_CLIENT,
      action: "create",
      status: "committed",
      eventId: "event-synthetic-a",
      eventSequence: 42,
      entityVersion: 1,
      fullNumber: "P-2026-0013",
      sequence: 13,
      scopeYear: 2026,
      contentHash: "a".repeat(64),
      documentPayload: {
        ...(command().payloadWithoutNumber as Record<
          string,
          CentralBusinessJson
        >),
        number: "P-2026-0013",
      },
      ...overrides,
    },
  } as CentralBusinessNumberedDocumentBrowserResult;
}

describe("central business numbered document journal", () => {
  it("persiste y relee la intencion antes de permitir su envio", () => {
    const storage = new MemoryStorage();
    const first = enqueueCentralBusinessNumberedDocumentCreate({
      ownerScope,
      operationId,
      command: command(),
      storage,
      now: () => "2026-07-31T05:00:00.000Z",
    });
    const replay = enqueueCentralBusinessNumberedDocumentCreate({
      ownerScope,
      operationId,
      command: command(),
      storage,
    });

    expect(first.replayed).toBe(false);
    expect(replay.replayed).toBe(true);
    expect(loadCentralBusinessNumberedDocumentJournal(ownerScope, storage))
      .toMatchObject({
        revision: 1,
        operations: [
          {
            operationId,
            status: "pending",
            attemptCount: 0,
          },
        ],
      });
  });

  it("reutiliza la misma identidad tras un fallo de red y conserva la confirmacion", async () => {
    const storage = new MemoryStorage();
    enqueueCentralBusinessNumberedDocumentCreate({
      ownerScope,
      operationId,
      command: command(),
      storage,
    });
    const mutate = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 0,
        code: "CENTRAL_BUSINESS_NUMBERED_DOCUMENT_NETWORK_ERROR",
        message: "Sin respuesta",
        retryable: true,
        conflict: false,
      })
      .mockResolvedValueOnce(confirmation());

    const offline = await drainCentralBusinessNumberedDocumentJournal({
      ownerScope,
      storage,
      mutate,
      now: () => "2026-07-31T05:01:00.000Z",
    });
    const recovered = await drainCentralBusinessNumberedDocumentJournal({
      ownerScope,
      storage,
      mutate,
      now: () => "2026-07-31T05:02:00.000Z",
    });
    const replayed = await drainCentralBusinessNumberedDocumentJournal({
      ownerScope,
      storage,
      mutate,
    });

    expect(offline).toMatchObject({
      status: "retryable",
      operation: { operationId, status: "pending", attemptCount: 1 },
    });
    expect(recovered).toMatchObject({
      status: "confirmed",
      operation: {
        operationId,
        attemptCount: 2,
        confirmation: { fullNumber: "P-2026-0013" },
      },
    });
    expect(replayed).toMatchObject({
      status: "confirmed",
      operation: { confirmation: { eventId: "event-synthetic-a" } },
    });
    expect(mutate).toHaveBeenCalledTimes(2);
    expect(mutate.mock.calls[0][0]).toEqual(mutate.mock.calls[1][0]);

    const acknowledged = acknowledgeCentralBusinessNumberedDocument({
      ownerScope,
      operationId,
      eventId: "event-synthetic-a",
      contentHash: "a".repeat(64),
      storage,
    });
    expect(acknowledged.operations).toEqual([]);
  });

  it("retiene conflictos y no los reintenta automaticamente", async () => {
    const storage = new MemoryStorage();
    enqueueCentralBusinessNumberedDocumentCreate({
      ownerScope,
      operationId,
      command: command(),
      storage,
    });
    const mutate = vi.fn(async () => ({
      ok: false as const,
      status: 409,
      code: "CENTRAL_BUSINESS_IDEMPOTENCY_CONFLICT",
      message: "Conflicto sintetico",
      retryable: false,
      conflict: true,
    }));

    const conflict = await drainCentralBusinessNumberedDocumentJournal({
      ownerScope,
      storage,
      mutate,
    });
    const retained = await drainCentralBusinessNumberedDocumentJournal({
      ownerScope,
      storage,
      mutate,
    });

    expect(conflict).toMatchObject({
      status: "conflict",
      operation: {
        status: "conflict",
        lastError: { code: "CENTRAL_BUSINESS_IDEMPOTENCY_CONFLICT" },
      },
    });
    expect(retained.status).toBe("conflict");
    expect(mutate).toHaveBeenCalledTimes(1);
  });

  it("bloquea confirmaciones incoherentes y acuses que no coinciden", async () => {
    const storage = new MemoryStorage();
    enqueueCentralBusinessNumberedDocumentCreate({
      ownerScope,
      operationId,
      command: command(),
      storage,
    });
    const invalid = await drainCentralBusinessNumberedDocumentJournal({
      ownerScope,
      storage,
      mutate: vi.fn(async () =>
        confirmation({ fullNumber: "P-2026-9999" }),
      ),
    });

    expect(invalid).toMatchObject({
      status: "blocked",
      operation: {
        lastError: {
          code: "CENTRAL_BUSINESS_NUMBERED_CONFIRMATION_INVALID",
        },
      },
    });
    expect(() =>
      acknowledgeCentralBusinessNumberedDocument({
        ownerScope,
        operationId,
        eventId: "otro-evento",
        contentHash: "b".repeat(64),
        storage,
      }),
    ).toThrowError(CentralBusinessNumberedDocumentJournalError);
  });

  it("rechaza corrupcion, reutilizacion y escrituras sin readback", () => {
    const storage = new MemoryStorage();
    enqueueCentralBusinessNumberedDocumentCreate({
      ownerScope,
      operationId,
      command: command(),
      storage,
    });
    expect(() =>
      enqueueCentralBusinessNumberedDocumentCreate({
        ownerScope,
        operationId,
        command: command({
          payloadWithoutNumber: {
            ...(command().payloadWithoutNumber as Record<
              string,
              CentralBusinessJson
            >),
            notes: "otro contenido",
          },
        }),
        storage,
      }),
    ).toThrowError(
      expect.objectContaining({ code: "IDEMPOTENCY_KEY_REUSED" }),
    );

    const corrupted = new MemoryStorage();
    corrupted.values.set(
      `factu:central-business-authority:numbered-document-journal:v1:${encodeURIComponent(ownerScope)}`,
      '{"schema":"incorrecto"}',
    );
    expect(() =>
      loadCentralBusinessNumberedDocumentJournal(ownerScope, corrupted),
    ).toThrowError(expect.objectContaining({ code: "STORAGE_CORRUPTED" }));

    const noReadback: CentralBusinessNumberedDocumentJournalStorage = {
      getItem: () => null,
      setItem: () => {},
    };
    expect(() =>
      enqueueCentralBusinessNumberedDocumentCreate({
        ownerScope,
        operationId,
        command: command(),
        storage: noReadback,
      }),
    ).toThrowError(expect.objectContaining({ code: "STORAGE_WRITE_FAILED" }));
  });
});
