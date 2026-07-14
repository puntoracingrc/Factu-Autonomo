import type { FiscalModelPracticalGuideV1 } from "./fiscal-model-practical-guide.types";

const TERRITORIAL_NOTE =
  "Esta guía se refiere al IAE gestionado por la AEAT y, cuando corresponda, por las entidades locales. País Vasco y Navarra pueden tener reglas y trámites de sus Haciendas forales.";

export const MODEL_840_GUIDE_V1 = {
  code: "840",
  lastVerifiedAt: "2026-07-14",
  requiresAnnualReview: true,
  intro: [
    "El Modelo 840 sirve para comunicar altas, variaciones y bajas en el Impuesto sobre Actividades Económicas cuando el contribuyente no está exento.",
    "Una persona física autónoma está exenta del IAE con independencia de su cifra de negocios y no presenta el Modelo 840. Sus actividades se comunican mediante el Modelo 036.",
  ],
  notices: [
    {
      title: "Si eres autónomo persona física",
      paragraphs: [
        "No tienes que pagar el IAE ni presentar el Modelo 840. Sí debes declarar tu actividad y su epígrafe mediante el Modelo 036.",
      ],
    },
    {
      title: "Estar de alta no significa pagar",
      paragraphs: [
        "Toda actividad debe clasificarse en el IAE, pero solo los contribuyentes no exentos presentan el 840. El formulario comunica datos; la Administración emite después la liquidación o el recibo.",
      ],
    },
  ],
  actions: [
    {
      label: "Comprobar si realmente necesito el Modelo 840",
      href: "https://sede.agenciatributaria.gob.es/Sede/declaraciones-informativas-otros-impuestos-tasas/impuesto-sobre-actividades-economicas/tengo-que-presentar-declaracion-iae.html",
      primary: true,
    },
    {
      label: "Consultar el Modelo 036 para personas exentas",
      internalHref: "/consultor-fiscal/modelos/036",
      primary: true,
    },
    {
      label: "Abrir el procedimiento oficial 840/848",
      sourceId: "aeat.model-840-848.procedure-home.2026-07-14",
    },
    {
      label: "Buscar actividad y epígrafe",
      href: "https://sede.agenciatributaria.gob.es/Sede/declaraciones-informativas-otros-impuestos-tasas/impuesto-sobre-actividades-economicas.html",
    },
    {
      label: "Ver la ficha administrativa",
      sourceId: "aeat.model-840-848.procedure-record.2026-07-14",
    },
  ],
  quickSummaryTitle: "El Modelo 840 en pocas palabras",
  quickFacts: [
    {
      label: "Personas físicas",
      value: "Exentas: utilizan el Modelo 036, no el 840.",
    },
    {
      label: "Quién lo presenta",
      value: "Principalmente empresas y entidades no exentas.",
    },
    {
      label: "Límite general",
      value:
        "Cifra de negocios igual o superior a 1.000.000 €, con reglas de cómputo.",
    },
    {
      label: "Para qué sirve",
      value: "Alta, variación, baja y determinadas comunicaciones de exención.",
    },
    {
      label: "Un formulario",
      value: "Las altas se presentan separadamente por actividad.",
    },
    {
      label: "Alta o variación",
      value: "Dentro de un mes desde el hecho que se comunica.",
    },
    {
      label: "Sustituye al 036",
      value: "No; ambos pueden ser obligatorios para una entidad no exenta.",
    },
    {
      label: "Realiza el pago",
      value: "No; el recibo o liquidación llega después.",
    },
  ],
  sections: [
    {
      id: "model-840-who",
      title: "¿Necesito el Modelo 840?",
      cards: [
        {
          title: "Autónomo persona física",
          paragraphs: [
            "No presenta el 840 y sigue exento aunque su cifra de negocios supere un millón de euros. Utiliza el 036 para sus actividades.",
          ],
          links: [
            { label: "Ver Modelo 036", href: "/consultor-fiscal/modelos/036" },
          ],
        },
        {
          title: "Sociedad o entidad por debajo del límite",
          paragraphs: [
            "Con carácter general está exenta si su importe neto de cifra de negocios es inferior a un millón de euros, sin perjuicio de otras reglas y exenciones.",
          ],
        },
        {
          title: "Sociedad o entidad no exenta",
          paragraphs: [
            "Puede tener que presentar el 840 cuando su cifra de negocios sea igual o superior al límite y no resulte aplicable otra exención.",
          ],
        },
        {
          title: "Entidades públicas y otras exenciones",
          paragraphs: [
            "La ley contempla exenciones específicas. No concluyas la obligación únicamente a partir de la forma jurídica o del volumen de ingresos.",
          ],
        },
      ],
    },
    {
      id: "model-840-turnover",
      title: "Cifra de negocios y exención por inicio",
      cards: [
        {
          title: "Importe neto de cifra de negocios",
          paragraphs: [
            "El umbral general es 1.000.000 de euros. No es beneficio, base imponible de IVA ni saldo bancario.",
          ],
        },
        {
          title: "Cómputo conjunto",
          paragraphs: [
            "La normativa puede exigir considerar el conjunto de actividades y, en determinados grupos o estructuras, magnitudes agregadas. No se calcula actividad por actividad de forma aislada.",
          ],
        },
        {
          title: "Inicio real de actividad",
          paragraphs: [
            "Quienes inician una actividad pueden estar exentos durante los dos primeros periodos impositivos. Debe tratarse de un inicio real, no de una continuación bajo otra forma, fusión o reestructuración.",
          ],
        },
        {
          title: "Pérdida o adquisición de exención",
          paragraphs: [
            "El cambio debe comunicarse durante diciembre anterior al año en que comience a tributar o quede exonerado, según corresponda.",
          ],
        },
      ],
    },
    {
      id: "model-840-comparison",
      title: "Modelos 036, 840 y 848",
      cards: [
        {
          title: "Modelo 036",
          paragraphs: [
            "Comunica las actividades de contribuyentes exentos, incluidas las personas físicas. Una entidad no exenta también conserva sus obligaciones censales generales.",
          ],
          links: [
            { label: "Ver Modelo 036", href: "/consultor-fiscal/modelos/036" },
          ],
        },
        {
          title: "Modelo 840",
          paragraphs: [
            "Comunica altas, variaciones o bajas del IAE de contribuyentes no exentos. Nunca sustituye al 036.",
          ],
        },
        {
          title: "Modelo 848",
          paragraphs: [
            "Comunica el importe neto de cifra de negocios cuando procede. Normalmente no se presenta si ya se comunicó en el Impuesto sobre Sociedades, IRNR o Modelo 184.",
          ],
          links: [
            { label: "Ver Modelo 848", href: "/consultor-fiscal/modelos/848" },
          ],
        },
        {
          title: "Plazo del 848",
          paragraphs: [
            "Cuando exista obligación, se presenta del 1 de enero al 14 de febrero del ejercicio en que deba surtir efectos.",
          ],
        },
      ],
    },
    {
      id: "model-840-activities",
      title: "Actividades, secciones y epígrafes",
      cards: [
        {
          title: "Sección 1",
          paragraphs: [
            "Comprende actividades empresariales, incluidas muchas actividades comerciales, industriales y de servicios.",
          ],
        },
        {
          title: "Sección 2",
          paragraphs: [
            "Comprende actividades profesionales ejercidas personalmente por personas físicas. Una sociedad que presta servicios profesionales se clasifica normalmente en la sección empresarial correspondiente.",
          ],
        },
        {
          title: "Sección 3",
          paragraphs: ["Comprende actividades artísticas."],
        },
        {
          title: "Actividades no sujetas",
          paragraphs: [
            "Determinadas actividades agrícolas, forestales, pesqueras y ganaderas dependientes no están sujetas. La ganadería independiente puede recibir un tratamiento distinto.",
          ],
        },
      ],
      note: "El alta se formula separadamente por cada actividad. Los locales se declaran según su uso y las reglas de la cuota; no todo inmueble exige automáticamente otro 840.",
    },
    {
      id: "model-840-quota-authority",
      title: "Cuota y administración competente",
      cards: [
        {
          title: "Cuota municipal",
          paragraphs: [
            "Se refiere al ejercicio en un término municipal. Si la gestión censal está delegada, puede presentarse ante la entidad local y con su propio modelo.",
          ],
        },
        {
          title: "Cuota provincial",
          paragraphs: [
            "Habilita el ejercicio en la provincia y se presenta ante la AEAT del ámbito que corresponda.",
          ],
        },
        {
          title: "Cuota nacional",
          paragraphs: [
            "Habilita el ejercicio en todo el territorio nacional y se tramita ante la AEAT.",
          ],
        },
        {
          title: "Lugar de presentación",
          paragraphs: [
            "Depende del tipo de cuota, del municipio y de si existe delegación de la gestión censal. Debe comprobarse antes de enviar el 840 estatal.",
          ],
        },
      ],
    },
    {
      id: "model-840-deadlines",
      title: "Plazos de alta, variación y baja",
      cards: [
        {
          title: "Alta",
          paragraphs: [
            "El contribuyente no exento presenta el alta dentro de un mes desde el inicio de la actividad.",
          ],
        },
        {
          title: "Variación",
          paragraphs: [
            "Se comunica dentro de un mes desde la fecha en que se produce la variación relevante.",
          ],
        },
        {
          title: "Baja",
          paragraphs: [
            "Se presenta dentro de un mes desde el cese de la actividad.",
          ],
        },
        {
          title: "Cambio de exención",
          paragraphs: [
            "La pérdida o adquisición del derecho se comunica durante diciembre anterior al año en que deba surtir efecto.",
          ],
        },
      ],
      note: "Estos plazos son propios del Modelo 840. No uses el plazo previo al inicio del Modelo 036 para explicar este trámite.",
    },
    {
      id: "model-840-payment",
      title: "El Modelo 840 no es el pago",
      cards: [
        {
          title: "Declaración censal del impuesto",
          paragraphs: [
            "El 840 comunica los elementos necesarios, pero no produce un pago inmediato dentro del propio formulario.",
          ],
        },
        {
          title: "Liquidación o recibo",
          paragraphs: [
            "La Administración competente emite posteriormente el recibo o liquidación y fija el periodo de pago.",
          ],
        },
        {
          title: "Cuotas provinciales y nacionales",
          paragraphs: [
            "La AEAT publica cada año una resolución con el plazo de ingreso de estas cuotas.",
          ],
        },
        {
          title: "Cese y devolución",
          paragraphs: [
            "Si se cesa antes de acabar el año puede solicitarse la devolución por los trimestres naturales completos posteriores al cese; no se devuelve el trimestre del cese.",
          ],
        },
      ],
    },
    {
      id: "model-840-checklist",
      title: "Datos que conviene preparar",
      accordions: [
        {
          question: "¿Eres realmente no exento?",
          paragraphs: [
            "Comprueba forma jurídica, cifra de negocios, grupo, inicio real y exenciones específicas.",
          ],
        },
        {
          question: "¿Qué actividad y cuota corresponden?",
          paragraphs: [
            "Identifica epígrafe, sección, municipio, ámbito de cuota, locales y elementos tributarios.",
          ],
        },
        {
          question: "¿Quién gestiona el censo?",
          paragraphs: [
            "Verifica si corresponde AEAT o una entidad local con gestión delegada y usa su canal correcto.",
          ],
        },
      ],
    },
    {
      id: "model-840-territory",
      title: "Ámbito territorial",
      note: TERRITORIAL_NOTE,
    },
  ],
  fillingTitle: "Cómo preparar el Modelo 840",
  fillingSteps: [
    {
      title: "1. Verifica la exención",
      paragraphs: [
        "Descarta el 840 si eres persona física y revisa el límite y las demás exenciones si eres una entidad.",
      ],
    },
    {
      title: "2. Clasifica la actividad",
      paragraphs: [
        "Selecciona sección, epígrafe y tipo de cuota con el buscador oficial.",
      ],
    },
    {
      title: "3. Identifica el hecho",
      paragraphs: [
        "Distingue alta, variación, baja o cambio de exención y fija la fecha exacta.",
      ],
    },
    {
      title: "4. Reúne elementos",
      paragraphs: [
        "Prepara locales, superficie, potencia, empleados u otros elementos que exijan las tarifas aplicables.",
      ],
    },
    {
      title: "5. Presenta ante quien corresponda",
      paragraphs: [
        "Comprueba AEAT o gestión delegada, firma y conserva el justificante.",
      ],
    },
  ],
  afterTitle: "Después de presentar",
  afterSteps: [
    {
      title: "Revisa la liquidación",
      description:
        "Comprueba actividad, cuota, municipio y elementos cuando llegue el recibo o liquidación.",
    },
    {
      title: "Paga en su plazo",
      description:
        "El vencimiento figura en el recibo o en la resolución anual aplicable.",
    },
    {
      title: "Comunica cambios",
      description:
        "Presenta variación o baja dentro de un mes y solicita devolución por cese cuando proceda.",
    },
  ],
  comparison: {
    title: "Modelos 036, 840 y 848",
    current: {
      title: "Modelo 840",
      description:
        "Alta, variación o baja en el IAE para contribuyentes no exentos.",
    },
    related: {
      title: "Modelo 036",
      description:
        "Comunica actividades de personas y entidades exentas y mantiene la situación censal general.",
      href: "/consultor-fiscal/modelos/036",
      label: "Ver Modelo 036",
    },
    additional: [
      {
        title: "Modelo 848",
        description:
          "Comunica la cifra de negocios en determinados casos, no el alta o baja de una actividad.",
        href: "/consultor-fiscal/modelos/848",
        label: "Ver Modelo 848",
      },
    ],
    conclusion:
      "Una persona física utiliza el 036. Una entidad no exenta puede necesitar a la vez el 036 y el 840; el 848 tiene una finalidad diferente.",
  },
  pdfNotice: [
    "El formulario y los trámites se abren en la Sede oficial. Factu no presenta, firma, paga ni envía el Modelo 840.",
  ],
  documents: [],
  officialLinks: [
    {
      label: "Qué es el IAE",
      href: "https://sede.agenciatributaria.gob.es/Sede/declaraciones-informativas-otros-impuestos-tasas/impuesto-sobre-actividades-economicas/que-iae.html",
    },
    {
      label: "Quién debe presentar la declaración",
      href: "https://sede.agenciatributaria.gob.es/Sede/declaraciones-informativas-otros-impuestos-tasas/impuesto-sobre-actividades-economicas/tengo-que-presentar-declaracion-iae.html",
    },
    {
      label: "Qué actividades se declaran",
      href: "https://sede.agenciatributaria.gob.es/Sede/declaraciones-informativas-otros-impuestos-tasas/impuesto-sobre-actividades-economicas/que-actividades-debo-declarar.html",
    },
    {
      label: "Plazos del Modelo 840",
      href: "https://sede.agenciatributaria.gob.es/Sede/declaraciones-informativas-otros-impuestos-tasas/impuesto-sobre-actividades-economicas/cuando-tengo-que-presentar-declaracion-840.html",
    },
    {
      label: "Lugar y forma de presentación",
      href: "https://sede.agenciatributaria.gob.es/Sede/declaraciones-informativas-otros-impuestos-tasas/impuesto-sobre-actividades-economicas/lugar-forma-presentar-declaracion.html",
    },
    {
      label: "Cómo se paga el IAE",
      href: "https://sede.agenciatributaria.gob.es/Sede/declaraciones-informativas-otros-impuestos-tasas/impuesto-sobre-actividades-economicas/cuando-se-paga-iae.html",
    },
    {
      label: "Devolución de cuota por cese",
      href: "https://sede.agenciatributaria.gob.es/Sede/declaraciones-informativas-otros-impuestos-tasas/impuesto-sobre-actividades-economicas/tengo-derecho-cuota-antes-finalizar-ano.html",
    },
  ],
  legalLinks: [
    {
      label: "Orden HAC/2572/2003",
      sourceId: "boe.order-hac-2572-2003.model-840.2026-07-14",
    },
    {
      label: "Ley Reguladora de las Haciendas Locales",
      href: "https://www.boe.es/buscar/act.php?id=BOE-A-2004-4214",
    },
    {
      label: "Tarifas e instrucción del IAE",
      href: "https://www.boe.es/buscar/act.php?id=BOE-A-1990-23930",
    },
    {
      label: "Normas de gestión del IAE",
      href: "https://www.boe.es/buscar/act.php?id=BOE-A-1995-5917",
    },
  ],
  faq: [
    {
      question: "¿Un autónomo persona física presenta el Modelo 840?",
      answer:
        "No. Está exento del IAE y comunica sus actividades mediante el Modelo 036.",
    },
    {
      question:
        "¿Si facturo más de un millón dejo de estar exento como persona física?",
      answer: "No. Una persona física continúa exenta.",
    },
    {
      question: "¿Estar exento significa que no debo elegir un epígrafe?",
      answer: "No. La actividad debe comunicarse mediante el Modelo 036.",
    },
    {
      question: "¿Quién presenta el Modelo 840?",
      answer: "Principalmente empresas y entidades no exentas del IAE.",
    },
    {
      question: "¿Cuál es el límite general para una sociedad?",
      answer:
        "Un importe neto de cifra de negocios igual o superior a un millón de euros, salvo otras exenciones aplicables.",
    },
    {
      question: "¿Una empresa nueva paga desde el primer año?",
      answer:
        "Puede estar exenta durante los dos primeros periodos si se trata de un inicio real de actividad.",
    },
    {
      question: "¿Qué diferencia existe entre 036 y 840?",
      answer:
        "El 036 comunica el censo general y las actividades de los exentos; el 840 comunica el IAE de los no exentos.",
    },
    {
      question: "¿Qué es el Modelo 848?",
      answer:
        "Una comunicación de la cifra de negocios para determinados contribuyentes obligados al IAE.",
    },
    {
      question: "¿Tengo que presentar un Modelo 840 por cada actividad?",
      answer: "Sí, las altas se formulan separadamente por actividad.",
    },
    {
      question: "¿Cuándo se presenta el alta?",
      answer: "Dentro de un mes desde el comienzo de la actividad.",
    },
    {
      question: "¿Cuándo comunico que dejo de estar exento?",
      answer:
        "Durante diciembre del año anterior a aquel en que comienza la obligación.",
    },
    {
      question: "¿El Modelo 840 sirve para pagar?",
      answer: "No. La liquidación o recibo se emite posteriormente.",
    },
    {
      question: "¿Dónde se presenta?",
      answer:
        "Depende de si la cuota es municipal, provincial o nacional y de si la gestión está delegada.",
    },
    {
      question: "¿Puedo recuperar parte de la cuota si ceso?",
      answer:
        "Sí, por los trimestres completos posteriores al cese, excluyendo el trimestre en que se produce.",
    },
    {
      question: "¿Puede presentarlo mi asesor?",
      answer: "Sí, mediante los sistemas de representación admitidos.",
    },
  ],
  sourceIds: [
    "aeat.model-840-848.procedure-home.2026-07-14",
    "aeat.model-840-848.procedure-record.2026-07-14",
    "boe.order-hac-2572-2003.model-840.2026-07-14",
  ],
} as const satisfies FiscalModelPracticalGuideV1;
