import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function source(relativePath: string) {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

const appStore = source("../../context/AppStore.tsx");
const hook = source("../../hooks/useCentralCustomerCreate.ts");
const customersPage = source("../../app/clientes/page.tsx");
const newCustomerPage = source("../../app/clientes/nuevo/page.tsx");

describe("central customer create canary wiring", () => {
  it("expone un commit durable con identidad compartida", () => {
    expect(appStore).toContain("addCustomerDurably");
    expect(appStore).toContain("commitDurableAppData(expected, (previous) =>");
    expect(appStore).toContain("identity.id");
    expect(appStore).toContain("identity.now");
  });

  it("conecta ambos formularios sin reemplazar edicion ni borrado", () => {
    expect(hook).toContain("createCustomerWithCentralCanary");
    expect(customersPage).toContain("useCentralCustomerCreate");
    expect(customersPage).toContain("await createCustomer(payload)");
    expect(customersPage).toContain("updateCustomer({ ...existing, ...payload })");
    expect(newCustomerPage).toContain("useCentralCustomerCreate");
    expect(newCustomerPage).toContain("await createCustomer({");
  });

  it("impide dobles envios mientras se confirma el guardado", () => {
    expect(customersPage).toContain("disabled={savingCustomer}");
    expect(newCustomerPage).toContain("disabled={savingCustomer}");
    expect(customersPage).toMatch(/savingCustomer\s*\?\s*"Guardando\.\.\."/u);
    expect(newCustomerPage).toMatch(
      /savingCustomer\s*\?\s*"Guardando\.\.\."/u,
    );
  });
});
