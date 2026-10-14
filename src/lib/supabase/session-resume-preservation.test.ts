import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { describe, expect, it, vi } from "vitest";

const auth = readFileSync("src/context/CloudAuthContext.tsx", "utf8");
const company = readFileSync("src/context/CompanyContext.tsx", "utf8");
const boundary = readFileSync("src/components/workspace/WorkspaceStorageBoundary.tsx", "utf8");

// Exercise the real auth callback without requiring a browser DOM or network.
// React rendering/mount preservation is additionally checked in the browser.
function authCallback() {
  const runtimeScope = { owner: null as string | null };
  const clearDrive = vi.fn();
  const publishedUsers: unknown[] = [];
  let stateIndex = 0;
  const react = {
    createContext: () => ({ Provider: "provider" }),
    useState: (initial: unknown) => {
      const index = stateIndex++;
      return [initial, (value: unknown) => { if (index === 1) publishedUsers.push(value); }];
    },
    useRef: (current: unknown) => ({ current }),
    useCallback: (fn: unknown) => fn,
    useMemo: (fn: () => unknown) => fn(),
    useEffect: () => {},
  };
  const exports: { CloudAuthProvider?: (props: { children: null }) => { props: { value: { setAuthenticatedUser: (user: {id:string;email?:string}|null) => void } } } } = {};
  runInNewContext(ts.transpileModule(auth, {compilerOptions: {
    jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS,
  }}).outputText, {
    exports,
    require: (id: string) => {
      if (id === "react") return react;
      if (id === "react/jsx-runtime") return { jsx: (_: unknown, props: unknown) => ({ props }) };
      if (id.endsWith("google-drive/backup")) return { clearDriveAccessToken: clearDrive };
      if (id.endsWith("supabase/config")) return { isCloudEnabled: () => true };
      if (id.endsWith("workspace-owner-runtime")) return { setActiveWorkspaceOwnerScope: (owner: string|null) => { runtimeScope.owner = owner; } };
      return {};
    },
  });
  const update = exports.CloudAuthProvider!({children:null}).props.value.setAuthenticatedUser;
  return { update, runtimeScope, clearDrive, publishedUsers };
}

describe("foreground session renewal preserves the mounted workspace", () => {
  it("does not redirect a renewed SL session back to its billing owner's scope", () => {
    const f = authCallback();
    f.update({id:"synthetic-user-a",email:"first@example.test"});
    f.runtimeScope.owner = "synthetic-sl-company"; // selected by the boundary
    f.update({id:"synthetic-user-a",email:"updated@example.test"});
    expect(f.runtimeScope.owner).toBe("synthetic-sl-company");
    expect(f.clearDrive).toHaveBeenCalledOnce();
    expect(f.publishedUsers).toHaveLength(2); // metadata is still refreshed
  });

  it("invalidates the old company's scope immediately on real account switch or logout", () => {
    const f = authCallback();
    f.update({id:"synthetic-user-a"});
    f.runtimeScope.owner = "synthetic-sl-company";
    f.update({id:"synthetic-user-b"});
    expect(f.runtimeScope.owner).toBe("synthetic-user-b");
    f.update(null);
    expect(f.runtimeScope.owner).toBeNull();
    expect(f.publishedUsers.at(-1)).toBeNull();
    expect(f.clearDrive).toHaveBeenCalledTimes(3);
  });

  it("only resets runtime company ownership and Drive on an actual account change", () => {
    expect(auth).toMatch(/if \(authenticatedOwnerRef\.current !== nextOwner\) \{\s*clearDriveAccessToken\(\);[\s\S]*?setActiveWorkspaceOwnerScope\(nextOwner\);\s*\}/);
    // Keep publishing real user updates and SIGNED_OUT; never suppress auth events.
    expect(auth).toContain("setUser(next)");
    expect(auth).toContain("recoverPersistentSession({");
  });

  it("loads company membership by account identity, not the refreshed User object", () => {
    expect(company).toContain("const userId = user?.id ?? null");
    expect(company).toContain("}, [authReady, userId])");
    expect(company).not.toContain("}, [authReady, user])");
    expect(company).toContain("loadSequence.current !== sequence");
  });

  it("resolves local isolation by account/company identity, not auth object allocation", () => {
    const resolveDependencies = boundary.match(/\}, \[\s*authReady,[\s\S]*?\]\);/)?.[0];
    expect(resolveDependencies).toContain("userId,");
    expect(resolveDependencies).not.toMatch(/\n\s*user,/);
    expect(boundary).toContain("state.scope.ownerScope === ownerId");
    expect(boundary).toContain("resolutionSequence.current !== sequence");
  });

  it("keeps realtime resume wakeups and server session verification", () => {
    for (const path of [
      "src/components/cloud/CentralBusinessAuthorityEventsAutoSync.tsx",
      "src/components/cloud/CentralInvoiceAuthorityEventsAutoSync.tsx",
    ]) {
      const source = readFileSync(path, "utf8");
      expect(source).toContain('window.addEventListener("focus", wake)');
      expect(source).toContain('document.addEventListener("visibilitychange", wake)');
      expect(source).not.toContain("location.reload");
    }
    expect(readFileSync("src/lib/billing/server-auth.ts", "utf8")).toContain(".getUser(token)");
  });
});
