import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const newProductPageSource = readFileSync(
  new URL("../app/productos/nuevo/page.tsx", import.meta.url),
  "utf8",
);
const productsPageSource = readFileSync(
  new URL("../app/productos/page.tsx", import.meta.url),
  "utf8",
);
const fieldsSource = readFileSync(
  new URL(
    "../components/products/ProductFormFields.tsx",
    import.meta.url,
  ),
  "utf8",
);
const unsavedDialogSource = readFileSync(
  new URL(
    "../components/products/ProductUnsavedChangesDialog.tsx",
    import.meta.url,
  ),
  "utf8",
);

describe("product form UX contract", () => {
  it("comparte el mismo formulario entre alta y edición", () => {
    expect(newProductPageSource).toContain("<ProductFormFields");
    expect(productsPageSource).toContain("<ProductFormFields");
    expect(fieldsSource).toContain("Datos principales");
    expect(fieldsSource).toContain("Compra y proveedor");
    expect(fieldsSource).toContain("Cálculo y atributos");
    expect(fieldsSource).toContain("aria-expanded={open}");
  });

  it("mantiene bloqueada la identidad aprendida de productos detectados", () => {
    expect(fieldsSource).toContain('source === "detected"');
    expect(fieldsSource).toContain("Detectado en compras");
    expect(fieldsSource).toContain('label="Nombre visible"');
    expect(fieldsSource).toContain('onChange("saleDescription"');
    expect(productsPageSource).toMatch(
      /product\.source === "detected"\s+\? product\.name/,
    );

    const savePatch = productsPageSource.slice(
      productsPageSource.indexOf("savedProduct = onSave({"),
      productsPageSource.indexOf("if (!savedProduct)"),
    );
    expect(savePatch).not.toContain("aliases:");
    expect(savePatch).not.toContain("key:");
  });

  it("avisa antes de perder cambios y evita guardados dobles", () => {
    expect(newProductPageSource).toContain('window.addEventListener("beforeunload"');
    expect(productsPageSource).toContain('window.addEventListener("beforeunload"');
    expect(newProductPageSource).toContain("savingRef.current");
    expect(productsPageSource).toContain("savingRef.current");
    expect(newProductPageSource).toContain("<ProductUnsavedChangesDialog");
    expect(productsPageSource).toContain("<ProductUnsavedChangesDialog");
    expect(unsavedDialogSource).toContain("Hay cambios sin guardar");
    expect(unsavedDialogSource).toContain("Seguir editando");
    expect(unsavedDialogSource).toContain("Descartar");
  });

  it("muestra coincidencias sin fusionar ni sobrescribir automáticamente", () => {
    expect(newProductPageSource).toContain("findProductDuplicateCandidates");
    expect(newProductPageSource).toContain("<ProductDuplicateNotice");
    expect(newProductPageSource).toContain("saveProductCatalogEditRequest");
    expect(fieldsSource).toContain("Puede que ya exista");
    expect(fieldsSource).toContain("onOpen(candidate)");
    expect(fieldsSource).not.toContain("mergeProducts");
  });

  it("valida importes antes de construir el parche persistente", () => {
    expect(newProductPageSource).toContain("validateProductNumericInputs");
    expect(productsPageSource).toContain("validateProductNumericInputs");
    expect(productsPageSource.indexOf("validateProductNumericInputs")).toBeLessThan(
      productsPageSource.indexOf("savedProduct = onSave({"),
    );
  });
});
