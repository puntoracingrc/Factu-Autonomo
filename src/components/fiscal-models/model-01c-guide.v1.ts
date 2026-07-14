import type { FiscalModelPracticalGuideV1 } from "./fiscal-model-practical-guide.types";

export const MODEL_01C_GUIDE_V1 = {
  code: "01C",
  intro: [
    "El Modelo 01C sirve para que un contratista o subcontratista solicite a la Agencia Tributaria un certificado específico que acredita si está al corriente de sus obligaciones tributarias frente a uno o varios pagadores identificados.",
    "El certificado se entrega al cliente o pagador y puede evitar que se le exija una responsabilidad tributaria concreta relacionada con las obras o servicios contratados, siempre que se cumplan los requisitos establecidos por la ley.",
  ],
  notices: [
    {
      title: "No es el certificado general de estar al corriente",
      paragraphs: [
        "El Modelo 01C se utiliza específicamente en determinadas contrataciones o subcontrataciones de obras y servicios y debe identificar al pagador para el que producirá efectos.",
        "No todas las relaciones entre clientes y proveedores requieren este certificado. Su aplicación depende, entre otras cuestiones, de que la obra o el servicio contratado corresponda a la actividad económica principal del pagador.",
      ],
    },
  ],
  actions: [
    {
      label: "Solicitar certificado en la AEAT",
      href: "https://www1.agenciatributaria.gob.es/wlpl/EMCE-JDIT/ContratistasInternetServlet",
      primary: true,
    },
    {
      label: "Consultar estado de la solicitud",
      href: "https://www1.agenciatributaria.gob.es/wlpl/inwinvoc/es.aeat.dit.adu.emce.recogidaCertInt.RceAcciones?fAccion=1&fTipoPet=2&fTramite=G3032",
      primary: true,
    },
    {
      label: "Descargar Modelo 01C oficial",
      sourceId: "aeat.model-01c.form-pdf.2026-06-04",
      primary: true,
    },
    {
      label: "Presentar documentos o alegaciones",
      href: "https://www1.agenciatributaria.gob.es/wlpl/REGD-JDIT/FG?fTramite=G3034",
    },
    {
      label: "Consultar certificados expedidos",
      href: "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/G331.shtml",
    },
    {
      label: "Comprobar documento con CSV",
      href: "https://sede.agenciatributaria.gob.es/Sede/notificaciones-cotejo-documentos/cotejo-documentos.html",
    },
    {
      label: "Pedir cita en la AEAT",
      href: "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GC29.shtml",
    },
    {
      label: "Ver instrucciones oficiales",
      sourceId: "aeat.model-01c.instructions-pdf.2026-06-04",
    },
  ],
  quickSummaryTitle: "El Modelo 01C en pocas palabras",
  quickFacts: [
    {
      label: "Qué es",
      value:
        "Una solicitud de un certificado tributario específico para contratistas y subcontratistas.",
    },
    {
      label: "Quién lo solicita",
      value:
        "Normalmente, el contratista o subcontratista que presta la obra o el servicio.",
    },
    {
      label: "A quién se entrega",
      value: "Al cliente o pagador identificado que abona las facturas.",
    },
    {
      label: "Para qué sirve",
      value:
        "Para acreditar que el contratista está al corriente y limitar una responsabilidad tributaria concreta del pagador en los casos previstos.",
    },
    {
      label: "Plazo oficial",
      value:
        "Tres días hábiles desde la recepción de la solicitud por el órgano competente.",
    },
    {
      label: "Identificación electrónica",
      value: "Cl@ve, certificado electrónico o DNI electrónico.",
    },
    {
      label: "Renovación",
      value:
        "Debe haberse emitido durante los doce meses anteriores al pago de cada factura para producir el efecto legal previsto.",
    },
    {
      label: "Resultado",
      value:
        "Puede ser positivo o denegarse por deudas, declaraciones pendientes o ambos motivos.",
    },
  ],
  sections: [
    {
      id: "model-01c-purpose",
      title: "Para qué sirve",
      intro: [
        "Cuando una empresa o profesional contrata o subcontrata determinadas obras o servicios relacionados con su actividad económica principal, puede existir una responsabilidad tributaria subsidiaria respecto de ciertos impuestos que el contratista no haya ingresado.",
        "El certificado permite que el contratista demuestre al pagador que está al corriente. Cuando se aporta correctamente y se cumplen los demás requisitos legales, puede evitar que Hacienda exija al pagador esa responsabilidad concreta.",
      ],
      note: "El Modelo 01C es la solicitud. El documento que se entrega al pagador es el certificado expedido por la AEAT.",
    },
    {
      id: "model-01c-main-activity",
      title: "Qué significa actividad económica principal",
      intro: [
        "La norma considera incluidas las obras o servicios que, si no se contrataran externamente, tendría que realizar el propio pagador porque resultan indispensables para su finalidad productiva.",
      ],
      note: "Determinar si una obra o servicio forma parte de la actividad económica principal puede requerir analizar el caso concreto. No todos los gastos necesarios de una empresa quedan incluidos automáticamente.",
    },
    {
      id: "model-01c-roles",
      title: "Quién solicita y quién recibe el certificado",
      cards: [
        {
          title: "Contratista o subcontratista",
          bullets: [
            "Solicita el certificado y debe estar correctamente identificado.",
            "Indica para qué pagador o pagadores se solicita.",
            "Entrega después el certificado expedido al pagador.",
          ],
        },
        {
          title: "Pagador",
          bullets: [
            "Es el cliente o entidad que paga las facturas y aparece identificado en la solicitud.",
            "Puede consultar el estado en los términos habilitados por la AEAT.",
            "Debe conservar el certificado entregado por el contratista.",
          ],
        },
      ],
      note: "Si se indican varios pagadores en la misma solicitud, la AEAT emite un certificado individual para cada uno.",
    },
    {
      id: "model-01c-certifies",
      title: "Qué certifica Hacienda",
      intro: [
        "El certificado indica si el contratista o subcontratista se encuentra al corriente de las obligaciones tributarias exigidas para este procedimiento.",
        "La AEAT puede comprobar, entre otras circunstancias, si existen declaraciones obligatorias pendientes o deudas tributarias que impidan emitir un certificado positivo.",
      ],
      accordions: [
        {
          question:
            "¿Qué comprueba Hacienda para considerar que estoy al corriente?",
          paragraphs: [
            "La comprobación se refiere a los requisitos del certificado específico y a la información que consta en las bases tributarias. La AEAT puede valorar el cumplimiento de declaraciones y la existencia de deudas exigibles, entre otras circunstancias previstas en la normativa.",
          ],
        },
      ],
    },
    {
      id: "model-01c-channels",
      title: "Cómo se solicita",
      cards: [
        {
          title: "Por internet",
          paragraphs: [
            "La vía más directa es la solicitud electrónica específica de la AEAT.",
          ],
          bullets: ["Cl@ve.", "Certificado electrónico.", "DNI electrónico."],
        },
        {
          title: "En oficinas",
          paragraphs: [
            "También puede presentarse en una oficina de la Agencia Tributaria mediante el Modelo 01C. Se recomienda solicitar cita antes de acudir.",
            "Para este certificado específico no debe utilizarse el Modelo 01 general.",
          ],
        },
      ],
    },
    {
      id: "model-01c-results",
      title: "Posibles resultados",
      cards: [
        {
          title: "Positivo",
          paragraphs: [
            "El solicitante se encuentra al corriente de las obligaciones exigidas para este certificado.",
          ],
        },
        {
          title: "Denegado por deudas",
          paragraphs: [
            "Existen deudas pendientes que impiden emitir un certificado positivo.",
          ],
        },
        {
          title: "Denegado por declaraciones",
          paragraphs: ["Falta presentar alguna declaración obligatoria."],
        },
        {
          title: "Denegado por ambos motivos",
          paragraphs: ["Existen deudas y, además, declaraciones pendientes."],
        },
      ],
      note: "Un resultado negativo no significa siempre que exista una deuda. También puede deberse a que falta presentar una declaración.",
    },
    {
      id: "model-01c-time-renewal",
      title: "Plazo, duración y renovación",
      cards: [
        {
          title: "Cuánto tarda",
          paragraphs: [
            "El plazo oficial de expedición o denegación es de tres días hábiles desde que el órgano competente recibe la solicitud.",
          ],
        },
        {
          title: "Cuándo hay que renovarlo",
          paragraphs: [
            "Para que el pagador quede cubierto por el efecto previsto legalmente, el certificado debe haber sido emitido dentro de los doce meses anteriores al pago de cada factura.",
            "El plazo se relaciona con el pago de cada factura, no solo con la fecha de emisión de la factura o del contrato.",
          ],
        },
      ],
      accordions: [
        {
          question: "¿Qué ocurre si la AEAT no lo emite dentro de plazo?",
          paragraphs: [
            "No debe interpretarse simplemente como silencio positivo. La normativa específica contempla una comunicación de la AEAT que acredite que ha transcurrido el plazo sin emisión y que puede producir efectos frente al pagador identificado. Debe revisarse el procedimiento oficial para ese supuesto técnico.",
          ],
        },
      ],
    },
    {
      id: "model-01c-correction-csv",
      title: "Errores y comprobación del certificado",
      cards: [
        {
          title: "Si contiene un dato incorrecto",
          paragraphs: [
            "Puede pedirse su modificación en los diez días siguientes, contados desde el día posterior a la recepción.",
          ],
          bullets: [
            "Dirige el escrito al órgano que expidió el certificado.",
            "Indica qué dato consideras incorrecto y solicita su modificación.",
            "Adjunta los documentos o pruebas que lo acrediten.",
          ],
        },
        {
          title: "Comprobación mediante CSV",
          paragraphs: [
            "El Código Seguro de Verificación permite cotejar el contenido, autenticidad y validez del certificado con el documento conservado por la AEAT.",
          ],
          bullets: [
            "Las copias producen los mismos efectos cuando pueden comprobarse mediante el CSV.",
          ],
        },
      ],
    },
  ],
  fillingTitle: "Cómo rellenar el Modelo 01C",
  fillingSteps: [
    {
      title: "1. Datos del interesado",
      paragraphs: [
        "Introduce los datos del contratista o subcontratista sobre el que debe expedirse el certificado.",
      ],
      bullets: [
        "NIF.",
        "Nombre y apellidos o razón social.",
        "Domicilio, código postal, municipio y provincia.",
        "Teléfono.",
      ],
    },
    {
      title: "2. Datos del representante",
      paragraphs: [
        "Rellena este apartado solo cuando otra persona actúe en nombre del solicitante. La representación deberá poder acreditarse.",
      ],
      bullets: [
        "NIF.",
        "Nombre y apellidos o razón social.",
        "Domicilio y datos de contacto.",
      ],
    },
    {
      title: "3. Datos de los pagadores",
      paragraphs: [
        "Identifica al cliente o pagador para el que el certificado debe producir efectos. Puedes incluir varios, pero se expedirá un certificado separado para cada uno.",
      ],
      bullets: ["NIF del pagador.", "Nombre y apellidos o razón social."],
    },
    {
      title: "4. Autorización",
      paragraphs: [
        "La presentación autoriza a la AEAT a facilitar información sobre el estado de la solicitud a los pagadores identificados. No les da acceso a toda la información tributaria del contratista.",
      ],
    },
    {
      title: "5. Solicitud",
      paragraphs: [
        "Mediante la firma se solicita formalmente el certificado de estar al corriente a los efectos del artículo 43.1.f de la Ley General Tributaria.",
      ],
    },
    {
      title: "6. Fecha y firma",
      paragraphs: [
        "Incluye la fecha y la firma del solicitante o de su representante. El PDF oficial contiene un ejemplar para la Administración y otro para el interesado.",
      ],
    },
  ],
  afterTitle: "Qué ocurre después de solicitarlo",
  afterSteps: [
    {
      title: "1. Revisión",
      description:
        "La AEAT comprueba los requisitos y la situación tributaria que debe certificar.",
    },
    {
      title: "2. Expedición o denegación",
      description:
        "El resultado puede ser positivo o denegarse por deudas, declaraciones pendientes o ambos motivos.",
    },
    {
      title: "3. Entrega al pagador",
      description:
        "El contratista entrega a cada pagador su certificado individual y el pagador lo conserva.",
    },
  ],
  comparison: {
    title: "Modelo 01 y Modelo 01C",
    current: {
      title: "Modelo 01C",
      description:
        "Solicitud del certificado específico de contratistas y subcontratistas, con identificación del pagador.",
    },
    related: {
      title: "Modelo 01",
      description: "Solicitud general de distintos certificados tributarios.",
      href: "/consultor-fiscal/modelos/01",
      label: "Ver la ficha del Modelo 01",
    },
    conclusion:
      "Para el certificado específico regulado por el artículo 43.1.f de la Ley General Tributaria debe utilizarse el Modelo 01C.",
  },
  pdfNotice: [
    "La AEAT recomienda descargar el PDF en el ordenador y abrirlo con Adobe Acrobat Reader. Si se abre directamente en Chrome o Edge, puede desactivarse la opción que genera el número de justificante.",
    "Esos navegadores pueden mostrar, en este formulario concreto, un aviso de documento alterado por el código incorporado para generar el justificante y el código de barras. Esta explicación no se aplica a otros archivos ni a cualquier alerta de seguridad.",
  ],
  documents: [
    {
      label: "Descargar Modelo 01C oficial",
      sourceId: "aeat.model-01c.form-pdf.2026-06-04",
    },
    {
      label: "Ver instrucciones oficiales",
      sourceId: "aeat.model-01c.instructions-pdf.2026-06-04",
    },
  ],
  officialLinks: [
    {
      label: "Procedimiento oficial del Modelo 01C",
      sourceId: "aeat.model-01c.procedure-home.2025-11-21",
    },
    {
      label: "Ficha administrativa G303",
      sourceId: "aeat.model-01c.procedure-record.2025-11-21",
    },
    {
      label: "Qué certifica la AEAT",
      sourceId: "aeat.model-01c.what-certifies.2025-11-21",
    },
    {
      label: "Dónde se obtiene",
      sourceId: "aeat.model-01c.where-obtained.2025-11-21",
    },
    {
      label: "Preguntas frecuentes oficiales",
      sourceId: "aeat.model-01c.faq.2025-03-03",
    },
  ],
  legalLinks: [
    {
      label: "Ley General Tributaria · artículo 43.1.f",
      sourceId: "boe.lgt-58-2003.article-43",
    },
    {
      label: "Real Decreto 1065/2007 · artículos 70 a 76",
      sourceId: "boe.rd-1065-2007.article-70",
    },
  ],
  faq: [
    {
      question: "¿Quién debe solicitar el Modelo 01C?",
      answer:
        "Normalmente lo solicita el contratista o subcontratista que quiere entregar el certificado al cliente o pagador.",
    },
    {
      question: "¿Debe solicitarlo el cliente?",
      answer:
        "Lo habitual es que lo solicite el contratista o subcontratista y se lo entregue posteriormente al pagador.",
    },
    {
      question: "¿Es necesario para cualquier proveedor?",
      answer:
        "No. Está relacionado con determinadas obras y servicios correspondientes a la actividad económica principal del pagador.",
    },
    {
      question: "¿Sirve el certificado general de estar al corriente?",
      answer:
        "No produce necesariamente los mismos efectos. Para esta finalidad existe el certificado específico de contratistas y subcontratistas.",
    },
    {
      question: "¿Un certificado sirve para todos mis clientes?",
      answer:
        "La solicitud puede incluir varios pagadores, pero la AEAT expide un certificado individual para cada uno.",
    },
    {
      question: "¿Cuánto tarda?",
      answer:
        "El plazo oficial es de tres días hábiles desde que el órgano competente recibe la solicitud.",
    },
    {
      question: "¿Cuánto tiempo puede utilizarlo el pagador?",
      answer:
        "Debe haberse emitido dentro de los doce meses anteriores al pago de cada factura.",
    },
    {
      question: "¿Un resultado negativo significa siempre que tengo deudas?",
      answer:
        "No. También puede deberse a declaraciones obligatorias pendientes.",
    },
    {
      question: "¿Puede solicitarlo un representante?",
      answer:
        "Sí, cuando tenga la representación o el apoderamiento necesario.",
    },
    {
      question: "¿Cómo compruebo que es auténtico?",
      answer:
        "Mediante el Código Seguro de Verificación que aparece en el certificado.",
    },
  ],
  sourceIds: [
    "aeat.model-01c.procedure-home.2025-11-21",
    "aeat.model-01c.procedure-record.2025-11-21",
    "aeat.model-01c.what-certifies.2025-11-21",
    "aeat.model-01c.where-obtained.2025-11-21",
    "aeat.model-01c.downloads.2026-06-04",
    "aeat.model-01c.faq.2025-03-03",
    "aeat.model-01c.form-pdf.2026-06-04",
    "aeat.model-01c.instructions-pdf.2026-06-04",
    "boe.lgt-58-2003.article-43",
    "boe.rd-1065-2007.article-70",
  ],
} as const satisfies FiscalModelPracticalGuideV1;
