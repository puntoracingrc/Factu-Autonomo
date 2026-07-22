import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  buildPurchaseProductSummaries,
  purchaseProductKey,
} from "./purchase-products";
import type { Expense, Product } from "./types";

const productsPageSource = readFileSync(
  new URL("../app/productos/page.tsx", import.meta.url),
  "utf8",
);
const structureManagerSource = readFileSync(
  new URL(
    "../components/products/ProductCatalogStructureManager.tsx",
    import.meta.url,
  ),
  "utf8",
);

describe("product catalog UX compatibility", () => {
  it("separa vistas y ausencia de datos sin tocar el motor de catalogo", () => {
    expect(productsPageSource).toContain('value: "unclassified"');
    expect(productsPageSource).toContain('value: "missing-sale-price"');
    expect(productsPageSource).toContain('value: "hidden"');
    expect(productsPageSource).toContain("function productMatchesCatalogView");
    expect(productsPageSource).toContain("function productCostValue");
    expect(productsPageSource).toContain("product.purchaseCount > 0");
    expect(productsPageSource).toContain(
      "if (a.purchaseCount === 0 && b.purchaseCount > 0) return 1",
    );
    expect(productsPageSource).toContain("Sin compras registradas");
    expect(productsPageSource).toContain("Sin coste informado");
    expect(productsPageSource).toContain("Sin precio de venta");
    expect(productsPageSource).toContain("Por clasificar");
    expect(productsPageSource).not.toContain('label="Último coste"');
    expect(productsPageSource).not.toContain('value={formatMoney(product.lastUnitPrice)}');
  });

  it("mantiene filtros y acciones secundarios fuera del camino principal", () => {
    expect(productsPageSource).toContain('aria-label="Vistas del catálogo"');
    expect(productsPageSource).toContain("activeFilterCount");
    expect(productsPageSource).toContain("filtersOpen");
    expect(productsPageSource).toContain("selectionMode");
    expect(productsPageSource).toContain("ProductCatalogStructureManager");
    expect(productsPageSource).toContain("Organizar catálogo");
    expect(productsPageSource).toContain("moveSelectedProducts");
    expect(productsPageSource).not.toContain(
      'current === "mobile" ? null : "mobile"',
    );
    expect(productsPageSource).toContain("overflow-x-auto");
    expect(productsPageSource).toContain('aria-label="Más acciones del producto"');
    expect(productsPageSource).toContain("closeActionsOnOutsideClick");
    expect(productsPageSource).toContain("closeActionsOnEscape");
    expect(productsPageSource).toContain("Seleccionar visibles");
    expect(structureManagerSource).toContain("Buscar familia o subfamilia");
    expect(structureManagerSource).toContain('kind: "merge_family"');
    expect(structureManagerSource).toContain('kind: "merge_subfamily"');
    expect(structureManagerSource).toContain("Ningún producto ni compra se borrará");
  });

  it("restaura una ficha oculta sin perder identidad ni aprendizaje", () => {
    const hiddenProduct: Product = {
      id: "product-hidden-synthetic",
      key: purchaseProductKey("Motor tubular sintetico"),
      aliases: [purchaseProductKey("Motor radio sintetico")],
      name: "Motor tubular revisado",
      family: "Automatismos",
      subfamily: "Motores",
      sku: "SYN-MOT-1",
      source: "detected",
      hidden: true,
      sales: {
        enabled: true,
        description: "Motor tubular listo para instalar",
        unit: "ud",
        unitPrice: 120,
        ivaPercent: 21,
      },
      purchase: {
        enabled: true,
        description: "Motor radio sintetico",
        unit: "ud",
        listPrice: 80,
        discountPercent: 25,
        netUnitCost: 60,
        supplierId: "supplier-synthetic",
        supplierName: "Proveedor sintetico",
      },
      createdAt: "2026-07-01T00:00:00.000Z",
      updatedAt: "2026-07-10T00:00:00.000Z",
    };
    const scan: Expense = {
      id: "expense-synthetic",
      date: "2026-07-15",
      origin: "scan",
      businessKind: "purchase_invoice",
      supplierId: "supplier-synthetic",
      supplierName: "Proveedor sintetico",
      description: "Compra sintetica",
      amount: 80,
      ivaPercent: 21,
      category: "Material",
      paymentMethod: "Tarjeta",
      purchaseLines: [
        {
          id: "line-synthetic",
          description: "Motor radio sintetico",
          catalogProduct: true,
          quantity: 1,
          unit: "ud",
          unitPrice: 80,
          discountPercent: 25,
          ivaPercent: 21,
        },
      ],
      createdAt: "2026-07-15T00:00:00.000Z",
    };

    expect(buildPurchaseProductSummaries([scan], [hiddenProduct])).toEqual([]);

    const restoredProduct = { ...hiddenProduct, hidden: false };
    const [restoredSummary] = buildPurchaseProductSummaries(
      [scan],
      [restoredProduct],
    );

    expect(restoredProduct).toMatchObject({
      id: hiddenProduct.id,
      key: hiddenProduct.key,
      aliases: hiddenProduct.aliases,
      family: hiddenProduct.family,
      subfamily: hiddenProduct.subfamily,
      hidden: false,
    });
    expect(restoredSummary).toMatchObject({
      productId: hiddenProduct.id,
      key: hiddenProduct.key,
      aliases: hiddenProduct.aliases,
      name: hiddenProduct.name,
      family: hiddenProduct.family,
      subfamily: hiddenProduct.subfamily,
      saleUnitPrice: 120,
      purchaseNetUnitCost: 60,
      purchaseCount: 1,
      lastUnitPrice: 60,
    });

    const restoreStart = productsPageSource.indexOf(
      "function restoreHiddenProduct",
    );
    const restoreEnd = productsPageSource.indexOf("\n  function ", restoreStart + 1);
    const restoreSource = productsPageSource.slice(restoreStart, restoreEnd);
    expect(restoreSource).toContain(
      "updateProduct({ ...product, hidden: false })",
    );
    expect(restoreSource).not.toContain("deleteProduct");
    expect(restoreSource).not.toContain("key:");
    expect(restoreSource).not.toContain("aliases:");
  });

  it("no presenta los marcadores internos como productos ocultos", () => {
    expect(productsPageSource).toContain("!isFamilyMarker(product)");
    expect(productsPageSource).toContain("!isSubfamilyMarker(product)");
  });
});
