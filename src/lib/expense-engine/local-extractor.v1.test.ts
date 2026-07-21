import { describe, expect, it } from "vitest";
import {
  createAbstainedDocumentReadingOutcomeV1,
  createReadableDocumentReadingOutcomeV1,
  type DocumentReadingPageV1,
} from "../document-reading/contracts.v1";
import {
  extractExpenseCandidateFromReadingV1,
  extractExpenseCandidateLocallyV1,
} from "./local-extractor.v1";

const PRIVATE_SUPPLIER = "Proveedor Diferente SL";
const PRIVATE_TAX_ID = "B00000000";

function page(
  input: {
    total?: string;
    includeDate?: boolean;
    documentHeading?: string;
  } = {},
): DocumentReadingPageV1 {
  const total = input.total ?? "36,30 EUR";
  const includeDate = input.includeDate ?? true;
  const documentHeading = input.documentHeading ?? "FACTURA F-2026-001";
  const rows = [
    [PRIVATE_SUPPLIER],
    ["NIF", PRIVATE_TAX_ID],
    [documentHeading],
    ...(includeDate ? [["Fecha", "21/07/2026"]] : []),
    ["Referencia", "Descripcion", "Cantidad", "Ud", "Precio", "Importe"],
    ["A-1", "Producto uno", "2", "ud", "10,00", "20,00"],
    ["B-2", "Servicio dos", "1", "ud", "10,00", "10,00"],
    ["Base imponible", "30,00 EUR"],
    ["IVA 21%", "6,30 EUR"],
    ["TOTAL FACTURA", total],
  ];
  return {
    pageNumber: 1,
    text: rows.map((row) => row.join(" | ")).join("\n"),
    isBlank: false,
    layoutRows: rows.map((row, rowIndex) => ({
      yMilli: rowIndex * 1_000,
      cells: row.map((text, columnIndex) => ({
        xMilli: columnIndex * 10_000,
        widthMilli: 8_000,
        text,
      })),
    })),
  };
}

function summaryPage(total: string): DocumentReadingPageV1 {
  const rows = [
    [PRIVATE_SUPPLIER],
    ["FACTURA F-2026-002"],
    ["Fecha", "21/07/2026"],
    ["TOTAL FACTURA", total],
  ];
  return {
    pageNumber: 1,
    text: rows.map((row) => row.join(" | ")).join("\n"),
    isBlank: false,
    layoutRows: rows.map((row, rowIndex) => ({
      yMilli: rowIndex * 1_000,
      cells: row.map((text, columnIndex) => ({
        xMilli: columnIndex * 10_000,
        widthMilli: 8_000,
        text,
      })),
    })),
  };
}

describe("expense local extractor v1", () => {
  it("extrae una factura tabular por posiciones y reconcilia importes", () => {
    const result = extractExpenseCandidateLocallyV1([page()]);

    expect(result.status).toBe("CANDIDATE");
    if (result.status !== "CANDIDATE") return;
    expect(result.structuralArchetypeId).toBe("LINE_TABLE");
    expect(result.localConfidence).toBe("HIGH");
    expect(result.ephemeralCandidate.supplierName).toBe(PRIVATE_SUPPLIER);
    expect(result.ephemeralCandidate.supplierTaxId).toBe(PRIVATE_TAX_ID);
    expect(result.ephemeralCandidate.date).toBe("2026-07-21");
    expect(result.ephemeralCandidate.total).toBe(36.3);
    expect(result.ephemeralCandidate.lines).toHaveLength(2);
    expect(
      result.math.find((check) => check.check === "DOCUMENT_TOTAL")?.verdict,
    ).toBe("MATCH");
    expect(
      result.math.find((check) => check.check === "LINES_TO_BASE")?.verdict,
    ).toBe("MATCH");
  });

  it("no serializa texto, identidades ni valores del candidato", () => {
    const result = extractExpenseCandidateLocallyV1([page()]);
    const serialized = JSON.stringify(result);

    expect(serialized).not.toContain(PRIVATE_SUPPLIER);
    expect(serialized).not.toContain(PRIVATE_TAX_ID);
    expect(serialized).not.toContain("Producto uno");
    expect(serialized).not.toContain("36.3");
    expect(serialized).toContain('"promotionPolicy":"BLOCKED"');
  });

  it("se abstiene ante documentos que no son gastos", () => {
    const result = extractExpenseCandidateLocallyV1([
      page({ documentHeading: "PRESUPUESTO P-2026-001" }),
    ]);

    expect(result.status).toBe("ABSTAINED");
    expect(result.abstentionReason).toBe("UNSUPPORTED_ARCHETYPE");
    expect(result.documentKind).toBe("QUOTE_OR_ORDER");
  });

  it("se abstiene si el tipo de documento no está reconocido", () => {
    const result = extractExpenseCandidateLocallyV1([
      page({ documentHeading: "DOCUMENTO D-2026-001" }),
    ]);

    expect(result.status).toBe("ABSTAINED");
    expect(result.abstentionReason).toBe("UNSUPPORTED_ARCHETYPE");
    expect(result.documentKind).toBe("OTHER");
  });

  it("se abstiene si faltan campos obligatorios", () => {
    const result = extractExpenseCandidateLocallyV1([
      page({ includeDate: false }),
    ]);

    expect(result.status).toBe("ABSTAINED");
    expect(result.abstentionReason).toBe("MISSING_FIELDS");
  });

  it("se abstiene si la aritmética del documento no reconcilia", () => {
    const result = extractExpenseCandidateLocallyV1([
      page({ total: "99,00 EUR" }),
    ]);

    expect(result.status).toBe("ABSTAINED");
    expect(result.abstentionReason).toBe("MATH_UNRECONCILED");
    expect(
      result.math.find((check) => check.check === "DOCUMENT_TOTAL")?.verdict,
    ).toBe("MISMATCH");
  });

  it("se abstiene ante una contradicción fiscal aunque el total cuadre", () => {
    const input = page();
    const tamperedRows = input.layoutRows?.map((row, index) =>
      index === 8
        ? {
            ...row,
            cells: [
              { xMilli: 0, widthMilli: 8_000, text: "IVA 10%" },
              { xMilli: 10_000, widthMilli: 8_000, text: "6,30 EUR" },
            ],
          }
        : row,
    );
    const result = extractExpenseCandidateLocallyV1([
      { ...input, layoutRows: tamperedRows },
    ]);

    expect(result.status).toBe("ABSTAINED");
    expect(result.abstentionReason).toBe("MATH_UNRECONCILED");
    expect(
      result.math.find((check) => check.check === "TAX_FROM_BASE")?.verdict,
    ).toBe("MISMATCH");
  });

  it("interpreta agrupadores monetarios sin reducir el importe por mil", () => {
    const result = extractExpenseCandidateLocallyV1([
      summaryPage("1.234,56 EUR"),
    ]);

    expect(result.status).toBe("CANDIDATE");
    if (result.status !== "CANDIDATE") return;
    expect(result.ephemeralCandidate.total).toBe(1_234.56);
  });

  it("se abstiene ante formatos monetarios ambiguos", () => {
    const result = extractExpenseCandidateLocallyV1([
      summaryPage("1.234.56 EUR"),
    ]);

    expect(result.status).toBe("ABSTAINED");
    expect(result.abstentionReason).toBe("MISSING_FIELDS");
  });

  it("se abstiene si hay más líneas de las que reconcilia el motor", () => {
    const input = page();
    const header = input.layoutRows?.slice(0, 5) ?? [];
    const lines = Array.from({ length: 51 }, (_, index) => ({
      yMilli: (index + 5) * 1_000,
      cells: [
        { xMilli: 0, widthMilli: 8_000, text: `R-${index + 1}` },
        { xMilli: 10_000, widthMilli: 8_000, text: `Linea ${index + 1}` },
        { xMilli: 20_000, widthMilli: 8_000, text: "1" },
        { xMilli: 30_000, widthMilli: 8_000, text: "ud" },
        { xMilli: 40_000, widthMilli: 8_000, text: "1,00" },
        { xMilli: 50_000, widthMilli: 8_000, text: "1,00" },
      ],
    }));
    const totals = [
      ["Base imponible", "51,00 EUR"],
      ["IVA 21%", "10,71 EUR"],
      ["TOTAL FACTURA", "61,71 EUR"],
    ].map((row, index) => ({
      yMilli: (index + 56) * 1_000,
      cells: row.map((text, columnIndex) => ({
        xMilli: columnIndex * 10_000,
        widthMilli: 8_000,
        text,
      })),
    }));
    const layoutRows = [...header, ...lines, ...totals];
    const result = extractExpenseCandidateLocallyV1([
      {
        ...input,
        text: layoutRows
          .map((row) => row.cells.map((cell) => cell.text).join(" | "))
          .join("\n"),
        layoutRows,
      },
    ]);

    expect(result.status).toBe("ABSTAINED");
    expect(result.abstentionReason).toBe("LIMIT_EXCEEDED");
  });

  it("se abstiene si el documento supera el límite semántico de filas", () => {
    const makeRows = (count: number, offset: number) =>
      Array.from({ length: count }, (_, index) => ({
        yMilli: index * 1_000,
        cells: [
          {
            xMilli: 0,
            widthMilli: 8_000,
            text:
              offset + index === 0
                ? "FACTURA F-2026-003"
                : offset + index === 1
                  ? "Fecha 21/07/2026"
                  : offset + index === 2
                    ? "TOTAL FACTURA 25,00 EUR"
                    : `Fila ${offset + index}`,
          },
        ],
      }));
    const firstRows = makeRows(3_000, 0);
    const secondRows = makeRows(2_001, 3_000);
    const pages: DocumentReadingPageV1[] = [firstRows, secondRows].map(
      (layoutRows, index) => ({
        pageNumber: index + 1,
        text: layoutRows.map((row) => row.cells[0].text).join("\n"),
        isBlank: false,
        layoutRows,
      }),
    );

    const result = extractExpenseCandidateLocallyV1(pages);

    expect(result.status).toBe("ABSTAINED");
    expect(result.abstentionReason).toBe("LIMIT_EXCEEDED");
  });

  it("consume contenido legible efímero desde el contrato neutral", () => {
    const reading = createReadableDocumentReadingOutcomeV1({
      source: {
        mimeType: "application/pdf",
        byteLength: 512,
        sha256: "a".repeat(64),
      },
      pages: [page()],
    });
    const result = extractExpenseCandidateFromReadingV1(reading);

    expect(result.status).toBe("CANDIDATE");
    expect(JSON.stringify(result)).not.toContain(PRIVATE_SUPPLIER);
    expect(JSON.stringify(reading)).not.toContain("a".repeat(64));
  });

  it("traduce abstenciones del lector sin exponer el origen", () => {
    const reading = createAbstainedDocumentReadingOutcomeV1({
      reason: "TOO_MANY_PAGES",
    });
    const result = extractExpenseCandidateFromReadingV1(reading);

    expect(result.status).toBe("ABSTAINED");
    expect(result.abstentionReason).toBe("LIMIT_EXCEEDED");
    expect(result.sourceQualityBucket).toBe("UNREADABLE");
  });

  it("rechaza entradas fuera del contrato neutral", () => {
    const result = extractExpenseCandidateLocallyV1([
      { pageNumber: 2, text: "FACTURA", isBlank: false },
    ]);

    expect(result.status).toBe("ABSTAINED");
    expect(result.abstentionReason).toBe("INVALID_INPUT");
    expect(result.sourceQualityBucket).toBe("UNREADABLE");
  });

  it("mantiene precisión fail-closed en un documento por layout sintético", async () => {
    const benchmark =
      await import("../../../scripts/invoice-benchmark/lib.mjs");
    const fixtures = benchmark
      .discoverInvoiceFixtures()
      .filter((fixture: { isPrivate?: boolean }) => !fixture.isPrivate);
    const byLayout = new Map<string, (typeof fixtures)[number]>();
    for (const fixture of fixtures) {
      if (!byLayout.has(fixture.layoutId))
        byLayout.set(fixture.layoutId, fixture);
    }
    const sample = [...byLayout.values()];
    const failures: string[] = [];
    let candidateCount = 0;

    for (const fixture of sample) {
      const extracted = await benchmark.extractPdfRows(fixture.pdfPath);
      const expected = benchmark.normalizeExpectedInvoice(
        benchmark.readJson(fixture.groundTruthPath),
        fixture,
      );
      const pages = Array.from(
        { length: extracted.pageCount },
        (_, pageIndex) => {
          const pageRows = extracted.rows.filter(
            (row: { page: number }) => row.page === pageIndex + 1,
          );
          return {
            pageNumber: pageIndex + 1,
            text: pageRows.map((row: { text: string }) => row.text).join("\n"),
            isBlank: pageRows.length === 0,
            layoutRows: pageRows.map(
              (row: { y: number; cells: string[] }, rowIndex: number) => ({
                yMilli: Math.round((row.y || rowIndex) * 1_000),
                cells: row.cells.map((text, cellIndex) => ({
                  xMilli: cellIndex * 10_000,
                  widthMilli: 8_000,
                  text,
                })),
              }),
            ),
          };
        },
      );
      const result = extractExpenseCandidateLocallyV1(pages);
      if (result.status === "ABSTAINED") continue;
      candidateCount += 1;
      const candidate = result.ephemeralCandidate;
      const expectedTotal = expected.totals.total;
      if (candidate.date !== expected.metadata.date) {
        failures.push(`${fixture.layoutId}:date`);
      }
      if (
        candidate.total === undefined ||
        expectedTotal === undefined ||
        Math.abs(candidate.total - expectedTotal) > 0.02
      ) {
        failures.push(`${fixture.layoutId}:total`);
      }
    }

    expect(sample).toHaveLength(30);
    expect(candidateCount).toBeGreaterThanOrEqual(11);
    expect(failures).toEqual([]);
  }, 120_000);
});
