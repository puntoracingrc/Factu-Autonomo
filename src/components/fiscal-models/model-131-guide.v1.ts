import type { FiscalModelPracticalGuideV1 } from "./fiscal-model-practical-guide.types";

export const MODEL_131_GUIDE_V1 = {
  code: "131",
  effectiveYear: 2026,
  lastVerifiedAt: "2026-07-14",
  requiresAnnualReview: true,
  intro: [
    "El Modelo 131 es el pago fraccionado trimestral del IRPF para actividades cuyo rendimiento se determina en estimación objetiva, conocida como módulos.",
    "El pago no se calcula a partir del beneficio real del trimestre, sino mediante los módulos, índices y reglas de la actividad.",
  ],
  notices: [
    { title: "No todos los autónomos pueden tributar por módulos", paragraphs: ["La actividad debe figurar en la orden anual y deben cumplirse límites, magnitudes, compatibilidades y demás requisitos."] },
    { title: "Reglas de 2026 — revisar cada año", paragraphs: ["Los límites transitorios y la reducción general del 5 % están verificados para 2026. No se presentan como reglas permanentes."] },
  ],
  actions: [
    { label: "Presentar el Modelo 131", sourceId: "aeat.model-131.procedure-home.2026-04-01", primary: true },
    { label: "Consultar los módulos y requisitos", href: "https://sede.agenciatributaria.gob.es/Sede/irpf/empresarios-individuales-profesionales/regimenes-determinar-rendimiento-actividad/estimacion-objetiva.html", primary: true },
    { label: "Generar una predeclaración", sourceId: "aeat.model-131.paper-help.2026-04-01" },
    { label: "Consultar la Orden de módulos 2026", href: "https://www.boe.es/buscar/act.php?id=BOE-A-2025-25272" },
    { label: "Consultar plazos y cálculo oficial", href: "https://sede.agenciatributaria.gob.es/Sede/irpf/retenciones-ingresos-cuenta-pagos-fraccionados/pagos-fraccionados.html" },
  ],
  quickSummaryTitle: "El Modelo 131 en pocas palabras",
  quickFacts: [
    { label: "Qué es", value: "Un pago fraccionado a cuenta del IRPF." },
    { label: "Quién", value: "Personas físicas con actividades admitidas en estimación objetiva." },
    { label: "Nombre habitual", value: "Módulos." },
    { label: "Presentación", value: "Electrónica con Cl@ve, certificado o DNI electrónico; cuando proceda, también mediante predeclaración oficial por el canal admitido." },
    { label: "Cálculo", value: "Se basa en datos objetivos de la actividad, no en el beneficio real." },
    { label: "Porcentajes habituales", value: "2 %, 3 % o 4 % según las unidades de personal asalariado, con reglas específicas." },
    { label: "Resultado negativo", value: "Debe presentarse si existe obligación y no genera devolución trimestral." },
  ],
  sections: [
    {
      id: "model-131-eligibility",
      title: "¿Puedo tributar por módulos?",
      cards: [
        { title: "Requisitos de acceso", bullets: ["La actividad está incluida en la orden anual.", "No se ha renunciado ni existe exclusión.", "No hay incompatibilidad con otros métodos.", "Se cumplen las reglas coordinadas con IVA simplificado o regímenes agrarios."] },
        { title: "Límites y actividad", bullets: ["Se respetan límites generales y magnitudes específicas.", "La actividad se desarrolla en el ámbito territorial admitido, salvo excepciones.", "La inclusión de un sector en la orden no significa que todos sus autónomos puedan aplicar módulos."] },
      ],
    },
    {
      id: "model-131-limits-2026",
      title: "Límites vigentes para 2026 — revisión anual",
      cards: [
        { title: "Ingresos", bullets: ["Actividades no agrícolas, ganaderas o forestales: hasta 250.000 €.", "Operaciones con obligación de factura a empresarios o profesionales: hasta 125.000 €.", "Actividades agrícolas, ganaderas y forestales: hasta 250.000 €."] },
        { title: "Compras", paragraphs: ["Hasta 250.000 € en bienes y servicios, sin incluir adquisiciones de inmovilizado."] },
        { title: "Cómputo relacionado", paragraphs: ["Pueden computarse actividades idénticas o similares del cónyuge, ascendientes, descendientes o entidades relacionadas cuando exista dirección común y se compartan medios."] },
      ],
      note: "Son límites transitorios aplicables hasta 2026, no permanentes. Desde 2025 tampoco se incluye la compensación del régimen especial agrario de IVA en el volumen usado para este límite.",
    },
    {
      id: "model-131-modules",
      title: "Qué son los módulos",
      intro: ["El rendimiento se estima mediante elementos objetivos que dependen de la actividad."],
      cards: [
        { title: "Ejemplos de datos objetivos", bullets: ["Personal asalariado y no asalariado.", "Superficie del local, mesas o longitud de barra.", "Potencia eléctrica.", "Vehículos, carga o kilómetros.", "Otros índices definidos en la orden anual."] },
        { title: "No es el beneficio real", paragraphs: ["El beneficio real puede ser superior o inferior al rendimiento calculado por módulos."] },
      ],
    },
    {
      id: "model-131-reduction-2026",
      title: "Reducción general de 2026 — revisión anual",
      note: "En 2026 se mantiene una reducción general del 5 % sobre el rendimiento neto de módulos. Debe revisarse antes de mostrarla para 2027.",
    },
    {
      id: "model-131-calculation",
      title: "Cálculo de actividades no agrícolas",
      cards: [
        { title: "Proceso", bullets: ["Determina las unidades de módulos.", "Aplica el rendimiento anual por unidad.", "Resta minoraciones por empleo e inversión.", "Aplica índices correctores y la reducción general vigente.", "Obtén el rendimiento a efectos del pago fraccionado."] },
        { title: "Porcentajes", bullets: ["Sin personal asalariado: 2 %.", "Hasta una unidad de personal asalariado: 3 %.", "Más de una unidad: 4 %.", "Pueden aplicarse porcentajes superiores, no inferiores, en los términos previstos."] },
      ],
      note: "No se cuenta simplemente el número de trabajadores: el personal asalariado se determina mediante unidades y horas según las reglas aplicables.",
    },
    {
      id: "model-131-no-base-data",
      title: "Cuando no pueden determinarse los datos base",
      intro: ["Si no puede determinarse ninguno de los datos base, el pago puede ser el 2 % de las ventas o ingresos del trimestre."],
      note: "Incluye subvenciones corrientes y excluye subvenciones de capital e indemnizaciones. No se usa por comodidad si los módulos sí pueden determinarse.",
    },
    {
      id: "model-131-agrarian",
      title: "Actividades agrícolas, ganaderas y forestales",
      cards: [
        { title: "Cálculo general", paragraphs: ["Con carácter general, 2 % de los ingresos del trimestre, incluyendo subvenciones corrientes y excluyendo subvenciones de capital e indemnizaciones. Después se restan retenciones y minoraciones aplicables."] },
        { title: "Agricultores jóvenes o asalariados agrarios", paragraphs: ["Quienes cumplan todos los requisitos pueden reducir en un 25 % el importe calculado. No basta con ser joven: deben verificarse las condiciones oficiales."] },
        { title: "Regla del 70 %", paragraphs: ["No existe pago fraccionado por determinadas actividades agrícolas, ganaderas o forestales cuando al menos el 70 % de los ingresos computables del año anterior estuvieron sometidos a retención. En inicio se usa el porcentaje del trimestre."] },
      ],
    },
    {
      id: "model-131-seasonal",
      title: "Actividades de temporada, altas y bajas",
      intro: ["Las actividades iniciadas después del 1 de enero, finalizadas antes del 31 de diciembre o desarrolladas por temporadas tienen reglas específicas."],
      note: "En temporada, el pago se ajusta a los días naturales de actividad y a los datos previstos por la orden anual. Esta ficha no incorpora una calculadora porque exigiría todas esas reglas.",
    },
    {
      id: "model-131-vat",
      title: "Relación con IVA simplificado y el Modelo 303",
      cards: [
        { title: "Obligaciones que pueden coexistir", paragraphs: ["Un autónomo en módulos puede presentar el 131 de IRPF y el 303 de IVA en régimen simplificado."], links: [{ label: "Ver Modelo 303", href: "/consultor-fiscal/modelos/303" }] },
        { title: "Coordinación entre regímenes", paragraphs: ["Renunciar o quedar excluido de uno puede afectar al otro. No todo declarante del 131 está necesariamente en IVA simplificado, porque pueden existir actividades exentas u otras situaciones."] },
      ],
    },
    {
      id: "model-131-renunciation",
      title: "Renuncia y exclusión",
      cards: [
        { title: "Renuncia", paragraphs: ["Es una decisión que debe comunicarse en los plazos y formas vigentes."] },
        { title: "Exclusión", paragraphs: ["Se produce al dejar de cumplirse una condición, límite o magnitud."] },
      ],
      note: "La renuncia o exclusión puede afectar a varios ejercicios y al IVA simplificado. Las comunicaciones censales se realizan mediante el Modelo 036; no existe un plazo universal para todos los supuestos.",
    },
    {
      id: "model-131-quarterly",
      title: "Plazos trimestrales",
      cards: [
        { title: "Primer a tercer trimestre", bullets: ["1T: del 1 al 20 de abril.", "2T: del 1 al 20 de julio.", "3T: del 1 al 20 de octubre."] },
        { title: "Cuarto trimestre", bullets: ["Del 1 al 30 de enero del año siguiente.", "Si vence en inhábil, finaliza el primer día hábil siguiente."] },
      ],
      note: "La domiciliación puede finalizar antes. Consulta el calendario oficial del ejercicio.",
    },
    {
      id: "model-131-negative",
      title: "Resultado negativo y correcciones",
      cards: [
        { title: "Negativo", paragraphs: ["Se presenta si existe obligación. Puede reducir pagos positivos posteriores del mismo año dentro de los límites del modelo, pero no genera devolución trimestral."] },
        { title: "Error a favor de Hacienda", paragraphs: ["Puede exigir una autoliquidación complementaria."] },
        { title: "Error que perjudica al contribuyente", paragraphs: ["Se utiliza el procedimiento de rectificación aplicable; no el mecanismo especial del Modelo 303."] },
      ],
    },
    {
      id: "model-131-territory",
      title: "Ámbito territorial",
      note: "Esta guía se refiere a la AEAT estatal y al territorio común. En Canarias se aplica el IGIC; en Ceuta y Melilla, el IPSI; y en País Vasco o Navarra la presentación puede corresponder a la Hacienda foral competente.",
    },
    {
      id: "model-131-mistakes",
      title: "Errores habituales",
      cards: [
        { title: "Acceso y límites", bullets: ["Pensar que cualquiera puede elegir módulos.", "No comprobar la actividad en la orden anual.", "Usar límites de otro ejercicio.", "Sumar siempre toda la familia sin verificar identidad de actividad y dirección común.", "Cambiar al 130 sin comunicación censal."] },
        { title: "Cálculo y presentación", bullets: ["Calcular por beneficio real.", "Contar personas en vez de unidades.", "Aplicar el 2 % de ventas con datos base disponibles.", "Aplicar el 5 % fuera de 2026 sin revisión.", "No presentar por resultado negativo.", "Creer que una predeclaración ya está presentada."] },
      ],
    },
  ],
  fillingTitle: "Cómo prepararlo y presentarlo",
  fillingSteps: [
    { title: "1. Confirma actividad y método", paragraphs: ["Comprueba la orden anual, límites, magnitudes, renuncias, exclusiones y datos censales."] },
    { title: "2. Determina datos base", paragraphs: ["Calcula unidades y horas conforme a las reglas de la actividad, o aplica el régimen específico agrario o de ausencia total de datos base cuando proceda."] },
    { title: "3. Aplica ajustes de 2026", paragraphs: ["Usa índices, minoraciones y reducción general del ejercicio vigente, manteniéndolos separados de las reglas permanentes."] },
    { title: "4. Resta retenciones y revisa resultado", paragraphs: ["Incorpora retenciones y minoraciones aplicables y presenta también si el resultado es negativo."] },
    { title: "5. Identificación y presentación", paragraphs: ["Identifícate con Cl@ve, certificado o DNI electrónico según el acceso admitido. Cuando esté permitido, también puedes generar, imprimir, firmar y entregar la predeclaración. Descargarla no equivale a presentar."] },
  ],
  afterTitle: "Qué ocurre después",
  afterSteps: [
    { title: "Pago a cuenta", description: "Se descuenta posteriormente en la declaración anual de la Renta." },
    { title: "Revisión anual", description: "Antes del ejercicio siguiente deben revisarse orden, actividades, módulos, límites y reducciones." },
    { title: "Cambio de situación", description: "Una renuncia, exclusión o variación debe reflejarse en las comunicaciones censales que correspondan." },
  ],
  comparison: {
    title: "¿Qué está declarando el autónomo?",
    current: { title: "Modelo 131", description: "Adelanta IRPF en estimación objetiva a partir de módulos, no del beneficio real." },
    related: { title: "Modelo 130", description: "Adelanta IRPF en estimación directa basándose principalmente en ingresos y gastos reales.", href: "/consultor-fiscal/modelos/130", label: "Ver Modelo 130" },
    additional: [
      { title: "Modelo 303", description: "Declara el IVA y puede coexistir con el 131.", href: "/consultor-fiscal/modelos/303", label: "Ver Modelo 303" },
      { title: "Modelo 036", description: "Comunica método, actividad y obligaciones censales.", href: "/consultor-fiscal/modelos/036", label: "Ver Modelo 036" },
    ],
    conclusion: "Cambiar de método no consiste en escoger el formulario más favorable cada trimestre: deben cumplirse las reglas y comunicarse censalmente.",
  },
  pdfNotice: ["La predeclaración descargada no está presentada hasta completar el canal admitido. Las herramientas de módulos ayudan, pero no sustituyen la comprobación de actividad, epígrafe y datos base."],
  documents: [],
  officialLinks: [
    { label: "Ayuda técnica del Modelo 131", sourceId: "aeat.model-131.help.2026-06-19" },
    { label: "Ficha administrativa del procedimiento", sourceId: "aeat.model-131.procedure-record.2026-06-09" },
    { label: "Orden de módulos para 2026 · información AEAT", href: "https://sede.agenciatributaria.gob.es/Sede/todas-noticias/2025/diciembre/11/orden-modulos-2026.html" },
    { label: "Ayuda para empresarios en módulos", href: "https://sede.agenciatributaria.gob.es/Sede/empresarios-individuales-profesionales/contribuyentes-modulos.html" },
  ],
  legalLinks: [
    { label: "Orden HAC/1425/2025 · módulos 2026", href: "https://www.boe.es/buscar/act.php?id=BOE-A-2025-25272" },
    { label: "Orden EHA/672/2007", sourceId: "boe.order-eha-672-2007.models-130-131" },
    { label: "Ley 35/2006 del IRPF", href: "https://www.boe.es/buscar/act.php?id=BOE-A-2006-20764" },
    { label: "Reglamento del IRPF", href: "https://www.boe.es/buscar/act.php?id=BOE-A-2007-6820" },
  ],
  faq: [
    { question: "¿Cualquier autónomo puede tributar por módulos?", answer: "No. La actividad debe estar incluida en la orden anual y deben cumplirse requisitos y límites." },
    { question: "¿Se calcula con mis ingresos y gastos reales?", answer: "No en las actividades ordinarias: se calcula mediante módulos y datos objetivos." },
    { question: "¿Cuáles son los porcentajes habituales?", answer: "2 %, 3 % o 4 % según las unidades de personal asalariado, con reglas especiales." },
    { question: "¿Y si no puedo determinar ningún dato base?", answer: "Puede aplicarse el 2 % de los ingresos del trimestre cuando se cumplen las condiciones específicas." },
    { question: "¿Qué límites existen en 2026?", answer: "Entre otros, 250.000 € de ingresos generales, 125.000 € en determinadas operaciones facturadas a empresarios y 250.000 € de compras." },
    { question: "¿Serán iguales en 2027?", answer: "No puede asegurarse. Deben revisarse cada ejercicio." },
    { question: "¿Qué reducción general se aplica en 2026?", answer: "El 5 % sobre el rendimiento neto de módulos." },
    { question: "¿Tengo que presentar también el 303?", answer: "Puede existir también obligación de IVA en régimen simplificado." },
    { question: "¿Puedo cambiar al 130 cuando quiera?", answer: "No por elegir otro formulario. Se aplican reglas de renuncia, exclusión y comunicación censal." },
    { question: "¿Qué ocurre si sale negativo?", answer: "Se presenta si existe obligación y puede compensarse con pagos positivos posteriores del mismo año dentro de los límites." },
    { question: "¿Es lo mismo módulos que estimación directa simplificada?", answer: "No. Son métodos diferentes." },
    { question: "¿Puede presentarlo mi asesor?", answer: "Sí, mediante representación o colaboración social admitida." },
  ],
  sourceIds: [
    "aeat.model-131.procedure-home.2026-04-01",
    "aeat.model-131.procedure-record.2026-06-09",
    "aeat.model-131.help.2026-06-19",
    "aeat.model-131.paper-help.2026-04-01",
    "boe.order-eha-672-2007.models-130-131",
  ],
} as const satisfies FiscalModelPracticalGuideV1;
