"use client";

import { Trash2 } from "lucide-react";
import { FactuEmptyState } from "@/components/factu/FactuEmptyState";
import { ButtonLink } from "@/components/ui/Button";
import { Card, PageHeader } from "@/components/ui/Card";
import { useAppStore } from "@/context/AppStore";
import { formatMoney, formatShortDate } from "@/lib/calculations";
import { expenseAmount, isVatExempt } from "@/lib/vat-regime";

export default function GastosPage() {
  const { data, deleteExpense } = useAppStore();
  const expenses = [...data.expenses].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );
  const vatExempt = isVatExempt(data.profile);
  const total = expenses.reduce(
    (sum, e) => sum + expenseAmount(e, vatExempt),
    0,
  );

  return (
    <div>
      <PageHeader
        title="Gastos y compras"
        subtitle="Registra lo que gastas en tu negocio"
        action={<ButtonLink href="/gastos/nuevo">+ Añadir gasto</ButtonLink>}
      />

      <Card className="mb-6 border-emerald-200 bg-emerald-50">
        <p className="text-sm text-emerald-700">Total gastado</p>
        <p className="text-2xl font-bold text-emerald-900">
          {formatMoney(total)}
        </p>
        {vatExempt && (
          <p className="mt-1 text-xs text-emerald-800">
            Sin IVA deducible (exento de repercusión)
          </p>
        )}
      </Card>

      {expenses.length === 0 ? (
        <FactuEmptyState
          variant="gasto"
          action={<ButtonLink href="/gastos/nuevo">Añadir gasto</ButtonLink>}
        />
      ) : (
        <div className="space-y-3">
          {expenses.map((expense) => (
            <Card
              key={expense.id}
              className="flex items-center justify-between gap-3"
            >
              <div>
                <p className="font-semibold text-slate-900">
                  {expense.description}
                </p>
                <p className="text-sm text-slate-500">
                  {expense.supplierName} · {formatShortDate(expense.date)}
                </p>
                <p className="text-xs text-slate-400">
                  {expense.category} · {expense.paymentMethod}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-red-700">
                  {formatMoney(expenseAmount(expense, vatExempt))}
                </span>
                <button
                  onClick={() => {
                    if (confirm("¿Borrar este gasto?")) deleteExpense(expense.id);
                  }}
                  className="rounded-xl bg-red-50 p-2 text-red-600"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
