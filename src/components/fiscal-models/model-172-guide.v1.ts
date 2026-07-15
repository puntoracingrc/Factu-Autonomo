import type { FiscalModelPracticalGuideV1 } from "./fiscal-model-practical-guide.types";

export const MODEL_172_GUIDE_V1 = {
  code: "172",
  effectiveYear: 2026,
  taxPeriodYear: 2025,
  filingYear: 2026,
  lastVerifiedAt: "2026-07-15",
  requiresAnnualReview: true,
  intro: [
    "El Modelo 172 es la declaración informativa anual sobre saldos en monedas virtuales. Lo presentan determinados custodios residentes o establecidos en España que salvaguardan claves privadas por cuenta de terceros; no lo presenta el cliente por tener criptomonedas en ese custodio.",
    "Informa saldos de cada moneda virtual y, en su caso, moneda fiduciaria mantenida por cuenta de terceros. No calcula ganancias, pérdidas ni impuestos y se transmite mediante mensajes XML por servicio web oficial.",
  ],
  notices: [
    {
      title: "No aplica el límite de 50.000 euros del Modelo 721",
      paragraphs: [
        "El 172 y el 721 tienen sujetos y ámbitos distintos. El custodio obligado al 172 no deja de informar porque el saldo de un cliente sea inferior a 50.000 euros.",
      ],
    },
    {
      title: "Factu no custodia datos ni criptomonedas",
      paragraphs: [
        "Esta ficha no solicita claves, direcciones, saldos, identidades, XML ni información financiera y no conecta con el servicio web de la AEAT.",
      ],
    },
  ],
  actions: [
    {
      label: "Comprobar quién presenta el Modelo 172",
      sourceId: "aeat.model-172.faq.2026-07-08",
      primary: true,
    },
    {
      label: "Abrir la página oficial del Modelo 172",
      sourceId: "aeat.model-172.procedure-home.2026-05-25",
    },
    {
      label: "Comparar con el Modelo 173",
      internalHref: "/consultor-fiscal/modelos/173",
    },
  ],
  quickSummaryTitle: "Modelo 172 en un vistazo",
  quickFacts: [
    {
      label: "Quién lo presenta",
      value:
        "El proveedor que custodia claves privadas por cuenta de terceros y está sujeto en España.",
    },
    {
      label: "Quién no lo presenta",
      value:
        "El titular o cliente ordinario por tener monedas en un custodio español obligado.",
    },
    {
      label: "Qué informa",
      value:
        "Saldos de monedas virtuales y determinados saldos fiduciarios de terceros.",
    },
    {
      label: "Fecha de referencia",
      value: "31 de diciembre o la fecha anterior en que terminó la custodia.",
    },
    { label: "Periodicidad", value: "Anual, durante enero del año siguiente." },
    {
      label: "Canal",
      value:
        "Servicio web mediante mensajes XML; no existe formulario interactivo en Factu.",
    },
  ],
  sections: [
    {
      id: "model-172-obligated",
      title: "Quién debe presentarlo",
      cards: [
        {
          title: "Custodios sujetos en España",
          paragraphs: [
            "Personas o entidades residentes en España y establecimientos permanentes en España que salvaguardan claves criptográficas privadas en nombre de terceros para mantener, almacenar o transferir monedas virtuales.",
          ],
        },
        {
          title: "Servicio principal o accesorio",
          paragraphs: [
            "La custodia puede prestarse como actividad principal o en conexión con otra actividad. Lo decisivo es salvaguardar claves por cuenta de terceros dentro del ámbito normativo.",
          ],
        },
        {
          title: "El cliente no declara el 172",
          paragraphs: [
            "Titulares, autorizados y beneficiarios son personas informadas por el custodio; no se convierten por ello en presentadores del 172.",
          ],
        },
        {
          title: "Autocustodia",
          paragraphs: [
            "Quien controla directamente sus claves sin un custodio obligado no genera por ese solo hecho un Modelo 172 del proveedor.",
          ],
        },
      ],
    },
    {
      id: "model-172-people-balances",
      title: "Personas y saldos que se informan",
      cards: [
        {
          title: "Personas relacionadas",
          bullets: [
            "Titulares.",
            "Autorizados.",
            "Beneficiarios.",
            "Otras personas o entidades a quienes correspondan las monedas en algún momento del año, según el diseño aplicable.",
          ],
        },
        {
          title: "Cada moneda por separado",
          bullets: [
            "Tipo de moneda virtual.",
            "Número de unidades.",
            "Valor unitario en euros.",
            "Valor total en euros.",
            "Fuente utilizada para la valoración.",
          ],
        },
        {
          title: "Saldos fiduciarios",
          paragraphs: [
            "También se informan determinados saldos de moneda fiduciaria mantenidos por cuenta de terceros, con su tipo, saldo y conversión a euros cuando sea distinta del euro.",
          ],
        },
        {
          title: "Fin de custodia",
          paragraphs: [
            "Si el custodio dejó de mantener la moneda antes del 31 de diciembre, se informa la situación y valoración en la fecha y hora en que terminó esa custodia.",
          ],
        },
      ],
    },
    {
      id: "model-172-valuation",
      title: "Valoración de los saldos",
      cards: [
        {
          title: "Momento de valoración",
          paragraphs: [
            "La referencia ordinaria es el 31 de diciembre, a las 23:59 hora peninsular, o el momento anterior en que cesó la custodia.",
          ],
        },
        {
          title: "Fuente del precio",
          paragraphs: [
            "Se toma la cotización de las principales plataformas de negociación o sitios de seguimiento de precios; si no existe, una estimación razonable del valor de mercado.",
          ],
        },
        {
          title: "No es el precio de compra",
          paragraphs: [
            "El coste histórico del cliente no sustituye el valor exigido en la fecha de referencia.",
          ],
        },
        {
          title: "Moneda fiduciaria",
          paragraphs: [
            "Si no está denominada en euros, se usa el tipo de cambio vigente en la fecha de referencia y se informa el tipo aplicado.",
          ],
        },
      ],
    },
    {
      id: "model-172-xml",
      title: "Servicio web XML",
      intro: [
        "La presentación se realiza enviando mensajes en formato XML conforme al anexo y las especificaciones oficiales.",
      ],
      accordions: [
        {
          question: "¿Hay que agrupar monedas o clientes?",
          paragraphs: [
            "No debe sustituirse el diseño individual por totales propios. Cada moneda y persona se estructura conforme a los registros y validaciones oficiales.",
          ],
        },
        {
          question: "¿Qué documentación técnica existe?",
          paragraphs: [
            "La AEAT publica el contenido del modelo, la descripción del servicio web y un documento de validaciones y errores.",
          ],
        },
        {
          question: "¿Factu puede generar o enviar el XML?",
          paragraphs: [
            "No. La guía enlaza la documentación, pero no implementa esquemas, certificados, firma ni transporte AEAT.",
          ],
        },
      ],
    },
    {
      id: "model-172-deadline",
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
            "La campaña oficial se desarrolla del 1 de enero al 2 de febrero de 2026. La fecha concreta no se presenta como regla permanente.",
          ],
        },
        {
          title: "Incidencia técnica",
          paragraphs: [
            "Puede existir un plazo adicional de cuatro días naturales en los supuestos técnicos previstos por la normativa.",
          ],
        },
        {
          title: "Comprobación anual",
          paragraphs: [
            "La fecha y el esquema deben revisarse en la sede antes de cada campaña.",
          ],
        },
      ],
    },
    {
      id: "model-172-relations",
      title: "Diferencia con 173 y 721",
      cards: [
        {
          title: "Modelo 172",
          paragraphs: [
            "Lo presenta el custodio sujeto en España e informa saldos.",
          ],
        },
        {
          title: "Modelo 173",
          paragraphs: [
            "Lo presentan determinados proveedores e intermediarios e informa operaciones individuales.",
          ],
          links: [
            {
              label: "Consultar el Modelo 173",
              href: "/consultor-fiscal/modelos/173",
            },
          ],
        },
        {
          title: "Modelo 721",
          paragraphs: [
            "Lo presenta el titular o persona con poder de disposición cuando las monedas están custodiadas en el extranjero y se cumplen sus requisitos.",
          ],
          links: [
            {
              label: "Consultar el Modelo 721",
              href: "/consultor-fiscal/modelos/721",
            },
          ],
        },
        {
          title: "Sin sustitución automática",
          paragraphs: [
            "Un mismo hecho no debe duplicarse ni trasladarse entre modelos sin revisar custodio, ubicación, sujeto y tipo de información.",
          ],
        },
      ],
    },
    {
      id: "model-172-mistakes",
      title: "Errores habituales",
      cards: [
        {
          title: "Confundir al presentador",
          bullets: [
            "Pedir al cliente que presente el 172.",
            "Confundir custodio español con custodio extranjero.",
            "Equiparar autocustodia y custodia de terceros.",
          ],
        },
        {
          title: "Valorar mal",
          bullets: [
            "Usar precio de compra.",
            "No indicar fuente.",
            "Agrupar monedas diferentes.",
            "Olvidar la fecha de fin de custodia.",
          ],
        },
        {
          title: "Aplicar el 721",
          bullets: [
            "Usar su umbral de 50.000 euros.",
            "Duplicar la información del custodio.",
            "Confundir la obligación del titular con la del proveedor.",
          ],
        },
        {
          title: "Tratar XML como formulario",
          bullets: [
            "Crear un PDF o CSV no previsto.",
            "Ignorar validaciones.",
            "Considerar un mensaje generado como presentado.",
          ],
        },
      ],
    },
  ],
  fillingTitle: "Cómo preparar la información del Modelo 172",
  fillingSteps: [
    {
      title: "1. Confirmar el custodio",
      paragraphs: [
        "Revisar residencia o establecimiento permanente y el servicio efectivo de custodia de claves por cuenta de terceros.",
      ],
    },
    {
      title: "2. Identificar personas",
      paragraphs: [
        "Separar titulares, autorizados y beneficiarios con sus datos oficiales.",
      ],
    },
    {
      title: "3. Calcular la foto de saldos",
      paragraphs: [
        "Tratar cada moneda y cada persona en la fecha de referencia, incluida la moneda fiduciaria cuando proceda.",
      ],
    },
    {
      title: "4. Validar y transmitir",
      paragraphs: [
        "Aplicar el esquema XML y las validaciones oficiales, firmar en el sistema autorizado y conservar respuesta y justificante fuera de Factu.",
      ],
    },
  ],
  afterTitle: "Después del envío",
  afterSteps: [
    {
      title: "Revisar validaciones",
      description:
        "Comprobar respuesta, errores y registros aceptados; un XML construido no acredita presentación.",
    },
    {
      title: "Corregir con trazabilidad",
      description:
        "Mantener identificadores y referencias para modificar o anular sin duplicar saldos.",
    },
    {
      title: "Conservar la fuente",
      description:
        "Documentar cotización, tipo de cambio, fecha y hora utilizados para cada valoración.",
    },
  ],
  comparison: {
    title: "Saldos, operaciones y custodia extranjera",
    current: {
      title: "Modelo 172",
      description: "Saldos informados por el custodio sujeto en España.",
    },
    related: {
      title: "Modelo 173",
      description:
        "Operaciones individuales informadas por determinados proveedores.",
      href: "/consultor-fiscal/modelos/173",
      label: "Ver Modelo 173",
    },
    additional: [
      {
        title: "Modelo 721",
        description:
          "Monedas virtuales custodiadas en el extranjero que declara el titular cuando procede.",
        href: "/consultor-fiscal/modelos/721",
        label: "Ver Modelo 721",
      },
    ],
    conclusion:
      "No hay un umbral común: primero se identifica al sujeto, dónde está el custodio y si se informan saldos u operaciones.",
  },
  pdfNotice: [
    "Son documentos técnicos del servicio web. No son formularios visuales ni declaraciones listas para presentar y Factu no interpreta ni transmite sus XML.",
  ],
  documents: [
    {
      label: "Contenido técnico del Modelo 172",
      sourceId: "aeat.model-172.content-design.pdf",
    },
    {
      label: "Descripción del servicio web",
      sourceId: "aeat.model-172.service-description.pdf",
    },
    {
      label: "Validaciones y errores",
      sourceId: "aeat.model-172.validations.pdf",
    },
  ],
  officialLinks: [
    {
      label: "Ficha administrativa del procedimiento",
      sourceId: "aeat.model-172.procedure-record.2026-07-08",
    },
    {
      label: "Preguntas frecuentes oficiales 172 y 173",
      sourceId: "aeat.model-172.faq.2026-07-08",
    },
    {
      label: "Plazo oficial del Modelo 172",
      href: "https://sede.agenciatributaria.gob.es/Sede/todas-gestiones/impuestos-tasas/declaraciones-informativas/modelo-172-declaracion-informativa-sobre-virtuales/plazos-presentacion.html",
    },
  ],
  legalLinks: [
    {
      label: "Orden HFP/887/2023",
      sourceId: "boe.models-172-173.order-hfp-887-2023",
    },
    {
      label: "Orden HAC/1504/2024",
      sourceId: "boe.model-172.order-hac-1504-2024",
    },
  ],
  faq: [
    {
      question: "¿Quién presenta el Modelo 172?",
      answer:
        "Determinados custodios residentes o establecidos en España que salvaguardan claves privadas por cuenta de terceros.",
    },
    {
      question: "¿Lo presenta el cliente?",
      answer:
        "No por ser titular, autorizado o beneficiario en un custodio español obligado.",
    },
    {
      question: "¿Qué saldos se informan?",
      answer:
        "Los de cada moneda virtual y determinados saldos fiduciarios mantenidos por cuenta de terceros.",
    },
    {
      question: "¿Qué fecha se utiliza?",
      answer:
        "El 31 de diciembre o la fecha anterior en que terminó la custodia de la moneda o saldo informado.",
    },
    {
      question: "¿Cómo se valora una criptomoneda?",
      answer:
        "Con la cotización de plataformas principales o sitios de seguimiento y, si no existe, una estimación razonable de mercado.",
    },
    {
      question: "¿Se usa el precio de compra?",
      answer:
        "No. Se usa el valor en la fecha de referencia y se conserva su fuente.",
    },
    {
      question: "¿Se agrupan todas las monedas?",
      answer:
        "No. Cada tipo de moneda se informa por separado con unidades y valoración.",
    },
    {
      question: "¿Incluye moneda fiduciaria?",
      answer:
        "Sí, determinados saldos mantenidos por cuenta de terceros, convertidos a euros cuando proceda.",
    },
    {
      question: "¿Existe un límite de 50.000 euros?",
      answer:
        "No para el Modelo 172. Ese umbral pertenece a otro ámbito del Modelo 721.",
    },
    {
      question: "¿Cómo se presenta?",
      answer:
        "Mediante mensajes XML enviados al servicio web conforme a las especificaciones oficiales.",
    },
    {
      question: "¿Cuándo se presenta?",
      answer:
        "Durante enero del año siguiente; la campaña de 2025 termina el 2 de febrero de 2026.",
    },
    {
      question: "¿Qué diferencia hay con el 173?",
      answer: "El 172 informa saldos; el 173 informa operaciones individuales.",
    },
  ],
  sourceIds: [
    "aeat.model-172.procedure-home.2026-05-25",
    "aeat.model-172.procedure-record.2026-07-08",
    "aeat.model-172.faq.2026-07-08",
    "aeat.model-172.content-design.pdf",
    "aeat.model-172.service-description.pdf",
    "aeat.model-172.validations.pdf",
    "boe.models-172-173.order-hfp-887-2023",
    "boe.model-172.order-hac-1504-2024",
  ],
} as const satisfies FiscalModelPracticalGuideV1;
