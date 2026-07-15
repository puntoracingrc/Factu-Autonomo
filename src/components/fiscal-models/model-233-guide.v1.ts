import type { FiscalModelPracticalGuideV1 } from "./fiscal-model-practical-guide.types";

export const MODEL_233_GUIDE_V1 = {
  code: "233",
  effectiveYear: 2026,
  taxPeriodYear: 2025,
  filingYear: 2026,
  lastVerifiedAt: "2026-07-15",
  requiresAnnualReview: true,
  intro: [
    "El Modelo 233 es la declaración informativa anual que presentan guarderías y centros de educación infantil autorizados sobre menores y gastos de custodia. La AEAT advierte expresamente que no lo presentan los padres o tutores.",
    "Desde la información correspondiente a 2025, el centro identifica si dispone de autorización educativa o de otro tipo de autorización necesaria para la apertura y funcionamiento de la actividad de custodia. El dato se utiliza en la declaración de la Renta, pero el centro no concede la deducción.",
  ],
  notices: [
    {
      title: "Datos especialmente sensibles",
      paragraphs: [
        "La declaración contiene información de menores, progenitores y gastos familiares. Factu no solicita, importa, almacena, valida ni envía esos datos.",
      ],
    },
    {
      title: "Informar no garantiza una deducción",
      paragraphs: [
        "El centro comunica gastos e importes subvencionados. La declaración de la Renta determina qué parte puede generar el incremento de la deducción por maternidad.",
      ],
    },
  ],
  actions: [
    {
      label: "Comprobar si el centro debe presentarlo",
      sourceId: "aeat.model-233.faq.2026-07-08",
      primary: true,
    },
    {
      label: "Abrir la página oficial del Modelo 233",
      sourceId: "aeat.model-233.procedure-home.2026-07-08",
    },
    {
      label: "Consultar la declaración de la Renta",
      internalHref: "/consultor-fiscal/modelos/100",
    },
  ],
  quickSummaryTitle: "Modelo 233 en un vistazo",
  quickFacts: [
    {
      label: "Quién lo presenta",
      value:
        "La guardería o centro infantil autorizado, con las reglas especiales de titularidad y gestión.",
    },
    {
      label: "Quién no lo presenta",
      value: "Los padres, tutores, adoptantes o acogedores.",
    },
    {
      label: "Qué informa",
      value:
        "Menores, progenitores, meses completos, gastos anuales y subvenciones.",
    },
    {
      label: "Autorizaciones",
      value:
        "Tipo 1 educativa; tipo 2 otra autorización necesaria para apertura y funcionamiento.",
    },
    { label: "Periodicidad", value: "Anual, durante enero del año siguiente." },
    {
      label: "Relación",
      value:
        "La familia utiliza su declaración de la Renta; el Modelo 140 no solicita este incremento.",
    },
  ],
  sections: [
    {
      id: "model-233-obligated",
      title: "Quién presenta la declaración",
      cards: [
        {
          title: "Centro privado",
          paragraphs: [
            "La guardería o centro autorizado comunica la información. Una entidad privada con varios centros presenta una declaración e identifica el centro correspondiente en cada registro.",
          ],
        },
        {
          title: "Centro público con NIF",
          paragraphs: [
            "Si el centro público tiene NIF propio, presenta su propia declaración.",
          ],
        },
        {
          title: "Centro público sin NIF",
          paragraphs: [
            "Presenta una declaración el departamento, consejería, organismo o entidad titular con su NIF.",
          ],
        },
        {
          title: "Gestión indirecta",
          paragraphs: [
            "Debe comprobarse quién factura y percibe los importes. La entidad gestora o cobradora presenta según la relación real descrita por la AEAT; no se atribuye automáticamente al propietario del edificio.",
          ],
        },
      ],
      note: "Los progenitores y tutores nunca presentan el Modelo 233 por sí mismos.",
    },
    {
      id: "model-233-authorizations",
      title: "Dos tipos de autorización desde 2025",
      cards: [
        {
          title: "Tipo 1 · autorización educativa",
          paragraphs: [
            "Autorización expedida por la administración educativa competente.",
          ],
          bullets: [
            "Organismo o comunidad autónoma.",
            "Código del centro.",
            "Datos y vigencia de la autorización cuando procedan.",
          ],
        },
        {
          title: "Tipo 2 · otra autorización",
          paragraphs: [
            "Otro tipo de autorización que resulte necesaria para la apertura y funcionamiento de la actividad de custodia de menores conforme a la normativa aplicable.",
          ],
        },
        {
          title: "Primera aplicación",
          paragraphs: [
            "El nuevo tipo de autorización se aplica por primera vez a la información del ejercicio 2025 que se presenta en 2026.",
          ],
        },
        {
          title: "No forzar la autorización educativa",
          paragraphs: [
            "Una guardería puede contar con la autorización de funcionamiento exigida por su normativa aunque no sea una autorización educativa. Debe consignarse el tipo real.",
          ],
        },
      ],
    },
    {
      id: "model-233-children-family",
      title: "Menores y responsables",
      cards: [
        {
          title: "Datos del menor",
          bullets: [
            "Nombre y apellidos.",
            "Fecha de nacimiento.",
            "NIF cuando exista.",
            "Centro correspondiente.",
            "Meses completos.",
          ],
        },
        {
          title: "Progenitores o responsables",
          bullets: [
            "NIF, nombre y apellidos de la madre o persona con guarda exclusiva.",
            "Datos del otro progenitor.",
            "Adoptantes, tutores o acogedores según corresponda.",
            "Guarda exclusiva cuando exista.",
          ],
        },
        {
          title: "Menor que cumple tres años",
          paragraphs: [
            "La información puede alcanzar los meses posteriores al tercer cumpleaños hasta el mes anterior a aquel en que pueda comenzar el segundo ciclo de educación infantil.",
          ],
        },
        {
          title: "Meses completos",
          paragraphs: [
            "Solo se marcan meses contratados por completo, aunque contengan días no lectivos. Una asistencia de parte del mes no se convierte automáticamente en mes completo.",
          ],
        },
      ],
    },
    {
      id: "model-233-expenses",
      title: "Gastos e importes subvencionados",
      cards: [
        {
          title: "Gastos incluidos",
          bullets: [
            "Inscripción.",
            "Matrícula.",
            "Asistencia.",
            "Horario general.",
            "Horario ampliado.",
            "Alimentación.",
          ],
        },
        {
          title: "Importe total",
          paragraphs: [
            "Se informa el total satisfecho con independencia de si paga la madre, el otro progenitor, adoptante, tutor, acogedor o la empresa de cualquiera de ellos.",
          ],
        },
        {
          title: "Empresa del progenitor",
          paragraphs: [
            "La cantidad satisfecha por la empresa no se resta del gasto anual total informado.",
          ],
        },
        {
          title: "Subvención",
          paragraphs: [
            "La subvención abonada directamente al centro se informa separadamente; no se resta del total para ocultarla.",
          ],
        },
      ],
    },
    {
      id: "model-233-maternity",
      title: "Relación con la deducción por maternidad",
      intro: [
        "El incremento por gastos de custodia puede alcanzar hasta 1.000 euros anuales cuando se cumplen los requisitos legales, pero el Modelo 233 no lo concede ni lo paga.",
      ],
      cards: [
        {
          title: "Modelo 100",
          paragraphs: [
            "El progenitor aplica, cuando proceda, la deducción y su incremento en la declaración de la Renta.",
          ],
          links: [
            {
              label: "Consultar el Modelo 100",
              href: "/consultor-fiscal/modelos/100",
            },
          ],
        },
        {
          title: "Modelo 140",
          paragraphs: [
            "El abono anticipado de maternidad se gestiona por el Modelo 140, pero el incremento de guardería no se solicita anticipadamente mediante ese modelo.",
          ],
          links: [
            {
              label: "Consultar el Modelo 140",
              href: "/consultor-fiscal/modelos/140",
            },
          ],
        },
      ],
      note: "El centro informa. No promete a la familia que el total comunicado sea deducible ni calcula el resultado de Renta.",
    },
    {
      id: "model-233-deadline-corrections",
      title: "Plazo, consulta y modificación",
      cards: [
        {
          title: "Regla general",
          paragraphs: ["Durante enero del año siguiente al de la información."],
        },
        {
          title: "Información de 2025",
          paragraphs: [
            "Del 1 de enero al 2 de febrero de 2026, con el posible margen técnico adicional de cuatro días en los supuestos reglamentarios.",
          ],
        },
        {
          title: "Consulta y modificación",
          bullets: [
            "Cargar la declaración presentada.",
            "Añadir o corregir menores.",
            "Corregir importes o autorizaciones.",
            "Eliminar registros conforme al formulario.",
            "Validar y volver a presentar la información actualizada.",
          ],
        },
        {
          title: "No duplicar",
          paragraphs: [
            "Antes de crear otra declaración debe comprobarse cómo afectará a la anterior y utilizar la gestión oficial de consulta y modificación.",
          ],
        },
      ],
    },
    {
      id: "model-233-mistakes",
      title: "Errores habituales",
      cards: [
        {
          title: "Presentador incorrecto",
          bullets: [
            "Que lo presente un progenitor.",
            "Una declaración por cada centro privado de la misma entidad.",
            "Incluir un centro público con NIF propio en la declaración de otra entidad.",
          ],
        },
        {
          title: "Autorización",
          bullets: [
            "Omitir guarderías con autorización válida no educativa.",
            "Usar el esquema anterior a 2025.",
            "No indicar el tipo 1 o 2.",
            "No actualizar el centro tras importar el ejercicio anterior.",
          ],
        },
        {
          title: "Menores y responsables",
          bullets: [
            "Marcar meses incompletos como completos.",
            "Omitir al otro progenitor.",
            "Omitir la guarda exclusiva.",
            "No corregir un NIF erróneo.",
          ],
        },
        {
          title: "Importes y deducción",
          bullets: [
            "Restar lo pagado por la empresa.",
            "Restar subvenciones en lugar de informarlas aparte.",
            "Confundir 233 y 140.",
            "Prometer la deducción.",
            "Guardar datos de menores en Factu.",
          ],
        },
      ],
    },
  ],
  fillingTitle: "Cómo preparar el Modelo 233",
  fillingSteps: [
    {
      title: "1. Declarante y centro",
      paragraphs: [
        "Identificar NIF, razón social, contacto, centro y tipo de autorización.",
      ],
      bullets: [
        "Código.",
        "Organismo.",
        "Fecha.",
        "Titular de la autorización.",
      ],
    },
    {
      title: "2. Menores y responsables",
      paragraphs: [
        "Completar identificación, fecha de nacimiento, meses completos, progenitores y guarda exclusiva cuando corresponda.",
      ],
    },
    {
      title: "3. Gastos",
      paragraphs: [
        "Informar el total anual y, en campo separado, la subvención directa, vinculados al centro correcto.",
      ],
    },
    {
      title: "4. Validar y presentar",
      paragraphs: [
        "Revisar NIF, fechas, meses, importes y autorización; acceder con certificado, DNIe o Cl@ve cuando el declarante persona física pueda usarla.",
      ],
      bullets: [
        "Guardar justificante y Código Seguro de Verificación (CSV).",
        "No almacenar el expediente en Factu.",
      ],
    },
  ],
  afterTitle: "Después de presentar",
  afterSteps: [
    {
      title: "Revisar el justificante",
      description:
        "Comprobar ejercicio, centro, número de registros y estado de presentación.",
    },
    {
      title: "Corregir en la sede",
      description:
        "Usar consulta y modificación para actualizar menores, importes o autorización sin duplicar la declaración.",
    },
    {
      title: "Responder a las familias",
      description:
        "Explicar qué se ha informado sin confirmar el derecho ni la cuantía de la deducción.",
    },
  ],
  comparison: {
    title: "Centro, Renta y abono anticipado",
    current: {
      title: "Modelo 233",
      description:
        "Información anual que presenta la guardería o centro autorizado.",
    },
    related: {
      title: "Modelo 100",
      description:
        "Declaración de la Renta en la que la familia aplica la deducción cuando cumple sus requisitos.",
      href: "/consultor-fiscal/modelos/100",
      label: "Ver Modelo 100",
    },
    additional: [
      {
        title: "Modelo 140",
        description:
          "Abono anticipado de la deducción por maternidad; no anticipa el incremento por guardería.",
        href: "/consultor-fiscal/modelos/140",
        label: "Ver Modelo 140",
      },
    ],
    conclusion:
      "El centro informa gastos; la familia declara la Renta; la AEAT determina el resultado. Son funciones distintas.",
  },
  pdfNotice: [
    "La guía oficial contiene ejemplos y ayuda de cumplimentación. No debe rellenarse con datos reales dentro de Factu ni confundirse con una declaración presentada.",
  ],
  documents: [
    {
      label: "Guía oficial del Modelo 233 para 2025 y siguientes",
      sourceId: "aeat.model-233.guide-pdf.exercise-2025",
    },
  ],
  officialLinks: [
    {
      label: "Ficha administrativa del procedimiento",
      sourceId: "aeat.model-233.procedure-record.2026-07-08",
    },
    {
      label: "Nota informativa sobre las autorizaciones",
      sourceId: "aeat.model-233.information-note.2026-07-08",
    },
    {
      label: "Preguntas frecuentes y ejemplos",
      sourceId: "aeat.model-233.faq.2026-07-08",
    },
    {
      label: "Ayuda técnica del formulario",
      sourceId: "aeat.model-233.presentation-help.2026-06-19",
    },
    {
      label: "Documentación para la presentación",
      sourceId: "aeat.model-233.documentation.2026-07-08",
    },
    {
      label: "Plazo de presentación de la campaña 2025",
      href: "https://sede.agenciatributaria.gob.es/Sede/todas-gestiones/impuestos-tasas/declaraciones-informativas/modelo-233-decla_____erias-centros-educacion-autorizados_/plazos-presentacion.html",
    },
  ],
  legalLinks: [
    {
      label: "Orden HAC/1400/2018",
      sourceId: "boe.model-233.order-hac-1400-2018",
    },
    {
      label: "Orden HAC/1154/2020",
      sourceId: "boe.model-233.order-hac-1154-2020",
    },
    {
      label: "Orden HAC/682/2025",
      sourceId: "boe.model-233.order-hac-682-2025",
    },
    {
      label: "Orden HAP/2194/2013",
      sourceId: "boe.electronic-filing.order-hap-2194-2013",
    },
  ],
  faq: [
    {
      question: "¿Lo presentan los padres?",
      answer: "No. Lo presenta la guardería o centro autorizado.",
    },
    {
      question: "¿Qué centros están incluidos?",
      answer:
        "Centros de educación infantil autorizados y guarderías con la autorización necesaria para abrir y funcionar según su normativa.",
    },
    {
      question: "¿Qué significan los tipos 1 y 2?",
      answer:
        "Tipo 1 es autorización educativa; tipo 2 es otra autorización necesaria para la apertura y funcionamiento de la custodia.",
    },
    {
      question: "¿Cuándo empezó este cambio?",
      answer: "En la información del ejercicio 2025 que se presenta en 2026.",
    },
    {
      question: "¿Qué menores se informan?",
      answer:
        "Menores de tres años y, en el supuesto previsto, meses posteriores hasta antes de poder iniciar el segundo ciclo infantil.",
    },
    {
      question: "¿Qué meses se marcan?",
      answer:
        "Los meses contratados por completo, aunque incluyan días no lectivos.",
    },
    {
      question: "¿Qué gastos se incluyen?",
      answer:
        "Inscripción, matrícula, asistencia, horario general o ampliado y alimentación, entre otros incluidos oficialmente.",
    },
    {
      question: "¿Se resta lo pagado por la empresa?",
      answer: "No del total anual informado.",
    },
    {
      question: "¿Se restan las subvenciones?",
      answer: "No del total; se informan separadamente en su campo.",
    },
    {
      question: "¿El centro concede la deducción?",
      answer:
        "No. Solo informa; la declaración de la Renta determina el derecho y su cuantía.",
    },
    {
      question: "¿Se solicita mediante el Modelo 140?",
      answer:
        "No. El incremento por guardería se aplica en la Renta, no como abono anticipado del 140.",
    },
    {
      question: "¿Puede modificarse después?",
      answer:
        "Sí, mediante la gestión oficial de consulta y modificación de declaraciones presentadas.",
    },
  ],
  sourceIds: [
    "aeat.model-233.procedure-home.2026-07-08",
    "aeat.model-233.procedure-record.2026-07-08",
    "aeat.model-233.information-note.2026-07-08",
    "aeat.model-233.faq.2026-07-08",
    "aeat.model-233.presentation-help.2026-06-19",
    "aeat.model-233.documentation.2026-07-08",
    "aeat.model-233.guide-pdf.exercise-2025",
    "boe.model-233.order-hac-1400-2018",
    "boe.model-233.order-hac-1154-2020",
    "boe.electronic-filing.order-hap-2194-2013",
    "boe.model-233.order-hac-682-2025",
  ],
} as const satisfies FiscalModelPracticalGuideV1;
