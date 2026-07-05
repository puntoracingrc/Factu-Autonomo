import { formatMoney } from "@/lib/calculations";
import { expensePurchaseLineBaseTotal } from "@/lib/expenses";
import { purchaseLineHasCatalogProduct } from "@/lib/purchase-products";
import type { Expense } from "@/lib/types";

export function ExpensePurchaseLinesPreview({
  expense,
  productKeys,
  emptyLabel = "Sin líneas de producto",
  emptyClassName = "",
}: {
  expense: Expense;
  productKeys: Set<string>;
  emptyLabel?: string;
  emptyClassName?: string;
}) {
  const lines = (expense.purchaseLines ?? [])
    .map((line) => ({
      description: line.description.trim(),
      base: expensePurchaseLineBaseTotal(line),
      hasProduct: purchaseLineHasCatalogProduct(line, productKeys),
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
      <p className="mb-1 text-[11px] font-bold uppercase text-slate-400 dark:text-slate-500">
        Líneas detectadas
      </p>
      <div className="flex flex-wrap gap-1.5">
        {lines.map((line, index) => (
          <span
            key={`${line.description}-${index}`}
            className={`max-w-full rounded-full px-2.5 py-1 text-xs font-semibold leading-snug [overflow-wrap:anywhere] ${
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
            {line.description}
            {line.base > 0 ? (
              <span className="ml-1 font-black">{formatMoney(line.base)}</span>
            ) : null}
          </span>
        ))}
      </div>
    </div>
  );
}
