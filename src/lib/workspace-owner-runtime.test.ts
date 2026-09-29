import { afterEach, describe, expect, it } from "vitest";

import {
  getActiveWorkspaceBillingOwnerScope,
  getActiveWorkspaceOwnerScope,
  isActiveWorkspaceOwnerScope,
  resolveActiveWorkspaceBillingOwnerScope,
  setActiveWorkspaceOwnerScope,
  workspaceScopedBrowserStorageKey,
} from "./workspace-owner-runtime";

describe("workspace owner runtime", () => {
  afterEach(() => setActiveWorkspaceOwnerScope(null));

  it("cambia de propietario sin reutilizar claves de la cuenta anterior", () => {
    setActiveWorkspaceOwnerScope("account-a");
    expect(getActiveWorkspaceOwnerScope()).toBe("account-a");
    expect(isActiveWorkspaceOwnerScope("account-a")).toBe(true);
    expect(workspaceScopedBrowserStorageKey("draft")).toBe(
      "draft:workspace:account-a",
    );

    setActiveWorkspaceOwnerScope("account-b");
    expect(isActiveWorkspaceOwnerScope("account-a")).toBe(false);
    expect(isActiveWorkspaceOwnerScope("account-b")).toBe(true);
    expect(workspaceScopedBrowserStorageKey("draft")).toBe(
      "draft:workspace:account-b",
    );
  });

  it("separa el ámbito de datos del titular que comparte plan y dispositivo", () => {
    setActiveWorkspaceOwnerScope("company-a", "billing-owner");

    expect(getActiveWorkspaceOwnerScope()).toBe("company-a");
    expect(getActiveWorkspaceBillingOwnerScope()).toBe("billing-owner");
    expect(resolveActiveWorkspaceBillingOwnerScope("company-a")).toBe(
      "billing-owner",
    );
    expect(resolveActiveWorkspaceBillingOwnerScope("another-company")).toBe(
      "another-company",
    );
    expect(workspaceScopedBrowserStorageKey("draft")).toBe(
      "draft:workspace:company-a",
    );
  });
});
