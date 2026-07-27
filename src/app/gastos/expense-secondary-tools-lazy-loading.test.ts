import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("./page.tsx", import.meta.url), "utf8");

describe("carga diferida de herramientas secundarias de gastos", () => {
  it("mantiene buzón, modal de envío y gráficos fuera del bundle inicial", () => {
    expect(source).toContain('import dynamic from "next/dynamic";');
    expect(source).not.toContain(
      'import { SendMethodChooserModal } from "@/components/documents/SendMethodChooserModal";',
    );
    expect(source).not.toContain(
      'import { ExpenseInboxCard } from "@/components/expenses/ExpenseInboxCard";',
    );
    expect(source).not.toContain(
      'import { ExpenseSupplierDonut } from "@/components/expenses/ExpenseSupplierDonut";',
    );
    expect(source).toContain(
      'import("@/components/documents/SendMethodChooserModal").then(',
    );
    expect(source).toContain(
      'import("@/components/expenses/ExpenseInboxCard").then(',
    );
    expect(source).toContain(
      'import("@/components/expenses/ExpenseSupplierDonut").then(',
    );
    expect(source).toContain("<ExpenseInboxCardPlaceholder />");
    expect(source).toContain("<ExpenseSupplierDonutPlaceholder />");
  });

  it("carga CSV, ZIP de originales y parser de proveedor solo al ejecutar la acción", () => {
    expect(source).not.toContain(
      'from "@/lib/billing/export-expenses-csv";',
    );
    expect(source).not.toContain(
      'from "@/lib/billing/expense-period-advisor-email";',
    );
    expect(source).not.toContain('from "@/lib/provider-summary-file";');
    expect(source).toContain('"@/lib/billing/export-expenses-csv"');
    expect(source).toContain(
      'import("@/lib/billing/export-expense-original-archive")',
    );
    expect(source).toContain(
      'import("@/lib/billing/expense-period-advisor-email")',
    );
    expect(source).toContain('"@/lib/provider-summary-file"');
  });

  it("muestra respuesta inmediata mientras prepara acciones pesadas", () => {
    expect(source).toContain("expenseCsvBusy");
    expect(source).toContain("Preparando CSV...");
    expect(source).toContain("Preparando ZIP...");
    expect(source).toContain("Preparando envío...");
    expect(source).toContain("Leyendo resumen...");
  });
});
