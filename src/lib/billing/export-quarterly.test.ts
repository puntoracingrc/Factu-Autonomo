import { describe, expect, it } from "vitest";
import { buildQuarterlyExportCsv } from "./export-quarterly";
import { DEFAULT_PROFILE, type Document, type Expense, type Supplier } from "../types";
import { issueDocument } from "../document-integrity";

const profile = {
  ...DEFAULT_PROFILE,
  name: "Autónomo Test",
  nif: "11111111H",
};

const draftDoc: Document = {
  id: "d1",
  type: "factura",
  number: "F-2026-0001",
  date: "2026-05-10",
  client: { name: "Cliente Test", nif: "87654321A" },
  items: [
    {
      id: "l1",
      description: "Servicio",
      quantity: 1,
      unitPrice: 100,
      ivaPercent: 21,
    },
  ],
  status: "borrador",
  createdAt: "2026-05-10",
  updatedAt: "2026-05-10",
};

const doc = issueDocument(
  draftDoc,
  profile,
  "2026-05-10T10:00:00.000Z",
);

const expense: Expense = {
  id: "e1",
  date: "2026-04-02",
  supplierId: "s1",
  supplierName: "Proveedor",
  description: "Material",
  amount: 50,
  ivaPercent: 21,
  category: "Material",
  paymentMethod: "Transferencia",
  createdAt: "2026-04-02",
};

const supplier: Supplier = {
  id: "s1",
  name: "Proveedor",
  nif: "B99887766",
  createdAt: "2026-01-01",
};

describe("export quarterly csv", () => {
  it("incluye resumen, ventas y gastos con formato para gestoría", () => {
    const csv = buildQuarterlyExportCsv(
      [doc],
      [expense],
      profile,
      2026,
      2,
      [supplier],
    );

    expect(csv).toContain("EXPORTACIÓN TRIMESTRAL FISCAL");
    expect(csv).toContain("2.º trimestre 2026");
    expect(csv).toContain("Autónomo Test");
    expect(csv).toContain("RESUMEN DEL PERIODO");
    expect(csv).toContain("LIBRO DE VENTAS");
    expect(csv).toContain("F-2026-0001");
    expect(csv).toContain("Cliente Test");
    expect(csv).toContain("87654321A");
    expect(csv).toContain("100,00");
    expect(csv).toContain("LIBRO DE GASTOS Y COMPRAS");
    expect(csv).toContain("Proveedor");
    expect(csv).toContain("B99887766");
    expect(csv).toContain("Transferencia");
    expect(csv).toContain("TOTAL GASTOS");
  });

  it("usa fecha, cliente e importes del snapshot aunque los campos vivos deriven", () => {
    const drifted: Document = {
      ...doc,
      number: "F-LIVE-ALTERADA",
      date: "2027-01-01",
      client: { name: "Cliente alterado", nif: "B00000000" },
      items: [{ ...doc.items[0], unitPrice: 999 }],
    };

    const csv = buildQuarterlyExportCsv(
      [drifted],
      [],
      profile,
      2026,
      2,
    );

    expect(csv).toContain("F-2026-0001");
    expect(csv).toContain("Cliente Test");
    expect(csv).toContain("87654321A");
    expect(csv).toContain("Base imponible ventas;100,00");
    expect(csv).not.toContain("F-LIVE-ALTERADA");
    expect(csv).not.toContain("Cliente alterado");
    expect(csv).not.toContain("999,00");
  });

  it("mantiene el resumen fiscal congelado de snapshots legacy verificados", () => {
    const legacy: Document = {
      ...doc,
      pdfSnapshot: undefined,
      snapshotSeal: undefined,
      snapshotIntegrityRequired: undefined,
    };

    const csv = buildQuarterlyExportCsv(
      [legacy],
      [],
      { ...profile, vatExempt: true },
      2026,
      2,
    );

    expect(csv).toContain("Base imponible ventas;100,00");
    expect(csv).toContain("IVA repercutido;21,00");
    expect(csv).toContain("100,00;21,00;121,00");
  });

  it("excluye documentos bloqueados y deja una traza auditable del riesgo", () => {
    const blocked: Document = {
      ...doc,
      snapshotIntegrity: {
        status: "blocked",
        issues: ["document_hash_mismatch"],
      },
    };

    const csv = buildQuarterlyExportCsv([blocked], [], profile, 2026, 2);

    expect(csv).toContain("ALERTA DE INTEGRIDAD FISCAL");
    expect(csv).toContain("Documentos excluidos;1");
    expect(csv).toContain("DOCUMENTOS EXCLUIDOS POR INTEGRIDAD");
    expect(csv).toContain("d1;2026-05-10;F-2026-0001;document_hash_mismatch");
    expect(csv).toContain("Base imponible ventas;0,00");
    expect(csv).toContain(
      "TOTAL VENTAS;;;0 documentos;;0,00;0,00;0,00;",
    );
  });
});
