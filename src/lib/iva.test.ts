import { describe, expect, it } from "vitest";
import {
  addIvaRate,
  DEFAULT_IVA_SETTINGS,
  normalizeIvaSettings,
  removeIvaRate,
  setDefaultIvaRate,
} from "./iva";

describe("iva settings", () => {
  it("usa valores por defecto españoles", () => {
    expect(normalizeIvaSettings()).toEqual(DEFAULT_IVA_SETTINGS);
  });

  it("elimina duplicados y ordena", () => {
    expect(
      normalizeIvaSettings({ rates: [21, 10, 21, 4], defaultRate: 10 }),
    ).toEqual({
      rates: [4, 10, 21],
      defaultRate: 10,
    });
  });

  it("añade y quita tipos de IVA", () => {
    const added = addIvaRate(DEFAULT_IVA_SETTINGS, 7.5);
    expect(added).toEqual({
      rates: [0, 4, 7.5, 10, 21],
      defaultRate: 21,
    });

    if ("error" in added) throw new Error("expected settings");

    const removed = removeIvaRate(added, 4);
    expect(removed).toEqual({
      rates: [0, 7.5, 10, 21],
      defaultRate: 21,
    });
  });

  it("no permite borrar el IVA por defecto", () => {
    const result = removeIvaRate(DEFAULT_IVA_SETTINGS, 21);
    expect(result).toHaveProperty("error");
  });

  it("cambia el IVA por defecto", () => {
    expect(setDefaultIvaRate(DEFAULT_IVA_SETTINGS, 10)).toEqual({
      rates: [0, 4, 10, 21],
      defaultRate: 10,
    });
  });
});
