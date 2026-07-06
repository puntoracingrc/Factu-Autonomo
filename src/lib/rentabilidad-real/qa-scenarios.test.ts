import { describe, expect, it } from "vitest";
import { RENTABILIDAD_REAL_V1_QA_SCENARIOS } from "./qa-scenarios";

describe("Rentabilidad Real v1 QA scenarios", () => {
  it("mantiene la matriz completa de escenarios 1 a 12", () => {
    expect(RENTABILIDAD_REAL_V1_QA_SCENARIOS).toHaveLength(12);
    expect(RENTABILIDAD_REAL_V1_QA_SCENARIOS.map((scenario) => scenario.id)).toEqual([
      "scenario_01_simple_autonomo",
      "scenario_02_obra_oficio",
      "scenario_03_horas_proyectos",
      "scenario_04_mixto",
      "scenario_05_instalador_materiales_sin_stock",
      "scenario_06_stock_futuro",
      "scenario_07_vehiculo_estructura_ligera",
      "scenario_08_subcontrata_ayuda_empleados",
      "scenario_09_informes_multi_documento",
      "scenario_10_cambio_modelo",
      "scenario_11_free_access",
      "scenario_12_pro_access",
    ]);
  });

  it("marca escenarios 1-10 como OK y deja acceso Free/Pro pendiente si no hay QA segura", () => {
    expect(
      RENTABILIDAD_REAL_V1_QA_SCENARIOS.slice(0, 10).every(
        (scenario) => scenario.status === "ok",
      ),
    ).toBe(true);
    expect(
      RENTABILIDAD_REAL_V1_QA_SCENARIOS.slice(10).map(
        (scenario) => scenario.status,
      ),
    ).toEqual(["pending", "pending"]);
  });

  it("no contiene datos personales ni secretos", () => {
    const serialized = JSON.stringify(RENTABILIDAD_REAL_V1_QA_SCENARIOS);

    expect(serialized).not.toMatch(/@/);
    expect(serialized).not.toMatch(/password|contrase[a-z]*\\s*[:=]|service_role_key/i);
  });
});
