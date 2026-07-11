import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function source(file: string): string {
  return readFileSync(new URL(file, import.meta.url), "utf8");
}

describe("Rentabilidad Real fiscal presentation semantics", () => {
  it("muestra el coste económico y el estado fiscal de los gastos fijos", () => {
    for (const file of ["./FixedCostAllocationForm.tsx", "./HoursInputForm.tsx"]) {
      const contents = source(file);

      expect(contents).toContain("Coste económico");
      expect(contents).toContain("Total registrado");
      expect(contents).toContain("cost.fiscalDeductible === false");
      expect(contents).toContain("No deducible · base e IVA deducibles 0");
      expect(contents).not.toContain("Base {formatMoney(cost.amount)}");
    }
  });

  it("expone la base IRPF separada del beneficio económico", () => {
    const workCards = source("./WorkProfitabilityResultCards.tsx");
    const hoursCards = source("./HoursProfitabilityResultCards.tsx");

    expect(workCards).toContain("Base estimada para IRPF");
    expect(workCards).toContain("result.estimatedIrpfBase");
    expect(workCards).toContain("puede diferir del beneficio económico");
    expect(hoursCards).toContain("Base estimada para IRPF");
    expect(hoursCards).toContain("result.estimatedIrpfBase");
  });
});
