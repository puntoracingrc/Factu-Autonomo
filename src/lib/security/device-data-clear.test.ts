import { describe, expect, it } from "vitest";
import { clearSecondaryDeviceData } from "./device-data-clear";
import { cloudDeviceTokenStorageKey } from "@/lib/cloud/device-token";
import { workspaceScopedBrowserStorageKey } from "@/lib/workspace-owner-runtime";

class TestStorage {
  private readonly values = new Map<string, string>();

  get length() {
    return this.values.size;
  }

  key(index: number) {
    return Array.from(this.values.keys())[index] ?? null;
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  removeItem(key: string) {
    this.values.delete(key);
  }

  clear() {
    this.values.clear();
  }
}

describe("clearSecondaryDeviceData", () => {
  it("retira datos secundarios sensibles sin borrar preferencias ajenas", () => {
    const local = new TestStorage();
    const session = new TestStorage();
    const scoped = (key: string, owner = "user-1") =>
      workspaceScopedBrowserStorageKey(key, owner);
    local.setItem(scoped("fa_rentabilidad_real_wizard_answers"), "privado");
    local.setItem(scoped("factura-autonomo-drive-backup"), "drive");
    local.setItem(cloudDeviceTokenStorageKey("user-1"), "token-local");
    local.setItem("factura-autonomo-local-data-handoff:user-1", "synced");
    local.setItem(
      scoped("fa_rentabilidad_real_wizard_answers", "user-2"),
      "otra-cuenta",
    );
    local.setItem("factu-feature-used:dashboard", "1");
    session.setItem("factura-autonomo-drive-access-token", "secreto");
    session.setItem(scoped("factu-quick-post-it-v1"), "propio");
    session.setItem(scoped("factu-quick-post-it-v1", "user-2"), "conservar");

    const result = clearSecondaryDeviceData("user-1", local, session);

    expect(result.ok).toBe(true);
    expect(local.getItem(scoped("fa_rentabilidad_real_wizard_answers"))).toBeNull();
    expect(local.getItem(scoped("factura-autonomo-drive-backup"))).toBeNull();
    expect(local.getItem(cloudDeviceTokenStorageKey("user-1"))).toBeNull();
    expect(
      local.getItem("factura-autonomo-local-data-handoff:user-1"),
    ).toBeNull();
    expect(
      local.getItem(
        scoped("fa_rentabilidad_real_wizard_answers", "user-2"),
      ),
    ).toBe("otra-cuenta");
    expect(local.getItem("factu-feature-used:dashboard")).toBe("1");
    expect(session.getItem("factura-autonomo-drive-access-token")).toBe(
      "secreto",
    );
    expect(session.getItem(scoped("factu-quick-post-it-v1"))).toBeNull();
    expect(session.getItem(scoped("factu-quick-post-it-v1", "user-2"))).toBe(
      "conservar",
    );
  });
});
