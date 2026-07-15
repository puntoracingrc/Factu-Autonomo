import type { FiscalModelPracticalGuideV1 } from "./fiscal-model-practical-guide.types";

export const MODEL_179_GUIDE_V1 = {
  code: "179",
  effectiveYear: 2023,
  taxPeriodYear: 2023,
  filingYear: 2024,
  lastVerifiedAt: "2026-07-15",
  requiresAnnualReview: true,
  intro: [
    "El Modelo 179 fue la declaración informativa anual de determinadas cesiones de uso de viviendas con fines turísticos. La AEAT lo marca como no vigente para el ejercicio 2024 y siguientes.",
    "Esta página se conserva como referencia histórica. El último ejercicio ordinario fue 2023, presentado en enero de 2024; para los periodos posteriores debe revisarse el Modelo 238 y la situación concreta del operador.",
  ],
  notices: [
    {
      title: "Histórico · no vigente desde el ejercicio 2024",
      paragraphs: [
        "No utilices esta ficha para iniciar una presentación actual. La consulta y las correcciones que conserva la sede corresponden a ejercicios antiguos.",
      ],
    },
    {
      title: "No lo presentaba automáticamente el propietario",
      paragraphs: [
        "La obligación histórica recaía en determinados intermediarios en la cesión. Ser propietario o arrendador de una vivienda turística no convertía por sí solo en declarante del Modelo 179.",
      ],
    },
  ],
  actions: [
    {
      label: "Consultar el aviso oficial de supresión",
      sourceId: "aeat.model-179.notice-2024-and-later.2026-07-08",
      primary: true,
    },
    {
      label: "Ir al Modelo 238 vigente",
      internalHref: "/consultor-fiscal/modelos/238",
    },
    {
      label: "Abrir la ficha histórica oficial",
      sourceId: "aeat.model-179.procedure-home.2026-02-13",
    },
  ],
  externalActionNotice:
    "Los accesos oficiales de esta ficha son históricos. Factu no inicia, presenta, corrige ni envía declaraciones antiguas a la Agencia Tributaria.",
  quickSummaryTitle: "Modelo 179 histórico en un vistazo",
  quickFacts: [
    {
      label: "Estado",
      value: "Histórico; no vigente para el ejercicio 2024 y siguientes.",
    },
    {
      label: "Último ejercicio",
      value: "2023, con presentación ordinaria en enero de 2024.",
    },
    {
      label: "Quién lo presentaba",
      value: "Determinados intermediarios en cesiones de viviendas turísticas.",
    },
    {
      label: "Quién no lo presentaba",
      value: "El propietario por el mero hecho de serlo, ni el huésped.",
    },
    {
      label: "Modelo actual relacionado",
      value:
        "Modelo 238 para la información de plataformas desde el ejercicio 2024, cuando proceda.",
    },
    {
      label: "Uso actual",
      value: "Consulta, documentación y corrección de ejercicios históricos.",
    },
  ],
  sections: [
    {
      id: "model-179-historical-purpose",
      title: "Qué comunicaba el Modelo 179",
      cards: [
        {
          title: "Cesión de viviendas turísticas",
          paragraphs: [
            "Recogía información anual sobre determinadas cesiones temporales de uso de viviendas amuebladas y equipadas para uso inmediato, intermediadas en los términos de la normativa entonces vigente.",
          ],
        },
        {
          title: "Intermediario",
          paragraphs: [
            "La obligación se vinculaba a quien prestaba el servicio de intermediación entre cedente y cesionario, incluso cuando no fijaba las condiciones de la cesión.",
          ],
        },
        {
          title: "Datos históricos",
          bullets: [
            "Cedente y cesionario.",
            "Inmueble y referencia catastral.",
            "Número de días de disfrute.",
            "Importe percibido o intermediado cuando correspondía.",
            "Contrato o medio de cesión.",
          ],
        },
        {
          title: "Declaración informativa",
          paragraphs: [
            "No calculaba el IRPF o el Impuesto sobre la Renta de no Residentes (IRNR) del propietario y no sustituía su declaración de renta.",
          ],
        },
      ],
    },
    {
      id: "model-179-not-current",
      title: "Por qué ya no es un modelo vigente",
      intro: [
        "La AEAT indica que a partir del ejercicio 2024 se suprime esta obligación y, para la información de cesiones y arrendamientos de inmuebles en plataformas, la relaciona con el Modelo 238.",
      ],
      cards: [
        {
          title: "Ejercicio 2023",
          paragraphs: [
            "Fue el último periodo ordinario del Modelo 179. Su plazo general terminó en enero de 2024.",
          ],
        },
        {
          title: "Ejercicio 2024 y posteriores",
          paragraphs: [
            "No debe prepararse un nuevo Modelo 179. Debe analizarse si el operador está dentro del marco del Modelo 238.",
          ],
          links: [
            {
              label: "Consultar el Modelo 238",
              href: "/consultor-fiscal/modelos/238",
            },
          ],
        },
      ],
      note: "La sustitución del canal informativo no decide si un propietario debe tributar ni convierte automáticamente a toda plataforma o intermediario en declarante del 238.",
    },
    {
      id: "model-179-who-filed",
      title: "Quién lo presentaba y quién no",
      cards: [
        {
          title: "Lo presentaba",
          bullets: [
            "El intermediario que encajaba en la obligación histórica.",
            "Plataformas colaborativas y otros intermediarios cuando cumplían la definición.",
            "Quien mediaba de forma onerosa o gratuita si estaba incluido por la regla aplicable.",
          ],
        },
        {
          title: "No bastaba para presentarlo",
          bullets: [
            "Ser dueño de la vivienda.",
            "Ser huésped o cesionario.",
            "Publicar un anuncio sin intervenir como intermediario.",
            "Prestar únicamente servicios ajenos a la intermediación.",
          ],
        },
      ],
    },
    {
      id: "model-179-historical-management",
      title: "Consulta y corrección de ejercicios antiguos",
      accordions: [
        {
          question: "¿Pueden consultarse declaraciones antiguas?",
          paragraphs: [
            "La sede conserva accesos y documentación para ejercicios anteriores. Hay que comprobar el ejercicio antes de cargar o modificar información.",
          ],
        },
        {
          question: "¿Puede corregirse un registro histórico?",
          paragraphs: [
            "Sí, mediante las herramientas y referencias históricas que mantenga la AEAT. No debe generarse una declaración actual ni trasladarse el registro al 238 sin revisar su diseño.",
          ],
        },
        {
          question: "¿Qué documentos técnicos se conservan?",
          paragraphs: [
            "La ficha registra guías históricas de validaciones y servicio web. Son documentación técnica, no formularios actuales ni miniaturas de una declaración vigente.",
          ],
        },
      ],
    },
    {
      id: "model-179-related-taxes",
      title: "La renta del alquiler sigue por separado",
      cards: [
        {
          title: "Propietario residente",
          paragraphs: [
            "La renta se declara en el Modelo 100 cuando corresponda. La desaparición del 179 no elimina esa obligación.",
          ],
          links: [
            {
              label: "Consultar el Modelo 100",
              href: "/consultor-fiscal/modelos/100",
            },
          ],
        },
        {
          title: "Propietario no residente",
          paragraphs: [
            "Puede corresponder el Modelo 210 según la renta y el periodo. La información DAC7 no sustituye el IRNR.",
          ],
          links: [
            {
              label: "Consultar el Modelo 210",
              href: "/consultor-fiscal/modelos/210",
            },
          ],
        },
      ],
    },
    {
      id: "model-179-mistakes",
      title: "Errores que deben evitarse",
      cards: [
        {
          title: "Presentarlo como actual",
          bullets: [
            "Crear una declaración para 2024 o años posteriores.",
            "Mostrar un botón de presentación vigente.",
            "Ocultar el aviso histórico.",
          ],
        },
        {
          title: "Confundir sujetos",
          bullets: [
            "Afirmar que lo presentaba siempre el propietario.",
            "Afirmar que ahora todo propietario presenta el 238.",
            "Confundir al intermediario con el cedente.",
          ],
        },
        {
          title: "Trasladar registros sin control",
          bullets: [
            "Reutilizar diseños antiguos en DAC7.",
            "Duplicar correcciones.",
            "No comprobar aceptación y referencias históricas.",
          ],
        },
        {
          title: "Olvidar los impuestos",
          bullets: [
            "La supresión del 179 no elimina Renta, IRNR, IVA u otras obligaciones que correspondan.",
          ],
        },
      ],
    },
  ],
  fillingTitle: "Cómo revisar un expediente histórico del Modelo 179",
  fillingSteps: [
    {
      title: "1. Confirmar el ejercicio",
      paragraphs: [
        "Verificar que la información pertenece a 2023 o a otro ejercicio en el que el modelo estaba vigente.",
      ],
    },
    {
      title: "2. Identificar la declaración",
      paragraphs: [
        "Localizar justificante, referencia y registros aceptados en la presentación original.",
      ],
    },
    {
      title: "3. Revisar la corrección",
      paragraphs: [
        "Distinguir alta, modificación o anulación histórica y conservar la trazabilidad de cada registro.",
      ],
    },
    {
      title: "4. Usar solo la sede",
      paragraphs: [
        "Acceder a la consulta histórica oficial y guardar el nuevo justificante. Factu no recibe esos datos.",
      ],
    },
  ],
  afterTitle: "Después de la consulta histórica",
  afterSteps: [
    {
      title: "Conservar la evidencia",
      description:
        "Guardar justificantes, respuestas y referencias del ejercicio corregido.",
    },
    {
      title: "No duplicar en 238",
      description:
        "No trasladar automáticamente la misma información al Modelo 238 sin comprobar periodo, operador y reglas DAC7.",
    },
    {
      title: "Declarar la renta",
      description:
        "Revisar por separado la tributación del propietario o cedente en el impuesto que corresponda.",
    },
  ],
  comparison: {
    title: "Modelo histórico y modelos actuales",
    current: {
      title: "Modelo 179",
      description:
        "Ficha histórica de cesiones de viviendas turísticas. Último ejercicio ordinario: 2023.",
    },
    related: {
      title: "Modelo 238",
      description:
        "Declaración informativa DAC7 de operadores de plataformas para 2024 y siguientes, cuando proceda.",
      href: "/consultor-fiscal/modelos/238",
      label: "Ver Modelo 238",
    },
    additional: [
      {
        title: "Modelo 040",
        description: "Registro censal del operador de plataforma.",
        href: "/consultor-fiscal/modelos/040",
        label: "Ver Modelo 040",
      },
    ],
    conclusion:
      "No existe redirección automática: la ficha histórica permanece accesible y el usuario decide abrir el modelo actual relacionado.",
  },
  pdfNotice: [
    "Estos documentos describen validaciones y servicio web de ejercicios históricos. No son impresos vigentes y no deben usarse para iniciar una declaración actual.",
  ],
  documents: [
    {
      label: "Guía histórica de validaciones",
      sourceId: "aeat.model-179.validation-guide-pdf.2026-07-13",
    },
    {
      label: "Guía histórica del servicio web",
      sourceId: "aeat.model-179.web-service-guide-pdf.2026-07-13",
    },
  ],
  officialLinks: [
    {
      label: "Ficha administrativa histórica",
      sourceId: "aeat.model-179.procedure-record.2026-07-08",
    },
    {
      label: "Aviso oficial para 2024 y siguientes",
      sourceId: "aeat.model-179.notice-2024-and-later.2026-07-08",
    },
    {
      label: "Preguntas frecuentes históricas",
      sourceId: "aeat.model-179.faq.2026-07-08",
    },
    {
      label: "Ayuda de presentación histórica",
      sourceId: "aeat.model-179.presentation-help.2026-01-09",
    },
  ],
  legalLinks: [
    { label: "Orden HAC/612/2021", sourceId: "boe.order-hac-612-2021" },
    { label: "Real Decreto 117/2024", sourceId: "boe.real-decree-117-2024" },
    { label: "Orden HAC/72/2024", sourceId: "boe.order-hac-72-2024" },
  ],
  faq: [
    {
      question: "¿Sigue vigente el Modelo 179?",
      answer:
        "No. La AEAT lo marca como no vigente para el ejercicio 2024 y siguientes.",
    },
    {
      question: "¿Cuál fue el último ejercicio?",
      answer:
        "El ejercicio 2023, cuya presentación ordinaria tuvo lugar en enero de 2024.",
    },
    {
      question: "¿Qué modelo lo sustituyó?",
      answer:
        "La AEAT relaciona la información de plataformas desde 2024 con el Modelo 238, cuando el operador está obligado.",
    },
    {
      question: "¿Lo presentaba el propietario?",
      answer:
        "No automáticamente. La obligación histórica recaía en determinados intermediarios.",
    },
    {
      question: "¿Qué información contenía?",
      answer:
        "Datos de cedentes, cesionarios, inmuebles, días de uso e importes en los términos del modelo histórico.",
    },
    {
      question: "¿Puedo presentar ahora un Modelo 179?",
      answer:
        "No para 2024 o ejercicios posteriores. Solo deben usarse los accesos históricos para consultas o correcciones admitidas.",
    },
    {
      question: "¿Pueden corregirse declaraciones antiguas?",
      answer:
        "Sí, mediante la gestión histórica oficial y comprobando cómo afecta la corrección a los registros anteriores.",
    },
    {
      question: "¿El 238 lo presenta el propietario?",
      answer:
        "No por ser propietario. El 238 corresponde al operador de plataforma que cumpla sus requisitos.",
    },
    {
      question: "¿La desaparición del 179 elimina la tributación del alquiler?",
      answer: "No. La renta sigue declarándose en el impuesto que corresponda.",
    },
    {
      question: "¿Factu redirige automáticamente al 238?",
      answer:
        "No. Mantiene la ficha histórica y ofrece un enlace interno para que el usuario consulte el modelo relacionado.",
    },
    {
      question: "¿Los PDF históricos son formularios actuales?",
      answer:
        "No. Son guías técnicas antiguas y no permiten una presentación vigente.",
    },
    {
      question: "¿Factu conserva datos de huéspedes o viviendas?",
      answer:
        "No. La ficha es informativa y no solicita ni almacena datos del expediente.",
    },
  ],
  sourceIds: [
    "aeat.model-179.procedure-home.2026-02-13",
    "aeat.model-179.procedure-record.2026-07-08",
    "aeat.model-179.notice-2024-and-later.2026-07-08",
    "aeat.model-179.faq.2026-07-08",
    "aeat.model-179.presentation-help.2026-01-09",
    "aeat.model-179.validation-guide-pdf.2026-07-13",
    "aeat.model-179.web-service-guide-pdf.2026-07-13",
    "boe.order-hac-612-2021",
    "boe.real-decree-117-2024",
    "boe.order-hac-72-2024",
  ],
} as const satisfies FiscalModelPracticalGuideV1;
