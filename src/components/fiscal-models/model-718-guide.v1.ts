import type { FiscalModelPracticalGuideV1 } from "./fiscal-model-practical-guide.types";

const TERRITORIAL_NOTE =
  "Esta guía se refiere principalmente a las obligaciones estatales. Los contribuyentes sometidos a normativa del País Vasco o Navarra deben comprobar los modelos y reglas de la Hacienda foral correspondiente.";

export const MODEL_718_GUIDE_V1 = {
  code: "718",
  effectiveYear: 2026,
  taxPeriodYear: 2025,
  filingYear: 2026,
  lastVerifiedAt: "2026-07-15",
  requiresAnnualReview: true,
  intro: [
    "El Modelo 718 sirve para calcular el Impuesto Temporal de Solidaridad de las Grandes Fortunas, un tributo estatal complementario del Impuesto sobre el Patrimonio.",
    "Afecta a determinadas personas físicas con patrimonios netos elevados y toma como referencia la situación patrimonial a 31 de diciembre. No depende de la facturación de la actividad autónoma.",
  ],
  notices: [
    {
      title: "Superar tres millones no obliga automáticamente a presentar",
      paragraphs: [
        "El impuesto grava patrimonios netos superiores a 3.000.000 de euros, pero el Modelo 718 solo se presenta cuando, después del cálculo completo, la cuota resulta a ingresar.",
      ],
    },
    {
      title: "Complementario de Patrimonio",
      paragraphs: [
        "El Impuesto Temporal de Solidaridad de las Grandes Fortunas es estatal y complementario del Impuesto sobre el Patrimonio. La cuota de Patrimonio del mismo ejercicio efectivamente satisfecha puede deducirse en su cálculo.",
      ],
    },
    {
      title: "El impuesto sigue vigente",
      paragraphs: [
        "La palabra «Temporal» forma parte del nombre oficial. Su aplicación está prorrogada y la AEAT mantiene el procedimiento y la presentación del Modelo 718.",
      ],
    },
    {
      title: "Cálculo avanzado",
      paragraphs: [
        "Exige revisar bienes, deudas, exenciones, mínimo, escala, límite conjunto con Renta y Patrimonio, impuestos extranjeros y cuota de Patrimonio. Esta ficha no construye una calculadora simplificada.",
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
      href: "https://sede.agenciatributaria.gob.es/Sede/declaraciones-informativas-otros-impuestos-tasas/impuesto-temporal-solidaridad-grandes-fortunas/quienes-estan-obligados-presentar-declaracion-itsgf.html",
      primary: true,
    },
    {
      label: "Acceder al Modelo 718",
      sourceId: "aeat.model-718.procedure-home.2026-07-14",
      primary: true,
    },
    {
      label: "Abrir información oficial del impuesto",
      sourceId: "aeat.model-718.information.2026-07-13",
      primary: true,
    },
    {
      label: "Consultar el plazo vigente",
      href: "https://sede.agenciatributaria.gob.es/Sede/declaraciones-informativas-otros-impuestos-tasas/impuesto-temporal-solidaridad-grandes-fortunas/que-plazo-se-presenta-declaracion-itsgf.html",
    },
    {
      label: "Consultar cómo se presenta",
      href: "https://sede.agenciatributaria.gob.es/Sede/declaraciones-informativas-otros-impuestos-tasas/impuesto-temporal-solidaridad-grandes-fortunas/se-presenta-declaracion-itsgf.html",
    },
  ],
  quickSummaryTitle: "El Modelo 718 en pocas palabras",
  quickFacts: [
    { label: "Qué es", value: "Un impuesto estatal complementario del Patrimonio." },
    { label: "A quién afecta", value: "Determinadas personas físicas con patrimonios netos elevados." },
    { label: "Hecho imponible", value: "Patrimonio neto superior a 3.000.000 €." },
    { label: "Presentación", value: "Solo cuando la cuota final resulta a ingresar." },
    { label: "Fecha de referencia", value: "31 de diciembre." },
    { label: "Mínimo exento", value: "700.000 € conforme a la regulación estatal del impuesto." },
    { label: "Escala", value: "Primeros 3.000.000 € de base liquidable al 0 %; después 1,7 %, 2,1 % y 3,5 % por tramos." },
    { label: "Plazo", value: "Del 1 al 31 de julio del año siguiente; domiciliación hasta el 28 de julio según la regulación vigente." },
  ],
  sections: [
    {
      id: "model-718-family",
      title: "Qué modelo puede estar relacionado",
      cards: [
        { title: "Modelo 718", paragraphs: ["Autoliquidación estatal complementaria para determinados patrimonios netos elevados."] },
        { title: "Modelo 714", paragraphs: ["Impuesto sobre el Patrimonio, cedido a las comunidades autónomas."], links: [{ label: "Ver Modelo 714", href: "/consultor-fiscal/modelos/714" }] },
        { title: "Modelos 720 y 721", paragraphs: ["Declaraciones informativas sobre determinados activos en el extranjero. No sustituyen los impuestos patrimoniales."], links: [{ label: "Ver Modelo 720", href: "/consultor-fiscal/modelos/720" }, { label: "Ver Modelo 721", href: "/consultor-fiscal/modelos/721" }] },
        { title: "Modelo 100", paragraphs: ["Aporta datos necesarios para calcular el límite conjunto de Renta, Patrimonio y Grandes Fortunas."], links: [{ label: "Ver Modelo 100", href: "/consultor-fiscal/modelos/100" }] },
      ],
      note: "Una misma persona puede necesitar 714 y 718, además de declaraciones informativas. Cada obligación se analiza por separado.",
    },
    {
      id: "model-718-not-usual",
      title: "No es un modelo habitual del autónomo",
      cards: [
        { title: "No depende de la facturación", paragraphs: ["La condición de autónomo no aumenta ni reduce por sí sola la obligación."] },
        { title: "Activos que pueden influir", bullets: ["Inmuebles y activos financieros.", "Participaciones empresariales.", "Seguros y rentas.", "Criptomonedas.", "Bienes en el extranjero."] },
      ],
    },
    {
      id: "model-718-purpose",
      title: "Qué grava",
      cards: [
        { title: "Patrimonio neto", paragraphs: ["El valor fiscal de los bienes y derechos menos las cargas, gravámenes y deudas deducibles, cuando supera 3.000.000 de euros a 31 de diciembre."] },
        { title: "Reglas de Patrimonio", paragraphs: ["El impuesto utiliza en gran medida las reglas de valoración, exenciones, sujetos, devengo y límites del Impuesto sobre el Patrimonio."] },
      ],
    },
    {
      id: "model-718-calculation",
      title: "Por qué tres millones no es el único cálculo",
      cards: [
        { title: "1. Patrimonio y exenciones", bullets: ["Valorar bienes y derechos.", "Restar deudas deducibles.", "Aplicar las exenciones que cumplan requisitos.", "Obtener la base imponible."] },
        { title: "2. Base y escala", bullets: ["Aplicar el mínimo exento de 700.000 €.", "Obtener la base liquidable.", "Aplicar la escala, cuyo primer tramo de 3.000.000 € tributa al 0 %."] },
        { title: "3. Límites y deducciones", bullets: ["Aplicar el límite conjunto con IRPF y Patrimonio.", "Revisar impuestos extranjeros y bonificaciones.", "Restar la cuota de Patrimonio efectivamente satisfecha.", "Comprobar si queda cuota a ingresar."] },
      ],
      note: "La fórmula «patrimonio menos tres millones por un tipo» no reproduce el cálculo legal.",
    },
    {
      id: "model-718-scale",
      title: "Escala estatal",
      cards: [
        { title: "Primer tramo", paragraphs: ["Hasta 3.000.000 euros de base liquidable: 0 %."] },
        { title: "Tramos posteriores", paragraphs: ["La escala legal aplica sucesivamente tipos del 1,7 %, 2,1 % y 3,5 %."] },
        { title: "Revisión anual", paragraphs: ["Los límites exactos de cada tramo y cualquier modificación deben comprobarse en el formulario y la normativa vigentes."] },
      ],
      note: "No se ofrece una calculadora porque el resultado también depende de exenciones, mínimo, deudas, titularidad, límite conjunto, impuestos extranjeros y cuota de Patrimonio.",
    },
    {
      id: "model-718-vs-wealth",
      title: "Relación con el Impuesto sobre el Patrimonio",
      cards: [
        { title: "Modelo 714", bullets: ["Impuesto cedido a las comunidades autónomas.", "Mínimos, escalas y bonificaciones autonómicas.", "Puede obligar por más de 2.000.000 € brutos aunque no haya cuota."] },
        { title: "Modelo 718", bullets: ["Impuesto estatal y complementario.", "Solo se presenta si existe cuota a ingresar.", "Permite deducir la cuota de Patrimonio efectivamente satisfecha."] },
      ],
      note: "Una bonificación autonómica de Patrimonio no resuelve por sí sola el resultado del Modelo 718. Puede ser necesario presentar ambos.",
    },
    {
      id: "model-718-exemptions",
      title: "Exenciones, bienes empresariales y participaciones",
      cards: [
        { title: "Exenciones de Patrimonio", paragraphs: ["Se aplican con carácter general las exenciones del Impuesto sobre el Patrimonio, como vivienda habitual, determinados bienes empresariales, participaciones y otros bienes, siempre que se cumplan sus requisitos."] },
        { title: "Actividad económica", bullets: ["Afectación y necesidad real.", "Actividad habitual, personal y directa.", "Principal fuente de renta.", "Documentación suficiente."] },
        { title: "Participaciones", bullets: ["Porcentajes individual o familiar.", "Actividad real y entidad no patrimonial.", "Funciones de dirección y remuneración.", "Activos necesarios y proporción exenta."] },
      ],
      note: "No debe marcarse como exenta toda una empresa únicamente porque el contribuyente trabaje en ella.",
    },
    {
      id: "model-718-joint-limit",
      title: "Límite conjunto con Renta y Patrimonio",
      cards: [
        { title: "Qué se compara", paragraphs: ["La suma de las cuotas del IRPF, Patrimonio y Grandes Fortunas puede estar sometida al límite conjunto previsto legalmente."] },
        { title: "Reducción limitada", paragraphs: ["La reducción de la cuota del 718 no puede superar el máximo legal y necesita datos de la declaración de Renta."] },
      ],
      note: "El límite conjunto no puede calcularse únicamente con el valor del patrimonio.",
    },
    {
      id: "model-718-deductions",
      title: "Impuestos extranjeros y cuota de Patrimonio",
      cards: [
        { title: "Impuestos satisfechos fuera de España", paragraphs: ["En obligación personal puede existir deducción por determinados impuestos patrimoniales extranjeros, después de comprobar naturaleza, país, convenio y límites."] },
        { title: "Cuota de Patrimonio", paragraphs: ["Se deduce la cuota del mismo ejercicio efectivamente satisfecha."] },
        { title: "No se deduce", bullets: ["La cuota teórica antes de bonificaciones.", "Una cuota no pagada.", "Una cuota de otro ejercicio.", "Un importe estimado."] },
      ],
    },
    {
      id: "model-718-validity",
      title: "Por qué sigue vigente",
      cards: [
        { title: "Denominación oficial", paragraphs: ["«Temporal» forma parte del nombre legal y no permite clasificarlo como histórico."] },
        { title: "Prórroga", paragraphs: ["La normativa consolidada prorroga su aplicación mientras no se revise la tributación patrimonial en el contexto de la financiación autonómica."] },
        { title: "Procedimiento actual", paragraphs: ["La AEAT mantiene página temática, formulario, simulador, consulta de declaraciones y normativa actualizada."] },
      ],
    },
    {
      id: "model-718-preparation",
      title: "Qué documentación preparar",
      cards: [
        { title: "Declaraciones y patrimonio", bullets: ["Modelos 714 y 100.", "Declaración 718 anterior.", "Patrimonio a 31 de diciembre.", "Inmuebles, cuentas, valores, fondos y seguros.", "Criptomonedas y bienes extranjeros."] },
        { title: "Exenciones y deducciones", bullets: ["Deudas y acreedores.", "Documentación de bienes empresariales y participaciones.", "Funciones de dirección y remuneración.", "Cuota de Patrimonio efectivamente pagada.", "Impuestos extranjeros y otras deducciones."] },
      ],
    },
    {
      id: "model-718-filing",
      title: "Plazo, presentación, simulador y correcciones",
      cards: [
        { title: "Plazo general", paragraphs: ["Del 1 al 31 de julio del año siguiente al devengo. La regulación vigente permite domiciliar hasta el 28 de julio, con cargo el 31."] },
        { title: "Presentación electrónica", paragraphs: ["Se utiliza el formulario web con identificación admitida, directamente o mediante representante o apoderado."] },
        { title: "Simulador Open", paragraphs: ["Permite preparar un cálculo, pero no presenta la declaración. Su PDF o resultado no acredita envío a la AEAT."] },
        { title: "Correcciones", paragraphs: ["Debe usarse el mecanismo vigente del formulario y distinguir mayor ingreso, menor ingreso y errores sin efecto económico. También existe trámite para aportar documentación."] },
      ],
      note: "Las fechas de campaña y domiciliación requieren revisión anual.",
    },
    {
      id: "model-718-mistakes",
      title: "Errores habituales",
      cards: [
        { title: "Vigencia y obligación", bullets: ["Marcarlo como histórico.", "Pensar que tres millones obligan automáticamente.", "Confundir patrimonio bruto y neto.", "Creer que una bonificación autonómica resuelve el 718."] },
        { title: "Cálculo", bullets: ["Restar solo tres millones y aplicar un tipo.", "Olvidar mínimo y exenciones.", "No calcular el límite conjunto.", "Deducir cuota teórica o de otro ejercicio."] },
        { title: "Activos", bullets: ["Omitir bienes extranjeros o criptomonedas.", "Aplicar exenciones sin requisitos.", "Omitir deudas justificadas o incluir deudas no deducibles."] },
        { title: "Presentación", bullets: ["Creer que el simulador presenta.", "Usar fechas o escala de otra campaña.", "No conservar documentación de participaciones empresariales."] },
      ],
    },
  ],
  fillingTitle: "Cómo preparar el Modelo 718",
  fillingSteps: [
    { title: "1. Identificación", paragraphs: ["Revisa Número de Identificación Fiscal (NIF), residencia, obligación personal o real y representación."] },
    { title: "2. Bienes y derechos", paragraphs: ["Clasifica inmuebles, actividad, valores, seguros, criptomonedas y bienes extranjeros."] },
    { title: "3. Exenciones", paragraphs: ["Comprueba vivienda, actividad, participaciones y otras exenciones con todos sus requisitos."] },
    { title: "4. Deudas", paragraphs: ["Registra importe, acreedor, justificación y relación con los bienes."] },
    { title: "5. Base imponible", paragraphs: ["Determina el patrimonio neto conforme a las reglas del Impuesto sobre el Patrimonio."] },
    { title: "6. Mínimo y escala", paragraphs: ["Aplica el mínimo estatal y los tramos vigentes a la base liquidable."] },
    { title: "7. Límite conjunto", paragraphs: ["Incorpora los datos necesarios del IRPF y del Modelo 714."] },
    { title: "8. Deducciones", paragraphs: ["Revisa impuestos extranjeros, bonificaciones y la cuota de Patrimonio efectivamente satisfecha."] },
    { title: "9. Resultado", paragraphs: ["Solo existe obligación de presentar cuando la cuota final resulta a ingresar."] },
    { title: "10. Pago y presentación", paragraphs: ["Elige la modalidad oficial, firma y conserva justificante y Código Seguro de Verificación (CSV)."] },
  ],
  afterTitle: "Qué ocurre después",
  afterSteps: [
    { title: "Conserva el expediente", description: "Guarda valoraciones, exenciones, deudas, límite conjunto y justificantes de impuestos pagados." },
    { title: "Concilia Patrimonio", description: "La cuota del 714 efectivamente satisfecha debe poder reconciliarse con la deducción del 718." },
    { title: "Revisa la campaña siguiente", description: "Escala, plazo, domiciliación y reglas deben comprobarse de nuevo cada año." },
  ],
  comparison: {
    title: "Modelo 718 y Modelo 714",
    current: { title: "Modelo 718", description: "Impuesto estatal complementario; solo se presenta cuando la cuota final resulta a ingresar." },
    related: { title: "Modelo 714", description: "Impuesto sobre el Patrimonio cedido a las comunidades autónomas; puede obligar también por valor bruto.", href: "/consultor-fiscal/modelos/714", label: "Ver Modelo 714" },
    additional: [
      { title: "Modelo 100", description: "Datos de Renta necesarios para el límite conjunto.", href: "/consultor-fiscal/modelos/100", label: "Ver Modelo 100" },
      { title: "Modelo 720", description: "Información sobre determinados bienes y derechos en el extranjero.", href: "/consultor-fiscal/modelos/720", label: "Ver Modelo 720" },
    ],
    conclusion: "El 718 complementa Patrimonio, pero tiene su propio resultado, plazo y obligación de presentación.",
  },
  pdfNotice: ["El simulador y los documentos guardados son ayudas de cálculo. Solo el envío firmado en el servicio oficial acredita la presentación del Modelo 718."],
  documents: [],
  officialLinks: [
    { label: "Ficha oficial del procedimiento", sourceId: "aeat.model-718.procedure-record.2026-07-14" },
    { label: "Información oficial del impuesto", sourceId: "aeat.model-718.information.2026-07-13" },
    { label: "Qué grava el impuesto", href: "https://sede.agenciatributaria.gob.es/Sede/declaraciones-informativas-otros-impuestos-tasas/impuesto-temporal-solidaridad-grandes-fortunas/que-grava-impuesto-temporal-solidaridad-fortunas.html" },
    { label: "Quién está obligado a presentar", href: "https://sede.agenciatributaria.gob.es/Sede/declaraciones-informativas-otros-impuestos-tasas/impuesto-temporal-solidaridad-grandes-fortunas/quienes-estan-obligados-presentar-declaracion-itsgf.html" },
  ],
  legalLinks: [
    { label: "Ley 38/2022 · artículo 3", sourceId: "boe.law-38-2022.article-3.2026-07-14" },
    { label: "Orden HAC/652/2026", sourceId: "boe.order-hac-652-2026.consolidated.2026-07-14" },
    { label: "Real Decreto-ley 8/2023 · prórroga", href: "https://www.boe.es/buscar/act.php?id=BOE-A-2023-26452" },
  ],
  faq: [
    { question: "¿El Modelo 718 sigue vigente?", answer: "Sí. La normativa prorrogó su aplicación y la AEAT mantiene el procedimiento actual." },
    { question: "¿Por qué se llama temporal?", answer: "Es su denominación legal; la palabra no significa que el modelo sea histórico." },
    { question: "¿Lo presenta cualquiera con más de tres millones?", answer: "No. Solo se presenta cuando la cuota final, después del cálculo completo, resulta a ingresar." },
    { question: "¿Es lo mismo que el Impuesto sobre el Patrimonio?", answer: "No. Es un impuesto estatal complementario, con su propio Modelo 718." },
    { question: "¿Puedo tener que presentar 714 y 718?", answer: "Sí. Son autoliquidaciones distintas y puede ser necesario presentar ambas." },
    { question: "¿Existe mínimo exento?", answer: "Sí. La regulación estatal del 718 establece 700.000 euros." },
    { question: "¿Qué ocurre con los primeros tres millones de base liquidable?", answer: "El primer tramo de 3.000.000 de euros tributa al 0 %." },
    { question: "¿Qué tipos se aplican después?", answer: "La escala vigente utiliza por tramos los tipos del 1,7 %, 2,1 % y 3,5 %." },
    { question: "¿Puedo descontar lo pagado en Patrimonio?", answer: "Se deduce la cuota del mismo ejercicio efectivamente satisfecha, no una cuota teórica o estimada." },
    { question: "¿Los bienes empresariales están exentos?", answer: "Solo cuando se cumplen todos los requisitos de la exención del Impuesto sobre el Patrimonio." },
    { question: "¿Cuándo se presenta?", answer: "Del 1 al 31 de julio del año siguiente; la domiciliación tiene un cierre anterior según la campaña vigente." },
    { question: "¿El simulador presenta la declaración?", answer: "No. Solo ayuda a preparar un cálculo; el envío debe realizarse y firmarse en el servicio oficial." },
  ],
  sourceIds: [
    "aeat.model-718.procedure-home.2026-07-14",
    "aeat.model-718.procedure-record.2026-07-14",
    "aeat.model-718.information.2026-07-13",
    "boe.law-38-2022.article-3.2026-07-14",
    "boe.order-hac-652-2026.consolidated.2026-07-14",
  ],
} as const satisfies FiscalModelPracticalGuideV1;
