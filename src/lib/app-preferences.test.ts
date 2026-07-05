import { describe, expect, it } from "vitest";
import {
  APP_START_PAGE_OPTIONS,
  appStartPageHref,
  normalizeAppPreferences,
} from "./app-preferences";

describe("app preferences", () => {
  it("normaliza preferencias ausentes o inválidas", () => {
    expect(normalizeAppPreferences()).toEqual({
      theme: "system",
      density: "comfortable",
      startPage: "panel",
      reduceMotion: false,
    });

    expect(
      normalizeAppPreferences({
        theme: "dark",
        density: "compact",
        startPage: "expenses",
        reduceMotion: true,
      }),
    ).toEqual({
      theme: "dark",
      density: "compact",
      startPage: "expenses",
      reduceMotion: true,
    });

    expect(
      normalizeAppPreferences({
        theme: "sepia" as never,
        density: "tiny" as never,
        startPage: "unknown" as never,
        reduceMotion: "yes" as never,
      }),
    ).toEqual({
      theme: "system",
      density: "comfortable",
      startPage: "panel",
      reduceMotion: false,
    });
  });

  it("mantiene rutas conocidas para pantalla inicial", () => {
    expect(APP_START_PAGE_OPTIONS.map((option) => option.value)).toEqual([
      "panel",
      "customers",
      "invoices",
      "expenses",
      "taxes",
      "settings",
    ]);
    expect(appStartPageHref("invoices")).toBe("/facturas");
    expect(appStartPageHref(undefined)).toBe("/");
  });
});
