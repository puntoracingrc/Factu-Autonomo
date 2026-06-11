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

/** Frases de Factu cuando no hay avisos pendientes en /avisos. */
export const FACTU_AVISOS_EMPTY_MESSAGES = [
  "Cero avisos. O eres muy eficiente o hoy me toca estar de relax. Very Bonito.",
  "Nada urgente por aquí. Mi radar de cobros está en silencio… de momento.",
  "Todo al día, jefe. Si esto fuera un examen, sacarías sobresaliente.",
  "Sin recordatorios. Aprovecha para facturar tranquilo — yo vigilo.",
  "Ni vencimientos ni sustos. Así me gusta verte: Veri Legal y sin prisas.",
  "He mirado tres veces: no hay nada que reclamar. Muy bien.",
  "Pantalla limpia. Cuando algo venza o falte un dato, volveré a avisarte.",
  "Hoy no molesto. Pero si se acerca un cobro o un gasto fijo, apareceré aquí.",
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

/** Devuelve varias frases distintas para el estado vacío de avisos. */
export function pickFactuAvisosEmptyMessages(count = 3): string[] {
  const pool = [...FACTU_AVISOS_EMPTY_MESSAGES];
  const picked: string[] = [];
  const limit = Math.min(count, pool.length);

  for (let i = 0; i < limit; i++) {
    const index = Math.floor(Math.random() * pool.length);
    picked.push(pool.splice(index, 1)[0]!);
  }

  return picked;
}
