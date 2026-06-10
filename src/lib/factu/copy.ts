export const FACTU_JOKES = [
  "Hoy es un gran día para facturar y ganar veri mucho money, jefe.",
  "Mis circuitos me dicen que este trimestre nos va a salir a devolver.",
  "¿Has cobrado ya? Mi ojo de euro se está impacientando.",
  "Todo en orden. Tu negocio está quedando Very Bonito.",
  "Trabajando duro… Recuerda que yo no te pido días libres.",
] as const;

export type FactuEmptyVariant =
  | "factura"
  | "presupuesto"
  | "recibo"
  | "cliente"
  | "gasto"
  | "proveedor";

export const FACTU_EMPTY_MESSAGES: Record<FactuEmptyVariant, string> = {
  factura:
    "¡Aquí no hay nada! Esto está más desierto que mi banco de memoria. Venga, jefe, creemos la primera factura Veri Legal y Very Bonito.",
  presupuesto:
    "Sin presupuestos todavía. Ni yo puedo adivinar cuánto cobrarás si no me das datos. ¡Crea el primero!",
  recibo:
    "Cero recibos. Cuando cobres, yo celebro contigo. Mientras tanto, esto parece una caja vacía.",
  cliente:
    "No tengo a quién facturar. Añade tu primer cliente y dejamos de hablar con las paredes.",
  gasto:
    "Sin gastos registrados. O eres muy ahorrador o aún no me has contado las compras.",
  proveedor:
    "Ningún proveedor por aquí. Cuando sepamos quién te vende cosas, lo apuntamos juntos.",
};

export function pickFactuJoke(): string {
  return FACTU_JOKES[Math.floor(Math.random() * FACTU_JOKES.length)];
}
