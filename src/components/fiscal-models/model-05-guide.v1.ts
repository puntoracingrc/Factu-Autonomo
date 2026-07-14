import type { FiscalModelPracticalGuideV1 } from "./fiscal-model-practical-guide.types";

export const MODEL_05_GUIDE_V1 = {
  code: "05",
  intro: [
    "El Modelo 05 sirve para pedir a la Agencia Tributaria que reconozca, antes de la matriculación definitiva, determinados supuestos de no sujeción, exención o reducción en el impuesto de matriculación.",
    "No es una autoliquidación ni sirve directamente para pagar el impuesto. Es una solicitud previa que Hacienda debe revisar y resolver.",
  ],
  notices: [
    {
      title: "Debe solicitarse y concederse antes de matricular",
      paragraphs: [
        "El vehículo, embarcación o aeronave no puede matricularse definitivamente hasta que la AEAT reconozca el beneficio solicitado.",
        "Comprar o reservar el medio de transporte no equivale a tener concedido el beneficio. La solicitud no debe darse por aprobada hasta recibir el reconocimiento correspondiente.",
      ],
    },
  ],
  actions: [
    {
      label: "Presentar la solicitud del Modelo 05",
      href: "https://www1.agenciatributaria.gob.es/wlpl/TOMT-M005/index.zul",
      primary: true,
    },
    {
      label: "Generar formulario para presentarlo en papel",
      href: "https://www2.agenciatributaria.gob.es/wlpl/TOMT-M005/index.zul",
      primary: true,
    },
    {
      label: "Aportar documentación complementaria",
      href: "https://www1.agenciatributaria.gob.es/wlpl/REGD-JDIT/FG?fTramite=GZ177",
      primary: true,
    },
    {
      label: "Descargar CEM",
      href: "https://www1.agenciatributaria.gob.es/wlpl/SCEJ-MANT/SvqueryEDOV",
    },
    {
      label: "Consultar el procedimiento oficial",
      sourceId: "aeat.model-05.procedure-home.2026-03-25",
    },
    {
      label: "Ver las instrucciones oficiales",
      sourceId: "aeat.model-05.instructions-pdf.2026-03-25",
    },
    {
      label: "Pedir cita en la AEAT",
      href: "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GC29.shtml",
    },
  ],
  quickSummaryTitle: "El Modelo 05 en pocas palabras",
  quickFacts: [
    {
      label: "Qué es",
      value:
        "Una solicitud previa de determinados beneficios del impuesto de matriculación.",
    },
    {
      label: "Quién lo presenta",
      value:
        "La persona o entidad a cuyo nombre se matriculará el medio de transporte, o su representante.",
    },
    { label: "Cuándo", value: "Antes de la matriculación definitiva." },
    {
      label: "¿Puede matricularse antes?",
      value: "No. Debe esperarse al reconocimiento de la AEAT.",
    },
    {
      label: "Presentación electrónica",
      value:
        "Con certificado o DNI electrónico. Las personas físicas también pueden utilizar Cl@ve.",
    },
    {
      label: "Presentación en papel",
      value:
        "Solo para personas físicas y con el formulario generado por la sede de la AEAT.",
    },
    { label: "Plazo oficial", value: "Seis meses para resolver." },
    {
      label: "Familia numerosa",
      value: "Tras concederse la reducción, debe presentarse el Modelo 576.",
    },
  ],
  sections: [
    {
      id: "model-05-basic-concepts",
      title: "Impuesto de matriculación y conceptos básicos",
      intro: [
        "El impuesto de matriculación se llama oficialmente Impuesto Especial sobre Determinados Medios de Transporte. Puede afectar a vehículos, determinadas embarcaciones y aeronaves.",
        "No debe confundirse con el IVTM, que es el impuesto municipal anual sobre vehículos de tracción mecánica.",
      ],
      cards: [
        {
          title: "No sujeción",
          paragraphs: [
            "La operación queda fuera del impuesto porque la ley establece que ese medio de transporte o esa situación no está sometida al impuesto de matriculación.",
          ],
        },
        {
          title: "Exención",
          paragraphs: [
            "La operación entra en principio en el impuesto, pero la ley permite no pagarlo cuando se cumplen condiciones concretas.",
          ],
        },
        {
          title: "Reducción de la base imponible",
          paragraphs: [
            "El impuesto sigue existiendo, pero se calcula sobre una cantidad menor. No significa necesariamente que el resultado sea cero.",
          ],
        },
      ],
    },
    {
      id: "model-05-purpose-and-who",
      title: "Para qué sirve y quién debe presentarlo",
      intro: [
        "Se utiliza cuando la ley exige que Hacienda compruebe previamente los requisitos de un beneficio fiscal. La AEAT puede pedir más documentos y comprobar las características o el destino del medio de transporte.",
        "Debe presentarlo la persona o entidad a cuyo nombre se pretende realizar la primera matriculación definitiva. También puede hacerlo un representante acreditado o un colaborador social.",
        "Si el medio circula o se utiliza en España sin solicitar matriculación definitiva, corresponde a la persona o entidad responsable cuando pretenda aplicar un beneficio que necesite reconocimiento previo.",
      ],
      note: "El Modelo 05 es la solicitud. El beneficio no queda reconocido únicamente por rellenar o enviar el formulario.",
    },
    {
      id: "model-05-people-and-families",
      title: "Personas y familias",
      cards: [
        {
          title: "ER4 · Vehículo para una persona con discapacidad",
          paragraphs: [
            "Permite solicitar la exención para un vehículo matriculado a nombre de una persona con discapacidad y destinado a su uso exclusivo, si se cumplen todos los requisitos.",
          ],
          bullets: [
            "El vehículo debe matricularse a nombre de la persona con discapacidad y destinarse a su uso exclusivo.",
            "Como regla general, deben haber pasado cuatro años desde otro vehículo matriculado en condiciones análogas.",
            "El plazo puede no exigirse si el vehículo anterior fue declarado siniestro total y se acredita.",
            "No puede transmitirse entre personas vivas durante los cuatro años siguientes sin revisar y, cuando corresponda, regularizar el impuesto.",
            "Suele exigirse el certificado oficial de discapacidad, la ficha técnica y, si procede, el certificado de la aseguradora.",
          ],
          links: [
            {
              label: "Comparar con el Modelo 04",
              href: "/consultor-fiscal/modelos/04",
            },
            {
              label: "Comparar con el Modelo 06",
              href: "/consultor-fiscal/modelos/06",
            },
          ],
        },
        {
          title: "RE1 · Reducción para familias numerosas",
          paragraphs: [
            "Permite solicitar una reducción del 50 % de la base imponible para determinados vehículos de uso exclusivo de familias numerosas.",
            "No es una exención total ni un descuento del 50 % sobre el precio o el IVA.",
          ],
          bullets: [
            "Vehículo con capacidad homologada de cinco a nueve plazas, incluida la del conductor.",
            "Uso exclusivo de la familia numerosa y primera matriculación a nombre del padre, de la madre o de ambos.",
            "Regla general de cuatro años desde otro vehículo acogido a la reducción, salvo siniestro total acreditado.",
            "Prohibición de transmitirlo durante cuatro años sin la regularización que corresponda.",
            "Debe aportarse la ficha técnica y el título oficial de familia numerosa.",
            "Una vez concedida la reducción, debe presentarse el Modelo 576 para calcular el impuesto sobre la base reducida.",
          ],
          links: [
            {
              label: "Ver la ficha del Modelo 576",
              href: "/consultor-fiscal/modelos/576",
            },
          ],
        },
      ],
    },
    {
      id: "model-05-business-cases",
      title: "Actividades profesionales y empresariales",
      accordions: [
        {
          question: "ER1 · Taxis, autotaxis y autoturismos",
          paragraphs: [
            "Permite solicitar la exención para vehículos que tengan legalmente esa consideración. No comprende cualquier vehículo que transporte clientes de forma ocasional.",
          ],
          bullets: [
            "Licencia municipal.",
            "Ficha técnica.",
            "Alta o último recibo del IAE cuando corresponda.",
          ],
        },
        {
          question: "ER2 · Vehículos de autoescuelas",
          paragraphs: [
            "Se refiere a vehículos destinados efectiva y exclusivamente a la enseñanza de conductores mediante contraprestación.",
          ],
          bullets: [
            "Ficha técnica.",
            "Alta o último recibo del IAE.",
            "Justificantes del uso exclusivo cuando sean necesarios.",
          ],
        },
        {
          question: "ER3 · Vehículos destinados al alquiler",
          paragraphs: [
            "Exige una actividad real de alquiler y un destino efectivo y exclusivo. No deben incluirse automáticamente renting, cesiones vinculadas, alquileres prolongados a una misma persona ni contratos que sean una venta aplazada o incluyan opción de compra.",
          ],
          bullets: [
            "Ficha técnica.",
            "Alta o último recibo del IAE.",
            "Documentación de la actividad cuando la AEAT la requiera.",
          ],
        },
        {
          question: "ER5 · Embarcaciones de alquiler o escuelas náuticas",
          paragraphs: [
            "Comprende determinados buques y embarcaciones de recreo destinados exclusivamente al alquiler o pertenecientes a escuelas náuticas oficialmente reconocidas y destinados a la enseñanza.",
          ],
          bullets: [
            "Hoja de características técnicas.",
            "Alta o último recibo del IAE.",
            "Certificado de Marina Mercante para escuelas.",
          ],
        },
        {
          question: "ER6 y ER7 · Aeronaves",
          paragraphs: [
            "ER6 se refiere a aeronaves de escuelas oficialmente reconocidas destinadas exclusivamente a la formación o reciclaje profesional de pilotos. ER7 comprende aeronaves arrendadas exclusivamente a empresas de navegación aérea dentro de las limitaciones legales.",
          ],
          bullets: [
            "Hoja de características.",
            "Justificantes del IAE.",
            "Certificado de la Agencia Estatal de Seguridad Aérea en ER6.",
            "Documentos del cedente y de la empresa de navegación aérea en ER7.",
          ],
        },
      ],
    },
    {
      id: "model-05-special-cases",
      title: "Vehículos y usos especiales",
      cards: [
        {
          title: "NS1 y NS2",
          paragraphs: [
            "NS1 se utiliza para determinados vehículos destinados exclusivamente a funciones de defensa, vigilancia o seguridad. NS2 se refiere a ambulancias acondicionadas y vehículos que solo puedan destinarse a vigilancia y socorro en carreteras.",
          ],
          bullets: [
            "Ficha técnica.",
            "Declaración justificativa del destino exclusivo.",
          ],
        },
        {
          title: "UNI · Universidades",
          paragraphs: [
            "Permite solicitar la exención para medios de transporte matriculados a nombre de universidades y destinados exclusivamente a investigación, docencia o estudio.",
          ],
          bullets: [
            "Documento de características.",
            "Descripción detallada de la actividad.",
            "Aceptación de las consecuencias de destinarlo a otros fines.",
          ],
        },
      ],
      accordions: [
        {
          question: "EC1, EC2, EC3 y EC4 · Medios no matriculados en España",
          paragraphs: [
            "Son claves técnicas para determinados vehículos, embarcaciones, aeronaves u otros medios no matriculados en España que circulan o se utilizan aquí y pretenden aplicar un beneficio con reconocimiento previo.",
            "La clave depende del medio, titular, utilización y beneficio. No deben resumirse como una regla única.",
          ],
          bullets: [
            "EC1: determinados vehículos de alquiler.",
            "EC2: determinadas embarcaciones destinadas al alquiler.",
            "EC3: determinadas aeronaves.",
            "EC4: otros medios y beneficios que requieran reconocimiento previo.",
          ],
        },
        {
          question:
            "Vehículos de aplicación industrial, comercial, agraria, clínica o científica",
          paragraphs: [
            "Cuando necesitan homologación tributaria disponen de un procedimiento oficial específico. No deben introducirse automáticamente en el Modelo 05 o el Modelo 06.",
          ],
        },
      ],
    },
    {
      id: "model-05-filing",
      title: "Cómo y cuándo se presenta",
      cards: [
        {
          title: "Por internet",
          paragraphs: [
            "Puede presentarse con certificado o DNI electrónico. Las personas físicas también pueden utilizar Cl@ve. Las empresas y entidades deben usar certificado o actuar mediante representante o colaborador autorizado.",
          ],
        },
        {
          title: "En papel: solo personas físicas",
          paragraphs: [
            "Debe rellenarse el formulario oficial en la sede, generar el PDF con número de justificante, imprimirlo y presentarlo con la documentación en la oficina de la AEAT del domicilio fiscal.",
            "No deben corregirse a mano los datos impresos: si existe un error, hay que generar un formulario nuevo.",
          ],
        },
        {
          title: "Plazo",
          paragraphs: [
            "La regla general es antes de la matriculación definitiva. No puede matricularse hasta que la AEAT reconozca el beneficio.",
            "Si el medio circula o se utiliza en España sin solicitar matriculación definitiva, el plazo general es de 30 días desde el inicio de su utilización, sin extender esta regla a supuestos con un plazo especial.",
          ],
        },
      ],
    },
    {
      id: "model-05-maintain-requirements",
      title: "Mantener los requisitos después",
      intro: [
        "El beneficio puede depender de que el medio conserve durante un tiempo el destino declarado. Un cambio anticipado puede obligar a autoliquidar e ingresar el impuesto.",
      ],
      cards: [
        {
          title: "Regla general",
          paragraphs: [
            "La ley contempla consecuencias si cambian antes de cuatro años las circunstancias que justificaron la no sujeción o exención.",
          ],
        },
        {
          title: "Autoescuelas y alquiler",
          paragraphs: [
            "En las exenciones de autoescuelas y actividades de alquiler, ese periodo general se reduce a dos años.",
          ],
        },
        {
          title: "Discapacidad y familia numerosa",
          paragraphs: [
            "Contienen reglas específicas sobre transmisión durante cuatro años. La consecuencia debe revisarse según el beneficio y la situación concreta.",
          ],
        },
      ],
    },
    {
      id: "model-05-disability-comparison",
      title: "Modelo 04, 05 y 06 en casos de discapacidad",
      cards: [
        {
          title: "Modelo 04",
          paragraphs: [
            "Solicita el IVA del 4 % para determinados vehículos destinados al transporte habitual de personas en silla de ruedas o con movilidad reducida.",
          ],
          links: [
            { label: "Ver Modelo 04", href: "/consultor-fiscal/modelos/04" },
          ],
        },
        {
          title: "Modelo 05 · ER4",
          paragraphs: [
            "Solicita la exención del impuesto de matriculación para un vehículo matriculado a nombre de una persona con discapacidad y destinado a su uso exclusivo.",
          ],
        },
        {
          title: "Modelo 06 · NS5",
          paragraphs: [
            "Declara la no sujeción de un medio que tenga técnicamente la categoría de vehículo para personas con movilidad reducida.",
          ],
          links: [
            { label: "Ver Modelo 06", href: "/consultor-fiscal/modelos/06" },
          ],
        },
      ],
      note: "Son beneficios diferentes y relativos a situaciones e impuestos distintos. Disponer de uno no concede automáticamente los demás.",
    },
    {
      id: "model-05-common-errors",
      title: "Errores habituales",
      cards: [
        {
          title: "Antes y durante la solicitud",
          bullets: [
            "Intentar matricular antes de recibir la resolución.",
            "Pensar que enviar el formulario equivale a obtener el beneficio.",
            "Seleccionar una clave por parecido sin comprobar sus requisitos.",
            "No adjuntar la ficha técnica o los justificantes de la actividad.",
            "Presentar en papel a nombre de una empresa o corregir a mano el formulario.",
            "No acreditar la representación.",
          ],
        },
        {
          title: "Confusiones frecuentes",
          bullets: [
            "Tratar la reducción de familia numerosa como una exención total o como un descuento sobre el precio o el IVA.",
            "Olvidar el Modelo 576 después de concederse RE1.",
            "Confundir ER4 con el IVA del 4 % del Modelo 04 o con NS5 del Modelo 06.",
            "Cambiar el destino o transmitir el medio sin revisar la regularización fiscal.",
          ],
        },
      ],
    },
  ],
  fillingTitle: "Cómo rellenar el Modelo 05",
  fillingSteps: [
    {
      title: "1. Beneficiario",
      paragraphs: [
        "Identifica a la persona o entidad que solicita el beneficio y a cuyo nombre se matriculará el medio.",
      ],
      bullets: [
        "NIF.",
        "Nombre, apellidos o razón social.",
        "Domicilio fiscal.",
        "Datos de contacto.",
      ],
    },
    {
      title: "2. Otro titular de familia numerosa",
      paragraphs: [
        "Solo se rellena para RE1 cuando existe otro titular del título cuyos datos no figuran como beneficiario. Normalmente no se exige en familias monoparentales o situaciones equivalentes.",
      ],
    },
    {
      title: "3. Representante",
      paragraphs: [
        "Incluye sus datos cuando presenta la solicitud una persona distinta del beneficiario. La representación debe acreditarse.",
      ],
    },
    {
      title: "4. Medio de transporte",
      paragraphs: [
        "Indica si es nuevo o usado, lugar de adquisición, puesta en servicio, kilómetros u horas, identificación y datos técnicos de la ITV o documento equivalente.",
      ],
      bullets: [
        "Vehículo terrestre: es nuevo si se entrega antes de seis meses o no supera 6.000 km.",
        "Embarcación: antes de tres meses o no más de 100 horas.",
        "Aeronave: antes de tres meses o no más de 40 horas.",
      ],
    },
    {
      title: "5. Clave solicitada",
      paragraphs: [
        "Selecciona exactamente la clave del beneficio. Una descripción parecida no basta: requisitos y documentos cambian según el supuesto.",
      ],
    },
    {
      title: "6. Documentación",
      paragraphs: [
        "Aporta los justificantes de la clave elegida. En internet se adjuntan copias digitalizadas; la AEAT puede pedir después los originales.",
      ],
    },
    {
      title: "7. Firma y presentación",
      paragraphs: [
        "Revisa los datos, firma y conserva el justificante de presentación y su Código Seguro de Verificación.",
      ],
    },
  ],
  afterTitle: "Qué ocurre después",
  afterSteps: [
    {
      title: "1. Presentación",
      description: "Se presenta la solicitud junto con los justificantes.",
    },
    {
      title: "2. Revisión",
      description: "La AEAT comprueba los requisitos del beneficio solicitado.",
    },
    {
      title: "3. Requerimientos",
      description:
        "Puede pedir documentos adicionales o comprobar el medio y su destino.",
    },
    {
      title: "4. Posible denegación",
      description:
        "Antes de una propuesta denegatoria debe permitir alegaciones durante diez días.",
    },
    {
      title: "5. Resolución",
      description:
        "La AEAT reconoce o deniega la no sujeción, exención o reducción. El plazo máximo oficial es de seis meses y su transcurso no debe entenderse como concesión automática.",
    },
    {
      title: "6. Matriculación",
      description:
        "Si se concede, puede continuarse la matriculación con la documentación o el código correspondiente.",
    },
    {
      title: "7. Familia numerosa",
      description: "Tras concederse RE1, debe presentarse el Modelo 576.",
    },
    {
      title: "8. Si se deniega",
      description:
        "La resolución indicará los recursos. Reposición y reclamación económico-administrativa tienen, con carácter general en esta ficha, un plazo de un mes.",
    },
  ],
  comparison: {
    title: "¿Necesitas el Modelo 05, el Modelo 06 o el Modelo 576?",
    current: {
      title: "Modelo 05",
      description:
        "Se utiliza cuando el beneficio fiscal necesita que la AEAT lo reconozca antes de matricular definitivamente el medio de transporte.",
    },
    related: {
      title: "Modelo 06",
      description:
        "Declara determinados supuestos de no sujeción o exención que no necesitan autorización previa de la AEAT.",
      href: "/consultor-fiscal/modelos/06",
      label: "Ver la ficha del Modelo 06",
    },
    additional: [
      {
        title: "Modelo 576",
        description:
          "Sirve para calcular y, cuando corresponda, pagar el impuesto. También se presenta después de concederse la reducción RE1.",
        href: "/consultor-fiscal/modelos/576",
        label: "Ver la ficha del Modelo 576",
      },
    ],
    conclusion:
      "Esta comparación es orientativa. El modelo correcto depende del supuesto legal y de la clave correspondiente al vehículo, embarcación o aeronave.",
  },
  pdfNotice: [
    "Las instrucciones oficiales explican las claves y justificantes, pero la presentación en papel debe generarse con el servicio específico de la sede de la AEAT.",
    "No corrijas a mano el formulario generado. Si detectas un error, crea uno nuevo antes de presentarlo.",
  ],
  documents: [
    {
      label: "Descargar instrucciones oficiales del Modelo 05",
      sourceId: "aeat.model-05.instructions-pdf.2026-03-25",
    },
  ],
  officialLinks: [
    {
      label: "Página oficial del Modelo 05",
      sourceId: "aeat.model-05.procedure-home.2026-03-25",
    },
    {
      label: "Ficha oficial del procedimiento",
      sourceId: "aeat.model-05.procedure-record.2026-03-25",
    },
    {
      label: "Información general de la AEAT",
      sourceId: "aeat.model-05.information.2026-03-03",
    },
    {
      label: "Homologación tributaria de vehículos especiales",
      href: "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GZ02.shtml",
    },
  ],
  legalLinks: [
    {
      label: "Orden HAC/171/2021, que aprueba el Modelo 05",
      sourceId: "boe.hac-171-2021",
    },
    { label: "Orden HFP/1395/2021", sourceId: "boe.hfp-1395-2021" },
    {
      label: "Ley 38/1992 de Impuestos Especiales",
      sourceId: "boe.excise-law-38-1992.consolidated.2026-06-30",
    },
  ],
  faq: [
    {
      question: "¿El Modelo 05 sirve para pagar el impuesto?",
      answer:
        "No. Sirve para solicitar previamente un beneficio fiscal. Cuando hay que autoliquidar el impuesto se utiliza normalmente el Modelo 576.",
    },
    {
      question: "¿Puedo matricular mientras Hacienda responde?",
      answer:
        "No. La matriculación definitiva debe esperar al reconocimiento del beneficio.",
    },
    {
      question: "¿Puede presentarse en papel?",
      answer:
        "Sí, pero solo si el obligado tributario es una persona física y usando el formulario generado por la AEAT.",
    },
    {
      question: "¿Puede una empresa utilizar Cl@ve?",
      answer:
        "No para este procedimiento. Las personas jurídicas deben utilizar certificado electrónico o actuar mediante una persona autorizada.",
    },
    {
      question: "¿La familia numerosa queda totalmente exenta?",
      answer:
        "No. El beneficio RE1 reduce un 50 % la base imponible y después debe presentarse el Modelo 576.",
    },
    {
      question: "¿Es lo mismo que el IVA del 4 % por discapacidad?",
      answer:
        "No. El IVA reducido se tramita mediante el Modelo 04 y responde a requisitos diferentes.",
    },
    {
      question: "¿Puede afectar a un medio de transporte usado?",
      answer:
        "Sí, si existe el hecho imponible y se cumplen los requisitos del supuesto solicitado.",
    },
    {
      question: "¿Cuánto tarda?",
      answer:
        "El plazo oficial máximo de resolución es de seis meses. No debe interpretarse el transcurso del plazo como concesión automática.",
    },
    {
      question: "¿Qué ocurre si Hacienda piensa denegarlo?",
      answer:
        "Antes de la resolución denegatoria debe permitir alegaciones durante el plazo indicado de diez días.",
    },
    {
      question: "¿Puedo vender el vehículo después?",
      answer:
        "Depende del beneficio. Algunos supuestos obligan a mantener las condiciones durante varios años y una transmisión anticipada puede exigir regularizar el impuesto.",
    },
  ],
  sourceIds: [
    "aeat.model-05.procedure-home.2026-03-25",
    "aeat.model-05.procedure-record.2026-03-25",
    "aeat.model-05.information.2026-03-03",
    "aeat.model-05.instructions-pdf.2026-03-25",
    "boe.hac-171-2021",
    "boe.hfp-1395-2021",
    "boe.excise-law-38-1992.consolidated.2026-06-30",
  ],
} as const satisfies FiscalModelPracticalGuideV1;
