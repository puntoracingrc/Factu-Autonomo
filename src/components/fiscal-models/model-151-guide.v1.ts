import type { FiscalModelPracticalGuideV1 } from "./fiscal-model-practical-guide.types";

const TERRITORIAL_NOTE =
  "Esta guía describe la AEAT estatal y el territorio común. En País Vasco o Navarra deben comprobarse la competencia y las reglas forales.";

export const MODEL_151_GUIDE_V1 = {
  code: "151",
  effectiveYear: 2026,
  taxPeriodYear: 2025,
  filingYear: 2026,
  lastVerifiedAt: "2026-07-15",
  requiresAnnualReview: true,
  externalActionNotice:
    "Los enlaces abren recursos oficiales. Esta ficha no calcula la cuota, no almacena datos personales y no presenta, firma ni paga la declaración.",
  intro: [
    "El Modelo 151 es la declaración anual del IRPF para quienes aplican válidamente el régimen especial de trabajadores, profesionales, emprendedores e inversores desplazados a España.",
    "No basta con haber presentado el Modelo 149: cada ejercicio deben revisarse la vigencia de la opción, las rentas, la residencia y las condiciones del régimen. La nacionalidad o el permiso de residencia no sustituyen ese análisis fiscal.",
  ],
  notices: [
    {
      title: "Sustituye al Modelo 100 solo dentro del régimen",
      paragraphs: [
        "Quien aplica válidamente el régimen presenta el Modelo 151 en lugar de la declaración ordinaria del IRPF. Si no resulta aplicable, debe revisarse el Modelo 100.",
      ],
    },
    {
      title: "Ejercicio y campaña importan",
      paragraphs: [
        "Tipos, escala del ahorro, formulario y plazo pueden cambiar cada campaña. Las referencias de esta guía corresponden al ejercicio 2025 presentado en 2026 y deben volver a verificarse cada año.",
      ],
    },
    { title: "Ámbito territorial", paragraphs: [TERRITORIAL_NOTE] },
  ],
  actions: [
    {
      label: "Abrir las gestiones oficiales del Modelo 151",
      sourceId: "aeat.model-151.procedure-home.2026-06-09",
      primary: true,
    },
    {
      label: "Consultar las instrucciones vigentes",
      sourceId: "aeat.model-151.instructions-current.2026-06-12",
      primary: true,
    },
    {
      label: "Ver la comunicación previa Modelo 149",
      internalHref: "/consultor-fiscal/modelos/149",
    },
    {
      label: "Consultar la ayuda del formulario",
      sourceId: "aeat.model-151.help.2026-06-19",
    },
  ],
  quickSummaryTitle: "El Modelo 151 en pocas palabras",
  quickFacts: [
    {
      label: "Qué es",
      value:
        "La declaración anual de renta del régimen especial de personas desplazadas.",
    },
    {
      label: "Quién lo usa",
      value:
        "Quien ha optado válidamente mediante el Modelo 149 y mantiene los requisitos.",
    },
    {
      label: "En lugar de",
      value:
        "Modelo 100, únicamente durante los ejercicios en que el régimen especial resulte aplicable.",
    },
    {
      label: "Base general",
      value:
        "24 % hasta 600.000 € y 47 % sobre el exceso, conforme a las instrucciones del ejercicio 2025.",
    },
    {
      label: "Ahorro 2025",
      value: "Escala del 19 %, 21 %, 23 %, 27 % y 30 % por tramos.",
    },
    {
      label: "Presentación",
      value: "Electrónica durante la campaña oficial del ejercicio.",
    },
  ],
  sections: [
    {
      id: "model-151-scope",
      title: "Quién presenta y qué relación tiene con el 149",
      cards: [
        {
          title: "Opción previa",
          paragraphs: [
            "El acceso se comunica mediante el Modelo 149. El 151 no convalida una opción fuera de plazo ni sustituye la documentación acreditativa.",
          ],
        },
        {
          title: "Revisión anual",
          paragraphs: [
            "Antes de declarar se comprueba que no se ha renunciado, que no existe exclusión y que el ejercicio se encuentra dentro de la duración del régimen.",
          ],
        },
        {
          title: "Declaraciones individuales",
          paragraphs: [
            "La persona principal y cada familiar asociado declaran individualmente si cumplen sus propios requisitos.",
          ],
        },
      ],
    },
    {
      id: "model-151-income",
      title: "Rentas que deben organizarse",
      cards: [
        {
          title: "Rendimientos del trabajo",
          paragraphs: [
            "Las instrucciones tratan las rentas del trabajo obtenidas durante la aplicación del régimen y las especialidades de imputación correspondientes.",
          ],
        },
        {
          title: "Actividad económica admitida",
          paragraphs: [
            "Determinadas actividades emprendedoras o profesionales pueden formar parte del régimen. La actividad debe encajar en el supuesto que justificó el desplazamiento.",
          ],
        },
        {
          title: "Rentas en España",
          paragraphs: [
            "También deben clasificarse inmuebles, intereses, dividendos, ganancias y otras rentas obtenidas en territorio español conforme a las reglas del régimen.",
          ],
        },
        {
          title: "Rentas y activos extranjeros",
          paragraphs: [
            "No deben incluirse o excluirse por intuición. Debe revisarse la regla específica, el convenio, la doble imposición y las obligaciones patrimoniales o informativas separadas.",
          ],
        },
      ],
      note: "El Modelo 151 no decide por sí solo dónde es residente una persona ni dónde se obtiene cada renta.",
    },
    {
      id: "model-151-rates",
      title: "Tipos del ejercicio 2025",
      cards: [
        {
          title: "Base liquidable general",
          bullets: [
            "Hasta 600.000 €: 24 %.",
            "Desde 600.000,01 €: 47 % sobre el exceso.",
          ],
        },
        {
          title: "Base del ahorro",
          bullets: [
            "Hasta 6.000 €: 19 %.",
            "De 6.000,01 a 50.000 €: 21 %.",
            "De 50.000,01 a 200.000 €: 23 %.",
            "De 200.000,01 a 300.000 €: 27 %.",
            "Desde 300.000,01 €: 30 %.",
          ],
        },
      ],
      note: "Son referencias oficiales del ejercicio 2025. No las reutilices en otra campaña sin comprobar las instrucciones de ese ejercicio.",
    },
    {
      id: "model-151-activity",
      title: "Actividad profesional o emprendedora",
      cards: [
        {
          title: "Ingresos",
          paragraphs: [
            "Se registran los ingresos de la actividad incluida y se separan de rentas ajenas al supuesto que permitió aplicar el régimen.",
          ],
        },
        {
          title: "Gastos limitados",
          paragraphs: [
            "Las instrucciones limitan los gastos deducibles de la actividad a conceptos como personal, materiales incorporados y suministros, en los términos previstos. No se trasladan automáticamente todos los gastos de la estimación directa ordinaria.",
          ],
        },
        {
          title: "Resultado negativo",
          paragraphs: [
            "El rendimiento neto negativo de estas actividades no se compensa con otros rendimientos positivos ni se arrastra como si se tratara del régimen ordinario.",
          ],
        },
        {
          title: "Retenciones",
          paragraphs: [
            "Deben conciliarse certificados y pagos a cuenta. La mera existencia de retención no determina la residencia ni la inclusión de una renta.",
          ],
        },
      ],
    },
    {
      id: "model-151-deductions",
      title: "Doble imposición y deducciones",
      cards: [
        {
          title: "Impuesto satisfecho en el extranjero",
          paragraphs: [
            "Puede existir deducción por doble imposición internacional para rentas del trabajo o de actividades incluidas, con los requisitos y pruebas previstos.",
          ],
        },
        {
          title: "Límite específico",
          paragraphs: [
            "La deducción no puede superar el 30 % de la parte de cuota íntegra correspondiente al conjunto de esos rendimientos, además del resto de límites aplicables.",
          ],
        },
        {
          title: "Documentación",
          bullets: [
            "Certificado fiscal del otro país.",
            "Justificante del impuesto efectivamente satisfecho.",
            "Naturaleza, fecha y titular de la renta.",
            "Conversión de moneda y cálculo del límite.",
          ],
        },
      ],
    },
    {
      id: "model-151-property",
      title: "Inmuebles, Patrimonio y otras declaraciones",
      cards: [
        {
          title: "Inmuebles en España",
          paragraphs: [
            "Los alquileres, imputaciones o transmisiones deben clasificarse en el régimen que corresponda. Una venta durante el régimen puede relacionarse con las reglas del Modelo 211 y la declaración anual.",
          ],
        },
        {
          title: "Impuesto sobre el Patrimonio",
          paragraphs: [
            "El régimen especial no elimina la obligación real por el Impuesto sobre el Patrimonio cuando se cumplen sus condiciones. Debe revisarse el Modelo 714 y la normativa autonómica aplicable.",
          ],
          links: [
            { label: "Ver Modelo 714", href: "/consultor-fiscal/modelos/714" },
          ],
        },
        {
          title: "Información sobre activos",
          paragraphs: [
            "Las obligaciones informativas sobre activos en el extranjero no deben presumirse ni descartarse por estar acogido al régimen; se revisan separadamente.",
          ],
        },
      ],
    },
    {
      id: "model-151-deadline",
      title: "Campaña, pago y corrección",
      accordions: [
        {
          question: "¿Cuándo se presenta?",
          paragraphs: [
            "Dentro del plazo que apruebe la AEAT para la campaña del ejercicio. Debe consultarse cada año; no se mantiene una fecha fija en esta guía.",
          ],
        },
        {
          question: "¿Cómo se paga?",
          paragraphs: [
            "Mediante las modalidades habilitadas en el formulario oficial. La domiciliación suele tener un cierre anterior al plazo general.",
          ],
        },
        {
          question: "¿Puede resultar a devolver?",
          paragraphs: [
            "Sí, si los pagos a cuenta y retenciones superan la cuota resultante. La devolución se solicita en la propia declaración con una cuenta y titularidad válidas, sin que el envío garantice su abono automático.",
          ],
        },
        {
          question: "¿Cómo se corrige?",
          paragraphs: [
            "Se utiliza la declaración complementaria o el procedimiento de rectificación que corresponda al sentido del error, conservando la trazabilidad de la declaración original.",
          ],
        },
      ],
    },
  ],
  fillingTitle: "Cómo preparar el Modelo 151",
  fillingSteps: [
    {
      title: "1. Confirma la vigencia del régimen",
      paragraphs: [
        "Revisa el 149, la fecha de desplazamiento, la duración y cualquier causa de renuncia o exclusión.",
      ],
    },
    {
      title: "2. Clasifica todas las rentas",
      paragraphs: [
        "Separa trabajo, actividad, inmuebles, ahorro, ganancias y rentas extranjeras con su país y fecha.",
      ],
    },
    {
      title: "3. Reúne retenciones e impuestos extranjeros",
      paragraphs: [
        "Concilia certificados, pagos y pruebas de doble imposición.",
      ],
    },
    {
      title: "4. Revisa obligaciones relacionadas",
      paragraphs: [
        "Comprueba Patrimonio, inmuebles y modelos informativos sin suponer que el 151 los sustituye.",
      ],
    },
    {
      title: "5. Valida en la campaña oficial",
      paragraphs: [
        "Utiliza el formulario del ejercicio, revisa el resultado y conserva justificante, pago y CSV.",
      ],
    },
  ],
  afterTitle: "Qué ocurre después",
  afterSteps: [
    {
      title: "Justificante",
      description:
        "Conserva la declaración y la respuesta oficial, no solo el PDF de trabajo.",
    },
    {
      title: "Documentación",
      description:
        "Mantén certificados de residencia, rentas, retenciones e impuestos extranjeros vinculados al ejercicio.",
    },
    {
      title: "Siguiente ejercicio",
      description:
        "Comprueba de nuevo la vigencia del régimen antes de reutilizar datos o tipos.",
    },
  ],
  comparison: {
    title: "Modelo 151, Modelo 149 y Renta ordinaria",
    current: {
      title: "Modelo 151",
      description: "Declaración anual de quien aplica el régimen especial.",
    },
    related: {
      title: "Modelo 149",
      description:
        "Comunicación de opción, renuncia, exclusión o fin del régimen.",
      href: "/consultor-fiscal/modelos/149",
      label: "Ver Modelo 149",
    },
    additional: [
      {
        title: "Modelo 100",
        description:
          "Declaración ordinaria del IRPF cuando no resulta aplicable el régimen especial.",
        href: "/consultor-fiscal/modelos/100",
        label: "Ver Modelo 100",
      },
      {
        title: "Modelo 150",
        description:
          "Modelo histórico de ejercicios anteriores del régimen, no aplicable a la campaña actual.",
        href: "/consultor-fiscal/modelos/150",
        label: "Ver Modelo 150",
      },
      {
        title: "Modelo 210",
        description:
          "Declaración de determinadas rentas de no residentes sin establecimiento permanente.",
        href: "/consultor-fiscal/modelos/210",
        label: "Ver Modelo 210",
      },
      {
        title: "Modelo 211",
        description:
          "Retención soportada cuando una persona no residente transmite un inmueble; puede ser relevante en el ejercicio del 151.",
        href: "/consultor-fiscal/modelos/211",
        label: "Ver Modelo 211",
      },
    ],
    conclusion:
      "El 149 abre o comunica cambios del régimen; el 151 declara el ejercicio; el 100 corresponde al IRPF ordinario.",
  },
  pdfNotice: [
    "La declaración se confecciona en el servicio electrónico de la campaña. No se ofrece como un impreso estático universal que sustituya al formulario del ejercicio.",
  ],
  documents: [],
  officialLinks: [
    {
      label: "Ficha administrativa del procedimiento",
      sourceId: "aeat.model-151.procedure-record.2026-06-09",
    },
    {
      label: "Instrucciones del ejercicio 2023 y siguientes",
      sourceId: "aeat.model-151.instructions-current.2026-06-12",
    },
    {
      label: "Ayuda técnica del formulario",
      sourceId: "aeat.model-151.help.2026-06-19",
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
      question: "¿Quién presenta el Modelo 151?",
      answer:
        "Quien aplica válidamente el régimen especial de personas desplazadas durante ese ejercicio.",
    },
    {
      question: "¿También tengo que presentar el Modelo 100?",
      answer:
        "No por las mismas rentas y ejercicio si el régimen especial resulta aplicable; el 151 sustituye a la declaración ordinaria.",
    },
    {
      question: "¿Haber presentado el 149 garantiza poder usar el 151?",
      answer:
        "No. Deben mantenerse los requisitos y no existir renuncia, exclusión ni finalización aplicable.",
    },
    {
      question: "¿Qué tipo se aplica a la base general?",
      answer:
        "Para el ejercicio 2025, 24 % hasta 600.000 € y 47 % sobre el exceso.",
    },
    {
      question: "¿Cuál es la escala del ahorro en 2025?",
      answer:
        "19 %, 21 %, 23 %, 27 % y 30 % por tramos, conforme a las instrucciones oficiales.",
    },
    {
      question: "¿Puedo deducir cualquier gasto profesional?",
      answer:
        "No. Las actividades incluidas tienen una relación limitada de gastos deducibles que debe revisarse en las instrucciones.",
    },
    {
      question: "¿Se compensa una pérdida de la actividad?",
      answer:
        "No se compensa con otros rendimientos positivos ni se arrastra como en el régimen ordinario.",
    },
    {
      question: "¿Puedo deducir impuestos pagados fuera de España?",
      answer:
        "Puede existir deducción con prueba suficiente y límites, incluido el límite específico del 30 % indicado en las instrucciones.",
    },
    {
      question: "¿El régimen evita el Impuesto sobre el Patrimonio?",
      answer:
        "No. Puede existir obligación real y debe revisarse el Modelo 714 y la norma autonómica aplicable.",
    },
    {
      question: "¿Cuándo se presenta?",
      answer:
        "Durante la campaña que la AEAT apruebe para el ejercicio; el plazo debe comprobarse cada año.",
    },
    {
      question: "¿Nacionalidad y residencia fiscal son lo mismo?",
      answer:
        "No. La residencia fiscal depende de los criterios legales y, en su caso, del convenio aplicable.",
    },
    {
      question: "¿Cómo corrijo una declaración?",
      answer:
        "Mediante complementaria o rectificación según el sentido del error, utilizando el trámite oficial del ejercicio.",
    },
  ],
  sourceIds: [
    "aeat.model-151.procedure-home.2026-06-09",
    "aeat.model-151.procedure-record.2026-06-09",
    "aeat.model-151.instructions-current.2026-06-12",
    "aeat.model-151.help.2026-06-19",
    "boe.order-hfp-1338-2023",
  ],
} as const satisfies FiscalModelPracticalGuideV1;
