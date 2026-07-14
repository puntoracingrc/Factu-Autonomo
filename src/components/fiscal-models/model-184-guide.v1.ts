import type { FiscalModelPracticalGuideV1 } from "./fiscal-model-practical-guide.types";

const TERRITORIAL_NOTE =
  "Esta guía se refiere principalmente a los trámites de la Agencia Tributaria estatal y al territorio común. En País Vasco o Navarra la declaración puede corresponder a la Hacienda foral competente. En materia de IVA, Canarias, Ceuta y Melilla tienen regímenes fiscales distintos.";

export const MODEL_184_GUIDE_V1 = {
  code: "184",
  effectiveYear: 2025,
  lastVerifiedAt: "2026-07-14",
  requiresAnnualReview: true,
  intro: [
    "El Modelo 184 es la declaración informativa anual de las entidades en régimen de atribución de rentas, como muchas comunidades de bienes, herencias yacentes y sociedades civiles sin personalidad jurídica propia.",
    "Lo presenta la entidad para informar de las rentas y su reparto. No paga un impuesto: después cada socio, heredero, comunero o partícipe incorpora su parte a su propia declaración.",
  ],
  notices: [
    { title: "Declara la entidad, no cada miembro", paragraphs: ["La declaración identifica a la entidad, sus rentas y a quienes participan en ella. Cada miembro declara después la renta atribuida según su impuesto y circunstancias."] },
    { title: "Actividad económica: no se aplica el límite de 3.000 €", paragraphs: ["Si la entidad ejerce una actividad económica, debe presentar el Modelo 184 con independencia del importe. El límite anual de 3.000 € solo opera para entidades que no ejercen actividad económica."] },
    { title: "Es informativo y no genera pago", paragraphs: ["El 184 no sustituye las declaraciones de IVA, retenciones, pagos fraccionados ni la Renta de los miembros."] },
  ],
  actions: [
    { label: "Abrir la página oficial del Modelo 184", sourceId: "aeat.model-184.procedure-home.2026-07-08", primary: true },
    { label: "Ver ayuda del formulario", sourceId: "aeat.model-184.browser-form-help.2026-02-05", primary: true },
    { label: "Ver ayuda de presentación mediante fichero", sourceId: "aeat.model-184.file-upload-help.2026-02-05" },
    { label: "Consultar obligaciones de la entidad", href: "https://sede.agenciatributaria.gob.es/Sede/irpf/empresarios-individuales-profesionales/entidades-regimen-atribucion-renta/obligaciones-entidad.html" },
  ],
  quickSummaryTitle: "El Modelo 184 en pocas palabras",
  quickFacts: [
    { label: "Qué es", value: "Una declaración informativa anual de rentas atribuidas." },
    { label: "Quién presenta", value: "La entidad en régimen de atribución de rentas." },
    { label: "Actividad económica", value: "Obliga con independencia del importe." },
    { label: "Sin actividad", value: "Se presenta si las rentas exceden de 3.000 € anuales." },
    { label: "Resultado", value: "No genera pago ni devolución." },
    { label: "Periodicidad", value: "Anual; actualmente en enero según el calendario oficial." },
    { label: "Miembros", value: "Se identifica y atribuye la parte de cada socio, comunero o partícipe." },
    { label: "Comunicación", value: "La entidad informa por escrito a sus miembros después del plazo." },
  ],
  sections: [
    {
      id: "model-184-entities",
      title: "Qué entidades están incluidas",
      cards: [
        { title: "Entidades habituales", bullets: ["Comunidades de bienes.", "Herencias yacentes.", "Determinadas sociedades civiles.", "Otras entidades sin personalidad del artículo 35.4 de la Ley General Tributaria."] },
        { title: "Entidades extranjeras", paragraphs: ["Existen reglas específicas para entidades constituidas en el extranjero. Algunas sin actividad económica en España pueden estar exceptuadas; revisa residencia, presencia y naturaleza de las rentas."] },
        { title: "No todas las agrupaciones son iguales", paragraphs: ["La denominación privada no decide el régimen fiscal. Confirma la forma jurídica, el NIF y el tratamiento censal de la entidad."] },
      ],
    },
    {
      id: "model-184-obligation",
      title: "¿Cuándo existe obligación?",
      cards: [
        { title: "Con actividad económica", paragraphs: ["La entidad presenta el Modelo 184 aunque sus rentas sean inferiores a 3.000 €, sean nulas o exista pérdida."] },
        { title: "Sin actividad económica", paragraphs: ["No presenta si sus rentas anuales no exceden de 3.000 €. Si exceden de ese importe, sí existe obligación informativa."] },
        { title: "Quién cumple la obligación", paragraphs: ["La presentación corresponde al representante de la entidad o a quien deba cumplirla conforme a la normativa aplicable, no a cada miembro mediante un 184 separado."] },
      ],
    },
    {
      id: "model-184-attribution",
      title: "Cómo se atribuyen las rentas",
      cards: [
        { title: "La renta conserva su naturaleza", paragraphs: ["Una renta de actividad, alquiler, capital o ganancia mantiene esa naturaleza cuando se atribuye a los miembros; no se convierte en una categoría única por pasar por la entidad."] },
        { title: "Porcentajes de participación", paragraphs: ["El reparto se realiza conforme a los pactos aplicables y acreditados. Si no constan fehacientemente, se atribuye por partes iguales conforme a la regla legal."] },
        { title: "Diferencias entre miembros", paragraphs: ["La entidad calcula la renta atribuible con las reglas previstas; cada miembro aplica después las particularidades de su impuesto, residencia y situación."] },
      ],
    },
    {
      id: "model-184-information",
      title: "Información de la entidad y sus miembros",
      cards: [
        { title: "Registro de entidad", bullets: ["NIF, denominación y domicilio.", "Representante y actividad.", "Rentas obtenidas por clase y fuente.", "Retenciones, deducciones y demás magnitudes informativas."] },
        { title: "Registro de miembro", bullets: ["NIF, nombre y domicilio fiscal.", "Residencia y porcentaje de participación.", "Rentas, retenciones y deducciones atribuibles.", "Altas, bajas o cambios de participación del ejercicio."] },
        { title: "Cuadre", paragraphs: ["La suma de los importes atribuidos debe ser coherente con los totales de la entidad y con los porcentajes o pactos documentados."] },
      ],
    },
    {
      id: "model-184-member-notice",
      title: "Comunicación a socios, comuneros y partícipes",
      cards: [
        { title: "Plazo", paragraphs: ["La entidad debe comunicar por escrito a sus miembros la información atribuida en el plazo de un mes desde que finaliza el plazo de presentación del Modelo 184."] },
        { title: "Contenido", bullets: ["Renta total de la entidad y parte atribuible.", "Bases de deducciones.", "Retenciones e ingresos a cuenta soportados por la entidad y atribuibles al miembro."] },
        { title: "Utilidad", paragraphs: ["Cada miembro utiliza esta comunicación para preparar su Renta u otro impuesto. Conserva copia y prueba de entrega."] },
      ],
    },
    {
      id: "model-184-related",
      title: "Relación con otras declaraciones",
      cards: [
        { title: "Modelo 100", paragraphs: ["El miembro persona física incorpora su renta atribuida en la declaración anual, conservando la naturaleza correspondiente."], links: [{ label: "Ver Modelo 100", href: "/consultor-fiscal/modelos/100" }] },
        { title: "Modelos 130 y 131", paragraphs: ["Los pagos fraccionados de actividades atribuidas siguen reglas específicas para los miembros. No quedan sustituidos por presentar el 184."], links: [{ label: "Ver Modelo 130", href: "/consultor-fiscal/modelos/130" }, { label: "Ver Modelo 131", href: "/consultor-fiscal/modelos/131" }] },
        { title: "Obligaciones de la entidad", paragraphs: ["La entidad puede tener obligaciones censales, de IVA, facturación, retenciones y operaciones con terceros además del 184."], links: [{ label: "Ver Modelo 036", href: "/consultor-fiscal/modelos/036" }, { label: "Ver Modelo 303", href: "/consultor-fiscal/modelos/303" }] },
      ],
    },
    {
      id: "model-184-filing",
      title: "Plazo, formulario y fichero",
      cards: [
        { title: "Plazo anual", paragraphs: ["El calendario vigente sitúa la presentación en enero del año siguiente. Comprueba cada campaña: en 2026 el vencimiento del ejercicio 2025 se trasladó al 2 de febrero por calendario."] },
        { title: "Formulario web", paragraphs: ["La AEAT ofrece formulario para declaraciones de hasta 40.000 registros, con identificación mediante certificado o Cl@ve según el acceso permitido."] },
        { title: "Presentación por fichero", paragraphs: ["El fichero debe ajustarse al diseño de registro vigente. Revisa el ejercicio del diseño antes de generarlo o reutilizarlo."] },
      ],
      note: "Importar la declaración del año anterior puede ahorrar trabajo, pero no confirma miembros, porcentajes ni importes del ejercicio actual. Una vista previa o PDF no acredita la presentación.",
    },
    {
      id: "model-184-corrections",
      title: "Correcciones y sustitución",
      accordions: [
        { question: "¿Cómo corrijo registros?", paragraphs: ["Utiliza los servicios vigentes de consulta y modificación de declaraciones informativas. El flujo actual puede permitir añadir, modificar o eliminar registros ya presentados."] },
        { question: "¿Debo marcar siempre complementaria o sustitutiva?", paragraphs: ["No. La vía depende del canal y del tipo de cambio. En el formulario actual, una nueva presentación del conjunto puede sustituir la anterior; sigue la ayuda concreta del ejercicio."] },
        { question: "¿Qué debo volver a comprobar?", paragraphs: ["Entidad, miembros, porcentajes, claves de renta, importes, retenciones, deducciones y coherencia con la comunicación entregada a cada miembro."] },
      ],
    },
    { id: "model-184-territory", title: "Ámbito territorial", note: TERRITORIAL_NOTE },
  ],
  fillingTitle: "Cómo preparar el Modelo 184",
  fillingSteps: [
    { title: "1. Confirma la entidad", paragraphs: ["Revisa NIF, forma, representante, actividad y obligación de presentar."] },
    { title: "2. Cierra las rentas", paragraphs: ["Clasifica cada renta conservando su naturaleza y calcula retenciones, deducciones y demás datos."] },
    { title: "3. Actualiza los miembros", paragraphs: ["Verifica NIF, residencia, altas, bajas, porcentajes y pactos acreditados."] },
    { title: "4. Cuadra el reparto", paragraphs: ["Compara totales de entidad y sumas atribuidas por cada clave y miembro."] },
    { title: "5. Presenta y comunica", paragraphs: ["Firma en la AEAT, guarda el justificante y entrega después a cada miembro su comunicación escrita."] },
  ],
  afterTitle: "Después de presentar",
  afterSteps: [
    { title: "Comunica", description: "Entrega por escrito a los miembros su renta, deducciones y retenciones atribuibles dentro del plazo." },
    { title: "Conserva", description: "Guarda justificante, fichero, pactos, cálculos y prueba de las comunicaciones." },
    { title: "Concilia", description: "Comprueba que los miembros utilizan los importes comunicados en su declaración correspondiente." },
  ],
  comparison: {
    title: "Cómo se relacionan los Modelos 100, 309 y 184",
    current: { title: "Modelo 184", description: "La entidad informa anualmente las rentas y la parte atribuida a cada miembro." },
    related: { title: "Modelo 100", description: "El miembro persona física incorpora su parte a la Renta con la naturaleza que conserva.", href: "/consultor-fiscal/modelos/100", label: "Ver Modelo 100" },
    additional: [{ title: "Modelo 309", description: "Autoliquidación especial de IVA; no sustituye las obligaciones de la entidad ni de sus miembros.", href: "/consultor-fiscal/modelos/309", label: "Ver Modelo 309" }],
    conclusion: "El 184 informa y reparte; el 100 liquida el IRPF personal y el 309 ingresa IVA en supuestos especiales.",
  },
  pdfNotice: ["La vista previa no es válida para presentar. Debes completar la firma y envío en la sede oficial y conservar el justificante con CSV."],
  documents: [
    { label: "Nota informativa del Modelo 184", sourceId: "aeat.model-184.information-note.pdf" },
    { label: "Diseño de registro del Modelo 184", sourceId: "aeat.model-184.register-design.pdf" },
  ],
  officialLinks: [
    { label: "Ficha administrativa del procedimiento", sourceId: "aeat.model-184.procedure-record.2026-07-08" },
    { label: "Ayuda del formulario", sourceId: "aeat.model-184.browser-form-help.2026-02-05" },
    { label: "Ayuda de presentación mediante fichero", sourceId: "aeat.model-184.file-upload-help.2026-02-05" },
    { label: "Características del régimen de atribución", href: "https://sede.agenciatributaria.gob.es/Sede/irpf/empresarios-individuales-profesionales/entidades-regimen-atribucion-renta/caracteristicas-regimen-fiscal-atribucion-rentas.html" },
    { label: "Obligaciones de los miembros", href: "https://sede.agenciatributaria.gob.es/Sede/irpf/empresarios-individuales-profesionales/entidades-regimen-atribucion-renta/obligaciones-socios-herederos___.html" },
  ],
  legalLinks: [
    { label: "Orden HAP/2250/2015", sourceId: "boe.model-184.order-hap-2250-2015" },
    { label: "Orden HAC/1430/2025", sourceId: "boe.models-182-184.order-hac-1430-2025" },
    { label: "Ley 35/2006 del IRPF · artículos 86 a 90", href: "https://www.boe.es/buscar/act.php?id=BOE-A-2006-20764#ci-2" },
    { label: "Reglamento del IRPF · artículo 70", href: "https://www.boe.es/buscar/act.php?id=BOE-A-2007-6820#a70" },
  ],
  faq: [
    { question: "¿Quién presenta el Modelo 184?", answer: "La entidad en régimen de atribución de rentas, no cada miembro por separado." },
    { question: "¿Genera un pago?", answer: "No. Es una declaración informativa." },
    { question: "¿Una comunidad de bienes con actividad lo presenta?", answer: "Sí, con independencia del importe de sus rentas." },
    { question: "¿Cómo funciona el límite de 3.000 €?", answer: "Solo exceptúa a entidades sin actividad económica cuyas rentas no excedan de 3.000 € anuales." },
    { question: "¿Y si la actividad da pérdidas?", answer: "La entidad con actividad sigue obligada; debe informar la renta atribuible." },
    { question: "¿Qué miembros se incluyen?", answer: "Socios, herederos, comuneros o partícipes, residentes o no, y sus cambios del ejercicio." },
    { question: "¿Cómo se reparten las rentas?", answer: "Según los pactos aplicables acreditados; si no constan, conforme a la regla legal de reparto igual." },
    { question: "¿La renta cambia de naturaleza?", answer: "No. Conserva la naturaleza derivada de la actividad o fuente de la que procede." },
    { question: "¿Qué recibe cada miembro?", answer: "Una comunicación escrita con renta, deducciones y retenciones atribuibles." },
    { question: "¿Cuándo se entrega esa comunicación?", answer: "En el mes siguiente a la finalización del plazo del Modelo 184." },
    { question: "¿Cuándo se presenta?", answer: "Con periodicidad anual, actualmente durante enero; comprueba el calendario de cada ejercicio." },
    { question: "¿Puedo usar el formulario web?", answer: "Sí, dentro del límite de registros y con la identificación que admita el servicio." },
    { question: "¿Puedo reutilizar el año anterior?", answer: "Como ayuda, pero debes actualizar todos los miembros, porcentajes e importes." },
    { question: "¿El PDF de vista previa ya está presentado?", answer: "No." },
    { question: "¿Cómo corrijo una declaración?", answer: "Usa el servicio vigente de consulta y modificación y sigue la ayuda del canal utilizado." },
  ],
  sourceIds: [
    "aeat.model-184.procedure-home.2026-07-08",
    "aeat.model-184.procedure-record.2026-07-08",
    "aeat.model-184.browser-form-help.2026-02-05",
    "aeat.model-184.file-upload-help.2026-02-05",
    "aeat.model-184.information-note.pdf",
    "aeat.model-184.register-design.pdf",
    "boe.model-184.order-hap-2250-2015",
    "boe.models-182-184.order-hac-1430-2025",
  ],
} as const satisfies FiscalModelPracticalGuideV1;
