export const CUSTOMER_QUERY_PARAM = "cliente";

export function newDocumentUrl(
  type: "factura" | "presupuesto" | "recibo",
  customerId: string,
): string {
  const base =
    type === "factura"
      ? "/facturas/nuevo"
      : type === "presupuesto"
        ? "/presupuestos/nuevo"
        : "/recibos/nuevo";
  return `${base}?${CUSTOMER_QUERY_PARAM}=${encodeURIComponent(customerId)}`;
}
