import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { formatMoney } from "@/lib/calculations";
import type { RentabilidadRealEvolutionPeriodRow } from "@/lib/rentabilidad-real/evolution";
import type {
  RentabilidadRealClientReportRow,
  RentabilidadRealDocumentReportRow,
} from "@/lib/rentabilidad-real/reports";
import {
  buildClientProfitabilityRowViewModel,
  buildDocumentProfitabilityRowViewModel,
  buildEvolutionRowViewModel,
} from "./report-table-view-models";

const clientTableSource = readFileSync(
  new URL("./informes/ClientProfitabilityTable.tsx", import.meta.url),
  "utf8",
);
const documentTableSource = readFileSync(
  new URL("./informes/DocumentProfitabilityTable.tsx", import.meta.url),
  "utf8",
);
const evolutionTableSource = readFileSync(
  new URL("./evolucion/EvolutionTable.tsx", import.meta.url),
  "utf8",
);

function clientRow(): RentabilidadRealClientReportRow {
  return {
    clientId: "client-responsive",
    clientName: "Cliente Responsive",
    documentCount: 7,
    invoiceCount: 6,
    quoteOnlyCount: 1,
    incomeWithoutIndirectTax: 12_345.67,
    totalDirectCosts: 4_321.09,
    allocatedFixedCosts: 850.25,
    operatingProfit: 7_174.33,
    averageMarginPercentage: 58.11,
    estimatedVatToReserve: 1_200,
    estimatedIrpfProvision: 1_076.15,
    prudentAvailableCash: 4_898.18,
    internalAdjustmentsTotal: -125.5,
    internalRealProfit: 7_048.83,
    internalPrudentAvailableCash: 4_772.68,
    lowMarginDocumentsCount: 2,
    negativeProfitDocumentsCount: 1,
    unlinkedCandidatesCount: 3,
    warnings: [
      {
        code: "responsive-warning",
        message: "Aviso de prueba",
        severity: "warning",
      },
    ],
  };
}

function documentRow(): RentabilidadRealDocumentReportRow {
  return {
    unitId: "unit-responsive",
    primaryDocumentId: "document-responsive",
    sourceType: "invoice",
    workSourceType: "invoice",
    analysisMode: "installation_with_materials",
    documentLabel: "Factura F-RESP-390",
    clientId: "client-responsive",
    clientName: "Cliente Documento Responsive",
    date: "2026-07-11",
    incomeWithoutIndirectTax: 9_876.54,
    totalDirectCosts: 2_345.67,
    linkedExpensesCount: 4,
    unlinkedCandidatesCount: 2,
    allocatedFixedCosts: 765.43,
    operatingProfit: 6_765.44,
    marginPercentage: 68.5,
    estimatedVatToReserve: 1_234.56,
    estimatedIrpfProvision: 1_014.82,
    prudentAvailableCash: 4_516.06,
    internalAdjustmentsTotal: -222.22,
    internalRealProfit: 6_543.22,
    internalPrudentAvailableCash: 4_293.84,
    warnings: [],
    sourceLinks: [
      {
        sourceType: "invoice",
        sourceId: "document-responsive",
        label: "Factura F-RESP-390",
        href: "/facturas/document-responsive",
      },
    ],
    qualityFlags: ["has_unlinked_candidates", "low_margin"],
  };
}

function evolutionRow(): RentabilidadRealEvolutionPeriodRow {
  return {
    periodId: "2026-Q3",
    periodLabel: "Tercer trimestre 2026",
    periodStartDate: "2026-07-01",
    periodEndDate: "2026-09-30",
    documentCount: 11,
    incomeWithoutIndirectTax: 23_456.78,
    totalDirectCosts: 7_654.32,
    allocatedFixedCosts: 1_111.11,
    operatingProfit: 14_691.35,
    averageMarginPercentage: 62.63,
    estimatedVatToReserve: 2_468.01,
    estimatedIrpfProvision: 2_203.7,
    prudentAvailableCash: 10_019.64,
    internalAdjustmentsTotal: -333.33,
    internalRealProfit: 14_358.02,
    internalPrudentAvailableCash: 9_686.31,
    lowMarginDocumentsCount: 2,
    negativeProfitDocumentsCount: 1,
    unlinkedCandidatesCount: 4,
    documentsWithoutAnalysisMode: 3,
    modeBreakdown: [
      {
        analysisMode: "fixed_price_work",
        documentCount: 8,
        incomeWithoutIndirectTax: 18_000,
        operatingProfit: 11_000,
      },
      {
        analysisMode: "hours_project",
        documentCount: 3,
        incomeWithoutIndirectTax: 5_456.78,
        operatingProfit: 3_691.35,
      },
    ],
  };
}

function occurrenceCount(source: string, value: string): number {
  return source.split(value).length - 1;
}

function expectResponsiveSourceContract({
  source,
  mobileLabel,
  tableLabel,
  fields,
  sharedPresentations,
}: {
  source: string;
  mobileLabel: string;
  tableLabel: string;
  fields: string[];
  sharedPresentations: string[];
}) {
  expect(source).toContain(`aria-label="${mobileLabel}"`);
  expect(source).toContain('className="xl:hidden"');
  expect(source).toContain('className="hidden xl:block"');
  expect(source).toContain("<article");
  expect(source).toContain("<dl");
  expect(source).toContain("<table");
  expect(source).toContain('role="region"');
  expect(source).toContain(`aria-label="${tableLabel}"`);
  expect(source).toContain("aria-describedby={scrollHelpId}");
  expect(source).toContain("tabIndex={0}");
  expect(source).toContain("overflow-x-auto");
  expect(source).toContain(
    "Si no ves todas las columnas, desplaza la tabla horizontalmente.",
  );
  expect(occurrenceCount(source, "viewRows.map")).toBe(2);

  const mobileStart = source.indexOf(`aria-label="${mobileLabel}"`);
  const desktopStart = source.indexOf(
    '<div className="hidden xl:block">',
    mobileStart,
  );
  expect(mobileStart).toBeGreaterThanOrEqual(0);
  expect(desktopStart).toBeGreaterThan(mobileStart);
  expect(source.slice(mobileStart, desktopStart)).not.toContain(
    "overflow-x-auto",
  );

  for (const field of fields) {
    const directBindings = occurrenceCount(
      source,
      `data-report-field="${field}"`,
    );
    const mobileMetricBindings = occurrenceCount(source, ` field="${field}"`);
    expect(
      directBindings + mobileMetricBindings,
      `el campo ${field} debe usar el mismo view-model en móvil y tabla`,
    ).toBe(2);
  }
  for (const presentation of sharedPresentations) {
    expect(occurrenceCount(source, `<${presentation}`)).toBe(2);
  }
}

describe("contrato responsive de tablas de Rentabilidad Real", () => {
  it("preserva el estado OK cuando no hay alertas en ningún formato", () => {
    expect(
      buildClientProfitabilityRowViewModel({
        ...clientRow(),
        lowMarginDocumentsCount: 0,
        negativeProfitDocumentsCount: 0,
        unlinkedCandidatesCount: 0,
        warnings: [],
      }).alerts,
    ).toEqual([{ label: "OK", tone: "ok" }]);
    expect(
      buildDocumentProfitabilityRowViewModel({
        ...documentRow(),
        qualityFlags: [],
        unlinkedCandidatesCount: 0,
      }).qualityFlagLabels,
    ).toEqual(["OK"]);
    expect(
      buildEvolutionRowViewModel({
        ...evolutionRow(),
        lowMarginDocumentsCount: 0,
        negativeProfitDocumentsCount: 0,
        unlinkedCandidatesCount: 0,
        documentsWithoutAnalysisMode: 0,
      }).alerts,
    ).toEqual([]);
  });

  it("construye una única fila de cliente con todas las cifras y estados visibles", () => {
    const row = clientRow();

    expect(buildClientProfitabilityRowViewModel(row)).toEqual({
      clientId: row.clientId,
      clientName: row.clientName,
      documentCount: "7",
      incomeWithoutIndirectTax: formatMoney(row.incomeWithoutIndirectTax),
      operatingProfit: formatMoney(row.operatingProfit),
      internalRealProfit: formatMoney(row.internalRealProfit),
      averageMarginPercentage: "58,11%",
      alerts: [
        { label: "2 margen bajo", tone: "warning" },
        { label: "1 negativo", tone: "risk" },
        { label: "3 candidatos", tone: "info" },
      ],
    });

    expectResponsiveSourceContract({
      source: clientTableSource,
      mobileLabel: "Rentabilidad por cliente en formato móvil",
      tableLabel: "Tabla completa de rentabilidad por cliente",
      fields: [
        "clientName",
        "documentCount",
        "incomeWithoutIndirectTax",
        "operatingProfit",
        "internalRealProfit",
        "averageMarginPercentage",
      ],
      sharedPresentations: ["ClientAlerts", "ClientAction"],
    });
  });

  it("construye una única fila de documento con cifras, modo, alertas y acciones", () => {
    const row = documentRow();

    expect(buildDocumentProfitabilityRowViewModel(row)).toEqual({
      unitId: row.unitId,
      primaryDocumentId: row.primaryDocumentId,
      documentLabel: row.documentLabel,
      analysisMode: row.analysisMode,
      analysisModeLabel: "Instalacion con materiales",
      clientName: row.clientName,
      date: row.date,
      incomeWithoutIndirectTax: formatMoney(row.incomeWithoutIndirectTax),
      totalDirectCosts: formatMoney(row.totalDirectCosts),
      allocatedFixedCosts: formatMoney(row.allocatedFixedCosts),
      operatingProfit: formatMoney(row.operatingProfit),
      internalRealProfit: formatMoney(row.internalRealProfit),
      marginPercentage: "68,5%",
      qualityFlagLabels: ["Candidatos", "Margen bajo"],
      hasUnlinkedCandidates: true,
      sourceHref: "/facturas/document-responsive",
    });

    expectResponsiveSourceContract({
      source: documentTableSource,
      mobileLabel: "Rentabilidad por documento en formato móvil",
      tableLabel: "Tabla completa de rentabilidad por documento",
      fields: [
        "documentLabel",
        "clientName",
        "date",
        "incomeWithoutIndirectTax",
        "totalDirectCosts",
        "allocatedFixedCosts",
        "operatingProfit",
        "internalRealProfit",
        "marginPercentage",
      ],
      sharedPresentations: [
        "DocumentModeControl",
        "DocumentAlerts",
        "DocumentActions",
      ],
    });
    expect(documentTableSource).toContain(
      'aria-label={`Ver documento ${row.documentLabel}`}',
    );
    expect(documentTableSource).toMatch(
      /<th\s+scope="row"[\s\S]*?data-report-field="documentLabel"/,
    );
  });

  it("construye una única fila de evolución con cifras, modos y alertas", () => {
    const row = evolutionRow();

    expect(buildEvolutionRowViewModel(row)).toEqual({
      periodId: row.periodId,
      periodLabel: row.periodLabel,
      documentCount: "11",
      incomeWithoutIndirectTax: formatMoney(row.incomeWithoutIndirectTax),
      totalDirectCosts: formatMoney(row.totalDirectCosts),
      allocatedFixedCosts: formatMoney(row.allocatedFixedCosts),
      operatingProfit: formatMoney(row.operatingProfit),
      averageMarginPercentage: "62,63%",
      prudentAvailableCash: formatMoney(row.prudentAvailableCash),
      modes: [
        { analysisMode: "fixed_price_work", label: "Obra/trabajo · 8" },
        { analysisMode: "hours_project", label: "Horas/proyecto · 3" },
      ],
      alerts: [
        "2 margen bajo",
        "1 negativo",
        "4 gastos pendientes",
        "3 sin modo",
      ],
    });

    expectResponsiveSourceContract({
      source: evolutionTableSource,
      mobileLabel: "Evolución de rentabilidad en formato móvil",
      tableLabel: "Tabla completa de evolución de rentabilidad",
      fields: [
        "periodLabel",
        "documentCount",
        "incomeWithoutIndirectTax",
        "totalDirectCosts",
        "allocatedFixedCosts",
        "operatingProfit",
        "averageMarginPercentage",
        "prudentAvailableCash",
      ],
      sharedPresentations: ["EvolutionModes", "EvolutionAlerts"],
    });
  });
});
