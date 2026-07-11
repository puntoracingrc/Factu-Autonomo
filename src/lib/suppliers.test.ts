import { describe, expect, it } from "vitest";
import {
  ensureSupplierForExpense,
  expenseMatchesSupplier,
  findBestSupplierMatch,
  findDuplicateSupplierGroups,
  migrateSupplier,
  normalizeSupplierName,
  sortSuppliers,
  supplierCompareKey,
  supplierPurchasedTotal,
  supplierSimilarityScore,
  validateSupplierContact,
} from "./suppliers";
import type { Expense, Supplier } from "./types";

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

function expense(overrides: Partial<Expense>): Expense {
  return {
    id: "expense",
    date: "2026-01-01",
    supplierName: "Proveedor",
    description: "Compra",
    amount: 0,
    ivaPercent: 0,
    category: "General",
    paymentMethod: "Tarjeta",
    createdAt: "",
    ...overrides,
  };
}

describe("normalizeSupplierName", () => {
  it("elimina sufijos societarios", () => {
    expect(normalizeSupplierName("ARANDES S.L.")).toBe("ARANDES");
    expect(supplierCompareKey("Leroy Merlin SL")).toBe("leroy merlin");
  });
});

describe("validateSupplierContact", () => {
  it("normaliza el mismo formato de email y teléfono que el resto de contactos", () => {
    expect(
      validateSupplierContact({
        email: " compras@proveedor.test ",
        phone: " +34 600   123 456 ",
      }),
    ).toEqual({
      ok: true,
      email: "compras@proveedor.test",
      phone: "+34 600 123 456",
    });
  });

  it("rechaza un email informado con formato inválido", () => {
    expect(validateSupplierContact({ email: "compras@" })).toEqual({
      ok: false,
      error: "Revisa el formato del email",
    });
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

  it("permite un gasto sin crear proveedor cuando no se quiere guardar", () => {
    const result = ensureSupplierForExpense(suppliers, {
      name: "Tienda de paso",
      saveSupplier: false,
    });

    expect(result.supplierId).toBeUndefined();
    expect(result.create).toBeUndefined();
    expect(result.supplierName).toBe("Tienda de paso");
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

describe("supplierPurchasedTotal", () => {
  it("suma gastos vinculados por id o nombre parecido", () => {
    const supplier = suppliers[0];
    const expenses: Expense[] = [
      expense({
        id: "e1",
        supplierId: "1",
        supplierName: "Arandes",
        amount: 100,
        ivaPercent: 21,
      }),
      expense({
        id: "e2",
        date: "2026-01-02",
        supplierName: "randes",
        amount: 50,
        ivaPercent: 0,
      }),
    ];

    expect(expenseMatchesSupplier(expenses[0], supplier)).toBe(true);
    expect(expenseMatchesSupplier(expenses[1], supplier)).toBe(true);
    expect(supplierPurchasedTotal(expenses, supplier)).toBe(171);
  });
});

describe("sortSuppliers", () => {
  it("ordena por volumen de compras", () => {
    const list: Supplier[] = [
      { id: "a", name: "Alpha", createdAt: "" },
      { id: "b", name: "Beta", createdAt: "" },
    ];
    const expenses: Expense[] = [
      expense({
        id: "e1",
        supplierId: "b",
        supplierName: "Beta",
        amount: 200,
        ivaPercent: 0,
      }),
    ];
    const sorted = sortSuppliers(list, expenses, "compras", "desc");
    expect(sorted[0].id).toBe("b");
  });
});

describe("migrateSupplier", () => {
  it("separa prefijos legacy en la dirección", () => {
    expect(
      migrateSupplier({
        id: "1",
        name: "Tienda",
        address: "Calle Mayor 1",
        createdAt: "",
      }),
    ).toMatchObject({
      streetType: "calle",
      address: "Mayor 1",
    });
  });
});
