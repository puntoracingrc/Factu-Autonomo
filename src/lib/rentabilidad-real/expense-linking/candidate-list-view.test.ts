import { describe, expect, it } from "vitest";
import type { Expense } from "@/lib/types";
import type { RentabilidadRealExpenseLinkCandidate } from "./types";
import {
  filterAndSortExpenseLinkCandidates,
  groupExpenseLinkCandidatesByMonth,
} from "./candidate-list-view";

function expenseFixture(overrides: Partial<Expense> = {}): Expense {
  return {
    id: "expense_1",
    date: "2026-07-02",
    supplierName: "Proveedor",
    description: "Material",
    amount: 100,
    ivaPercent: 21,
    category: "Material",
    paymentMethod: "Tarjeta",
    createdAt: "2026-07-02T10:00:00.000Z",
    ...overrides,
  };
}

type CandidateFixtureOverrides = Omit<
  Partial<RentabilidadRealExpenseLinkCandidate>,
  "expense"
> & {
  expense?: Partial<Expense>;
};

function candidateFixture(
  overrides: CandidateFixtureOverrides = {},
): RentabilidadRealExpenseLinkCandidate {
  const { expense, ...candidateOverrides } = overrides;
  return {
    expense: expenseFixture(expense),
    status: "unlinked_candidate",
    suggestedReason: "Gasto candidato.",
    warnings: [],
    score: overrides.score ?? 0,
    ...candidateOverrides,
  };
}

describe("rentabilidad real expense candidate list view", () => {
  it("ordena candidatos por fecha descendente aunque tengan distinto score", () => {
    const oldHighScore = candidateFixture({
      score: 100,
      expense: { id: "old", date: "2026-05-10" },
    });
    const recentLowScore = candidateFixture({
      score: 1,
      expense: { id: "recent", date: "2026-07-03" },
    });

    const result = filterAndSortExpenseLinkCandidates([
      oldHighScore,
      recentLowScore,
    ]);

    expect(result.map((candidate) => candidate.expense.id)).toEqual([
      "recent",
      "old",
    ]);
  });

  it("busca por descripcion de linea o referencia de proveedor", () => {
    const matching = candidateFixture({
      expense: {
        id: "matching",
        purchaseLines: [
          {
            id: "line_1",
            description: "Canal adhesiva PVC blanco",
            supplierReference: "PVC-16X10",
            quantity: 1,
            unitPrice: 7,
          },
        ],
      },
    });
    const unrelated = candidateFixture({
      expense: { id: "unrelated", description: "Lubricante" },
    });

    const byDescription = filterAndSortExpenseLinkCandidates(
      [matching, unrelated],
      { query: "adhesiva" },
    );
    const byReference = filterAndSortExpenseLinkCandidates(
      [matching, unrelated],
      { query: "16x10" },
    );

    expect(byDescription.map((candidate) => candidate.expense.id)).toEqual([
      "matching",
    ]);
    expect(byReference.map((candidate) => candidate.expense.id)).toEqual([
      "matching",
    ]);
  });

  it("filtra por proveedor y agrupa por mes de gasto", () => {
    const june = candidateFixture({
      expense: {
        id: "june",
        date: "2026-06-10",
        supplierName: "Metalurgica Arandes S.L.",
      },
    });
    const july = candidateFixture({
      expense: {
        id: "july",
        date: "2026-07-03",
        supplierName: "Otro proveedor",
      },
    });

    const filtered = filterAndSortExpenseLinkCandidates([june, july], {
      supplierFilterKey: "name:metalurgica arandes s.l.",
    });
    const groups = groupExpenseLinkCandidatesByMonth(filtered);

    expect(filtered.map((candidate) => candidate.expense.id)).toEqual(["june"]);
    expect(groups).toHaveLength(1);
    expect(groups[0].key).toBe("2026-06");
    expect(groups[0].label).toBe("Junio de 2026");
  });
});
