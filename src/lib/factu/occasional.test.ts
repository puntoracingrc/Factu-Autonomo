import { afterEach, describe, expect, it, vi } from "vitest";
import {
  resetFactuOccasionalState,
  shouldShowFactuWidget,
  tryConsumeDailyGreeting,
} from "./occasional";

describe("factu occasional", () => {
  afterEach(() => {
    resetFactuOccasionalState();
  });

  it("hides widget on forms and edit pages", () => {
    expect(shouldShowFactuWidget("/")).toBe(true);
    expect(shouldShowFactuWidget("/facturas")).toBe(true);
    expect(shouldShowFactuWidget("/facturas/nuevo")).toBe(false);
    expect(shouldShowFactuWidget("/facturas/abc-123")).toBe(false);
    expect(shouldShowFactuWidget("/facturas/abc/rectificar")).toBe(false);
    expect(shouldShowFactuWidget("/cuenta")).toBe(false);
    expect(shouldShowFactuWidget("/cuenta#inicio-sesion")).toBe(false);
    expect(shouldShowFactuWidget("/legal/terminos")).toBe(false);
  });

  it("shows daily greeting only once per day", () => {
    const storage = {
      store: {} as Record<string, string>,
      getItem(key: string) {
        return storage.store[key] ?? null;
      },
      setItem(key: string, value: string) {
        storage.store[key] = value;
      },
      removeItem(key: string) {
        delete storage.store[key];
      },
    };

    vi.stubGlobal("window", {});
    vi.stubGlobal("localStorage", storage);

    const first = tryConsumeDailyGreeting();
    const second = tryConsumeDailyGreeting();

    expect(first).toBeTruthy();
    expect(second).toBeNull();
  });
});
