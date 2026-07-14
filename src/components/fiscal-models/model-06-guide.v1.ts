import type { FiscalModelPracticalGuideV1 } from "./fiscal-model-practical-guide.types";

export const MODEL_06_GUIDE_V1 = {
  code: "06",
  intro: [
    "El Modelo 06 sirve para declarar determinados supuestos en los que un vehículo, embarcación o aeronave no está sujeto al impuesto de matriculación o está exento sin necesitar una concesión previa de la Agencia Tributaria.",
    "No es una solicitud como el Modelo 05, pero debe presentarse y validarse antes de continuar con la matriculación.",
  ],
  notices: [
    {
      title: "Sin autorización previa no significa beneficio automático",
      paragraphs: [
        "Debes seleccionar la clave correcta, aportar la documentación y presentar la declaración antes de la matriculación definitiva. La AEAT puede comprobar después que los datos y requisitos eran correctos.",
      ],
    },
    {
      title: "La presentación electrónica directa es exclusiva para gestores",
      paragraphs: [
        "El contribuyente general debe generar el borrador o PDF y presentarlo, junto con la documentación, en una oficina de la AEAT. Los accesos electrónicos directos para gestores aparecen separados y claramente identificados.",
      ],
    },
  ],
  actions: [
    {
      label: "Generar borrador del Modelo 06",
      href: "https://www2.agenciatributaria.gob.es/static_files/common/internet/dep/aplicaciones/ov/ie5v060i.html",
      primary: true,
    },
    {
      label: "Descargar Modelo 06 oficial",
      sourceId: "aeat.model-06.form-pdf.2026-06-09",
      primary: true,
    },
    {
      label: "Consultar instrucciones oficiales",
      sourceId: "aeat.model-06.instructions.2026-06-09",
      primary: true,
    },
    {
      label: "Aportar documentación complementaria",
      href: "https://www1.agenciatributaria.gob.es/wlpl/REGD-JDIT/FG?fTramite=G5037",
    },
    {
      label: "Consultar declaraciones presentadas",
      href: "https://www1.agenciatributaria.gob.es/wlpl/SCEJ-MANT/CONSUL/index.zul?MODELO=006&EJERCICIO=0",
    },
    {
      label: "Descargar CEM",
      href: "https://www1.agenciatributaria.gob.es/es13/h/ie9cemsi.html",
    },
    {
      label: "Comprobar CEM",
      href: "https://www1.agenciatributaria.gob.es/wlpl/TOMT-JDIT/SvValidacionCodElectronico",
    },
    {
      label: "Consultar el procedimiento oficial",
      sourceId: "aeat.model-06.procedure-home.2026-06-29",
    },
    {
      label: "Pedir cita en la AEAT",
      href: "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GC29.shtml",
    },
  ],
  quickSummaryTitle: "El Modelo 06 en pocas palabras",
  quickFacts: [
    {
      label: "Qué es",
      value:
        "Una declaración de exenciones y no sujeciones sin reconocimiento previo.",
    },
    { label: "¿Es una autorización?", value: "No." },
    { label: "Cuándo", value: "Antes de la matriculación definitiva." },
    {
      label: "Quién lo presenta",
      value:
        "La persona o entidad a cuyo nombre se realizará la matriculación, o su representante.",
    },
    {
      label: "Presentación electrónica directa",
      value: "Exclusiva para gestores con certificado electrónico.",
    },
    {
      label: "Contribuyentes en general",
      value:
        "Generan el borrador o PDF y lo presentan con los justificantes en una oficina de la AEAT.",
    },
    {
      label: "Documentación",
      value: "Depende de la clave y del tipo de medio de transporte.",
    },
    {
      label: "Plazo de resolución",
      value: "No existe porque no es un procedimiento de concesión previa.",
    },
  ],
  sections: [
    {
      id: "model-06-basic-concepts",
      title: "Impuesto de matriculación y conceptos básicos",
      intro: [
        "El nombre oficial es Impuesto Especial sobre Determinados Medios de Transporte. También puede afectar a determinadas embarcaciones y aeronaves y no debe confundirse con el IVTM municipal anual.",
      ],
      cards: [
        {
          title: "No sujeción",
          paragraphs: [
            "La operación queda fuera del impuesto porque la ley establece que ese medio o situación no está sometido al impuesto de matriculación.",
          ],
        },
        {
          title: "Exención",
          paragraphs: [
            "La operación entra en principio en el impuesto, pero la ley permite no pagarlo cuando se cumplen unas condiciones.",
          ],
        },
        {
          title: "Reducción de la base",
          paragraphs: [
            "El impuesto se calcula sobre una cantidad menor. Este beneficio suele tramitarse con el Modelo 05 y después puede requerir el Modelo 576.",
          ],
          links: [
            { label: "Ver Modelo 05", href: "/consultor-fiscal/modelos/05" },
            {
              label: "Ver Modelo 576",
              href: "/consultor-fiscal/modelos/576",
            },
          ],
        },
      ],
    },
    {
      id: "model-06-purpose-and-who",
      title: "Para qué sirve y quién debe presentarlo",
      intro: [
        "Se utiliza cuando la ley considera que no hace falta que Hacienda conceda previamente el beneficio. El interesado declara el supuesto, identifica el medio y aporta la documentación que lo demuestra.",
        "Lo presenta la persona o entidad a cuyo nombre se realizará la primera matriculación definitiva en España. También puede corresponder a quien sea responsable de la circulación o utilización en España de un medio no matriculado definitivamente.",
        "Puede actuar el interesado, un representante o un presentador autorizado. La falta de reconocimiento previo no impide una comprobación posterior de la AEAT.",
      ],
    },
    {
      id: "model-06-land-vehicles",
      title: "No sujeción: vehículos terrestres",
      cards: [
        {
          title: "NS1 · Categorías N1, N2 y N3",
          paragraphs: [
            "Comprende determinadas categorías técnicas de vehículos destinados principalmente al transporte de mercancías. No significa que cualquier furgoneta esté no sujeta.",
          ],
          bullets: [
            "En N1 debe existir afectación significativa a una actividad económica.",
            "Con carácter general, la ley presume esa afectación cuando existe derecho a deducir al menos el 50 % del IVA soportado en la adquisición o importación.",
            "Si el vehículo se acondiciona como vivienda, puede quedar sujeto.",
            "Debe revisarse la ficha técnica y justificar la actividad cuando sea necesario.",
          ],
        },
        {
          title: "NS7 · Mixto adaptable de más de 1.800 mm",
          paragraphs: [
            "Exige esa altura técnica, no ser todoterreno, estar afectado significativamente a una actividad económica y no estar acondicionado como vivienda.",
            "No basta con que sea alto o tenga uso profesional.",
          ],
          bullets: [
            "Ficha técnica.",
            "Justificación de la actividad cuando sea necesaria.",
          ],
        },
      ],
      accordions: [
        {
          question: "NS2 · Categorías M2, M3 y tranvías",
          paragraphs: [
            "Comprende las categorías técnicas indicadas, destinadas al transporte de personas con más plazas que un turismo ordinario, y los tranvías. Debe mantenerse la clasificación técnica y aportarse la ficha.",
          ],
        },
        {
          question: "NS3 · Ciclomotores y cuatriciclos ligeros",
          paragraphs: [
            "Comprende ciclomotores de dos o tres ruedas y cuatriciclos ligeros según su clasificación técnica.",
          ],
          bullets: ["Ficha técnica."],
        },
        {
          question: "NS4 · Motocicletas y vehículos de tres ruedas",
          paragraphs: [
            "Comprende determinados vehículos que no sean cuatriciclos: hasta 250 cc si tienen motor de combustión o hasta 16 kW de potencia máxima neta en los demás motores.",
          ],
          bullets: ["Ficha técnica."],
        },
        {
          question: "NS5 · Vehículos para personas con movilidad reducida",
          paragraphs: [
            "Se refiere a una clasificación técnica concreta. No es cualquier turismo comprado o utilizado por una persona con discapacidad.",
            "Para un turismo ordinario matriculado a nombre de una persona con discapacidad puede corresponder el Modelo 05, clave ER4, si se cumplen sus requisitos.",
          ],
          bullets: [
            "Ficha técnica donde conste la clasificación correspondiente.",
          ],
        },
        {
          question: "NS6 · Vehículos especiales",
          paragraphs: [
            "Comprende vehículos con clasificación oficial de vehículo especial. Los vehículos tipo quad no deben incluirse automáticamente.",
          ],
          bullets: ["Ficha técnica."],
        },
      ],
    },
    {
      id: "model-06-boats-aircraft",
      title: "No sujeción: embarcaciones y aeronaves",
      cards: [
        {
          title: "NS8 · Embarcaciones de hasta ocho metros",
          paragraphs: [
            "Determinadas embarcaciones y buques de recreo o deportes náuticos de hasta ocho metros de eslora pueden quedar no sujetos.",
          ],
          bullets: [
            "Las motos náuticas están sujetas cualquiera que sea su eslora.",
            "Debe aportarse el certificado de características generales.",
          ],
        },
        {
          title: "NS9 · Uso agrícola, forestal o sanitario",
          paragraphs: [
            "Comprende aeronaves que por sus características técnicas solo puedan destinarse a trabajos agrícolas o forestales o al traslado de enfermos y heridos.",
          ],
          bullets: ["Certificado de la Agencia Estatal de Seguridad Aérea."],
        },
        {
          title: "NS10 · Aeronaves de hasta 1.550 kg",
          paragraphs: [
            "Comprende aeronaves cuyo peso máximo al despegue no exceda de 1.550 kilogramos.",
          ],
          bullets: ["Certificado de la Agencia Estatal de Seguridad Aérea."],
        },
      ],
    },
    {
      id: "model-06-exemptions",
      title: "Supuestos de exención",
      accordions: [
        {
          question: "ET1 · Remo, pala y veleros olímpicos",
          paragraphs: [
            "Comprende embarcaciones que por su configuración solo puedan impulsarse a remo o pala y veleros de categoría olímpica.",
          ],
          bullets: ["Certificado de características generales."],
        },
        {
          question: "ET2 · Aeronaves de Administraciones públicas",
          paragraphs: [
            "Comprende aeronaves matriculadas por el Estado, comunidades autónomas, entidades locales o determinadas empresas y organismos públicos.",
          ],
          bullets: ["Certificado de la Agencia Estatal de Seguridad Aérea."],
        },
        {
          question: "ET3 · Empresas de navegación aérea",
          paragraphs: [
            "Comprende aeronaves matriculadas a nombre de empresas de navegación aérea cuando se cumplan las condiciones legales.",
          ],
          bullets: [
            "Certificado de la Agencia Estatal de Seguridad Aérea.",
            "Otros documentos que solicite la AEAT.",
          ],
        },
        {
          question: "ET4 · Traslado de residencia habitual a España",
          paragraphs: [
            "Permite declarar la exención para determinados medios matriculados o utilizados en España como consecuencia del traslado de la residencia habitual de su titular desde el extranjero.",
          ],
          bullets: [
            "Residencia habitual fuera de España durante al menos los doce meses consecutivos anteriores.",
            "Adquisición o importación con tributación normal en origen y sin una exención o devolución incompatible.",
            "Uso del medio en la antigua residencia durante al menos seis meses antes de abandonarla.",
            "Solicitud de matriculación dentro del plazo legal; para la utilización ligada al traslado, la ley amplía a 60 días el plazo general.",
            "Prohibición de transmitir el medio durante los doce meses posteriores a la matriculación.",
            "Debe poder acreditarse la residencia anterior, adquisición, uso previo y fecha del traslado.",
          ],
        },
      ],
    },
    {
      id: "model-06-filing",
      title: "Cómo se presenta realmente",
      cards: [
        {
          title: "Contribuyentes en general",
          paragraphs: [
            "Accede al borrador, rellena los datos, genera el documento con su referencia, imprímelo y preséntalo con los justificantes en la Delegación o Administración de la AEAT de tu domicilio fiscal.",
            "También puede descargarse el PDF oficial, cumplimentarlo e imprimirlo para su presentación en papel.",
          ],
        },
        {
          title: "Gestores",
          paragraphs: [
            "La presentación electrónica directa y la presentación por lotes están reservadas a gestores y requieren certificado electrónico. Los accesos aparecen separados al final de la ficha.",
          ],
        },
        {
          title: "Cuándo",
          paragraphs: [
            "Debe presentarse antes de la matriculación definitiva y esta no debe continuar hasta que la declaración haya sido presentada y validada.",
            "Para circulación o utilización sin matriculación definitiva, el plazo general es de 30 días; en ET4 puede ampliarse a 60 días cuando se cumplen sus condiciones.",
          ],
        },
      ],
    },
    {
      id: "model-06-resolution",
      title: "Validación, CEM y recursos",
      cards: [
        {
          title: "No existe plazo de resolución",
          paragraphs: [
            "El procedimiento oficial no fija plazo porque no es una solicitud de reconocimiento previo. Esto no significa aceptación automática sin revisión.",
          ],
        },
        {
          title: "Qué es el CEM",
          paragraphs: [
            "Es el código electrónico utilizado para acreditar ante el organismo de matriculación la situación tributaria declarada. No todas las declaraciones deben presentarse como si lo generaran inmediatamente.",
          ],
        },
        {
          title: "Recursos",
          paragraphs: [
            "La ficha oficial indica que no procede recurso contra la simple presentación porque no existe resolución previa de concesión. Si posteriormente se dicta una liquidación, sanción u otro acto, su notificación indicará los recursos disponibles.",
          ],
        },
      ],
    },
    {
      id: "model-06-changes",
      title: "Si cambian después las condiciones",
      intro: [
        "Modificar el tipo, destino o utilización del medio puede obligar a regularizar el impuesto. La ley contempla, como regla general, consecuencias si cambian durante los cuatro años siguientes las circunstancias que justificaron la no sujeción o exención.",
        "En ET4 existe además una prohibición específica de transmitir durante los doce meses posteriores a la matriculación. No toda reparación, modificación o venta produce automáticamente la misma consecuencia: debe revisarse el supuesto concreto.",
      ],
    },
    {
      id: "model-06-disability-comparison",
      title: "Diferencias importantes en casos de discapacidad",
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
          links: [
            { label: "Ver Modelo 05", href: "/consultor-fiscal/modelos/05" },
          ],
        },
        {
          title: "Modelo 06 · NS5",
          paragraphs: [
            "Declara la no sujeción de un medio técnicamente clasificado como vehículo para personas con movilidad reducida. Un turismo ordinario no entra en NS5 solo por utilizarlo una persona con discapacidad.",
          ],
        },
      ],
    },
    {
      id: "model-06-common-errors",
      title: "Errores habituales",
      cards: [
        {
          title: "Canal y modelo equivocados",
          bullets: [
            "Entrar en la presentación exclusiva para gestores siendo contribuyente general.",
            "Confundir ausencia de autorización previa con ausencia de obligación de presentar.",
            "Elegir el Modelo 06 cuando corresponde el 05 o el 576.",
            "Omitir la base imponible alternativa del formulario.",
          ],
        },
        {
          title: "Clave o requisito equivocado",
          bullets: [
            "Usar NS1 para cualquier furgoneta o no justificar la actividad de un N1 cuando proceda.",
            "Usar NS5 para un turismo ordinario, NS6 para un quad o NS7 para un todoterreno o una autocaravana.",
            "Aplicar NS8 a una moto náutica.",
            "Presentar ET4 sin acreditar doce meses de residencia fuera, seis meses de uso previo o el plazo aplicable.",
            "Transmitir el medio de ET4 antes de doce meses sin revisar las consecuencias.",
          ],
        },
      ],
    },
  ],
  fillingTitle: "Cómo rellenar el Modelo 06",
  fillingSteps: [
    {
      title: "1. Obligado tributario",
      paragraphs: [
        "Identifica a la persona o entidad a cuyo nombre se realiza la declaración.",
      ],
      bullets: [
        "NIF.",
        "Nombre, apellidos o razón social.",
        "Domicilio fiscal.",
        "Datos de contacto.",
      ],
    },
    {
      title: "2. Ejercicio",
      paragraphs: [
        "Indica las cuatro cifras del año al que corresponde la presentación.",
      ],
    },
    {
      title: "3. Representante",
      paragraphs: [
        "Incluye sus datos si actúa una persona distinta del obligado. La representación debe acreditarse.",
      ],
    },
    {
      title: "4. Medio de transporte",
      paragraphs: [
        "Indica si es nuevo o usado, lugar de adquisición, puesta en servicio, kilómetros u horas, identificación y características técnicas.",
      ],
      bullets: [
        "Vehículo terrestre: nuevo antes de seis meses o hasta 6.000 km.",
        "Embarcación: antes de tres meses o hasta 100 horas.",
        "Aeronave: antes de tres meses o hasta 40 horas.",
      ],
    },
    {
      title: "5. No sujeto o exento",
      paragraphs: ["Marca la naturaleza del supuesto que corresponda."],
    },
    {
      title: "6. Clave",
      paragraphs: [
        "Selecciona exactamente NS1 a NS10 o ET1 a ET4. Cada clave exige condiciones y documentos diferentes.",
      ],
    },
    {
      title: "7. Base imponible alternativa",
      paragraphs: [
        "Indica cuál sería la base si no resultara aplicable el beneficio. No es admitir una deuda: es información requerida por el formulario y debe revisarse.",
      ],
    },
    {
      title: "8. Documentación",
      paragraphs: [
        "Adjunta o presenta los justificantes exigidos para la clave elegida.",
      ],
    },
    {
      title: "9. Firma y presentación",
      paragraphs: [
        "Revisa la declaración y conserva el justificante o ejemplar validado.",
      ],
    },
  ],
  afterTitle: "Qué ocurre después",
  afterSteps: [
    {
      title: "1. Preparación",
      description:
        "Se genera o cumplimenta la declaración y se reúne la documentación.",
    },
    {
      title: "2. Presentación",
      description:
        "El contribuyente general la presenta en oficina; el gestor puede usar el acceso electrónico reservado.",
    },
    {
      title: "3. Revisión o validación",
      description:
        "La AEAT valida la presentación y puede comprobar posteriormente lo declarado.",
    },
    {
      title: "4. Documento o CEM",
      description:
        "Cuando corresponda, se obtiene el documento o código necesario, sin prometer una generación inmediata en todos los casos.",
    },
    {
      title: "5. Matriculación",
      description:
        "Se continúa el trámite ante el organismo de matriculación con la acreditación tributaria procedente.",
    },
  ],
  comparison: {
    title: "¿Necesitas el Modelo 05, el Modelo 06 o el Modelo 576?",
    current: {
      title: "Modelo 06",
      description:
        "Se utiliza para declarar determinados supuestos de no sujeción o exención que no necesitan autorización previa de la AEAT.",
    },
    related: {
      title: "Modelo 05",
      description:
        "Se utiliza cuando el beneficio necesita reconocimiento de la AEAT antes de matricular definitivamente el medio.",
      href: "/consultor-fiscal/modelos/05",
      label: "Ver la ficha del Modelo 05",
    },
    additional: [
      {
        title: "Modelo 576",
        description:
          "Sirve para calcular y, cuando corresponda, pagar el impuesto de matriculación.",
        href: "/consultor-fiscal/modelos/576",
        label: "Ver la ficha del Modelo 576",
      },
    ],
    conclusion:
      "Esta comparación es orientativa. El modelo correcto depende del supuesto legal y de la clave correspondiente al vehículo, embarcación o aeronave.",
  },
  pdfNotice: [
    "Descarga el formulario en el ordenador y ábrelo con Adobe Acrobat Reader. Si se abre dentro de Chrome o Edge puede quedar inactiva la función para generar el código del formulario.",
    "La AEAT advierte que esos navegadores pueden mostrar, para este PDF concreto, un mensaje de documento alterado debido al código incorporado para cumplimentarlo y generar el justificante. Esta explicación no debe extenderse a otros archivos ni a cualquier alerta de seguridad.",
  ],
  documents: [
    {
      label: "Descargar formulario oficial del Modelo 06",
      sourceId: "aeat.model-06.form-pdf.2026-06-09",
    },
  ],
  officialLinks: [
    {
      label: "Página oficial del Modelo 06",
      sourceId: "aeat.model-06.procedure-home.2026-06-29",
    },
    {
      label: "Ficha oficial del procedimiento",
      sourceId: "aeat.model-06.procedure-record.2026-06-09",
    },
    {
      label: "Instrucciones oficiales",
      sourceId: "aeat.model-06.instructions.2026-06-09",
    },
    {
      label: "Página oficial de descarga",
      sourceId: "aeat.model-06.downloads.2026-06-09",
    },
    {
      label: "Información general de la AEAT",
      sourceId: "aeat.model-06.information.2026-04-29",
    },
    {
      label: "Homologación tributaria de vehículos especiales",
      href: "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GZ02.shtml",
    },
  ],
  actionGroups: [
    {
      title: "Accesos exclusivos para gestores",
      description:
        "Estas opciones no son la vía de presentación directa del contribuyente general y requieren la identificación profesional correspondiente.",
      links: [
        {
          label: "Presentación electrónica para gestores",
          href: "https://www1.agenciatributaria.gob.es/static_files/common/internet/dep/aplicaciones/ov/ie50060i.html",
        },
        {
          label: "Presentación por lotes para gestores",
          href: "https://www1.agenciatributaria.gob.es/wlpl/OVPT-NTGV/RealizarPresentacionLotes?mod=006&ejercicio=0",
        },
        {
          label: "Borrador para gestores",
          href: "https://www1.agenciatributaria.gob.es/static_files/common/internet/dep/aplicaciones/ov/ie5v060i.html",
        },
      ],
    },
  ],
  legalLinks: [
    {
      label: "Orden EHA/3851/2007, que aprueba el Modelo 06",
      sourceId: "boe.eha-3851-2007",
    },
    { label: "Orden HFP/1395/2021", sourceId: "boe.hfp-1395-2021" },
    {
      label: "Ley 38/1992 de Impuestos Especiales",
      sourceId: "boe.excise-law-38-1992.consolidated.2026-06-30",
    },
  ],
  faq: [
    {
      question: "¿El Modelo 06 es una solicitud?",
      answer:
        "No exactamente. Es una declaración de un supuesto que no requiere reconocimiento previo.",
    },
    {
      question: "¿Puedo matricular sin presentar el Modelo 06?",
      answer:
        "No cuando el supuesto exige esta declaración. Debe presentarse y validarse antes de continuar la matriculación.",
    },
    {
      question:
        "¿Puede presentarlo directamente por internet cualquier persona?",
      answer:
        "No. La presentación electrónica directa está reservada a gestores. El contribuyente general genera el borrador o PDF y lo presenta en una oficina.",
    },
    {
      question: "¿Cualquier furgoneta está no sujeta?",
      answer:
        "No. Debe tener la categoría técnica correspondiente y, en determinados N1, existir una afectación significativa a una actividad económica.",
    },
    {
      question:
        "¿Un vehículo para una persona con discapacidad utiliza siempre NS5?",
      answer:
        "No. NS5 se refiere a una categoría técnica concreta. Para un turismo ordinario puede ser necesario el Modelo 05.",
    },
    {
      question:
        "¿Una embarcación de menos de ocho metros siempre está no sujeta?",
      answer:
        "No. Las motos náuticas están sujetas cualquiera que sea su eslora.",
    },
    {
      question: "¿Puedo usar ET4 si acabo de mudarme a España?",
      answer:
        "Solo si se cumplen todos los requisitos, incluidos doce meses de residencia anterior fuera de España y seis meses de uso previo del medio.",
    },
    {
      question: "¿Cuánto tarda la resolución?",
      answer:
        "No existe resolución previa ni plazo de concesión como en el Modelo 05. La declaración sí debe presentarse y validarse.",
    },
    {
      question: "¿Qué es el CEM?",
      answer:
        "Es el código electrónico que puede acreditar la situación tributaria ante el organismo encargado de matricular el medio.",
    },
    {
      question: "¿Qué ocurre si el supuesto declarado no era correcto?",
      answer:
        "La AEAT puede comprobarlo y exigir la regularización del impuesto, además de las consecuencias que correspondan.",
    },
  ],
  sourceIds: [
    "aeat.model-06.procedure-home.2026-06-29",
    "aeat.model-06.procedure-record.2026-06-09",
    "aeat.model-06.information.2026-04-29",
    "aeat.model-06.downloads.2026-06-09",
    "aeat.model-06.instructions.2026-06-09",
    "aeat.model-06.form-pdf.2026-06-09",
    "boe.eha-3851-2007",
    "boe.hfp-1395-2021",
    "boe.excise-law-38-1992.consolidated.2026-06-30",
  ],
} as const satisfies FiscalModelPracticalGuideV1;
