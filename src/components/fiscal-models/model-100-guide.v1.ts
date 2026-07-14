import type { FiscalModelPracticalGuideV1 } from "./fiscal-model-practical-guide.types";

const TERRITORIAL_NOTE =
  "Esta guía se refiere principalmente a los trámites de la Agencia Tributaria estatal y al territorio común. En País Vasco o Navarra la declaración puede corresponder a la Hacienda foral competente. En materia de IVA, Canarias, Ceuta y Melilla tienen regímenes fiscales distintos.";

export const MODEL_100_GUIDE_V1 = {
  code: "100",
  effectiveYear: 2025,
  lastVerifiedAt: "2026-07-14",
  requiresAnnualReview: true,
  intro: [
    "El Modelo 100 es la declaración anual del IRPF. Para un autónomo reúne el resultado de su actividad y también el resto de sus rentas personales del año.",
    "No sustituye los pagos trimestrales: retenciones y Modelos 130 o 131 se descuentan como pagos a cuenta al calcular el resultado final.",
  ],
  notices: [
    { title: "Alta en RETA: obligación de declarar", paragraphs: ["Desde el ejercicio 2023, haber estado de alta en el Régimen Especial de Trabajadores por Cuenta Propia o Autónomos —o en el régimen del mar equivalente— en cualquier momento del año obliga a presentar la Renta. Incluye altas breves, años sin ingresos o con pérdidas y autónomos colaboradores."] },
    { title: "El borrador no sustituye la revisión", paragraphs: ["Los datos fiscales pueden estar incompletos o no reflejar correctamente gastos, amortizaciones, existencias, subvenciones o ventas de bienes afectos. Debes contrastarlos con tus libros y justificantes."] },
    { title: "Una guía, no una presentación", paragraphs: ["Esta página explica el modelo y enlaza servicios oficiales. No calcula, firma, paga ni envía la declaración."] },
  ],
  actions: [
    { label: "Abrir la Campaña de Renta", sourceId: "aeat.renta-campaign.2026-07-02", primary: true },
    { label: "Consultar el procedimiento del Modelo 100", sourceId: "aeat.model-100.procedure-home.2026-06-09" },
    { label: "Abrir la ayuda de Renta WEB", sourceId: "aeat.model-100.renta-web-help.2026-04-16" },
    { label: "Comprobar si tienes que declarar", href: "https://sede.agenciatributaria.gob.es/Sede/irpf/tengo-que-presentar-declaracion.html" },
    { label: "Ver obligaciones y libros registro", href: "https://sede.agenciatributaria.gob.es/Sede/irpf/Obligaciones.html" },
  ],
  quickSummaryTitle: "El Modelo 100 en pocas palabras",
  quickFacts: [
    { label: "Qué es", value: "La declaración anual personal del IRPF." },
    { label: "Autónomos en RETA", value: "Obligatoria si hubo alta en cualquier momento del año." },
    { label: "Qué incluye", value: "Actividad económica y las demás rentas personales." },
    { label: "Pagos previos", value: "Retenciones y Modelos 130/131 son pagos a cuenta." },
    { label: "Servicio principal", value: "Renta WEB; Renta DIRECTA solo para perfiles admitidos sin cambios." },
    { label: "Resultado", value: "Puede ser a ingresar, a devolver o sin cuota." },
    { label: "Periodicidad", value: "Anual, en la campaña que publica la AEAT." },
    { label: "Ámbito", value: "Declaración personal: no es la declaración de una sociedad." },
  ],
  sections: [
    {
      id: "model-100-obligation",
      title: "¿Quién tiene que presentarlo?",
      cards: [
        { title: "Alta en RETA", paragraphs: ["La obligación existe aunque el alta durase solo parte del año, no hubiera ingresos, la actividad diera pérdidas o se tratase de un autónomo colaborador."] },
        { title: "Actividad sin alta en RETA", paragraphs: ["Si existieron rendimientos de actividad sin alta en RETA, la obligación se comprueba aplicando las reglas generales del IRPF. No debe suponerse automáticamente que no hay que declarar."] },
        { title: "Resto de contribuyentes", paragraphs: ["También presentan quienes superen los límites generales o estén en otros supuestos obligatorios. La obligación se analiza con todas las rentas del año."] },
      ],
    },
    {
      id: "model-100-income",
      title: "Qué rentas reúne",
      cards: [
        { title: "Actividad económica", bullets: ["Ingresos y gastos de cada actividad.", "Estimación directa normal o simplificada, o estimación objetiva cuando proceda.", "Amortizaciones, existencias y bienes afectos."] },
        { title: "Rentas personales", bullets: ["Trabajo y pensiones.", "Alquileres y capital mobiliario.", "Ganancias y pérdidas patrimoniales.", "Subvenciones, ayudas e imputaciones."] },
        { title: "Rentas atribuidas", paragraphs: ["Si participas en una comunidad de bienes u otra entidad en atribución de rentas, incorporas en tu Renta la parte comunicada por la entidad en el Modelo 184."], links: [{ label: "Ver Modelo 184", href: "/consultor-fiscal/modelos/184" }] },
      ],
    },
    {
      id: "model-100-activity-result",
      title: "Cómo se obtiene el rendimiento de la actividad",
      cards: [
        { title: "Estimación directa", paragraphs: ["Parte de ingresos computables menos gastos fiscalmente deducibles, con las amortizaciones y ajustes que correspondan. La modalidad normal y la simplificada tienen diferencias."] },
        { title: "Estimación objetiva", paragraphs: ["Cuando se cumplen los requisitos de módulos, el rendimiento se determina mediante signos, índices o módulos, no restando simplemente gastos reales."], links: [{ label: "Ver Modelo 131", href: "/consultor-fiscal/modelos/131" }] },
        { title: "Libros normalizados", paragraphs: ["La AEAT permite importar libros registro compatibles en Renta WEB para completar actividades en estimación directa. Importar ayuda, pero no evita comprobar el resultado."] },
      ],
    },
    {
      id: "model-100-expenses",
      title: "Gastos que requieren especial atención",
      accordions: [
        { question: "Vehículo, vivienda y suministros", paragraphs: ["La deducibilidad depende de la afectación a la actividad y de los requisitos aplicables. No traslades automáticamente el criterio del IVA al IRPF ni deduzcas el porcentaje de vivienda sin revisar superficie afectada y reglas de suministros."] },
        { question: "Teléfono, comidas y seguros", paragraphs: ["Conserva factura y prueba de vinculación. Los gastos de manutención tienen condiciones y límites; el seguro de enfermedad tiene límites específicos por persona cubierta."] },
        { question: "Seguridad Social y bienes de inversión", paragraphs: ["Las cuotas vinculadas a la actividad se registran como gasto conforme a su naturaleza. Ordenadores, maquinaria y otros bienes duraderos suelen deducirse mediante amortización, no necesariamente de una sola vez."] },
        { question: "Existencias, ayudas y ventas de activos", paragraphs: ["Revisa inventario inicial y final, subvenciones corrientes o de capital y la venta de bienes afectos. Una venta de un activo no siempre se registra como un ingreso ordinario de la actividad."] },
      ],
    },
    {
      id: "model-100-advances",
      title: "Pagos trimestrales y retenciones",
      cards: [
        { title: "Modelos 130 y 131", paragraphs: ["Son pagos fraccionados anticipados del IRPF. No son un gasto y no sustituyen el Modelo 100."], links: [{ label: "Ver Modelo 130", href: "/consultor-fiscal/modelos/130" }, { label: "Ver Modelo 131", href: "/consultor-fiscal/modelos/131" }] },
        { title: "Retenciones soportadas", paragraphs: ["Las retenciones de clientes, nóminas, alquileres u otras rentas son pagos a cuenta. Contrástalas con certificados, facturas y datos fiscales."] },
        { title: "Resultado final", paragraphs: ["La cuota anual se compara con pagos fraccionados, retenciones y demás pagos a cuenta. De ahí puede resultar un ingreso o una devolución."] },
      ],
    },
    {
      id: "model-100-review",
      title: "Datos fiscales, borrador y elección familiar",
      accordions: [
        { question: "¿Puedo aceptar el borrador sin más?", paragraphs: ["No conviene. Los datos fiscales son una ayuda y pueden omitir información o clasificarla de forma que necesite revisión. Comprueba actividad, inmuebles, ventas, ayudas, deducciones y situación familiar."] },
        { question: "¿Individual o conjunta?", paragraphs: ["La unidad familiar puede comparar, cuando sea posible, tributación individual y conjunta. La opción se toma para el ejercicio completo y no equivale a sumar sin más las declaraciones."] },
        { question: "¿Renta WEB o Renta DIRECTA?", paragraphs: ["Renta WEB es el servicio general para confeccionar, modificar y presentar. Renta DIRECTA solo aparece a contribuyentes seleccionados cuyos datos son trasladables y cuyo borrador no necesita cambios; siempre se puede pasar a Renta WEB."] },
      ],
    },
    {
      id: "model-100-after",
      title: "Pago, devolución y correcciones",
      cards: [
        { title: "A ingresar", paragraphs: ["La campaña puede admitir domiciliación, pago, reconocimiento de deuda o fraccionamiento conforme a las opciones vigentes. Revisa fechas y justificante oficial."] },
        { title: "A devolver", paragraphs: ["La solicitud no garantiza un abono inmediato: la AEAT puede verificar los datos. Conserva la cuenta y el expediente de Renta."] },
        { title: "Declaración ya presentada", paragraphs: ["La AEAT permite modificarla desde Renta WEB. La vía concreta depende de si el cambio perjudica o beneficia al contribuyente y de las opciones disponibles en el ejercicio."] },
      ],
    },
    { id: "model-100-territory", title: "Ámbito territorial", note: TERRITORIAL_NOTE },
  ],
  fillingTitle: "Cómo preparar la Renta del autónomo",
  fillingSteps: [
    { title: "1. Reúne la información", paragraphs: ["Libros, facturas, bancos, certificados, pagos fraccionados, retenciones, datos de inmuebles, ayudas y operaciones patrimoniales."] },
    { title: "2. Revisa los datos fiscales", paragraphs: ["Contrástalos con tus documentos; no los aceptes como una contabilidad completa."] },
    { title: "3. Cierra cada actividad", paragraphs: ["Comprueba método de estimación, ingresos, gastos, amortizaciones, existencias y subvenciones."] },
    { title: "4. Incorpora las demás rentas", paragraphs: ["Añade trabajo, capital, inmuebles, ganancias, pérdidas y atribuciones del Modelo 184."] },
    { title: "5. Compara y presenta", paragraphs: ["Revisa individual/conjunta, pagos a cuenta, deducciones, resultado y forma de pago; firma en la AEAT y guarda el justificante."] },
  ],
  afterTitle: "Después de presentar",
  afterSteps: [
    { title: "Conserva", description: "Guarda declaración, justificante, libros, facturas, certificados y cálculos." },
    { title: "Comprueba", description: "Consulta el estado de tramitación o devolución desde los servicios de Renta." },
    { title: "Corrige", description: "Si detectas un error, utiliza la modificación de declaración presentada en Renta WEB." },
  ],
  comparison: {
    title: "Cómo se relacionan los Modelos 100, 309 y 184",
    current: { title: "Modelo 100", description: "Declaración anual personal del IRPF: actividad del autónomo y resto de sus rentas." },
    related: { title: "Modelo 184", description: "La entidad informa las rentas atribuidas; cada miembro incorpora su parte al impuesto personal.", href: "/consultor-fiscal/modelos/184", label: "Ver Modelo 184" },
    additional: [{ title: "Modelo 309", description: "Autoliquidación especial de IVA para operaciones concretas; no forma parte de la Renta.", href: "/consultor-fiscal/modelos/309", label: "Ver Modelo 309" }],
    conclusion: "El 100 declara la situación personal anual; el 184 informa el reparto de una entidad y el 309 liquida IVA especial.",
  },
  pdfNotice: ["El Modelo 100 se confecciona en los servicios de Renta. Una vista previa o un PDF guardado no acreditan la presentación: conserva el justificante oficial."],
  documents: [],
  officialLinks: [
    { label: "Ficha administrativa del procedimiento", sourceId: "aeat.model-100.procedure-record.2026-06-09" },
    { label: "Campaña de Renta", sourceId: "aeat.renta-campaign.2026-07-02" },
    { label: "Renta DIRECTA", href: "https://sede.agenciatributaria.gob.es/Sede/irpf/campana-renta/servicios-ayuda-confeccionar-renta/renta-directa_.html" },
    { label: "Modificar una declaración presentada", href: "https://sede.agenciatributaria.gob.es/Sede/irpf/campana-renta/modificacion-declaracion-renta-2025-presentada.html" },
  ],
  legalLinks: [
    { label: "Ley 35/2006 del IRPF · artículo 96", sourceId: "boe.irpf-law-35-2006" },
    { label: "Reglamento del IRPF", sourceId: "boe.irpf-regulation-439-2007" },
    { label: "Orden de la Renta 2025", sourceId: "boe.irpf-2025-order-hac-277-2026" },
  ],
  faq: [
    { question: "¿Todo autónomo en RETA presenta el Modelo 100?", answer: "Sí, si estuvo de alta en cualquier momento del año, incluso un solo día." },
    { question: "¿Debo presentarlo si no tuve ingresos?", answer: "Sí cuando hubo alta en RETA; la ausencia de ingresos no elimina esa obligación." },
    { question: "¿Y si tuve pérdidas?", answer: "También debe presentarse cuando la obligación deriva del alta en RETA." },
    { question: "¿Incluye solo mi negocio?", answer: "No. Incluye todas las rentas personales que correspondan en el IRPF." },
    { question: "¿El Modelo 130 o 131 sustituye la Renta?", answer: "No. Son pagos fraccionados a cuenta del resultado anual." },
    { question: "¿Las retenciones son un gasto?", answer: "No. Son pagos a cuenta que se descuentan al calcular el resultado." },
    { question: "¿Puedo aceptar directamente los datos fiscales?", answer: "No es recomendable; debes contrastarlos con libros y justificantes." },
    { question: "¿Puedo importar mis libros en Renta WEB?", answer: "Sí, si cumplen el formato normalizado y las condiciones técnicas de la AEAT." },
    { question: "¿Puedo deducir cualquier factura del negocio?", answer: "No. El gasto debe cumplir los requisitos fiscales y estar vinculado a la actividad." },
    { question: "¿Cómo incorporo una comunidad de bienes?", answer: "Con la renta atribuida y demás datos comunicados por la entidad en relación con el Modelo 184." },
    { question: "¿Puedo elegir declaración conjunta?", answer: "La unidad familiar puede comparar las opciones cuando se cumplan los requisitos." },
    { question: "¿Renta DIRECTA sirve para cualquier autónomo?", answer: "Solo para contribuyentes admitidos cuyo borrador no necesita cambios; Renta WEB sigue disponible." },
    { question: "¿Qué pasa si el resultado es a ingresar?", answer: "Elige una modalidad oficial disponible y conserva el justificante de presentación y pago." },
    { question: "¿Cómo corrijo una Renta presentada?", answer: "Desde el servicio de modificación de declaraciones presentadas de Renta WEB." },
  ],
  sourceIds: [
    "aeat.model-100.procedure-home.2026-06-09",
    "aeat.model-100.procedure-record.2026-06-09",
    "aeat.renta-campaign.2026-07-02",
    "aeat.model-100.renta-web-help.2026-04-16",
    "boe.irpf-law-35-2006",
    "boe.irpf-regulation-439-2007",
    "boe.irpf-2025-order-hac-277-2026",
  ],
} as const satisfies FiscalModelPracticalGuideV1;
