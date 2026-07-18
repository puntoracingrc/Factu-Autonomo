"use client";

import { Card } from "@/components/ui/Card";
import { formatMoney } from "@/lib/calculations";

export interface MonthlyBenefitRow {
  key: string;
  label: string;
  invoiced: number;
  spent: number;
  benefit: number;
  pendingInvoiceNumbers: string[];
  pendingTotal: number;
  realBenefitToday: number;
}

interface PeriodOverviewCardsProps {
  invoicedIncome: number;
  spent: number;
  grossProfit: number;
  estimatedIrpfBase: number;
  ivaToPay: number;
  ivaCredit: number;
  irpfEstimate: number;
  profitAfterIrpfReserve: number;
  hasNonDeductibleExpenses?: boolean;
  monthlyBenefitRows?: MonthlyBenefitRow[];
}

function formatPendingInvoiceList(numbers: string[]): string {
  if (numbers.length <= 3) return numbers.join(", ");
  return `${numbers.slice(0, 3).join(", ")} y ${numbers.length - 3} más`;
}

/** Resumen claro del periodo: lo que entra, sale, conviene apartar y queda. */
export function PeriodOverviewCards({
  invoicedIncome,
  spent,
  grossProfit,
  estimatedIrpfBase,
  ivaToPay,
  ivaCredit,
  irpfEstimate,
  profitAfterIrpfReserve,
  hasNonDeductibleExpenses = false,
  monthlyBenefitRows = [],
}: PeriodOverviewCardsProps) {
  const balance = invoicedIncome - spent;
  const expenseBalanceIsCredit = spent < 0;
  const totalToSetAside = ivaToPay + irpfEstimate;
  const pendingInvoiceNumbers = monthlyBenefitRows.flatMap(
    (row) => row.pendingInvoiceNumbers,
  );
  const pendingTotal = monthlyBenefitRows.reduce(
    (sum, row) => sum + row.pendingTotal,
    0,
  );
  const realBenefitToday = balance - pendingTotal;

  return (
    <div className="mb-4 rounded-2xl border border-blue-100 bg-blue-50/70 p-4">
      <div className="mb-3">
        <p className="text-base font-black text-slate-950">Resumen rápido</p>
        <p className="text-sm text-slate-600">
          Pim pam: esto es lo que entra, lo que sale y lo que conviene apartar.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="border-green-200 bg-white">
          <p className="text-sm font-medium text-green-700">Has facturado</p>
          <p className="mt-1 text-2xl font-bold text-green-900">
            {formatMoney(invoicedIncome)}
          </p>
        </Card>
        <Card className="border-red-200 bg-white">
          <p className="text-sm font-medium text-red-700">
            {expenseBalanceIsCredit ? "Tienes saldo a favor" : "Has gastado"}
          </p>
          <p className="mt-1 text-2xl font-bold text-red-900">
            {formatMoney(Math.abs(spent))}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Balance: {formatMoney(balance)}
          </p>
        </Card>
        <Card className="border-orange-200 bg-white">
          <p className="text-sm font-medium text-orange-700">
            Aparta para impuestos
          </p>
          <p className="mt-1 text-2xl font-bold text-orange-900">
            {formatMoney(totalToSetAside)}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            IVA {formatMoney(ivaToPay)}
            {ivaCredit > 0 ? ` · a compensar ${formatMoney(ivaCredit)}` : ""} ·
            IRPF {formatMoney(irpfEstimate)}
          </p>
        </Card>
        <Card className="border-violet-200 bg-white">
          <p className="text-sm font-medium text-violet-700">
            Te queda aprox.
          </p>
          <p className="mt-1 text-2xl font-bold text-violet-900">
            {formatMoney(profitAfterIrpfReserve)}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Beneficio antes de IRPF: {formatMoney(grossProfit)}
            {hasNonDeductibleExpenses
              ? ` · base IRPF ${formatMoney(estimatedIrpfBase)}`
              : ""}
          </p>
        </Card>
      </div>
      {monthlyBenefitRows.length > 0 ? (
        <div className="mt-4 rounded-2xl border border-blue-200 bg-white p-4">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-black text-slate-950">
                Resultado por meses
              </p>
              <p className="text-xs text-slate-500">
                Facturas del mes menos gastos del mes, usando el mismo filtro
                que has elegido arriba.
              </p>
            </div>
            <p className="text-sm font-bold text-blue-900">
              Total del periodo: {formatMoney(balance)}
            </p>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {monthlyBenefitRows.map((row) => (
              <div
                key={row.key}
                className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-semibold text-slate-800">
                    Beneficio {row.label}
                  </p>
                  <p
                    className={`shrink-0 text-sm font-black ${
                      row.benefit < 0 ? "text-red-700" : "text-emerald-700"
                    }`}
                  >
                    {formatMoney(row.benefit)}
                  </p>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  Facturado {formatMoney(row.invoiced)} · gastos{" "}
                  {formatMoney(Math.abs(row.spent))}
                </p>
              </div>
            ))}
          </div>
          <div
            className={`mt-3 rounded-xl border px-3 py-2 text-sm ${
              pendingInvoiceNumbers.length > 0
                ? "border-amber-200 bg-amber-50 text-amber-950"
                : "border-emerald-200 bg-emerald-50 text-emerald-950"
            }`}
          >
            {pendingInvoiceNumbers.length > 0 ? (
              <p>
                Falta por cobrar {formatPendingInvoiceList(pendingInvoiceNumbers)}{" "}
                ({formatMoney(pendingTotal)}). Tu beneficio real a día de hoy,
                contando solo lo cobrado, es {formatMoney(realBenefitToday)}.
              </p>
            ) : (
              <p>
                No tienes facturas pendientes de cobrar en este periodo. Tu
                beneficio real a día de hoy coincide con el del periodo:{" "}
                {formatMoney(balance)}.
              </p>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
