export const RENTABILIDAD_REAL_ROUTES_WITH_MANUAL = [
  "/rentabilidad-real",
  "/rentabilidad-real/test",
  "/rentabilidad-real/validar-configuracion",
  "/rentabilidad-real/calculadora/trabajo",
  "/rentabilidad-real/calculadora/horas",
  "/rentabilidad-real/simulador-precio-minimo",
  "/rentabilidad-real/informes",
  "/rentabilidad-real/evolucion",
] as const;

/** Rutas de producto que deben tener sección y ayuda contextual. */
export const APP_ROUTES_WITH_MANUAL = [
  "/",
  "/demo",
  "/clientes",
  "/facturas",
  "/presupuestos",
  "/recibos",
  "/gastos",
  "/productos",
  "/impuestos",
  "/consultor-fiscal",
  "/consultor-fiscal/calendario",
  "/consultor-fiscal/diagnostico",
  "/proveedores",
  "/configuracion",
  ...RENTABILIDAD_REAL_ROUTES_WITH_MANUAL,
] as const;
