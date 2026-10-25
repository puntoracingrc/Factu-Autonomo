import type { ExpenseCatalogCostReview as CostReview } from "@/lib/expense-catalog-costs";
const money = (n: number | undefined) =>
  n === undefined
    ? "Sin indicar"
    : new Intl.NumberFormat("es-ES", {
        style: "currency",
        currency: "EUR",
      }).format(n);
export function ExpenseCatalogCostReview({
  reviews,
  onChange,
}: {
  reviews: CostReview[];
  onChange: (lineId: string, value: boolean) => void;
}) {
  if (!reviews.length) return null;
  const count = new Set(
    reviews.filter((r) => r.willUpdate).map((r) => r.productId),
  ).size;
  return (
    <section
      className="rounded-2xl border border-slate-200 bg-white p-4"
      aria-labelledby="catalog-cost-review-title"
    >
      <h2 id="catalog-cost-review-title" className="font-bold text-slate-900">
        Costes del catálogo al guardar
      </h2>
      <p className="mt-1 text-sm text-slate-600">
        {count
          ? `Se actualizará el coste de ${count} producto${count === 1 ? "" : "s"}.`
          : "Se conservarán los costes actuales."}{" "}
        El PVP de venta se mantiene. El gasto conserva los importes de la
        factura.
      </p>
      <ul className="mt-4 space-y-4">
        {reviews.map((review) => (
          <li
            key={review.lineId}
            className={`rounded-xl border p-3 ${review.needsReview ? "border-amber-200 bg-amber-50" : "border-slate-100 bg-slate-50"}`}
          >
            {review.canChoose ? (
              <label className="flex cursor-pointer items-start gap-3 text-sm font-semibold text-slate-900">
                <input
                  type="checkbox"
                  className="mt-1 h-5 w-5 shrink-0"
                  checked={review.willUpdate}
                  onChange={(event) =>
                    onChange(review.lineId, event.target.checked)
                  }
                />
                <span className="min-w-0 break-words">
                  Actualizar coste de {review.productName}
                  <span className="mt-1 block font-normal">
                    {money(review.previousCost)} → {money(review.proposedCost)}{" "}
                    sin IVA
                  </span>
                </span>
              </label>
            ) : (
              <p className="break-words text-sm font-semibold">
                {review.productName ?? "Producto pendiente de identificar"}
              </p>
            )}
            <p className="mt-2 break-words text-sm text-slate-600">
              {review.reason}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
