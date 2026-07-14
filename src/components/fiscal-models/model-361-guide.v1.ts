import type { FiscalModelPracticalGuideV1 } from "./fiscal-model-practical-guide.types";

export const MODEL_361_GUIDE_V1 = {
  code: "361",
  lastVerifiedAt: "2026-07-14",
  requiresAnnualReview: true,
  intro: [
    "El Modelo 361 permite a determinados empresarios o profesionales establecidos fuera de la Unión Europea solicitar la devolución del IVA soportado en España.",
    "No es el modelo habitual para un autónomo establecido en España. Es un procedimiento internacional avanzado y la devolución depende de que se cumplan sus requisitos.",
    "Esta guía se refiere al IVA de Península y Baleares. Canarias, Ceuta y Melilla tienen sistemas tributarios propios y, para este procedimiento, utilizan la vía del Modelo 360.",
  ],
  notices: [
    {
      title:
        "Las empresas de la Unión Europea no presentan directamente el 361",
      paragraphs: [
        "Solicitan la devolución del IVA español mediante el portal tributario de su Estado de establecimiento.",
      ],
    },
    {
      title: "Representante y reciprocidad",
      paragraphs: [
        "Con carácter general se necesita un representante establecido en España y el país del solicitante debe ofrecer un tratamiento equivalente, salvo las excepciones legales.",
      ],
    },
    {
      title: "Una factura incorrecta se rectifica primero",
      paragraphs: [
        "El Modelo 361 no sustituye la factura rectificativa cuando el IVA se repercutió indebidamente.",
      ],
    },
  ],
  actions: [
    {
      label: "Comprobar si corresponde el Modelo 361",
      href: "https://sede.agenciatributaria.gob.es/Sede/no-residentes/iva-empresarios-profesionales-no-establecidos/devoluciones-iva-no-establecidos/solicitudes-empresarios-fuera-union-europea.html",
      primary: true,
    },
    {
      label: "Abrir el procedimiento oficial",
      sourceId: "aeat.models-360-361.procedure-home.2026-06-09",
      primary: true,
    },
    {
      label: "Consultar la ayuda oficial",
      sourceId: "aeat.model-361.browser-file-help.2026-01-09",
    },
  ],
  quickSummaryTitle: "El Modelo 361 en pocas palabras",
  quickFacts: [
    { label: "Qué es", value: "Una solicitud de devolución de IVA español." },
    {
      label: "Quién lo utiliza",
      value: "Determinados empresarios establecidos fuera de la Unión Europea.",
    },
    { label: "Autónomo español", value: "No es su procedimiento habitual." },
    { label: "Presentación", value: "Electrónica." },
    {
      label: "Representante",
      value:
        "Generalmente obligatorio y responsable solidario de devoluciones improcedentes.",
    },
    {
      label: "Reciprocidad",
      value: "Generalmente exigida, con excepciones legales concretas.",
    },
    {
      label: "Periodo",
      value: "Entre tres meses y un año; el resto del año puede ser inferior.",
    },
    {
      label: "Mínimos",
      value:
        "400 € para periodos inferiores al año y 50 € para el año completo o su parte restante.",
    },
    { label: "Fecha límite", value: "30 de septiembre del año siguiente." },
    {
      label: "Resolución",
      value: "Cuatro meses; hasta ocho si se solicita información adicional.",
    },
  ],
  sections: [
    {
      id: "model-361-eligibility",
      title: "Quién puede utilizarlo",
      cards: [
        {
          title: "Solicitante admisible",
          bullets: [
            "Está establecido fuera de la Unión Europea y no en Canarias, Ceuta o Melilla.",
            "Ha soportado IVA español en bienes o servicios vinculados a su actividad.",
            "No realiza en España operaciones que excluyan este procedimiento, salvo excepciones.",
            "Cumple la reciprocidad o una excepción legal y tiene derecho a deducción.",
          ],
        },
        {
          title: "No corresponde",
          bullets: [
            "Autónomos establecidos en España, empresas de la UE y consumidores particulares.",
            "Empresas de Canarias, Ceuta o Melilla.",
            "Operadores que deben declarar periódicamente IVA español por otra vía.",
          ],
        },
      ],
    },
    {
      id: "model-361-reciprocity",
      title: "Reciprocidad y excepciones",
      cards: [
        {
          title: "Regla general",
          paragraphs: [
            "El país del solicitante debe reconocer una devolución equivalente a empresarios establecidos en España. La Dirección General de Tributos determina la reciprocidad; no debe utilizarse una lista privada como fuente permanente.",
          ],
        },
        {
          title: "Excepciones limitadas",
          bullets: [
            "Determinados moldes, plantillas y equipos destinados a fabricar bienes que después se exportan.",
            "Acceso, hostelería, restauración y transporte vinculados a ferias, congresos y exposiciones profesionales en España.",
            "Determinadas cuotas ligadas exclusivamente a actividades de comercio electrónico acogidas a OSS.",
          ],
        },
      ],
      note: "Estas excepciones no se extienden por analogía a otros gastos.",
    },
    {
      id: "model-361-representative",
      title: "Representante en España",
      cards: [
        {
          title: "Funciones y responsabilidad",
          bullets: [
            "Presenta el modelo, aporta documentación y atiende requerimientos.",
            "Puede recibir la devolución si el poder lo autoriza.",
            "Responde solidariamente de devoluciones improcedentes.",
          ],
        },
        {
          title: "Excepción OSS",
          paragraphs: [
            "Si la devolución se refiere exclusivamente a IVA soportado para actividades acogidas a OSS, la designación no es obligatoria, aunque puede hacerse voluntariamente.",
          ],
        },
      ],
    },
    {
      id: "model-361-documents",
      title: "Documentación que debe prepararse",
      cards: [
        {
          title: "Actividad y representación",
          bullets: [
            "Certificado de la Administración tributaria del país de establecimiento.",
            "Poder con facultad expresa para presentar y, si procede, cobrar.",
            "Traducción jurada, apostilla o legalización cuando corresponda.",
          ],
        },
        {
          title: "Facturas, importaciones y cuenta",
          bullets: [
            "Copias de facturas y documentos de importación.",
            "IBAN, BIC, titular y datos del representante.",
            "Documentación del grupo fiscal si existe un identificador común.",
          ],
        },
        {
          title: "Umbrales de copias",
          paragraphs: [
            "Se aportan copias cuando la base imponible supera 1.000 €, o 250 € en carburante. La Administración puede pedir otros justificantes aunque no se alcancen esos importes.",
          ],
        },
      ],
      note: "La solicitud puede no considerarse presentada hasta aportar la certificación y el poder exigidos.",
    },
    {
      id: "model-361-period",
      title: "Periodo, importe y plazo",
      cards: [
        {
          title: "Periodo",
          paragraphs: [
            "De tres meses a un año. La parte restante del año puede ser inferior a tres meses y no se mezclan ejercicios.",
          ],
        },
        {
          title: "Mínimo",
          paragraphs: [
            "400 € para un periodo inferior al año; 50 € para el año completo o la parte restante.",
          ],
        },
        {
          title: "Fecha límite",
          paragraphs: [
            "30 de septiembre del año siguiente al que corresponde el IVA soportado.",
          ],
        },
        {
          title: "Decisión",
          paragraphs: [
            "Cuatro meses con carácter general y hasta ocho cuando se solicita información adicional.",
          ],
        },
      ],
    },
    {
      id: "model-361-related",
      title: "Diferencias con otros modelos",
      cards: [
        {
          title: "Modelo 360",
          paragraphs: [
            "Es la vía para empresarios establecidos en España que soportan IVA en otro Estado miembro y para ciertos solicitantes de Canarias, Ceuta o Melilla.",
          ],
          links: [
            { label: "Ver Modelo 360", href: "/consultor-fiscal/modelos/360" },
          ],
        },
        {
          title: "Modelo 303",
          paragraphs: [
            "Declara el IVA español periódico de empresarios obligados a esa autoliquidación.",
          ],
          links: [
            { label: "Ver Modelo 303", href: "/consultor-fiscal/modelos/303" },
          ],
        },
      ],
    },
    {
      id: "model-361-mistakes",
      title: "Errores habituales",
      accordions: [
        {
          question: "Elegir el procedimiento incorrecto",
          paragraphs: [
            "Usar el 361 siendo empresa de la UE o de Canarias, Ceuta o Melilla, o intentar recuperar IVA indebidamente repercutido.",
          ],
        },
        {
          question: "Representación insuficiente",
          paragraphs: [
            "No nombrar representante, usar un poder genérico, omitir facultades, traducción, apostilla o legalización.",
          ],
        },
        {
          question: "Documentación incompleta",
          paragraphs: [
            "No aportar certificado de actividad, facturas que superan los umbrales o referencias de los registros electrónicos.",
          ],
        },
        {
          question: "Reciprocidad, periodo o mínimo",
          paragraphs: [
            "Asumir reciprocidad, ampliar una excepción, presentar fuera de plazo o no alcanzar el mínimo.",
          ],
        },
      ],
    },
  ],
  fillingTitle: "Cómo preparar el Modelo 361",
  fillingSteps: [
    {
      title: "1. Identificar al solicitante",
      paragraphs: [
        "Consigna razón social, país, dirección, identificador fiscal y actividad.",
      ],
    },
    {
      title: "2. Identificar al representante",
      paragraphs: ["Revisa NIF, domicilio, poder y facultades expresas."],
    },
    {
      title: "3. Elegir el periodo",
      paragraphs: ["Indica fechas inicial y final dentro del mismo ejercicio."],
    },
    {
      title: "4. Revisar los datos bancarios",
      paragraphs: ["Indica titular, IBAN y BIC de la cuenta autorizada."],
    },
    {
      title: "5. Añadir facturas e importaciones",
      paragraphs: [
        "Registra proveedor, NIF, número, fecha, base, IVA, importe solicitado y naturaleza del gasto.",
      ],
    },
    {
      title: "6. Vincular la documentación",
      paragraphs: [
        "Indica los números de registro electrónico con los que se aportó cada documento.",
      ],
    },
    {
      title: "7. Confirmar declaraciones",
      paragraphs: [
        "Revisa no establecimiento, actividad, derecho a deducción, reciprocidad o excepción y representación.",
      ],
    },
    {
      title: "8. Firmar y conservar",
      paragraphs: [
        "Firma electrónicamente y guarda justificante, número de registro y CSV.",
      ],
    },
  ],
  afterTitle: "Qué ocurre después",
  afterSteps: [
    {
      title: "Comprobación",
      description: "La AEAT revisa documentos, representación y reciprocidad.",
    },
    {
      title: "Requerimiento",
      description:
        "Puede solicitar certificados, facturas u otros justificantes.",
    },
    {
      title: "Resolución",
      description:
        "Puede conceder total o parcialmente, o denegar la solicitud.",
    },
    {
      title: "Conservación",
      description:
        "Guarda solicitud, anexos, requerimientos, respuestas y resolución.",
    },
  ],
  comparison: {
    title: "Modelo 361 y Modelo 360",
    current: {
      title: "Modelo 361",
      description:
        "Solicita IVA español para determinados empresarios establecidos fuera de la UE.",
    },
    related: {
      title: "Modelo 360",
      description:
        "Canaliza la devolución de IVA de otro Estado miembro para empresarios establecidos en España.",
      href: "/consultor-fiscal/modelos/360",
      label: "Ver Modelo 360",
    },
    additional: [
      {
        title: "Modelo 303",
        description:
          "Declara el IVA español periódico cuando existe esa obligación.",
        href: "/consultor-fiscal/modelos/303",
        label: "Ver Modelo 303",
      },
    ],
    conclusion:
      "El lugar de establecimiento y el territorio donde se soportó el IVA determinan el procedimiento.",
  },
  pdfNotice: [
    "Las instrucciones oficiales ayudan a preparar la solicitud, pero no garantizan la devolución.",
    "Factu no presenta, firma, cobra ni envía esta solicitud.",
  ],
  documents: [
    {
      label: "Consultar la estructura oficial del fichero de operaciones",
      sourceId:
        "aeat.model-361.operations-file-structure-pdf.captured-2026-07-13",
    },
  ],
  officialLinks: [
    {
      label: "Ficha administrativa de los Modelos 360 y 361",
      sourceId: "aeat.models-360-361.procedure-record.2026-06-09",
    },
    {
      label: "Instrucciones oficiales del Modelo 361",
      sourceId: "aeat.model-361.instructions.2025-07-29",
    },
    {
      label: "Ayuda de presentación",
      sourceId: "aeat.model-361.browser-file-help.2026-01-09",
    },
  ],
  legalLinks: [
    {
      label: "Orden EHA/789/2010",
      sourceId: "boe.models-360-361.order-eha-789-2010.original",
    },
    {
      label: "Ley 37/1992 del IVA",
      href: "https://www.boe.es/buscar/act.php?id=BOE-A-1992-28740",
    },
    {
      label: "Reglamento del IVA",
      href: "https://www.boe.es/buscar/act.php?id=BOE-A-1992-28925",
    },
  ],
  faq: [
    {
      question: "¿Lo utiliza un autónomo español?",
      answer: "No. No es su procedimiento habitual.",
    },
    {
      question: "¿Lo utiliza una empresa francesa?",
      answer: "No. Solicita el IVA español mediante el portal de Francia.",
    },
    {
      question: "¿Lo utiliza una empresa de Canarias?",
      answer: "No. Utiliza el procedimiento del Modelo 360.",
    },
    {
      question: "¿Es obligatorio tener representante?",
      answer: "Con carácter general, sí.",
    },
    {
      question: "¿Existe una excepción al representante?",
      answer:
        "Sí, para determinadas cuotas relacionadas exclusivamente con actividades acogidas a OSS.",
    },
    {
      question: "¿Qué significa reciprocidad?",
      answer:
        "Que el país del solicitante ofrece una devolución equivalente a empresarios establecidos en España.",
    },
    {
      question: "¿Quién reconoce la reciprocidad?",
      answer: "La Dirección General de Tributos.",
    },
    {
      question: "¿Qué documentos se necesitan?",
      answer:
        "Certificado de actividad, poder cuando proceda, facturas y los demás justificantes exigidos.",
    },
    {
      question: "¿Cuándo hay que aportar copias de facturas?",
      answer:
        "Cuando la base supera 1.000 €, o 250 € para carburante, sin perjuicio de otros requerimientos.",
    },
    {
      question: "¿Cuál es el periodo mínimo?",
      answer: "Tres meses, salvo la parte restante del año.",
    },
    {
      question: "¿Qué importes mínimos se aplican?",
      answer:
        "400 € para periodos inferiores al año y 50 € para el año o su parte restante.",
    },
    {
      question: "¿Cuál es la fecha límite?",
      answer: "El 30 de septiembre del año siguiente.",
    },
    {
      question: "¿Cuánto tarda?",
      answer: "Cuatro meses, ampliables hasta ocho con información adicional.",
    },
    {
      question: "¿El justificante garantiza la devolución?",
      answer: "No. Solo acredita la presentación.",
    },
    {
      question: "¿Sirve para corregir IVA mal facturado?",
      answer: "No. Debe solicitarse una factura rectificativa al proveedor.",
    },
  ],
  sourceIds: [
    "aeat.models-360-361.procedure-home.2026-06-09",
    "aeat.models-360-361.procedure-record.2026-06-09",
    "aeat.model-361.instructions.2025-07-29",
    "aeat.model-361.browser-file-help.2026-01-09",
    "aeat.model-361.operations-file-structure-pdf.captured-2026-07-13",
    "boe.models-360-361.order-eha-789-2010.original",
  ],
} as const satisfies FiscalModelPracticalGuideV1;
