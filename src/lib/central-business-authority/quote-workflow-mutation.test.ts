import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { issueDocument } from "@/lib/document-integrity";
import { EMPTY_DATA, type AppData, type Document } from "@/lib/types";
import {
  drainCentralBusinessDurableQueue,
  enqueueCentralBusinessOperation,
  loadCentralBusinessDurableQueue,
  type CentralBusinessQueueStorage,
} from "./durable-queue";
import { buildCentralBusinessEventAppDataTransition } from "./events-app-data-sync";
import {
  changeQuoteWorkflowWithCentralAuthority as changeQuoteWorkflow,
  prepareQuoteWorkflowTransition,
} from "./quote-workflow-mutation";
import type { CentralBusinessBrowserMutationInput } from "./mutation-client";
import type { CentralBusinessAuthorityStatusResult } from "./status-client";

const owner = "00000000-0000-4000-8000-000000000001";
const now = "2026-10-10T12:00:00.000Z";
const hash = "a".repeat(64);
const changeQuoteWorkflowWithCentralAuthority = (
  input: Parameters<typeof changeQuoteWorkflow>[0],
) =>
  changeQuoteWorkflow({
    ...input,
    environment: { enabled: "true", userIds: owner },
  });

class MemoryStorage implements CentralBusinessQueueStorage {
  values = new Map<string, string>();
  getItem(key: string) {
    return this.values.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
}

function quote(): Document {
  return {
    id: "quote-synthetic",
    type: "presupuesto",
    number: "P-2026-0010",
    date: "2026-10-10",
    client: { name: "Synthetic client" },
    status: "enviado",
    acceptanceStatus: "pending",
    items: [
      {
        id: "line",
        description: "Servicio",
        quantity: 1,
        unitPrice: 100,
        ivaPercent: 21,
      },
    ],
    createdAt: now,
    updatedAt: now,
  };
}

function ready(): CentralBusinessAuthorityStatusResult {
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
      reason: "canary_allowlist",
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

async function harness(seed = true) {
  const storage = new MemoryStorage();
  let data: AppData = { ...EMPTY_DATA, documents: [quote()] };
  let version = 1;
  if (seed) {
    enqueueCentralBusinessOperation({
      ownerScope: owner,
      operationId: "synthetic-seed-operation",
      mutation: {
        idempotencyKey: "synthetic-seed-operation",
        entityType: "quote",
        entityId: quote().id,
        operationKind: "upsert",
        expectedVersion: 0,
        payload: JSON.parse(JSON.stringify(quote())),
      },
      storage,
      now: () => now,
    });
    await drainCentralBusinessDurableQueue({
      ownerScope: owner,
      storage,
      mutate: async () => ({
        ok: true,
        schema: "CENTRAL_BUSINESS_MUTATION_CLIENT_V1",
        status: "committed",
        eventId: "seed-event",
        eventSequence: 1,
        entityVersion: 1,
        deleted: false,
        contentHash: hash,
      }),
    });
  }
  const commit = vi.fn((expected, transition) => {
    expect(expected).toBe(data);
    data = transition.data;
    return {
      status: "applied" as const,
      data,
      value: transition.value,
      replayed: false,
    };
  });
  const mutate = vi.fn(async (input: CentralBusinessBrowserMutationInput) => ({
    ok: true as const,
    schema: "CENTRAL_BUSINESS_MUTATION_CLIENT_V1" as const,
    status: "committed" as const,
    eventId: `event-${++version}`,
    eventSequence: version,
    entityVersion: version,
    deleted: input.operationKind === "delete",
    contentHash: hash,
  }));
  const dependencies = {
    storage,
    getCurrentData: () => data,
    commitLocal: commit,
    commitCentral: commit,
    mutate,
    syncEventsBeforeWrite: vi.fn(async () => ({
      ok: true as const,
      schema: "CENTRAL_BUSINESS_EVENTS_APP_DATA_SYNC_V1" as const,
      pulled: 0,
      applied: 0,
      skipped: 0,
      nextSequence: 1,
      hasMore: false,
    })),
    fetchStatus: vi.fn(async () => ready()),
    now: () => now,
    createId: () => crypto.randomUUID(),
  };
  return { dependencies, getData: () => data, storage };
}

describe("central quote workflow", () => {
  it("confirma aceptar y desmarcar en servidor y reproduce ambos cambios en un segundo dispositivo", async () => {
    const target = await harness();
    let second: AppData = { ...EMPTY_DATA, documents: [quote()] };
    for (const [index, action] of (
      ["accept", "unaccept", "reject", "unreject"] as const
    ).entries()) {
      const result = await changeQuoteWorkflowWithCentralAuthority({
        userId: owner,
        quoteId: quote().id,
        action,
        dependencies: target.dependencies,
      });
      expect(result.ok).toBe(true);
      expect(result).toMatchObject({ delivery: "central_confirmed" });
      const mutation = target.dependencies.mutate.mock.calls[index]?.[0];
      expect(mutation).toMatchObject({
        entityType: "quote",
        entityId: quote().id,
        operationKind: "upsert",
        expectedVersion: index + 1,
      });
      second = buildCentralBusinessEventAppDataTransition({
        data: second,
        event: {
          schema: "CENTRAL_BUSINESS_EVENTS_RPC_ADAPTER_V1",
          actorDeviceId: "synthetic-pc",
          eventId: `event-${index + 2}`,
          eventSequence: index + 2,
          entityType: "quote",
          entityId: quote().id,
          entityVersion: index + 2,
          operationKind: "upsert",
          contentHash: hash,
          payload: mutation!.payload,
          createdAt: now,
        },
        knownVersion: {
          entityType: "quote",
          entityId: quote().id,
          version: index + 1,
          contentHash: hash,
          deleted: false,
        },
      }).data;
      expect(second.documents[0]).toEqual(
        JSON.parse(JSON.stringify(target.getData().documents[0])),
      );
      expect(second.documents[0].acceptanceStatus).toBe(
        action === "accept"
          ? "accepted"
          : action === "reject"
            ? "rejected"
            : "pending",
      );
      expect(second.documents[0].number).toBe(quote().number);
      expect(second.documents[0].items).toEqual(quote().items);
    }
    expect(
      loadCentralBusinessDurableQueue(owner, target.storage)
        .lastAppliedEventSequence,
    ).toBe(0);
    expect(
      loadCentralBusinessDurableQueue("other-company", target.storage)
        .entityVersions,
    ).toEqual({});
  });

  it("no muestra el verde ni modifica la caché mientras espera confirmación y commit asíncrono", async () => {
    const target = await harness();
    let releaseServer!: () => void;
    let releaseCache!: () => void;
    const serverWait = new Promise<void>((resolve) => {
      releaseServer = resolve;
    });
    const cacheWait = new Promise<void>((resolve) => {
      releaseCache = resolve;
    });
    const mutate = target.dependencies.mutate;
    const commit = target.dependencies.commitCentral;
    target.dependencies.mutate = vi.fn(
      async (input: CentralBusinessBrowserMutationInput) => {
        await serverWait;
        return mutate(input);
      },
    );
    const pending = changeQuoteWorkflowWithCentralAuthority({
      userId: owner,
      quoteId: quote().id,
      action: "accept",
      dependencies: {
        ...target.dependencies,
        commitCentral: async (expected, transition) => {
          await cacheWait;
          return commit(expected, transition);
        },
      },
    });
    await vi.waitFor(() =>
      expect(target.dependencies.mutate).toHaveBeenCalledOnce(),
    );
    expect(target.getData().documents[0].status).toBe("enviado");
    releaseServer();
    await vi.waitFor(() =>
      expect(
        loadCentralBusinessDurableQueue(owner, target.storage).entityVersions[
          "quote:quote-synthetic"
        ].version,
      ).toBe(2),
    );
    expect(commit).not.toHaveBeenCalled();
    releaseCache();
    expect(await pending).toMatchObject({
      ok: true,
      delivery: "central_confirmed",
    });
    expect(target.getData().documents[0].status).toBe("aceptado");
  });

  it.each(["offline", "conflict"])(
    "no confirma la marca ante %s",
    async (failure) => {
      const target = await harness();
      const original = target.getData();
      const result = await changeQuoteWorkflowWithCentralAuthority({
        userId: owner,
        quoteId: quote().id,
        action: "accept",
        dependencies: {
          ...target.dependencies,
          mutate: async () => ({
            ok: false,
            status: failure === "offline" ? 0 : 409,
            code:
              failure === "offline"
                ? "NETWORK_ERROR"
                : "CENTRAL_BUSINESS_VERSION_CONFLICT",
            message: "synthetic rejection",
            retryable: failure === "offline",
            conflict: failure === "conflict",
          }),
        },
      });
      expect(result.ok).toBe(false);
      expect(target.getData()).toBe(original);
      expect(target.dependencies.commitCentral).not.toHaveBeenCalled();
    },
  );

  it("bloquea una empresa central sin versión; no crea otro presupuesto ni usa fallback", async () => {
    const target = await harness(false);
    const result = await changeQuoteWorkflowWithCentralAuthority({
      userId: owner,
      quoteId: quote().id,
      action: "accept",
      dependencies: target.dependencies,
    });
    expect(result).toMatchObject({
      ok: false,
      error: expect.stringContaining("versión central"),
    });
    expect(target.dependencies.mutate).not.toHaveBeenCalled();
    expect(target.dependencies.commitLocal).not.toHaveBeenCalled();
  });

  it("conserva el guardado local para planes sin nube", async () => {
    const target = await harness(false);
    const result = await changeQuoteWorkflowWithCentralAuthority({
      userId: null,
      quoteId: quote().id,
      action: "accept",
      dependencies: target.dependencies,
    });
    expect(result).toMatchObject({ ok: true, delivery: "local" });
    expect(target.dependencies.mutate).not.toHaveBeenCalled();
    expect(target.getData().documents[0].status).toBe("aceptado");
  });

  it("preserva snapshots y bloquea facturas, borradores, IDs duplicados o integridad inválida", () => {
    const sealed = issueDocument(
      { ...quote(), status: "borrador" },
      EMPTY_DATA.profile,
      now,
    );
    const prepared = prepareQuoteWorkflowTransition(
      { ...EMPTY_DATA, documents: [sealed] },
      sealed.id,
      "accept",
      now,
    );
    expect(prepared.ok).toBe(true);
    if (!prepared.ok) throw new Error("expected valid transition");
    expect(prepared.transition.value.documentSnapshot).toBe(
      sealed.documentSnapshot,
    );
    expect(prepared.transition.value.pdfSnapshot).toBe(sealed.pdfSnapshot);
    expect(prepared.transition.value.snapshotSeal).toBe(sealed.snapshotSeal);
    for (const documents of [
      [{ ...quote(), type: "factura" as const }],
      [{ ...quote(), status: "borrador" as const }],
      [quote(), quote()],
      [{ ...sealed, snapshotSeal: undefined }],
    ])
      expect(
        prepareQuoteWorkflowTransition(
          { ...EMPTY_DATA, documents },
          quote().id,
          "accept",
          now,
        ).ok,
      ).toBe(false);
  });

  it("cablea botones, gate de empresa, persistencia verificada y errores sin recargar formularios", () => {
    const hook = readFileSync(
      new URL("../../hooks/useCentralQuoteWorkflow.ts", import.meta.url),
      "utf8",
    );
    expect(hook).toContain("useCentralAuthorityPlanGate");
    expect(hook).toContain("commitPreparedCentralBusinessAppDataDurably");
    const source = readFileSync(
      new URL("../../context/AppStore.tsx", import.meta.url),
      "utf8",
    );
    const bridge = source.slice(
      source.indexOf("const commitPreparedCentralBusinessAppDataDurably"),
      source.indexOf("const mergeHistoricalWorkspaceArchiveDurably"),
    );
    expect(bridge).toContain("commitCentralAppDataAsync");
    expect(bridge).toContain("trackLegacyChanges: false");
    for (const name of ["MarkAsAcceptedButton", "MarkAsRejectedButton"]) {
      const button = readFileSync(
        new URL(`../../components/documents/${name}.tsx`, import.meta.url),
        "utf8",
      );
      expect(button).toContain("await changeWorkflow");
      expect(button).toContain('role="alert"');
      expect(button).toContain("disabled={pending}");
      expect(button).not.toContain("useAppStore");
      expect(button).not.toMatch(/location\.reload|router\.refresh/);
    }
  });
});
