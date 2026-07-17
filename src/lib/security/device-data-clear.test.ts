import { describe, expect, it } from "vitest";
import { clearSecondaryDeviceData } from "./device-data-clear";

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
    local.setItem("fa_rentabilidad_real_wizard_answers", "privado");
    local.setItem("factura-autonomo-drive-backup", "drive");
    local.setItem("factura-autonomo-local-data-handoff:user-1", "synced");
    local.setItem("factu-feature-used:dashboard", "1");
    session.setItem("factura-autonomo-drive-access-token", "secreto");

    const result = clearSecondaryDeviceData("user-1", local, session);

    expect(result.ok).toBe(true);
    expect(local.getItem("fa_rentabilidad_real_wizard_answers")).toBeNull();
    expect(local.getItem("factura-autonomo-drive-backup")).toBeNull();
    expect(
      local.getItem("factura-autonomo-local-data-handoff:user-1"),
    ).toBeNull();
    expect(local.getItem("factu-feature-used:dashboard")).toBe("1");
    expect(session.length).toBe(0);
  });
});
