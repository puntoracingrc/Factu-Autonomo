import type { FiscalModelPracticalGuideV1 } from "./fiscal-model-practical-guide.types";

export const MODEL_232_GUIDE_V1 = {
  code: "232",
  lastVerifiedAt: "2026-07-14",
  requiresAnnualReview: true,
  intro: [
    "El Modelo 232 es una declaración informativa sobre determinadas operaciones vinculadas y determinadas operaciones o situaciones relacionadas con jurisdicciones no cooperativas. No calcula ni paga un impuesto.",
    "Afecta especialmente a sociedades que operan con socios, administradores, familiares, entidades del grupo u otras personas vinculadas. Que una operación no supere los límites de declaración no elimina la obligación de valorarla a mercado y documentarla cuando corresponda.",
    "Los límites y reglas deben aplicarse por bloques, tipo de operación, método de valoración y persona vinculada; no existe un único umbral que resuelva todos los casos.",
  ],
  notices: [
    {
      title: "Declarar, valorar y documentar son obligaciones distintas",
      paragraphs: [
        "Una operación puede no incluirse en el Modelo 232 y aun así tener que valorarse a mercado y conservar documentación suficiente.",
      ],
    },
    {
      title: "No compenses ingresos y pagos",
      paragraphs: [
        "Las operaciones del mismo tipo se informan según las instrucciones, sin netear prestaciones de signo distinto para evitar los límites.",
      ],
    },
    {
      title: "No incluye IVA en el importe",
      paragraphs: [
        "Los importes se consignan sin IVA y deben separarse cuando se aplican métodos de valoración diferentes.",
      ],
    },
  ],
  actions: [
    {
      label: "Abrir el procedimiento oficial del Modelo 232",
      sourceId: "aeat.model-232.procedure-home.2026-07-08",
      primary: true,
    },
    {
      label: "Consultar las instrucciones oficiales",
      sourceId: "aeat.model-232.instructions-pdf.2025-10-31",
      primary: true,
    },
    {
      label: "Ver la ayuda técnica del formulario",
      sourceId: "aeat.model-232.technical-help.2026-04-22",
    },
    {
      label: "Ver el Modelo 200 relacionado",
      internalHref: "/consultor-fiscal/modelos/200",
    },
  ],
  quickSummaryTitle: "El Modelo 232 en pocas palabras",
  quickFacts: [
    { label: "Qué es", value: "Una declaración informativa, sin ingreso." },
    {
      label: "Quién puede presentarlo",
      value:
        "Sociedades y otros contribuyentes incluidos que realizan operaciones declarables.",
    },
    {
      label: "Umbral por vinculado",
      value:
        "Más de 250.000 € en operaciones no específicas con una misma persona o entidad.",
    },
    {
      label: "Operaciones específicas",
      value: "Más de 100.000 € del mismo tipo, con reglas propias.",
    },
    {
      label: "Regla del 50 %",
      value:
        "Mismo tipo y método de valoración que supere el 50 % de la cifra de negocios.",
    },
    { label: "Importes", value: "Sin IVA; cobros y pagos no se compensan." },
    {
      label: "Plazo",
      value: "Mes siguiente a los diez meses posteriores al cierre.",
    },
    { label: "Presentación", value: "Exclusivamente electrónica." },
  ],
  sections: [
    {
      id: "model-232-person-company",
      title: "Autónomo persona física y sociedad limitada",
      cards: [
        {
          title: "Autónomo persona física",
          bullets: [
            "Declara su actividad normalmente en IRPF.",
            "No presenta el 232 solo por ser autónomo.",
            "Puede quedar relacionado con una sociedad en la que participa.",
          ],
        },
        {
          title: "Sociedad limitada",
          bullets: [
            "Es un contribuyente separado de sus socios.",
            "Presenta el Modelo 200.",
            "Puede efectuar pagos con el 202.",
            "Puede informar operaciones vinculadas con el 232.",
          ],
        },
        {
          title: "Socio o administrador",
          paragraphs: [
            "Los servicios, alquileres, préstamos, ventas o cesiones entre él y la sociedad deben analizarse como operaciones entre partes diferenciadas.",
          ],
        },
      ],
    },
    {
      id: "model-232-related-parties",
      title: "Quiénes pueden ser personas o entidades vinculadas",
      cards: [
        {
          title: "Socio y sociedad",
          paragraphs: [
            "Existe vinculación, entre otros supuestos, cuando la participación del socio alcanza al menos el 25 %.",
          ],
        },
        {
          title: "Administradores y familiares",
          paragraphs: [
            "La ley incluye determinados vínculos con administradores y familiares. La retribución por el ejercicio de las funciones propias de administrador tiene una precisión legal específica que debe revisarse.",
          ],
        },
        {
          title: "Empresas relacionadas",
          paragraphs: [
            "También pueden existir vínculos dentro de un grupo, entre entidades participadas y mediante relaciones familiares o de control previstas por la ley.",
          ],
        },
      ],
      note: "No determines la vinculación solo por el nombre comercial o por compartir un proveedor; aplica la definición legal.",
    },
    {
      id: "model-232-examples",
      title: "Operaciones que requieren especial atención",
      cards: [
        {
          title: "Servicios y retribuciones",
          bullets: [
            "Servicios profesionales del socio a la sociedad.",
            "Servicios de la sociedad al socio.",
            "Retribuciones y funciones que deben distinguirse correctamente.",
          ],
        },
        {
          title: "Bienes y financiación",
          bullets: [
            "Alquiler de inmuebles.",
            "Préstamos, anticipos y cuentas corrientes con socios.",
            "Venta de bienes, negocios o participaciones.",
          ],
        },
        {
          title: "Intangibles y gastos personales",
          bullets: [
            "Cesión de marcas, software u otros intangibles.",
            "Pagos de gastos particulares por la sociedad.",
            "Uso privado de activos sociales.",
          ],
        },
      ],
    },
    {
      id: "model-232-market-value",
      title: "Qué significa valorar a mercado",
      cards: [
        {
          title: "Principio",
          paragraphs: [
            "La contraprestación debe corresponder a la que habrían acordado partes independientes en condiciones comparables.",
          ],
        },
        {
          title: "Métodos previstos",
          bullets: [
            "Precio libre comparable.",
            "Coste incrementado.",
            "Precio de reventa.",
            "Distribución del resultado.",
            "Margen neto operacional.",
          ],
        },
        {
          title: "Evidencia",
          paragraphs: [
            "Contratos, facturas, comparables, cálculos, funciones, riesgos y activos deben sostener el método elegido. No basta con escribir “precio de mercado”.",
          ],
        },
      ],
    },
    {
      id: "model-232-thresholds",
      title: "Cuándo puede existir obligación de declarar",
      cards: [
        {
          title: "Más de 250.000 € con el mismo vinculado",
          paragraphs: [
            "Se aplica a operaciones no específicas realizadas con una misma persona o entidad durante el periodo.",
          ],
        },
        {
          title: "Más de 100.000 € en operaciones específicas",
          paragraphs: [
            "Se comprueba para operaciones específicas del mismo tipo. Las instrucciones identifican, entre otras, determinados inmuebles, intangibles, negocios y valores.",
          ],
        },
        {
          title: "Más del 50 % de la cifra de negocios",
          paragraphs: [
            "Existe obligación cuando el conjunto de operaciones del mismo tipo y método de valoración supera el 50 % de la cifra de negocios, con independencia del importe por vinculado.",
          ],
        },
        {
          title: "Otros bloques",
          paragraphs: [
            "Determinadas rentas de activos intangibles y operaciones o situaciones con jurisdicciones no cooperativas tienen reglas propias y no deben descartarse aplicando solo los umbrales anteriores.",
          ],
        },
      ],
      note: "Los umbrales no son franquicias para fijar precios distintos del mercado.",
    },
    {
      id: "model-232-documentation",
      title: "Documentación de operaciones vinculadas",
      cards: [
        {
          title: "Tres deberes separados",
          bullets: [
            "Valorar a mercado.",
            "Conservar documentación cuando corresponda.",
            "Presentar el Modelo 232 cuando se cumplan sus reglas.",
          ],
        },
        {
          title: "Documentación simplificada",
          paragraphs: [
            "Las entidades con cifra de negocios inferior a 45 millones de euros pueden aplicar documentación simplificada en determinados casos, salvo operaciones específicas y otras excepciones. No es una exención general de documentar.",
          ],
        },
        {
          title: "Conservación",
          bullets: [
            "Contrato y facturas.",
            "Identificación de las partes y vínculo.",
            "Método de valoración y comparables.",
            "Cálculos, fechas e importes.",
            "Coherencia con contabilidad y Modelo 200.",
          ],
        },
      ],
    },
    {
      id: "model-232-exclusions",
      title: "Exclusiones y cautelas",
      accordions: [
        {
          question: "¿Todas las operaciones vinculadas van en el 232?",
          paragraphs: [
            "No. Las instrucciones contemplan límites y exclusiones, pero la operación debe seguir valorándose correctamente y puede requerir documentación.",
          ],
        },
        {
          question: "¿Puedo sumar cobros y pagos?",
          paragraphs: [
            "No deben compensarse para reducir el importe informado. También deben separarse operaciones con métodos de valoración distintos.",
          ],
        },
        {
          question: "¿Se incluye el IVA?",
          paragraphs: [
            "Los importes se consignan sin IVA según las instrucciones del modelo.",
          ],
        },
      ],
    },
    {
      id: "model-232-deadline-correction",
      title: "Plazo, presentación y corrección",
      cards: [
        {
          title: "Plazo ligado al cierre",
          paragraphs: [
            "Se presenta en el mes siguiente a los diez meses posteriores al cierre. Para un ejercicio terminado el 31 de diciembre, normalmente corresponde noviembre del año siguiente.",
          ],
        },
        {
          title: "Presentación electrónica",
          paragraphs: [
            "Se cumplimenta en el formulario web o se importa un fichero ajustado al diseño oficial. La vista previa no es válida para presentar.",
          ],
        },
        {
          title: "Complementaria o sustitutiva",
          paragraphs: [
            "La complementaria se utiliza para añadir registros omitidos. La sustitutiva reemplaza la declaración anterior cuando deben añadirse, modificarse o eliminarse registros, conforme a las instrucciones vigentes.",
          ],
        },
      ],
    },
    {
      id: "model-232-related",
      title: "Relación con otros modelos",
      cards: [
        {
          title: "Modelo 200",
          paragraphs: [
            "La contabilidad y los ajustes del Impuesto sobre Sociedades deben ser coherentes con las operaciones vinculadas informadas.",
          ],
          links: [
            { label: "Ver Modelo 200", href: "/consultor-fiscal/modelos/200" },
          ],
        },
        {
          title: "Modelo 202",
          paragraphs: ["Es un pago a cuenta y cumple una función distinta."],
          links: [
            { label: "Ver Modelo 202", href: "/consultor-fiscal/modelos/202" },
          ],
        },
        {
          title: "Otros modelos",
          paragraphs: [
            "Una operación puede afectar también a IVA, retenciones o declaraciones de terceros. Presentar el 232 no sustituye el 111, 115, 190, 303, 347 u otros que correspondan.",
          ],
          links: [
            { label: "Ver Modelo 111", href: "/consultor-fiscal/modelos/111" },
            { label: "Ver Modelo 303", href: "/consultor-fiscal/modelos/303" },
            { label: "Ver Modelo 347", href: "/consultor-fiscal/modelos/347" },
          ],
        },
      ],
    },
    {
      id: "model-232-territory",
      title: "Ámbito territorial",
      note: "Esta guía se refiere principalmente al Impuesto sobre Sociedades estatal. Las entidades sometidas a normativa del País Vasco o Navarra deben comprobar las reglas y modelos de la Hacienda foral competente. Determinadas entidades pueden tributar conjuntamente al Estado y a una Hacienda foral; los formularios estatales pueden solicitar el porcentaje correspondiente al territorio común.",
    },
  ],
  fillingTitle: "Cómo preparar y presentar el Modelo 232",
  fillingSteps: [
    {
      title: "1. Identifica vinculados",
      paragraphs: [
        "Revisa socios, porcentajes, administradores, familiares, grupo y otras relaciones legales.",
      ],
    },
    {
      title: "2. Extrae todas las operaciones",
      paragraphs: [
        "Cruza contabilidad, bancos, contratos, facturas, nóminas, préstamos, alquileres y activos.",
      ],
    },
    {
      title: "3. Clasifica y valora",
      paragraphs: [
        "Separa por vinculado, tipo, ingreso o pago y método; documenta el valor de mercado.",
      ],
    },
    {
      title: "4. Aplica cada umbral",
      paragraphs: [
        "Comprueba 250.000 €, 100.000 €, regla del 50 % y bloques especiales sin mezclar sus criterios.",
      ],
    },
    {
      title: "5. Concilia con el Modelo 200",
      paragraphs: [
        "Verifica que importes y ajustes sean coherentes con contabilidad y declaración anual.",
      ],
    },
    {
      title: "6. Valida y presenta",
      paragraphs: [
        "Revisa NIF, claves, método, importes sin IVA y signos; firma y conserva justificante y CSV.",
      ],
    },
  ],
  afterTitle: "Qué ocurre después",
  afterSteps: [
    {
      title: "Contraste",
      description:
        "La AEAT puede comparar la información con el Modelo 200, contabilidad y declaraciones de las partes.",
    },
    {
      title: "Documentación",
      description:
        "Conserva el expediente de valoración; el justificante del 232 no lo sustituye.",
    },
    {
      title: "Corrección",
      description:
        "Usa complementaria o sustitutiva según debas solo añadir o también modificar/eliminar registros.",
    },
  ],
  comparison: {
    title: "Modelos 232, 200 y 202",
    current: {
      title: "Modelo 232",
      description:
        "Informa determinadas operaciones vinculadas y situaciones internacionales; no genera pago.",
    },
    related: {
      title: "Modelo 200",
      description: "Liquida anualmente el Impuesto sobre Sociedades.",
      href: "/consultor-fiscal/modelos/200",
      label: "Ver Modelo 200",
    },
    additional: [
      {
        title: "Modelo 202",
        description: "Anticipa pagos del impuesto durante el ejercicio.",
        href: "/consultor-fiscal/modelos/202",
        label: "Ver Modelo 202",
      },
    ],
    conclusion:
      "La coherencia entre los tres modelos y la contabilidad es esencial, pero cada uno tiene finalidad y reglas propias.",
  },
  pdfNotice: [
    "El PDF de vista previa no es válido para presentar. El PDF oficial disponible contiene instrucciones, no un impreso en blanco.",
  ],
  documents: [
    {
      label: "Instrucciones oficiales de cumplimentación del Modelo 232",
      sourceId: "aeat.model-232.instructions-pdf.2025-10-31",
    },
  ],
  officialLinks: [
    {
      label: "Ficha administrativa del procedimiento",
      sourceId: "aeat.model-232.procedure-record.2026-07-08",
    },
    {
      label: "Ayuda técnica del formulario",
      sourceId: "aeat.model-232.technical-help.2026-04-22",
    },
    {
      label: "Diseños de registro 200 a 299",
      sourceId: "aeat.models-200-299.register-designs.2026-06-19",
    },
  ],
  legalLinks: [
    {
      label: "Orden HFP/816/2017",
      sourceId: "boe.model-232.order-hfp-816-2017",
    },
    {
      label: "Ley 27/2014 del Impuesto sobre Sociedades",
      href: "https://www.boe.es/buscar/act.php?id=BOE-A-2014-12328",
    },
  ],
  faq: [
    {
      question: "¿El Modelo 232 sirve para pagar un impuesto?",
      answer: "No. Es una declaración informativa.",
    },
    {
      question: "¿Toda operación entre socio y sociedad se declara?",
      answer:
        "No necesariamente; deben aplicarse límites, exclusiones y bloques especiales. Siempre debe revisarse su valoración a mercado.",
    },
    {
      question: "¿Cuándo existe vinculación entre socio y sociedad?",
      answer:
        "Entre otros supuestos, cuando la participación alcanza al menos el 25 %. La ley incluye más relaciones.",
    },
    {
      question: "¿Cuál es el umbral de 250.000 €?",
      answer:
        "Más de 250.000 € en operaciones no específicas con una misma persona o entidad vinculada durante el periodo.",
    },
    {
      question: "¿Cuál es el umbral de 100.000 €?",
      answer: "Más de 100.000 € para operaciones específicas del mismo tipo.",
    },
    {
      question: "¿Qué es la regla del 50 %?",
      answer:
        "Obliga a informar cuando operaciones del mismo tipo y método superan el 50 % de la cifra de negocios.",
    },
    {
      question: "¿Los límites eliminan la obligación de valorar a mercado?",
      answer: "No.",
    },
    {
      question: "¿Debo incluir IVA en los importes?",
      answer: "No, según las instrucciones del modelo.",
    },
    {
      question: "¿Puedo compensar ingresos y pagos?",
      answer: "No deben netearse para calcular o declarar los importes.",
    },
    {
      question: "¿Qué documentación debo conservar?",
      answer:
        "Contratos, facturas, vínculo, método, comparables, cálculos y coherencia contable, según las obligaciones aplicables.",
    },
    {
      question: "¿Cuándo se presenta?",
      answer:
        "En el mes siguiente a los diez meses posteriores al cierre; noviembre si el ejercicio termina el 31 de diciembre.",
    },
    {
      question: "¿Se presenta por internet?",
      answer: "Sí, exclusivamente en formato electrónico.",
    },
    {
      question: "¿Qué diferencia hay entre complementaria y sustitutiva?",
      answer:
        "La complementaria añade registros omitidos; la sustitutiva reemplaza la anterior cuando se añaden, modifican o eliminan registros.",
    },
    {
      question: "¿Presentar el 232 sustituye al 200?",
      answer:
        "No. El 200 liquida el impuesto y el 232 informa determinadas operaciones.",
    },
  ],
  sourceIds: [
    "aeat.models.index.2026-07-08",
    "aeat.model-232.procedure-home.2026-07-08",
    "aeat.model-232.procedure-record.2026-07-08",
    "aeat.model-232.technical-help.2026-04-22",
    "aeat.model-232.instructions-pdf.2025-10-31",
    "aeat.models-200-299.register-designs.2026-06-19",
    "boe.model-232.order-hfp-816-2017",
  ],
} as const satisfies FiscalModelPracticalGuideV1;
