import type { FiscalModelPracticalGuideV1 } from "./fiscal-model-practical-guide.types";

const TERRITORIAL_NOTE =
  "Esta guía se refiere al IVA europeo y a los trámites presentados en España como Estado miembro de identificación. La Península y Baleares forman el territorio de aplicación del IVA español. Canarias, Ceuta y Melilla tienen particularidades específicas. Los empresarios establecidos en Canarias, Ceuta o Melilla pueden utilizar determinados regímenes OSS o IOSS, pero las reglas para elegir régimen, Estado de identificación o intermediario son diferentes.";

export const MODEL_369_GUIDE_V1 = {
  code: "369",
  lastVerifiedAt: "2026-07-14",
  requiresAnnualReview: true,
  intro: [
    "El Modelo 369 sirve para declarar y pagar el IVA de las operaciones incluidas en los regímenes de ventanilla única OSS e IOSS.",
    "Solo lo presenta quien está registrado en alguno de esos regímenes mediante el Formulario 035. Mientras permanezca registrado debe presentarlo incluso cuando no haya realizado operaciones durante el periodo.",
  ],
  notices: [
    {
      title: "No sustituye al Modelo 303",
      paragraphs: [
        "El 369 recoge operaciones del régimen especial. Una misma persona puede tener que presentar también el 303 por su IVA nacional u otras operaciones.",
      ],
    },
    {
      title: "Solo IVA devengado",
      paragraphs: [
        "En el Modelo 369 no se deduce el IVA soportado de los gastos. Su recuperación sigue el procedimiento que corresponda en España, en otro Estado miembro o en la declaración local aplicable.",
      ],
    },
  ],
  actions: [
    {
      label: "Comprobar en qué régimen estoy registrado",
      internalHref: "/consultor-fiscal/modelos/035",
      primary: true,
    },
    {
      label: "Abrir la página oficial del Modelo 369",
      sourceId: "aeat.model-369.procedure-home.2026-06-09",
      primary: true,
    },
    {
      label: "Consultar reglas comunes de los tres regímenes",
      href: "https://sede.agenciatributaria.gob.es/Sede/iva/iva-comercio-electronico/presentacion-autoliquidaciones-periodicas-modelo-369.html",
    },
    {
      label: "Ver la ficha administrativa",
      sourceId: "aeat.model-369.procedure-record.2026-06-09",
    },
    {
      label: "Consultar la ayuda técnica",
      sourceId: "aeat.model-369.file-help.2026-06-19",
    },
  ],
  quickSummaryTitle: "El Modelo 369 en pocas palabras",
  quickFacts: [
    {
      label: "Quién lo presenta",
      value: "Operadores registrados mediante el Formulario 035.",
    },
    {
      label: "Unión y exterior",
      value: "Declaración por cada trimestre natural.",
    },
    { label: "IOSS", value: "Declaración por cada mes natural." },
    { label: "Plazo", value: "Todo el mes natural siguiente al periodo." },
    {
      label: "Sin actividad",
      value: "También debe presentarse mientras siga el alta.",
    },
    {
      label: "Contenido",
      value: "IVA devengado, separado por país de consumo y tipo.",
    },
    { label: "IVA soportado", value: "No se deduce en este modelo." },
    {
      label: "Correcciones",
      value: "En un 369 posterior, normalmente dentro de tres años.",
    },
  ],
  sections: [
    {
      id: "model-369-who-period",
      title: "Quién lo presenta y con qué periodicidad",
      cards: [
        {
          title: "Régimen de la Unión",
          paragraphs: [
            "Los empresarios o profesionales registrados en España presentan una declaración por cada trimestre natural.",
          ],
        },
        {
          title: "Régimen exterior de la Unión",
          paragraphs: [
            "Los operadores no establecidos en la UE y registrados en España presentan una declaración trimestral.",
          ],
        },
        {
          title: "Régimen de importación",
          paragraphs: [
            "El operador o su intermediario presenta una declaración por cada mes natural. El intermediario presenta una por cada representado.",
          ],
        },
        {
          title: "Sin actividad",
          paragraphs: [
            "Mientras el registro esté activo existe obligación de declarar. La casilla sin actividad solo procede cuando no hay operaciones del periodo ni correcciones de periodos anteriores.",
          ],
        },
      ],
      note: "El plazo es el mes natural siguiente al periodo. No utilices el día 20 del Modelo 303 para calcular el vencimiento del 369.",
    },
    {
      id: "model-369-operations",
      title: "Qué operaciones se incluyen",
      cards: [
        {
          title: "Todas las del régimen",
          paragraphs: [
            "Una vez acogido, deben incluirse todas las operaciones comprendidas en ese régimen, no solo las ventas de algunos países.",
          ],
        },
        {
          title: "Operaciones B2C",
          paragraphs: [
            "OSS e IOSS se refieren a determinadas ventas y servicios a consumidores. Las operaciones B2B y las ventas nacionales ordinarias siguen sus propias reglas.",
          ],
        },
        {
          title: "País de consumo",
          paragraphs: [
            "Cada operación se atribuye al Estado miembro donde se localiza el consumo según las reglas aplicables.",
          ],
        },
        {
          title: "Establecimientos",
          paragraphs: [
            "Los servicios localizados en un Estado donde la empresa tiene un establecimiento permanente se incluyen, en general, en la declaración nacional de ese establecimiento y no en UOSS.",
          ],
        },
      ],
    },
    {
      id: "model-369-calculation",
      title: "Países, tipos de IVA e importes",
      cards: [
        {
          title: "Separación por país",
          paragraphs: [
            "La declaración separa las operaciones por Estado miembro de consumo y por tipo impositivo.",
          ],
        },
        {
          title: "Tipo aplicable",
          paragraphs: [
            "Se utiliza el tipo de IVA del país de consumo correspondiente a la operación. Los tipos cambian; deben comprobarse en una fuente europea u oficial vigente.",
          ],
        },
        {
          title: "Importes en euros",
          paragraphs: [
            "Los importes se consignan en euros. Si la operación está en otra moneda se aplica la regla oficial de conversión del régimen; esta ficha no incorpora un conversor.",
          ],
        },
        {
          title: "Sin deducción de gastos",
          paragraphs: [
            "El IVA soportado no se resta en el 369, aunque esté relacionado con las ventas declaradas.",
          ],
        },
      ],
    },
    {
      id: "model-369-input-vat",
      title: "Cómo se recupera el IVA soportado",
      cards: [
        {
          title: "IVA soportado en España",
          paragraphs: [
            "Puede deducirse mediante el Modelo 303 cuando se cumplan los requisitos generales.",
          ],
          links: [
            { label: "Ver Modelo 303", href: "/consultor-fiscal/modelos/303" },
          ],
        },
        {
          title: "IVA soportado en otro Estado miembro",
          paragraphs: [
            "Puede corresponder el procedimiento de devolución a empresarios establecidos, mediante el Modelo 360, si se cumplen los requisitos.",
          ],
          links: [
            { label: "Ver Modelo 360", href: "/consultor-fiscal/modelos/360" },
          ],
        },
        {
          title: "No establecidos en España",
          paragraphs: [
            "En determinados casos puede corresponder el Modelo 361 o el procedimiento del país donde se soportó el impuesto.",
          ],
          links: [
            { label: "Ver Modelo 361", href: "/consultor-fiscal/modelos/361" },
          ],
        },
        {
          title: "Registro local",
          paragraphs: [
            "Si existen otras operaciones que obligan a registrarse en un Estado miembro, la deducción puede hacerse en la declaración local de ese Estado.",
          ],
        },
      ],
    },
    {
      id: "model-369-result-payment",
      title: "Resultado y pago",
      cards: [
        {
          title: "Resultado conjunto",
          paragraphs: [
            "La declaración no puede producir un importe total negativo a compensar con otros países.",
          ],
        },
        {
          title: "Saldo negativo de un país",
          paragraphs: [
            "Un saldo negativo originado por correcciones en un Estado de consumo no reduce la deuda de otros Estados. Ese Estado decide sobre la devolución.",
          ],
        },
        {
          title: "Pago total, parcial o pendiente",
          paragraphs: [
            "El formulario contempla distintas situaciones de pago. Un ingreso parcial o la imposibilidad de pagar no extinguen el resto de la deuda.",
          ],
        },
        {
          title: "Ingreso adicional",
          paragraphs: [
            "La Sede dispone de un trámite para completar el pago de una declaración ya presentada mientras el cobro siga gestionándose por el Estado miembro de identificación.",
          ],
        },
      ],
    },
    {
      id: "model-369-corrections",
      title: "Correcciones de declaraciones anteriores",
      cards: [
        {
          title: "No sustituir la original",
          paragraphs: [
            "Para periodos iniciados desde julio de 2021, una cuota anterior se corrige en un Modelo 369 de un periodo posterior, no presentando de nuevo la declaración original.",
          ],
        },
        {
          title: "Plazo general",
          paragraphs: [
            "La corrección puede incluirse durante los tres años siguientes a la fecha en que debió presentarse la declaración original.",
          ],
        },
        {
          title: "Dato de la corrección",
          paragraphs: [
            "Se identifica país, ejercicio, periodo y diferencia positiva o negativa de cuota respecto de lo ya declarado.",
          ],
        },
        {
          title: "Después de tres años",
          paragraphs: [
            "La corrección ya no se tramita por la ventanilla única y debe tratarse directamente con el Estado miembro de consumo afectado.",
          ],
        },
      ],
    },
    {
      id: "model-369-records",
      title: "Registros y comprobación previa",
      accordions: [
        {
          question: "¿Estás dado de alta en el régimen correcto?",
          paragraphs: [
            "Contrasta el acuerdo e identificador del Formulario 035 y el periodo que corresponde.",
          ],
        },
        {
          question: "¿Has incluido todos los países y operaciones?",
          paragraphs: [
            "Revisa ventas, devoluciones, cancelaciones y correcciones, separadas por país y tipo de IVA.",
          ],
        },
        {
          question: "¿Conservas el soporte?",
          paragraphs: [
            "Mantén los registros exigidos por el régimen a disposición de las Administraciones. El justificante del 369 no sustituye esos registros.",
          ],
        },
      ],
    },
    {
      id: "model-369-related",
      title: "Relación con los Modelos 035, 303 y 349",
      cards: [
        {
          title: "Formulario 035",
          paragraphs: [
            "Da de alta, modifica o da de baja el régimen antes de declarar.",
          ],
          links: [
            {
              label: "Ver Formulario 035",
              href: "/consultor-fiscal/modelos/035",
            },
          ],
        },
        {
          title: "Modelo 303",
          paragraphs: [
            "Declara el IVA nacional y otras operaciones del régimen general; no queda sustituido por el 369.",
          ],
          links: [
            { label: "Ver Modelo 303", href: "/consultor-fiscal/modelos/303" },
          ],
        },
        {
          title: "Modelo 349",
          paragraphs: [
            "Informa determinadas operaciones intracomunitarias B2B, con una función distinta de OSS e IOSS.",
          ],
          links: [
            { label: "Ver Modelo 349", href: "/consultor-fiscal/modelos/349" },
          ],
        },
      ],
    },
    {
      id: "model-369-territory",
      title: "Ámbito territorial",
      note: TERRITORIAL_NOTE,
    },
  ],
  fillingTitle: "Cómo preparar el Modelo 369",
  fillingSteps: [
    {
      title: "1. Identifica régimen y periodo",
      paragraphs: [
        "Comprueba alta, identificador y si corresponde trimestre o mes.",
      ],
    },
    {
      title: "2. Reúne todas las operaciones",
      paragraphs: [
        "Incluye ventas, servicios, devoluciones y correcciones de todos los países comprendidos.",
      ],
    },
    {
      title: "3. Separa por Estado y tipo",
      paragraphs: [
        "Aplica el tipo vigente del país de consumo y convierte a euros con la regla oficial.",
      ],
    },
    {
      title: "4. Revisa el resultado",
      paragraphs: [
        "No deduzcas gastos ni compenses saldos negativos entre Estados distintos.",
      ],
    },
    {
      title: "5. Presenta, paga y conserva",
      paragraphs: [
        "Completa el trámite oficial durante el mes siguiente y guarda justificante, pago y registros.",
      ],
    },
  ],
  afterTitle: "Después de presentar",
  afterSteps: [
    {
      title: "Conserva el justificante",
      description:
        "Archiva la declaración y el estado del pago por cada periodo y régimen.",
    },
    {
      title: "Completa pagos pendientes",
      description:
        "Usa el ingreso adicional oficial cuando proceda; la deuda no desaparece por un pago parcial.",
    },
    {
      title: "Corrige después",
      description:
        "Incluye los ajustes en una declaración posterior dentro del plazo y conserva su trazabilidad.",
    },
  ],
  comparison: {
    title: "Formulario 035, Modelo 369 y declaraciones relacionadas",
    current: {
      title: "Modelo 369",
      description:
        "Declara y paga periódicamente el IVA de las operaciones incluidas en OSS o IOSS.",
    },
    related: {
      title: "Formulario 035",
      description:
        "Registra, modifica o da de baja en el régimen antes de declarar.",
      href: "/consultor-fiscal/modelos/035",
      label: "Ver Formulario 035",
    },
    additional: [
      {
        title: "Modelo 303",
        description:
          "Recoge IVA nacional y otras operaciones distintas; puede coexistir con el 369.",
        href: "/consultor-fiscal/modelos/303",
        label: "Ver Modelo 303",
      },
      {
        title: "Modelo 349",
        description:
          "Declaración informativa para determinadas operaciones intracomunitarias B2B.",
        href: "/consultor-fiscal/modelos/349",
        label: "Ver Modelo 349",
      },
    ],
    conclusion:
      "El 035 registra; el 369 declara y paga. El 303 y el 349 pueden seguir siendo necesarios para operaciones diferentes.",
  },
  pdfNotice: [
    "La declaración y el pago se realizan en la Sede oficial. Factu no firma, presenta ni envía información a la Agencia Tributaria.",
  ],
  documents: [
    {
      label: "Guía oficial de presentación por fichero",
      sourceId: "aeat.model-369.file-guide-pdf.2026-07-13",
    },
  ],
  officialLinks: [
    {
      label: "Información general del Modelo 369",
      href: "https://sede.agenciatributaria.gob.es/Sede/iva/iva-comercio-electronico/modelo-369.html",
    },
    {
      label: "Ayuda del régimen de la Unión",
      href: "https://sede.agenciatributaria.gob.es/Sede/Ayuda/369/RegimenUnion.shtml",
    },
    {
      label: "Ayuda del régimen exterior de la Unión",
      href: "https://sede.agenciatributaria.gob.es/Sede/Ayuda/369/RegimenExterior.shtml",
    },
    {
      label: "Ayuda del régimen de importación",
      href: "https://sede.agenciatributaria.gob.es/Sede/Ayuda/369/Regimenimport.shtml",
    },
    {
      label: "Formato oficial de registros",
      href: "https://sede.agenciatributaria.gob.es/Sede/iva/iva-comercio-electronico/nuevos-regimenes-especiales-ventanilla-unica/formulario-normalizado-presentacion-registros-operaciones.html",
    },
    {
      label: "Tipos de IVA en la Unión Europea",
      href: "https://taxation-customs.ec.europa.eu/taxation/vat/vat-directive/vat-rates_en",
    },
  ],
  legalLinks: [
    {
      label: "Orden HAC/610/2021",
      sourceId: "boe.model-369.order-hac-610-2021.original",
    },
    {
      label: "Ley del IVA consolidada",
      href: "https://www.boe.es/buscar/act.php?id=BOE-A-1992-28740",
    },
    {
      label: "Reglamento del IVA consolidado",
      href: "https://www.boe.es/buscar/act.php?id=BOE-A-1992-28925",
    },
  ],
  faq: [
    {
      question: "¿Quién presenta el Modelo 369?",
      answer: "Quien está registrado en OSS o IOSS mediante el Formulario 035.",
    },
    {
      question: "¿Se presenta si no hubo ventas?",
      answer: "Sí, mientras permanezcas registrado.",
    },
    {
      question: "¿Es trimestral?",
      answer:
        "El régimen de la Unión y el exterior son trimestrales. IOSS es mensual.",
    },
    {
      question: "¿Cuándo termina el plazo?",
      answer: "Durante el mes natural siguiente al periodo.",
    },
    {
      question: "¿Puedo declarar solo las ventas de un país?",
      answer:
        "No. Deben incluirse todas las operaciones comprendidas en el régimen.",
    },
    {
      question: "¿Puedo restar el IVA de mis gastos?",
      answer: "No en el Modelo 369.",
    },
    {
      question: "¿Cómo recupero el IVA soportado en Francia o Alemania?",
      answer:
        "Puede corresponder el Modelo 360 o la declaración local aplicable.",
    },
    {
      question: "¿Utilizo el tipo de IVA español?",
      answer:
        "No necesariamente. Se utiliza el tipo correspondiente al país de consumo y a la operación.",
    },
    {
      question: "¿Puede salir negativo?",
      answer: "El resultado conjunto no puede ser negativo.",
    },
    {
      question: "¿Cómo corrijo una venta de un trimestre anterior?",
      answer: "Mediante una corrección incluida en una declaración posterior.",
    },
    {
      question: "¿Cuánto tiempo tengo para corregir?",
      answer:
        "Con carácter general, tres años desde la fecha en que debió presentarse la declaración original.",
    },
    {
      question: "¿Puedo pagar solo una parte?",
      answer:
        "El formulario puede permitirlo, pero el resto continúa pendiente.",
    },
    { question: "¿El Modelo 369 sustituye al 303?", answer: "No." },
    {
      question: "¿Tengo que conservar registros?",
      answer: "Sí. Deben estar disponibles para la Administración.",
    },
    {
      question: "¿Puede presentarlo mi asesor?",
      answer: "Sí, mediante representación o colaboración social.",
    },
  ],
  sourceIds: [
    "aeat.model-369.procedure-home.2026-06-09",
    "aeat.model-369.procedure-record.2026-06-09",
    "aeat.model-369.file-help.2026-06-19",
    "aeat.model-369.file-guide-pdf.2026-07-13",
    "boe.model-369.order-hac-610-2021.original",
  ],
} as const satisfies FiscalModelPracticalGuideV1;
