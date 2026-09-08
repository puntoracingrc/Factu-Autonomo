import { describe, expect, it } from "vitest";
import { EMPTY_DATA, type AppData } from "../types";
import { buildContactOnlyImportData } from "./contact-only";

describe("buildContactOnlyImportData", () => {
  it("permite cambiar solo clientes y proveedores", () => {
    const current = {
      ...structuredClone(EMPTY_DATA),
      profile: { ...EMPTY_DATA.profile, name: "Empresa actual" },
      documents: [{ id: "factura-actual" }] as AppData["documents"],
      expenses: [{ id: "gasto-actual" }] as AppData["expenses"],
      recurringExpenses: [
        { id: "recurrente-actual" },
      ] as AppData["recurringExpenses"],
      userReminders: [
        { id: "recordatorio-actual" },
      ] as AppData["userReminders"],
      products: [{ id: "producto-actual" }] as AppData["products"],
      customers: [{ id: "cliente-actual" }] as AppData["customers"],
      suppliers: [{ id: "proveedor-actual" }] as AppData["suppliers"],
      counters: {
        factura: 2974,
        factura_rectificativa: 2,
        presupuesto: 6406,
        recibo: 100,
      },
    } satisfies AppData;
    const analyzed = {
      ...structuredClone(EMPTY_DATA),
      profile: { ...EMPTY_DATA.profile, name: "Empresa del archivo" },
      documents: [{ id: "factura-importada" }] as AppData["documents"],
      expenses: [{ id: "gasto-importado" }] as AppData["expenses"],
      recurringExpenses: [
        { id: "recurrente-importado" },
      ] as AppData["recurringExpenses"],
      userReminders: [
        { id: "recordatorio-importado" },
      ] as AppData["userReminders"],
      products: [{ id: "producto-importado" }] as AppData["products"],
      customers: [{ id: "cliente-importado" }] as AppData["customers"],
      suppliers: [{ id: "proveedor-importado" }] as AppData["suppliers"],
      counters: {
        factura: 9999,
        factura_rectificativa: 9999,
        presupuesto: 9999,
        recibo: 9999,
      },
    } satisfies AppData;

    const result = buildContactOnlyImportData(current, analyzed);

    expect(result.customers).toBe(analyzed.customers);
    expect(result.suppliers).toBe(analyzed.suppliers);
    for (const key of Object.keys(current) as Array<keyof AppData>) {
      if (key === "customers" || key === "suppliers") continue;
      expect(result[key]).toBe(current[key]);
    }
  });

  it("conserva tambien propiedades futuras o de recuperacion", () => {
    const recoveryState = { status: "verified" };
    const current = Object.assign(structuredClone(EMPTY_DATA), {
      recoveryState,
    }) as AppData & { recoveryState: typeof recoveryState };
    const analyzed = {
      ...structuredClone(EMPTY_DATA),
      customers: [{ id: "cliente-importado" }] as AppData["customers"],
      suppliers: [{ id: "proveedor-importado" }] as AppData["suppliers"],
    };

    const result = buildContactOnlyImportData(current, analyzed) as AppData & {
      recoveryState: typeof recoveryState;
    };

    expect(result.recoveryState).toBe(recoveryState);
  });
});
