import { describe, expect, it, vi } from "vitest";

import type { AppDataDurabilityResult } from "@/lib/app-data-durability";
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
  createQuoteWithCentralCanary,
  isCentralQuoteCreateCanaryEnabledForUser,
  type CentralQuoteCreateCanaryDependencies,
  type CentralQuoteDraft,
} from "./quote-create-canary";
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

const ownerScope = "synthetic-quote-user-0001";

function data(overrides: Partial<AppData> = {}): AppData {
  return {
    ...EMPTY_DATA,
    profile: {
      ...DEFAULT_PROFILE,
      numbering: {
        ...DEFAULT_PROFILE.numbering,
        year: 2026,
        lastSequence: {
          factura: 9,
          factura_rectificativa: 1,
          presupuesto: 4,
          recibo: 2,
        },
      },
    },
    documents: [],
    counters: {
      factura: 9,
      factura_rectificativa: 1,
      presupuesto: 4,
      recibo: 2,
    },
    ...overrides,
  };
}

function draft(overrides: Partial<CentralQuoteDraft> = {}): CentralQuoteDraft {
  return {
    type: "presupuesto",
    date: "2026-07-31",
    client: { name: "Cliente sintetico" },
    items: [
      {
        id: "line-1",
        description: "Trabajo sintetico",
        quantity: 1,
        unitPrice: 100,
        ivaPercent: 21,
      },
    ],
    status: "enviado",
    ...overrides,
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
      checkedAt: "2026-07-31T05:00:00.000Z",
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

function serverMutation(options: {
  onCreate?: (
    input: Extract<
      CentralBusinessNumberedDocumentBrowserInput,
      { action: "create" }
    >,
  ) => CentralBusinessNumberedDocumentBrowserResult;
} = {}) {
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
            resultingSequence: Math.max(input.observedMaxSequence, 4),
          },
        };
      }
      if (options.onCreate) return options.onCreate(input);
      const sequence = 5;
      const fullNumber = input.numberTemplate
        .replaceAll("{year}", String(input.fiscalYear))
        .replaceAll("{num}", String(sequence).padStart(input.padding, "0"));
      return {
        ok: true,
        result: {
          schema: "CENTRAL_BUSINESS_NUMBERED_DOCUMENT_CLIENT_V1",
          action: "create",
          status: "committed",
          eventId: "event-quote-1",
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

function harness(options: {
  initial?: AppData;
  mutation?: ReturnType<typeof serverMutation>;
  localMode?: "applied" | "indeterminate";
} = {}) {
  let current = options.initial ?? data();
  let localMode = options.localMode ?? "applied";
  const storage = new MemoryStorage();
  const mutate = options.mutation ?? serverMutation();
  const fallback = vi.fn((quote: CentralQuoteDraft): Document => ({
    ...quote,
    id: "local-quote",
    number: "P-2026-LOCAL",
    createdAt: "2026-07-31T05:00:00.000Z",
    updatedAt: "2026-07-31T05:00:00.000Z",
  }));
  const addCentralDocumentDurably = vi.fn(
    async (
      expected: AppData,
      _entityType: "quote",
      confirmation: Parameters<
        CentralQuoteCreateCanaryDependencies["addCentralDocumentDurably"]
      >[2],
    ): Promise<AppDataDurabilityResult<Document>> => {
      if (localMode === "indeterminate") {
        return { status: "indeterminate", reason: "storage_state_unknown" };
      }
      if (current !== expected) {
        return { status: "blocked", reason: "stale_precondition" };
      }
      try {
        const transition =
          buildCentralBusinessNumberedDocumentLocalCommit(
            current,
            "quote",
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
  const syncEventsBeforeWrite = vi.fn(async () => ({
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
    addCentralDocumentDurably,
    syncEventsBeforeWrite,
    fetchStatus,
    setLocalMode(mode: "applied" | "indeterminate") {
      localMode = mode;
    },
    get current() {
      return current;
    },
    dependencies: {
      getCurrentData: () => current,
      addDocumentFallback: fallback,
      addCentralDocumentDurably,
      syncEventsBeforeWrite,
      fetchStatus,
      mutate,
      storage,
      createId: () => "quote-central-0001",
      now: () => "2026-07-31T05:00:00.000Z",
      withLock: async (_scope, task) => task(),
      environment: {
        enabled: "true",
        userIds: ownerScope,
      },
    } satisfies CentralQuoteCreateCanaryDependencies,
  };
}

describe("central quote create canary", () => {
  it("solo se activa para un UUID incluido literalmente", () => {
    const environment = {
      enabled: "true",
      userIds: `other-user,${ownerScope}`,
    };
    expect(
      isCentralQuoteCreateCanaryEnabledForUser(ownerScope, environment),
    ).toBe(true);
    expect(
      isCentralQuoteCreateCanaryEnabledForUser("missing-user", environment),
    ).toBe(false);
    expect(
      isCentralQuoteCreateCanaryEnabledForUser(ownerScope, {
        ...environment,
        enabled: "false",
      }),
    ).toBe(false);
  });

  it("conserva el alta local anterior fuera del canario", async () => {
    const test = harness();
    const result = await createQuoteWithCentralCanary({
      userId: ownerScope,
      draft: draft(),
      dependencies: {
        ...test.dependencies,
        environment: { enabled: "false", userIds: ownerScope },
      },
    });

    expect(result).toMatchObject({
      ok: true,
      delivery: "local",
      document: { number: "P-2026-LOCAL" },
    });
    expect(test.fallback).toHaveBeenCalledOnce();
    expect(test.fetchStatus).not.toHaveBeenCalled();
    expect(test.mutate).not.toHaveBeenCalled();
  });

  it("no aplica validaciones centrales a usuarios fuera de la cohorte", async () => {
    const test = harness();
    const legacyDraft = {
      ...draft(),
      legacyImportAttestation: { source: "legacy-test" },
    } as unknown as CentralQuoteDraft;
    const result = await createQuoteWithCentralCanary({
      userId: "outside-canary",
      draft: legacyDraft,
      dependencies: {
        ...test.dependencies,
        environment: { enabled: "true", userIds: ownerScope },
      },
    });

    expect(result).toMatchObject({
      ok: true,
      delivery: "local",
      document: { number: "P-2026-LOCAL" },
    });
    expect(test.fallback).toHaveBeenCalledWith(legacyDraft);
    expect(test.fetchStatus).not.toHaveBeenCalled();
    expect(test.mutate).not.toHaveBeenCalled();
  });

  it("concilia, numera en servidor, confirma localmente y acusa el diario", async () => {
    const test = harness();
    const result = await createQuoteWithCentralCanary({
      userId: ownerScope,
      draft: draft(),
      dependencies: test.dependencies,
    });

    expect(result).toMatchObject({
      ok: true,
      delivery: "central_confirmed",
      document: {
        id: "quote-central-0001",
        number: "P-2026-0005",
        type: "presupuesto",
        status: "enviado",
      },
    });
    expect(test.mutate.mock.calls.map(([input]) => input.action)).toEqual([
      "reconcile_series",
      "create",
    ]);
    expect(test.fallback).not.toHaveBeenCalled();
    expect(test.current.documents).toHaveLength(1);
    expect(test.current.counters.presupuesto).toBe(5);
    expect(
      loadCentralBusinessNumberedDocumentJournal(
        ownerScope,
        test.storage,
      ).operations,
    ).toEqual([]);
  });

  it("falla cerrado si el servidor no permite escrituras", async () => {
    const test = harness();
    test.fetchStatus.mockResolvedValue({
      ok: false,
      status: 503,
      code: "NOT_READY",
      message: "not ready",
    });
    const result = await createQuoteWithCentralCanary({
      userId: ownerScope,
      draft: draft(),
      dependencies: test.dependencies,
    });

    expect(result).toEqual({
      ok: false,
      error:
        "El servidor central no esta listo para asignar el numero. No se guardo el presupuesto.",
    });
    expect(test.fallback).not.toHaveBeenCalled();
    expect(test.mutate).not.toHaveBeenCalled();
    expect(test.current.documents).toEqual([]);
  });

  it("retiene una respuesta perdida y reintenta la misma identidad", async () => {
    let createAttempts = 0;
    const mutation = serverMutation({
      onCreate: (input) => {
        createAttempts += 1;
        if (createAttempts === 1) {
          return {
            ok: false,
            status: 0,
            code: "NETWORK_ERROR",
            message: "lost response",
            retryable: true,
            conflict: false,
          };
        }
        const fullNumber = "P-2026-0005";
        return {
          ok: true,
          result: {
            schema: "CENTRAL_BUSINESS_NUMBERED_DOCUMENT_CLIENT_V1",
            action: "create",
            status: "replayed",
            eventId: "event-quote-1",
            eventSequence: 10,
            entityVersion: 1,
            fullNumber,
            sequence: 5,
            scopeYear: 2026,
            contentHash: "b".repeat(64),
            documentPayload: {
              ...(input.payloadWithoutNumber as {
                [key: string]: CentralBusinessJson;
              }),
              number: fullNumber,
            },
          },
        };
      },
    });
    const test = harness({ mutation });
    const acceptedDraft = draft({ status: "aceptado" });
    const first = await createQuoteWithCentralCanary({
      userId: ownerScope,
      draft: acceptedDraft,
      dependencies: test.dependencies,
    });
    const pending = loadCentralBusinessNumberedDocumentJournal(
      ownerScope,
      test.storage,
    ).operations[0];

    expect(first.ok).toBe(false);
    expect(pending.status).toBe("pending");
    expect(pending.operationId).toBe(
      "CENTRAL_QUOTE_CREATE:quote-central-0001",
    );

    const second = await createQuoteWithCentralCanary({
      userId: ownerScope,
      draft: acceptedDraft,
      dependencies: {
        ...test.dependencies,
        environment: { enabled: "false", userIds: ownerScope },
      },
    });

    expect(second).toMatchObject({
      ok: true,
      delivery: "central_recovered",
      document: { number: "P-2026-0005" },
    });
    const createInputs = mutation.mock.calls
      .map(([input]) => input)
      .filter((input) => input.action === "create");
    expect(createInputs).toHaveLength(2);
    expect(createInputs[0]).toEqual(createInputs[1]);
    expect(test.fetchStatus).toHaveBeenCalledOnce();
    expect(test.syncEventsBeforeWrite).toHaveBeenCalledOnce();
    expect(test.fallback).not.toHaveBeenCalled();
  });

  it("recupera una confirmacion cuyo commit local quedo indeterminado", async () => {
    const test = harness({ localMode: "indeterminate" });
    const first = await createQuoteWithCentralCanary({
      userId: ownerScope,
      draft: draft(),
      dependencies: test.dependencies,
    });

    expect(first.ok).toBe(false);
    expect(
      loadCentralBusinessNumberedDocumentJournal(
        ownerScope,
        test.storage,
      ).operations[0],
    ).toMatchObject({ status: "confirmed" });
    const createCallsBeforeRecovery = test.mutate.mock.calls.filter(
      ([input]) => input.action === "create",
    ).length;

    test.setLocalMode("applied");
    const recovered = await createQuoteWithCentralCanary({
      userId: ownerScope,
      draft: draft(),
      dependencies: test.dependencies,
    });

    expect(recovered).toMatchObject({
      ok: true,
      delivery: "central_recovered",
      document: { number: "P-2026-0005" },
    });
    expect(
      test.mutate.mock.calls.filter(
        ([input]) => input.action === "create",
      ),
    ).toHaveLength(createCallsBeforeRecovery);
    expect(test.current.documents).toHaveLength(1);
    expect(
      loadCentralBusinessNumberedDocumentJournal(
        ownerScope,
        test.storage,
      ).operations,
    ).toEqual([]);
  });

  it("no acusa una colision local despues de la confirmacion central", async () => {
    const collision: Document = {
      ...draft(),
      id: "other-local-quote",
      number: "P-2026-0005",
      createdAt: "2026-07-30T05:00:00.000Z",
      updatedAt: "2026-07-30T05:00:00.000Z",
    };
    const test = harness({
      initial: data({ documents: [collision] }),
    });
    const result = await createQuoteWithCentralCanary({
      userId: ownerScope,
      draft: draft(),
      dependencies: test.dependencies,
    });

    expect(result.ok).toBe(false);
    expect(test.current.documents).toEqual([collision]);
    expect(
      loadCentralBusinessNumberedDocumentJournal(
        ownerScope,
        test.storage,
      ).operations[0],
    ).toMatchObject({ status: "confirmed" });
  });
});
