import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const cardSource = readFileSync(
  new URL("./ExpenseWorkAllocationRepairCard.tsx", import.meta.url),
  "utf8",
);
const accountSource = readFileSync(
  new URL("../../app/cuenta/page.tsx", import.meta.url),
  "utf8",
);
const supportSource = readFileSync(
  new URL("./SupportRecoveryToolsSection.tsx", import.meta.url),
  "utf8",
);

describe("ExpenseWorkAllocationRepairCard wiring", () => {
  it("ofrece preview, confirmación, apply atómico y rollback explícito", () => {
    expect(cardSource).toContain("buildExpenseWorkAllocationRepairPreview(data)");
    expect(cardSource).toContain("buildExpenseWorkAllocationRollbackPreview(data)");
    expect(cardSource).toContain("replaceDataIfCurrent(result.data, expected)");
    expect(cardSource).toContain("He revisado la vista previa");
    expect(cardSource).toContain("Aplicar a {preview.affectedCount}");
    expect(cardSource).toContain("Deshacer reparación");
    expect(cardSource).toContain("Ir a copia de seguridad");
    expect(cardSource).toContain("preview.affectedCount > 0 &&");
    expect(cardSource).toContain("candidate.beforeFingerprint");
    expect(cardSource).toContain("candidate.afterFingerprint");
    expect(cardSource).toContain("if (!visible) return null");
  });

  it("queda fuera de Cuenta y solo se monta con permiso temporal", () => {
    expect(accountSource).not.toContain("<ExpenseWorkAllocationRepairCard />");
    expect(accountSource).toContain("<SupportRecoveryToolsSection />");
    expect(supportSource).toContain(
      'has("expense_allocation_repair") &&',
    );
    expect(supportSource).toContain("<ExpenseWorkAllocationRepairCard />");
  });

  it("no se ejecuta desde un efecto ni llama servicios de nube", () => {
    const effectBlock = cardSource.slice(
      cardSource.indexOf("useEffect(() =>"),
      cardSource.indexOf("const visible"),
    );
    expect(effectBlock).not.toContain("applyExpenseWorkAllocationCostRepair(");
    expect(effectBlock).not.toContain("rollbackExpenseWorkAllocationCostRepair(");
    expect(cardSource).not.toContain("useCloudSync");
    expect(cardSource).not.toContain("supabase");
  });

  it("previsualiza también rollback y recupera el foco tras la mutación", () => {
    expect(cardSource).toContain("rollbackPreview.candidates.map");
    expect(cardSource).toContain("candidate.canonicalOperatingCost");
    expect(cardSource).toContain("candidate.legacyOperatingCost");
    expect(cardSource).toContain('role={feedback.tone === "error" ? "alert" : "status"}');
    expect(cardSource).toContain("feedbackRef.current?.focus()");
    expect(cardSource).toContain("tabIndex={-1}");
  });
});
