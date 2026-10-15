import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { commitAppDataDurably, type AppDataDurabilityResult } from "@/lib/app-data-durability";
import { EMPTY_DATA, type AppData, type Document } from "@/lib/types";
import { receiveConfirmedCentralInvoiceChange } from "./management-reception";
import { syncCentralInvoiceAuthorityEventsIntoAppData, type CentralInvoiceAuthorityEventsAppDataSyncValue } from "./events-app-data-sync";
import type { CentralInvoiceAuthorityEventsPullResult } from "./events-client";

const invoice: Document = {
  id: "synthetic-invoice", type: "factura", number: "F-2026-0001", date: "2026-10-15",
  status: "enviado", client: { name: "Cliente de prueba" }, items: [],
  createdAt: "2026-10-15T12:00:00.000Z", updatedAt: "2026-10-15T12:00:00.000Z",
  centralInvoiceAuthority: { schemaVersion: 1, source: "central_invoice_authority",
    serverDocumentId: "synthetic-server", identityId: "synthetic-identity", outboxEventId: "issue-event",
    eventType: "invoice_issued", fullNumber: "F-2026-0001", sequence: 1, documentVersion: 1,
    receivedAt: "2026-10-15T12:00:00.000Z" },
};
const deletion: CentralInvoiceAuthorityEventsPullResult = {
  ok: true, schema: "CENTRAL_INVOICE_AUTHORITY_EVENTS_CLIENT_V1", nextCursor: null,
  events: [{ schema: "CENTRAL_INVOICE_AUTHORITY_EVENTS_RPC_ADAPTER_V1", eventId: "delete-event",
    documentId: "synthetic-server", identityId: "synthetic-identity", eventType: "invoice_deleted",
    documentVersion: 2, fullNumber: invoice.number, sequence: 1,
    createdAt: "2026-10-15T13:00:00.000Z", emittedHash: "tombstone-hash", safeSummary: {},
    documentPayload: { deleted: true, localDocumentId: invoice.id } }],
};
type Reception = AppDataDurabilityResult<CentralInvoiceAuthorityEventsAppDataSyncValue>;

function harness() {
  let data: AppData = { ...EMPTY_DATA, documents: [invoice] };
  let isCurrent = true;
  const results: Reception[] = [];
  const pull = vi.fn(async (): Promise<CentralInvoiceAuthorityEventsPullResult> => deletion);
  const syncEvents = vi.fn(async (expected: AppData, options: { eventId: string }): Promise<Reception> => {
    const transition = await syncCentralInvoiceAuthorityEventsIntoAppData(
      { data: expected, eventId: options.eventId }, { pullEvents: pull });
    const result = commitAppDataDurably({ expected, getCurrent: () => data,
      trackLegacyChanges: false, build: () => transition, persist: () => ({ status: "applied" }) });
    results.push(result);
    if (result.status === "applied") data = result.data;
    return result;
  });
  return {
    pull, results, syncEvents, getCurrentData: () => data,
    change: (build: (current: AppData) => AppData) => { data = build(data); },
    changeWorkspace: () => { isCurrent = false; },
    receive: (action: "delete" | "update" = "delete") => receiveConfirmedCentralInvoiceChange({
      action, document: invoice, eventId: "delete-event", isCurrent: () => isCurrent,
      getCurrentData: () => data, syncEvents,
    }),
  };
}

describe("confirmed invoice change reception", () => {
  it("reproduces the stale first commit and receives the deletion without repeating the server command", async () => {
    const h = harness();
    h.pull.mockImplementationOnce(async () => {
      // A different central stream commits while the invoice event is in flight.
      h.change((data) => ({ ...data, profile: { ...data.profile, name: "Cambio operativo concurrente" } }));
      return deletion;
    });
    await expect(h.receive()).resolves.toBeNull();
    expect(h.results[0]).toEqual({ status: "blocked", reason: "stale_precondition" });
    expect(h.syncEvents).toHaveBeenCalledTimes(2);
    expect(h.syncEvents.mock.calls.map(([, options]) => options.eventId)).toEqual(["delete-event", "delete-event"]);
    expect(h.syncEvents.mock.calls[1][0].profile.name).toBe("Cambio operativo concurrente");
    expect(h.getCurrentData().profile.name).toBe("Cambio operativo concurrente");
    expect(h.getCurrentData().documents).toEqual([]);
  });

  it("retries a transient read failure, but not an authorization failure or local conflict", async () => {
    const h = harness();
    h.pull.mockResolvedValueOnce({ ok: false,
      code: "NETWORK_ERROR", message: "Sin respuesta", status: 0 });
    await expect(h.receive()).resolves.toBeNull();
    expect(h.syncEvents).toHaveBeenCalledTimes(2);
    for (const status of [401, 403, 409]) {
      const rejected = harness();
      rejected.pull.mockResolvedValue({ ok: false,
        code: "REJECTED", message: "Rechazado", status });
      await expect(rejected.receive()).rejects.toThrow("no hace falta volver a borrar");
      expect(rejected.syncEvents).toHaveBeenCalledTimes(1);
      expect(rejected.getCurrentData().documents).toEqual([invoice]);
    }
  });

  it("bounds retries and never forces unknown durable state or a quota failure", async () => {
    for (const result of [
      { status: "blocked", reason: "stale_precondition" },
      { status: "blocked", reason: "quota_exceeded" },
      { status: "indeterminate", reason: "storage_state_unknown" },
    ] as const) {
      const h = harness();
      h.syncEvents.mockResolvedValue(result);
      await expect(h.receive()).rejects.toThrow("El servidor confirmó el borrado");
      expect(h.syncEvents).toHaveBeenCalledTimes(result.reason === "stale_precondition" ? 3 : 1);
      expect(h.getCurrentData().documents).toEqual([invoice]);
    }
  });

  it("does not receive an old company's event after changing workspace", async () => {
    const h = harness();
    h.syncEvents.mockImplementationOnce(async () => {
      h.changeWorkspace();
      return { status: "blocked", reason: "stale_precondition" };
    });
    await expect(h.receive()).rejects.toThrow("has cambiado de empresa");
    expect(h.syncEvents).toHaveBeenCalledTimes(1);
    expect(h.getCurrentData().documents).toEqual([invoice]);
  });

  it("cannot delete a new invoice just because it reuses the released number", async () => {
    const h = harness();
    const reused: Document = { ...invoice, id: "new-local-id", centralInvoiceAuthority: {
      ...invoice.centralInvoiceAuthority!, serverDocumentId: "new-server-id", identityId: "new-identity-id" } };
    h.change((data) => ({ ...data, documents: [invoice, reused] }));
    await h.receive();
    expect(h.getCurrentData().documents).toEqual([reused]);
  });

  it("does not report success for a skipped or malformed tombstone", async () => {
    const h = harness();
    h.pull.mockResolvedValue({ ...deletion, events: deletion.events.map((event) => ({
      ...event, documentPayload: { deleted: true, localDocumentId: "different-local-id" },
    })) });
    await expect(h.receive()).rejects.toThrow("falta recibirlo aquí");
    expect(h.syncEvents).toHaveBeenCalledTimes(1);
    expect(h.getCurrentData().documents).toEqual([invoice]);
  });

  it("only confirms an update after receiving a newer version of the same technical identity", async () => {
    const h = harness();
    h.syncEvents.mockImplementationOnce(async () => {
      h.change((data) => ({ ...data, documents: [{ ...invoice, centralInvoiceAuthority: {
        ...invoice.centralInvoiceAuthority!, documentVersion: 2 } }] }));
      const transition = await syncCentralInvoiceAuthorityEventsIntoAppData(
        { data: h.getCurrentData(), eventId: "delete-event" },
        { pullEvents: async () => ({ ...deletion, events: [] }) });
      return { status: "applied", data: transition.data, value: transition.value, replayed: false };
    });
    await expect(h.receive("update")).resolves.toMatchObject({
      id: invoice.id, centralInvoiceAuthority: { documentVersion: 2 } });
  });

  it("wires both management actions to reception instead of a one-shot pull", () => {
    const store = readFileSync(new URL("../../context/AppStore.tsx", import.meta.url), "utf8");
    expect(store.match(/await receiveConfirmedCentralInvoiceChange\(/g)).toHaveLength(2);
    expect(store).not.toContain("await syncCentralInvoiceAuthorityEvents(dataRef.current, { eventId })");
  });
});
