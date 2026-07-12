import { describe, expect, it } from "vitest";
import {
  getFiscalModelByCode,
  isFiscalModelCode,
  listFiscalModels,
} from "./catalog";

describe("fiscal model catalog", () => {
  it("lists only the active metadata-only pilots by default", () => {
    expect(listFiscalModels().map((model) => model.code)).toEqual([
      "036",
      "303",
    ]);
  });

  it("includes 037 only after an explicit historical request", () => {
    const models = listFiscalModels({ includeHistorical: true });
    expect(models.map((model) => model.code)).toEqual(["036", "037", "303"]);
    expect(models.find((model) => model.code === "037")).toMatchObject({
      lifecycleStatus: "HISTORICAL",
      availability: "HISTORICAL_ONLY",
    });
  });

  it("accepts only exact model-code strings without coercion", () => {
    expect(isFiscalModelCode("036")).toBe(true);
    expect(isFiscalModelCode("303")).toBe(true);
    expect(isFiscalModelCode(36)).toBe(false);
    expect(isFiscalModelCode("36")).toBe(false);
    expect(isFiscalModelCode(" 036 ")).toBe(false);
    expect(isFiscalModelCode("036\n")).toBe(false);
    expect(getFiscalModelByCode(303)).toBeUndefined();
    expect(getFiscalModelByCode("999")).toBeUndefined();
  });

  it("returns frozen defensive copies that cannot corrupt later reads", () => {
    const firstRead = listFiscalModels();
    const firstModel = firstRead[0];

    expect(Object.isFrozen(firstRead)).toBe(true);
    expect(Object.isFrozen(firstModel)).toBe(true);
    expect(Object.isFrozen(firstModel.sourceIds)).toBe(true);

    expect(() => {
      (firstModel as { canonicalName: string }).canonicalName = "Manipulado";
    }).toThrow(TypeError);
    expect(() => {
      (firstRead as FiscalModelArray).push(firstModel);
    }).toThrow(TypeError);

    const secondRead = listFiscalModels();
    expect(secondRead).not.toBe(firstRead);
    expect(secondRead[0]).not.toBe(firstModel);
    expect(secondRead[0].canonicalName).not.toBe("Manipulado");
  });

  it("returns a fresh frozen detail copy on every lookup", () => {
    const first = getFiscalModelByCode("036");
    const second = getFiscalModelByCode("036");

    expect(first).toEqual(second);
    expect(first).not.toBe(second);
    expect(Object.isFrozen(first)).toBe(true);
  });
});

type FiscalModelArray = Array<ReturnType<typeof listFiscalModels>[number]>;
