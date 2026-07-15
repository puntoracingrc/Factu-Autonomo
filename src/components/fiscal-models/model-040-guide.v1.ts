import type { FiscalModelPracticalGuideV1 } from "./fiscal-model-practical-guide.types";

export const MODEL_040_GUIDE_V1 = {
  code: "040",
  effectiveYear: 2026,
  lastVerifiedAt: "2026-07-15",
  requiresAnnualReview: true,
  intro: [
    "El Modelo 040 es la declaración censal específica para el alta, la modificación y la baja de determinados operadores de plataformas. Solo lo presenta el operador: no lo presenta el vendedor, el propietario, el profesional o el usuario que ofrece bienes o servicios mediante la plataforma.",
    "No debe confundirse con el Modelo 04, dedicado al tipo reducido de IVA en determinados vehículos. El 040 tiene tres cifras y pertenece al ámbito DAC7. No sustituye al Modelo 036.",
  ],
  notices: [
    {
      title: "Primero hay que identificar al operador",
      paragraphs: [
        "Ser vendedor, anfitrión, comprador, proveedor de pagos, desarrollador o agencia de publicidad no convierte por sí solo en operador. El operador es la entidad que celebra contratos con vendedores para poner a su disposición toda o parte de una plataforma.",
      ],
    },
    {
      title: "Factu no registra ni presenta este modelo",
      paragraphs: [
        "Esta guía ordena información oficial. No solicita NIF, certificados, datos de plataformas ni información de vendedores y no conecta con la AEAT.",
      ],
    },
  ],
  actions: [
    {
      label: "Comprobar si soy operador de plataforma",
      sourceId: "aeat.model-040.info.2025-12-01",
      primary: true,
    },
    {
      label: "Abrir la página oficial del Modelo 040",
      sourceId: "aeat.model-040.procedure-home.2026-07-10",
    },
    {
      label: "Consultar el Modelo 238",
      internalHref: "/consultor-fiscal/modelos/238",
    },
  ],
  quickSummaryTitle: "Modelo 040 en un vistazo",
  quickFacts: [
    {
      label: "Quién lo presenta",
      value:
        "El operador de plataforma que deba inscribirse en uno de los dos registros; no el vendedor.",
    },
    {
      label: "Qué comunica",
      value:
        "Alta, modificación o baja censal del operador y de sus plataformas.",
    },
    {
      label: "Registros",
      value:
        "Operadores extranjeros no cualificados y otros operadores obligados a informar.",
    },
    {
      label: "Plazos",
      value:
        "Alta al iniciar; cambios y baja, con carácter general, dentro del mes correspondiente.",
    },
    {
      label: "Canal",
      value: "Exclusivamente electrónico, con NIF y certificado electrónico.",
    },
    {
      label: "Relación",
      value:
        "El 040 registra; el 238 comunica anualmente información de vendedores y actividades.",
    },
  ],
  sections: [
    {
      id: "model-040-definitions",
      title: "Plataforma, operador y actividad pertinente",
      cards: [
        {
          title: "Qué es una plataforma",
          paragraphs: [
            "Software, sitio web o aplicación accesible a usuarios que permite poner en contacto a vendedores con otros usuarios para realizar una actividad pertinente, directa o indirectamente.",
          ],
          bullets: [
            "Puede incluir el cobro o pago de la contraprestación.",
            "Procesar pagos, publicar anuncios o redirigir usuarios, sin más intervención, no basta por sí solo.",
          ],
        },
        {
          title: "Qué es un operador",
          paragraphs: [
            "Una entidad que contrata con vendedores para poner a su disposición toda o parte de la plataforma.",
          ],
          bullets: [
            "No es automáticamente el vendedor o comprador.",
            "Tampoco basta con alojar, programar, anunciar o procesar el pago.",
          ],
        },
        {
          title: "Actividades pertinentes",
          bullets: [
            "Arrendamiento o cesión temporal de inmuebles.",
            "Servicios personales.",
            "Venta de bienes.",
            "Arrendamiento de medios de transporte.",
          ],
        },
        {
          title: "DAC7",
          paragraphs: [
            "DAC7 es el marco europeo de cooperación e intercambio de información que origina estas obligaciones de registro e información. No crea por sí mismo un nuevo impuesto para el vendedor.",
          ],
        },
      ],
    },
    {
      id: "model-040-registers",
      title: "Los dos registros del Modelo 040",
      cards: [
        {
          title: "Operadores extranjeros no cualificados",
          paragraphs: [
            "Para determinados operadores ajenos a la Unión Europea que eligen España como Estado miembro de registro único.",
          ],
        },
        {
          title: "Otros operadores obligados a informar",
          paragraphs: [
            "Para operadores conectados con España por residencia, constitución, dirección o establecimiento permanente, según la normativa aplicable.",
          ],
        },
      ],
      note: "No se elige un registro por intuición. Hay que revisar residencia, constitución, dirección, establecimientos permanentes y el posible registro en otra jurisdicción.",
    },
    {
      id: "model-040-causes-deadlines",
      title: "Alta, modificación y baja",
      cards: [
        {
          title: "Alta",
          paragraphs: [
            "Se comunica cuando comienza la actividad como operador sujeto al registro correspondiente.",
          ],
          bullets: [
            "Identidad y NIF.",
            "Datos internacionales y del registro.",
            "Plataformas operadas.",
            "Fecha de inicio.",
          ],
        },
        {
          title: "Modificación",
          paragraphs: [
            "Los cambios censales se comunican, con carácter general, dentro del mes siguiente a aquel en que se produzcan.",
          ],
          bullets: [
            "Domicilio o contacto.",
            "Plataformas.",
            "Datos internacionales.",
            "Registro o situación del operador.",
          ],
        },
        {
          title: "Baja",
          paragraphs: [
            "Se comunica dentro del mes desde que cesa toda actividad como operador o dejan de cumplirse las condiciones del registro.",
          ],
          bullets: [
            "No equivale a cerrar una cuenta de vendedor.",
            "Debe conservarse el justificante oficial.",
          ],
        },
        {
          title: "No sustituye al 036",
          paragraphs: [
            "El 040 es un censo especial de operadores de plataformas. Las obligaciones censales generales se gestionan mediante el modelo que corresponda, incluido el 036 cuando proceda.",
          ],
          links: [
            {
              label: "Consultar el Modelo 036",
              href: "/consultor-fiscal/modelos/036",
            },
          ],
        },
      ],
    },
    {
      id: "model-040-electronic",
      title: "Presentación y seguridad",
      intro: [
        "La Orden HAC/72/2024 establece presentación electrónica. La sede describe acceso con certificado electrónico del declarante, representante o colaborador autorizado.",
      ],
      accordions: [
        {
          question: "¿Puede utilizarse papel o la Cl@ve ordinaria?",
          paragraphs: [
            "La ficha oficial describe este trámite mediante formulario electrónico y certificado. No se ofrece un impreso en papel para presentación.",
          ],
        },
        {
          question: "¿Qué conviene guardar?",
          paragraphs: [
            "El justificante, el Código Seguro de Verificación (CSV), la fecha, la causa comunicada y la relación de plataformas. Factu no debe almacenar ese expediente sensible.",
          ],
        },
      ],
    },
    {
      id: "model-040-mistakes",
      title: "Errores habituales",
      cards: [
        {
          title: "Confundir 04 y 040",
          bullets: [
            "El 04 es un trámite de IVA para determinados vehículos.",
            "El 040 es el censo DAC7 de operadores de plataformas.",
          ],
        },
        {
          title: "Confundir operador y vendedor",
          bullets: [
            "El vendedor ordinario no presenta el 040.",
            "El propietario de un inmueble no es operador solo por anunciarlo.",
          ],
        },
        {
          title: "Elegir mal el registro",
          bullets: [
            "No revisar la residencia o la constitución.",
            "Ignorar un registro único en otro Estado.",
            "No actualizar plataformas o datos internacionales.",
          ],
        },
        {
          title: "Tratarlo como el 036",
          bullets: [
            "El 040 no sustituye el censo general.",
            "Tampoco comunica las actividades anuales del 238.",
          ],
        },
      ],
    },
  ],
  fillingTitle: "Cómo preparar el Modelo 040 en la sede oficial",
  fillingSteps: [
    {
      title: "1. Identificar al operador",
      paragraphs: [
        "Confirmar que la entidad contrata con vendedores y pone la plataforma a su disposición.",
      ],
      bullets: [
        "Residencia y constitución.",
        "Dirección efectiva.",
        "Establecimientos permanentes.",
      ],
    },
    {
      title: "2. Elegir el registro",
      paragraphs: [
        "Distinguir operador extranjero no cualificado de otros operadores obligados a informar.",
      ],
      bullets: [
        "Estado de registro único.",
        "Conexiones con España.",
        "Registros en otras jurisdicciones.",
      ],
    },
    {
      title: "3. Elegir la causa",
      paragraphs: [
        "Seleccionar alta, modificación o baja y su fecha efectiva.",
      ],
      bullets: [
        "No convertir un cambio en una nueva alta.",
        "No usar la baja de una plataforma como baja total sin comprobarlo.",
      ],
    },
    {
      title: "4. Revisar datos",
      paragraphs: [
        "Comprobar NIF, identidad, contacto, datos internacionales y plataformas antes de firmar.",
      ],
      bullets: ["Acceso con certificado.", "Guardar justificante y CSV."],
    },
  ],
  afterTitle: "Después de la comunicación",
  afterSteps: [
    {
      title: "Consultar la situación censal",
      description:
        "La AEAT ofrece una consulta específica para verificar el registro y las comunicaciones presentadas.",
    },
    {
      title: "Controlar cambios",
      description:
        "Registrar internamente cambios de identidad, plataformas o conexiones para no superar el plazo de un mes.",
    },
    {
      title: "Preparar el 238",
      description:
        "Si existe obligación informativa, organizar diligencia debida y datos del periodo sin trasladarlos a Factu.",
    },
  ],
  comparison: {
    title: "040, 238 y 04: no son lo mismo",
    current: {
      title: "Modelo 040",
      description:
        "Censo especial de alta, modificación y baja de operadores de plataformas.",
    },
    related: {
      title: "Modelo 238",
      description:
        "Declaración anual de información de operadores sobre vendedores y actividades pertinentes.",
      href: "/consultor-fiscal/modelos/238",
      label: "Ver Modelo 238",
    },
    additional: [
      {
        title: "Modelo 04",
        description:
          "Solicitud relacionada con el IVA del 4 % en determinados vehículos. No pertenece a DAC7.",
        href: "/consultor-fiscal/modelos/04",
        label: "Ver Modelo 04",
      },
    ],
    conclusion:
      "El código debe comprobarse completo: 040 registra al operador; 238 informa anualmente; 04 pertenece a otro ámbito tributario.",
  },
  pdfNotice: [
    "La AEAT no ofrece un impreso PDF estático como vía de presentación. El trámite se realiza en su sede y Factu no solicita ni conserva los datos.",
  ],
  documents: [],
  officialLinks: [
    {
      label: "Información censal del Modelo 040",
      sourceId: "aeat.model-040.info.2025-12-01",
    },
    {
      label: "Ayuda técnica del Modelo 040",
      sourceId: "aeat.model-040.help.2026-05-06",
    },
    {
      label: "Preguntas frecuentes oficiales",
      sourceId: "aeat.model-040.faq.2025-06-03",
    },
    {
      label: "Ficha administrativa del procedimiento",
      sourceId: "aeat.model-040.procedure-record.2026-07-10",
    },
  ],
  legalLinks: [
    { label: "Orden HAC/72/2024", sourceId: "boe.model-040.order-2024" },
  ],
  faq: [
    {
      question: "¿El Modelo 040 es el Modelo 04?",
      answer:
        "No. El 040 registra operadores de plataformas; el 04 se refiere a determinados vehículos y al IVA reducido.",
    },
    {
      question: "¿Lo presenta un vendedor de una plataforma?",
      answer:
        "No por el mero hecho de vender. Lo presenta la entidad que tiene la condición de operador sujeto al registro.",
    },
    {
      question: "¿Qué es una plataforma?",
      answer:
        "Software, web o aplicación que permite poner en contacto a vendedores y usuarios para realizar una actividad pertinente.",
    },
    {
      question: "¿Qué es un operador?",
      answer:
        "La entidad que celebra contratos con vendedores para poner a su disposición toda o parte de una plataforma.",
    },
    {
      question: "¿Qué actividades son pertinentes?",
      answer:
        "Alquiler de inmuebles, servicios personales, venta de bienes y alquiler de medios de transporte.",
    },
    {
      question: "¿Cuántos registros existen?",
      answer:
        "Dos: operadores extranjeros no cualificados y otros operadores obligados a comunicar información.",
    },
    {
      question: "¿Cuándo se comunica el alta?",
      answer:
        "Cuando comienza la actividad que obliga al registro correspondiente.",
    },
    {
      question: "¿Cuándo se comunica una modificación?",
      answer: "Con carácter general, dentro del mes siguiente al cambio.",
    },
    {
      question: "¿Cuándo se comunica la baja?",
      answer:
        "Dentro del mes desde el cese total o desde que dejan de cumplirse las condiciones del registro.",
    },
    {
      question: "¿Sustituye al Modelo 036?",
      answer:
        "No. Es un registro especial y no sustituye las obligaciones censales generales.",
    },
    {
      question: "¿Cómo se presenta?",
      answer:
        "Por vía electrónica en la sede de la AEAT, con NIF y certificado electrónico.",
    },
    {
      question: "¿Qué relación tiene con el Modelo 238?",
      answer:
        "El 040 gestiona el registro del operador y el 238 es la declaración informativa anual que corresponda.",
    },
  ],
  sourceIds: [
    "aeat.model-040.procedure-home.2026-07-10",
    "aeat.model-040.procedure-record.2026-07-10",
    "aeat.model-040.info.2025-12-01",
    "aeat.model-040.help.2026-05-06",
    "aeat.model-040.faq.2025-06-03",
    "boe.model-040.order-2024",
  ],
} as const satisfies FiscalModelPracticalGuideV1;
