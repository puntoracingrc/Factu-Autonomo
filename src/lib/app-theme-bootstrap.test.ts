import { describe, expect, it, vi } from "vitest";
import {
  APP_THEME_BOOTSTRAP_SCRIPT,
  APP_THEME_CACHE_KEY,
  APP_THEME_COLORS,
  applyResolvedAppTheme,
  cacheAppThemePreference,
  resolveAppTheme,
} from "./app-theme-bootstrap";

function runBootstrap({
  stored,
  prefersDark = false,
  storageThrows = false,
}: {
  stored?: string | null;
  prefersDark?: boolean;
  storageThrows?: boolean;
}) {
  const dataset: Record<string, string> = {};
  const style: Record<string, string> = {};
  const themeMeta = { setAttribute: vi.fn() };
  const storage = {
    getItem: vi.fn(() => {
      if (storageThrows) throw new Error("storage unavailable");
      return stored ?? null;
    }),
  };
  const windowMock = {
    matchMedia: vi.fn(() => ({ matches: prefersDark })),
  };
  const documentMock = {
    documentElement: { dataset, style },
    querySelectorAll: vi.fn(() => [themeMeta]),
  };

  Function(
    "window",
    "document",
    "localStorage",
    APP_THEME_BOOTSTRAP_SCRIPT,
  )(windowMock, documentMock, storage);

  return { dataset, style, storage, themeMeta };
}

describe("app theme bootstrap", () => {
  it("resolves explicit and system preferences deterministically", () => {
    expect(resolveAppTheme("light", true)).toBe("light");
    expect(resolveAppTheme("dark", false)).toBe("dark");
    expect(resolveAppTheme("system", true)).toBe("dark");
    expect(resolveAppTheme("system", false)).toBe("light");
  });

  it("applies a cached dark preference before hydration", () => {
    const result = runBootstrap({ stored: "dark" });

    expect(result.storage.getItem).toHaveBeenCalledWith(APP_THEME_CACHE_KEY);
    expect(result.dataset.appTheme).toBe("dark");
    expect(result.style.colorScheme).toBe("dark");
    expect(result.themeMeta.setAttribute).toHaveBeenCalledWith(
      "content",
      APP_THEME_COLORS.dark,
    );
  });

  it("falls back to the operating system for invalid or unavailable cache", () => {
    expect(
      runBootstrap({ stored: "sepia", prefersDark: true }).dataset.appTheme,
    ).toBe("dark");
    expect(
      runBootstrap({ storageThrows: true, prefersDark: false }).dataset
        .appTheme,
    ).toBe("light");
  });

  it("stores only the non-sensitive theme preference", () => {
    const storage = { setItem: vi.fn() };

    cacheAppThemePreference("system", storage);

    expect(storage.setItem).toHaveBeenCalledOnce();
    expect(storage.setItem).toHaveBeenCalledWith(APP_THEME_CACHE_KEY, "system");
    expect(APP_THEME_BOOTSTRAP_SCRIPT).not.toContain("factura-autonomo-data");
  });

  it("keeps the root and browser chrome in sync", () => {
    const meta = { content: "" };
    const doc = {
      documentElement: { dataset: {}, style: {} },
      querySelectorAll: vi.fn(() => [meta]),
    } as unknown as Document;

    applyResolvedAppTheme("dark", doc);

    expect(doc.documentElement.dataset.appTheme).toBe("dark");
    expect(doc.documentElement.style.colorScheme).toBe("dark");
    expect(meta.content).toBe(APP_THEME_COLORS.dark);
  });
});
