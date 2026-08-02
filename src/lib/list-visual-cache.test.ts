import { describe, expect, it } from "vitest";
import {
  buildListVisualCacheSnapshot,
  changedListVisualCacheKinds,
  hasListVisualCacheChanges,
  LIST_VISUAL_CACHE_KINDS,
  listVisualCacheStorageKey,
  LIST_VISUAL_CACHE_MAX_AGE_MS,
  readListVisualCacheSnapshot,
  writeListVisualCacheSnapshot,
  type ListVisualCacheKind,
  type ListVisualCacheDependencies,
} from "./list-visual-cache";
import { createDemoWorkspaceData } from "./demo-workspace";
import { isVatExempt } from "./vat-regime";

function memoryStorage(): Storage {
  const values = new Map<string, string>();

  return {
    get length() {
      return values.size;
    },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
    removeItem: (key) => values.delete(key),
    setItem: (key, value) => values.set(key, value),
  };
}

function snapshot(
  kind: ListVisualCacheKind,
  date = new Date("2026-07-25T10:00:00.000Z"),
) {
  return buildListVisualCacheSnapshot(
    createDemoWorkspaceData(date),
    kind,
    date,
  );
}

function dependencies(
  scope: string,
  data = createDemoWorkspaceData(new Date("2026-07-25T10:00:00.000Z")),
): ListVisualCacheDependencies {
  return {
    scope,
    documents: data.documents,
    customers: data.customers,
    expenses: data.expenses,
    suppliers: data.suppliers,
    products: data.products,
    vatExempt: isVatExempt(data.profile),
  };
}

describe("list visual cache", () => {
  it("guarda una foto visual pequeña de facturas sin cliente ni evidencia fiscal", () => {
    const cached = snapshot("facturas");
    const serialized = JSON.stringify(cached);

    expect(cached.title).toBe("Facturas");
    expect(cached.items.length).toBeLessThanOrEqual(5);
    expect(serialized).not.toContain("Bar El Rincon");
    expect(serialized).not.toContain("Clinica Norte");
    expect(serialized).not.toContain("B00000001");
    expect(serialized).not.toContain("ana.demo@example.com");
    expect(serialized).not.toContain("documentSnapshot");
    expect(serialized).not.toContain("pdfSnapshot");
    expect(serialized).not.toContain("snapshotSeal");
    expect(serialized).not.toContain("verifactu");
  });

  it("guarda una foto visual pequeña de gastos sin proveedor, notas ni originales", () => {
    const cached = snapshot("gastos");
    const serialized = JSON.stringify(cached);

    expect(cached.title).toBe("Gastos");
    expect(cached.items.length).toBeLessThanOrEqual(5);
    expect(serialized).not.toContain("Materiales Levante");
    expect(serialized).not.toContain("proveedor.demo@example.com");
    expect(serialized).not.toContain("originalArchive");
    expect(serialized).not.toContain("purchaseDocument");
    expect(serialized).not.toContain("notes");
  });

  it("guarda fotos visuales pequeñas de los listados operativos principales", () => {
    for (const kind of LIST_VISUAL_CACHE_KINDS) {
      const cached = snapshot(kind);
      expect(cached.kind).toBe(kind);
      expect(cached.metrics.length).toBeLessThanOrEqual(3);
      expect(cached.items.length).toBeLessThanOrEqual(5);
      expect(cached.signature).toContain(cached.title);
    }
  });

  it("no duplica campos sensibles ni evidencia documental en los nuevos listados cacheados", () => {
    const serialized = JSON.stringify([
      snapshot("clientes"),
      snapshot("presupuestos"),
      snapshot("recibos"),
      snapshot("proveedores"),
      snapshot("productos"),
    ]);

    expect(serialized).not.toContain("B00000001");
    expect(serialized).not.toContain("ana.demo@example.com");
    expect(serialized).not.toContain("proveedor.demo@example.com");
    expect(serialized).not.toContain("address");
    expect(serialized).not.toContain("notes");
    expect(serialized).not.toContain("documentSnapshot");
    expect(serialized).not.toContain("pdfSnapshot");
    expect(serialized).not.toContain("snapshotSeal");
    expect(serialized).not.toContain("verifactu");
  });

  it("lee por scope, descarta cache caducada o malformada y no lanza", () => {
    const cached = snapshot("facturas");
    const storage = memoryStorage();
    const scope = "user-1";

    expect(writeListVisualCacheSnapshot(cached, scope, storage)).toBe(true);
    expect(
      readListVisualCacheSnapshot(
        "facturas",
        scope,
        storage,
        new Date("2026-07-26T10:00:00.000Z").getTime(),
      ),
    ).toEqual(cached);
    expect(
      readListVisualCacheSnapshot("facturas", "user-2", storage),
    ).toBeNull();
    expect(
      readListVisualCacheSnapshot(
        "facturas",
        scope,
        storage,
        new Date("2026-07-25T10:00:00.000Z").getTime() +
          LIST_VISUAL_CACHE_MAX_AGE_MS +
          1,
      ),
    ).toBeNull();

    storage.setItem(listVisualCacheStorageKey("gastos", scope), "{");
    expect(readListVisualCacheSnapshot("gastos", scope, storage)).toBeNull();
  });

  it("detecta cambios visuales sin depender de la fecha de guardado", () => {
    const first = snapshot("gastos", new Date("2026-07-25T10:00:00.000Z"));
    const sameDataLater = snapshot(
      "gastos",
      new Date("2026-07-25T11:00:00.000Z"),
    );
    const changed = {
      ...sameDataLater,
      metrics: [{ label: "Total", value: "999" }],
      signature: "changed",
    };

    expect(hasListVisualCacheChanges(first, sameDataLater)).toBe(false);
    expect(hasListVisualCacheChanges(first, changed)).toBe(true);
  });

  it("recalcula solo facturas y clientes al modificar una factura", () => {
    const previous = dependencies("user-1");
    const invoiceIndex = previous.documents.findIndex(
      (document) => document.type === "factura",
    );
    const documents = [...previous.documents];
    documents[invoiceIndex] = {
      ...documents[invoiceIndex],
      status: "pagado",
    };

    expect(
      changedListVisualCacheKinds(previous, { ...previous, documents }),
    ).toEqual(["facturas", "clientes"]);
  });

  it("recalcula gastos y proveedores al modificar un gasto", () => {
    const previous = dependencies("user-1");
    const expenses = previous.expenses.map((expense, index) =>
      index === 0 ? { ...expense, amount: expense.amount + 1 } : expense,
    );

    expect(
      changedListVisualCacheKinds(previous, { ...previous, expenses }),
    ).toEqual(["gastos", "proveedores"]);
  });

  it("no recalcula listados si solo cambia la identidad del array", () => {
    const previous = dependencies("user-1");

    expect(
      changedListVisualCacheKinds(previous, {
        ...previous,
        documents: [...previous.documents],
      }),
    ).toEqual([]);
  });
});
