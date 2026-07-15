import type { FiscalModelPracticalGuideV1 } from "./fiscal-model-practical-guide.types";

export const MODEL_173_GUIDE_V1 = {
  code: "173",
  effectiveYear: 2026,
  taxPeriodYear: 2025,
  filingYear: 2026,
  lastVerifiedAt: "2026-07-15",
  requiresAnnualReview: true,
  intro: [
    "El Modelo 173 es la declaración informativa anual sobre operaciones con monedas virtuales. Lo presentan determinados proveedores e intermediarios sujetos en España; el usuario ordinario no lo presenta por comprar, vender, permutar o transferir sus propias monedas.",
    "Las operaciones se comunican individualmente mediante mensajes XML. El modelo no calcula ganancias o pérdidas ni sustituye la declaración del impuesto que corresponda al usuario o al proveedor.",
  ],
  notices: [
    {
      title: "Operaciones individuales, no un saldo anual",
      paragraphs: [
        "Adquisiciones, transmisiones, permutas, transferencias y entregas vinculadas a ofertas iniciales se identifican por operación conforme al diseño oficial; no deben reducirse a un único total.",
      ],
    },
    {
      title: "Sin claves, wallets ni XML en Factu",
      paragraphs: [
        "La ficha no solicita direcciones, claves privadas, identidades, importes o documentos del usuario y no genera, firma ni envía mensajes a la AEAT.",
      ],
    },
  ],
  actions: [
    {
      label: "Comprobar quién presenta el Modelo 173",
      sourceId: "aeat.model-173.faq.2026-07-08",
      primary: true,
    },
    {
      label: "Abrir la página oficial del Modelo 173",
      sourceId: "aeat.model-173.procedure-home.2026-05-28",
    },
    {
      label: "Comparar con el Modelo 172",
      internalHref: "/consultor-fiscal/modelos/172",
    },
  ],
  quickSummaryTitle: "Modelo 173 en un vistazo",
  quickFacts: [
    {
      label: "Quién lo presenta",
      value:
        "Determinados proveedores de cambio, intermediación, custodia u ofertas iniciales sujetos en España.",
    },
    {
      label: "Quién no lo presenta",
      value:
        "El usuario ordinario por operar con sus propias monedas virtuales.",
    },
    {
      label: "Qué informa",
      value:
        "Adquisiciones, transmisiones, permutas, transferencias y entregas de monedas nuevas.",
    },
    {
      label: "Detalle",
      value:
        "Cada operación se registra individualmente, no como agregado anual.",
    },
    { label: "Periodicidad", value: "Anual, durante enero del año siguiente." },
    {
      label: "Canal",
      value: "Servicio web mediante mensajes XML conforme al diseño oficial.",
    },
  ],
  sections: [
    {
      id: "model-173-obligated",
      title: "Quién debe presentarlo",
      cards: [
        {
          title: "Cambio e intermediación",
          paragraphs: [
            "Personas o entidades sujetas en España que proporcionan servicios de cambio entre monedas virtuales y moneda fiduciaria o entre diferentes monedas virtuales, o que intermedian en esas operaciones.",
          ],
        },
        {
          title: "Custodia conectada a operaciones",
          paragraphs: [
            "Determinados proveedores que salvaguardan claves por cuenta de terceros pueden estar incluidos cuando realizan o intermedian operaciones comprendidas en la obligación.",
          ],
        },
        {
          title: "Ofertas iniciales",
          paragraphs: [
            "Quienes realicen ofertas iniciales de nuevas monedas virtuales pueden informar las entregas a cambio de otras monedas virtuales o fiduciarias en los términos oficiales.",
          ],
        },
        {
          title: "No basta el asesoramiento",
          paragraphs: [
            "El asesoramiento puro, sin realizar ni intermediar las operaciones comprendidas, no convierte por sí solo en declarante del Modelo 173.",
          ],
        },
      ],
    },
    {
      id: "model-173-operation-types",
      title: "Operaciones que se informan",
      cards: [
        {
          title: "Adquisición y transmisión",
          bullets: [
            "Compra con moneda fiduciaria.",
            "Venta a cambio de moneda fiduciaria.",
            "Fecha, tipo, unidades, valor y contraprestación.",
            "Comisiones y gastos asociados cuando correspondan.",
          ],
        },
        {
          title: "Permuta",
          paragraphs: [
            "El intercambio de una moneda virtual por otra se identifica como permuta, registrando las monedas entregada y recibida, sus unidades, valores y fuente. No debe tratarse como una simple transferencia.",
          ],
        },
        {
          title: "Transferencias",
          bullets: [
            "Entre direcciones o cuentas internas.",
            "Hacia o desde direcciones externas.",
            "Moneda y unidades transferidas.",
            "Origen o destino disponible conforme al diseño.",
          ],
        },
        {
          title: "Ofertas iniciales",
          paragraphs: [
            "Incluye las entregas de monedas virtuales nuevas a cambio de otras monedas virtuales o fiduciarias cuando el proveedor está dentro de la obligación.",
          ],
        },
      ],
    },
    {
      id: "model-173-transfer-signs",
      title: "Signos y tratamiento de transferencias",
      cards: [
        {
          title: "Transferencia saliente",
          paragraphs: [
            "El valor asociado se consigna con signo negativo conforme a la ayuda oficial, mientras el número de unidades se mantiene positivo.",
          ],
        },
        {
          title: "Transferencia entrante",
          paragraphs: [
            "El valor asociado se consigna con signo positivo y las unidades también se expresan en positivo.",
          ],
        },
        {
          title: "Comisiones",
          paragraphs: [
            "Las comisiones se informan en positivo en sus campos, sin cambiar el signo de las unidades de moneda.",
          ],
        },
        {
          title: "No confundir con permuta",
          paragraphs: [
            "Mover una moneda y recibir otra como contraprestación es una permuta; una transferencia traslada la misma moneda entre direcciones o cuentas.",
          ],
        },
      ],
      note: "Los signos pertenecen a los campos técnicos del Modelo 173 y no representan por sí solos una ganancia, pérdida o deuda tributaria.",
    },
    {
      id: "model-173-data-valuation",
      title: "Datos y valoración de cada operación",
      cards: [
        {
          title: "Personas intervinientes",
          bullets: [
            "Identificación fiscal.",
            "Nombre o razón social.",
            "Domicilio y residencia cuando procedan.",
            "Rol en la operación.",
          ],
        },
        {
          title: "Operación",
          bullets: [
            "Tipo y fecha.",
            "Moneda virtual.",
            "Unidades.",
            "Valor en euros.",
            "Comisiones y gastos.",
            "Contraprestación recibida o entregada.",
          ],
        },
        {
          title: "Fuente de valoración",
          paragraphs: [
            "Se documenta la cotización utilizada o, si no existe una referencia disponible, una estimación razonable de mercado conforme a las reglas oficiales.",
          ],
        },
        {
          title: "Registro individual",
          paragraphs: [
            "Cada operación debe conservar su identidad técnica. Agrupar todo el año por cliente puede ocultar permutas, transferencias y signos necesarios.",
          ],
        },
      ],
    },
    {
      id: "model-173-xml",
      title: "Presentación mediante XML",
      intro: [
        "La declaración se presenta enviando mensajes XML al servicio web de acuerdo con el anexo y la documentación técnica de la AEAT.",
      ],
      accordions: [
        {
          question: "¿Puede utilizarse un formulario manual?",
          paragraphs: [
            "La página oficial describe el canal mediante servicio web. Esta guía no transforma los campos en un formulario propio.",
          ],
        },
        {
          question: "¿Qué debe validarse?",
          paragraphs: [
            "Esquema, identificación, tipos de operación, signos, valores, referencias y respuesta de aceptación o error del servicio.",
          ],
        },
        {
          question: "¿Un XML guardado equivale a presentado?",
          paragraphs: [
            "No. Solo la respuesta y el justificante del servicio oficial acreditan el envío; Factu no realiza esa transmisión.",
          ],
        },
      ],
    },
    {
      id: "model-173-deadline",
      title: "Plazo anual",
      cards: [
        {
          title: "Regla general",
          paragraphs: [
            "Durante enero del año siguiente a aquel al que corresponde la información.",
          ],
        },
        {
          title: "Información de 2025",
          paragraphs: [
            "La campaña oficial se extiende del 1 de enero al 2 de febrero de 2026. Se conserva como dato de campaña, no como fecha permanente.",
          ],
        },
        {
          title: "Incidencia técnica",
          paragraphs: [
            "Puede existir un plazo adicional de cuatro días naturales cuando la imposibilidad técnica se encuentre dentro de los supuestos previstos.",
          ],
        },
        {
          title: "Revisión anual",
          paragraphs: [
            "Antes de cada envío se revisan plazo, esquema y versiones del servicio web en la sede oficial.",
          ],
        },
      ],
    },
    {
      id: "model-173-relations",
      title: "Diferencia con 172 y 721",
      cards: [
        {
          title: "Modelo 173",
          paragraphs: [
            "Operaciones individuales informadas por el proveedor o intermediario sujeto.",
          ],
        },
        {
          title: "Modelo 172",
          paragraphs: [
            "Saldos de clientes informados por el custodio sujeto en España.",
          ],
          links: [
            {
              label: "Consultar el Modelo 172",
              href: "/consultor-fiscal/modelos/172",
            },
          ],
        },
        {
          title: "Modelo 721",
          paragraphs: [
            "Monedas custodiadas en el extranjero que declara el titular o persona con poder de disposición cuando proceda.",
          ],
          links: [
            {
              label: "Consultar el Modelo 721",
              href: "/consultor-fiscal/modelos/721",
            },
          ],
        },
        {
          title: "Impuestos del usuario",
          paragraphs: [
            "El Modelo 173 no sustituye el Modelo 100, 200, 303 u otro que corresponda para declarar efectos fiscales de las operaciones.",
          ],
        },
      ],
    },
    {
      id: "model-173-mistakes",
      title: "Errores habituales",
      cards: [
        {
          title: "Confundir sujeto",
          bullets: [
            "Pedir al usuario que presente el 173.",
            "Considerar declarante a un asesor sin intermediación.",
            "No revisar residencia o establecimiento del proveedor.",
          ],
        },
        {
          title: "Agrupar operaciones",
          bullets: [
            "Informar solo saldos.",
            "Unir adquisiciones y ventas.",
            "Omitir transferencias internas o externas.",
            "Perder el detalle de permutas.",
          ],
        },
        {
          title: "Aplicar signos incorrectos",
          bullets: [
            "Unidades negativas.",
            "Comisiones negativas.",
            "No diferenciar valor entrante y saliente.",
          ],
        },
        {
          title: "Confundir modelos",
          bullets: [
            "Aplicar el umbral del 721.",
            "Usar el 172 para operaciones.",
            "Creer que el 173 liquida la ganancia del usuario.",
          ],
        },
      ],
    },
  ],
  fillingTitle: "Cómo preparar la información del Modelo 173",
  fillingSteps: [
    {
      title: "1. Confirmar al proveedor",
      paragraphs: [
        "Revisar servicios prestados, residencia o establecimiento y si realiza o intermedia operaciones incluidas.",
      ],
    },
    {
      title: "2. Clasificar cada operación",
      paragraphs: [
        "Separar adquisición, transmisión, permuta, transferencia y entrega de moneda nueva.",
      ],
    },
    {
      title: "3. Completar datos y valoración",
      paragraphs: [
        "Identificar intervinientes, monedas, unidades, valores, contraprestación, comisiones y fuente.",
      ],
    },
    {
      title: "4. Validar el XML",
      paragraphs: [
        "Aplicar esquemas, signos y referencias oficiales, transmitir por el servicio autorizado y conservar la respuesta fuera de Factu.",
      ],
    },
  ],
  afterTitle: "Después del envío",
  afterSteps: [
    {
      title: "Comprobar aceptación",
      description:
        "Revisar mensajes de respuesta y no confundir archivo generado con declaración presentada.",
    },
    {
      title: "Corregir por operación",
      description:
        "Mantener las referencias individuales para modificar o anular sin duplicar información.",
    },
    {
      title: "Conservar valoración",
      description:
        "Guardar cotización, fecha, moneda y método utilizados en cada operación.",
    },
  ],
  comparison: {
    title: "Operaciones, saldos y custodia extranjera",
    current: {
      title: "Modelo 173",
      description:
        "Operaciones individuales que comunica el proveedor o intermediario sujeto.",
    },
    related: {
      title: "Modelo 172",
      description: "Saldos que comunica el custodio sujeto en España.",
      href: "/consultor-fiscal/modelos/172",
      label: "Ver Modelo 172",
    },
    additional: [
      {
        title: "Modelo 721",
        description:
          "Criptomonedas custodiadas en el extranjero que declara el titular cuando corresponde.",
        href: "/consultor-fiscal/modelos/721",
        label: "Ver Modelo 721",
      },
    ],
    conclusion:
      "El Modelo 173 no tiene el umbral de 50.000 euros del 721 y tampoco sustituye la declaración de las ganancias o pérdidas del usuario.",
  },
  pdfNotice: [
    "Son documentos técnicos del servicio web. No son formularios visuales ni permiten presentar desde Factu.",
  ],
  documents: [
    {
      label: "Contenido técnico del Modelo 173",
      sourceId: "aeat.model-173.content-design.pdf",
    },
    {
      label: "Descripción del servicio web",
      sourceId: "aeat.model-173.service-description.pdf",
    },
    {
      label: "Validaciones y errores",
      sourceId: "aeat.model-173.validations.pdf",
    },
  ],
  officialLinks: [
    {
      label: "Ficha administrativa del procedimiento",
      sourceId: "aeat.model-173.procedure-record.2026-07-08",
    },
    {
      label: "Preguntas frecuentes oficiales 172 y 173",
      sourceId: "aeat.model-173.faq.2026-07-08",
    },
    {
      label: "Plazo oficial del Modelo 173",
      href: "https://sede.agenciatributaria.gob.es/Sede/todas-gestiones/impuestos-tasas/declaraciones-informativas/modelo-173-decla_____nformativa-sobre-operaciones-virtuales/plazos-presentacion.html",
    },
  ],
  legalLinks: [
    {
      label: "Orden HFP/887/2023",
      sourceId: "boe.models-172-173.order-hfp-887-2023",
    },
  ],
  faq: [
    {
      question: "¿Quién presenta el Modelo 173?",
      answer:
        "Determinados proveedores e intermediarios de operaciones con monedas virtuales sujetos en España.",
    },
    {
      question: "¿Lo presenta el usuario?",
      answer:
        "No por operar con sus propias monedas. El usuario declara sus impuestos por los modelos que le correspondan.",
    },
    {
      question: "¿Qué operaciones incluye?",
      answer:
        "Adquisiciones, transmisiones, permutas, transferencias y determinadas entregas de monedas nuevas.",
    },
    {
      question: "¿Incluye transferencias internas y externas?",
      answer:
        "Sí, cuando se encuentran dentro de la información exigida, identificando origen o destino conforme al diseño.",
    },
    {
      question: "¿Una permuta es una transferencia?",
      answer:
        "No. En una permuta se intercambia una moneda por otra y deben identificarse ambas.",
    },
    {
      question: "¿Cómo se usan los signos en transferencias?",
      answer:
        "El valor es negativo en salidas y positivo en entradas; las unidades y comisiones se informan en positivo.",
    },
    {
      question: "¿Las operaciones se agregan?",
      answer: "No. Se informan individualmente con sus datos y referencias.",
    },
    {
      question: "¿Incluye ofertas iniciales?",
      answer:
        "Sí, determinadas entregas de nuevas monedas a cambio de moneda fiduciaria o virtual.",
    },
    {
      question: "¿El asesoramiento puro obliga?",
      answer:
        "No por sí solo si no existe realización o intermediación de operaciones comprendidas.",
    },
    {
      question: "¿Existe el límite de 50.000 euros?",
      answer:
        "No. Ese umbral pertenece al Modelo 721, con otro sujeto y ámbito.",
    },
    {
      question: "¿Cómo y cuándo se presenta?",
      answer:
        "Por servicio web XML, con carácter anual durante enero del año siguiente.",
    },
    {
      question: "¿Qué diferencia hay con el 172?",
      answer: "El 173 informa operaciones; el 172 informa saldos.",
    },
  ],
  sourceIds: [
    "aeat.model-173.procedure-home.2026-05-28",
    "aeat.model-173.procedure-record.2026-07-08",
    "aeat.model-173.faq.2026-07-08",
    "aeat.model-173.content-design.pdf",
    "aeat.model-173.service-description.pdf",
    "aeat.model-173.validations.pdf",
    "boe.models-172-173.order-hfp-887-2023",
  ],
} as const satisfies FiscalModelPracticalGuideV1;
