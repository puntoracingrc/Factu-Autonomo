import type { FiscalModelPracticalGuideV1 } from "./fiscal-model-practical-guide.types";

const TERRITORIAL_NOTE =
  "Esta guía se refiere al IVA europeo y a los trámites presentados en España como Estado miembro de identificación. La Península y Baleares forman el territorio de aplicación del IVA español. Canarias, Ceuta y Melilla tienen particularidades específicas. Los empresarios establecidos en Canarias, Ceuta o Melilla pueden utilizar determinados regímenes OSS o IOSS, pero las reglas para elegir régimen, Estado de identificación o intermediario son diferentes.";

export const MODEL_035_GUIDE_V1 = {
  code: "035",
  lastVerifiedAt: "2026-07-14",
  requiresAnnualReview: true,
  intro: [
    "El Formulario 035 sirve para registrarse en los regímenes especiales de ventanilla única del IVA, modificar los datos del registro o solicitar el cese.",
    "No es una declaración periódica de IVA ni sirve para pagar el impuesto: el alta se solicita mediante el 035 y las operaciones incluidas se declaran posteriormente mediante el Modelo 369.",
  ],
  notices: [
    {
      title: "Primero identifica el régimen",
      paragraphs: [
        "OSS e IOSS son regímenes opcionales que simplifican la declaración del IVA en destino. Superar un umbral o tributar en destino no obliga por sí solo a usar OSS: también puede existir la alternativa de registrarse localmente en los Estados de consumo.",
      ],
    },
    {
      title: "Operaciones con consumidores",
      paragraphs: [
        "Los tres regímenes se refieren a operaciones B2C. Una venta a una empresa identificada a efectos de IVA, una operación nacional ordinaria o una venta facilitada por una plataforma que actúe como sujeto pasivo pueden seguir reglas distintas.",
      ],
    },
  ],
  actions: [
    {
      label: "Comprobar qué régimen necesito",
      href: "https://sede.agenciatributaria.gob.es/Sede/iva/iva-comercio-electronico/cuestiones-generales.html",
      primary: true,
    },
    {
      label: "Abrir el Formulario 035 oficial",
      sourceId: "aeat.model-035.procedure-home.2026-07-10",
      primary: true,
    },
    {
      label: "Consultar el Modelo 369",
      internalHref: "/consultor-fiscal/modelos/369",
    },
    {
      label: "Ver la ficha administrativa",
      sourceId: "aeat.model-035.procedure-record.2026-04-01",
    },
    {
      label: "Información general sobre IVA y comercio electrónico",
      href: "https://sede.agenciatributaria.gob.es/Sede/iva/iva-comercio-electronico.html",
    },
  ],
  quickSummaryTitle: "El Formulario 035 en pocas palabras",
  quickFacts: [
    {
      label: "Para qué sirve",
      value: "Alta, modificación y cese en OSS e IOSS.",
    },
    { label: "Qué no hace", value: "No liquida ni paga el IVA." },
    { label: "Regímenes", value: "Unión, exterior de la Unión e importación." },
    { label: "Operaciones", value: "Determinadas ventas y servicios B2C." },
    {
      label: "Un formulario",
      value: "Se presenta un 035 separado por cada régimen.",
    },
    {
      label: "Declaración posterior",
      value: "Modelo 369 trimestral o mensual, según el régimen.",
    },
    { label: "Canal", value: "Electrónico en la Sede de la AEAT." },
    { label: "Resolución", value: "El plazo oficial indicado es de un mes." },
  ],
  sections: [
    {
      id: "form-035-regimes",
      title: "Los tres regímenes de ventanilla única",
      cards: [
        {
          title: "Régimen de la Unión (UOSS)",
          paragraphs: [
            "Puede cubrir ventas intracomunitarias a distancia, determinados servicios B2C prestados en Estados donde el operador no está establecido y ciertas entregas interiores facilitadas por interfaces electrónicas.",
          ],
        },
        {
          title: "Régimen exterior de la Unión (EUOSS)",
          paragraphs: [
            "Se dirige a empresarios o profesionales no establecidos en la Unión que prestan servicios a consumidores situados en la UE.",
          ],
        },
        {
          title: "Régimen de importación (IOSS)",
          paragraphs: [
            "Puede utilizarse para ventas a distancia de bienes importados en envíos de valor intrínseco no superior a 150 euros, excepto productos sujetos a impuestos especiales.",
            "No se aplica a bienes que ya han sido importados y se venden desde existencias situadas dentro de la UE.",
          ],
        },
        {
          title: "Uso completo del régimen",
          paragraphs: [
            "Una vez elegido un régimen, deben incluirse todas las operaciones comprendidas en él. No se puede usar OSS solo para unos países y declarar fuera del régimen otras operaciones equivalentes de otros países.",
          ],
        },
      ],
    },
    {
      id: "form-035-threshold",
      title: "Qué significa el límite europeo de 10.000 euros",
      cards: [
        {
          title: "Qué operaciones suma",
          paragraphs: [
            "El límite conjunto, sin IVA y para toda la UE, se refiere a determinadas ventas intracomunitarias a distancia y a servicios de telecomunicaciones, radiodifusión, televisión y electrónicos a consumidores de otros Estados miembros.",
          ],
        },
        {
          title: "Condiciones",
          paragraphs: [
            "La regla exige, entre otras condiciones, estar establecido únicamente en un Estado miembro. No es un límite por país, cliente o factura.",
          ],
        },
        {
          title: "Qué ocurre al superarlo",
          paragraphs: [
            "Las operaciones afectadas pasan a tributar en destino. Puede usarse el régimen de la Unión para simplificar la declaración, pero también cabe el registro local; superar el límite no obliga automáticamente a OSS.",
          ],
        },
        {
          title: "Qué no significa",
          paragraphs: [
            "No es el límite de IOSS, no se aplica a todos los servicios ni impide optar por la tributación en destino antes de superarlo.",
          ],
        },
      ],
    },
    {
      id: "form-035-registration",
      title: "Alta, identificadores e intermediarios",
      cards: [
        {
          title: "Un 035 por cada régimen",
          paragraphs: [
            "Una misma persona puede estar en varios regímenes, pero debe presentar un Formulario 035 separado para cada uno.",
          ],
        },
        {
          title: "Identificación",
          paragraphs: [
            "Según el régimen y la situación pueden intervenir el NIF y números específicos como NEUOSS o NIOSS. El identificador IOSS debe protegerse y transmitirse de forma segura a quien realiza el despacho; no debe mostrarse públicamente.",
          ],
        },
        {
          title: "Intermediario IOSS",
          paragraphs: [
            "Determinados operadores no establecidos en la UE necesitan un intermediario establecido en la Unión. El intermediario se registra y presenta las declaraciones mensuales por cuenta de cada representado.",
          ],
        },
        {
          title: "Plataformas",
          paragraphs: [
            "Una interfaz electrónica puede ser considerada sujeto pasivo en determinados supuestos. Antes de registrarte, comprueba si declara el vendedor o la plataforma.",
          ],
        },
      ],
    },
    {
      id: "form-035-effects",
      title: "Cuándo produce efectos",
      cards: [
        {
          title: "Unión y exterior de la Unión",
          paragraphs: [
            "Como regla general, el alta produce efectos desde el primer día del trimestre natural siguiente a la solicitud.",
          ],
        },
        {
          title: "Operaciones previas",
          paragraphs: [
            "Puede aplicarse desde la primera operación si se comunica el inicio y se presenta el 035 a más tardar el décimo día del mes siguiente. La fecha no puede ser anterior al primer día del mes previo a la solicitud.",
          ],
        },
        {
          title: "Importación",
          paragraphs: [
            "IOSS comienza cuando se asigna el número individual de operador NIOSS correspondiente.",
          ],
        },
      ],
      note: "Presentar el Formulario 035 no significa necesariamente que el régimen produzca efectos el mismo día.",
    },
    {
      id: "form-035-changes-cessation",
      title: "Modificaciones y cese",
      cards: [
        {
          title: "Cambios",
          paragraphs: [
            "Los cambios de los datos registrados deben comunicarse mediante un 035 de modificación, como máximo el décimo día del mes siguiente al cambio.",
          ],
        },
        {
          title: "Cese voluntario",
          paragraphs: [
            "En los regímenes de la Unión y exterior, debe comunicarse al menos quince días antes del final del trimestre anterior al que se quiere dejar de aplicar. En IOSS, al menos quince días antes del final del mes anterior.",
          ],
        },
        {
          title: "Obligaciones pendientes",
          paragraphs: [
            "El cese no elimina la obligación de presentar los Modelos 369 pendientes, pagar el IVA, corregir periodos anteriores o conservar los registros.",
          ],
        },
      ],
    },
    {
      id: "form-035-related",
      title: "Relación con otros modelos",
      cards: [
        {
          title: "Modelo 036",
          paragraphs: [
            "Es la declaración censal general del autónomo o empresa. No queda sustituida por el Formulario 035.",
          ],
          links: [
            { label: "Ver Modelo 036", href: "/consultor-fiscal/modelos/036" },
          ],
        },
        {
          title: "Modelo 303",
          paragraphs: [
            "Declara el IVA nacional y otras operaciones del régimen general. Puede coexistir con el 369.",
          ],
          links: [
            { label: "Ver Modelo 303", href: "/consultor-fiscal/modelos/303" },
          ],
        },
        {
          title: "Modelo 349",
          paragraphs: [
            "Es informativo para determinadas operaciones intracomunitarias B2B; OSS e IOSS se centran en operaciones B2C.",
          ],
          links: [
            { label: "Ver Modelo 349", href: "/consultor-fiscal/modelos/349" },
          ],
        },
      ],
    },
    {
      id: "form-035-territory",
      title: "Ámbito territorial",
      note: TERRITORIAL_NOTE,
    },
  ],
  fillingTitle: "Cómo preparar el Formulario 035",
  fillingSteps: [
    {
      title: "1. Clasifica las operaciones",
      paragraphs: [
        "Distingue bienes o servicios, B2B o B2C, países de salida y destino y papel de cualquier plataforma.",
      ],
    },
    {
      title: "2. Elige el régimen",
      paragraphs: [
        "Comprueba Unión, exterior de la Unión o importación y si necesitas intermediario.",
      ],
    },
    {
      title: "3. Reúne identificadores",
      paragraphs: [
        "Prepara NIF, establecimientos, números IVA y datos del intermediario cuando corresponda, sin exponer NIOSS.",
      ],
    },
    {
      title: "4. Indica inicio o cambio",
      paragraphs: [
        "Revisa si existen operaciones previas y la fecha exacta que debe producir efectos.",
      ],
    },
    {
      title: "5. Presenta en la AEAT",
      paragraphs: [
        "Firma en el canal oficial y conserva el justificante y el acuerdo de alta, modificación o baja.",
      ],
    },
  ],
  afterTitle: "Después del registro",
  afterSteps: [
    {
      title: "Confirma el régimen",
      description:
        "Comprueba el acuerdo y los identificadores asignados antes de declarar operaciones.",
    },
    {
      title: "Prepara el Modelo 369",
      description:
        "Presenta la declaración trimestral o mensual incluso cuando no haya actividad durante el periodo.",
    },
    {
      title: "Conserva registros",
      description:
        "Mantén el detalle de las operaciones exigido por el régimen y comunícales los cambios a tiempo.",
    },
  ],
  comparison: {
    title: "Formulario 035, Modelo 369 y declaraciones habituales",
    current: {
      title: "Formulario 035",
      description:
        "Registra, modifica o da de baja en OSS e IOSS; no declara ni paga el IVA.",
    },
    related: {
      title: "Modelo 369",
      description:
        "Declara y paga periódicamente el IVA de las operaciones incluidas en el régimen.",
      href: "/consultor-fiscal/modelos/369",
      label: "Ver Modelo 369",
    },
    additional: [
      {
        title: "Modelo 036",
        description:
          "Declaración censal general, que no queda sustituida por el 035.",
        href: "/consultor-fiscal/modelos/036",
        label: "Ver Modelo 036",
      },
      {
        title: "Modelos 303 y 349",
        description:
          "Pueden seguir siendo necesarios para operaciones distintas de las incluidas en OSS o IOSS.",
        href: "/consultor-fiscal/modelos/303",
        label: "Ver Modelo 303",
      },
    ],
    conclusion:
      "El 035 registra; el 369 declara y paga. Los modelos 036, 303 y 349 conservan sus propias funciones.",
  },
  pdfNotice: [
    "El Formulario 035 se cumplimenta en la Sede oficial. Factu no firma, presenta ni envía datos a la Agencia Tributaria.",
  ],
  documents: [],
  officialLinks: [
    {
      label: "Guía del régimen de la Unión",
      sourceId: "aeat.model-035.union-guide.2025-07-29",
    },
    {
      label: "Guía del régimen exterior de la Unión",
      sourceId: "aeat.model-035.non-union-guide.2025-07-28",
    },
    {
      label: "Guía IOSS para el declarante",
      sourceId: "aeat.model-035.import-declarant-guide.2025-07-28",
    },
    {
      label: "Guía IOSS para el intermediario",
      sourceId: "aeat.model-035.import-intermediary-guide.2025-07-29",
    },
  ],
  legalLinks: [
    {
      label: "Orden HAC/611/2021",
      sourceId: "boe.order-hac-611-2021.2021-06-18",
    },
    {
      label: "Ley del IVA consolidada",
      href: "https://www.boe.es/buscar/act.php?id=BOE-A-1992-28740",
    },
    {
      label: "Reglamento del IVA consolidado",
      href: "https://www.boe.es/buscar/act.php?id=BOE-A-1992-28925",
    },
  ],
  faq: [
    {
      question: "¿El Formulario 035 sustituye al Modelo 036?",
      answer:
        "No. El 036 es la declaración censal general y el 035 se utiliza para OSS e IOSS.",
    },
    {
      question: "¿Sirve para pagar el IVA?",
      answer: "No. El IVA se declara mediante el Modelo 369.",
    },
    {
      question: "¿Es obligatorio utilizar OSS o IOSS?",
      answer:
        "No. Son regímenes opcionales, aunque la tributación en destino puede ser obligatoria.",
    },
    {
      question: "¿Qué es el régimen de la Unión?",
      answer:
        "El régimen para determinadas ventas a distancia, servicios B2C y entregas interiores facilitadas por plataformas.",
    },
    {
      question: "¿Qué es el régimen exterior de la Unión?",
      answer:
        "El régimen para determinados servicios B2C prestados por operadores no establecidos en la UE.",
    },
    {
      question: "¿Qué es IOSS?",
      answer:
        "El régimen para determinadas ventas a distancia de bienes importados en envíos de hasta 150 euros.",
    },
    {
      question: "¿El límite de 10.000 euros se aplica a todo?",
      answer:
        "No. Solo se aplica a determinadas operaciones y bajo condiciones concretas.",
    },
    {
      question: "¿Puedo registrarme antes de superar 10.000 euros?",
      answer: "Sí, puede optarse por la tributación en destino.",
    },
    {
      question:
        "¿Puedo utilizar OSS solo para Francia y declarar Italia por separado?",
      answer:
        "No. Una vez elegido el régimen deben incluirse todas las operaciones comprendidas.",
    },
    {
      question: "¿Puedo estar en OSS e IOSS al mismo tiempo?",
      answer:
        "Sí, si realizas operaciones incluidas en ambos regímenes; se presenta un 035 por régimen.",
    },
    {
      question: "¿Cuándo empieza a aplicarse?",
      answer:
        "Depende del régimen, la fecha de presentación y, en su caso, la comunicación de operaciones previas.",
    },
    {
      question: "¿Cómo comunico un cambio?",
      answer:
        "Mediante un Formulario 035 de modificación, normalmente hasta el décimo día del mes siguiente.",
    },
    {
      question: "¿Cómo abandono el régimen?",
      answer:
        "Mediante un Formulario 035 de cese respetando el plazo correspondiente.",
    },
    {
      question: "¿Cuánto tarda la AEAT?",
      answer:
        "El plazo oficial de resolución es de un mes; el recurso o reclamación también dispone, con carácter general, de un mes.",
    },
    {
      question: "¿Puede presentarlo mi asesor?",
      answer: "Sí, mediante representación o colaboración social autorizada.",
    },
  ],
  sourceIds: [
    "aeat.model-035.procedure-home.2026-07-10",
    "aeat.model-035.procedure-record.2026-04-01",
    "aeat.model-035.union-guide.2025-07-29",
    "aeat.model-035.non-union-guide.2025-07-28",
    "aeat.model-035.import-declarant-guide.2025-07-28",
    "aeat.model-035.import-intermediary-guide.2025-07-29",
    "boe.order-hac-611-2021.2021-06-18",
  ],
} as const satisfies FiscalModelPracticalGuideV1;
