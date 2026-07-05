"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { Link2, Unlink } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useAppStore } from "@/context/AppStore";
import { formatMoney } from "@/lib/calculations";
import { expenseTotals } from "@/lib/expenses";
import {
  buildExpenseLinkImpact,
  buildExpenseUnlinkImpact,
  canLinkExpenseToWork,
  createExpenseWorkDocumentUnlinkPayload,
  createExpenseWorkDocumentUpdatePayload,
  type RentabilidadRealExpenseLinkCandidate,
} from "@/lib/rentabilidad-real/expense-linking";
import type { RentabilidadRealWorkProfitabilityInput } from "@/lib/rentabilidad-real/calculation";
import type { Expense } from "@/lib/types";

function originLabel(expense: Expense): string {
  if (expense.origin === "scan") return "escaneo IA";
  if (expense.origin === "import") return "importado";
  if (expense.origin === "recurring") return "recurrente";
  return "manual";
}

function confirmationText(
  message: string,
  warnings: { message: string }[],
): string {
  const relevantWarnings = warnings
    .map((warning) => warning.message)
    .filter((warning, index, list) => list.indexOf(warning) === index)
    .join("\n");
  return relevantWarnings ? `${message}\n\n${relevantWarnings}` : message;
}

export function WorkExpenseLinkingPanel({
  profitabilityInput,
}: {
  profitabilityInput: RentabilidadRealWorkProfitabilityInput;
}) {
  const { updateExpense } = useAppStore();
  const [notice, setNotice] = useState<string | null>(null);
  const targetDocumentId = profitabilityInput.source.sourceDocumentId;
  const linkedExpenses = profitabilityInput.linkedExpenses ?? [];
  const candidates = profitabilityInput.candidateUnlinkedExpenses ?? [];

  function linkExpense(candidate: RentabilidadRealExpenseLinkCandidate) {
    const expense = candidate.expense;
    const impact = buildExpenseLinkImpact(expense, targetDocumentId);
    if (!canLinkExpenseToWork(expense, targetDocumentId)) {
      window.alert(
        "Este gasto no se puede asignar como coste directo desde esta calculadora.",
      );
      return;
    }
    const confirmed = window.confirm(
      confirmationText(impact.message, impact.warnings),
    );
    if (!confirmed) return;

    updateExpense(createExpenseWorkDocumentUpdatePayload(expense, targetDocumentId));
    setNotice("El cálculo se ha actualizado usando tus gastos existentes.");
  }

  function unlinkExpense(candidate: RentabilidadRealExpenseLinkCandidate) {
    const expense = candidate.expense;
    const impact = buildExpenseUnlinkImpact(expense);
    const confirmed = window.confirm(
      confirmationText(impact.message, impact.warnings),
    );
    if (!confirmed) return;

    updateExpense(createExpenseWorkDocumentUnlinkPayload(expense));
    setNotice("El cálculo se ha actualizado usando tus gastos existentes.");
  }

  return (
    <Card className="border-slate-200/80 bg-white dark:border-slate-700 dark:bg-slate-900">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-black text-slate-950 dark:text-slate-50">
            Gastos del trabajo
          </h2>
          <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
            Asigna gastos existentes al documento seleccionado. No se crea
            ningún gasto nuevo ni se cambian importes, IVA o proveedor.
          </p>
        </div>
        <span className="inline-flex w-fit rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-black uppercase text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/35 dark:text-emerald-100">
          Usa workDocumentId
        </span>
      </div>

      {notice ? (
        <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/35 dark:text-emerald-100">
          {notice}
        </div>
      ) : null}

      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <section>
          <h3 className="text-sm font-black text-slate-950 dark:text-slate-50">
            Gastos ya enlazados
          </h3>
          <div className="mt-3 space-y-3">
            {linkedExpenses.length === 0 ? (
              <p className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/35 dark:text-amber-100">
                No hay gastos enlazados a este trabajo.
              </p>
            ) : (
              linkedExpenses.map((candidate) => (
                <ExpenseRow
                  key={candidate.expense.id}
                  candidate={candidate}
                  action={
                    <Button
                      type="button"
                      variant="secondary"
                      className="min-h-10 px-3 text-sm"
                      onClick={() => unlinkExpense(candidate)}
                    >
                      <Unlink className="h-4 w-4" />
                      Desvincular
                    </Button>
                  }
                />
              ))
            )}
          </div>
        </section>

        <section>
          <h3 className="text-sm font-black text-slate-950 dark:text-slate-50">
            Gastos candidatos sin enlazar
          </h3>
          <div className="mt-3 space-y-3">
            {candidates.length === 0 ? (
              <p className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300">
                No hay gastos candidatos sin enlazar.
              </p>
            ) : (
              candidates.map((candidate) => (
                <ExpenseRow
                  key={candidate.expense.id}
                  candidate={candidate}
                  action={
                    <Button
                      type="button"
                      className="min-h-10 px-3 text-sm"
                      onClick={() => linkExpense(candidate)}
                    >
                      <Link2 className="h-4 w-4" />
                      Asignar a este trabajo
                    </Button>
                  }
                />
              ))
            )}
          </div>
        </section>
      </div>
    </Card>
  );
}

function ExpenseRow({
  candidate,
  action,
}: {
  candidate: RentabilidadRealExpenseLinkCandidate;
  action: ReactNode;
}) {
  const expense = candidate.expense;
  const totals = expenseTotals(expense);

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/60">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="font-black text-slate-950 dark:text-slate-50">
            {expense.supplierName}
          </p>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            {expense.date} · {expense.category} · {originLabel(expense)}
          </p>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            Base {formatMoney(totals.base)} · IVA {formatMoney(totals.iva)} ·
            Total {formatMoney(totals.total)}
          </p>
          <p className="mt-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
            {candidate.suggestedReason}
          </p>
        </div>
        <div className="shrink-0">{action}</div>
      </div>
      {candidate.warnings.length > 0 ? (
        <ul className="mt-3 space-y-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
          {candidate.warnings.map((warning) => (
            <li key={warning.code}>- {warning.message}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
