export const CUSTOMER_QUERY_PARAM = "cliente";

export function newDocumentUrl(
  type: "factura" | "presupuesto",
  customerId: string,
): string {
  const base = type === "factura" ? "/facturas/nuevo" : "/presupuestos/nuevo";
  return `${base}?${CUSTOMER_QUERY_PARAM}=${encodeURIComponent(customerId)}`;
}
