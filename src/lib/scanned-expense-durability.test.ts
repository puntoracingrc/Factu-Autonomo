import { describe, expect, it, vi } from "vitest";
import { EMPTY_DATA, type Expense } from "./types";
import { commitAppDataDurably } from "./app-data-durability";
import { buildScannedExpenseDurableTransition } from "./scanned-expense-durability";

const NOW = "2026-07-17T10:00:00.000Z";
const HASH = "a".repeat(64);

function draft(): Omit<Expense, "id" | "createdAt"> {
  return {
    date: "2026-07-17",
    supplierName: "Proveedor",
    description: "Material",
    amount: 100,
    ivaPercent: 21,
    category: "Material",
    paymentMethod: "Tarjeta",
    origin: "scan",
    businessKind: "purchase_invoice",
    originalArchive: {
      schemaVersion: 1,
      status: "archived_verified",
      source: "scan",
      sourceSha256: HASH,
      sourceMimeType: "application/pdf",
      driveFileId: "drive-file-1",
      driveFolderId: "drive-folder-1",
      documentDate: "2026-07-17",
      verification: "SHA256_READBACK_MATCH",
      archivedAt: NOW,
    },
  };
}

describe("scanned expense durable transition", () => {
  it("crea proveedor y gasto dentro del mismo candidato", () => {
    const transition = buildScannedExpenseDurableTransition({
      data: EMPTY_DATA,
      expense: draft(),
      operationId: "scan-1",
      now: NOW,
      supplier: { name: "Proveedor", category: "Material" },
    });

    expect(transition.data.suppliers).toHaveLength(1);
    expect(transition.data.expenses).toHaveLength(1);
    expect(transition.value.expense.supplierId).toBe(
      transition.value.supplier?.id,
    );
    expect(transition.value.expense.originalArchive?.sourceSha256).toBe(HASH);
  });

  it("es idempotente por ID de operación y procedencia exacta", () => {
    const first = buildScannedExpenseDurableTransition({
      data: EMPTY_DATA,
      expense: draft(),
      operationId: "scan-1",
      now: NOW,
    });
    const second = buildScannedExpenseDurableTransition({
      data: first.data,
      expense: draft(),
      operationId: "scan-1",
      now: "2026-07-17T10:01:00.000Z",
    });

    expect(second.data).toBe(first.data);
    expect(second.value.expense.id).toBe(first.value.expense.id);
  });

  it("actualiza un gasto existente sin duplicarlo", () => {
    const first = buildScannedExpenseDurableTransition({
      data: EMPTY_DATA,
      expense: draft(),
      operationId: "scan-1",
      now: NOW,
    });
    const changed = buildScannedExpenseDurableTransition({
      data: first.data,
      expense: { ...first.value.expense, notes: "Revisado" },
      operationId: "scan-1",
      now: "2026-07-17T10:01:00.000Z",
    });

    expect(changed.data.expenses).toHaveLength(1);
    expect(changed.value.expense.notes).toBe("Revisado");
  });

  it("no toca documentos emitidos ni integridad/VeriFactu", () => {
    const documents = [{ id: "issued-fixture" }] as typeof EMPTY_DATA.documents;
    const profile = { ...EMPTY_DATA.profile };
    const baseline = { ...EMPTY_DATA, documents, profile };

    const transition = buildScannedExpenseDurableTransition({
      data: baseline,
      expense: draft(),
      operationId: "scan-1",
      now: NOW,
    });

    expect(transition.data.documents).toBe(documents);
    expect(transition.data.profile).toBe(profile);
  });

  it("solo publica memoria después de una escritura durable aplicada", () => {
    let current = EMPTY_DATA;
    const persist = vi.fn(() => ({ status: "applied" as const }));
    const result = commitAppDataDurably({
      expected: EMPTY_DATA,
      getCurrent: () => current,
      build: (previous) =>
        buildScannedExpenseDurableTransition({
          data: previous,
          expense: draft(),
          operationId: "scan-1",
          now: NOW,
        }),
      persist,
    });

    expect(result.status).toBe("applied");
    expect(current.expenses).toHaveLength(0);
    if (result.status === "applied") current = result.data;
    expect(current.expenses).toHaveLength(1);
  });
});
