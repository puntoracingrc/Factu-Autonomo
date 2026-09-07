import { afterEach, describe, expect, it } from "vitest";

import {
  getActiveWorkspaceOwnerScope,
  isActiveWorkspaceOwnerScope,
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
});
