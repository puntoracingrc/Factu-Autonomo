import type { FiscalModelPracticalGuideV1 } from "./fiscal-model-practical-guide.types";

const TERRITORIAL_NOTE =
  "Esta guía se refiere principalmente a las obligaciones estatales. Los contribuyentes sometidos a normativa del País Vasco o Navarra deben comprobar los modelos y reglas de la Hacienda foral correspondiente.";

export const MODEL_720_GUIDE_V1 = {
  code: "720",
  effectiveYear: 2026,
  lastVerifiedAt: "2026-07-15",
  requiresAnnualReview: true,
  intro: [
    "El Modelo 720 sirve para informar a la Agencia Estatal de Administración Tributaria (AEAT) de determinadas cuentas, inversiones, seguros, rentas e inmuebles situados fuera de España.",
    "Es una declaración informativa: no es un impuesto y no genera por sí misma una cantidad a pagar. Tampoco declara las rentas o ganancias obtenidas por esos activos.",
  ],
  notices: [
    {
      title: "Tres bloques y tres límites independientes",
      paragraphs: [
        "Cuentas; valores, derechos, seguros y rentas; e inmuebles son obligaciones de información distintas. El límite inicial de más de 50.000 euros se comprueba por separado en cada bloque, no por activo ni sumando los tres bloques.",
      ],
    },
    {
      title: "Titularidad compartida: se mira el valor completo",
      paragraphs: [
        "Para comprobar el límite se utiliza el saldo o valor total del bien, sin prorratearlo entre titulares. Después se informa del valor completo y del porcentaje de participación.",
      ],
    },
    {
      title: "Las criptomonedas no van en el 720",
      paragraphs: [
        "Las monedas virtuales custodiadas en el extranjero se analizan mediante el Modelo 721. Una cuenta en dinero fiduciario asociada a una plataforma puede requerir un análisis distinto.",
      ],
    },
    {
      title: "Ámbito territorial",
      paragraphs: [TERRITORIAL_NOTE],
    },
  ],
  actions: [
    {
      label: "Comprobar si tengo obligación",
      sourceId: "aeat.model-720.faq.2025-02",
      primary: true,
    },
    {
      label: "Abrir gestiones oficiales del Modelo 720",
      sourceId: "aeat.model-720.procedure-home.2026-07-14",
      primary: true,
    },
    {
      label: "Ver ayuda del formulario",
      sourceId: "aeat.model-720.form-help.2026-07-14",
      primary: true,
    },
    {
      label: "Presentar mediante fichero",
      sourceId: "aeat.model-720.file-help.2026-07-14",
    },
    {
      label: "Consultar el plazo oficial",
      href: "https://sede.agenciatributaria.gob.es/Sede/todas-gestiones/impuestos-tasas/declaraciones-informativas/modelo-720-decla_____sobre-bienes-derechos-extranjero_/plazos-presentacion.html",
    },
  ],
  quickSummaryTitle: "El Modelo 720 en pocas palabras",
  quickFacts: [
    { label: "Qué es", value: "Una declaración informativa, sin pago directo." },
    { label: "Bloques", value: "Cuentas; inversiones y seguros; e inmuebles." },
    { label: "Límite inicial", value: "Más de 50.000 € por cada bloque independiente." },
    { label: "Cuentas", value: "Se revisan saldo a 31 de diciembre y promedio del último trimestre." },
    { label: "Nueva presentación", value: "Incremento del bloque superior a 20.000 € u otra causa, como cancelación o transmisión." },
    { label: "Plazo", value: "Del 1 de enero al 31 de marzo del año siguiente." },
    { label: "Presentación", value: "Electrónica, mediante formulario o fichero." },
    { label: "Criptomonedas", value: "No se incluyen; se revisa el Modelo 721." },
  ],
  sections: [
    {
      id: "model-720-family",
      title: "Qué modelo puede estar relacionado",
      cards: [
        { title: "Modelo 720", paragraphs: ["Determinadas cuentas, inversiones, seguros, rentas e inmuebles situados en el extranjero."] },
        { title: "Modelo 721", paragraphs: ["Determinadas monedas virtuales custodiadas por proveedores situados en el extranjero."], links: [{ label: "Ver Modelo 721", href: "/consultor-fiscal/modelos/721" }] },
        { title: "Modelo 714", paragraphs: ["Autoliquidación del patrimonio personal conforme a sus reglas de valoración y exenciones."], links: [{ label: "Ver Modelo 714", href: "/consultor-fiscal/modelos/714" }] },
        { title: "Modelo 718", paragraphs: ["Autoliquidación estatal complementaria para determinados patrimonios netos elevados."], links: [{ label: "Ver Modelo 718", href: "/consultor-fiscal/modelos/718" }] },
      ],
      note: "Una misma persona puede estar obligada a presentar más de uno de estos modelos. Informar del activo en el 720 no sustituye Renta, Patrimonio ni Grandes Fortunas.",
    },
    {
      id: "model-720-blocks",
      title: "Los tres bloques del Modelo 720",
      cards: [
        {
          title: "1. Cuentas · clave C",
          paragraphs: ["Cuentas corrientes, de ahorro, a plazo, de crédito y otros depósitos en entidades financieras extranjeras."],
          bullets: ["Puede afectar a titulares, representantes, autorizados, beneficiarios, personas con poder de disposición y titulares reales.", "Se revisan el saldo a 31 de diciembre y el saldo medio del último trimestre."],
        },
        {
          title: "2. Valores, derechos, seguros y rentas · claves V, I y S",
          paragraphs: ["Puede incluir acciones, participaciones, fondos, bonos, derechos, seguros de vida o invalidez y rentas temporales o vitalicias."],
          bullets: ["La regla depende de la naturaleza del activo y de la entidad que lo deposita o gestiona.", "La contabilización de una persona física no excluye por sí sola este bloque."],
        },
        {
          title: "3. Inmuebles · clave B",
          paragraphs: ["Viviendas, locales, terrenos, garajes y otros inmuebles, además de usufructo, nuda propiedad, multipropiedad y otros derechos reales situados fuera de España."],
          bullets: ["El límite se analiza con el valor de adquisición conjunto.", "Deben revisarse titularidad, derecho y porcentaje."],
        },
      ],
    },
    {
      id: "model-720-who",
      title: "Quién puede estar obligado",
      intro: ["Puede afectar a personas físicas y jurídicas residentes, establecimientos permanentes y entidades del artículo 35.4 de la Ley General Tributaria, entre otros supuestos legales."],
      accordions: [
        { question: "¿Y el régimen especial de trabajadores desplazados?", paragraphs: ["Las personas acogidas al régimen fiscal especial de trabajadores desplazados no quedan obligadas por ese régimen. La exclusión no se extiende automáticamente al cónyuge o a los hijos residentes fiscales en España."] },
        { question: "¿Basta con ser autorizado o titular real?", paragraphs: ["Esas condiciones pueden generar obligación en el bloque de cuentas. Deben revisarse también las exoneraciones y el límite conjunto."] },
      ],
    },
    {
      id: "model-720-threshold",
      title: "Cómo funciona el límite de 50.000 euros",
      cards: [
        { title: "Cuentas", paragraphs: ["Se suman las cuentas no exoneradas. Hay que revisar tanto el saldo conjunto a 31 de diciembre como el promedio conjunto del último trimestre."], bullets: ["Los saldos negativos se compensan con los positivos para comprobar el umbral.", "Si existe obligación, también se informan las cuentas declarables con saldo negativo."] },
        { title: "Valores, seguros y rentas", paragraphs: ["Se calcula conjuntamente el valor de los activos incluidos en este bloque según sus reglas específicas."] },
        { title: "Inmuebles", paragraphs: ["Se calcula conjuntamente el valor de adquisición de los inmuebles y derechos incluidos."] },
        { title: "Ejemplo por bloques", bullets: ["Cuentas: 40.000 €, sin perjuicio de revisar el promedio del cuarto trimestre.", "Valores: 60.000 €, se supera el límite de ese bloque.", "Inmuebles: 45.000 €, no se supera el límite.", "Los importes de bloques distintos no se suman entre sí."] },
      ],
    },
    {
      id: "model-720-shared",
      title: "Titularidad compartida y bienes gananciales",
      cards: [
        { title: "Cuenta de 100.000 € al 50 %", bullets: ["Cada titular revisa el límite utilizando 100.000 €.", "Declara el saldo total.", "Indica su participación del 50 %."] },
        { title: "Gananciales y titularidad real", paragraphs: ["Que solo uno figure como titular formal no elimina automáticamente la obligación del otro cónyuge. Debe revisarse su condición de titular real y la información que exige el formulario."] },
      ],
      note: "No se usa únicamente la parte proporcional para comprobar el límite.",
    },
    {
      id: "model-720-accounting",
      title: "Exoneración por contabilización",
      cards: [
        { title: "Personas jurídicas", paragraphs: ["Pueden quedar exoneradas cuando los bienes y derechos están registrados e identificados correctamente conforme a los requisitos de cada bloque."] },
        { title: "Persona física con actividad económica", paragraphs: ["Debe llevar contabilidad conforme al Código de Comercio y registrar cada activo de forma individualizada y suficiente."], bullets: ["Cuentas: puede existir exoneración.", "Inmuebles: puede existir exoneración.", "Valores, derechos, seguros y rentas: la contabilidad no elimina por sí sola la obligación."] },
      ],
      note: "Un libro fiscal, un Excel o una anotación genérica no equivalen automáticamente a la contabilidad exigida. La excepción debe poder demostrarse.",
    },
    {
      id: "model-720-special-assets",
      title: "Activos que requieren atención especial",
      accordions: [
        { question: "Fondos o bróker extranjero", paragraphs: ["Deben analizarse por separado las cuentas, valores y derechos mantenidos a través del intermediario. Los fondos pueden entrar en el bloque de valores."] },
        { question: "Plataformas de pago", paragraphs: ["Debe comprobarse si jurídicamente existe una cuenta en una entidad financiera situada en el extranjero. La marca comercial no decide la obligación."] },
        { question: "Planes de pensiones extranjeros", paragraphs: ["Las aportaciones no se informan automáticamente mientras no exista un derecho o prestación declarable. Una renta ya percibida puede tener otro tratamiento."] },
        { question: "Seguros de vida", paragraphs: ["Puede existir obligación según el valor de rescate y la entidad aseguradora."] },
        { question: "Criptomonedas", paragraphs: ["No se incluyen en el 720. La custodia de criptomonedas se analiza mediante el 721; el dinero fiduciario mantenido en una cuenta de la plataforma puede requerir una revisión separada."] },
      ],
    },
    {
      id: "model-720-repeat",
      title: "Cuándo debe volver a presentarse",
      cards: [
        { title: "Incremento superior a 20.000 €", paragraphs: ["Se compara el valor conjunto de cada bloque con el que determinó la última declaración de ese bloque. No se calcula por activo ni obliga automáticamente cada año."] },
        { title: "Cancelación, transmisión o pérdida de condición", paragraphs: ["Cerrar una cuenta, vender un activo o dejar de ser titular, autorizado, beneficiario o titular real puede obligar a informar aunque no exista incremento."] },
      ],
    },
    {
      id: "model-720-valuation",
      title: "Valoración y documentación",
      cards: [
        { title: "Valores posibles", bullets: ["Saldo bancario y promedio del cuarto trimestre.", "Valor a 31 de diciembre o valor liquidativo.", "Valor de rescate o capitalización.", "Valor de adquisición de inmuebles.", "Conversión a euros conforme al criterio aplicable."] },
        { title: "Qué preparar", bullets: ["Declaraciones anteriores y justificantes.", "Datos de entidad, país, fechas, saldos y porcentajes.", "Número de títulos, valores, seguros, rentas e inmuebles.", "Documentos de venta o cancelación.", "Contabilidad individualizada si se invoca una exoneración."] },
      ],
      note: "No se utiliza automáticamente el valor de mercado actual para todos los activos.",
    },
    {
      id: "model-720-filing",
      title: "Plazo, presentación y correcciones",
      cards: [
        { title: "Plazo", paragraphs: ["Se presenta del 1 de enero al 31 de marzo del año siguiente. La incidencia técnica solo amplía el plazo en los supuestos previstos oficialmente."] },
        { title: "Presentación electrónica", paragraphs: ["La AEAT ofrece formulario web y presentación mediante fichero. También puede actuar un representante, apoderado o colaborador social."] },
        { title: "Corregir una declaración", paragraphs: ["Consulta la declaración presentada, localiza el registro, modifica, añade o da de baja según la gestión vigente, valida y conserva el nuevo justificante."] },
      ],
      note: "Una vista previa, una sesión guardada o un fichero exportado no constituyen una presentación.",
    },
    {
      id: "model-720-sanctions",
      title: "Régimen sancionador vigente y errores frecuentes",
      cards: [
        { title: "Régimen actual", paragraphs: ["Desde la reforma de 2022 se aplica el régimen general de los artículos 198 y 199 de la Ley General Tributaria. Cada bloque constituye una obligación de información diferente."] },
        { title: "Errores de límites", bullets: ["Sumar los tres bloques.", "Aplicar 50.000 € a cada activo.", "Prorratear un activo compartido.", "Olvidar el promedio del cuarto trimestre.", "Aplicar 20.000 € por activo."] },
        { title: "Errores de alcance", bullets: ["Incluir criptomonedas.", "Olvidar autorizaciones, ventas o cancelaciones.", "Pensar que debe repetirse todos los años.", "Creer que cualquier contabilidad exime.", "Usar las antiguas sanciones especiales como si siguieran vigentes."] },
      ],
    },
  ],
  fillingTitle: "Cómo preparar el Modelo 720",
  fillingSteps: [
    { title: "1. Identifica al declarante y el ejercicio", paragraphs: ["Revisa Número de Identificación Fiscal (NIF), datos de contacto, residencia y declaración anterior."] },
    { title: "2. Separa los tres bloques", paragraphs: ["Clasifica cuentas, valores y seguros, e inmuebles antes de calcular límites."] },
    { title: "3. Revisa condición y titularidad", paragraphs: ["Identifica titular, representante, autorizado, beneficiario, poder de disposición o titular real y su porcentaje."] },
    { title: "4. Calcula cada límite", paragraphs: ["Usa el valor total de los activos no exonerados dentro de cada bloque."] },
    { title: "5. Identifica cada activo", paragraphs: ["País, entidad, dirección, cuenta, código, descripción y fechas de alta, transmisión o cancelación."] },
    { title: "6. Aplica la valoración correcta", paragraphs: ["Introduce saldo, promedio, valor, adquisición, rescate o capitalización según corresponda."] },
    { title: "7. Compara con la última declaración", paragraphs: ["Revisa el incremento superior a 20.000 € y las pérdidas de condición previamente declaradas."] },
    { title: "8. Valida el conjunto", paragraphs: ["Corrige errores, avisos y duplicidades antes de firmar."] },
    { title: "9. Presenta en la AEAT", paragraphs: ["Firma y envía en la sede oficial; conserva justificante, número de registro y Código Seguro de Verificación (CSV)."] },
  ],
  afterTitle: "Qué ocurre después",
  afterSteps: [
    { title: "Conserva evidencia", description: "Guarda justificante, fuentes de valoración, extractos y documentos de titularidad o cancelación." },
    { title: "No repitas por rutina", description: "Cada año revisa incrementos y pérdidas de condición; no presentes automáticamente." },
    { title: "Concilia otros impuestos", description: "Comprueba por separado Renta, Patrimonio, Grandes Fortunas y Modelo 721." },
  ],
  comparison: {
    title: "Modelo 720 y Modelo 721",
    current: { title: "Modelo 720", description: "Cuentas, inversiones, seguros, rentas e inmuebles en el extranjero, organizados en tres bloques." },
    related: { title: "Modelo 721", description: "Monedas virtuales custodiadas por determinados proveedores situados en el extranjero.", href: "/consultor-fiscal/modelos/721", label: "Ver Modelo 721" },
    additional: [
      { title: "Modelo 714", description: "Patrimonio personal, incluidos activos extranjeros cuando corresponda.", href: "/consultor-fiscal/modelos/714", label: "Ver Modelo 714" },
      { title: "Modelo 100", description: "Rentas, ganancias y pérdidas producidas durante el año.", href: "/consultor-fiscal/modelos/100", label: "Ver Modelo 100" },
    ],
    conclusion: "Informar de un activo extranjero no declara automáticamente la renta que produce ni sustituye los impuestos patrimoniales.",
  },
  pdfNotice: ["El Modelo 720 se tramita electrónicamente. Una copia, fichero o vista previa no acredita que la AEAT haya recibido la declaración."],
  documents: [],
  officialLinks: [
    { label: "Ficha oficial del procedimiento", sourceId: "aeat.model-720.procedure-record.2026-07-14" },
    { label: "Preguntas frecuentes actualizadas", sourceId: "aeat.model-720.faq.2025-02" },
    { label: "Ayuda de presentación mediante formulario", sourceId: "aeat.model-720.form-help.2026-07-14" },
    { label: "Ayuda de presentación mediante fichero", sourceId: "aeat.model-720.file-help.2026-07-14" },
  ],
  legalLinks: [
    { label: "Orden HAP/72/2013", sourceId: "boe.order-hap-72-2013.consolidated.2026-07-14" },
    { label: "Reglamento General de gestión e inspección tributaria", href: "https://www.boe.es/buscar/act.php?id=BOE-A-2007-15984" },
    { label: "Ley General Tributaria", href: "https://www.boe.es/buscar/act.php?id=BOE-A-2003-23186" },
  ],
  faq: [
    { question: "¿El Modelo 720 es un impuesto?", answer: "No. Es una declaración informativa y no genera por sí misma una cantidad a pagar." },
    { question: "¿Cuál es el límite inicial?", answer: "Más de 50.000 euros en cada uno de los tres bloques independientes, después de revisar las exoneraciones aplicables." },
    { question: "¿Se suman cuentas, inversiones e inmuebles?", answer: "No. Cada bloque se calcula de forma independiente." },
    { question: "¿El límite se aplica a cada cuenta o activo?", answer: "No. Se calcula conjuntamente dentro de su bloque." },
    { question: "¿Qué ocurre si hay varios titulares?", answer: "Se utiliza el valor total sin prorratear y se indica el porcentaje de participación." },
    { question: "¿Incluye criptomonedas?", answer: "No. Las monedas virtuales custodiadas en el extranjero se analizan mediante el Modelo 721." },
    { question: "¿Se presenta todos los años?", answer: "No. Se revisa el incremento superior a 20.000 euros por bloque y otras causas como transmisiones o cancelaciones." },
    { question: "¿Cerrar una cuenta puede obligar a presentarlo?", answer: "Sí, cuando se informa de la cancelación de una cuenta que estuvo previamente sujeta a declaración." },
    { question: "¿La contabilidad exime siempre a un autónomo?", answer: "No. Depende del activo, de llevar contabilidad conforme al Código de Comercio y de la identificación individualizada." },
    { question: "¿Importa el saldo máximo anual de una cuenta?", answer: "No por sí solo. Se revisan el saldo a 31 de diciembre y el promedio del último trimestre." },
    { question: "¿Cuándo se presenta?", answer: "Del 1 de enero al 31 de marzo del año siguiente." },
    { question: "¿Siguen vigentes las antiguas sanciones especiales?", answer: "No. La AEAT indica que se aplica el régimen sancionador general vigente de la Ley General Tributaria." },
  ],
  sourceIds: [
    "aeat.model-720.procedure-home.2026-07-14",
    "aeat.model-720.procedure-record.2026-07-14",
    "aeat.model-720.faq.2025-02",
    "aeat.model-720.form-help.2026-07-14",
    "aeat.model-720.file-help.2026-07-14",
    "boe.order-hap-72-2013.consolidated.2026-07-14",
  ],
} as const satisfies FiscalModelPracticalGuideV1;
