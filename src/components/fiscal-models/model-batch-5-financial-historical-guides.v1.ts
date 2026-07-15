import { createBatch5PracticalGuideV1 } from "./create-batch-5-practical-guide.v1";

const CATEGORY = "Tributos patrimoniales, tasas y obligaciones sectoriales";
const FINANCIAL_LEGAL = [
  "boe.law-7-2024.final-provision-9.2026-07-14",
  "boe.order-hac-532-2025.consolidated.2026-07-14",
] as const;

export const MODEL_780_GUIDE_V1 = createBatch5PracticalGuideV1({
  code: "780",
  category: CATEGORY,
  statusLabel: "Impuesto financiero vigente · anual",
  statusTone: "current",
  effectiveYear: 2024,
  intro: [
    "El Modelo 780 autoliquida anualmente el impuesto vigente sobre el margen de intereses y comisiones de determinadas entidades de crédito, establecimientos financieros y sucursales españolas.",
    "Es una figura de la Ley 7/2024 distinta del gravamen temporal histórico del 797; no se presenta si la base liquidable no es positiva.",
  ],
  notices: [
    {
      title: "Cálculo financiero y territorial especializado",
      paragraphs: [
        "La reducción general de 100 millones, la escala, la minoración, la rentabilidad sobre activos, la deducción extraordinaria, los grupos fiscales y la tributación foral impiden una calculadora simplificada.",
      ],
    },
  ],
  type: "Autoliquidación anual",
  presenter:
    "Entidades de crédito, establecimientos financieros de crédito y sucursales españolas de entidades extranjeras incluidas por la Ley 7/2024.",
  nonPresenter:
    "Clientes bancarios, empresas ordinarias y entidades cuya base liquidable no sea positiva.",
  periodicity: "Anual; periodo 0A.",
  deadline:
    "Primeros 20 días del noveno mes posterior al cierre. Si coincide con el año natural: 1–20 de septiembre; domiciliación 1–15 de septiembre.",
  channel:
    "Presentación electrónica con certificado, cálculo individual y distribución territorial común/foral cuando corresponda.",
  result:
    "A ingresar, devolver o cero, tras deducir el pago fraccionado 781 y aplicar compensaciones/reglas vigentes.",
  included: [
    "Margen de intereses e ingresos/gastos por comisiones de la actividad española.",
    "Reducción de 100 millones prorrateable, escala progresiva y minoración del 25 % de IS/IRNR.",
    "Rentabilidad sobre activos, deducción extraordinaria, pago 781 y reparto territorial.",
  ],
  excluded: [
    "Gravamen temporal histórico 797/798.",
    "Cualquier entidad no incluida.",
    "Presentación con base liquidable no positiva.",
  ],
  preparation: [
    "Cuentas y ajustes del margen/comisiones en España.",
    "Base individual/grupo fiscal, IS/IRNR y activos.",
    "Pago 781, porcentajes estatal/forales y compensaciones.",
  ],
  commonMistakes: [
    "Confundirlo con el 797.",
    "Presentar con base liquidable no positiva.",
    "Omitir el pago 781 o reparto territorial.",
  ],
  correction:
    "Presenta complementaria si aumenta la cuota o solicita rectificación/devolución si disminuye, conservando cálculos, grupo fiscal y reparto territorial.",
  procedureSourceId: "aeat.model-780.procedure-home.2026-07-14",
  recordSourceId: "aeat.model-780.procedure-record.2026-07-14",
  helpSourceId: "aeat.model-780.instructions.2026-07-14",
  legalSourceIds: [...FINANCIAL_LEGAL],
  related: [
    {
      code: "781",
      href: "/consultor-fiscal/modelos/781",
      description:
        "Pago fraccionado del 40 % que se deduce en la autoliquidación anual.",
    },
    {
      code: "797",
      href: "/consultor-fiscal/modelos/797",
      description: "Gravamen temporal histórico, jurídicamente distinto.",
    },
    {
      code: "798",
      href: "/consultor-fiscal/modelos/798",
      description: "Pago anticipado histórico del gravamen anterior.",
    },
    {
      code: "200",
      href: "/consultor-fiscal/modelos/200",
      description: "Impuesto sobre Sociedades relacionado con la minoración.",
    },
    {
      code: "220",
      href: "/consultor-fiscal/modelos/220",
      description: "Consolidación fiscal de Sociedades.",
    },
  ],
  specificFaq: [
    {
      question: "¿Cuándo no se presenta?",
      answer:
        "Cuando la base liquidable no es positiva, según las instrucciones oficiales.",
    },
    {
      question: "¿Qué plazo tiene una entidad con año natural?",
      answer:
        "Del 1 al 20 de septiembre; la domiciliación ordinaria termina el día 15.",
    },
    {
      question: "¿Es lo mismo que el Modelo 797?",
      answer:
        "No. El 797 fue un gravamen temporal histórico; el 780 pertenece al impuesto vigente de la Ley 7/2024.",
    },
  ],
});

export const MODEL_781_GUIDE_V1 = createBatch5PracticalGuideV1({
  code: "781",
  category: CATEGORY,
  statusLabel: "Impuesto financiero vigente · pago fraccionado",
  statusTone: "current",
  effectiveYear: 2024,
  intro: [
    "El Modelo 781 adelanta el 40 % de la cuota resultante del impuesto sobre el margen de intereses y comisiones de determinadas entidades financieras.",
    "No se presenta si la cuota líquida no es positiva y se deduce después en el Modelo 780.",
  ],
  notices: [
    {
      title: "No es el pago histórico 798",
      paragraphs: [
        "Este modelo forma parte del impuesto vigente de la Ley 7/2024. La base, reducción, escala, minoración, deducción extraordinaria y territorio se calculan con sus reglas actuales.",
      ],
    },
  ],
  type: "Pago fraccionado",
  presenter:
    "Las entidades financieras incluidas en el impuesto cuando su cuota líquida sea positiva.",
  nonPresenter:
    "Clientes, empresas ordinarias o entidades con cuota líquida no positiva.",
  periodicity: "Un pago fraccionado por periodo impositivo; clave 0A.",
  deadline:
    "Primeros 20 días del segundo mes posterior al cierre. Año natural: 1–20 de febrero; domiciliación 1–15 de febrero.",
  channel:
    "Presentación electrónica e ingreso, con distribución territorial cuando tribute a varias Administraciones.",
  result:
    "Ingreso del 40 % de la cuota resultante, deducible en el Modelo 780.",
  included: [
    "Margen/comisiones, reducción de 100 millones y escala.",
    "Minoración del 25 %, rentabilidad sobre activos y deducción extraordinaria.",
    "Porcentaje del 40 % y reparto territorial.",
  ],
  excluded: [
    "Pago anticipado histórico 798.",
    "Presentación con cuota líquida no positiva.",
    "Liquidación anual final, que corresponde al 780.",
  ],
  preparation: [
    "Cálculo del impuesto y cuota líquida.",
    "Rentabilidad/activos y deducción extraordinaria.",
    "Porcentajes territorial común/foral y medio de pago.",
  ],
  commonMistakes: [
    "Aplicar 40 % a una base sin completar ajustes.",
    "Presentar con cuota no positiva.",
    "Confundirlo con 798.",
  ],
  correction:
    "Regulariza electrónicamente el pago y conserva el importe definitivo para su correcta deducción en el 780.",
  procedureSourceId: "aeat.model-781.procedure-home.2026-07-14",
  recordSourceId: "aeat.model-781.procedure-record.2026-07-14",
  helpSourceId: "aeat.model-781.instructions.2026-07-14",
  legalSourceIds: [...FINANCIAL_LEGAL],
  related: [
    {
      code: "780",
      href: "/consultor-fiscal/modelos/780",
      description: "Autoliquidación anual en la que se deduce este pago.",
    },
    {
      code: "797",
      href: "/consultor-fiscal/modelos/797",
      description: "Gravamen temporal histórico.",
    },
    {
      code: "798",
      href: "/consultor-fiscal/modelos/798",
      description: "Pago anticipado del gravamen histórico, distinto del 781.",
    },
  ],
  specificFaq: [
    {
      question: "¿Cuál es el porcentaje?",
      answer:
        "El 40 % de la cuota resultante después de aplicar las reglas del impuesto.",
    },
    {
      question: "¿Cuándo no se presenta?",
      answer: "Cuando la cuota líquida no es positiva.",
    },
    {
      question: "¿Cuál es el plazo para año natural?",
      answer: "Del 1 al 20 de febrero; domiciliación del 1 al 15.",
    },
  ],
});

export const MODEL_791_GUIDE_V1 = createBatch5PracticalGuideV1({
  code: "791",
  category: CATEGORY,
  statusLabel: "Procedimiento no tributario",
  statusTone: "auxiliary",
  intro: [
    "El Modelo 791 es la solicitud electrónica de admisión a determinados procesos selectivos de la Agencia Tributaria e incorpora, cuando corresponde, la tasa de examen.",
    "No es una declaración fiscal ni sirve para cualquier oposición: cada convocatoria fija cuerpo, especialidad, plazo, importe, exenciones y documentos.",
  ],
  notices: [
    {
      title: "Pagar la tasa no equivale a presentar la solicitud",
      paragraphs: [
        "La inscripción debe quedar registrada electrónicamente y conservarse el justificante. La lista provisional y la convocatoria determinan admisión, exclusión y subsanación.",
      ],
    },
  ],
  type: "Solicitud de empleo público y tasa de examen",
  presenter:
    "La persona aspirante a un proceso selectivo de cuerpos adscritos a la AEAT incluido en la convocatoria.",
  nonPresenter:
    "Quien participa en otra oposición, no cumple la convocatoria o solo desea pagar una tasa sin registrar solicitud.",
  periodicity: "Por cada convocatoria y solicitud.",
  deadline: "El plazo exacto que establezca cada convocatoria.",
  channel:
    "Inscripción electrónica, pago o acreditación de exención/reducción y registro de la solicitud.",
  result:
    "Solicitud registrada; la admisión se comprueba después en las listas del proceso y puede requerir subsanación.",
  included: [
    "Cuerpo, especialidad, turno, cupo, provincia y titulación.",
    "Tasa, exención/reducción y justificantes.",
    "Registro electrónico, listas y subsanación.",
  ],
  excluded: [
    "Cualquier oposición de la Administración.",
    "Una declaración tributaria.",
    "Admisión automática por haber pagado.",
  ],
  preparation: [
    "Convocatoria, cuerpo, especialidad, turno y plazo.",
    "Titulación, cupo y provincia de examen.",
    "Justificantes de desempleo, familia numerosa, discapacidad, terrorismo u otra exención.",
  ],
  commonMistakes: [
    "Pagar sin registrar la instancia.",
    "Usar una convocatoria distinta.",
    "Duplicar solicitudes sin revisar las reglas.",
  ],
  correction:
    "Sigue el procedimiento de subsanación o nueva solicitud de la convocatoria; una tasa indebidamente pagada requiere su devolución específica.",
  procedureSourceId: "aeat.model-791.procedure-home.2026-07-14",
  recordSourceId: "aeat.model-791.procedure-record.2026-07-14",
  helpSourceId: "aeat.model-791.completion-help.2026-07-14",
  document: {
    label: "Guía oficial de presentación del Modelo 791",
    sourceId: "aeat.model-791.guide-pdf.2023-09",
  },
  additionalOfficialLinks: [
    {
      label: "Preguntas frecuentes oficiales",
      sourceId: "aeat.model-791.faq-pdf.2024-02",
    },
  ],
  legalSourceIds: ["boe.order-employment-1998.consolidated.2026-07-14"],
  related: [],
  specificFaq: [
    {
      question: "¿Sirve para cualquier oposición?",
      answer:
        "No. Solo para procesos selectivos concretos de la AEAT que indiquen este procedimiento.",
    },
    {
      question: "¿Pagar significa estar inscrito?",
      answer:
        "No. La solicitud debe registrarse y la admisión se confirma en las listas del proceso.",
    },
    {
      question: "¿Cuánto cuesta?",
      answer:
        "El importe, exenciones y reducciones los fija la convocatoria concreta.",
    },
  ],
});

const AUDIOVISUAL_LEGAL = [
  "boe.order-hfp-309-2023.consolidated.2026-07-14",
] as const;

export const MODEL_792_GUIDE_V1 = createBatch5PracticalGuideV1({
  code: "792",
  category: CATEGORY,
  statusLabel: "Aportación audiovisual · anual",
  statusTone: "current",
  effectiveYear: 2023,
  intro: [
    "El Modelo 792 autoliquida anualmente la aportación a RTVE de determinados prestadores audiovisuales televisivos y plataformas de ámbito estatal o superior al autonómico.",
    "No lo presenta cualquier creador o canal de internet; debe existir la condición legal de prestador y se descuentan los tres pagos 793.",
  ],
  notices: [
    {
      title: "Categoría, ingresos y exenciones deben verificarse",
      paragraphs: [
        "La televisión lineal en abierto aplica 3 %; acceso condicional, televisión a petición y plataformas incluidas aplican 1,5 %. Puede existir una deducción del 15 % por determinadas coproducciones con RTVE.",
      ],
    },
  ],
  type: "Autoliquidación anual",
  presenter:
    "Prestadores audiovisuales televisivos y de intercambio de vídeos legalmente incluidos, de ámbito estatal o superior al autonómico.",
  nonPresenter:
    "Cualquier creador, canal, empresa digital o prestador exento/no incluido por ese solo hecho.",
  periodicity: "Anual; devengo el 31 de diciembre o al perder la habilitación.",
  deadline: "Durante el mes de febrero posterior al ejercicio de devengo.",
  channel: "Presentación electrónica, descontando pagos 1P, 2P y 3P del 793.",
  result:
    "A ingresar, devolver, compensar o cero, tras pagos a cuenta y compensaciones.",
  included: [
    "Ingresos brutos de explotación facturados por categorías incluidas.",
    "Tipos 3 % y 1,5 % según servicio.",
    "Deducción del 15 % por coproducciones admitidas y pagos 793.",
  ],
  excluded: [
    "Cualquier creador o plataforma no incluida.",
    "Comunicación censal que corresponde a la autoridad audiovisual.",
    "Ingresos legalmente excluidos o prestadores exentos.",
  ],
  preparation: [
    "Habilitación y categoría de servicio.",
    "Ingresos brutos incluidos/excluidos y exenciones.",
    "Coproducciones con RTVE, pagos 793 y compensaciones.",
  ],
  commonMistakes: [
    "Clasificar cualquier canal como prestador obligado.",
    "Aplicar 3 % a todas las categorías.",
    "Olvidar pagos a cuenta o deducción acreditada.",
  ],
  correction:
    "Presenta complementaria si aumenta el resultado o solicita rectificación/devolución si disminuye, conciliando los tres pagos 793.",
  procedureSourceId: "aeat.model-792.procedure-home.2026-07-14",
  recordSourceId: "aeat.model-792.procedure-record.2026-07-14",
  helpSourceId: "aeat.model-792.instructions.2026-07-14",
  additionalOfficialLinks: [
    {
      label: "Nota informativa conjunta 792/793",
      sourceId: "aeat.models-792-793.initial-note.2023",
    },
  ],
  legalSourceIds: [...AUDIOVISUAL_LEGAL],
  related: [
    {
      code: "793",
      href: "/consultor-fiscal/modelos/793",
      description: "Tres pagos a cuenta de abril, julio y octubre.",
    },
  ],
  specificFaq: [
    {
      question: "¿Cuáles son los porcentajes?",
      answer:
        "3 % para televisión lineal en abierto y 1,5 % para acceso condicional, televisión a petición y plataformas incluidas.",
    },
    {
      question: "¿Cuándo se presenta?",
      answer: "Durante febrero posterior al devengo.",
    },
    {
      question: "¿Puede salir a devolver?",
      answer:
        "Sí, el resultado puede ser ingreso, devolución, compensación o cero según pagos y ajustes.",
    },
  ],
});

export const MODEL_793_GUIDE_V1 = createBatch5PracticalGuideV1({
  code: "793",
  category: CATEGORY,
  statusLabel: "Aportación audiovisual · tres pagos",
  statusTone: "current",
  effectiveYear: 2023,
  intro: [
    "El Modelo 793 recoge tres pagos a cuenta de la aportación audiovisual que se liquida finalmente mediante el Modelo 792.",
    "Los pagos se presentan en abril, julio y octubre y cada uno equivale al 25 % de la aportación calculada sobre los ingresos del ejercicio anterior.",
  ],
  notices: [
    {
      title: "Tres periodos distintos",
      paragraphs: [
        "1P se presenta en abril, 2P en julio y 3P en octubre, durante los primeros 20 días naturales. Deben revisarse inicio de actividad, cambio de categoría o pérdida de habilitación.",
      ],
    },
  ],
  type: "Pago a cuenta",
  presenter:
    "Los mismos prestadores estatales/supraautonómicos obligados por la aportación 792.",
  nonPresenter: "Cualquier creador, plataforma o prestador no incluido/exento.",
  periodicity: "Tres pagos: 1P, 2P y 3P.",
  deadline: "Primeros 20 días naturales de abril, julio y octubre.",
  channel:
    "Presentación electrónica, con domiciliación/NRC cuando corresponda.",
  result:
    "Ingreso del 25 % de la aportación calculada; se deduce en el 792 anual.",
  included: [
    "Ingresos brutos del ejercicio anterior.",
    "Tipos 3 %/1,5 % según categoría y pago del 25 %.",
    "Periodos 1P, 2P y 3P.",
  ],
  excluded: [
    "Autoliquidación anual final 792.",
    "Cualquier creador no incluido.",
    "Usar ingresos del trimestre corriente como regla general.",
  ],
  preparation: [
    "Categoría/habilitación vigente.",
    "Ingresos del ejercicio anterior y aportación teórica.",
    "Pagos anteriores y cambios de actividad.",
  ],
  commonMistakes: [
    "Presentar un único pago anual.",
    "Usar meses distintos.",
    "No trasladar los pagos al 792.",
  ],
  correction:
    "Corrige el periodo 1P/2P/3P afectado y conserva el importe definitivo para el 792.",
  procedureSourceId: "aeat.model-793.procedure-home.2026-07-14",
  recordSourceId: "aeat.model-793.procedure-record.2026-07-14",
  helpSourceId: "aeat.model-793.instructions.2026-07-14",
  additionalOfficialLinks: [
    {
      label: "Nota informativa conjunta 792/793",
      sourceId: "aeat.models-792-793.initial-note.2023",
    },
  ],
  legalSourceIds: [...AUDIOVISUAL_LEGAL],
  related: [
    {
      code: "792",
      href: "/consultor-fiscal/modelos/792",
      description: "Autoliquidación anual que descuenta estos tres pagos.",
    },
  ],
  specificFaq: [
    {
      question: "¿Cuántos pagos se realizan?",
      answer: "Tres: 1P en abril, 2P en julio y 3P en octubre.",
    },
    {
      question: "¿Cuál es el porcentaje?",
      answer:
        "Cada pago es el 25 % de la aportación calculada conforme a las instrucciones.",
    },
    {
      question: "¿Qué ingresos se utilizan?",
      answer:
        "Con carácter general, los ingresos brutos del ejercicio anterior, con revisión de inicio/cambios.",
    },
  ],
});

const HISTORICAL_LEGAL = ["boe.order-hfp-94-2023.original.2026-07-14"] as const;

export const MODEL_795_GUIDE_V1 = createBatch5PracticalGuideV1({
  code: "795",
  category: CATEGORY,
  statusLabel: "Histórico · gravamen energético 2023 y 2024",
  statusTone: "historical",
  allowProcedureAction: false,
  primaryActionLabel: "Consultar declaraciones históricas 2023 y 2024",
  requiresAnnualReview: false,
  intro: [
    "El Modelo 795 declaró el ingreso final del gravamen temporal energético correspondiente a 2023 y 2024.",
    "No existe una presentación ordinaria para 2025 o 2026: el Real Decreto-ley 10/2024 que pretendió extenderlo a 2025 fue derogado el 23 de enero de 2025.",
  ],
  notices: [
    {
      title: "Modelo histórico, no obligación vigente",
      paragraphs: [
        "La sede conserva consultas, correcciones y aportación documental de periodos antiguos. Su permanencia no reactiva el gravamen ni habilita una nueva autoliquidación actual.",
      ],
    },
  ],
  type: "Prestación patrimonial histórica",
  presenter:
    "Operadores energéticos que estuvieron incluidos en el gravamen temporal de los ejercicios 2023 o 2024.",
  nonPresenter:
    "Cualquier operador para un periodo 2025/2026 o quien no estuvo dentro de los umbrales y sectores históricos.",
  periodicity: "Histórica: declaración final de 2023 y 2024.",
  deadline:
    "Plazo histórico: primeros 20 días de septiembre del año correspondiente; no es calendario actual.",
  channel:
    "Solo consulta, corrección o aportación documental de declaraciones históricas en la sede.",
  result:
    "Gestión de una prestación histórica del 1,2 %, tras deducir el pago anticipado 796.",
  included: [
    "Ejercicios 2023 y 2024.",
    "Importe neto de cifra de negocios ajustado, exclusiones y tipo histórico 1,2 %.",
    "Pago anticipado 796 y resultado final.",
  ],
  excluded: [
    "Ejercicios 2025 o 2026.",
    "Un gravamen energético vigente.",
    "Calendario basado en el RDL 10/2024 derogado.",
  ],
  preparation: [
    "Declaración histórica, pago 796 y justificantes.",
    "Cifra de negocios, ajustes y sectores del ejercicio.",
    "Documentación de consulta/corrección.",
  ],
  commonMistakes: [
    "Creer que la página implica vigencia.",
    "Presentar 2025/2026.",
    "Omitir la derogación del 23 de enero de 2025.",
  ],
  correction:
    "Utiliza únicamente las gestiones históricas para corregir 2023/2024 o aportar documentación; no abras un periodo actual.",
  procedureSourceId: "aeat.model-795.procedure-home.2026-07-14",
  recordSourceId: "aeat.model-795.procedure-record.2026-07-14",
  helpSourceId: "aeat.model-795.instructions.2026-07-14",
  additionalOfficialLinks: [
    {
      label: "Preguntas frecuentes históricas",
      sourceId: "aeat.model-795.faq.2026-07-14",
    },
    {
      label: "Nota oficial de gravámenes temporales",
      sourceId: "aeat.gravamenes-temporales.note.2023-02-03",
    },
  ],
  legalSourceIds: [
    ...HISTORICAL_LEGAL,
    "boe.rdl-10-2024.original-repealed.2026-07-14",
  ],
  related: [
    {
      code: "796",
      href: "/consultor-fiscal/modelos/796",
      description: "Pago anticipado histórico del mismo gravamen.",
    },
  ],
  specificFaq: [
    { question: "¿Sigue vigente?", answer: "No. Se limitó a 2023 y 2024." },
    {
      question: "¿Qué ocurrió con 2025?",
      answer:
        "El Real Decreto-ley 10/2024 que pretendió una extensión fue derogado el 23 de enero de 2025.",
    },
    {
      question: "¿Por qué sigue la página AEAT?",
      answer:
        "Para consultas, correcciones y documentación histórica; no prueba vigencia actual.",
    },
  ],
});

export const MODEL_796_GUIDE_V1 = createBatch5PracticalGuideV1({
  code: "796",
  category: CATEGORY,
  statusLabel: "Histórico · pago energético 2023 y 2024",
  statusTone: "historical",
  allowProcedureAction: false,
  primaryActionLabel: "Consultar pagos históricos 2023 y 2024",
  requiresAnnualReview: false,
  intro: [
    "El Modelo 796 fue el pago anticipado del 50 % del gravamen temporal energético que después se liquidaba mediante el 795.",
    "Solo corresponde a 2023 y 2024; no existe pago ordinario 2025/2026 porque el RDL 10/2024 quedó derogado el 23 de enero de 2025.",
  ],
  notices: [
    {
      title: "No abras un pago anticipado actual",
      paragraphs: [
        "La sede mantiene el procedimiento para gestión histórica. No debe mostrarse un vencimiento de 2025 o 2026.",
      ],
    },
  ],
  type: "Pago anticipado histórico",
  presenter:
    "Operadores energéticos incluidos en el gravamen histórico de 2023 o 2024.",
  nonPresenter:
    "Cualquier operador para 2025/2026 o fuera del régimen histórico.",
  periodicity: "Histórica: un pago anticipado por cada ejercicio afectado.",
  deadline:
    "Plazo histórico: primeros 20 días de febrero; no es un plazo actual.",
  channel: "Consulta, corrección o documentación de pagos históricos en sede.",
  result:
    "Ingreso histórico del 50 % de la prestación estimada, deducido después en el 795.",
  included: [
    "Ejercicios 2023 y 2024.",
    "Base ajustada, prestación estimada y 50 %.",
    "Deducción en el 795.",
  ],
  excluded: [
    "Pago de 2025/2026.",
    "Gravamen vigente.",
    "Calendario de la norma derogada.",
  ],
  preparation: [
    "Pago histórico y Modelo 795 relacionado.",
    "Cifra de negocios/base ajustada.",
    "Justificantes de consulta/corrección.",
  ],
  commonMistakes: [
    "Mostrar junio/febrero de 2025 como vencimiento.",
    "Confundir página accesible con vigencia.",
    "No relacionarlo con el 795.",
  ],
  correction:
    "Gestiona únicamente el pago histórico de 2023/2024 por los cauces oficiales disponibles.",
  procedureSourceId: "aeat.model-796.procedure-home.2026-07-14",
  recordSourceId: "aeat.model-796.procedure-record.2026-07-14",
  helpSourceId: "aeat.model-796.instructions.2026-07-14",
  additionalOfficialLinks: [
    {
      label: "FAQ histórica en PDF",
      sourceId: "aeat.model-796.faq-pdf.2026-07-14",
    },
    {
      label: "Nota oficial de gravámenes temporales",
      sourceId: "aeat.gravamenes-temporales.note.2023-02-03",
    },
  ],
  legalSourceIds: [
    ...HISTORICAL_LEGAL,
    "boe.rdl-10-2024.original-repealed.2026-07-14",
  ],
  related: [
    {
      code: "795",
      href: "/consultor-fiscal/modelos/795",
      description: "Declaración final histórica que descontaba este pago.",
    },
  ],
  specificFaq: [
    {
      question: "¿Qué porcentaje se adelantaba?",
      answer: "El 50 % de la prestación estimada.",
    },
    {
      question: "¿Puede presentarse para 2026?",
      answer: "No. La figura se limita a 2023 y 2024.",
    },
    {
      question: "¿Qué modelo descontaba el pago?",
      answer: "El Modelo 795 histórico.",
    },
  ],
});

export const MODEL_797_GUIDE_V1 = createBatch5PracticalGuideV1({
  code: "797",
  category: CATEGORY,
  statusLabel: "Histórico · antiguo gravamen bancario",
  statusTone: "historical",
  allowProcedureAction: false,
  primaryActionLabel: "Consultar declaraciones históricas",
  requiresAnnualReview: false,
  intro: [
    "El Modelo 797 declaró el ingreso final del gravamen temporal de entidades de crédito y establecimientos financieros de la Ley 38/2022.",
    "No es el impuesto financiero vigente: hoy los Modelos 780 y 781 gestionan una figura jurídica distinta sobre margen de intereses y comisiones.",
  ],
  notices: [
    {
      title: "No existe sustitución automática",
      paragraphs: [
        "El 797 y su pago 798 son históricos. Los nuevos 780/781 no heredan sin más tipo, umbral, base o periodos del gravamen anterior.",
      ],
    },
  ],
  type: "Prestación patrimonial histórica",
  presenter:
    "Entidades que estuvieron incluidas en el gravamen temporal de 2023 y 2024.",
  nonPresenter:
    "Una entidad por un periodo actual o un contribuyente del impuesto vigente que deba estudiar 780/781.",
  periodicity: "Histórica: declaración final de los ejercicios afectados.",
  deadline:
    "Solo los plazos históricos del gravamen; no existe un periodo 2026.",
  channel:
    "Consulta, corrección y aportación documental de declaraciones antiguas.",
  result:
    "Ingreso histórico calculado al 4,8 % sobre la magnitud regulada, descontando el pago 798.",
  included: [
    "Ejercicios históricos del gravamen temporal.",
    "Margen de intereses/comisiones y tipo histórico 4,8 %.",
    "Pago anticipado 798 y resultado final.",
  ],
  excluded: [
    "Impuesto actual 780/781.",
    "Presentación 2026.",
    "Reutilizar umbral o tipo histórico en la figura nueva.",
  ],
  preparation: [
    "Declaración 797 y pago 798.",
    "Cuentas y umbral histórico del ejercicio.",
    "Documentación para consulta/corrección.",
  ],
  commonMistakes: [
    "Presentarlo como impuesto bancario actual.",
    "Llamar sustitución automática a 780/781.",
    "Aplicar 4,8 % en el impuesto nuevo.",
  ],
  correction:
    "Utiliza gestiones históricas para ejercicios afectados; para el impuesto actual revisa independientemente 780 y 781.",
  procedureSourceId: "aeat.model-797.procedure-home.2026-07-14",
  recordSourceId: "aeat.model-797.procedure-record.2026-07-14",
  helpSourceId: "aeat.model-797.instructions.2026-07-14",
  additionalOfficialLinks: [
    {
      label: "Preguntas frecuentes históricas",
      sourceId: "aeat.model-797.faq.2026-07-14",
    },
    {
      label: "Nota oficial de gravámenes temporales",
      sourceId: "aeat.gravamenes-temporales.note.2023-02-03",
    },
  ],
  legalSourceIds: [...HISTORICAL_LEGAL],
  related: [
    {
      code: "798",
      href: "/consultor-fiscal/modelos/798",
      description: "Pago anticipado histórico del antiguo gravamen.",
    },
    {
      code: "780",
      href: "/consultor-fiscal/modelos/780",
      description: "Autoliquidación anual del impuesto financiero vigente.",
    },
    {
      code: "781",
      href: "/consultor-fiscal/modelos/781",
      description: "Pago fraccionado del impuesto financiero vigente.",
    },
  ],
  specificFaq: [
    {
      question: "¿Sigue vigente?",
      answer: "No. Es una ficha histórica del gravamen temporal.",
    },
    {
      question: "¿Qué modelos se usan actualmente?",
      answer:
        "El impuesto financiero vigente utiliza 780 y 781, con normas distintas.",
    },
    {
      question: "¿Es lo mismo que el Modelo 780?",
      answer:
        "No. Son figuras jurídicas diferentes y no deben trasladarse automáticamente tipos, umbrales o bases.",
    },
  ],
});
