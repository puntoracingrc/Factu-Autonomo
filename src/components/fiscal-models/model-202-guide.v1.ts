import type { FiscalModelPracticalGuideV1 } from "./fiscal-model-practical-guide.types";

export const MODEL_202_GUIDE_V1 = {
  code: "202",
  effectiveYear: 2026,
  lastVerifiedAt: "2026-07-14",
  requiresAnnualReview: true,
  intro: [
    "El Modelo 202 es un pago fraccionado a cuenta del Impuesto sobre Sociedades. Permite anticipar durante el ejercicio una parte del impuesto que se regularizará después en el Modelo 200.",
    "No es una declaración trimestral: sus periodos ordinarios son abril, octubre y diciembre, identificados como 1/P, 2/P y 3/P.",
    "La sociedad es quien lo presenta. El socio autónomo no lo presenta por su actividad personal, aunque su sociedad sí puede estar obligada.",
  ],
  notices: [
    {
      title: "No se calcula siempre igual",
      paragraphs: [
        "La ley prevé la modalidad del artículo 40.2, basada en la última declaración, y la del artículo 40.3, basada en la base del ejercicio en curso.",
      ],
    },
    {
      title: "Puede ser obligatorio sin ingreso",
      paragraphs: [
        "Las entidades cuya cifra de negocios superó 6 millones de euros en los doce meses anteriores deben presentar el modelo aunque el resultado sea cero o negativo.",
      ],
    },
    {
      title: "La opción por el artículo 40.3 tiene reglas censales",
      paragraphs: [
        "No debe cambiarse de modalidad libremente en cada pago. La opción y renuncia siguen el procedimiento y plazos previstos.",
      ],
    },
  ],
  actions: [
    {
      label: "Abrir el procedimiento oficial del Modelo 202",
      sourceId: "aeat.model-202.procedure-home.2026-07-01",
      primary: true,
    },
    {
      label: "Acceder a la presentación 2026 y siguientes",
      sourceId: "aeat.model-202.management.2026-06-10",
      primary: true,
    },
    {
      label: "Consultar instrucciones 2025 y siguientes",
      sourceId: "aeat.model-202.instructions-2025-and-following.2026-06-10",
    },
    {
      label: "Ver el Modelo 200 relacionado",
      internalHref: "/consultor-fiscal/modelos/200",
    },
  ],
  quickSummaryTitle: "El Modelo 202 en pocas palabras",
  quickFacts: [
    {
      label: "Qué es",
      value: "Un pago anticipado del Impuesto sobre Sociedades.",
    },
    {
      label: "Quién lo presenta",
      value: "La sociedad o entidad obligada, no el socio a título personal.",
    },
    {
      label: "Periodos",
      value: "1/P en abril, 2/P en octubre y 3/P en diciembre.",
    },
    {
      label: "Plazo general",
      value: "Del 1 al 20 de abril, octubre y diciembre.",
    },
    {
      label: "Domiciliación",
      value: "Habitualmente hasta el día 15; confirma cada calendario oficial.",
    },
    {
      label: "Modalidades",
      value: "Artículo 40.2 o artículo 40.3 de la Ley del Impuesto.",
    },
    { label: "Regularización", value: "Se descuenta en el Modelo 200 anual." },
    {
      label: "Naturaleza contable",
      value: "Es un activo/pago a cuenta, no un gasto del ejercicio.",
    },
  ],
  sections: [
    {
      id: "model-202-person-company",
      title: "Autónomo persona física y sociedad limitada",
      cards: [
        {
          title: "Autónomo persona física",
          bullets: [
            "Declara normalmente en IRPF.",
            "Puede efectuar pagos con los Modelos 130 o 131.",
            "No utiliza el 202 por su actividad individual.",
          ],
        },
        {
          title: "Sociedad limitada",
          bullets: [
            "Es un contribuyente separado.",
            "Liquida anualmente con el Modelo 200.",
            "Puede anticipar pagos mediante el Modelo 202.",
            "Puede informar operaciones vinculadas en el 232.",
          ],
        },
        {
          title: "Socio o administrador",
          paragraphs: [
            "Su situación personal no sustituye las obligaciones de la sociedad ni convierte el pago del 202 en un pago personal.",
          ],
        },
      ],
    },
    {
      id: "model-202-who",
      title: "Quién debe presentarlo",
      cards: [
        {
          title: "Resultado positivo",
          paragraphs: [
            "Con carácter general, se presenta cuando resulta una cantidad a ingresar según la modalidad aplicable.",
          ],
        },
        {
          title: "Cifra de negocios superior a 6 millones",
          paragraphs: [
            "Existe obligación de presentar aunque no resulte ingreso, tomando la cifra de los doce meses anteriores al inicio del periodo.",
          ],
        },
        {
          title: "Sociedad inactiva",
          paragraphs: [
            "La inactividad no elimina automáticamente la obligación. Puede existir una cuota de referencia en la modalidad 40.2 o la obligación especial por cifra de negocios.",
          ],
        },
      ],
    },
    {
      id: "model-202-modalities",
      title: "Las dos modalidades de cálculo",
      cards: [
        {
          title: "Artículo 40.2 · última cuota",
          paragraphs: [
            "Parte de la cuota íntegra del último periodo cuyo plazo de declaración estuviera vencido, minorada por las deducciones, bonificaciones, retenciones e ingresos a cuenta previstos. El porcentaje ordinario es 18 %.",
          ],
        },
        {
          title: "Artículo 40.3 · resultado en curso",
          paragraphs: [
            "Parte de la base imponible acumulada de los primeros 3, 9 u 11 meses del ejercicio, según el pago. Aplica el porcentaje y las minoraciones vigentes para la entidad.",
          ],
        },
        {
          title: "Obligatoria en determinados casos",
          paragraphs: [
            "La modalidad 40.3 es obligatoria cuando el importe neto de la cifra de negocios superó 6 millones de euros durante los doce meses anteriores al inicio del periodo.",
          ],
        },
      ],
      note: "El cálculo exacto depende de la entidad, ejercicio, tipo, bases, bonificaciones, retenciones y pagos anteriores. Esta ficha no es una calculadora.",
    },
    {
      id: "model-202-periods",
      title: "Qué abarca cada periodo",
      cards: [
        {
          title: "1/P · abril",
          paragraphs: [
            "En la modalidad 40.3, se calcula sobre los primeros tres meses para entidades cuyo ejercicio coincide con el año natural.",
          ],
        },
        {
          title: "2/P · octubre",
          paragraphs: [
            "En la modalidad 40.3, se calcula sobre los primeros nueve meses, descontando pagos anteriores según las instrucciones.",
          ],
        },
        {
          title: "3/P · diciembre",
          paragraphs: [
            "En la modalidad 40.3, se calcula sobre los primeros once meses.",
          ],
        },
      ],
      note: "En ejercicios que no coinciden con el año natural deben aplicarse las reglas temporales específicas de las instrucciones.",
    },
    {
      id: "model-202-large-entities",
      title: "Entidades de mayor dimensión",
      cards: [
        {
          title: "Más de 6 millones",
          paragraphs: [
            "Modalidad 40.3 obligatoria y presentación incluso con resultado cero o negativo.",
          ],
        },
        {
          title: "Al menos 10 millones",
          paragraphs: [
            "El modelo incorpora un anexo de comunicación de datos adicionales. También pueden operar reglas de pago mínimo que exigen cálculo específico.",
          ],
        },
      ],
      note: "No simplifiques el pago mínimo ni extrapoles porcentajes sin revisar la campaña y la situación de la entidad.",
    },
    {
      id: "model-202-deadlines-payment",
      title: "Plazos y forma de pago",
      cards: [
        {
          title: "Presentación",
          paragraphs: [
            "Del 1 al 20 de abril, octubre y diciembre. Si el último día es inhábil, se aplica el calendario tributario oficial.",
          ],
        },
        {
          title: "Domiciliación",
          paragraphs: [
            "El plazo suele finalizar el día 15, pero debe confirmarse en el calendario de cada campaña.",
          ],
        },
        {
          title: "Contabilidad",
          paragraphs: [
            "El ingreso se registra como pago a cuenta del impuesto, no como gasto. Se regulariza al calcular el Modelo 200.",
          ],
        },
      ],
    },
    {
      id: "model-202-correction",
      title: "Errores y correcciones",
      cards: [
        {
          title: "Ingresaste menos",
          paragraphs: [
            "Revisa el trámite vigente para regularizar el pago y los posibles recargos o intereses. No esperes al Modelo 200 sin analizar el error.",
          ],
        },
        {
          title: "Ingresaste de más",
          paragraphs: [
            "La vía puede ser distinta y depender del efecto del error. Conserva cálculo, justificante y soporte de la corrección.",
          ],
        },
        {
          title: "No copies el flujo del Modelo 200",
          paragraphs: [
            "Cada autoliquidación y periodo debe corregirse por el procedimiento que le corresponda.",
          ],
        },
      ],
    },
    {
      id: "model-202-related",
      title: "Relación con otros modelos",
      cards: [
        {
          title: "Modelo 200",
          paragraphs: [
            "Es la declaración anual en la que se deducen los pagos fraccionados.",
          ],
          links: [
            { label: "Ver Modelo 200", href: "/consultor-fiscal/modelos/200" },
          ],
        },
        {
          title: "Modelo 232",
          paragraphs: [
            "Informa determinadas operaciones vinculadas; no calcula el pago fraccionado.",
          ],
          links: [
            { label: "Ver Modelo 232", href: "/consultor-fiscal/modelos/232" },
          ],
        },
        {
          title: "Modelo 036",
          paragraphs: [
            "Puede utilizarse para comunicar la opción o renuncia a la modalidad 40.3 cuando proceda.",
          ],
          links: [
            { label: "Ver Modelo 036", href: "/consultor-fiscal/modelos/036" },
          ],
        },
      ],
    },
    {
      id: "model-202-territory",
      title: "Ámbito territorial",
      note: "Esta guía se refiere principalmente al Impuesto sobre Sociedades estatal. Las entidades sometidas a normativa del País Vasco o Navarra deben comprobar las reglas y modelos de la Hacienda foral competente. Determinadas entidades pueden tributar conjuntamente al Estado y a una Hacienda foral; los formularios estatales pueden solicitar el porcentaje correspondiente al territorio común.",
    },
  ],
  fillingTitle: "Cómo preparar y presentar el Modelo 202",
  fillingSteps: [
    {
      title: "1. Identifica la modalidad",
      paragraphs: [
        "Comprueba si corresponde 40.2, si se optó válidamente por 40.3 o si esta última es obligatoria.",
      ],
    },
    {
      title: "2. Determina el periodo",
      paragraphs: ["Selecciona 1/P, 2/P o 3/P y el ejercicio correcto."],
    },
    {
      title: "3. Reúne la base",
      paragraphs: [
        "Usa la última declaración vencida en 40.2 o una contabilidad actualizada y ajustes acumulados en 40.3.",
      ],
    },
    {
      title: "4. Aplica reglas vigentes",
      paragraphs: [
        "Revisa porcentajes, pago mínimo, bonificaciones, retenciones y pagos anteriores según las instrucciones actuales.",
      ],
    },
    {
      title: "5. Valida y paga",
      paragraphs: [
        "Comprueba identificación, periodo, modalidad, resultado y forma de pago antes de firmar.",
      ],
    },
    {
      title: "6. Conserva el justificante",
      paragraphs: [
        "Archívalo con el cálculo y concílialo después con el Modelo 200.",
      ],
    },
  ],
  afterTitle: "Qué ocurre después",
  afterSteps: [
    {
      title: "Pago a cuenta",
      description:
        "El importe queda pendiente de descontar en la liquidación anual.",
    },
    {
      title: "Siguiente periodo",
      description:
        "En 40.3, los datos son acumulados y deben reflejar correctamente los pagos anteriores.",
    },
    {
      title: "Modelo 200",
      description:
        "Al cerrar el ejercicio, contrasta los tres pagos con la declaración anual.",
    },
  ],
  comparison: {
    title: "¿Modelo 202 o Modelo 200?",
    current: {
      title: "Modelo 202",
      description: "Anticipa el impuesto en abril, octubre y diciembre.",
    },
    related: {
      title: "Modelo 200",
      description: "Liquida el impuesto anual y descuenta los pagos del 202.",
      href: "/consultor-fiscal/modelos/200",
      label: "Ver Modelo 200",
    },
    additional: [
      {
        title: "Modelo 232",
        description:
          "Informa determinadas operaciones vinculadas y no genera un pago.",
        href: "/consultor-fiscal/modelos/232",
        label: "Ver Modelo 232",
      },
    ],
    conclusion:
      "El 202 no sustituye al 200 y el 232 cumple una finalidad informativa diferente.",
  },
  pdfNotice: [
    "La vista previa no es válida para presentar. Firma, envía y conserva el justificante electrónico.",
  ],
  documents: [],
  officialLinks: [
    {
      label: "Ficha administrativa del Modelo 202",
      sourceId: "aeat.model-202.procedure-record.2026-06-10",
    },
    {
      label: "Información oficial sobre pagos fraccionados",
      sourceId: "aeat.model-202.payments-information.2026-06-30",
    },
    {
      label: "Ayuda técnica de presentación",
      sourceId: "aeat.model-202.presentation-help.2026-06-30",
    },
    {
      label: "Diseños de registro 200 a 299",
      sourceId: "aeat.models-200-299.register-designs.2026-06-19",
    },
  ],
  legalLinks: [
    {
      label: "Ley 27/2014 del Impuesto sobre Sociedades",
      sourceId: "boe.corporate-tax.law-27-2014",
    },
    {
      label: "Orden HFP/227/2017",
      sourceId: "boe.model-202.order-hfp-227-2017",
    },
    {
      label: "Orden HAC/495/2024",
      sourceId: "boe.model-202.order-hac-495-2024",
    },
  ],
  faq: [
    {
      question: "¿El Modelo 202 es trimestral?",
      answer: "No. Sus periodos ordinarios son abril, octubre y diciembre.",
    },
    {
      question: "¿Qué se paga?",
      answer:
        "Un anticipo del Impuesto sobre Sociedades que se regulariza en el Modelo 200.",
    },
    {
      question: "¿Es un gasto de la empresa?",
      answer: "No. Contablemente es un pago a cuenta del impuesto.",
    },
    {
      question: "¿Qué es la modalidad 40.2?",
      answer:
        "La que toma como referencia la última cuota declarada y aplica, con carácter ordinario, el 18 % tras las minoraciones previstas.",
    },
    {
      question: "¿Qué es la modalidad 40.3?",
      answer:
        "La que calcula sobre la base imponible acumulada del ejercicio en curso.",
    },
    {
      question: "¿Quién debe aplicar obligatoriamente el 40.3?",
      answer:
        "Quien superó 6 millones de euros de cifra de negocios en los doce meses anteriores al inicio del periodo, entre otros supuestos legales.",
    },
    {
      question: "¿Puede presentarse con resultado cero?",
      answer:
        "Sí; es obligatorio para las entidades que superaron el umbral de 6 millones aunque no haya ingreso.",
    },
    {
      question: "¿Una sociedad inactiva queda exenta?",
      answer:
        "No automáticamente. Debe revisarse la modalidad, la última cuota y su cifra de negocios.",
    },
    {
      question: "¿Cuándo se presenta?",
      answer:
        "Del 1 al 20 de abril, octubre y diciembre, con el calendario de días inhábiles aplicable.",
    },
    {
      question: "¿Puedo cambiar de modalidad en cada pago?",
      answer:
        "No libremente. La opción y renuncia al 40.3 siguen reglas censales y plazos propios.",
    },
    {
      question: "¿Qué ocurre con sociedades de al menos 10 millones?",
      answer:
        "Deben revisar el anexo de datos adicionales y las reglas de pago mínimo.",
    },
    {
      question: "¿Cómo se relaciona con el Modelo 200?",
      answer:
        "Los pagos presentados se deducen al liquidar anualmente el impuesto.",
    },
  ],
  sourceIds: [
    "aeat.models.index.2026-07-08",
    "aeat.model-202.procedure-home.2026-07-01",
    "aeat.model-202.procedure-record.2026-06-10",
    "aeat.model-202.management.2026-06-10",
    "aeat.model-202.payments-information.2026-06-30",
    "aeat.model-202.instructions-2025-and-following.2026-06-10",
    "aeat.model-202.presentation-help.2026-06-30",
    "aeat.models-200-299.register-designs.2026-06-19",
    "boe.model-202.order-hfp-227-2017",
    "boe.model-202.order-hac-495-2024",
    "boe.corporate-tax.law-27-2014",
  ],
} as const satisfies FiscalModelPracticalGuideV1;
