import type { FiscalModelPracticalGuideV1 } from "./fiscal-model-practical-guide.types";

export const MODEL_296_GUIDE_V1 = {
  code: "296",
  effectiveYear: 2026,
  filingYear: 2027,
  lastVerifiedAt: "2026-07-14",
  requiresAnnualReview: true,
  intro: [
    "El Modelo 296 es la declaración informativa anual que identifica a las personas no residentes a las que se han pagado las rentas incluidas en el sistema del Modelo 216.",
    "No vuelve a pagar las retenciones: detalla por perceptor cómo se distribuyen los importes declarados periódicamente.",
    "Esta guía describe el procedimiento estatal de la AEAT. País Vasco y Navarra pueden aplicar competencias y trámites forales.",
  ],
  notices: [
    {
      title: "Incluye más que rentas con retención",
      paragraphs: [
        "También recoge determinadas rentas exentas o no sometidas a retención cuando existe obligación de informar.",
      ],
    },
    {
      title: "Debe conciliarse con el Modelo 216",
      paragraphs: [
        "Bases, retenciones y rentas declaradas durante el año deben poder explicarse mediante los registros individuales del 296.",
      ],
    },
    {
      title: "El diseño cambia según el ejercicio",
      paragraphs: [
        "No deben reutilizarse automáticamente claves, códigos o registros del año anterior.",
      ],
    },
    {
      title: "Novedades del ejercicio 2026",
      paragraphs: [
        "La Orden HAC/623/2026 modifica el diseño del Modelo 296 del ejercicio 2026, que se presentará en 2027.",
      ],
    },
  ],
  actions: [
    {
      label: "Abrir el procedimiento oficial del Modelo 296",
      sourceId: "aeat.model-296.procedure-home.2026-07-08",
      primary: true,
    },
    {
      label: "Consultar la ayuda del formulario",
      sourceId: "aeat.model-296.form-help.2026-06-19",
      primary: true,
    },
    {
      label: "Consultar la presentación mediante fichero",
      sourceId: "aeat.model-296.file-help.2026-06-19",
    },
    {
      label: "Consultar validaciones de TIN",
      sourceId: "aeat.model-296.tin-information.2026-06-09",
    },
    {
      label: "Ver el Modelo 216 relacionado",
      internalHref: "/consultor-fiscal/modelos/216",
    },
  ],
  quickSummaryTitle: "El Modelo 296 en pocas palabras",
  quickFacts: [
    { label: "Qué es", value: "Una declaración informativa anual." },
    { label: "Genera un pago", value: "No." },
    { label: "Quién lo presenta", value: "El retenedor o pagador." },
    {
      label: "A quién identifica",
      value: "Perceptores no residentes sin establecimiento permanente.",
    },
    { label: "Rentas exentas", value: "Incluye las que deban informarse." },
    {
      label: "Plazo general",
      value:
        "Durante enero del año siguiente, conforme al calendario de la campaña.",
    },
    {
      label: "Presentación",
      value: "Electrónica mediante formulario o fichero.",
    },
    {
      label: "Formulario",
      value:
        "Para declaraciones inferiores al límite de 40.000 registros publicado por la AEAT.",
    },
    {
      label: "Fichero",
      value:
        "Disponible para cualquier volumen y necesario a partir del límite de la campaña.",
    },
    { label: "Modelo relacionado", value: "Modelo 216." },
  ],
  sections: [
    {
      id: "model-296-information",
      title: "Qué información recoge",
      cards: [
        {
          title: "Identificación",
          bullets: [
            "NIF español, cuando exista, y TIN extranjero.",
            "Nombre o razón social, país, dirección y tipo de persona.",
            "Datos del pagador o mediador cuando proceda.",
          ],
        },
        {
          title: "Renta y tributación",
          bullets: [
            "Clave, subclave y tipo de renta.",
            "Importe íntegro, base, retención e ingreso a cuenta.",
            "Exención, convenio y código del país.",
          ],
        },
        {
          title: "Supuestos especiales",
          paragraphs: [
            "Determinadas operaciones con valores y el diseño anual pueden exigir campos adicionales. No todos los campos se cumplimentan para todos los perceptores.",
          ],
        },
      ],
    },
    {
      id: "model-296-included",
      title: "Rentas que pueden incluirse",
      cards: [
        {
          title: "Con retención",
          bullets: [
            "Alquileres de locales pagados a no residentes.",
            "Determinados servicios profesionales, cánones, intereses y dividendos.",
            "Otras rentas declaradas mediante el Modelo 216.",
          ],
        },
        {
          title: "Sin retención",
          bullets: [
            "Rentas exentas por normativa interna o convenio que deben informarse.",
            "Rentas respecto de las que se acreditó el pago del impuesto.",
          ],
        },
        {
          title: "No incluir automáticamente",
          bullets: [
            "Facturas extranjeras no sujetas a IRNR y compras de mercancías.",
            "Operaciones con establecimiento permanente o declaradas por modelos específicos.",
            "Perceptores residentes de los Modelos 180 o 190, IVA y pagos personales.",
          ],
        },
      ],
    },
    {
      id: "model-296-preparation",
      title: "Documentación que debe prepararse",
      cards: [
        {
          title: "Declaraciones e importes",
          bullets: [
            "Modelos 216 del ejercicio y sus complementarias.",
            "Facturas, contratos, importes brutos, retenciones y rentas exentas.",
            "Correcciones y certificados entregados.",
          ],
        },
        {
          title: "Perceptores",
          bullets: [
            "NIF, TIN, país y nombre correctos.",
            "Certificados de residencia y convenios aplicados.",
            "Tipo de renta e información de valores cuando corresponda.",
          ],
        },
      ],
    },
    {
      id: "model-296-reconciliation",
      title: "Comprobación con el Modelo 216",
      cards: [
        {
          title: "Conciliar totales",
          bullets: [
            "Suma bases y retenciones de todos los periodos y complementarias.",
            "Comprueba las rentas exentas y el número de rentas.",
            "Identifica a todos los perceptores y evita duplicidades.",
          ],
        },
        {
          title: "Revisar clasificación",
          bullets: [
            "Comprueba países, TIN, claves y convenios.",
            "Evita duplicar alquileres en el 180 o profesionales en el 190.",
            "Explica y corrige cualquier diferencia antes de presentar.",
          ],
        },
      ],
    },
    {
      id: "model-296-tin",
      title: "TIN, país y residencia",
      cards: [
        {
          title: "Qué es el TIN",
          paragraphs: [
            "Es el identificador fiscal extranjero. Debe ajustarse a la estructura publicada para el país correspondiente.",
          ],
        },
        {
          title: "Qué no demuestra",
          paragraphs: [
            "Una estructura válida no acredita por sí sola la residencia fiscal ni permite aplicar automáticamente un convenio.",
          ],
        },
        {
          title: "Comprobación oficial",
          paragraphs: [
            "La AEAT reúne enlaces a portales oficiales de estructura y validación de TIN. Debe comprobarse también el certificado de residencia.",
          ],
        },
      ],
    },
    {
      id: "model-296-keys-2026",
      title: "Claves y novedades del ejercicio 2026",
      cards: [
        {
          title: "Claves y subclaves",
          paragraphs: [
            "Identifican la naturaleza de la renta y su tratamiento. Deben obtenerse de las instrucciones del ejercicio y revisarse cada campaña.",
          ],
        },
        {
          title: "Diseño 2026 · presentación 2027",
          bullets: [
            "Redefinición del campo Código.",
            "Redefinición del Código emisor.",
            "Redefinición de Clave de mercado.",
            "Nuevo campo sobre personalidad del titular registral en determinados anexos de valores.",
          ],
        },
      ],
      note: "No apliques el diseño de 2026 a declaraciones del ejercicio 2025.",
    },
    {
      id: "model-296-filing",
      title: "Formulario, fichero y correcciones",
      cards: [
        {
          title: "Formulario web",
          paragraphs: [
            "Permite guardar, importar, añadir o eliminar registros, validar, presentar y recuperar una declaración dentro del límite de la campaña.",
          ],
        },
        {
          title: "Fichero",
          paragraphs: [
            "Puede utilizarse con cualquier volumen y debe ajustarse al diseño oficial. La vía TGVI permite tratar registros aceptados y rechazados conforme a su ayuda.",
          ],
        },
        {
          title: "Vista previa",
          paragraphs: [
            "El PDF es un borrador. Solo la firma, el envío y el justificante con CSV acreditan la presentación.",
          ],
        },
        {
          title: "Corrección web",
          paragraphs: [
            "Recupera la declaración, añade, modifica o elimina registros y presenta de nuevo el conjunto completo. El formulario actual no utiliza las antiguas opciones de complementaria y sustitutiva.",
          ],
        },
      ],
      note: "No mezcles el procedimiento de corrección del formulario con el de presentación mediante fichero.",
    },
    {
      id: "model-296-related",
      title: "Relación con otros modelos",
      cards: [
        {
          title: "Modelo 216",
          paragraphs: [
            "Declara periódicamente los totales. El 296 identifica después a los perceptores.",
          ],
          links: [
            { label: "Ver Modelo 216", href: "/consultor-fiscal/modelos/216" },
          ],
        },
        {
          title: "Modelos 180 y 190",
          paragraphs: [
            "Informan determinados perceptores residentes; no deben duplicarse operaciones en función de una clasificación incorrecta.",
          ],
          links: [
            { label: "Ver Modelo 180", href: "/consultor-fiscal/modelos/180" },
            { label: "Ver Modelo 190", href: "/consultor-fiscal/modelos/190" },
          ],
        },
      ],
    },
    {
      id: "model-296-mistakes",
      title: "Errores habituales",
      accordions: [
        {
          question: "No conciliar o clasificar mal",
          paragraphs: [
            "Omitir rentas exentas, incluir proveedores no sujetos, ignorar complementarias del 216 o duplicar perceptores.",
          ],
        },
        {
          question: "Confundir identificadores",
          paragraphs: [
            "Usar nacionalidad en vez de residencia, confundir TIN y NIF-IVA o considerar que un TIN válido acredita residencia.",
          ],
        },
        {
          question: "Reutilizar datos antiguos",
          paragraphs: [
            "Importar el año anterior sin revisar, usar claves obsoletas o aplicar el diseño de 2026 al ejercicio 2025.",
          ],
        },
        {
          question: "Presentar o corregir mal",
          paragraphs: [
            "Considerar válida la vista previa, presentar solo un registro corregido o mezclar el flujo web con TGVI.",
          ],
        },
      ],
    },
  ],
  fillingTitle: "Cómo preparar el Modelo 296",
  fillingSteps: [
    {
      title: "1. Identificar al declarante",
      paragraphs: ["Indica NIF, nombre o razón social, contacto y ejercicio."],
    },
    {
      title: "2. Añadir perceptores",
      paragraphs: [
        "Registra identificación, país, TIN, dirección, renta, importe, retención, exención y convenio.",
      ],
    },
    {
      title: "3. Cumplimentar datos especiales",
      paragraphs: [
        "Añade datos forales o anexos de valores solo cuando correspondan.",
      ],
    },
    {
      title: "4. Validar",
      paragraphs: [
        "Corrige errores y revisa avisos, TIN, países, claves, importes y conciliación con el 216.",
      ],
    },
    {
      title: "5. Revisar la vista previa",
      paragraphs: ["Úsala como borrador, no como prueba de presentación."],
    },
    {
      title: "6. Firmar y enviar",
      paragraphs: [
        "Presenta el conjunto correcto y guarda número de registro y CSV.",
      ],
    },
  ],
  afterTitle: "Qué ocurre después",
  afterSteps: [
    {
      title: "Justificante",
      description:
        "El CSV acredita la presentación; el PDF de vista previa no.",
    },
    {
      title: "Certificados",
      description:
        "El pagador entrega al perceptor la certificación cuando exista obligación.",
    },
    {
      title: "Corrección",
      description:
        "En el formulario, recupera y vuelve a presentar el conjunto completo corregido.",
    },
    {
      title: "Archivo",
      description:
        "Conserva 216, certificados de residencia, convenios, registros y justificante.",
    },
  ],
  comparison: {
    title: "Modelo 296 y Modelo 216",
    current: {
      title: "Modelo 296",
      description:
        "Identifica anualmente a cada perceptor no residente y su renta.",
    },
    related: {
      title: "Modelo 216",
      description: "Ingresa o declara periódicamente las retenciones del IRNR.",
      href: "/consultor-fiscal/modelos/216",
      label: "Ver Modelo 216",
    },
    additional: [
      {
        title: "Modelo 180",
        description:
          "Informa determinados alquileres con perceptores residentes.",
        href: "/consultor-fiscal/modelos/180",
        label: "Ver Modelo 180",
      },
      {
        title: "Modelo 190",
        description: "Informa determinadas rentas de perceptores residentes.",
        href: "/consultor-fiscal/modelos/190",
        label: "Ver Modelo 190",
      },
    ],
    conclusion:
      "El 216 declara totales por periodo; el 296 explica el año perceptor por perceptor.",
  },
  pdfNotice: [
    "La vista previa no acredita la presentación. Debe firmarse y enviarse la declaración y conservarse el justificante con CSV.",
  ],
  documents: [
    {
      label: "Consultar el diseño de registro oficial",
      sourceId: "aeat.model-296.register-design-pdf.2024-11-04",
    },
    {
      label: "Consultar la nota informativa oficial",
      sourceId: "aeat.model-296.information-note-pdf.2025-12-05",
    },
  ],
  officialLinks: [
    {
      label: "Ficha administrativa del procedimiento",
      sourceId: "aeat.model-296.procedure-record.2026-07-08",
    },
    {
      label: "Ayuda del formulario web",
      sourceId: "aeat.model-296.form-help.2026-06-19",
    },
    {
      label: "Ayuda de presentación mediante fichero",
      sourceId: "aeat.model-296.file-help.2026-06-19",
    },
    {
      label: "Portales oficiales de validación de TIN",
      sourceId: "aeat.model-296.tin-information.2026-06-09",
    },
  ],
  legalLinks: [
    {
      label: "Orden EHA/3290/2008",
      sourceId: "boe.model-296.order-eha-3290-2008.original",
    },
    {
      label: "Orden HAC/623/2026",
      sourceId: "boe.model-296.order-hac-623-2026.original",
    },
  ],
  faq: [
    {
      question: "¿Sirve para pagar retenciones?",
      answer: "No. Es una declaración informativa anual.",
    },
    {
      question: "¿Quién lo presenta?",
      answer:
        "El retenedor o pagador que declaró las rentas del sistema del Modelo 216.",
    },
    {
      question: "¿Incluye a cada no residente?",
      answer: "Sí, mediante registros individuales.",
    },
    {
      question: "¿Incluye rentas exentas?",
      answer: "Sí, cuando la normativa exige informarlas.",
    },
    {
      question: "¿Tiene que coincidir con el Modelo 216?",
      answer: "Sí. Cualquier diferencia debe poder explicarse y corregirse.",
    },
    {
      question: "¿Cuándo se presenta?",
      answer:
        "Durante enero del año siguiente, según el calendario oficial de la campaña.",
    },
    {
      question: "¿Qué es el TIN?",
      answer: "El identificador fiscal extranjero del perceptor.",
    },
    {
      question: "¿Un TIN válido demuestra residencia fiscal?",
      answer: "No. Debe comprobarse el certificado de residencia.",
    },
    {
      question: "¿Puedo importar el año anterior?",
      answer: "Sí, pero deben revisarse datos, claves y diseño del ejercicio.",
    },
    {
      question: "¿Qué cambia en el ejercicio 2026?",
      answer:
        "Cambian determinados campos técnicos, principalmente vinculados a registros de valores.",
    },
    {
      question: "¿La vista previa es válida?",
      answer: "No. Es solo un borrador.",
    },
    {
      question: "¿Cómo corrijo un error en el formulario?",
      answer: "Recupera, corrige y vuelve a presentar el conjunto completo.",
    },
    {
      question: "¿Puede presentarlo mi asesor?",
      answer:
        "Sí, mediante los sistemas de representación o colaboración admitidos.",
    },
    {
      question: "¿El formulario y el fichero se corrigen igual?",
      answer: "No. Cada vía tiene su propio procedimiento.",
    },
    {
      question: "¿Debo revisar las claves cada año?",
      answer: "Sí. El diseño y las instrucciones pueden cambiar por ejercicio.",
    },
  ],
  sourceIds: [
    "aeat.model-296.procedure-home.2026-07-08",
    "aeat.model-296.procedure-record.2026-07-08",
    "aeat.model-296.form-help.2026-06-19",
    "aeat.model-296.file-help.2026-06-19",
    "aeat.model-296.tin-information.2026-06-09",
    "aeat.model-296.register-design-pdf.2024-11-04",
    "aeat.model-296.information-note-pdf.2025-12-05",
    "boe.model-296.order-eha-3290-2008.original",
    "boe.model-296.order-hac-623-2026.original",
  ],
} as const satisfies FiscalModelPracticalGuideV1;
