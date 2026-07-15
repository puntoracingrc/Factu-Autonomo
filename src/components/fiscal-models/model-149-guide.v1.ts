import type { FiscalModelPracticalGuideV1 } from "./fiscal-model-practical-guide.types";

const TERRITORIAL_NOTE =
  "Esta guía describe el régimen estatal y el territorio común. Si existe una conexión con País Vasco o Navarra, debe comprobarse la competencia y la normativa foral.";

export const MODEL_149_GUIDE_V1 = {
  code: "149",
  effectiveYear: 2026,
  lastVerifiedAt: "2026-07-15",
  requiresAnnualReview: true,
  externalActionNotice:
    "Los enlaces abren servicios oficiales de la AEAT o el BOE. Esta web no recibe documentos, certificados, datos personales ni credenciales y no presenta la comunicación por ti.",
  intro: [
    "El Modelo 149 comunica a la AEAT la opción, renuncia, exclusión o finalización del régimen especial aplicable a determinadas personas que se desplazan a España.",
    "No es la declaración anual del impuesto: quien está válidamente acogido utiliza el Modelo 151 para declarar cada ejercicio. La nacionalidad, un NIE, el empadronamiento o una dirección española no deciden por sí solos la residencia fiscal ni el acceso al régimen.",
  ],
  notices: [
    {
      title: "La residencia fiscal requiere hechos y documentos",
      paragraphs: [
        "Debe analizarse la residencia conforme a la normativa y, cuando exista otro país implicado, el convenio aplicable. Un pasaporte, una cuenta bancaria o una dirección aislada no bastan para clasificar a una persona.",
      ],
    },
    {
      title: "No es un trámite general para cualquier autónomo",
      paragraphs: [
        "El régimen exige una causa de desplazamiento y el cumplimiento conjunto de sus requisitos. Una actividad económica ordinaria iniciada en España no convierte automáticamente al interesado en beneficiario.",
      ],
    },
    { title: "Ámbito territorial", paragraphs: [TERRITORIAL_NOTE] },
  ],
  actions: [
    {
      label: "Abrir las gestiones oficiales del Modelo 149",
      sourceId: "aeat.model-149.procedure-home.2026-06-09",
      primary: true,
    },
    {
      label: "Consultar las instrucciones oficiales",
      sourceId: "aeat.model-149.instructions.2026-06-09",
      primary: true,
    },
    {
      label: "Ver la declaración anual Modelo 151",
      internalHref: "/consultor-fiscal/modelos/151",
    },
    {
      label: "Consultar la ayuda técnica del formulario",
      sourceId: "aeat.model-149.help.2026-06-19",
    },
  ],
  quickSummaryTitle: "El Modelo 149 en pocas palabras",
  quickFacts: [
    {
      label: "Qué es",
      value:
        "Una comunicación censal específica del régimen de personas desplazadas.",
    },
    {
      label: "Qué comunica",
      value: "Opción, renuncia, exclusión o fin del desplazamiento.",
    },
    {
      label: "Declaración anual",
      value: "Modelo 151 mientras resulte aplicable el régimen.",
    },
    {
      label: "Residencia previa",
      value:
        "Como regla del régimen actual, no haber sido residente fiscal en España en los cinco periodos impositivos anteriores al desplazamiento.",
    },
    {
      label: "Duración",
      value:
        "El periodo del cambio de residencia y los cinco periodos siguientes, si se mantienen los requisitos.",
    },
    {
      label: "Presentación",
      value:
        "Formulario electrónico individual; la persona principal presenta antes que los familiares asociados.",
    },
  ],
  sections: [
    {
      id: "model-149-purpose",
      title: "Qué comunica y qué no",
      cards: [
        {
          title: "Opción",
          paragraphs: [
            "Solicita aplicar el régimen especial cuando se cumplen los requisitos y se aporta la documentación exigible.",
          ],
        },
        {
          title: "Renuncia",
          paragraphs: [
            "Comunica la decisión de dejar el régimen para el periodo siguiente. La renuncia impide volver a optar por él.",
          ],
        },
        {
          title: "Exclusión",
          paragraphs: [
            "Comunica que ha dejado de cumplirse una condición. No es una elección y también impide una nueva opción posterior.",
          ],
        },
        {
          title: "Fin del desplazamiento",
          paragraphs: [
            "Informa del final del desplazamiento cuando corresponda conforme a las instrucciones oficiales.",
          ],
        },
      ],
      note: "El Modelo 149 no liquida la renta anual ni sustituye al Modelo 151.",
    },
    {
      id: "model-149-eligibility",
      title: "Requisitos que deben revisarse",
      cards: [
        {
          title: "Residencia previa",
          paragraphs: [
            "Debe comprobarse la ausencia de residencia fiscal en España durante los cinco periodos anteriores al desplazamiento. La prueba puede requerir certificados de residencia fiscal y el análisis del convenio aplicable.",
          ],
        },
        {
          title: "Causa del desplazamiento",
          bullets: [
            "Contrato de trabajo o determinados supuestos de teletrabajo internacional.",
            "Adquisición de la condición de administrador en los términos legales.",
            "Actividad emprendedora con la acreditación exigida.",
            "Determinada actividad profesional para empresas emergentes, formación, investigación, desarrollo o innovación.",
          ],
        },
        {
          title: "La inversión pasiva no basta",
          paragraphs: [
            "La mera compra de activos, aportación de capital o condición de inversor no acredita por sí sola una causa de acceso. Debe encajarse exactamente en uno de los supuestos legales y documentarse.",
          ],
        },
        {
          title: "Rentas y establecimiento permanente",
          paragraphs: [
            "Debe comprobarse si se obtienen rentas mediante establecimiento permanente en España y las excepciones previstas para determinadas actividades emprendedoras o profesionales.",
          ],
        },
      ],
      note: "La causa debe documentarse. No se infiere de la profesión, el visado o el alta administrativa.",
    },
    {
      id: "model-149-family",
      title: "Persona principal y familiares asociados",
      intro: [
        "Las instrucciones contemplan comunicaciones asociadas a la persona principal, pero cada interesado presenta su propio Modelo 149.",
      ],
      cards: [
        {
          title: "Quién puede estar asociado",
          bullets: [
            "Cónyuge no separado legalmente.",
            "Progenitor de los hijos cuando no exista vínculo matrimonial.",
            "Hijos menores de 25 años o de cualquier edad si tienen discapacidad, en las condiciones previstas.",
          ],
        },
        {
          title: "Orden de presentación",
          paragraphs: [
            "La comunicación de la persona principal debe presentarse antes. El familiar utiliza el número de registro de esa comunicación al cumplimentar la suya.",
          ],
        },
        {
          title: "Sin automatismos",
          paragraphs: [
            "Compartir domicilio o parentesco no basta. Deben cumplirse los requisitos temporales, de residencia y desplazamiento aplicables a cada persona.",
          ],
        },
      ],
    },
    {
      id: "model-149-documents",
      title: "Documentación y número de registro",
      cards: [
        {
          title: "Documentos previos",
          paragraphs: [
            "Cuando la comunicación requiere acreditación, los documentos se aportan primero por el registro electrónico indicado por la AEAT. Después se incorpora al Modelo 149 el número de registro obtenido.",
          ],
        },
        {
          title: "Ejemplos de prueba",
          bullets: [
            "Certificados de residencia fiscal.",
            "Contrato, carta de desplazamiento o documentación del teletrabajo.",
            "Nombramiento y participación cuando se actúa como administrador.",
            "Informe o acreditación exigida para actividad emprendedora o profesional.",
            "Documentación de parentesco y desplazamiento de familiares asociados.",
          ],
        },
      ],
      note: "No subas esos documentos a esta web. Utiliza exclusivamente los canales oficiales y conserva justificantes y CSV.",
    },
    {
      id: "model-149-deadlines",
      title: "Plazos de comunicación",
      cards: [
        {
          title: "Opción",
          paragraphs: [
            "Con carácter general, dentro de los seis meses desde la fecha de inicio de la actividad que conste en el alta de la Seguridad Social española o en la documentación que permita mantener la legislación de origen.",
          ],
        },
        {
          title: "Renuncia",
          paragraphs: [
            "Durante noviembre y diciembre anteriores al inicio del periodo impositivo en que deba surtir efecto.",
          ],
        },
        {
          title: "Exclusión o fin",
          paragraphs: [
            "Dentro del mes siguiente al incumplimiento o al final del desplazamiento, según el tipo de comunicación.",
          ],
        },
        {
          title: "Acreditación adicional",
          paragraphs: [
            "Cuando proceda, la documentación acreditativa indicada en las instrucciones debe aportarse en un plazo máximo de diez días hábiles desde la presentación.",
          ],
        },
      ],
      note: "Los familiares asociados tienen reglas específicas para computar su plazo; debe revisarse la fecha que resulte posterior conforme a las instrucciones.",
    },
    {
      id: "model-149-residence",
      title: "Residencia fiscal no es nacionalidad",
      accordions: [
        {
          question: "¿Basta con tener NIE o empadronamiento?",
          paragraphs: [
            "No. Son datos administrativos, pero la residencia fiscal se determina con los criterios legales y, si hay conflicto entre países, con el convenio aplicable.",
          ],
        },
        {
          question: "¿Conviene pedir un certificado de residencia fiscal?",
          paragraphs: [
            "Puede ser una prueba relevante de la residencia en otro país durante los periodos anteriores, aunque su suficiencia depende del caso y del convenio.",
          ],
        },
        {
          question: "¿La AEAT confirma el régimen al enviar el formulario?",
          paragraphs: [
            "El justificante acredita la presentación. No convierte en ciertos hechos incorrectos ni elimina una comprobación posterior.",
          ],
        },
      ],
    },
  ],
  fillingTitle: "Cómo preparar la comunicación",
  fillingSteps: [
    {
      title: "1. Define el tipo de comunicación",
      paragraphs: [
        "Distingue opción, renuncia, exclusión o fin; cada una tiene efecto y plazo diferentes.",
      ],
    },
    {
      title: "2. Reúne la cronología",
      paragraphs: [
        "Fecha de llegada, inicio de actividad, altas, residencia de los cinco periodos anteriores y causa del desplazamiento.",
      ],
    },
    {
      title: "3. Reúne las pruebas",
      paragraphs: [
        "Obtén certificados y documentos laborales, societarios, profesionales o familiares pertinentes.",
      ],
    },
    {
      title: "4. Registra antes los anexos",
      paragraphs: [
        "Si la instrucción exige documentación previa, usa el registro oficial y conserva el número de asiento.",
      ],
    },
    {
      title: "5. Presenta en el orden correcto",
      paragraphs: [
        "Primero la persona principal; después cada familiar asociado. Guarda justificante, número de registro y CSV.",
      ],
    },
  ],
  afterTitle: "Qué ocurre después",
  afterSteps: [
    {
      title: "Acreditación",
      description:
        "Aporta dentro de plazo cualquier documento adicional exigido y conserva el resguardo.",
    },
    {
      title: "Certificado",
      description:
        "Comprueba la respuesta oficial y las comunicaciones que emita la AEAT.",
    },
    {
      title: "Declaración anual",
      description:
        "Si el régimen resulta aplicable, prepara cada ejercicio el Modelo 151 y revisa que sigan cumpliéndose los requisitos.",
    },
  ],
  comparison: {
    title: "Modelo 149 y declaración anual",
    current: {
      title: "Modelo 149",
      description: "Comunica el acceso, salida o final del régimen especial.",
    },
    related: {
      title: "Modelo 151",
      description:
        "Declara anualmente la renta de quien está acogido al régimen.",
      href: "/consultor-fiscal/modelos/151",
      label: "Ver Modelo 151",
    },
    additional: [
      {
        title: "Modelo 100",
        description:
          "Declaración ordinaria del IRPF cuando no se aplica este régimen especial.",
        href: "/consultor-fiscal/modelos/100",
        label: "Ver Modelo 100",
      },
      {
        title: "Modelo 036",
        description:
          "Declaración censal general para altas y cambios de actividad; no sustituye la comunicación especial 149.",
        href: "/consultor-fiscal/modelos/036",
        label: "Ver Modelo 036",
      },
      {
        title: "Modelo 147",
        description:
          "Comunicación de desplazamiento a territorio español en determinados supuestos de retenciones.",
        href: "/consultor-fiscal/modelos/147",
        label: "Ver Modelo 147",
      },
      {
        title: "Modelo 150",
        description:
          "Declaración histórica del régimen anterior; no debe confundirse con el actual 151.",
        href: "/consultor-fiscal/modelos/150",
        label: "Ver Modelo 150",
      },
    ],
    conclusion:
      "El 149 comunica la situación y el 151 declara cada ejercicio; uno no sustituye al otro.",
  },
  pdfNotice: [
    "La AEAT ofrece el Modelo 149 como formulario web. No existe en la ficha revisada un impreso PDF estático vigente para mostrar como formulario descargable.",
  ],
  documents: [],
  officialLinks: [
    {
      label: "Ficha administrativa del procedimiento",
      sourceId: "aeat.model-149.procedure-record.2026-06-09",
    },
    {
      label: "Instrucciones para cumplimentar la comunicación",
      sourceId: "aeat.model-149.instructions.2026-06-09",
    },
    {
      label: "Ayuda técnica del formulario",
      sourceId: "aeat.model-149.help.2026-06-19",
    },
  ],
  legalLinks: [
    { label: "Orden HFP/1338/2023", sourceId: "boe.order-hfp-1338-2023" },
    {
      label: "Ley 35/2006 del IRPF",
      href: "https://www.boe.es/buscar/act.php?id=BOE-A-2006-20764",
    },
    {
      label: "Reglamento del IRPF",
      href: "https://www.boe.es/buscar/act.php?id=BOE-A-2007-6820",
    },
  ],
  faq: [
    {
      question: "¿Para qué sirve el Modelo 149?",
      answer:
        "Para comunicar opción, renuncia, exclusión o fin del régimen especial de determinadas personas desplazadas a España.",
    },
    {
      question: "¿Es la declaración anual?",
      answer:
        "No. La declaración anual del régimen actual se presenta mediante el Modelo 151.",
    },
    {
      question: "¿Cualquier persona que se muda a España puede optar?",
      answer:
        "No. Deben cumplirse simultáneamente la residencia previa, una causa admitida de desplazamiento y el resto de condiciones legales.",
    },
    {
      question: "¿Cuántos años anteriores de residencia se revisan?",
      answer:
        "En el régimen actual se comprueban los cinco periodos impositivos anteriores al desplazamiento.",
    },
    {
      question: "¿Cuánto dura el régimen?",
      answer:
        "Puede abarcar el periodo del cambio de residencia y los cinco siguientes si se mantienen los requisitos.",
    },
    {
      question: "¿Cuál es el plazo general para optar?",
      answer:
        "Seis meses desde el inicio de actividad que resulte de la documentación indicada en las instrucciones.",
    },
    {
      question: "¿Cuándo se comunica la renuncia?",
      answer:
        "Durante noviembre y diciembre anteriores al periodo en que deba surtir efecto.",
    },
    {
      question: "¿Puedo volver a optar después de renunciar o quedar excluido?",
      answer:
        "No, conforme a las reglas del régimen, la renuncia o exclusión impiden una nueva opción.",
    },
    {
      question: "¿Los familiares presentan el mismo formulario?",
      answer:
        "Cada persona presenta su comunicación; la principal debe hacerlo antes y los asociados referencian su registro.",
    },
    {
      question: "¿Hay que aportar documentos?",
      answer:
        "Sí, cuando lo exija el supuesto. La AEAT puede requerir registro previo y una aportación adicional dentro de diez días hábiles.",
    },
    {
      question: "¿El NIE demuestra la residencia fiscal?",
      answer:
        "No. Deben aplicarse los criterios fiscales y, cuando proceda, el convenio internacional.",
    },
    {
      question: "¿La presentación confirma definitivamente el régimen?",
      answer:
        "El justificante acredita el envío, pero la AEAT puede comprobar después los requisitos y documentos.",
    },
  ],
  sourceIds: [
    "aeat.model-149.procedure-home.2026-06-09",
    "aeat.model-149.procedure-record.2026-06-09",
    "aeat.model-149.instructions.2026-06-09",
    "aeat.model-149.help.2026-06-19",
    "boe.order-hfp-1338-2023",
  ],
} as const satisfies FiscalModelPracticalGuideV1;
