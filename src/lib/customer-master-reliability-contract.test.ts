import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const root = fileURLToPath(new URL("../../", import.meta.url));

function source(relativePath: string): string {
  return readFileSync(resolve(root, relativePath), "utf8");
}

describe("customer master reliability contract", () => {
  it("mantiene el blindaje interno sin añadir fricción al usuario", () => {
    const adr = source(
      "docs/architecture/ADR-0006-customer-master-reliability.md",
    );

    expect(adr).toContain("no añade permisos, confirmaciones");
    expect(adr).toContain("NIF no vacíos y");
    expect(adr).toContain("Nunca reescribe el snapshot, PDF, sello, hash");
    expect(adr).toContain("cargar todos los tramos");
  });

  it("valida las escrituras contra la colección vigente dentro de AppStore", () => {
    const store = source("src/context/AppStore.tsx");

    expect(store).toMatch(/createCustomerInCollection\(\s*prev\.customers/);
    expect(store).toMatch(/updateCustomerInCollection\(\s*prev\.customers/);
    expect(store).toContain("upsertCustomerForDocumentInCollection(");
    expect(store).toContain("return { ...prev, customers: write.customers }");
  });

  it("valida la emisión antes de modificar el maestro desde un documento", () => {
    const form = source("src/components/forms/DocumentForm.tsx");
    const saveHandler = form.slice(form.indexOf("async function handleSave"));
    const preliminaryValidation = saveHandler.indexOf(
      "const preliminaryEmissionCheck",
    );
    const customerWrite = saveHandler.indexOf("upsertCustomerForDocument(");

    expect(preliminaryValidation).toBeGreaterThan(-1);
    expect(customerWrite).toBeGreaterThan(preliminaryValidation);
  });

  it("busca antes de paginar y usa el mismo filtro robusto al unificar", () => {
    const page = source("src/app/clientes/page.tsx");

    expect(page).toContain("customerListWindow(displayedCustomers");
    expect(page).toContain("filterCustomers(customers, mergeSearch)");
    expect(page).toContain("current + CUSTOMER_LIST_BATCH_SIZE");
  });
});
