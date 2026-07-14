import type { FiscalModelPracticalGuideV1 } from "./fiscal-model-practical-guide.types";

export const MODEL_04_GUIDE_V1 = {
  code: "04",
  intro: [
    "El Modelo 04 sirve para solicitar previamente a la Agencia Tributaria el reconocimiento del derecho a aplicar el IVA reducido del 4 % en la compra de determinados vehículos destinados al transporte habitual de personas en silla de ruedas o con movilidad reducida.",
    "No es una declaración de impuestos ni una solicitud de devolución. Es una autorización previa que debe tramitarse antes de adquirir el vehículo.",
  ],
  notices: [
    {
      title: "El IVA del 4 % no se aplica automáticamente",
      paragraphs: [
        "No compres el vehículo aplicando el IVA del 4 % sin haber iniciado correctamente el procedimiento y sin disponer del acuerdo de la AEAT que permita al vendedor aplicar ese tipo reducido.",
        "Tener reconocido un grado de discapacidad no da derecho automáticamente a este beneficio. El vehículo debe destinarse al transporte habitual de una persona en silla de ruedas o con movilidad reducida y deben cumplirse los demás requisitos.",
      ],
    },
  ],
  actions: [
    {
      label: "Iniciar solicitud oficial en la AEAT",
      href: "https://www1.agenciatributaria.gob.es/wlpl/REGD-JDIT/FG?fTramite=GZ131",
      primary: true,
    },
    {
      label: "Obtener acuerdo de concesión definitiva",
      href: "https://www1.agenciatributaria.gob.es/es13/S/AUVMAUVM070N",
      primary: true,
    },
    {
      label: "Descargar Modelo 04 oficial",
      sourceId: "aeat.model-04.form-pdf.2026-06-04",
      primary: true,
    },
    {
      label: "Presentar documentos o alegaciones",
      href: "https://www2.agenciatributaria.gob.es/wlpl/REGD-JDIT/FGCSV",
    },
    {
      label: "Comunicar los datos de la adquisición",
      href: "https://www1.agenciatributaria.gob.es/es13/S/AUVMAUVM065N",
    },
    {
      label: "Ver instrucciones oficiales",
      sourceId: "aeat.model-04.instructions-pdf.2026-06-04",
    },
    {
      label: "Consultar procedimiento",
      sourceId: "aeat.model-04.procedure-home.2026-03-25",
    },
    {
      label: "Pedir cita en la AEAT",
      href: "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GC29.shtml",
    },
  ],
  quickSummaryTitle: "El Modelo 04 en pocas palabras",
  quickFacts: [
    {
      label: "Qué es",
      value:
        "Una solicitud previa para aplicar el IVA del 4 % a determinados vehículos.",
    },
    {
      label: "Quién puede solicitarlo",
      value: "La persona física o jurídica que va a adquirir el vehículo.",
    },
    {
      label: "Para quién debe utilizarse",
      value:
        "Para el transporte habitual de una persona en silla de ruedas o con movilidad reducida.",
    },
    { label: "Cuándo se presenta", value: "Antes de adquirir el vehículo." },
    {
      label: "Comprador y conductor",
      value:
        "Ni el comprador ni el conductor tienen que ser necesariamente la persona con discapacidad.",
    },
    {
      label: "Adaptación",
      value:
        "El vehículo puede estar adaptado o no, si se cumplen los demás requisitos.",
    },
    {
      label: "Plazo oficial",
      value: "Seis meses como plazo administrativo máximo de resolución.",
    },
    {
      label: "Regla entre vehículos",
      value:
        "Deben haber transcurrido al menos cuatro años desde otra adquisición análoga, salvo las excepciones previstas.",
    },
  ],
  sections: [
    {
      id: "model-04-purpose",
      title: "Para qué sirve",
      intro: [
        "El tipo general de IVA de un vehículo no se reduce automáticamente por la existencia de una discapacidad.",
        "El Modelo 04 permite solicitar a la AEAT que reconozca previamente el derecho al IVA del 4 % cuando el vehículo va a utilizarse habitualmente para transportar a una persona en silla de ruedas o con movilidad reducida.",
        "Puede aplicarse a determinadas entregas o adquisiciones dentro de la Unión Europea. En las importaciones, el reconocimiento corresponde a la aduana por la que se realice la importación.",
      ],
    },
    {
      id: "model-04-who",
      title: "Quién puede solicitarlo",
      intro: [
        "Puede solicitarlo la persona o entidad que vaya a comprar el vehículo. El comprador y la persona con discapacidad o movilidad reducida pueden ser personas distintas.",
      ],
      cards: [
        {
          title: "Relaciones que pueden ayudar a acreditar el destino",
          bullets: [
            "El vehículo queda a nombre de la persona con discapacidad.",
            "El comprador es su cónyuge, pareja de hecho registrada o familiar hasta el tercer grado.",
            "El comprador es su representante legal o guardador de hecho, o convive con ella.",
            "Una entidad presta asistencia a personas con discapacidad.",
            "Una empresa lo adquiere para trabajadores con discapacidad que lo utilizarán habitualmente.",
          ],
        },
        {
          title: "No es una lista automática",
          paragraphs: [
            "Estas circunstancias son posibles medios de prueba. No constituyen una lista cerrada ni garantizan por sí solas la concesión: debe acreditarse el transporte habitual y los restantes requisitos.",
          ],
        },
      ],
    },
    {
      id: "model-04-passenger",
      title: "A quién debe transportar el vehículo",
      intro: [
        "El vehículo debe destinarse al transporte habitual de una persona con discapacidad en silla de ruedas o de una persona con movilidad reducida.",
      ],
      note: "No basta con acreditar únicamente un porcentaje de discapacidad. La silla de ruedas o la movilidad reducida y el destino habitual exigidos para este beneficio también deben quedar acreditados.",
      accordions: [
        {
          question: "Cómo se acredita la discapacidad o la movilidad reducida",
          paragraphs: [
            "Debe aportarse certificado o resolución del IMSERSO o del órgano competente de la comunidad autónoma. En los supuestos reglamentarios también se contemplan determinadas personas ciegas o con deficiencia visual y la acreditación mediante pertenencia a la ONCE cuando proceda.",
            "La tarjeta de estacionamiento no debe tratarse como prueba suficiente por sí sola: debe acompañarse del certificado o resolución exigido sobre movilidad reducida.",
          ],
        },
      ],
    },
    {
      id: "model-04-vehicles",
      title: "Qué vehículos pueden entrar",
      cards: [
        {
          title: "Vehículos incluidos por su destino",
          bullets: [
            "Vehículos destinados al transporte habitual de personas en silla de ruedas.",
            "Vehículos destinados al transporte habitual de personas con movilidad reducida.",
            "Vehículos adaptados o no adaptados, cuando cumplan los requisitos.",
            "Determinados autotaxis o autoturismos especiales destinados al transporte correspondiente.",
          ],
        },
        {
          title: "Quién conduce no decide el beneficio",
          paragraphs: [
            "La identidad del conductor no determina por sí sola el derecho al tipo reducido. Tampoco puede suponerse que cualquier vehículo adquirido por una persona con discapacidad queda incluido.",
          ],
        },
      ],
    },
    {
      id: "model-04-four-years",
      title: "Regla de los cuatro años",
      intro: [
        "Como regla general, deben haber transcurrido al menos cuatro años desde la compra de otro vehículo adquirido en condiciones análogas con este beneficio.",
      ],
      cards: [
        {
          title: "Excepciones principales",
          bullets: [
            "El vehículo anterior fue declarado siniestro total por la aseguradora.",
            "Se produjo su baja definitiva.",
            "Determinadas entidades transportan grupos distintos o trabajan en ámbitos territoriales diferentes y pueden justificar el supuesto especial previsto.",
          ],
        },
        {
          title: "Hay que acreditarlo",
          paragraphs: [
            "La excepción debe justificarse documentalmente. No basta con indicar que el vehículo anterior ya no se utiliza.",
          ],
        },
      ],
    },
    {
      id: "model-04-transfer",
      title: "Transmisión durante los cuatro años siguientes",
      intro: [
        "El vehículo no debe venderse, donarse ni transmitirse mediante actos entre personas vivas durante los cuatro años siguientes a su adquisición, salvo que resulte aplicable alguna excepción legal.",
      ],
      note: "Transmitirlo antes de que transcurra ese periodo puede hacer que deban regularizarse los impuestos aplicados. Conviene revisar el caso concreto antes de venderlo o donarlo.",
    },
    {
      id: "model-04-documents",
      title: "Documentación que puede necesitarse",
      cards: [
        {
          title: "Lista de comprobación",
          bullets: [
            "Identificación del solicitante y de la persona transportada.",
            "Certificado o resolución de discapacidad o movilidad reducida.",
            "Pruebas de que el transporte será habitual.",
            "Datos del vehículo.",
            "Parentesco, convivencia o representación, cuando proceda.",
            "Certificado de siniestro total o baja definitiva del vehículo anterior, cuando proceda.",
            "Documentación de la entidad adquirente en los casos especiales.",
          ],
        },
        {
          title: "Puede pedirse información adicional",
          paragraphs: [
            "La AEAT puede solicitar más documentación si considera que no se ha acreditado suficientemente el destino habitual del vehículo u otro requisito.",
          ],
        },
      ],
    },
    {
      id: "model-04-channels",
      title: "Cuándo y cómo se presenta",
      cards: [
        {
          title: "Antes de la adquisición",
          paragraphs: [
            "No existe una campaña anual ni un plazo fijo común. La solicitud se presenta cuando se va a comprar el vehículo y antes de que la adquisición tenga lugar.",
          ],
        },
        {
          title: "Por internet",
          paragraphs: [
            "La vía principal es la tramitación electrónica en la sede de la AEAT.",
          ],
          bullets: ["Cl@ve.", "Certificado electrónico.", "DNI electrónico."],
        },
        {
          title: "Otros registros oficiales",
          paragraphs: [
            "El procedimiento también contempla oficinas de la AEAT, oficinas de Correos y otros registros admitidos por el artículo 16 de la Ley 39/2015.",
          ],
        },
      ],
    },
    {
      id: "model-04-resolution",
      title: "Plazo y si la solicitud se deniega",
      cards: [
        {
          title: "Cuánto tarda",
          paragraphs: [
            "El plazo oficial de resolución es de seis meses. Es el máximo administrativo; la duración real depende del expediente y de si se pide documentación adicional.",
            "La falta de respuesta no debe mostrarse como concesión automática.",
          ],
        },
        {
          title: "Alegaciones y recursos",
          paragraphs: [
            "Si la AEAT considera que no se cumplen los requisitos, puede emitir una propuesta o resolución denegatoria. Cuando proceda, el interesado podrá alegar o aportar documentos.",
          ],
          bullets: [
            "Recurso de reposición: un mes.",
            "Reclamación económico-administrativa: un mes.",
            "La notificación indica los recursos disponibles y cómo contar el plazo.",
          ],
        },
      ],
    },
  ],
  fillingTitle: "Cómo rellenar el Modelo 04",
  fillingSteps: [
    {
      title: "1. Datos del solicitante",
      paragraphs: [
        "Introduce los datos de la persona o entidad que va a adquirir el vehículo.",
      ],
      bullets: [
        "NIF o NIE.",
        "Nombre y apellidos o razón social.",
        "Domicilio fiscal, municipio, provincia y código postal.",
        "Teléfono.",
      ],
    },
    {
      title: "2. Persona con discapacidad o movilidad reducida",
      paragraphs: [
        "Identifica a la persona para cuyo transporte habitual se destinará el vehículo. El comprador y esta persona pueden ser distintos.",
      ],
      bullets: ["NIF o NIE.", "Nombre y apellidos.", "Domicilio."],
    },
    {
      title: "3. Representante",
      paragraphs: [
        "Rellénalo cuando otra persona presenta la solicitud o actúa en nombre del solicitante. La representación deberá poder acreditarse.",
      ],
    },
    {
      title: "4. Vehículo",
      paragraphs: [
        "Indica la marca y el modelo del vehículo que se pretende adquirir. El formulario comunica la intención de adquirir un vehículo concreto.",
      ],
    },
    {
      title: "5. Declaración sobre el destino",
      paragraphs: [
        "El solicitante declara que el vehículo se utilizará habitualmente para transportar a la persona indicada. Esta persona ratifica la declaración cuando corresponda.",
      ],
    },
    {
      title: "6. Situación del vehículo anterior",
      paragraphs: ["Marca la circunstancia aplicable."],
      bullets: [
        "Primer vehículo en estas condiciones.",
        "Han transcurrido cuatro años.",
        "Siniestro total o baja definitiva antes de cuatro años.",
        "Autotaxi o autoturismo especial correspondiente.",
      ],
    },
    {
      title: "7. Documentación aportada",
      paragraphs: [
        "Relaciona los documentos que acreditan discapacidad o movilidad, transporte habitual, representación y, si procede, la excepción respecto del vehículo anterior.",
      ],
    },
    {
      title: "8. Fecha y firmas",
      paragraphs: [
        "Fecha y firma la solicitud. Cuando comprador y persona con discapacidad o movilidad reducida son distintos, el procedimiento exige la participación de ambos.",
        "El PDF contiene un ejemplar para la Administración y otro para el solicitante.",
      ],
    },
  ],
  afterTitle: "Qué ocurre después de solicitarlo",
  afterSteps: [
    {
      title: "1. Presentación",
      description:
        "El comprador presenta el Modelo 04 y la documentación antes de adquirir el vehículo.",
    },
    {
      title: "2. Revisión por la AEAT",
      description:
        "Hacienda comprueba la discapacidad o movilidad reducida, el destino habitual y los restantes requisitos.",
    },
    {
      title: "3. Aceptación provisional",
      description:
        "Si se cumplen los requisitos, permite adquirir el vehículo aplicando el IVA del 4 %.",
    },
    {
      title: "4. Comunicación de la compra",
      description:
        "Después, el vendedor comunica electrónicamente los datos; en los casos previstos también puede hacerlo el solicitante en una oficina.",
    },
    {
      title: "5. Reconocimiento definitivo",
      description:
        "Si los datos son correctos, la AEAT expide el acuerdo definitivo del derecho.",
    },
  ],
  comparison: {
    title: "Modelo 04 y Modelo 05",
    current: {
      title: "Modelo 04",
      description:
        "Solicita el reconocimiento del IVA reducido del 4 % en la adquisición de determinados vehículos.",
    },
    related: {
      title: "Modelo 05",
      description:
        "Se refiere a determinados supuestos de no sujeción, exención o reducción del Impuesto Especial sobre Determinados Medios de Transporte, conocido como impuesto de matriculación.",
      href: "/consultor-fiscal/modelos/05",
      label: "Ver la ficha del Modelo 05",
    },
    conclusion:
      "Son impuestos y procedimientos diferentes. Cumplir los requisitos de uno no significa automáticamente cumplir los del otro.",
  },
  pdfNotice: [
    "La AEAT recomienda descargar el PDF en el ordenador y abrirlo con Adobe Acrobat Reader. Si se abre directamente en Chrome o Edge, puede quedar inactiva la opción que genera el número de justificante.",
    "Esos navegadores pueden mostrar, para este formulario concreto, un aviso relacionado con el código que genera el justificante y el código de barras. Esta explicación no se aplica a otros documentos ni a cualquier alerta de seguridad.",
  ],
  documents: [
    {
      label: "Descargar Modelo 04 oficial",
      sourceId: "aeat.model-04.form-pdf.2026-06-04",
    },
    {
      label: "Ver instrucciones oficiales",
      sourceId: "aeat.model-04.instructions-pdf.2026-06-04",
    },
  ],
  officialLinks: [
    {
      label: "Procedimiento oficial del Modelo 04",
      sourceId: "aeat.model-04.procedure-home.2026-03-25",
    },
    {
      label: "Ficha administrativa GZ13",
      sourceId: "aeat.model-04.procedure-record.2026-03-02",
    },
    {
      label: "Página oficial de descargas",
      sourceId: "aeat.model-04.downloads.2026-06-04",
    },
  ],
  legalLinks: [
    {
      label: "Ley del IVA · artículo 91",
      sourceId: "boe.liva-37-1992.article-91",
    },
    {
      label: "Reglamento del IVA · artículo 26 bis",
      sourceId: "boe.riva-1624-1992.article-26-bis",
    },
  ],
  faq: [
    {
      question: "¿El IVA del 4 % se aplica automáticamente?",
      answer: "No. Debe solicitarse previamente el reconocimiento de la AEAT.",
    },
    {
      question: "¿Puedo solicitarlo después de comprar el vehículo?",
      answer: "El Modelo 04 debe presentarse antes de la adquisición.",
    },
    {
      question: "¿El comprador debe ser la persona con discapacidad?",
      answer:
        "No necesariamente. Puede ser otra persona o una entidad, si se acredita que el vehículo se destinará a su transporte habitual.",
    },
    {
      question: "¿La persona con discapacidad tiene que conducir?",
      answer:
        "No. La identidad del conductor no impide por sí sola aplicar el beneficio.",
    },
    {
      question: "¿El vehículo tiene que estar adaptado?",
      answer:
        "No siempre. Puede estar adaptado o no, pero debe cumplir el destino y los demás requisitos.",
    },
    {
      question:
        "¿Cualquier persona con un 33 % de discapacidad puede solicitarlo?",
      answer:
        "No automáticamente. Debe cumplirse la condición relacionada con silla de ruedas o movilidad reducida, el transporte habitual y los restantes requisitos.",
    },
    {
      question: "¿Puedo comprar otro vehículo antes de cuatro años?",
      answer:
        "Como regla general, no en condiciones análogas, salvo siniestro total, baja definitiva u otras excepciones previstas y acreditadas.",
    },
    {
      question: "¿Puedo vender el vehículo antes de cuatro años?",
      answer:
        "La transmisión puede provocar la pérdida del beneficio o una regularización. Debe revisarse el supuesto antes de venderlo o donarlo.",
    },
    {
      question: "¿Qué prueba que el transporte será habitual?",
      answer:
        "Pueden utilizarse documentos sobre titularidad, parentesco, pareja de hecho, representación, convivencia, actividad de una entidad u otras pruebas admitidas.",
    },
    {
      question: "¿Cuánto tarda la AEAT?",
      answer: "El plazo oficial máximo es de seis meses.",
    },
    {
      question: "¿El concesionario puede aplicar directamente el 4 %?",
      answer:
        "Solo cuando el comprador acredita el derecho mediante el acuerdo de la AEAT, que el vendedor debe conservar durante el plazo de prescripción.",
    },
    {
      question: "¿Es lo mismo que la exención del impuesto de matriculación?",
      answer:
        "No. El Modelo 04 se refiere al IVA. Los beneficios del impuesto de matriculación se tramitan mediante otros procedimientos.",
    },
  ],
  sourceIds: [
    "aeat.model-04.procedure-home.2026-03-25",
    "aeat.model-04.procedure-record.2026-03-02",
    "aeat.model-04.downloads.2026-06-04",
    "aeat.model-04.form-pdf.2026-06-04",
    "aeat.model-04.instructions-pdf.2026-06-04",
    "boe.liva-37-1992.article-91",
    "boe.riva-1624-1992.article-26-bis",
  ],
} as const satisfies FiscalModelPracticalGuideV1;
