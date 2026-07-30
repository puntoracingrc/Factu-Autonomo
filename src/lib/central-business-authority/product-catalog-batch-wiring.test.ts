import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const page = readFileSync("src/app/productos/page.tsx", "utf8");
const manager = readFileSync(
  "src/components/products/ProductCatalogStructureManager.tsx",
  "utf8",
);
const hook = readFileSync(
  "src/hooks/useCentralProductCatalogStructure.ts",
  "utf8",
);
const store = readFileSync("src/context/AppStore.tsx", "utf8");

describe("central product catalog batch wiring", () => {
  it("enruta toda la organización de familias por el lote central", () => {
    expect(page).toContain("useCentralProductCatalogStructure");
    expect(page).toContain("await applyCatalogStructure(operation)");
    expect(page).not.toContain(
      "organización masiva de productos centrales se habilitará",
    );
    expect(page).not.toContain(
      "El cambio de una familia con productos centrales necesita",
    );
    expect(page).toContain("catalogOperationPendingRef.current");
    expect(page).toContain("disabled={catalogOperationPending}");
  });

  it("mantiene el modal ocupado hasta recibir el resultado central", () => {
    expect(manager).toContain(
      "completed = await onRenameFamily(action.family, nameDraft)",
    );
    expect(manager).toContain(
      "completed = await onMergeFamily(action.family, familyDraft)",
    );
    expect(manager).toContain("completed = await onRemoveSubfamily(");
  });

  it("fusiona fichas por el lote central y espera su confirmación", () => {
    expect(page).toContain('type: "merge_products"');
    expect(page).toContain("await runCatalogStructureOperation(");
    expect(page).toContain("const merged = await onMerge(mergeKey)");
    expect(page).toContain('merging ? "Unificando..." : "Unificar"');
    expect(page).not.toContain(
      "La fusión de productos centrales se habilitará",
    );
    expect(store).toContain("mergeProductRecordsInAppData");
  });

  it("sincroniza eventos antes de preparar el lote", () => {
    expect(hook).toContain("syncEventsBeforeWrite");
    expect(hook).toContain("syncCentralBusinessEvents(userId)");
    expect(hook).toContain("commitPreparedAppDataDurably");
  });
});
