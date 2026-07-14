import type { FiscalModelPracticalGuideV1 } from "./fiscal-model-practical-guide.types";

export const MODEL_130_GUIDE_V1 = {
  code: "130",
  lastVerifiedAt: "2026-07-14",
  intro: [
    "El Modelo 130 es el pago fraccionado trimestral del IRPF para actividades económicas cuyo rendimiento se determina en estimación directa.",
    "Es un adelanto: no es la declaración definitiva de la Renta. Los pagos y retenciones se descuentan cuando se calcula el IRPF anual.",
  ],
  notices: [
    { title: "El cálculo ordinario es acumulado desde enero", paragraphs: ["No se utilizan únicamente los ingresos y gastos de los tres meses: se toma el periodo desde el 1 de enero hasta el final del trimestre."] },
    { title: "Regla del 70 % para actividades profesionales", paragraphs: ["Puede no existir obligación cuando, en el año anterior, al menos el 70 % de los ingresos de la actividad profesional estuvieron sometidos a retención. No se extiende automáticamente a cualquier actividad empresarial."] },
  ],
  actions: [
    { label: "Presentar el Modelo 130 y acceder a Pre130", sourceId: "aeat.model-130.procedure-home.2026-06-09", primary: true },
    { label: "Consultar cálculo y plazos oficiales", href: "https://sede.agenciatributaria.gob.es/Sede/irpf/retenciones-ingresos-cuenta-pagos-fraccionados/pagos-fraccionados.html", primary: true },
    { label: "Generar una predeclaración", sourceId: "aeat.model-130.paper-help.2026-04-01" },
    { label: "Consultar estimación directa simplificada", href: "https://sede.agenciatributaria.gob.es/Sede/irpf/empresarios-individuales-profesionales/regimenes-determinar-rendimiento-actividad/estimacion-directa-simplificada.html" },
    { label: "Consultar rectificación de autoliquidaciones", href: "https://sede.agenciatributaria.gob.es/Sede/procedimientos/GZ28.shtml" },
  ],
  quickSummaryTitle: "El Modelo 130 en pocas palabras",
  quickFacts: [
    { label: "Qué es", value: "Un pago fraccionado a cuenta del IRPF." },
    { label: "Quién", value: "Personas físicas con actividades en estimación directa normal o simplificada, salvo excepciones." },
    { label: "Periodicidad", value: "Trimestral." },
    { label: "Presentación", value: "Electrónica con Cl@ve, certificado o DNI electrónico; cuando proceda, también mediante predeclaración oficial por el canal admitido." },
    { label: "Cálculo habitual", value: "20 % del rendimiento neto acumulado, descontando pagos y retenciones aplicables." },
    { label: "Actividades agrarias y pesqueras", value: "Tienen un cálculo específico basado, con carácter general, en los ingresos del trimestre." },
    { label: "Resultado negativo", value: "Debe presentarse igualmente si existe obligación; no genera devolución trimestral." },
  ],
  sections: [
    {
      id: "model-130-who",
      title: "Quién debe presentarlo",
      intro: ["Con carácter general, las personas físicas que desarrollan actividades económicas en estimación directa normal o simplificada."],
      cards: [
        { title: "Casos habituales", bullets: ["Autónomo empresarial en estimación directa.", "Profesional cuyas facturas no están suficientemente sometidas a retención.", "Comercio o servicios en estimación directa.", "Actividad agrícola, ganadera, forestal o pesquera en estimación directa cuando exista obligación."] },
        { title: "Atribución de rentas", paragraphs: ["En comunidades de bienes y otras entidades en atribución, cada socio, comunero o partícipe realiza el pago según su participación en el beneficio."] },
      ],
    },
    {
      id: "model-130-seventy",
      title: "La regla del 70 %",
      cards: [
        { title: "Actividades profesionales", paragraphs: ["No realizan pagos fraccionados por esa actividad cuando al menos el 70 % de los ingresos del año anterior estuvieron sometidos a retención o ingreso a cuenta. En el inicio se usa el porcentaje del periodo."] },
        { title: "Actividades agrícolas, ganaderas y forestales", paragraphs: ["Existe una excepción semejante, excluyendo del cálculo subvenciones corrientes, subvenciones de capital e indemnizaciones. No debe extenderse a actividades no citadas por la regla oficial."] },
      ],
      note: "Un profesional que factura principalmente a empresas con retención puede quedar fuera si alcanza el porcentaje. Una actividad empresarial no queda fuera solo por tener algunas facturas con retención.",
    },
    {
      id: "model-130-methods",
      title: "Estimación directa normal y simplificada",
      cards: [
        { title: "Normal", paragraphs: ["El rendimiento se obtiene por diferencia entre ingresos y gastos deducibles, aplicando las reglas correspondientes."] },
        { title: "Simplificada", paragraphs: ["Utiliza reglas simplificadas de amortización y contempla provisiones y gastos de difícil justificación. Con carácter general, estos últimos son el 5 % del rendimiento neto positivo previo, con límite anual de 2.000 €, sujeto a revisión normativa."] },
      ],
      note: "El 5 % no es una deducción adicional aplicable a todos los autónomos.",
    },
    {
      id: "model-130-calculation",
      title: "Cómo se calcula en actividades ordinarias",
      cards: [
        { title: "Rendimiento acumulado", bullets: ["Suma ingresos desde el 1 de enero.", "Resta gastos deducibles acumulados.", "Incluye amortizaciones y ajustes.", "Obtén el rendimiento neto acumulado."] },
        { title: "Pago del trimestre", bullets: ["Aplica, con carácter general, el 20 %.", "Resta pagos positivos anteriores del mismo año.", "Resta retenciones acumuladas.", "Aplica minoraciones o deducciones específicas cuando procedan."] },
      ],
      note: "Ejemplo simplificado de 1T: 15.000 € de ingresos menos 9.000 € de gastos = 6.000 €; el 20 % son 1.200 € y, con 300 € de retenciones, quedarían 900 €. En 2T se recalcula desde enero y se descuentan el pago anterior y las retenciones acumuladas.",
    },
    {
      id: "model-130-agrarian",
      title: "Actividades agrícolas, ganaderas, forestales y pesqueras",
      intro: ["Con carácter general, el pago es el 2 % de los ingresos del trimestre, incluidas subvenciones corrientes y excluidas subvenciones de capital e indemnizaciones."],
      note: "Después se restan las retenciones del trimestre y las minoraciones que procedan. Este bloque no utiliza el mismo cálculo acumulado de las actividades ordinarias.",
    },
    {
      id: "model-130-records",
      title: "Ingresos, gastos y retenciones",
      cards: [
        { title: "Datos de los libros", bullets: ["Ventas y prestaciones de servicios.", "Autoconsumos, subvenciones y otros ingresos.", "Compras, suministros, Seguridad Social, salarios, alquiler, reparaciones y servicios.", "Amortizaciones y otros gastos vinculados cuando sean deducibles."] },
        { title: "Retenciones soportadas", paragraphs: ["Las retenciones de tus facturas son pagos a cuenta ingresados por tus clientes y se descuentan para no adelantar dos veces la misma parte del impuesto."] },
      ],
      note: "No confundas esas retenciones con las que tú ingresas por otras personas mediante los Modelos 111 o 115. Pagar un gasto desde una cuenta profesional tampoco basta para hacerlo deducible.",
    },
    {
      id: "model-130-negative",
      title: "Resultado negativo y declaración anual",
      cards: [
        { title: "Declaración negativa", paragraphs: ["Si existe obligación, se presenta aunque no resulte cantidad a ingresar. Un resultado negativo de los primeros trimestres puede reducir pagos positivos posteriores del mismo año en los términos del modelo."] },
        { title: "Renta anual", paragraphs: ["El 130 no devuelve directamente el saldo negativo. La Renta calcula el impuesto definitivo con todas las rentas, circunstancias personales, retenciones y pagos fraccionados."] },
      ],
    },
    {
      id: "model-130-quarterly",
      title: "Plazos trimestrales",
      cards: [
        { title: "Primer a tercer trimestre", bullets: ["1T: del 1 al 20 de abril.", "2T: del 1 al 20 de julio.", "3T: del 1 al 20 de octubre."] },
        { title: "Cuarto trimestre", bullets: ["Del 1 al 30 de enero del año siguiente.", "Si vence en inhábil, finaliza el primer día hábil siguiente."] },
      ],
      note: "La domiciliación puede terminar antes que el plazo general. Consulta el calendario oficial del ejercicio.",
    },
    {
      id: "model-130-correction",
      title: "Cómo corregir un error",
      intro: ["El procedimiento depende del efecto del error y del periodo."],
      cards: [
        { title: "Mayor ingreso o menor devolución", paragraphs: ["Puede ser necesaria una autoliquidación complementaria del mismo periodo."] },
        { title: "Perjuicio para el contribuyente", paragraphs: ["Debe utilizarse el procedimiento de rectificación aplicable. No se copia el sistema especial de rectificativas del 303."] },
      ],
    },
    {
      id: "model-130-territory",
      title: "Ámbito territorial",
      note: "Esta guía se refiere a la AEAT estatal y al territorio común. En Canarias existen particularidades indirectas; en Ceuta y Melilla, el IPSI; y en País Vasco o Navarra la presentación puede corresponder a la Hacienda foral competente.",
    },
    {
      id: "model-130-mistakes",
      title: "Errores habituales",
      cards: [
        { title: "Cálculo", bullets: ["Usar solo los tres meses.", "No restar pagos anteriores o retenciones.", "Aplicar la excepción profesional a una actividad empresarial.", "Mezclar el cálculo ordinario con el agrario.", "Aplicar gastos de difícil justificación fuera de la modalidad simplificada."] },
        { title: "Presentación", bullets: ["No presentar porque sale negativo.", "Confundirlo con la Renta anual.", "Creer que una predeclaración descargada ya está presentada.", "No actualizar las obligaciones en el Modelo 036."] },
      ],
    },
  ],
  fillingTitle: "Cómo prepararlo y presentarlo",
  fillingSteps: [
    { title: "1. Identifica método y periodo", paragraphs: ["Confirma que la actividad está en estimación directa y que existe obligación censal."] },
    { title: "2. Acumula ingresos y gastos", paragraphs: ["Para actividades ordinarias toma los datos desde enero y revisa amortizaciones y ajustes."] },
    { title: "3. Resta pagos y retenciones", paragraphs: ["Descuenta los pagos anteriores del año y las retenciones acumuladas que correspondan."] },
    { title: "4. Revisa el resultado", paragraphs: ["Selecciona ingreso o declaración negativa. Las opciones de deuda o aplazamiento no garantizan su concesión."] },
    { title: "5. Identificación, firma o predeclaración", paragraphs: ["La vía electrónica utiliza Cl@ve, certificado o DNI electrónico según el acceso admitido y termina con firma y justificante. El PDF de predeclaración debe imprimirse, firmarse y entregarse por el canal admitido."] },
  ],
  afterTitle: "Qué ocurre después",
  afterSteps: [
    { title: "Pago a cuenta", description: "El importe se tendrá en cuenta en la declaración anual de la Renta." },
    { title: "Saldo negativo", description: "No se devuelve mediante el 130; puede afectar a pagos posteriores del mismo ejercicio." },
    { title: "Justificante", description: "Conserva el registro electrónico o la acreditación de la predeclaración presentada." },
  ],
  comparison: {
    title: "¿Qué está declarando el autónomo?",
    current: { title: "Modelo 130", description: "Adelanta IRPF en estimación directa, basado principalmente en ingresos y gastos reales." },
    related: { title: "Modelo 131", description: "Adelanta IRPF en estimación objetiva mediante módulos.", href: "/consultor-fiscal/modelos/131", label: "Ver Modelo 131" },
    additional: [
      { title: "Modelo 303", description: "Declara el IVA y puede coexistir con el 130.", href: "/consultor-fiscal/modelos/303", label: "Ver Modelo 303" },
      { title: "Modelo 036", description: "Recoge el método y las obligaciones censales.", href: "/consultor-fiscal/modelos/036", label: "Ver Modelo 036" },
    ],
    conclusion: "130 y 131 corresponden a métodos distintos. Normalmente se usa uno por actividad, aunque situaciones con varias actividades exigen revisar el caso y el censo.",
  },
  pdfNotice: ["Descargar el PDF de predeclaración no equivale a presentar. Debe completarse el trámite por los canales admitidos y conservarse el justificante."],
  documents: [],
  officialLinks: [
    { label: "Ayuda técnica del Modelo 130", sourceId: "aeat.model-130.help.2026-06-19" },
    { label: "Ayuda para usar datos anteriores", sourceId: "aeat.model-130.previous-help.2026-04-01" },
    { label: "Ficha administrativa del procedimiento", sourceId: "aeat.model-130.procedure-record.2026-06-09" },
    { label: "Importe de los pagos fraccionados", href: "https://sede.agenciatributaria.gob.es/Sede/irpf/retenciones-ingresos-cuenta-pagos-fraccionados/pagos-fraccionados/importe-pagos-fraccionados.html" },
  ],
  legalLinks: [
    { label: "Orden EHA/672/2007", sourceId: "boe.order-eha-672-2007.models-130-131" },
    { label: "Ley 35/2006 del IRPF", href: "https://www.boe.es/buscar/act.php?id=BOE-A-2006-20764" },
    { label: "Reglamento del IRPF", href: "https://www.boe.es/buscar/act.php?id=BOE-A-2007-6820" },
  ],
  faq: [
    { question: "¿Todos los autónomos en estimación directa presentan el 130?", answer: "No. Determinadas actividades profesionales pueden quedar fuera cuando al menos el 70 % de sus ingresos están sometidos a retención." },
    { question: "¿Se calcula solo con el trimestre?", answer: "No en las actividades ordinarias: se usan datos acumulados desde el 1 de enero." },
    { question: "¿Cuál es el porcentaje general?", answer: "El 20 % del rendimiento neto positivo acumulado, antes de pagos, retenciones y otros ajustes." },
    { question: "¿Qué ocurre si sale negativo?", answer: "Se presenta si existe obligación y puede reducir pagos posteriores del mismo ejercicio en los términos del modelo." },
    { question: "¿Hacienda devuelve el resultado negativo?", answer: "No mediante el 130. La regularización final se hace en la Renta." },
    { question: "¿Qué ocurre con las retenciones de mis facturas?", answer: "Se descuentan en el cálculo y se tienen en cuenta en la Renta." },
    { question: "¿Es la declaración de la Renta?", answer: "No. Es un adelanto trimestral." },
    { question: "¿Puedo presentarlo en papel?", answer: "Cuando no exista obligación electrónica, puede utilizarse la predeclaración oficial y entregarse por los canales admitidos." },
    { question: "¿Puede presentarlo mi asesor?", answer: "Sí, mediante colaboración social, representación o apoderamiento." },
    { question: "¿Un negativo del cuarto trimestre pasa al año siguiente?", answer: "No se traslada como tal a los 130 del siguiente año; se regulariza en la Renta." },
  ],
  sourceIds: [
    "aeat.model-130.procedure-home.2026-06-09",
    "aeat.model-130.procedure-record.2026-06-09",
    "aeat.model-130.help.2026-06-19",
    "aeat.model-130.paper-help.2026-04-01",
    "aeat.model-130.previous-help.2026-04-01",
    "boe.order-eha-672-2007.models-130-131",
  ],
} as const satisfies FiscalModelPracticalGuideV1;
