import type { FiscalModelPracticalGuideV1 } from "./fiscal-model-practical-guide.types";

const TERRITORIAL_NOTE =
  "Esta guía se refiere principalmente a las obligaciones estatales. Los contribuyentes sometidos a normativa del País Vasco o Navarra deben comprobar los modelos y reglas de la Hacienda foral correspondiente.";

export const MODEL_714_GUIDE_V1 = {
  code: "714",
  effectiveYear: 2026,
  taxPeriodYear: 2025,
  filingYear: 2026,
  lastVerifiedAt: "2026-07-15",
  requiresAnnualReview: true,
  intro: [
    "El Modelo 714 sirve para declarar el patrimonio neto de una persona física cuando se cumplen los requisitos del Impuesto sobre el Patrimonio.",
    "El impuesto toma como referencia los bienes, derechos, cargas y deudas existentes a 31 de diciembre. No es una obligación habitual de todos los autónomos.",
  ],
  notices: [
    {
      title: "Dos causas diferentes de presentación",
      paragraphs: [
        "Puede existir obligación porque la cuota, después de deducciones y bonificaciones, resulte a ingresar o porque el valor bruto de los bienes y derechos supere 2.000.000 de euros, aunque no resulte cuota.",
      ],
    },
    {
      title: "Dos millones no es el mínimo exento",
      paragraphs: [
        "El límite bruto de presentación y el mínimo exento son conceptos distintos. Para comprobar los 2.000.000 de euros se incluyen bienes exentos y no se restan deudas ni cargas.",
      ],
    },
    {
      title: "Reglas autonómicas",
      paragraphs: [
        "El Impuesto sobre el Patrimonio está cedido a las comunidades autónomas, que pueden establecer mínimos, escalas, deducciones y bonificaciones propias.",
      ],
    },
    {
      title: "Exenciones con requisitos",
      paragraphs: [
        "Los bienes de la actividad y las participaciones en empresas no están exentos automáticamente. Deben cumplirse y documentarse los requisitos legales.",
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
      href: "https://sede.agenciatributaria.gob.es/Sede/declaraciones-informativas-otros-impuestos-tasas/impuesto-sobre-patrimonio/quienes-estan-obligados-presentar-declaracion-ipatrimonio.html",
      primary: true,
    },
    {
      label: "Acceder al servicio de Patrimonio",
      sourceId: "aeat.model-714.procedure-home.2026-07-14",
      primary: true,
    },
    {
      label: "Consultar el Manual de Patrimonio",
      sourceId: "aeat.model-714.manual-2025.2026-07-14",
      primary: true,
    },
    {
      label: "Consultar bienes exentos",
      href: "https://sede.agenciatributaria.gob.es/Sede/declaraciones-informativas-otros-impuestos-tasas/impuesto-sobre-patrimonio/que-bienes-estan-exentos-ley-patrimonio.html",
    },
    {
      label: "Consultar el plazo vigente",
      href: "https://sede.agenciatributaria.gob.es/Sede/declaraciones-informativas-otros-impuestos-tasas/impuesto-sobre-patrimonio/que-plazo-se-presenta-declaracion-patrimonio.html",
    },
  ],
  quickSummaryTitle: "El Modelo 714 en pocas palabras",
  quickFacts: [
    { label: "Qué es", value: "La autoliquidación del Impuesto sobre el Patrimonio." },
    { label: "Quién lo presenta", value: "Personas físicas obligadas por cuota o por valor bruto." },
    { label: "Fecha de referencia", value: "31 de diciembre." },
    { label: "Límite bruto", value: "Más de 2.000.000 € en bienes y derechos, sin restar deudas." },
    { label: "Mínimo general", value: "700.000 €, salvo que la comunidad autónoma establezca otro." },
    { label: "Vivienda habitual", value: "Exención general máxima de 300.000 € por contribuyente." },
    { label: "Presentación", value: "Obligatoriamente electrónica." },
    { label: "Plazo", value: "El mismo que la declaración anual del Impuesto sobre la Renta de las Personas Físicas (IRPF)." },
  ],
  sections: [
    {
      id: "model-714-family",
      title: "Qué modelo puede estar relacionado",
      cards: [
        { title: "Modelo 714", paragraphs: ["Autoliquidación del patrimonio personal conforme a las reglas estatales y autonómicas aplicables."] },
        { title: "Modelo 718", paragraphs: ["Impuesto estatal complementario para determinados patrimonios netos elevados."], links: [{ label: "Ver Modelo 718", href: "/consultor-fiscal/modelos/718" }] },
        { title: "Modelo 720", paragraphs: ["Información sobre determinadas cuentas, inversiones, seguros e inmuebles situados en el extranjero."], links: [{ label: "Ver Modelo 720", href: "/consultor-fiscal/modelos/720" }] },
        { title: "Modelo 721", paragraphs: ["Información sobre determinadas monedas virtuales custodiadas en el extranjero."], links: [{ label: "Ver Modelo 721", href: "/consultor-fiscal/modelos/721" }] },
      ],
      note: "Un activo puede aparecer en una declaración informativa y también computarse en Patrimonio. Ninguno de estos modelos sustituye automáticamente a los demás.",
    },
    {
      id: "model-714-purpose",
      title: "Qué grava el Impuesto sobre el Patrimonio",
      intro: ["Grava el patrimonio neto de las personas físicas: el valor fiscal de sus bienes y derechos menos las cargas, gravámenes y deudas deducibles."],
      cards: [
        { title: "Bienes y derechos", bullets: ["Inmuebles, cuentas y depósitos.", "Acciones, fondos y participaciones.", "Seguros y rentas.", "Vehículos, embarcaciones, joyas y arte.", "Bienes empresariales y profesionales.", "Criptomonedas y bienes en el extranjero."] },
        { title: "Deudas", paragraphs: ["Solo reducen el patrimonio neto cuando existen a 31 de diciembre, están justificadas y cumplen las reglas de deducibilidad."] },
      ],
    },
    {
      id: "model-714-obligation",
      title: "Las dos causas de presentación",
      cards: [
        { title: "1. Cuota a ingresar", paragraphs: ["La cuota resulta positiva después de aplicar el mínimo, la escala, las deducciones y las bonificaciones correspondientes."] },
        { title: "2. Más de 2.000.000 € brutos", paragraphs: ["Aunque no exista cuota, se presenta cuando el valor de bienes y derechos supera el límite legal."], bullets: ["Se incluyen bienes exentos.", "No se restan cargas ni deudas.", "No se aplica el mínimo exento para comprobar este límite."] },
      ],
      note: "Una persona puede no pagar Patrimonio y aun así estar obligada a presentar el Modelo 714 por superar el límite bruto.",
    },
    {
      id: "model-714-three-figures",
      title: "Tres cifras que no deben confundirse",
      cards: [
        { title: "2.000.000 €", paragraphs: ["Límite bruto que puede obligar a presentar aunque no exista cuota."] },
        { title: "700.000 €", paragraphs: ["Mínimo exento estatal general cuando la comunidad autónoma no ha aprobado otro."] },
        { title: "300.000 €", paragraphs: ["Importe máximo general de la exención de vivienda habitual por contribuyente."] },
      ],
      note: "Estas cifras no se suman ni se restan automáticamente para decidir la obligación.",
    },
    {
      id: "model-714-regional",
      title: "Comunidades autónomas, residentes y no residentes",
      cards: [
        { title: "Normativa autonómica", paragraphs: ["La comunidad aplicable puede regular mínimo exento, escala, tipos, deducciones, bonificaciones y algunas exenciones. Debe consultarse la normativa de residencia y del ejercicio."] },
        { title: "Obligación personal", paragraphs: ["Los residentes fiscales en España tienen en cuenta su patrimonio mundial, sin perjuicio de convenios y reglas específicas."] },
        { title: "Obligación real", paragraphs: ["Los no residentes analizan los bienes y derechos situados o ejercitables en España y las reglas especiales aplicables."] },
      ],
      note: "No existe una única tabla estatal que resuelva todos los casos y ejercicios.",
    },
    {
      id: "model-714-business-assets",
      title: "Bienes necesarios para la actividad",
      cards: [
        { title: "Requisitos que deben revisarse", bullets: ["Actividad habitual, personal y directa.", "Principal fuente de renta en los términos legales.", "Afectación y necesidad real del bien.", "Existencia de actividad económica y pruebas suficientes."] },
        { title: "No basta la contabilidad", paragraphs: ["Un inmueble, vehículo, cuenta o inversión no queda exento solo por figurar en la contabilidad o estar relacionado de forma genérica con el negocio."] },
      ],
    },
    {
      id: "model-714-company-shares",
      title: "Participaciones en empresas familiares",
      cards: [
        { title: "Condiciones principales", bullets: ["Porcentaje de participación individual o familiar.", "Actividad real y ausencia de entidad patrimonial en los términos legales.", "Funciones de dirección y remuneración.", "Principal fuente de rentas.", "Proporción de activos necesarios para la actividad."] },
        { title: "Alcance proporcional", paragraphs: ["La exención puede no alcanzar a toda la participación si parte del patrimonio de la entidad no es necesario para la actividad."] },
      ],
      note: "Ser socio o administrador de una sociedad limitada no convierte automáticamente las participaciones en exentas.",
    },
    {
      id: "model-714-home",
      title: "Vivienda habitual",
      cards: [
        { title: "Exención general", paragraphs: ["La vivienda habitual puede estar exenta hasta 300.000 euros por contribuyente y respecto del derecho que le corresponda."] },
        { title: "Qué revisar", bullets: ["Propiedad, usufructo, uso o habitación.", "Parte que excede del máximo.", "Deuda hipotecaria y limitaciones de deducción.", "La segunda residencia no usa esta exención."] },
      ],
    },
    {
      id: "model-714-foreign-crypto",
      title: "Bienes en el extranjero y criptomonedas",
      cards: [
        { title: "Bienes extranjeros", paragraphs: ["En obligación personal se integran en el patrimonio mundial. Puede existir deducción por determinados impuestos satisfechos en el extranjero, con sus límites."], links: [{ label: "Ver Modelo 720", href: "/consultor-fiscal/modelos/720" }] },
        { title: "Criptomonedas", paragraphs: ["Pueden formar parte del patrimonio aunque estén en autocustodia. Deben valorarse conforme a las instrucciones del ejercicio."], links: [{ label: "Ver Modelo 721", href: "/consultor-fiscal/modelos/721" }] },
      ],
      note: "El Modelo 720 o el 721 no sustituyen la inclusión en el 714 cuando corresponda; el 714 tampoco declara las ganancias del año.",
    },
    {
      id: "model-714-valuations",
      title: "Reglas de valoración",
      cards: [
        { title: "Inmuebles", paragraphs: ["Se utiliza el mayor de los valores previstos por la Ley: catastral, comprobado por la Administración o precio, contraprestación o valor de adquisición."] },
        { title: "Cuentas y depósitos", paragraphs: ["Se compara el saldo a 31 de diciembre con el saldo medio del último trimestre conforme a la norma."] },
        { title: "Valores y participaciones", paragraphs: ["Los cotizados y no cotizados usan reglas distintas, que pueden atender a cotización media, auditoría, valor teórico o capitalización de beneficios."] },
        { title: "Seguros, rentas y otros bienes", paragraphs: ["Se aplican valor de rescate, capitalización o valor de mercado según la categoría. Las instrucciones anuales concretan el tratamiento de las criptomonedas."] },
      ],
      note: "No debe utilizarse el mismo criterio de valoración para todos los activos.",
    },
    {
      id: "model-714-debts",
      title: "Deudas deducibles",
      cards: [
        { title: "Requisitos", bullets: ["Existir a 31 de diciembre.", "Estar debidamente justificadas.", "Valorarse por su nominal.", "Respetar las limitaciones respecto de bienes exentos y obligación real."] },
        { title: "No se deduce automáticamente", bullets: ["Una garantía que aún no genera obligación real.", "Una deuda ya pagada.", "Un importe estimado sin documentación.", "La deuda vinculada a un bien exento sin revisar la limitación legal."] },
      ],
    },
    {
      id: "model-714-preparation",
      title: "Qué documentación preparar",
      cards: [
        { title: "Patrimonio y residencia", bullets: ["Declaración anterior y Renta.", "Residencia autonómica.", "Inmuebles y valores fiscales.", "Cuentas, inversiones, fondos y seguros.", "Criptomonedas y bienes extranjeros."] },
        { title: "Actividad, exenciones y deudas", bullets: ["Balances y documentación de participaciones.", "Funciones de dirección y remuneración.", "Afectación de bienes empresariales.", "Préstamos, hipotecas y acreedores.", "Impuestos patrimoniales satisfechos en el extranjero."] },
      ],
    },
    {
      id: "model-714-filing",
      title: "Plazo, presentación, pago y correcciones",
      cards: [
        { title: "Plazo anual", paragraphs: ["Coincide con la campaña de la Renta de cada año. Las fechas y la domiciliación deben obtenerse de la campaña vigente."] },
        { title: "Presentación electrónica", paragraphs: ["Es obligatoria por internet mediante el formulario del Modelo 714, con certificado, Cl@ve Móvil, número de referencia o eIDAS."] },
        { title: "Pago", paragraphs: ["Las opciones pueden incluir domiciliación, Número de Referencia Completo (NRC), cargo en cuenta, tarjeta o reconocimiento de deuda, según la campaña."] },
        { title: "Correcciones", paragraphs: ["Debe utilizarse el procedimiento vigente de Patrimonio, distinguiendo errores que aumentan la cuota de los que perjudican al contribuyente."] },
      ],
      note: "Una simulación o borrador no constituye una presentación.",
    },
    {
      id: "model-714-mistakes",
      title: "Errores habituales",
      cards: [
        { title: "Obligación", bullets: ["Confundir 2.000.000 € con el mínimo exento.", "Restar deudas o excluir bienes exentos del límite bruto.", "Pensar que cuota cero evita siempre presentar."] },
        { title: "Normativa", bullets: ["Aplicar siempre 700.000 € sin revisar la comunidad.", "Usar escala o bonificación de otro territorio o ejercicio.", "Creer que toda la vivienda está exenta."] },
        { title: "Actividad", bullets: ["Marcar como exento cualquier bien empresarial.", "Considerar exentas todas las participaciones de una sociedad.", "No revisar entidad patrimonial ni activos necesarios."] },
        { title: "Activos y deudas", bullets: ["Omitir bienes extranjeros o criptomonedas.", "Usar un único criterio de valoración.", "Deducir deudas sin justificar.", "Pensar que el 720 sustituye Patrimonio."] },
      ],
    },
  ],
  fillingTitle: "Cómo preparar el Modelo 714",
  fillingSteps: [
    { title: "1. Identificación y residencia", paragraphs: ["Revisa Número de Identificación Fiscal (NIF), comunidad autónoma, obligación personal o real y fecha de devengo."] },
    { title: "2. Inventario y exenciones", paragraphs: ["Clasifica bienes exentos y no exentos sin prometer una exención por su nombre o uso aparente."] },
    { title: "3. Inmuebles y actividad", paragraphs: ["Aplica las reglas fiscales de valoración y documenta afectación y necesidad."] },
    { title: "4. Valores y participaciones", paragraphs: ["Distingue cotizados, no cotizados, fondos y la parte potencialmente exenta."] },
    { title: "5. Seguros, rentas y otros bienes", paragraphs: ["Incluye vehículos, joyas, arte, criptomonedas y derechos con su criterio aplicable."] },
    { title: "6. Deudas", paragraphs: ["Registra acreedor, importe, documentación y relación con bienes exentos o no exentos."] },
    { title: "7. Base y mínimo", paragraphs: ["Determina patrimonio neto y aplica el mínimo de la comunidad o, en su defecto, el estatal."] },
    { title: "8. Cuota", paragraphs: ["Aplica escala autonómica, límite conjunto con IRPF, deducciones, bonificaciones e impuestos extranjeros."] },
    { title: "9. Revisa la segunda causa", paragraphs: ["Aunque no haya cuota, comprueba si los bienes y derechos brutos superan 2.000.000 euros."] },
    { title: "10. Presenta electrónicamente", paragraphs: ["Firma en la sede oficial, elige la modalidad de pago y conserva el Código Seguro de Verificación (CSV)."] },
  ],
  afterTitle: "Qué ocurre después",
  afterSteps: [
    { title: "Conserva las valoraciones", description: "Guarda certificados, balances, extractos y pruebas de exenciones y deudas." },
    { title: "Concilia Renta", description: "Revisa el límite conjunto y la coherencia con la declaración anual del IRPF." },
    { title: "Revisa otros modelos", description: "Comprueba 720, 721 y 718 por separado, sin asumir sustituciones." },
  ],
  comparison: {
    title: "Modelo 714 y Modelo 718",
    current: { title: "Modelo 714", description: "Impuesto sobre el Patrimonio cedido a las comunidades autónomas; puede obligar por cuota o por valor bruto." },
    related: { title: "Modelo 718", description: "Impuesto estatal complementario; solo se presenta cuando la cuota final resulta a ingresar.", href: "/consultor-fiscal/modelos/718", label: "Ver Modelo 718" },
    additional: [
      { title: "Modelo 720", description: "Información sobre determinados bienes y derechos en el extranjero.", href: "/consultor-fiscal/modelos/720", label: "Ver Modelo 720" },
      { title: "Modelo 721", description: "Información sobre determinadas monedas virtuales custodiadas en el extranjero.", href: "/consultor-fiscal/modelos/721", label: "Ver Modelo 721" },
    ],
    conclusion: "Puede ser necesario presentar Patrimonio, Grandes Fortunas y declaraciones informativas para un mismo conjunto de activos.",
  },
  pdfNotice: ["El Modelo 714 se presenta mediante el servicio electrónico de la campaña vigente. Un cálculo previo o documento guardado no acredita la presentación."],
  documents: [],
  officialLinks: [
    { label: "Ficha oficial del procedimiento", sourceId: "aeat.model-714.procedure-record.2026-07-14" },
    { label: "Información oficial del Impuesto sobre el Patrimonio", sourceId: "aeat.model-714.information.2026-07-13" },
    { label: "Manual práctico de Patrimonio", sourceId: "aeat.model-714.manual-2025.2026-07-14" },
    { label: "Cómo se presenta electrónicamente", href: "https://sede.agenciatributaria.gob.es/Sede/declaraciones-informativas-otros-impuestos-tasas/impuesto-sobre-patrimonio/se-presenta-declaracion-impuesto-sobre-patrimonio.html" },
  ],
  legalLinks: [
    { label: "Ley 19/1991 del Impuesto sobre el Patrimonio", sourceId: "boe.law-19-1991.consolidated.2026-07-14" },
    { label: "Orden de la campaña de Patrimonio 2025", sourceId: "boe.order-hac-277-2026.consolidated.2026-07-14" },
  ],
  faq: [
    { question: "¿Todos los autónomos presentan el Modelo 714?", answer: "No. La condición de autónomo no genera por sí sola la obligación." },
    { question: "¿Cuál es el mínimo exento?", answer: "El estatal general es 700.000 euros cuando la comunidad autónoma no ha establecido otro." },
    { question: "¿Qué significa el límite de 2.000.000 de euros?", answer: "Puede obligar a presentar aunque no resulte cuota a ingresar." },
    { question: "¿Para ese límite se restan las deudas?", answer: "No. Se comprueba el valor bruto de bienes y derechos sin cargas ni deudas." },
    { question: "¿Se incluyen los bienes exentos en el límite bruto?", answer: "Sí, para comprobar los 2.000.000 de euros." },
    { question: "¿La vivienda habitual está exenta?", answer: "Existe una exención general de hasta 300.000 euros por contribuyente, con los requisitos aplicables." },
    { question: "¿Los bienes del negocio están exentos?", answer: "Solo cuando cumplen los requisitos de actividad, necesidad, afectación y principal fuente de renta." },
    { question: "¿Las participaciones de mi sociedad están exentas?", answer: "No automáticamente; deben cumplirse los requisitos de participación, actividad, dirección y remuneración, entre otros." },
    { question: "¿Se incluyen bienes en el extranjero?", answer: "Sí en obligación personal, sin perjuicio de convenios y deducciones aplicables." },
    { question: "¿Se incluyen criptomonedas en autocustodia?", answer: "Pueden formar parte del patrimonio aunque no entren en el Modelo 721." },
    { question: "¿Cuándo se presenta?", answer: "Durante el mismo plazo que la declaración anual de la Renta." },
    { question: "¿Se puede presentar en papel?", answer: "No. La AEAT exige presentación electrónica por internet." },
  ],
  sourceIds: [
    "aeat.model-714.procedure-home.2026-07-14",
    "aeat.model-714.procedure-record.2026-07-14",
    "aeat.model-714.information.2026-07-13",
    "aeat.model-714.manual-2025.2026-07-14",
    "boe.law-19-1991.consolidated.2026-07-14",
    "boe.order-hac-277-2026.consolidated.2026-07-14",
  ],
} as const satisfies FiscalModelPracticalGuideV1;
