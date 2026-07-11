import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const modalSource = readFileSync(
  new URL("./MasterDeleteConfirmationModal.tsx", import.meta.url),
  "utf8",
);
const customersSource = readFileSync(
  new URL("../../app/clientes/page.tsx", import.meta.url),
  "utf8",
);
const suppliersSource = readFileSync(
  new URL("../../app/proveedores/page.tsx", import.meta.url),
  "utf8",
);

describe("MasterDeleteConfirmationModal", () => {
  it("delega accesibilidad y foco al modal común", () => {
    expect(modalSource).toContain(
      'import { Modal } from "@/components/ui/Modal"',
    );
    expect(modalSource).toContain("<Modal");
    expect(modalSource).toContain("closeOnBackdrop={false}");
    expect(modalSource).toContain(
      'initialFocusSelector="[data-modal-initial-focus]"',
    );
    expect(modalSource).not.toContain('role="dialog"');
    expect(modalSource).not.toContain('aria-modal="true"');
  });

  it("explica el recuento y la preservación antes de cada borrado", () => {
    expect(modalSource).toContain("props.impact.documentCount");
    expect(modalSource).toContain("props.impact.draftDocumentCount");
    expect(modalSource).toContain("props.impact.historicalDocumentCount");
    expect(modalSource).toContain("props.impact.reminderCount");
    expect(modalSource).toContain("snapshots, PDF y");
    expect(modalSource).toContain("hashes no cambiarán");
    expect(modalSource).toContain("props.impact.expenseCount");
    expect(modalSource).toContain("props.impact.productCount");
    expect(modalSource).toContain("props.impact.nifSnapshotCount");
    expect(modalSource).toContain("precios y costes históricos");
    expect(modalSource).toContain("Sí, borrar ficha");
  });

  it("las listas usan el modal y no window.confirm para borrar maestros", () => {
    expect(customersSource).toContain("<MasterDeleteConfirmationModal");
    expect(customersSource).toContain("analyzeCustomerDeletion");
    expect(customersSource).toContain("setDeleteCandidate(customer)");
    expect(suppliersSource).toContain("<MasterDeleteConfirmationModal");
    expect(suppliersSource).toContain("analyzeSupplierDeletion");
    expect(suppliersSource).toContain("setDeleteCandidate(supplier)");
    expect(customersSource).not.toContain(
      "¿Borrar a ${getCustomerDisplayName(customer)}?",
    );
    expect(suppliersSource).not.toContain("¿Borrar a ${supplier.name}?");
  });
});
