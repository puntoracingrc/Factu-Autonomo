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
    expect(shouldShowFactuWidget("/legal/terminos")).toBe(false);
  });

  it("shows daily greeting only once per day", () => {
    vi.stubGlobal("window", {});
    vi.stubGlobal("localStorage", {
      store: {} as Record<string, string>,
      getItem(key: string) {
        return this.store[key] ?? null;
      },
      setItem(key: string, value: string) {
        this.store[key] = value;
      },
      removeItem(key: string) {
        delete this.store[key];
      },
    });

    const first = tryConsumeDailyGreeting();
    const second = tryConsumeDailyGreeting();

    expect(first).toBeTruthy();
    expect(second).toBeNull();
  });
});
