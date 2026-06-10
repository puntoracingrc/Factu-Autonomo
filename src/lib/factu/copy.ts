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

export const FACTU_DAILY_GREETINGS = [
  "Buenos días, jefe. Hoy el negocio huele a Veri Legal.",
  "Aquí estoy, en silencio. Cuando me necesites, me tocas.",
  "Todo en orden por mi lado. Tú sigue facturando.",
  "Otro día, otra oportunidad de cobrar. Very Bonito.",
] as const;

export type FactuMilestoneId =
  | "first-invoice"
  | "first-rectificativa"
  | "first-customer";

export const FACTU_MILESTONE_MESSAGES: Record<FactuMilestoneId, string> = {
  "first-invoice":
    "¡Primera factura emitida! Veri Legal y Very Bonito. Guarda el PDF por si acaso.",
  "first-rectificativa":
    "Primera rectificativa creada. Así se corrige sin borrar — bien hecho, jefe.",
  "first-customer":
    "Primer cliente guardado. Ya tengo a quién facturar.",
};

export function pickFactuJoke(): string {
  return FACTU_JOKES[Math.floor(Math.random() * FACTU_JOKES.length)];
}

export function pickDailyGreeting(): string {
  return FACTU_DAILY_GREETINGS[
    Math.floor(Math.random() * FACTU_DAILY_GREETINGS.length)
  ];
}
