import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { describe, expect, it, vi } from "vitest";
import { EMPTY_DATA } from "@/lib/types";
import * as health from "@/lib/central-authority/sync-health";
import { runCloudSyncSingleFlight } from "@/lib/cloud/sync-single-flight";

const source = readFileSync(new URL("./CloudSyncContext.tsx", import.meta.url), "utf8");
type Outcome = Parameters<typeof health.recordCentralSyncOutcome>[2];
interface View {
  syncStatus: string;
  syncMessage: string | null;
  syncNow: () => Promise<boolean>;
  reportCentralSyncOutcome: (owner: string, area: health.CentralSyncArea, outcome: Outcome) => void;
}

function provider() {
  let stateIndex = 0;
  let refIndex = 0;
  const states: unknown[] = [];
  const refs: Array<{ current: unknown }> = [];
  const scope = { owner: "synthetic-company-a" };
  const company = { id: scope.owner, billingOwnerUserId: "synthetic-user" };
  const register = vi.fn().mockResolvedValue({ allowed: true, devices: [] });
  const business = vi.fn().mockResolvedValue({ ok: true, hasMore: false });
  const invoices = vi.fn().mockResolvedValue({ status: "applied", value: { localSync: { ok: true, pulledEvents: 0 } } });
  const fiscal = vi.fn().mockResolvedValue({ ok: true });
  const react = {
    createContext: () => ({ Provider: "provider" }),
    useState: (initial: unknown) => {
      const index = stateIndex++;
      if (!(index in states)) states[index] = initial;
      return [states[index], (next: unknown) => {
        states[index] = typeof next === "function" ? next(states[index]) : next;
      }];
    },
    useRef: (initial: unknown) => refs[refIndex++] ?? (refs[refIndex - 1] = { current: initial }),
    useCallback: (fn: unknown) => fn,
    useMemo: (fn: () => unknown) => fn(),
    useEffect: () => {},
  };
  const exports: { CloudSyncProvider?: (props: { children: null }) => { props: { value: View } } } = {};
  runInNewContext(ts.transpileModule(source, { compilerOptions: {
    jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS,
  } }).outputText, {
    exports, navigator: { onLine: true },
    require: (id: string) => {
      if (id === "react") return react;
      if (id === "react/jsx-runtime") return { jsx: (_: unknown, props: unknown) => ({ props }) };
      if (id.endsWith("context/AppStore")) return { useAppStore: () => ({
        data: EMPTY_DATA, ready: true, getCurrentData: () => EMPTY_DATA,
        syncCentralBusinessEvents: business, syncCentralInvoiceAuthorityEvents: invoices,
        syncFiscalNotificationsWorkspace: fiscal,
      }) };
      if (id.endsWith("context/CloudAuthContext")) return { useCloudAuth: () => ({
        cloudEnabled: true, authReady: true, user: { id: "synthetic-user", email: "test@example.test" },
      }) };
      if (id.endsWith("context/CompanyContext")) return { useCompany: () => ({ activeCompany: company }) };
      if (id.endsWith("context/WorkspaceStorageContext")) return { useWorkspaceStorage: () => ({ ownerScope: "synthetic-company-a" }) };
      if (id.endsWith("billing/cloud-access")) return { canUseCloudForUser: async () => ({ allowed: true }) };
      if (id.endsWith("useDemoWorkspaceMode")) return { useDemoWorkspaceMode: () => false };
      if (id.endsWith("email-confirmation")) return { isUserEmailConfirmed: () => true };
      if (id.endsWith("workspace-owner-runtime")) return { isActiveWorkspaceOwnerScope: (owner: string) => owner === scope.owner };
      if (id.endsWith("central-authority/sync-health")) return health;
      if (id.endsWith("cloud/sync-single-flight")) return { runCloudSyncSingleFlight };
      if (id.endsWith("cloud/device-client")) return { registerCurrentCloudDevice: register };
      return {};
    },
  });
  function render() {
    stateIndex = 0; refIndex = 0;
    return exports.CloudSyncProvider!({ children: null }).props.value;
  }
  return { render, scope, register, business, invoices, fiscal };
}

describe("cloud status follows verified reception", () => {
  it("removes Reintentar after device access is actually recovered by a central read", () => {
    const f = provider();
    f.render().reportCentralSyncOutcome(f.scope.owner, "device", { ok: false, message: "Device request failed" });
    expect(f.render().syncStatus).toBe("error");
    f.render().reportCentralSyncOutcome(f.scope.owner, "business", { ok: true });
    expect(f.render().syncStatus).toBe("synced");
    expect(f.render().syncMessage).toBe("Servidor central comprobado.");
  });

  it("preserves a real invoice failure when customers synchronize successfully", () => {
    const f = provider();
    const view = f.render();
    view.reportCentralSyncOutcome(f.scope.owner, "device", { ok: false, message: "Device failed" });
    view.reportCentralSyncOutcome(f.scope.owner, "invoices", { ok: false, message: "Invoice receipt failed" });
    view.reportCentralSyncOutcome(f.scope.owner, "business", { ok: true });
    expect(f.render().syncStatus).toBe("error");
    expect(f.render().syncMessage).toBe("Invoice receipt failed");
    view.reportCentralSyncOutcome(f.scope.owner, "invoices", { ok: true });
    expect(f.render().syncStatus).toBe("synced");
  });

  it("does not publish an old company's completion", () => {
    const f = provider();
    const old = f.render();
    old.reportCentralSyncOutcome(f.scope.owner, "invoices", { ok: false, message: "Still failed" });
    f.scope.owner = "synthetic-company-b";
    old.reportCentralSyncOutcome("synthetic-company-a", "invoices", { ok: true });
    expect(f.render().syncMessage).toBe("Still failed");
  });

  it("reconciles a successful manual sync with the same indicator", async () => {
    const f = provider();
    f.render().reportCentralSyncOutcome(f.scope.owner, "device", { ok: false, message: "Previous failure" });
    expect(await f.render().syncNow()).toBe(true);
    expect(f.render().syncStatus).toBe("synced");
    expect(f.business).toHaveBeenCalledOnce();
    expect(f.invoices).toHaveBeenCalledOnce();
    expect(f.fiscal).toHaveBeenCalledOnce();
  });

  it("does not claim success for a partial manual sync, and clears only its later recovery", async () => {
    const f = provider();
    f.fiscal.mockResolvedValueOnce({ ok: false, message: "Fiscal head failed" });
    expect(await f.render().syncNow()).toBe(false);
    expect(f.render().syncStatus).toBe("error");
    f.render().reportCentralSyncOutcome(f.scope.owner, "business", { ok: true });
    expect(f.render().syncMessage).toBe("Fiscal head failed");
    f.render().reportCentralSyncOutcome(f.scope.owner, "fiscal", { ok: true });
    expect(f.render().syncStatus).toBe("synced");
  });

  it("rereads one stale local baseline during manual sync without displaying a false failure", async () => {
    const f = provider();
    f.business.mockResolvedValueOnce({ ok: false, retryable: true, code: "CENTRAL_BUSINESS_LOCAL_WRITE_BLOCKED", message: "Concurrent local page" });
    f.invoices.mockResolvedValueOnce({ status: "blocked", reason: "stale_precondition" });
    expect(await f.render().syncNow()).toBe(true);
    expect(f.business).toHaveBeenCalledTimes(2);
    expect(f.invoices).toHaveBeenCalledTimes(2);
    expect(f.render().syncStatus).toBe("synced");
  });

  it("does not retry a real version conflict or rejected permission", async () => {
    const f = provider();
    f.business.mockResolvedValue({ ok: false, retryable: false, code: "VERSION_CONFLICT", message: "Needs review" });
    expect(await f.render().syncNow()).toBe(false);
    expect(f.business).toHaveBeenCalledOnce();
    expect(f.invoices).not.toHaveBeenCalled();
    expect(f.render().syncStatus).toBe("error");
  });
});
