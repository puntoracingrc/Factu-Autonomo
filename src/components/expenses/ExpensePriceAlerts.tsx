import type { ExpensePurchaseLinePriceAlert } from "@/lib/expenses";
const money = (n: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(
    n,
  );
export function ExpensePriceAlerts({
  alerts,
}: {
  alerts: ExpensePurchaseLinePriceAlert[];
}) {
  if (!alerts.length) return null;
  return (
    <div
      className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
      role="status"
    >
      <p className="font-bold">Revisa precios o descuentos</p>
      <p className="mt-1">
        Compara la factura con la referencia anterior antes de actualizar el
        coste del catálogo.
      </p>
      <ul className="mt-3 space-y-3">
        {alerts.map((alert) => (
          <li key={alert.lineId}>
            <p className="font-bold">{alert.description}</p>
            <p>
              Coste neto sin IVA: {money(alert.previousNetUnitCost)} →{" "}
              {money(alert.currentNetUnitCost)}
              {Math.abs(alert.netCostChangePercent) >= 15
                ? ` (${alert.netCostChangePercent > 0 ? "sube" : "baja"} ${Math.abs(alert.netCostChangePercent)} %)`
                : ""}
              .
            </p>
            {alert.previousListPriceKnown ? (
              <p>
                Tarifa sin IVA: {money(alert.previousUnitPrice)} →{" "}
                {money(alert.currentUnitPrice)}.
              </p>
            ) : null}
            {alert.previousDiscountKnown ? (
              <p>
                Descuento: {alert.previousDiscountPercent} % →{" "}
                {alert.currentDiscountPercent} %.
                {alert.missingDiscount
                  ? " Posible descuento no aplicado: no consta descuento en la línea actual."
                  : ""}
              </p>
            ) : null}
            <p className="mt-1 text-xs">
              Referencia: {alert.previousExpenseDescription},{" "}
              {alert.previousExpenseDate}.
              {alert.previousQuantity !== undefined
                ? ` Cantidad anterior: ${alert.previousQuantity}.`
                : ""}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
