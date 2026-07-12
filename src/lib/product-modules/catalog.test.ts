import { describe, expect, it } from "vitest";
import { getProductModuleById, getProductModules } from "./catalog";

describe("product module catalog", () => {
  it("registra el Consultor fiscal sin asignarle precio ni plan", () => {
    const definition = getProductModuleById("consultor_fiscal");

    expect(definition).toMatchObject({
      id: "consultor_fiscal",
      route: "/consultor-fiscal",
      lifecycleStatus: "beta",
      commercialAssignment: "unassigned",
      includedPlanIds: [],
    });
    expect(definition?.supportedCommercialOptions).toEqual([
      "standalone_purchase",
      "plan_inclusion",
    ]);
  });

  it("expone un registro de solo lectura", () => {
    expect(getProductModules().map((definition) => definition.id)).toEqual([
      "consultor_fiscal",
    ]);
  });
});
