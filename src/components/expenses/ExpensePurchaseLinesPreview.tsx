import { formatMoney } from "@/lib/calculations";
import {
  expensePurchaseLinesVatView,
  expenseVatSourceLabel,
} from "./expense-vat-ui";
import { expenseFiscalAmounts } from "@/lib/expenses";
import { purchaseLineHasCatalogProduct } from "@/lib/purchase-products";
import type { Expense } from "@/lib/types";

export function ExpensePurchaseLinesPreview({
  expense,
  productKeys,
  emptyLabel = "Sin líneas de producto",
  emptyClassName = "",
  vatExempt = false,
}: {
  expense: Expense;
  productKeys: Set<string>;
  emptyLabel?: string;
  emptyClassName?: string;
  vatExempt?: boolean;
}) {
  const vatView = expensePurchaseLinesVatView(expense, vatExempt);
  const vat = vatView.resolution;
  const fiscal = expenseFiscalAmounts(expense, vatExempt);
  const lines = vatView.lines
    .map((line) => ({
      ...line,
      hasProduct: purchaseLineHasCatalogProduct(line.line, productKeys),
    }))
    .filter((line) => line.description.length > 0);

  if (lines.length === 0) {
    return (
      <p
        className={`text-sm text-slate-400 dark:text-slate-500 ${emptyClassName}`.trim()}
      >
        {emptyLabel}
      </p>
    );
  }

  return (
    <div className="min-w-0">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-1.5">
        <p className="text-[11px] font-bold uppercase text-slate-400 dark:text-slate-500">
          Líneas detectadas
        </p>
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
            vat.blocked
              ? "bg-amber-100 text-amber-900"
              : vat.source === "lines"
                ? "bg-blue-100 text-blue-800"
                : "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-200"
          }`}
        >
          {expenseVatSourceLabel(vat, vatExempt, expense)}
        </span>
      </div>
      {!vat.blocked ? (
        <p className="mb-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
          Base {formatMoney(vat.base)} · IVA {formatMoney(fiscal.registeredIva)}
          {fiscal.registeredEquivalenceSurcharge
            ? ` · R.E. ${formatMoney(fiscal.registeredEquivalenceSurcharge)}`
            : ""}{" "}
          · Total {formatMoney(fiscal.registeredTotal)}
        </p>
      ) : (
        <p className="mb-2 text-xs font-semibold text-amber-800">
          {vat.issue === "provider_summary_tax_mismatch"
            ? "El IVA, el recargo o el total del resumen no cuadran. Revisa el documento."
            : "El desglose por líneas no cuadra con la base. Revisa las líneas."}
        </p>
      )}
      <div className="grid gap-1.5">
        {lines.map((line, index) => (
          <div
            key={`${line.description}-${index}`}
            className={`max-w-full rounded-xl px-2.5 py-1.5 text-xs font-semibold leading-snug [overflow-wrap:anywhere] ${
              line.hasProduct
                ? "bg-emerald-100 text-emerald-900 ring-1 ring-emerald-200 dark:bg-emerald-950/45 dark:text-emerald-100 dark:ring-emerald-800"
                : "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-200"
            }`}
            title={
              line.hasProduct
                ? `${line.description} · artículo creado`
                : `${line.description} · sin artículo creado`
            }
          >
            <span className="block font-bold">{line.description}</span>
            <span className="mt-0.5 block text-[11px] font-semibold opacity-90">
              Base {formatMoney(line.amounts.base)} · IVA {line.ivaPercent}%{" "}
              {formatMoney(line.amounts.iva)} · Total{" "}
              {formatMoney(line.amounts.total)} · origen {line.ivaOrigin}
              {vatExempt && line.documentIvaPercent !== undefined
                ? ` · tipo documento ${line.documentIvaPercent}%`
                : ""}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
