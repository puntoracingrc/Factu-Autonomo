import { describe, expect, it } from "vitest";
import {
  ensureSupplierForExpense,
  findBestSupplierMatch,
  findDuplicateSupplierGroups,
  normalizeSupplierName,
  supplierCompareKey,
  supplierSimilarityScore,
} from "./suppliers";
import type { Supplier } from "./types";

const suppliers: Supplier[] = [
  {
    id: "1",
    name: "Arandes",
    createdAt: "2026-01-01",
  },
  {
    id: "2",
    name: "Leroy Merlin",
    nif: "B12345678",
    createdAt: "2026-01-02",
  },
];

describe("normalizeSupplierName", () => {
  it("elimina sufijos societarios", () => {
    expect(normalizeSupplierName("ARANDES S.L.")).toBe("ARANDES");
    expect(supplierCompareKey("Leroy Merlin SL")).toBe("leroy merlin");
  });
});

describe("supplierSimilarityScore", () => {
  it("empareja errores OCR cercanos", () => {
    expect(supplierSimilarityScore("randes", "Arandes")).toBeGreaterThanOrEqual(
      0.82,
    );
  });

  it("empareja por NIF aunque cambie el nombre", () => {
    expect(
      supplierSimilarityScore("Leroy", "Leroy Merlin", "B12345678", "B12345678"),
    ).toBe(1);
  });
});

describe("findBestSupplierMatch", () => {
  it("detecta arandes mal escaneado", () => {
    const match = findBestSupplierMatch(suppliers, { name: "randes" });
    expect(match?.supplier.id).toBe("1");
    expect(match?.score).toBeGreaterThanOrEqual(0.82);
  });

  it("detecta variante con sufijo legal", () => {
    const match = findBestSupplierMatch(suppliers, { name: "LEROY MERLIN S.L." });
    expect(match?.supplier.id).toBe("2");
    expect(match?.score).toBeGreaterThanOrEqual(0.9);
  });
});

describe("ensureSupplierForExpense", () => {
  it("reutiliza proveedor parecido en lugar de duplicar", () => {
    const result = ensureSupplierForExpense(suppliers, {
      name: "randes",
      saveSupplier: true,
    });
    expect(result.supplierId).toBe("1");
    expect(result.supplierName).toBe("Arandes");
    expect(result.create).toBeUndefined();
  });

  it("crea uno nuevo si no hay parecido", () => {
    const result = ensureSupplierForExpense(suppliers, {
      name: "Amazon",
      saveSupplier: true,
    });
    expect(result.supplierId).toBeUndefined();
    expect(result.create?.name).toBe("Amazon");
  });
});

describe("findDuplicateSupplierGroups", () => {
  it("agrupa duplicados existentes", () => {
    const groups = findDuplicateSupplierGroups([
      ...suppliers,
      { id: "3", name: "randes", createdAt: "2026-01-03" },
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0]).toHaveLength(2);
  });
});
