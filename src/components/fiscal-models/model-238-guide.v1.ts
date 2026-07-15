import type { FiscalModelPracticalGuideV1 } from "./fiscal-model-practical-guide.types";

export const MODEL_238_GUIDE_V1 = {
  code: "238",
  effectiveYear: 2026,
  taxPeriodYear: 2025,
  filingYear: 2026,
  lastVerifiedAt: "2026-07-15",
  requiresAnnualReview: true,
  intro: [
    "El Modelo 238 es la declaración informativa anual con la que determinados operadores de plataformas comunican información sobre vendedores y actividades pertinentes en el marco DAC7. Lo presenta el operador, no el vendedor o usuario ordinario de la plataforma.",
    "No liquida un impuesto ni determina cuánto tributa un vendedor. Los datos comunicados pueden intercambiarse con otras administraciones, pero cada impuesto se declara en el modelo que corresponda.",
  ],
  notices: [
    {
      title: "30 operaciones y 2.000 euros no son límites fiscales",
      paragraphs: [
        "Son dos condiciones acumulativas de una exclusión informativa limitada a vendedores de bienes: debe haber menos de 30 ventas y, además, la contraprestación total no puede superar 2.000 euros en el periodo. No eximen por sí solas de IRPF, IVA u otros impuestos.",
      ],
    },
    {
      title: "Información personal y económica protegida",
      paragraphs: [
        "El operador debe aplicar diligencia debida e informar al vendedor sobre el tratamiento y el intercambio de datos. Factu no recopila identidades, cuentas, inmuebles, importes ni mensajes XML del Modelo 238.",
      ],
    },
  ],
  actions: [
    {
      label: "Comprobar si soy operador obligado",
      sourceId: "aeat.model-238.faq-index.2026-07-08",
      primary: true,
    },
    {
      label: "Abrir la página oficial del Modelo 238",
      sourceId: "aeat.model-238.procedure-home.2026-07-08",
    },
    {
      label: "Consultar el registro Modelo 040",
      internalHref: "/consultor-fiscal/modelos/040",
    },
  ],
  quickSummaryTitle: "Modelo 238 en un vistazo",
  quickFacts: [
    {
      label: "Quién lo presenta",
      value:
        "El operador de plataforma obligado, incluido el excluido mediante declaración negativa cuando proceda.",
    },
    {
      label: "Quién no lo presenta",
      value:
        "El vendedor, anfitrión, profesional o usuario ordinario de la plataforma.",
    },
    {
      label: "Periodicidad",
      value: "Anual, durante enero del año siguiente al periodo de referencia.",
    },
    {
      label: "Actividades",
      value:
        "Inmuebles, servicios personales, venta de bienes y alquiler de medios de transporte.",
    },
    {
      label: "Canales",
      value:
        "Formulario de la sede o servicio web mediante mensajes XML, según el tipo de presentación.",
    },
    {
      label: "Antecesor",
      value:
        "Sustituye la información del Modelo 179 para el ejercicio 2024 y siguientes.",
    },
  ],
  sections: [
    {
      id: "model-238-activities",
      title: "Actividades pertinentes y vendedores",
      cards: [
        {
          title: "Arrendamiento de inmuebles",
          bullets: [
            "Viviendas y otros inmuebles.",
            "Plazas de aparcamiento y unidades vinculadas.",
            "Datos del inmueble y días de alquiler cuando proceda.",
          ],
        },
        {
          title: "Servicios personales",
          paragraphs: [
            "Trabajo basado en tiempo o tareas que una persona realiza a petición de un usuario, presencialmente o en línea tras facilitarlo la plataforma.",
          ],
        },
        {
          title: "Venta de bienes",
          paragraphs: [
            "La exclusión de menos de 30 actividades y hasta 2.000 euros solo pertenece a esta categoría y exige ambas condiciones.",
          ],
        },
        {
          title: "Alquiler de transporte",
          paragraphs: [
            "Incluye el arrendamiento de medios de transporte facilitado por la plataforma.",
          ],
        },
      ],
    },
    {
      id: "model-238-excluded-sellers",
      title: "Vendedores excluidos",
      cards: [
        {
          title: "Entidades públicas y cotizadas",
          bullets: [
            "Entidad estatal.",
            "Entidad cotizada en un mercado reconocido.",
            "Entidad vinculada a una entidad cotizada.",
          ],
        },
        {
          title: "Gran actividad inmobiliaria",
          paragraphs: [
            "Entidad a la que se facilitan más de 2.000 actividades de alquiler respecto de un mismo bien inmueble comercializado durante el periodo.",
          ],
        },
        {
          title: "Venta de bienes: doble condición",
          bullets: [
            "Menos de 30 actividades pertinentes.",
            "Contraprestación total no superior a 2.000 euros.",
            "Deben cumplirse las dos condiciones y solo en venta de bienes.",
          ],
        },
        {
          title: "Tres ejemplos",
          bullets: [
            "29 ventas y 2.100 euros: no queda excluido por superar 2.000 euros.",
            "31 ventas y 500 euros: no queda excluido por no ser menos de 30.",
            "20 ventas y 1.500 euros: puede cumplir esta exclusión, sin decidir su tributación.",
          ],
        },
      ],
      note: "La exclusión afecta a la comunicación DAC7; no declara una ganancia exenta ni un umbral de IVA o IRPF.",
    },
    {
      id: "model-238-due-diligence",
      title: "Diligencia debida e información al vendedor",
      cards: [
        {
          title: "Identificar y verificar",
          bullets: [
            "Nombre o razón social.",
            "Dirección principal.",
            "NIF o TIN y país emisor.",
            "Fecha de nacimiento o registro mercantil cuando proceda.",
            "Residencia fiscal determinada con la evidencia prevista.",
          ],
        },
        {
          title: "Informar al vendedor",
          paragraphs: [
            "El operador debe comunicar a cada vendedor persona física sujeto a información que sus datos se remitirán a la administración y podrán transferirse a otro Estado, con antelación suficiente para ejercer sus derechos de protección de datos.",
          ],
        },
        {
          title: "Cuentas financieras",
          bullets: [
            "Identificador de cuenta cuando esté disponible.",
            "Titular si es distinto del vendedor.",
            "Información financiera de identificación disponible para el operador.",
          ],
        },
        {
          title: "Control anual",
          paragraphs: [
            "La diligencia debida debe quedar sustentada y revisarse según las reglas aplicables. Una pantalla o declaración del vendedor no sustituye automáticamente la verificación.",
          ],
        },
      ],
    },
    {
      id: "model-238-reported-data",
      title: "Qué información se comunica",
      cards: [
        {
          title: "Operador y plataforma",
          bullets: [
            "Identidad, residencia, NIF/TIN y dirección.",
            "Nombre comercial de la plataforma.",
            "Motivo y tipo de presentación.",
            "Otros operadores o jurisdicciones que asumen la comunicación.",
          ],
        },
        {
          title: "Cada vendedor",
          bullets: [
            "Identificación y residencia.",
            "Contraprestación por trimestre.",
            "Número de actividades por trimestre.",
            "Comisiones, tarifas e impuestos retenidos o cobrados por la plataforma.",
          ],
        },
        {
          title: "Inmuebles",
          bullets: [
            "Dirección y referencia disponible.",
            "Tipo de inmueble.",
            "Días alquilados.",
            "Documentación del propietario en la exclusión inmobiliaria cuando corresponda.",
          ],
        },
        {
          title: "Desglose trimestral",
          paragraphs: [
            "La información económica se distribuye por trimestres dentro del periodo anual; no debe reducirse a un único total anual sin respetar el diseño oficial.",
          ],
        },
      ],
    },
    {
      id: "model-238-types-corrections",
      title: "Tipos de presentación y correcciones",
      accordions: [
        {
          question: "¿Qué declaraciones sin vendedores existen?",
          paragraphs: [
            "La sede contempla, entre otros supuestos, declaración negativa de operador excluido, comunicación de que otro operador declara por él y notificación de que declara en otra jurisdicción.",
          ],
          bullets: [
            "No son equivalentes entre sí.",
            "Cada motivo conserva la identificación del operador y la plataforma.",
          ],
        },
        {
          question: "¿Puede haber aceptación parcial?",
          paragraphs: [
            "El servicio puede aceptar unos registros y rechazar otros. El operador debe revisar la respuesta y corregir los registros rechazados con las referencias y reglas del servicio.",
          ],
        },
        {
          question: "¿Se usa una complementaria como en una autoliquidación?",
          paragraphs: [
            "No debe trasladarse automáticamente la lógica de complementarias de un impuesto. El 238 utiliza tipos de mensaje, referencias y correcciones de registros conforme a su diseño técnico.",
          ],
        },
      ],
    },
    {
      id: "model-238-deadline",
      title: "Plazo anual",
      intro: [
        "La regla general es presentar durante enero del año siguiente al periodo de referencia.",
      ],
      cards: [
        {
          title: "Información de 2025",
          paragraphs: [
            "La campaña oficial fija del 1 de enero al 2 de febrero de 2026. Esta fecha concreta pertenece a esa campaña y no sustituye la regla general.",
          ],
        },
        {
          title: "Incidencia técnica",
          paragraphs: [
            "La AEAT contempla cuatro días naturales adicionales cuando por razones técnicas no haya sido posible presentar por Internet dentro del plazo reglamentario.",
          ],
        },
      ],
    },
    {
      id: "model-238-mistakes",
      title: "Errores habituales",
      cards: [
        {
          title: "Trasladar la obligación al vendedor",
          bullets: [
            "El vendedor no presenta el 238.",
            "El operador no puede omitir su diligencia debida por pedir al vendedor que se autocalifique.",
          ],
        },
        {
          title: "Aplicar mal los umbrales",
          bullets: [
            "Usar 30 o 2.000 de forma alternativa.",
            "Aplicarlos a inmuebles o servicios.",
            "Presentarlos como exención fiscal.",
          ],
        },
        {
          title: "Perder el detalle",
          bullets: [
            "Agrupar vendedores distintos.",
            "Omitir trimestres, cuentas o inmuebles.",
            "No revisar registros rechazados.",
          ],
        },
        {
          title: "Confundir modelos",
          bullets: [
            "040 registra al operador.",
            "179 es histórico desde 2024.",
            "100, 130, 303, 347, 349 o 210 pueden seguir siendo independientes.",
          ],
        },
      ],
    },
  ],
  fillingTitle: "Cómo preparar el Modelo 238",
  fillingSteps: [
    {
      title: "1. Confirmar al operador",
      paragraphs: [
        "Revisar registro, residencia, conexiones y plataforma declarante.",
      ],
      bullets: [
        "Modelo 040.",
        "Otra jurisdicción.",
        "Otro operador que asume la comunicación.",
      ],
    },
    {
      title: "2. Aplicar diligencia debida",
      paragraphs: [
        "Identificar vendedores y determinar residencia con la información y evidencias oficiales.",
      ],
      bullets: [
        "Vendedores excluidos.",
        "Actividades pertinentes.",
        "Protección de datos.",
      ],
    },
    {
      title: "3. Preparar los registros",
      paragraphs: [
        "Separar operador, otros operadores, vendedores, inmuebles y datos económicos por trimestre.",
      ],
      bullets: [
        "NIF/TIN.",
        "Cuentas financieras.",
        "Contraprestaciones y comisiones.",
      ],
    },
    {
      title: "4. Elegir presentación",
      paragraphs: [
        "Distinguir nueva información, corrección y supuestos sin vendedores, y usar formulario o XML según corresponda.",
      ],
      bullets: [
        "Validar antes de firmar.",
        "Revisar aceptación parcial.",
        "Guardar respuestas y justificante fuera de Factu.",
      ],
    },
  ],
  afterTitle: "Después de presentar",
  afterSteps: [
    {
      title: "Revisar la respuesta",
      description:
        "Distinguir registros aceptados y rechazados, sin dar por correcto el lote completo si hubo aceptación parcial.",
    },
    {
      title: "Informar y conservar",
      description:
        "Conservar la evidencia de diligencia debida y la información facilitada a los vendedores conforme a la normativa aplicable.",
    },
    {
      title: "Corregir por referencia",
      description:
        "Rectificar o anular registros siguiendo el diseño y las referencias oficiales, no como una autoliquidación tributaria.",
    },
  ],
  comparison: {
    title: "Modelos relacionados",
    current: {
      title: "Modelo 238",
      description:
        "Información anual del operador sobre vendedores y actividades pertinentes.",
    },
    related: {
      title: "Modelo 040",
      description:
        "Alta, modificación y baja del operador en los registros correspondientes.",
      href: "/consultor-fiscal/modelos/040",
      label: "Ver Modelo 040",
    },
    additional: [
      {
        title: "Modelo 179",
        description:
          "Declaración histórica de alquiler turístico, no vigente desde el ejercicio 2024.",
        href: "/consultor-fiscal/modelos/179",
        label: "Ver histórico 179",
      },
    ],
    conclusion:
      "DAC7 es una obligación informativa. No sustituye las declaraciones de los impuestos que correspondan al operador o al vendedor.",
  },
  pdfNotice: [
    "Los PDF registrados son manuales técnicos, no declaraciones presentadas ni formularios en blanco. Factu no genera XML ni transmite datos a la AEAT.",
  ],
  documents: [
    {
      label: "Manual del formulario del Modelo 238",
      sourceId: "aeat.model-238.form-manual-pdf.captured-2026-07-13",
    },
    {
      label: "Manual del servicio web del Modelo 238",
      sourceId: "aeat.model-238.web-service-manual-pdf.captured-2026-07-13",
    },
  ],
  officialLinks: [
    {
      label: "Ficha administrativa del procedimiento",
      sourceId: "aeat.model-238.procedure-record.2026-07-08",
    },
    {
      label: "Preguntas frecuentes oficiales",
      sourceId: "aeat.model-238.faq-index.2026-07-08",
    },
    {
      label: "Información para vendedores",
      sourceId: "aeat.model-238.faq-sellers.2026-07-08",
    },
    {
      label: "Ayuda del formulario",
      sourceId: "aeat.model-238.browser-help.2026-04-22",
    },
    {
      label: "Información del servicio web",
      sourceId: "aeat.model-238.web-service-information.2026-06-09",
    },
    {
      label: "Plazo de presentación de la campaña 2025",
      href: "https://sede.agenciatributaria.gob.es/Sede/todas-gestiones/impuestos-tasas/declaraciones-informativas/modelo-238-decl_____informacion-parte-operadores-plataformas/plazos-presentacion.html",
    },
  ],
  legalLinks: [
    {
      label: "Real Decreto 117/2024",
      sourceId: "boe.model-238.royal-decree-117-2024",
    },
    { label: "Orden HAC/72/2024", sourceId: "boe.model-238.order-hac-72-2024" },
  ],
  faq: [
    {
      question: "¿Quién presenta el Modelo 238?",
      answer:
        "El operador de plataforma obligado a comunicar información; no el vendedor ordinario.",
    },
    {
      question: "¿Qué actividades incluye?",
      answer:
        "Alquiler de inmuebles, servicios personales, venta de bienes y alquiler de medios de transporte.",
    },
    {
      question: "¿Menos de 30 ventas basta para quedar excluido?",
      answer:
        "No. En venta de bienes deben existir menos de 30 actividades y, además, no superar 2.000 euros.",
    },
    {
      question: "¿Los 2.000 euros son un mínimo fiscal?",
      answer:
        "No. Es una condición informativa DAC7 y no una exención de impuestos.",
    },
    {
      question: "¿Qué vendedores están excluidos?",
      answer:
        "Entre otros, entidades estatales, determinadas entidades cotizadas, ciertos grandes arrendadores y vendedores de bienes que cumplan conjuntamente el doble umbral.",
    },
    {
      question: "¿Qué es un operador excluido?",
      answer:
        "El que demuestra previamente y cada año que todo su modelo empresarial carece de vendedores sujetos a comunicación; presenta la declaración negativa prevista.",
    },
    {
      question: "¿Qué datos se comunican?",
      answer:
        "Identificación, residencia, cuentas disponibles, contraprestaciones, comisiones, actividades por trimestre y, en alquileres, datos de inmuebles.",
    },
    {
      question: "¿Debe informarse al vendedor?",
      answer:
        "Sí. El operador debe informarle sobre el suministro e intercambio de sus datos y permitir el ejercicio de sus derechos.",
    },
    {
      question: "¿Cuándo se presenta?",
      answer:
        "Con carácter anual durante enero del año siguiente; la campaña de 2025 finaliza el 2 de febrero de 2026.",
    },
    {
      question: "¿Puede presentarse por XML?",
      answer:
        "Sí, existe servicio web con mensajes XML; también hay formulario para los supuestos descritos por la AEAT.",
    },
    {
      question: "¿Qué ocurre si se rechazan registros?",
      answer:
        "Hay que revisar la respuesta, conservar los aceptados y corregir los rechazados conforme a sus referencias.",
    },
    {
      question: "¿Sustituye al Modelo 179?",
      answer:
        "La AEAT indica que sustituye esa obligación informativa para 2024 y siguientes; el 179 queda como histórico.",
    },
  ],
  sourceIds: [
    "aeat.model-238.procedure-home.2026-07-08",
    "aeat.model-238.procedure-record.2026-07-08",
    "aeat.model-238.browser-help.2026-04-22",
    "aeat.model-238.faq-index.2026-07-08",
    "aeat.model-238.faq-general.2026-07-08",
    "aeat.model-238.faq-sellers.2026-07-08",
    "aeat.model-238.web-service-information.2026-06-09",
    "aeat.model-238.web-service-manual-page.2026-06-09",
    "aeat.model-238.web-service-manual-pdf.captured-2026-07-13",
    "aeat.model-238.form-resources.2026-07-08",
    "aeat.model-238.form-manual-pdf.captured-2026-07-13",
    "boe.model-238.royal-decree-117-2024",
    "boe.model-238.order-hac-72-2024",
  ],
} as const satisfies FiscalModelPracticalGuideV1;
