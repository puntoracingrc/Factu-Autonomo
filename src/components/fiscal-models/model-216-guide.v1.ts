import type { FiscalModelPracticalGuideV1 } from "./fiscal-model-practical-guide.types";

export const MODEL_216_GUIDE_V1 = {
  code: "216",
  effectiveYear: 2026,
  lastVerifiedAt: "2026-07-14",
  requiresAnnualReview: true,
  intro: [
    "El Modelo 216 sirve para ingresar las retenciones correspondientes a determinadas rentas de fuente española que un autónomo, empresa o entidad paga a una persona no residente que no opera mediante establecimiento permanente.",
    "No se presenta por cualquier factura extranjera. Antes hay que analizar la residencia fiscal, el tipo de renta, dónde se obtiene, si existe establecimiento permanente y qué dispone el convenio aplicable.",
    "Esta guía describe el procedimiento estatal de la AEAT. País Vasco y Navarra pueden aplicar competencias y trámites forales.",
  ],
  notices: [
    {
      title: "Lo presenta el pagador obligado a retener",
      paragraphs: [
        "No lo presenta la persona no residente que recibe el pago.",
      ],
    },
    {
      title: "Proveedor extranjero no equivale a retención",
      paragraphs: [
        "La nacionalidad, una factura extranjera o un número de IVA no determinan por sí solos que deba presentarse el modelo.",
      ],
    },
    {
      title: "El certificado de residencia es esencial",
      paragraphs: [
        "Antes de aplicar una exención o un convenio debe conservarse un certificado fiscal válido y coherente con el perceptor y el periodo.",
      ],
    },
    {
      title: "Alquiler a propietario no residente",
      paragraphs: [
        "Si el arrendador de un local español es no residente, puede corresponder el Modelo 216 y no el Modelo 115.",
      ],
    },
  ],
  actions: [
    {
      label: "Abrir el procedimiento oficial del Modelo 216",
      sourceId: "aeat.model-216.procedure-home.2026-07-02",
      primary: true,
    },
    {
      label: "Consultar las instrucciones vigentes",
      sourceId: "aeat.model-216.current-instructions.2026-06-09",
      primary: true,
    },
    {
      label: "Consultar la ayuda del formulario",
      sourceId: "aeat.model-216.current-help.2026-06-19",
    },
    {
      label: "Ver el Modelo 296 relacionado",
      internalHref: "/consultor-fiscal/modelos/296",
    },
  ],
  quickSummaryTitle: "El Modelo 216 en pocas palabras",
  quickFacts: [
    {
      label: "Qué es",
      value:
        "Una autoliquidación de retenciones del Impuesto sobre la Renta de no Residentes (IRNR).",
    },
    { label: "Quién lo presenta", value: "El pagador obligado a retener." },
    {
      label: "Perceptor",
      value: "Persona o entidad no residente sin establecimiento permanente.",
    },
    {
      label: "Periodicidad",
      value:
        "Normalmente trimestral; mensual para grandes empresas y determinados obligados.",
    },
    {
      label: "Plazo trimestral",
      value: "Primeros veinte días naturales de abril, julio, octubre y enero.",
    },
    {
      label: "Resultado",
      value:
        "Habitualmente a ingresar; declaración negativa en supuestos concretos.",
    },
    { label: "Sin rentas", value: "No se presenta vacío." },
    { label: "Resumen anual", value: "Modelo 296." },
    { label: "Presentación", value: "Electrónica." },
  ],
  sections: [
    {
      id: "model-216-who",
      title: "Quién puede estar obligado",
      cards: [
        {
          title: "Pagadores incluidos",
          bullets: [
            "Autónomos y empresas residentes que actúan en su actividad.",
            "Entidades en atribución de rentas.",
            "Establecimientos permanentes y otros obligados previstos en la normativa.",
          ],
        },
        {
          title: "No es automático",
          paragraphs: [
            "Una persona física que paga fuera de una actividad económica no se convierte por ello en retenedor en todos los casos.",
          ],
        },
      ],
    },
    {
      id: "model-216-income",
      title: "Rentas que pueden incluirse",
      cards: [
        {
          title: "Alquiler de local español",
          paragraphs: [
            "Cuando el propietario es no residente, el inquilino puede tener que retener, ingresar mediante el 216 e identificar al arrendador en el 296.",
          ],
          links: [
            { label: "Ver Modelo 296", href: "/consultor-fiscal/modelos/296" },
          ],
        },
        {
          title: "Servicios profesionales",
          paragraphs: [
            "Debe analizarse dónde se realiza el trabajo, el origen de la renta, la residencia, el convenio y la existencia de establecimiento permanente.",
          ],
        },
        {
          title: "Otras rentas",
          bullets: [
            "Cánones y derechos de propiedad intelectual o industrial.",
            "Determinadas asistencias técnicas, intereses y dividendos.",
            "Determinados rendimientos del trabajo, premios y otras rentas previstas.",
          ],
        },
      ],
    },
    {
      id: "model-216-not-automatic",
      title: "Pagos que no deben incluirse automáticamente",
      cards: [
        {
          title: "Operaciones ordinarias",
          bullets: [
            "Compras de mercancías.",
            "Servicios que no constituyen renta obtenida en España.",
            "Pagos a quien opera mediante establecimiento permanente.",
            "Pagos particulares ajenos a la actividad e importes de IVA.",
          ],
        },
        {
          title: "Modelos específicos",
          bullets: [
            "Modelo 211 para determinadas compras de inmuebles a vendedores no residentes.",
            "Modelo 117 para determinados reembolsos o transmisiones de instituciones de inversión colectiva.",
            "Modelo 230 para determinados premios de loterías y apuestas.",
          ],
        },
      ],
    },
    {
      id: "model-216-rent-professional",
      title: "Alquileres y profesionales no residentes",
      cards: [
        {
          title: "Local en España",
          paragraphs: [
            "El alquiler constituye, con carácter general, renta española. El tipo interno publicado para 2026 es 19 % para residentes de la UE, Islandia, Noruega y Liechtenstein, y 24 % para el resto, sin perjuicio del convenio y de las circunstancias del perceptor.",
          ],
        },
        {
          title: "Servicio profesional",
          paragraphs: [
            "Por ejemplo, contratar a un consultor residente en Portugal no permite concluir automáticamente si existe retención. El convenio, el lugar y forma de prestación y la documentación pueden cambiar el resultado.",
          ],
        },
      ],
      note: "No apliques un porcentaje únicamente a partir de la nacionalidad.",
    },
    {
      id: "model-216-residence-treaty",
      title: "Certificado de residencia y convenios",
      cards: [
        {
          title: "Certificado fiscal",
          bullets: [
            "Comprueba nombre o razón social, país, autoridad emisora, periodo y validez para el convenio.",
            "La factura, una declaración del proveedor o el NIF-IVA no siempre lo sustituyen.",
          ],
        },
        {
          title: "Convenio aplicable",
          paragraphs: [
            "Puede reducir el tipo, impedir que España grave la renta, exigir que no exista establecimiento permanente o definir de otro modo cánones, servicios y beneficios empresariales.",
          ],
        },
      ],
      note: "No debe sustituirse la consulta del convenio por una tabla privada simplificada.",
    },
    {
      id: "model-216-base-negative",
      title: "Base y declaraciones negativas",
      cards: [
        {
          title: "Base de la retención",
          paragraphs: [
            "Con carácter general, la retención se vincula a la deuda que derivaría del IRNR. El pagador no descuenta automáticamente gastos que el perceptor pudiera deducir después.",
          ],
        },
        {
          title: "Declaración negativa",
          paragraphs: [
            "Puede existir obligación sin retención por determinadas rentas exentas, rentas exentas por convenio o supuestos con pago previo acreditado. No todas las exenciones exigen declaración negativa.",
          ],
        },
        {
          title: "Sin operaciones",
          paragraphs: [
            "No se presenta un Modelo 216 vacío cuando no se ha satisfecho ninguna renta incluida.",
          ],
        },
      ],
    },
    {
      id: "model-216-deadlines-corrections",
      title: "Plazos, pago y correcciones",
      cards: [
        {
          title: "Plazo trimestral",
          paragraphs: [
            "Primeros veinte días naturales de abril, julio, octubre y enero. Los obligados mensuales presentan en los primeros veinte días del mes siguiente; la domiciliación puede cerrar antes.",
          ],
        },
        {
          title: "Complementaria",
          paragraphs: [
            "Puede proceder cuando la declaración anterior produjo un ingreso inferior al correcto. Incluye todos los datos correctos e identifica el justificante previo.",
          ],
        },
        {
          title: "Ingreso excesivo",
          paragraphs: [
            "Si se pagó de más o el error perjudica al declarante, se utiliza el procedimiento de rectificación correspondiente, no se copia automáticamente el del Modelo 303.",
          ],
        },
      ],
    },
    {
      id: "model-216-296",
      title: "Relación con el Modelo 296",
      cards: [
        {
          title: "Modelo 216",
          paragraphs: [
            "Declara los totales periódicos de bases y retenciones.",
          ],
        },
        {
          title: "Modelo 296",
          paragraphs: [
            "Identifica anualmente a cada perceptor, su país, renta, importe, retención, exención o convenio. Sus totales deben poder conciliarse.",
          ],
          links: [
            { label: "Ver Modelo 296", href: "/consultor-fiscal/modelos/296" },
          ],
        },
      ],
    },
    {
      id: "model-216-mistakes",
      title: "Errores habituales",
      accordions: [
        {
          question: "Clasificar por nacionalidad o factura",
          paragraphs: [
            "Presentar por cualquier proveedor extranjero, confundir nacionalidad y residencia o no revisar establecimiento permanente.",
          ],
        },
        {
          question: "Aplicar tipo o convenio sin prueba",
          paragraphs: [
            "Usar siempre 19 % o 24 %, aplicar un convenio sin certificado o incluir el IVA de forma incorrecta.",
          ],
        },
        {
          question: "Elegir otro modelo",
          paragraphs: [
            "Usar el 115 para un arrendador no residente, el 111 para cualquier profesional extranjero u omitir un modelo específico.",
          ],
        },
        {
          question: "Declarar o corregir mal",
          paragraphs: [
            "Omitir rentas exentas declarables, presentar vacío, olvidar el 296 o usar una complementaria cuando se ingresó de más.",
          ],
        },
      ],
    },
  ],
  fillingTitle: "Cómo preparar el Modelo 216",
  fillingSteps: [
    {
      title: "1. Identificación y periodo",
      paragraphs: [
        "Indica NIF, nombre o razón social, ejercicio y trimestre o mes correspondiente.",
      ],
    },
    {
      title: "2. Rentas sometidas a retención",
      paragraphs: [
        "Separa dividendos y otras participaciones del resto e indica número de rentas, bases y retenciones.",
      ],
    },
    {
      title: "3. Rentas sin retención",
      paragraphs: [
        "Informa por separado los dividendos y el resto cuando exista obligación de declaración negativa.",
      ],
    },
    {
      title: "4. Revisar totales",
      paragraphs: [
        "Comprueba número de rentas, bases y retenciones y concílialos con la documentación.",
      ],
    },
    {
      title: "5. Complementaria, si procede",
      paragraphs: [
        "Úsala solo cuando aumenta el importe e identifica la declaración anterior.",
      ],
    },
    {
      title: "6. Pago, firma y justificante",
      paragraphs: [
        "Elige una forma admitida, firma, envía y guarda número de registro y CSV.",
      ],
    },
  ],
  afterTitle: "Qué ocurre después",
  afterSteps: [
    {
      title: "Ingreso",
      description:
        "La presentación canaliza las retenciones del periodo; el justificante acredita el envío.",
    },
    {
      title: "Certificación",
      description:
        "El retenedor pone a disposición del perceptor la certificación exigible de rentas y retenciones.",
    },
    {
      title: "Resumen anual",
      description:
        "Prepara el detalle individual del Modelo 296 y concilia sus importes con los periodos.",
    },
    {
      title: "Archivo",
      description:
        "Conserva facturas, contratos, certificados de residencia, convenio aplicado y justificantes.",
    },
  ],
  comparison: {
    title: "Modelo 216, Modelo 115 y Modelo 296",
    current: {
      title: "Modelo 216",
      description:
        "Ingresa periódicamente determinadas retenciones sobre rentas pagadas a no residentes.",
    },
    related: {
      title: "Modelo 296",
      description:
        "Detalla anualmente perceptores e importes del sistema del 216.",
      href: "/consultor-fiscal/modelos/296",
      label: "Ver Modelo 296",
    },
    additional: [
      {
        title: "Modelo 115",
        description:
          "Se utiliza para determinados alquileres cuando el arrendador tributa como residente.",
        href: "/consultor-fiscal/modelos/115",
        label: "Ver Modelo 115",
      },
    ],
    conclusion:
      "La residencia fiscal y el tipo de renta determinan la declaración; no basta con que la contraparte sea extranjera.",
  },
  pdfNotice: [
    "Una sesión guardada, un fichero exportado o una vista previa no acreditan la presentación. Debe obtenerse el justificante con CSV.",
  ],
  documents: [],
  officialLinks: [
    {
      label: "Ficha administrativa del procedimiento",
      sourceId: "aeat.model-216.procedure-record.2026-06-09",
    },
    {
      label: "Instrucciones del formulario vigente",
      sourceId: "aeat.model-216.current-instructions.2026-06-09",
    },
    {
      label: "Ayuda técnica del formulario",
      sourceId: "aeat.model-216.current-help.2026-06-19",
    },
    {
      label: "Información oficial sobre retenciones a no residentes",
      href: "https://sede.agenciatributaria.gob.es/Sede/no-residentes/irnr-sin-establecimiento-permanente/retenciones-irnr-sin-establecimiento-permanente.html",
    },
  ],
  legalLinks: [
    {
      label: "Orden EHA/3290/2008",
      sourceId: "boe.model-216.order-eha-3290-2008",
    },
    { label: "Orden HAC/56/2024", sourceId: "boe.model-216.order-hac-56-2024" },
    {
      label: "Orden HAP/2194/2013",
      sourceId: "boe.model-216.order-hap-2194-2013",
    },
  ],
  faq: [
    {
      question: "¿Se presenta por cualquier factura extranjera?",
      answer:
        "No. Debe existir una renta incluida y obligación de retener o de declarar negativamente.",
    },
    {
      question: "¿Quién presenta el Modelo 216?",
      answer: "El pagador obligado a retener.",
    },
    {
      question:
        "¿Qué ocurre si alquilo un local a un propietario no residente?",
      answer: "Puede corresponder el 216 y, después, el 296.",
    },
    {
      question: "¿Utilizo el Modelo 115 para ese alquiler?",
      answer:
        "No cuando el arrendador tributa como no residente sin establecimiento permanente.",
    },
    {
      question: "¿Qué ocurre con un profesional extranjero?",
      answer:
        "Debe analizarse dónde se obtiene la renta, su residencia, el convenio y la existencia de establecimiento permanente.",
    },
    {
      question: "¿Necesito certificado de residencia?",
      answer:
        "Es esencial para acreditar la residencia y aplicar determinados convenios o exenciones.",
    },
    {
      question: "¿Qué tipo aplico?",
      answer:
        "Depende del país, la renta, la normativa, la documentación y el convenio.",
    },
    {
      question: "¿Se presenta si no existe retención?",
      answer: "En determinados casos corresponde una declaración negativa.",
    },
    {
      question: "¿Se presenta si no pagué ninguna renta?",
      answer: "No se presenta vacío por ese motivo.",
    },
    {
      question: "¿Cuándo se presenta?",
      answer:
        "Normalmente en los primeros veinte días de abril, julio, octubre y enero.",
    },
    {
      question: "¿Tengo que presentar el Modelo 296?",
      answer:
        "Con carácter general, sí, cuando existen rentas incluidas en este sistema.",
    },
    {
      question: "¿Cómo corrijo un error?",
      answer: "Depende de si se ingresó menos o más de lo correcto.",
    },
    {
      question: "¿Una factura prueba la residencia fiscal?",
      answer: "No. Debe conservarse el certificado fiscal adecuado.",
    },
    {
      question: "¿El convenio elimina siempre la retención?",
      answer:
        "No. Hay que leer el convenio y comprobar sus requisitos para la renta concreta.",
    },
    {
      question: "¿El Modelo 216 identifica a cada perceptor?",
      answer:
        "Declara totales del periodo; el detalle individual se informa en el Modelo 296.",
    },
  ],
  sourceIds: [
    "aeat.model-216.procedure-home.2026-07-02",
    "aeat.model-216.procedure-record.2026-06-09",
    "aeat.model-216.current-help.2026-06-19",
    "aeat.model-216.current-instructions.2026-06-09",
    "boe.model-216.order-eha-3290-2008",
    "boe.model-216.order-hac-56-2024",
    "boe.model-216.order-hap-2194-2013",
  ],
} as const satisfies FiscalModelPracticalGuideV1;
