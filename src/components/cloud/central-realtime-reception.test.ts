import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EMPTY_DATA } from "@/lib/types";

// These components render nothing. Exercise their real effect/timer/channel
// callbacks with a small hook harness, without a browser or real customer data.
const h = vi.hoisted(() => ({
  effects: [] as Array<() => void | (() => void)>,
  cleanups: [] as Array<() => void>,
  channels: new Map<string, {
    listeners: Map<string, (message?: unknown) => void>;
    status: (status: string) => void;
  }>(),
  business: vi.fn(),
  invoices: vi.fn(),
  fiscal: vi.fn(),
  report: vi.fn(),
  data: {} as typeof EMPTY_DATA,
}));

vi.mock("react", () => ({
  useRef: (current: unknown) => ({ current }),
  useEffect: (effect: () => void | (() => void)) => { h.effects.push(effect); },
}));
vi.mock("@/context/AppStore", () => ({ useAppStore: () => ({
  data: h.data, ready: true, syncCentralBusinessEvents: h.business,
  syncCentralInvoiceAuthorityEvents: h.invoices, syncFiscalNotificationsWorkspace: h.fiscal,
}) }));
vi.mock("@/context/CloudSyncContext", () => ({ useCloudSync: () => ({
  cloudEnabled: true, emailConfirmed: true, reportCentralSyncOutcome: h.report,
}) }));
vi.mock("@/hooks/useCentralAuthorityPlanGate", () => ({ useCentralAuthorityPlanGate: () => ({
  mode: "central", centralUserId: "11111111-1111-4111-8111-111111111111",
  authenticatedUserId: "11111111-1111-4111-8111-111111111111",
}) }));
vi.mock("@/lib/supabase/client", () => ({ getSupabaseClientAsync: async () => ({
  realtime: { setAuth: async () => {} },
  channel: (name: string) => {
    const state = { listeners: new Map<string, (message?: unknown) => void>(), status: (status: string) => { void status; } };
    h.channels.set(name.startsWith("central-business:") ? "business" : "invoices", state);
    const channel = {
      on(_kind: string, config: { event: string }, callback: (message?: unknown) => void) {
        state.listeners.set(config.event, callback);
        return channel;
      },
      subscribe(callback: (status: string) => void) {
        state.status = callback;
        callback("SUBSCRIBED");
        return channel;
      },
      unsubscribe() {},
    };
    return channel;
  },
}) }));

const businessOk = () => ({ ok: true, hasMore: false, pulled: 0, applied: 0, skipped: 0, nextSequence: 0 });
const invoiceOk = () => ({ status: "applied", value: { localSync: { ok: true, pulledEvents: 0, conflicts: [] } } });

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}

async function mount() {
  const { CentralBusinessAuthorityEventsAutoSync } = await import("./CentralBusinessAuthorityEventsAutoSync");
  const { CentralInvoiceAuthorityEventsAutoSync } = await import("./CentralInvoiceAuthorityEventsAutoSync");
  CentralBusinessAuthorityEventsAutoSync();
  CentralInvoiceAuthorityEventsAutoSync();
  for (const effect of h.effects) {
    const cleanup = effect();
    if (cleanup) h.cleanups.push(cleanup);
  }
  await vi.advanceTimersByTimeAsync(150);
}

function businessSignal() {
  h.channels.get("business")!.listeners.get("central_business_changed")!();
}

describe("quiet realtime reception", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-20T10:00:00Z"));
    vi.stubEnv("NEXT_PUBLIC_CENTRAL_BUSINESS_EVENTS_AUTO_SYNC_ENABLED", "true");
    vi.stubEnv("NEXT_PUBLIC_CENTRAL_BUSINESS_EVENTS_REALTIME_WAKEUPS_ENABLED", "true");
    vi.stubEnv("NEXT_PUBLIC_CENTRAL_BUSINESS_EVENTS_REALTIME_WAKEUPS_USER_IDS", "11111111-1111-4111-8111-111111111111");
    vi.stubEnv("NEXT_PUBLIC_CENTRAL_INVOICE_AUTHORITY_EVENTS_AUTO_SYNC", "true");
    vi.stubEnv("NEXT_PUBLIC_CENTRAL_INVOICE_AUTHORITY_EVENTS_REALTIME_WAKEUPS", "true");
    h.effects = []; h.cleanups = []; h.channels.clear();
    h.report.mockReset();
    h.business.mockReset().mockImplementation(async () => businessOk());
    h.invoices.mockReset().mockImplementation(async () => invoiceOk());
    h.fiscal.mockReset().mockResolvedValue({ ok: true, pushed: 0, pulled: 0, applied: 0 });
    h.data = { ...EMPTY_DATA };
    const win = Object.assign(new EventTarget(), { setTimeout, clearTimeout });
    const doc = Object.assign(new EventTarget(), { visibilityState: "visible" });
    vi.stubGlobal("window", win);
    vi.stubGlobal("document", doc);
    vi.stubGlobal("navigator", { onLine: true });
  });

  afterEach(() => {
    for (const cleanup of h.cleanups.reverse()) cleanup();
    vi.clearAllTimers(); vi.useRealTimers(); vi.unstubAllGlobals(); vi.unstubAllEnvs();
  });

  it("does not refetch on a brief foreground burst but receives genuine changes within the coalescing window", async () => {
    await mount();
    const initialBusiness = h.business.mock.calls.length;
    const initialInvoices = h.invoices.mock.calls.length;
    expect(initialBusiness).toBeGreaterThan(0);
    expect(initialInvoices).toBeGreaterThan(0);
    window.dispatchEvent(new Event("focus"));
    window.dispatchEvent(new Event("pageshow"));
    document.dispatchEvent(new Event("visibilitychange"));
    await vi.advanceTimersByTimeAsync(100);
    expect(h.business).toHaveBeenCalledTimes(initialBusiness);
    expect(h.invoices).toHaveBeenCalledTimes(initialInvoices);
    businessSignal(); businessSignal(); businessSignal();
    await vi.advanceTimersByTimeAsync(79);
    expect(h.business).toHaveBeenCalledTimes(initialBusiness);
    await vi.advanceTimersByTimeAsync(1);
    expect(h.business).toHaveBeenCalledTimes(initialBusiness + 1);
  });

  it("remembers notifications received while hidden, even after a brief app switch", async () => {
    await mount();
    const initial = h.business.mock.calls.length;
    Object.assign(document, { visibilityState: "hidden" });
    businessSignal();
    await vi.advanceTimersByTimeAsync(100);
    expect(h.business).toHaveBeenCalledTimes(initial);
    Object.assign(document, { visibilityState: "visible" });
    document.dispatchEvent(new Event("visibilitychange"));
    await vi.advanceTimersByTimeAsync(80);
    expect(h.business).toHaveBeenCalledTimes(initial + 1);
  });

  it("does not hold up business events while the auxiliary fiscal read is slow", async () => {
    const fiscal = deferred<{ ok: true }>();
    h.fiscal.mockImplementation(() => fiscal.promise);
    await mount();
    const initial = h.business.mock.calls.length;
    expect(h.fiscal).toHaveBeenCalledTimes(1);
    businessSignal();
    await vi.advanceTimersByTimeAsync(80);
    expect(h.business).toHaveBeenCalledTimes(initial + 1);
    expect(h.fiscal).toHaveBeenCalledTimes(1);
    fiscal.resolve({ ok: true });
    await vi.advanceTimersByTimeAsync(0);
  });

  it("does not lose a signal arriving during an in-flight page", async () => {
    await mount();
    const read = deferred<ReturnType<typeof businessOk>>();
    h.business.mockImplementationOnce(() => read.promise);
    const initial = h.business.mock.calls.length;
    businessSignal();
    await vi.advanceTimersByTimeAsync(80);
    businessSignal(); businessSignal();
    read.resolve(businessOk());
    await vi.advanceTimersByTimeAsync(1);
    expect(h.business).toHaveBeenCalledTimes(initial + 2);
  });

  it("does not let an auxiliary retry postpone an already pending realtime notification", async () => {
    const fiscal = deferred<{ ok: false; message: string }>();
    h.fiscal.mockImplementationOnce(() => fiscal.promise);
    await mount();
    const initial = h.business.mock.calls.length;
    businessSignal();
    fiscal.resolve({ ok: false, message: "Temporary fiscal failure" });
    await vi.advanceTimersByTimeAsync(80);
    expect(h.business).toHaveBeenCalledTimes(initial + 1);
  });

  it("keeps a hidden notification dirty when an older read completes afterwards", async () => {
    await mount();
    const read = deferred<ReturnType<typeof businessOk>>();
    h.business.mockImplementationOnce(() => read.promise);
    const initial = h.business.mock.calls.length;
    businessSignal();
    await vi.advanceTimersByTimeAsync(80);
    Object.assign(document, { visibilityState: "hidden" });
    businessSignal();
    read.resolve(businessOk());
    await vi.advanceTimersByTimeAsync(1);
    Object.assign(document, { visibilityState: "visible" });
    window.dispatchEvent(new Event("focus"));
    await vi.advanceTimersByTimeAsync(80);
    expect(h.business).toHaveBeenCalledTimes(initial + 2);
  });

  it("reports a failed invoice reception and the later verified recovery, without syncNow or a reload", async () => {
    h.invoices.mockResolvedValueOnce({ status: "blocked", reason: "quota_exceeded" });
    await mount();
    expect(h.report).toHaveBeenCalledWith(expect.any(String), "invoices", expect.objectContaining({ ok: false }));
    h.channels.get("invoices")!.listeners.get("INSERT")!();
    await vi.advanceTimersByTimeAsync(80);
    expect(h.report).toHaveBeenLastCalledWith(expect.any(String), "invoices", { ok: true });
  });

  it("ignores a completion from an unmounted company scope", async () => {
    const read = deferred<ReturnType<typeof invoiceOk>>();
    h.invoices.mockImplementation(() => read.promise);
    await mount();
    for (const cleanup of h.cleanups.splice(0).reverse()) cleanup();
    h.report.mockClear();
    read.resolve(invoiceOk());
    await vi.advanceTimersByTimeAsync(1);
    expect(h.report).not.toHaveBeenCalled();
  });
});
