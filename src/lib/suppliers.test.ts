import { describe, expect, it } from "vitest";
import {
  ensureSupplierForExpense,
  expenseMatchesSupplier,
  findBestSupplierMatch,
  findDuplicateSupplierGroups,
  migrateSupplier,
  normalizeSupplierName,
  SUPPLIER_SORT_FIELD_LABELS,
  sortSuppliers,
  supplierCompareKey,
  supplierPurchasedTotal,
  supplierSimilarityScore,
  upsertSupplierForExpense,
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

  it("no considera iguales dos nombres si sus NIF conocidos discrepan", () => {
    expect(
      supplierSimilarityScore(
        "Comercial Alfa SL",
        "Comercial Alfa SL",
        "B11111111",
        "B22222222",
      ),
    ).toBe(0);
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

  it("rechaza el nombre exacto cuando el NIF fiscal es incompatible", () => {
    const match = findBestSupplierMatch(
      [
        {
          id: "supplier-alfa",
          name: "Comercial Alfa SL",
          nif: "B11111111",
          createdAt: "2026-01-01",
        },
      ],
      { name: "Comercial Alfa SL", nif: "B22222222" },
    );

    expect(match).toBeNull();
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

  it("ignora una selección explícita cuyo NIF contradice el gasto", () => {
    const result = ensureSupplierForExpense(
      [
        ...suppliers,
        {
          id: "3",
          name: "Proveedor fiscal correcto",
          nif: "B99999999",
          createdAt: "2026-01-03",
        },
      ],
      {
        name: "Leroy Merlin",
        nif: "B99999999",
        selectedSupplierId: "2",
        saveSupplier: true,
      },
    );

    expect(result.supplierId).toBe("3");
    expect(result.create).toBeUndefined();
  });

  it("conserva una selección explícita que acredita el mismo NIF", () => {
    const result = ensureSupplierForExpense(suppliers, {
      name: "Nombre OCR",
      nif: "B-12345678",
      selectedSupplierId: "2",
      saveSupplier: true,
    });

    expect(result.supplierId).toBe("2");
    expect(result.matchedExisting?.id).toBe("2");
    expect(result.create).toBeUndefined();
  });

  it("crea una alta si la selección no acredita el NIF conocido", () => {
    const result = ensureSupplierForExpense(
      [
        {
          id: "supplier-without-nif",
          name: "Comercial Alfa",
          createdAt: "2026-01-01",
        },
      ],
      {
        name: "Comercial Alfa",
        nif: "B11111111",
        selectedSupplierId: "supplier-without-nif",
        saveSupplier: true,
      },
    );

    expect(result.supplierId).toBeUndefined();
    expect(result.create).toMatchObject({
      name: "Comercial Alfa",
      nif: "B11111111",
    });
  });
});

describe("upsertSupplierForExpense", () => {
  const options = {
    createId: (() => {
      let sequence = 0;
      return () => `supplier-created-${++sequence}`;
    })(),
    now: () => "2026-07-12T03:00:00.000Z",
  };

  it("reutiliza dentro del lote el proveedor recién creado por NIF normalizado", () => {
    const first = upsertSupplierForExpense(
      [],
      {
        name: "Distribuciones Norte SL",
        nif: "B-12345678",
        category: "Material",
        saveSupplier: true,
      },
      options,
    );
    const second = upsertSupplierForExpense(
      first.suppliers,
      {
        name: "Lectura OCR distinta",
        nif: "B 12345678",
        category: "Material",
        saveSupplier: true,
      },
      options,
    );

    expect(first.suppliers).toHaveLength(1);
    expect(second.suppliers).toBe(first.suppliers);
    expect(second.supplierId).toBe(first.supplierId);
    expect(second.createdSupplier).toBeUndefined();
  });

  it("reutiliza por nombre normalizado cuando el lote no trae NIF", () => {
    const first = upsertSupplierForExpense(
      [],
      { name: "Suministros Únicos, S.L.", saveSupplier: true },
      options,
    );
    const second = upsertSupplierForExpense(
      first.suppliers,
      { name: "suministros unicos sl", saveSupplier: true },
      options,
    );

    expect(second.suppliers).toBe(first.suppliers);
    expect(second.suppliers).toHaveLength(1);
    expect(second.supplierId).toBe(first.supplierId);
  });

  it("no modifica el maestro cuando el proveedor ya existía", () => {
    const result = upsertSupplierForExpense(
      suppliers,
      {
        name: "Otra lectura",
        nif: "B 12345678",
        saveSupplier: true,
      },
      options,
    );

    expect(result.suppliers).toBe(suppliers);
    expect(result.supplierId).toBe("2");
    expect(result.createdSupplier).toBeUndefined();
  });

  it("mantiene separados los homónimos con NIF incompatibles", () => {
    const first = upsertSupplierForExpense(
      [],
      {
        name: "Comercial Alfa SL",
        nif: "B11111111",
        saveSupplier: true,
      },
      options,
    );
    const second = upsertSupplierForExpense(
      first.suppliers,
      {
        name: "Comercial Alfa SL",
        nif: "B22222222",
        saveSupplier: true,
      },
      options,
    );

    expect(second.suppliers).toHaveLength(2);
    expect(second.supplierId).not.toBe(first.supplierId);
    expect(second.suppliers.map((supplier) => supplier.nif)).toEqual([
      "B11111111",
      "B22222222",
    ]);
  });

  it("no usa un maestro legacy sin NIF como puente entre dos NIF distintos", () => {
    const legacy: Supplier = {
      id: "supplier-legacy",
      name: "Comercial Alfa",
      createdAt: "2025-01-01",
    };
    const first = upsertSupplierForExpense(
      [legacy],
      {
        name: "Comercial Alfa",
        nif: "B11111111",
        saveSupplier: true,
      },
      options,
    );
    const second = upsertSupplierForExpense(
      first.suppliers,
      {
        name: "Comercial Alfa",
        nif: "B22222222",
        saveSupplier: true,
      },
      options,
    );

    expect(first.supplierId).not.toBe(legacy.id);
    expect(second.supplierId).not.toBe(legacy.id);
    expect(second.supplierId).not.toBe(first.supplierId);
    expect(second.suppliers).toHaveLength(3);
  });

  it("no convierte una sugerencia difusa en una fusión automática", () => {
    const first = upsertSupplierForExpense(
      [],
      { name: "Suministros Norte", saveSupplier: true },
      options,
    );
    const second = upsertSupplierForExpense(
      first.suppliers,
      { name: "Suministros Sur", saveSupplier: true },
      options,
    );

    expect(second.suppliers).toHaveLength(2);
    expect(second.supplierId).not.toBe(first.supplierId);
  });

  it("resuelve una tanda A, A, B con dos altas e IDs A, A, B", () => {
    let current: Supplier[] = [];
    const ids: Array<string | undefined> = [];
    for (const input of [
      { name: "Proveedor A", nif: "B11111111" },
      { name: "OCR Proveedor A", nif: "B-11111111" },
      { name: "Proveedor B", nif: "B22222222" },
    ]) {
      const result = upsertSupplierForExpense(
        current,
        { ...input, saveSupplier: true },
        options,
      );
      current = result.suppliers;
      ids.push(result.supplierId);
    }

    expect(current).toHaveLength(2);
    expect(ids[0]).toBe(ids[1]);
    expect(ids[2]).not.toBe(ids[0]);
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

  it("usa el total canónico de IVA mixto y respeta perfiles exentos", () => {
    const supplier = suppliers[0];
    const mixed = expense({
      supplierId: supplier.id,
      supplierName: supplier.name,
      amount: 200,
      ivaPercent: 21,
      purchaseLines: [
        {
          id: "supplier-mixed-21",
          description: "Tipo general",
          quantity: 1,
          unitPrice: 100,
          ivaPercent: 21,
        },
        {
          id: "supplier-mixed-10",
          description: "Tipo reducido",
          quantity: 1,
          unitPrice: 100,
          ivaPercent: 10,
        },
      ],
    });

    expect(supplierPurchasedTotal([mixed], supplier)).toBe(231);
    expect(supplierPurchasedTotal([mixed], supplier, true)).toBe(200);
  });

  it("compensa una compra y su abono firmado en el volumen del proveedor", () => {
    const supplier = suppliers[0];
    const purchase = expense({
      id: "supplier-purchase",
      supplierId: supplier.id,
      supplierName: supplier.name,
      amount: 100,
      ivaPercent: 21,
    });
    const credit = expense({
      id: "supplier-credit",
      supplierId: supplier.id,
      supplierName: supplier.name,
      amount: -100,
      ivaPercent: 21,
    });

    expect(supplierPurchasedTotal([purchase, credit], supplier)).toBe(0);
  });

  it("suma y compensa el total documental con recargo", () => {
    const supplier = suppliers[0];
    const purchase = expense({
      supplierId: supplier.id,
      supplierName: supplier.name,
      amount: 100,
      ivaPercent: 21,
      providerSummary: {
        status: "pending_original",
        summaryId: "summary-re-purchase",
        importedAt: "2026-07-11T10:00:00.000Z",
        summaryInvoiceTotal: 126.2,
        summaryIvaPercent: 21,
        summaryIvaAmount: 21,
        summaryRecargoPercent: 5.2,
        summaryRecargoAmount: 5.2,
      },
    });
    const credit = expense({
      ...purchase,
      id: "summary-re-credit",
      amount: -100,
      providerSummary: {
        ...purchase.providerSummary!,
        summaryId: "summary-re-credit",
        summaryInvoiceTotal: -126.2,
        summaryIvaAmount: -21,
        summaryRecargoAmount: -5.2,
      },
    });

    expect(supplierPurchasedTotal([purchase], supplier)).toBe(126.2);
    expect(supplierPurchasedTotal([purchase, credit], supplier)).toBe(0);
  });

  it("no añade IVA al importe íntegro de un fijo no deducible", () => {
    const supplier = suppliers[0];
    const fixed = expense({
      supplierId: supplier.id,
      supplierName: supplier.name,
      amount: 100,
      ivaPercent: 21,
      businessKind: "fixed",
      deductibility: "non_deductible",
      purchaseLines: [
        {
          id: "supplier-fixed-21",
          description: "General",
          quantity: 1,
          unitPrice: 60,
          ivaPercent: 21,
        },
        {
          id: "supplier-fixed-10",
          description: "Reducido",
          quantity: 1,
          unitPrice: 40,
          ivaPercent: 10,
        },
      ],
    });

    expect(supplierPurchasedTotal([fixed], supplier)).toBe(100);
  });
});

describe("sortSuppliers", () => {
  it("ordena por saldo neto de compras", () => {
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
    expect(SUPPLIER_SORT_FIELD_LABELS.compras).toBe("Saldo neto de compras");
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
