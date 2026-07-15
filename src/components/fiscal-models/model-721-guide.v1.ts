import type { FiscalModelPracticalGuideV1 } from "./fiscal-model-practical-guide.types";

const TERRITORIAL_NOTE =
  "Esta guía se refiere principalmente a las obligaciones estatales. Los contribuyentes sometidos a normativa del País Vasco o Navarra deben comprobar los modelos y reglas de la Hacienda foral correspondiente.";

export const MODEL_721_GUIDE_V1 = {
  code: "721",
  effectiveYear: 2026,
  lastVerifiedAt: "2026-07-15",
  requiresAnnualReview: true,
  intro: [
    "El Modelo 721 sirve para informar de determinadas monedas virtuales custodiadas por proveedores situados fuera de España.",
    "Es una declaración informativa: no es un impuesto y no declara las ganancias, pérdidas, permutas ni rendimientos obtenidos con criptomonedas.",
  ],
  notices: [
    {
      title: "La custodia es la primera pregunta",
      paragraphs: [
        "No toda criptomoneda se incluye. Debe existir un tercero que salvaguarde las claves privadas por cuenta del usuario y ese custodio debe considerarse situado en el extranjero.",
      ],
    },
    {
      title: "La autocustodia queda fuera del Modelo 721",
      paragraphs: [
        "Cuando el usuario controla directamente sus claves privadas, esas monedas no se computan en el 721. Que el monedero sea hot o cold no decide por sí solo: importa quién controla las claves.",
      ],
    },
    {
      title: "Límite conjunto, no por moneda ni plataforma",
      paragraphs: [
        "El límite inicial es de más de 50.000 euros en el saldo conjunto a 31 de diciembre de las monedas virtuales situadas en el extranjero.",
      ],
    },
    {
      title: "Ámbito territorial",
      paragraphs: [TERRITORIAL_NOTE],
    },
  ],
  actions: [
    {
      label: "Comprobar custodia y localización",
      sourceId: "aeat.model-721.faq.2026-07-14",
      primary: true,
    },
    {
      label: "Abrir gestiones oficiales del Modelo 721",
      sourceId: "aeat.model-721.procedure-home.2026-07-14",
      primary: true,
    },
    {
      label: "Consultar el contenido oficial del modelo",
      sourceId: "aeat.model-721.content-pdf.2025-02-05",
      primary: true,
    },
    {
      label: "Consultar registro de proveedores de criptomonedas",
      href: "https://app.bde.es/rbe_spa/",
    },
    {
      label: "Consultar especificación del servicio web",
      sourceId: "aeat.model-721.web-service-pdf.2023-07-31",
    },
  ],
  quickSummaryTitle: "El Modelo 721 en pocas palabras",
  quickFacts: [
    { label: "Qué es", value: "Una declaración informativa, sin pago directo." },
    { label: "Qué declara", value: "Monedas virtuales custodiadas por proveedores situados en el extranjero." },
    { label: "Autocustodia", value: "No se incluye cuando el usuario controla sus claves privadas." },
    { label: "Límite inicial", value: "Más de 50.000 € de saldo conjunto a 31 de diciembre." },
    { label: "Nueva presentación", value: "Incremento superior a 20.000 € u otra causa, como perder una condición previamente declarada." },
    { label: "Plazo", value: "Del 1 de enero al 31 de marzo del año siguiente." },
    { label: "Presentación", value: "Formulario web o envío XML conforme a la especificación oficial." },
    { label: "Relación", value: "Puede coexistir con los Modelos 100, 714 y 720." },
  ],
  sections: [
    {
      id: "model-721-family",
      title: "Qué modelo puede estar relacionado",
      cards: [
        { title: "Modelo 721", paragraphs: ["Determinadas monedas virtuales custodiadas por proveedores situados en el extranjero."] },
        { title: "Modelo 720", paragraphs: ["Determinadas cuentas, inversiones, seguros, rentas e inmuebles situados en el extranjero."], links: [{ label: "Ver Modelo 720", href: "/consultor-fiscal/modelos/720" }] },
        { title: "Modelo 714", paragraphs: ["Patrimonio personal, incluidas monedas virtuales computables aunque estén en autocustodia."], links: [{ label: "Ver Modelo 714", href: "/consultor-fiscal/modelos/714" }] },
        { title: "Modelo 100", paragraphs: ["Rentas, ganancias y pérdidas obtenidas durante el año."], links: [{ label: "Ver Modelo 100", href: "/consultor-fiscal/modelos/100" }] },
      ],
      note: "Informar de monedas en el 721 no declara automáticamente sus ganancias o rendimientos y no sustituye Patrimonio.",
    },
    {
      id: "model-721-two-tests",
      title: "Los dos requisitos fundamentales",
      cards: [
        { title: "1. Custodia por un tercero", paragraphs: ["El proveedor salvaguarda las claves privadas en nombre del usuario o presta servicios de mantenimiento, almacenamiento y transferencia de monedas virtuales."] },
        { title: "2. Custodio situado en el extranjero", paragraphs: ["La entidad que presta el servicio no es residente en España ni un establecimiento permanente obligado a informar mediante la obligación nacional correspondiente."] },
      ],
      note: "No basta con que la marca de la plataforma sea extranjera. Deben revisarse la entidad contratante, el contrato, la factura o condiciones y quién custodia realmente las claves.",
    },
    {
      id: "model-721-custody",
      title: "Cartera custodiada y autocustodia",
      cards: [
        { title: "Cartera custodiada", bullets: ["Un tercero controla o salvaguarda las claves.", "Puede ser una plataforma o exchange.", "Puede entrar en el 721 si el custodio está situado en el extranjero."] },
        { title: "Cartera de autocustodia", bullets: ["El usuario controla directamente sus claves.", "Puede ser un dispositivo físico o una aplicación no custodia.", "No se incluye en el Modelo 721 por esa cartera."] },
        { title: "Ejemplos", bullets: ["Cripto en un exchange extranjero custodio: revisar el 721.", "Cripto en un dispositivo cuyas claves controla el usuario: fuera del 721.", "Aplicación móvil: depende de quién controla las claves, no de que esté conectada a internet."] },
      ],
    },
    {
      id: "model-721-location",
      title: "Cómo comprobar si el custodio está en el extranjero",
      cards: [
        { title: "Entidad concreta", paragraphs: ["Revisa la sociedad que figura en el contrato y sus condiciones, no solo el nombre comercial de la plataforma."] },
        { title: "Registro del Banco de España", paragraphs: ["La consulta oficial puede ayudar a localizar proveedores de cambio y custodia registrados. El resultado debe interpretarse junto con la entidad contratante y el servicio concreto."] },
      ],
    },
    {
      id: "model-721-threshold",
      title: "Límite conjunto de 50.000 euros",
      cards: [
        { title: "Cómo se calcula", paragraphs: ["Se suman los saldos de todos los tipos de monedas virtuales situadas en el extranjero, valorados en euros a 31 de diciembre."] },
        { title: "Si se supera", paragraphs: ["Deben informarse todas las monedas virtuales incluidas, no únicamente la parte que exceda de 50.000 euros."] },
        { title: "Ejemplo", bullets: ["Bitcoin: 30.000 €.", "Ethereum: 15.000 €.", "Stablecoins: 10.000 €.", "Total: 55.000 €; se supera el límite conjunto."] },
      ],
      note: "El límite no se calcula por criptomoneda ni por plataforma.",
    },
    {
      id: "model-721-accounting",
      title: "Exoneración por contabilización",
      cards: [
        { title: "Quién puede revisarla", paragraphs: ["Personas jurídicas, entidades residentes, establecimientos permanentes y determinadas personas físicas con actividad económica."] },
        { title: "Qué exige", bullets: ["Contabilidad conforme al Código de Comercio cuando corresponda.", "Registro individualizado de denominación, valor, custodio y país o territorio.", "Identificación suficiente y demostrable."] },
      ],
      note: "Un Excel o un libro fiscal no equivalen automáticamente a la contabilidad exigida y no existe una exoneración genérica para cualquier autónomo.",
    },
    {
      id: "model-721-data",
      title: "Información y valoración",
      cards: [
        { title: "Datos del custodio", bullets: ["Nombre o razón social.", "Identificador fiscal extranjero, cuando exista.", "País, domicilio y sitio web."] },
        { title: "Datos de cada moneda", bullets: ["Denominación y siglas.", "Unidades.", "Valor en euros a 31 de diciembre.", "Fecha y valor cuando se extingue antes la condición."] },
        { title: "Fuente de valoración", paragraphs: ["La AEAT exige valoración en euros e identificación individualizada. Debe conservarse la fuente de cotización utilizada y un criterio razonable y coherente para el cierre."] },
      ],
      note: "No se declara una línea genérica de «criptomonedas» ni se utiliza automáticamente el precio de compra. Las stablecoins también se valoran en euros.",
    },
    {
      id: "model-721-repeat",
      title: "Cuándo debe volver a presentarse",
      cards: [
        { title: "Incremento superior a 20.000 €", paragraphs: ["Después de la primera declaración se compara el saldo conjunto a 31 de diciembre con el que determinó la última presentación."] },
        { title: "Pérdida de una condición declarada", paragraphs: ["Vender, retirar o cambiar de custodio puede exigir informar de la extinción respecto de monedas previamente declaradas."] },
        { title: "Operaciones dentro del mismo año", paragraphs: ["No toda moneda comprada y vendida durante el año se declara como cancelación. La FAQ oficial limita determinadas cancelaciones a posiciones respecto de las que ya existió obligación previa."] },
      ],
      note: "Vender todas las monedas previamente declaradas puede obligar a presentar el 721 del año de la venta aunque el saldo final sea cero.",
    },
    {
      id: "model-721-other-taxes",
      title: "Relación con Renta, Patrimonio y otros modelos",
      cards: [
        { title: "Modelo 100", paragraphs: ["El 721 no declara ventas, pérdidas, permutas, pagos, staking, minería ni airdrops. Estas operaciones pueden tener efectos en la Renta."], links: [{ label: "Ver Modelo 100", href: "/consultor-fiscal/modelos/100" }] },
        { title: "Modelo 714", paragraphs: ["Las monedas virtuales pueden formar parte del patrimonio, incluidas las de autocustodia aunque no entren en el 721."], links: [{ label: "Ver Modelo 714", href: "/consultor-fiscal/modelos/714" }] },
        { title: "Modelos 172 y 173", paragraphs: ["Los presentan determinados proveedores para informar de saldos y operaciones. El titular no los presenta solo por poseer o negociar criptomonedas."], links: [{ label: "Ver Modelo 172", href: "/consultor-fiscal/modelos/172" }, { label: "Ver Modelo 173", href: "/consultor-fiscal/modelos/173" }] },
      ],
    },
    {
      id: "model-721-filing",
      title: "Preparación, plazo y presentación",
      cards: [
        { title: "Qué preparar", bullets: ["Declaraciones anteriores y datos del custodio.", "Contrato, país e identificador fiscal.", "Monedas, siglas, unidades y saldo de cierre.", "Fuente de cotización y valor en euros.", "Fechas de venta, retirada o cambio de custodia.", "Extractos y prueba de autocustodia cuando sea relevante."] },
        { title: "Plazo", paragraphs: ["Se presenta del 1 de enero al 31 de marzo del año siguiente. Los supuestos de imposibilidad técnica se rigen por la ampliación oficial aplicable."] },
        { title: "Canales", paragraphs: ["Formulario web o envío telemático en formato XML mediante un programa externo conforme a la especificación oficial."] },
      ],
      note: "Una vista previa, un XML generado o una sesión guardada no constituyen una presentación.",
    },
    {
      id: "model-721-corrections",
      title: "Correcciones y errores frecuentes",
      cards: [
        { title: "Cómo corregir", paragraphs: ["Consulta la declaración, localiza los registros, modifica, añade o elimina conforme al formulario vigente, valida el conjunto y conserva el nuevo justificante."] },
        { title: "Errores de custodia", bullets: ["Declarar cualquier criptomoneda.", "Declarar autocustodia.", "Decidir por hot o cold wallet.", "Usar la marca en vez de la entidad contratante."] },
        { title: "Errores de límite y valoración", bullets: ["Calcular por moneda o exchange.", "Declarar solo el exceso.", "Usar el precio de compra.", "No guardar la fuente de valoración.", "Olvidar stablecoins o extinciones previas."] },
        { title: "Errores de alcance", bullets: ["Creer que declara ganancias.", "Confundirlo con 720, 172 o 173.", "Pensar que sustituye Patrimonio.", "Aplicar a cualquier autónomo la exoneración contable."] },
      ],
    },
  ],
  fillingTitle: "Cómo preparar el Modelo 721",
  fillingSteps: [
    { title: "1. Identifica al declarante", paragraphs: ["Revisa Número de Identificación Fiscal (NIF), ejercicio y condición de titular, beneficiario, autorizado, poder de disposición o titular real."] },
    { title: "2. Determina quién custodia", paragraphs: ["Comprueba quién controla las claves privadas y qué entidad presta el servicio."] },
    { title: "3. Verifica la localización", paragraphs: ["Revisa residencia, establecimiento permanente, contrato y registro oficial del proveedor."] },
    { title: "4. Calcula el saldo conjunto", paragraphs: ["Valora en euros a 31 de diciembre todas las monedas incluidas y aplica el límite conjunto."] },
    { title: "5. Identifica cada moneda", paragraphs: ["Registra denominación, siglas, unidades y valor por separado."] },
    { title: "6. Revisa extinciones", paragraphs: ["Comprueba ventas, retiradas y cambios de custodio de posiciones previamente declaradas."] },
    { title: "7. Documenta la valoración", paragraphs: ["Conserva la fuente y el criterio aplicado a cada moneda."] },
    { title: "8. Valida y presenta", paragraphs: ["Corrige duplicidades y custodios; firma y envía en la AEAT."] },
    { title: "9. Conserva el justificante", paragraphs: ["Guarda número de registro, Código Seguro de Verificación (CSV), extractos y evidencia de custodia."] },
  ],
  afterTitle: "Qué ocurre después",
  afterSteps: [
    { title: "Conserva trazabilidad", description: "Guarda contratos, extractos, fuentes de valoración y cambios de custodia." },
    { title: "Revisa cada cierre", description: "Compara con la última declaración y detecta extinciones, sin presentar por rutina." },
    { title: "Declara por separado", description: "Analiza Renta, Patrimonio y bienes en el extranjero sin asumir que el 721 los sustituye." },
  ],
  comparison: {
    title: "Modelo 721 y Modelo 720",
    current: { title: "Modelo 721", description: "Monedas virtuales custodiadas por determinados proveedores situados en el extranjero." },
    related: { title: "Modelo 720", description: "Cuentas, inversiones, seguros, rentas e inmuebles situados en el extranjero.", href: "/consultor-fiscal/modelos/720", label: "Ver Modelo 720" },
    additional: [
      { title: "Modelo 714", description: "Patrimonio personal, incluidas monedas en autocustodia cuando correspondan.", href: "/consultor-fiscal/modelos/714", label: "Ver Modelo 714" },
      { title: "Modelo 100", description: "Ganancias, pérdidas y otros efectos fiscales del año.", href: "/consultor-fiscal/modelos/100", label: "Ver Modelo 100" },
    ],
    conclusion: "La localización fiscal del custodio y el control de las claves son decisivos; la tecnología del monedero por sí sola no lo es.",
  },
  pdfNotice: ["La AEAT publica un anexo de contenido y documentación técnica. Consultarlos o generar un XML no acredita la presentación del Modelo 721."],
  documents: [
    { label: "Contenido oficial de la declaración", sourceId: "aeat.model-721.content-pdf.2025-02-05" },
    { label: "Descripción del servicio web", sourceId: "aeat.model-721.web-service-pdf.2023-07-31" },
  ],
  officialLinks: [
    { label: "Ficha oficial del procedimiento", sourceId: "aeat.model-721.procedure-record.2026-07-14" },
    { label: "Preguntas frecuentes del Modelo 721", sourceId: "aeat.model-721.faq.2026-07-14" },
    { label: "Registro de proveedores del Banco de España", href: "https://app.bde.es/rbe_spa/" },
  ],
  legalLinks: [
    { label: "Orden HFP/886/2023", sourceId: "boe.order-hfp-886-2023.consolidated.2026-07-14" },
    { label: "Reglamento General de gestión e inspección tributaria", href: "https://www.boe.es/buscar/act.php?id=BOE-A-2007-15984" },
  ],
  faq: [
    { question: "¿El Modelo 721 es un impuesto?", answer: "No. Es una declaración informativa y no genera por sí misma un pago." },
    { question: "¿Se declara cualquier criptomoneda?", answer: "No. Debe estar custodiada por un tercero situado en el extranjero y cumplirse los demás requisitos." },
    { question: "¿Se declara una hardware wallet?", answer: "No por el 721 cuando el usuario controla directamente sus claves privadas." },
    { question: "¿Una hot wallet se declara siempre?", answer: "No. Lo decisivo es quién controla las claves y dónde se sitúa el custodio." },
    { question: "¿Cuál es el límite inicial?", answer: "Más de 50.000 euros en el saldo conjunto a 31 de diciembre de las monedas virtuales situadas en el extranjero." },
    { question: "¿Se calcula por plataforma o por moneda?", answer: "No. El límite es conjunto; si se supera se informa de todas las monedas incluidas." },
    { question: "¿Se presenta todos los años?", answer: "No. Se revisa el incremento superior a 20.000 euros y las pérdidas de condición previamente declaradas." },
    { question: "¿Qué ocurre si vendo todas las monedas declaradas?", answer: "Puede existir obligación de informar de la extinción en el año de la venta." },
    { question: "¿Declara las ganancias y pérdidas?", answer: "No. Esos efectos se analizan por separado, normalmente en la Renta u otros impuestos." },
    { question: "¿La autocustodia puede afectar a Patrimonio?", answer: "Sí. Que no entre en el 721 no impide que forme parte del patrimonio personal." },
    { question: "¿Quién presenta los Modelos 172 y 173?", answer: "Determinados proveedores de servicios; el titular no los presenta solo por poseer monedas virtuales." },
    { question: "¿Cuándo se presenta?", answer: "Del 1 de enero al 31 de marzo del año siguiente." },
  ],
  sourceIds: [
    "aeat.model-721.procedure-home.2026-07-14",
    "aeat.model-721.procedure-record.2026-07-14",
    "aeat.model-721.faq.2026-07-14",
    "aeat.model-721.content-pdf.2025-02-05",
    "aeat.model-721.web-service-pdf.2023-07-31",
    "boe.order-hfp-886-2023.consolidated.2026-07-14",
  ],
} as const satisfies FiscalModelPracticalGuideV1;
