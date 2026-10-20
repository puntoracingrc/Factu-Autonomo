import { describe, expect, it, vi } from "vitest";
import { unzipSync, strFromU8 } from "fflate";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { issueDocument } from "@/lib/document-integrity";
import { DEFAULT_PROFILE, type Document, type Expense } from "@/lib/types";
import {
  buildAdvisorPackage,
  type AdvisorPackageInput,
} from "./advisor-package";
import { buildAdvisorPackageEmail } from "./advisor-package-email";

const profile = {
  ...DEFAULT_PROFILE,
  name: "Empresa de muestra",
  nif: "11111111H",
  address: "Calle Prueba 1",
  postalCode: "28001",
  city: "Madrid",
  advisorContact: {
    advisorName: "Gestor de prueba",
    email: "gestor@example.test",
    phone: "600123123",
  },
};
function invoice(id: string, date: string, number: string) {
  return issueDocument(
    {
      id,
      type: "factura",
      number,
      date,
      client: {
        name: "Cliente de muestra",
        nif: "87654321A",
        address: "Calle Cliente 2",
        postalCode: "28002",
        city: "Madrid",
      },
      items: [
        {
          id: `${id}-line`,
          description: "Servicio de ejemplo",
          quantity: 1,
          unitPrice: 100,
          ivaPercent: 21,
        },
      ],
      status: "borrador",
      createdAt: `${date}T08:00:00.000Z`,
      updatedAt: `${date}T08:00:00.000Z`,
    } as Document,
    profile,
    `${date}T10:00:00.000Z`,
  );
}
const expense = (id: string, date: string): Expense => ({
  id,
  date,
  supplierName: "Proveedor ejemplo",
  description: "Material de ejemplo",
  amount: 50,
  ivaPercent: 21,
  category: "Materiales",
  paymentMethod: "Tarjeta",
  purchaseDocument: { invoiceNumber: `COMPRA-${id}` },
  createdAt: `${date}T10:00:00.000Z`,
});
const input = (): AdvisorPackageInput => ({
  period: { year: 2026, startMonth: 4, endMonth: 6 },
  data: {
    profile,
    suppliers: [],
    documents: [
      invoice("april", "2026-04-12", "F-2026-1"),
      invoice("may", "2026-05-20", "F-2026-2"),
    ],
    expenses: [
      expense("one", "2026-04-13"),
      expense("two", "2026-05-21"),
      expense("missing", "2026-06-01"),
      expense("outside", "2026-07-01"),
    ],
  },
});

describe("advisor monthly package", () => {
  it("includes actual PDFs, byte-exact originals, PDF/CSV books and a truthful missing-file index by month", async () => {
    const data = input();
    const before = JSON.stringify(data);
    const original = new TextEncoder().encode(
      "%PDF-1.7\nSynthetic original, unchanged\n%%EOF",
    );
    const reader = vi.fn(async (expenses: Expense[]) => {
      expect(expenses.map((item) => item.id)).toEqual([
        "one",
        "two",
        "missing",
      ]);
      return new Map([
        [
          "one",
          { bytes: original, extension: ".pdf", source: "Factu" as const },
        ],
        [
          "two",
          {
            bytes: new Uint8Array([80, 75, 3, 4]),
            extension: ".xlsx",
            source: "Factu" as const,
          },
        ],
      ]);
    });
    const result = await buildAdvisorPackage(data, { readOriginals: reader });
    const files = unzipSync(new Uint8Array(await result.blob.arrayBuffer()));
    const paths = Object.keys(files);
    expect(result).toMatchObject({
      invoiceCount: 2,
      expenseCount: 3,
      originalCount: 2,
      missingOriginalCount: 1,
    });
    expect(
      paths.some((path) =>
        path.includes("2026-04/Facturas emitidas/F-2026-1.pdf"),
      ),
    ).toBe(true);
    expect(
      paths.some((path) =>
        path.includes("2026-05/Facturas emitidas/F-2026-2.pdf"),
      ),
    ).toBe(true);
    expect(paths.some((path) => path.includes("2026-07"))).toBe(false);
    expect(
      files[paths.find((path) => path.includes("2026-04/Gastos/"))!],
    ).toEqual(original);
    expect(
      paths.filter(
        (path) => path.includes("/Listados/") && path.endsWith(".csv"),
      ),
    ).toHaveLength(4);
    const index = strFromU8(
      files[paths.find((path) => path.endsWith("Indice de documentos.csv"))!],
    );
    expect(index).toContain("SIN ORIGINAL ADJUNTO");
    expect(index).toContain("COMPRA-missing");
    expect(
      paths.some(
        (path) => path.includes("/Gastos/") && path.includes("COMPRA-missing"),
      ),
    ).toBe(false);
    expect(
      strFromU8(
        files[paths.find((path) => path.endsWith("Resumen de gastos.pdf"))!],
      ).slice(0, 4),
    ).toBe("%PDF");
    expect(JSON.stringify(data)).toBe(before);
    const qa = process.env.FACTU_ADVISOR_QA_DIR;
    if (qa) {
      mkdirSync(qa, { recursive: true });
      writeFileSync(
        join(qa, "paquete-gestor-muestra.zip"),
        new Uint8Array(await result.blob.arrayBuffer()),
      );
      for (const path of paths.filter(
        (path) => path.endsWith(".pdf") && !path.includes("/Gastos/"),
      ))
        writeFileSync(join(qa, path.split("/").at(-1)!), files[path]);
    }
  });
  it("uses frozen invoice dates/amounts rather than drifted live fields", async () => {
    const data = input();
    data.data.expenses = [];
    data.data.documents = [
      { ...data.data.documents[0], date: "2027-01-01", number: "LIVE-WRONG" },
    ];
    const result = await buildAdvisorPackage(data, { readOriginals: vi.fn() });
    const files = unzipSync(new Uint8Array(await result.blob.arrayBuffer()));
    expect(
      Object.keys(files).some((path) =>
        path.includes("2026-04/Facturas emitidas/F-2026-1.pdf"),
      ),
    ).toBe(true);
    const csv = strFromU8(
      files[
        Object.keys(files).find((path) =>
          path.endsWith("Facturas emitidas.csv"),
        )!
      ],
    );
    expect(csv).toContain("2026-04-12;F-2026-1");
    expect(csv).not.toContain("LIVE-WRONG");
  });
  it("supports expenses-only and invoices-only periods without requiring fake documents", async () => {
    const data = input();
    data.data.documents = [];
    expect(
      (
        await buildAdvisorPackage(data, {
          readOriginals: async () => new Map(),
        })
      ).invoiceCount,
    ).toBe(0);
    data.data.expenses = [];
    await expect(
      buildAdvisorPackage(data, { readOriginals: vi.fn() }),
    ).rejects.toThrow(/No hay/);
  });
  it("blocks fiscal integrity errors before downloading originals", async () => {
    const data = input();
    data.data.documents[0] = {
      ...data.data.documents[0],
      snapshotSeal: undefined,
    };
    const reader = vi.fn();
    await expect(
      buildAdvisorPackage(data, { readOriginals: reader }),
    ).rejects.toThrow();
    expect(reader).not.toHaveBeenCalled();
  });
  it("does not hide a known inbox original that failed to download", async () => {
    const data = input();
    data.data.expenses[0].sourceInboxItemId = "synthetic-inbox";
    await expect(
      buildAdvisorPackage(data, { readOriginals: async () => new Map() }),
    ).rejects.toThrow(/original conocido/);
  });
  it("aborts on a company switch or file failure, and enforces its memory budget", async () => {
    let current = true;
    await expect(
      buildAdvisorPackage(input(), {
        isCurrent: () => current,
        readOriginals: async () => {
          current = false;
          return new Map();
        },
      }),
    ).rejects.toThrow(/empresa cambió/);
    await expect(
      buildAdvisorPackage(input(), {
        readOriginals: async () => {
          throw new Error("original corrupto");
        },
      }),
    ).rejects.toThrow(/corrupto/);
    await expect(
      buildAdvisorPackage(input(), {
        maxBytes: 1,
        readOriginals: async () => new Map(),
      }),
    ).rejects.toThrow(/300 MB/);
  });
  it("prepares only the configured advisor email with correct counts, without sending anything", () => {
    const email = buildAdvisorPackageEmail(profile, "Abril-Junio 2026", {
      fileName: "Gestoria.zip",
      invoiceCount: 2,
      expenseCount: 3,
      originalCount: 2,
      missingOriginalCount: 1,
    });
    expect(email?.recipient).toBe("gestor@example.test");
    expect(email?.body).toContain("organizados por meses");
    expect(email?.body).toContain("1 gastos sin archivo");
    expect(
      buildAdvisorPackageEmail(
        { ...profile, advisorContact: undefined },
        "Mes",
        {
          fileName: "x",
          invoiceCount: 0,
          expenseCount: 0,
          originalCount: 0,
          missingOriginalCount: 0,
        },
      ),
    ).toBeNull();
  });
});
