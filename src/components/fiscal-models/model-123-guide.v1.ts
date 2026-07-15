import type { FiscalModelPracticalGuideV1 } from "./fiscal-model-practical-guide.types";

const TERRITORIAL_NOTE =
  "Esta guía se refiere a la Agencia Tributaria estatal y al territorio común. En País Vasco o Navarra la obligación puede corresponder a la Hacienda foral competente.";

export const MODEL_123_GUIDE_V1 = {
  code: "123",
  effectiveYear: 2026,
  lastVerifiedAt: "2026-07-15",
  requiresAnnualReview: true,
  intro: [
    "El Modelo 123 sirve para ingresar periódicamente determinadas retenciones practicadas al pagar dividendos, intereses y otras rentas del capital mobiliario.",
    "Lo presenta quien paga la renta y está obligado a retener, no quien recibe el dividendo, el interés o la renta. Al terminar el año, el detalle de los perceptores se informa normalmente mediante el Modelo 193.",
  ],
  notices: [
    {
      title: "No incluye cualquier renta del capital",
      paragraphs: [
        "Existen modelos específicos para alquileres urbanos, fondos de inversión, activos financieros, cuentas bancarias, seguros y otras rentas. La naturaleza de la operación debe comprobarse antes de elegir el 123.",
      ],
    },
    {
      title: "Tipos y clasificación con revisión anual",
      paragraphs: [
        "Los porcentajes indicados son referencias del cuadro oficial de 2026. No son una regla permanente y pueden cambiar según la renta, el impuesto, la residencia o una norma especial.",
      ],
    },
    {
      title: "Ámbito territorial",
      paragraphs: [TERRITORIAL_NOTE],
    },
  ],
  actions: [
    {
      label: "Abrir gestiones oficiales del Modelo 123",
      sourceId: "aeat.model-123.procedure-home.2026-02-24",
      primary: true,
    },
    {
      label: "Consultar ayuda de presentación",
      sourceId: "aeat.model-123.help.2026-06-19",
      primary: true,
    },
    {
      label: "Consultar tipos de retención de 2026",
      href: "https://sede.agenciatributaria.gob.es/static_files/Sede/Programas_ayuda/Retenciones/2026/CUADRO_TIPOS_RETENCION_IRPF_2026.pdf",
    },
    {
      label: "Consultar cuándo nace la obligación de retener",
      href: "https://sede.agenciatributaria.gob.es/Sede/irpf/retenciones-ingresos-cuenta-pagos-fraccionados/retenciones-ingresos-cuenta/que-momento-tengo-que-realizar-cuenta.html",
    },
    {
      label: "Ver obligaciones del retenedor",
      href: "https://sede.agenciatributaria.gob.es/Sede/irpf/retenciones-ingresos-cuenta-pagos-fraccionados/retenciones-ingresos-cuenta/obligaciones-retenedor.html",
    },
  ],
  quickSummaryTitle: "El Modelo 123 en pocas palabras",
  quickFacts: [
    { label: "Qué es", value: "Una autoliquidación periódica de determinadas retenciones e ingresos a cuenta." },
    { label: "Quién lo presenta", value: "El pagador obligado a retener cuando satisface una renta incluida." },
    { label: "Casos habituales", value: "Dividendos, determinados intereses y otras rentas del capital mobiliario." },
    { label: "Periodicidad", value: "Normalmente trimestral; mensual para grandes empresas y otros obligados mensuales." },
    { label: "Resumen anual", value: "Modelo 193, con el detalle de cada perceptor y de la renta." },
    { label: "Territorio", value: "La guía describe el modelo estatal; los territorios forales pueden tener reglas propias." },
  ],
  sections: [
    {
      id: "model-123-who",
      title: "Quién paga, quién retiene y quién presenta",
      cards: [
        {
          title: "Quien paga la renta",
          paragraphs: ["Si una sociedad distribuye un dividendo o paga determinados intereses y debe retener, paga el neto al perceptor e ingresa la retención mediante el 123."],
        },
        {
          title: "Quien recibe la renta",
          paragraphs: ["El socio, prestamista u otro perceptor soporta la retención, pero no presenta el 123 por esa renta. Debe conservar el justificante o certificado correspondiente."],
        },
      ],
      note: "Una sociedad puede tener que presentar el Modelo 123 al pagar un dividendo a un socio aunque ese socio también sea administrador o trabajador.",
    },
    {
      id: "model-123-income",
      title: "Rentas que pueden aparecer",
      cards: [
        { title: "Dividendos y participaciones en beneficios", paragraphs: ["Las distribuciones de beneficios sujetas a retención son uno de los casos habituales del Modelo 123."] },
        { title: "Intereses de préstamos", paragraphs: ["Determinados intereses pagados por préstamos entre sociedades, autónomos o particulares pueden estar incluidos, según la naturaleza y circunstancias de la operación."] },
        { title: "Otras rentas del capital mobiliario", paragraphs: ["Pueden aparecer determinadas rentas por propiedad intelectual, asistencia técnica, arrendamiento de bienes muebles, negocios o minas y cesión del derecho de imagen."] },
      ],
      note: "No todo interés, derecho de autor o derecho de imagen corresponde al Modelo 123. La clasificación debe verificarse antes de declarar.",
    },
    {
      id: "model-123-exclusions",
      title: "Otros modelos que no deben mezclarse",
      cards: [
        { title: "Modelo 115", paragraphs: ["Alquiler o subarrendamiento de inmuebles urbanos sujeto a retención."], links: [{ label: "Ver Modelo 115", href: "/consultor-fiscal/modelos/115" }] },
        { title: "Modelo 117", paragraphs: ["Determinadas transmisiones o reembolsos de participaciones en instituciones de inversión colectiva."], links: [{ label: "Ver Modelo 117", href: "/consultor-fiscal/modelos/117" }] },
        { title: "Modelos 124, 126 y 128", paragraphs: ["Activos financieros, cuentas en instituciones financieras y determinadas operaciones de capitalización o seguros tienen modelos específicos."], links: [
          { label: "Ver Modelo 124", href: "/consultor-fiscal/modelos/124" },
          { label: "Ver Modelo 126", href: "/consultor-fiscal/modelos/126" },
          { label: "Ver Modelo 128", href: "/consultor-fiscal/modelos/128" },
        ] },
        { title: "Pagos a no residentes", paragraphs: ["Si el perceptor es no residente sin establecimiento permanente, debe revisarse el Modelo 216 y no utilizar automáticamente el 123."], links: [{ label: "Ver Modelo 216", href: "/consultor-fiscal/modelos/216" }] },
      ],
    },
    {
      id: "model-123-rates",
      title: "Tipos habituales en 2026",
      intro: ["El cuadro oficial de retenciones de 2026 recoge referencias distintas según la renta. Deben revisarse cada ejercicio y antes de aplicarlas a un caso real."],
      cards: [
        { title: "Dividendos e intereses", paragraphs: ["El cuadro oficial de 2026 recoge con carácter general el 19 % para dividendos y para rendimientos por cesión a terceros de capitales propios."] },
        { title: "Propiedad intelectual", paragraphs: ["El porcentaje depende de quién obtiene el rendimiento y de su naturaleza. El cuadro diferencia, entre otros supuestos, derechos cuando el perceptor no es el autor."] },
        { title: "Derechos de imagen", paragraphs: ["El cuadro oficial contiene un tipo específico para determinadas imputaciones por cesión del derecho de imagen. No toda cesión se clasifica igual."] },
      ],
      note: "El tipo no decide qué modelo corresponde. Primero se clasifica la renta y después se comprueba el porcentaje vigente.",
    },
    {
      id: "model-123-example",
      title: "Ejemplo sencillo de un dividendo",
      cards: [
        { title: "Dividendo bruto de 1.000 €", bullets: ["Importe bruto: 1.000 €.", "Retención de ejemplo al 19 %: 190 €.", "Importe neto pagado al socio: 810 €.", "Importe ingresado mediante el Modelo 123: 190 €.", "El perceptor se identifica después en el Modelo 193."] },
      ],
      note: "El ejemplo es didáctico y usa la referencia general de 2026; no sustituye la comprobación de la operación ni del tipo aplicable.",
    },
    {
      id: "model-123-timing",
      title: "Momento, periodos y plazos",
      cards: [
        { title: "Cuándo se practica", paragraphs: ["Con carácter general, la obligación se conecta con el momento en que la renta resulta exigible o se paga o entrega antes. La fecha contable por sí sola no siempre decide el periodo."] },
        { title: "Presentación trimestral", paragraphs: ["La ficha administrativa indica los veinte primeros días naturales siguientes a cada trimestre natural."] },
        { title: "Presentación mensual", paragraphs: ["Las grandes empresas y otros obligados mensuales presentan durante los veinte primeros días de cada mes, con las particularidades del calendario oficial."] },
      ],
      note: "La domiciliación puede cerrar antes que el plazo general. Comprueba siempre el calendario fiscal del ejercicio.",
    },
    {
      id: "model-123-zero",
      title: "Periodos sin ingreso y declaraciones a cero",
      accordions: [
        { question: "¿Puede existir una declaración sin importe a ingresar?", paragraphs: ["La ayuda oficial contempla resultados a ingresar y resultados cero. Debe existir una razón real en los datos del periodo; cero no significa que cualquier periodo vacío deba presentarse."] },
        { question: "¿Y si no pagué ninguna renta incluida?", paragraphs: ["No debe promoverse un Modelo 123 vacío solo por ausencia total de rentas durante el periodo. Revisa también si procede una baja o modificación censal."] },
      ],
    },
    {
      id: "model-123-filing",
      title: "Presentación, pago y correcciones",
      cards: [
        { title: "Presentación electrónica", paragraphs: ["El formulario oficial permite cumplimentar, validar, firmar y enviar. Descargar o guardar datos no equivale a presentar."] },
        { title: "Resultado a ingresar", paragraphs: ["La ayuda oficial describe domiciliación dentro de plazo, Número de Referencia Completo (NRC), cargo en cuenta y otras opciones admitidas. Conserva el justificante y el Código Seguro de Verificación (CSV)."] },
        { title: "Correcciones", paragraphs: ["Si se ingresó menos puede proceder una complementaria. Si se ingresó de más o el error perjudica al obligado, debe utilizarse el procedimiento de rectificación que corresponda."] },
      ],
    },
    {
      id: "model-123-reconcile",
      title: "Conciliación con el Modelo 193",
      cards: [
        { title: "Durante el año", paragraphs: ["El Modelo 123 contiene totales periódicos de bases y retenciones."] },
        { title: "Al cerrar el año", paragraphs: ["El Modelo 193 identifica a cada perceptor y la clase de renta. Sus totales deben poder explicarse con los 123 presentados y corregidos."], links: [{ label: "Ver la guía del Modelo 193", href: "/consultor-fiscal/modelos/193" }] },
        { title: "Certificados", paragraphs: ["El retenedor debe expedir los certificados cuando proceda. El certificado no sustituye la presentación del Modelo 193."] },
      ],
    },
  ],
  fillingTitle: "Cómo preparar el Modelo 123",
  fillingSteps: [
    { title: "1. Identifica la renta pagada", paragraphs: ["Distingue dividendos, intereses y otras rentas. Comprueba que no corresponda a un modelo específico."] },
    { title: "2. Determina quién retiene", paragraphs: ["Verifica pagador, perceptor, residencia y condición fiscal sin inferirlos por el nombre del documento."] },
    { title: "3. Comprueba exigibilidad y periodo", paragraphs: ["Revisa cuándo nació la obligación y si la periodicidad es trimestral o mensual."] },
    { title: "4. Revisa base, tipo y retención", paragraphs: ["Aplica la norma y el cuadro vigentes para la renta concreta; no reutilices porcentajes de otro ejercicio."] },
    { title: "5. Concilia, presenta y conserva", paragraphs: ["Contrasta contabilidad y pagos, valida en la sede oficial y conserva justificante, NRC y CSV cuando existan."] },
  ],
  afterTitle: "Qué ocurre después",
  afterSteps: [
    { title: "Justificante", description: "Conserva la respuesta oficial y los datos del pago o deuda." },
    { title: "Conciliación anual", description: "Acumula los datos por perceptor para preparar el Modelo 193." },
    { title: "Revisión", description: "Corrige el 123 afectado antes de dar por conciliado el resumen anual." },
  ],
  comparison: {
    title: "Modelo 123 y Modelo 193",
    current: { title: "Modelo 123", description: "Ingreso periódico de determinadas retenciones; puede generar un pago." },
    related: { title: "Modelo 193", description: "Resumen anual informativo con el detalle de los perceptores; no vuelve a pagar.", href: "/consultor-fiscal/modelos/193", label: "Ver Modelo 193" },
    additional: [{ title: "Modelo 216", description: "Retenciones por determinadas rentas pagadas a no residentes sin establecimiento permanente.", href: "/consultor-fiscal/modelos/216", label: "Ver Modelo 216" }],
    conclusion: "El 123 ingresa importes periódicos y el 193 explica anualmente a quién y por qué se retuvo.",
  },
  pdfNotice: ["La AEAT gestiona actualmente el Modelo 123 mediante servicios electrónicos. Los documentos antiguos de diseño no deben confundirse con el formulario vigente."],
  documents: [],
  officialLinks: [
    { label: "Ficha administrativa del procedimiento", sourceId: "aeat.model-123.procedure-record.2026-06-09" },
    { label: "Guía censal oficial", sourceId: "aeat.model-123.census-guide.2026-03-26" },
    { label: "Ayuda oficial del formulario", sourceId: "aeat.model-123.help.2026-06-19" },
  ],
  legalLinks: [
    { label: "Orden EHA/3435/2007", sourceId: "boe.order-eha-3435-2007" },
    { label: "Orden HAP/2194/2013", sourceId: "boe.order-hap-2194-2013" },
    { label: "Ley 35/2006 del IRPF", href: "https://www.boe.es/buscar/act.php?id=BOE-A-2006-20764" },
    { label: "Reglamento del IRPF", href: "https://www.boe.es/buscar/act.php?id=BOE-A-2007-6820" },
  ],
  faq: [
    { question: "¿Quién presenta el Modelo 123?", answer: "El pagador obligado a retener cuando satisface una renta incluida, no quien recibe el importe neto." },
    { question: "¿Se utiliza para dividendos?", answer: "Puede utilizarse para dividendos sujetos a retención, después de comprobar la operación y el perceptor." },
    { question: "¿Cualquier interés se declara mediante el 123?", answer: "No. Cuentas bancarias, activos financieros y otras operaciones tienen modelos específicos." },
    { question: "¿Qué tipo se aplica en 2026?", answer: "Depende de la renta. El cuadro oficial recoge, entre otras referencias, el 19 % para dividendos y determinados intereses, pero debe revisarse el supuesto concreto." },
    { question: "¿Cuándo nace la obligación de retener?", answer: "En rendimientos del capital mobiliario se atiende con carácter general a su exigibilidad o al pago o entrega anterior." },
    { question: "¿Es trimestral o mensual?", answer: "Normalmente trimestral; grandes empresas y otros obligados presentan mensualmente." },
    { question: "¿Puedo presentar un 123 vacío?", answer: "No debe presentarse solo porque no hubo ninguna renta incluida. Un resultado cero requiere datos reales del periodo." },
    { question: "¿Cómo se paga?", answer: "Por las modalidades oficiales disponibles, como domiciliación dentro de plazo, NRC, cargo en cuenta u otras admitidas." },
    { question: "¿Cómo corrijo un error?", answer: "Puede corresponder una complementaria o un procedimiento de rectificación, según el sentido del error." },
    { question: "¿Tengo que presentar el Modelo 193?", answer: "Cuando corresponda, el 193 informa anualmente de los perceptores y rentas relacionados con los 123 del año." },
    { question: "¿Qué ocurre si el perceptor es no residente?", answer: "No debe usarse automáticamente el 123; revisa el Modelo 216 y la normativa de no residentes." },
    { question: "¿La guía cubre País Vasco y Navarra?", answer: "Describe la AEAT estatal. En los territorios forales puede ser competente la Hacienda correspondiente." },
  ],
  sourceIds: [
    "aeat.model-123.procedure-home.2026-02-24",
    "aeat.model-123.procedure-record.2026-06-09",
    "aeat.model-123.census-guide.2026-03-26",
    "aeat.model-123.help.2026-06-19",
    "boe.order-eha-3435-2007",
    "boe.order-hap-2194-2013",
  ],
} as const satisfies FiscalModelPracticalGuideV1;
