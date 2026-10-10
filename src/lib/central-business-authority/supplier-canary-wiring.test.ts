import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function source(relativePath: string) {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

const appStore = source("../../context/AppStore.tsx");
const createHook = source("../../hooks/useCentralSupplierCreate.ts");
const mutationHook = source("../../hooks/useCentralSupplierMutations.ts");
const suppliersPage = source("../../app/proveedores/page.tsx");
const newSupplierPage = source("../../app/proveedores/nuevo/page.tsx");
const eventApply = source("./events-app-data-sync.ts");

describe("central supplier canary wiring", () => {
  it("conecta altas, edicion y borrado manual con commits durables", () => {
    expect(appStore).toContain("addSupplierDurably");
    expect(appStore).toContain("updateSupplierDurably");
    expect(appStore).toContain("deleteSupplierDurably");
    expect(createHook).toContain("createSupplierWithCentralCanary");
    expect(mutationHook).toContain("updateSupplierWithCentralCanary");
    expect(mutationHook).toContain("deleteSupplierWithCentralCanary");
    expect(mutationHook).toContain("await updateSharedSupplier(supplier)");
    expect(mutationHook).toContain("await deleteSharedSupplier(supplierId)");
    expect(suppliersPage).toContain("await createSupplier(payload)");
    expect(suppliersPage).toContain("await updateSupplier({");
    expect(suppliersPage).toContain("await deleteSupplier(deleteCandidate.id)");
    expect(newSupplierPage).toContain("await createSupplier(payload)");
  });

  it("aplica recepcion y borrado remoto con el contrato completo del maestro", () => {
    expect(eventApply).toContain('event.entityType === "supplier"');
    expect(eventApply).toContain("parseSupplierPayload");
    expect(eventApply).toContain("deleteSupplierMasterFromData");
  });

  it("usa un lote central para fusiones y bloquea dobles envios", () => {
    expect(suppliersPage).toContain("useCentralSharedBusinessMutations");
    expect(suppliersPage).toContain("await mergeCentrally(keep, remove)");
    expect(suppliersPage).toContain("if (mergeBusy.current) return false");
    expect(suppliersPage).toContain("disabled={savingSupplier}");
    expect(newSupplierPage).toContain("disabled={savingSupplier}");
    expect(suppliersPage).toContain("busy={deletingSupplier}");
  });
});
