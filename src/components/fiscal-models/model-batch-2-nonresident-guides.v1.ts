import { createBatch2PracticalGuideV1 } from "./create-batch-2-practical-guide.v1";

export const MODEL_226_GUIDE_V1 = createBatch2PracticalGuideV1({
  code: "226",
  category: "IRNR · Régimen opcional UE/EEE",
  statusLabel: "Solicitud · No confiere residencia",
  statusTone: "current",
  effectiveYear: 2026,
  intro: [
    "El Modelo 226 permite a determinadas personas físicas residentes en otro Estado de la UE o del EEE admitido solicitar que se compare su tributación como no residentes con la que habría resultado aplicando las reglas del IRPF.",
    "La solicitud no convierte a la persona en residente fiscal y la eventual devolución depende de que se cumplan los requisitos y del cálculo de la AEAT.",
  ],
  notices: [
    {
      title: "No es un cambio de residencia fiscal",
      paragraphs: [
        "Exige persona física, residencia admitida, intercambio efectivo de información y una de las vías económicas previstas. La devolución no está garantizada.",
      ],
    },
  ],
  type: "Solicitud dentro del Impuesto sobre la Renta de no Residentes.",
  presenter:
    "Persona física residente en un Estado UE/EEE admitido que cumple la vía del 75 % de rentas españolas gravadas o la vía vinculada al mínimo personal y familiar.",
  nonPresenter:
    "Una sociedad, una persona de un Estado no admitido o cualquier no residente por obtener una renta aislada en España.",
  periodicity:
    "Solicitud por ejercicio; puede ser individual o familiar conjunta cuando se cumplan los requisitos.",
  deadline:
    "Plazo general de cuatro años, contado desde la fecha inicial aplicable a la solicitud; debe verificarse el caso concreto.",
  channel:
    "Presentación electrónica o predeclaración con la documentación exigida; la descarga no sustituye el registro.",
  result:
    "Comparación con un cálculo hipotético de IRPF y posible devolución del exceso, nunca cambio de residencia fiscal.",
  included: [
    "Rentas mundiales y españolas del solicitante y, si procede, de la unidad familiar.",
    "IRNR efectivamente satisfecho y retenciones.",
    "Vías de acceso del 75 % o del mínimo personal y familiar.",
    "Solicitud familiar, apoderamiento y cuenta para la devolución.",
  ],
  excluded: [
    "Adquirir residencia fiscal española.",
    "Aplicación automática a cualquier no residente.",
    "Solicitud por una persona jurídica.",
    "Promesa de devolución o de resolución favorable.",
  ],
  preparation: [
    "Certificado de residencia fiscal y traducciones cuando procedan.",
    "Relación acreditada de rentas mundiales y españolas.",
    "Modelos 210 u otras declaraciones y retenciones soportadas.",
    "Documentación familiar y apoderamiento si la solicitud es conjunta.",
  ],
  correction:
    "Aporta o subsana la documentación por el expediente oficial; frente a denegación o cálculo incorrecto utiliza los recursos o la rectificación procedentes.",
  procedureSourceId: "aeat.model-226.procedure-home.2026-07-02",
  recordSourceId: "aeat.model-226.procedure-record.2026-06-09",
  helpSourceId: "aeat.model-226.electronic-help.2026-01-09",
  document: {
    label: "Consultar instrucciones oficiales del Modelo 226",
    sourceId: "aeat.model-226.instructions-pdf.captured-2026-07-13",
  },
  legalSourceIds: [
    "boe.irpf-irnr-law-26-2014",
    "boe.models-226-228.order-hap-2474-2015",
  ],
  related: [
    {
      code: "210",
      href: "/consultor-fiscal/modelos/210",
      description:
        "Declaración de rentas obtenidas en España por no residentes.",
    },
    {
      code: "100",
      href: "/consultor-fiscal/modelos/100",
      description:
        "IRPF usado solo como cálculo comparativo en este régimen opcional.",
    },
    {
      code: "216",
      href: "/consultor-fiscal/modelos/216",
      description: "Retenciones por pagos a no residentes.",
    },
  ],
  specificFaq: [
    {
      question: "¿Me convierte en residente fiscal?",
      answer:
        "No. El solicitante continúa siendo no residente; solo se compara el resultado con reglas equivalentes de IRPF.",
    },
    {
      question: "¿Cuánto tarda en resolverse?",
      answer:
        "La AEAT indica un plazo máximo general de seis meses, sin que ello garantice una resolución favorable.",
    },
  ],
});

export const MODEL_228_GUIDE_V1 = createBatch2PracticalGuideV1({
  code: "228",
  category: "IRNR · Reinversión en vivienda habitual",
  statusLabel: "Solicitud · Plazo de tres meses",
  statusTone: "current",
  effectiveYear: 2026,
  intro: [
    "El Modelo 228 permite a determinadas personas no residentes de la UE o del EEE solicitar la devolución vinculada a la reinversión de la ganancia obtenida al vender su vivienda habitual en España.",
    "No sustituye el Modelo 210 ni convierte en automática la devolución de la retención del 3 % del Modelo 211.",
  ],
  notices: [
    {
      title: "Vivienda habitual, Estado admitido y reinversión acreditada",
      paragraphs: [
        "Si la reinversión ya se produjo antes de presentar el 210, la exención puede aplicarse allí. El 228 se utiliza en el supuesto y plazo propios.",
      ],
    },
  ],
  type: "Solicitud de devolución en IRNR.",
  presenter:
    "Persona física no residente en un Estado UE/EEE admitido que transmitió su vivienda habitual española y reinvirtió en una nueva vivienda habitual.",
  nonPresenter:
    "Cualquier no residente, quien vendió un inmueble que no era vivienda habitual o quien no acredita una reinversión admisible.",
  periodicity:
    "Solicitud vinculada a cada transmisión y posterior reinversión.",
  deadline:
    "Tres meses desde la fecha de adquisición de la nueva vivienda habitual.",
  channel:
    "Presentación electrónica o predeclaración con aportación de documentos; guardar el PDF no equivale a presentar.",
  result:
    "Posible devolución de la cuota de IRNR correspondiente a la ganancia exenta por reinversión total o parcial.",
  included: [
    "Venta de la vivienda habitual española y ganancia declarada en el 210.",
    "Retención del 3 % ingresada mediante el 211.",
    "Reinversión total o parcial y nueva vivienda habitual.",
    "Fechas, escrituras, pagos, residencia y cuenta bancaria.",
  ],
  excluded: [
    "Venta de cualquier inmueble o segunda residencia.",
    "Reinversión no acreditada o fuera de los requisitos.",
    "Devolución automática de toda la retención del 3 %.",
    "Sustituir la declaración de la ganancia mediante el 210.",
  ],
  preparation: [
    "Escritura de venta y justificantes del Modelo 210 y 211.",
    "Escritura de adquisición y prueba de los pagos reinvertidos.",
    "Certificado de residencia y prueba de habitualidad.",
    "Cálculo separado de reinversión total o parcial y cuenta bancaria.",
  ],
  correction:
    "Subsanar o aportar documentos en el expediente; para cambiar importes o solicitar una devolución adicional, utiliza el cauce oficial de rectificación aplicable.",
  procedureSourceId: "aeat.model-228.procedure-home.2026-07-02",
  recordSourceId: "aeat.model-228.procedure-record.2026-06-09",
  helpSourceId: "aeat.model-228.electronic-help.2026-01-09",
  document: {
    label: "Consultar instrucciones oficiales del Modelo 228",
    sourceId: "aeat.model-228.instructions-pdf.captured-2026-07-13",
  },
  additionalOfficialLinks: [
    {
      label: "Consultar ejemplos oficiales",
      sourceId: "aeat.model-228.procedures-examples-pdf.captured-2026-07-13",
    },
  ],
  legalSourceIds: [
    "boe.irpf-irnr-law-26-2014",
    "boe.models-226-228.order-hap-2474-2015",
  ],
  related: [
    {
      code: "210",
      href: "/consultor-fiscal/modelos/210",
      description: "Declaración de la ganancia obtenida por el no residente.",
    },
    {
      code: "211",
      href: "/consultor-fiscal/modelos/211",
      description:
        "Retención del 3 % ingresada por quien adquiere el inmueble.",
    },
  ],
  specificFaq: [
    {
      question: "¿Qué ocurre si reinvierto solo una parte?",
      answer:
        "La exención y la devolución se limitan proporcionalmente a la parte reinvertida que cumpla los requisitos.",
    },
    {
      question: "¿El 3 % se devuelve automáticamente?",
      answer:
        "No. La retención del 3 % se regulariza dentro del cálculo del IRNR y la devolución depende de la cuota y de los requisitos acreditados.",
    },
  ],
});

export const MODEL_247_GUIDE_V1 = createBatch2PracticalGuideV1({
  code: "247",
  category: "IRNR · Trabajadores desplazados al extranjero",
  statusLabel: "Solo trabajadores por cuenta ajena",
  statusTone: "current",
  effectiveYear: 2026,
  intro: [
    "El Modelo 247 permite que un trabajador por cuenta ajena que va a desplazarse al extranjero comunique la situación a la AEAT para que su pagador pueda aplicar el sistema de retenciones de no residentes.",
    "No es un cambio censal, no sustituye el Modelo 030 y no convierte automáticamente al trabajador en no residente fiscal.",
  ],
  notices: [
    {
      title: "Salida desde España: no confundir con el Modelo 147",
      paragraphs: [
        "El 247 se refiere al desplazamiento al extranjero; el 147, a la llegada a España. Un autónomo no usa el 247 por trasladar su actividad.",
      ],
    },
  ],
  type: "Comunicación previa para ajustar retenciones del trabajo.",
  presenter:
    "Trabajador por cuenta ajena que prevé desplazarse efectivamente al extranjero y mantiene un pagador residente o con establecimiento permanente en España.",
  nonPresenter:
    "Un autónomo, quien solo cambia de domicilio o quien se desplaza hacia España.",
  periodicity:
    "Comunicación por desplazamiento; no es una declaración periódica.",
  deadline:
    "Debe tramitarse con la antelación y documentación exigidas por la Orden y el formulario vigente; no existe una fecha anual fija.",
  channel:
    "Trámite electrónico o formulario oficial, aportando la documentación del empleador y del desplazamiento.",
  result:
    "Documento acreditativo de la AEAT para entregar al pagador; no determina por sí solo la residencia fiscal definitiva.",
  included: [
    "Fecha prevista de salida, duración y país de destino.",
    "Pagador español y relación laboral.",
    "Documentación del empleador y del desplazamiento.",
    "Documento acreditativo emitido por la AEAT y entrega al pagador.",
  ],
  excluded: [
    "Cambio de domicilio censal del Modelo 030.",
    "Opción por el régimen de desplazados de los Modelos 149/151.",
    "Trabajadores autónomos.",
    "Certificación automática de no residencia fiscal.",
  ],
  preparation: [
    "Certificado o carta del empleador con destino, fecha y duración.",
    "Datos del pagador y del trabajador.",
    "Documentos de desplazamiento y país de destino.",
    "Plan para comunicar cancelación o cambios al pagador y la AEAT.",
  ],
  correction:
    "Si el traslado se cancela, cambia o no produce la no residencia prevista, comunícalo y regulariza las retenciones con el pagador por el cauce oficial.",
  procedureSourceId: "aeat.model-247.procedure-home.2026-07-02",
  recordSourceId: "aeat.model-247.procedure-record.2026-06-09",
  helpSourceId: "aeat.model-247.download.2026-06-09",
  document: {
    label: "Descargar el formulario oficial del Modelo 247",
    sourceId: "aeat.model-247.form-pdf.captured-2026-07-13",
  },
  legalSourceIds: ["boe.models-147-247.order-hac-117-2003"],
  related: [
    {
      code: "147",
      href: "/consultor-fiscal/modelos/147",
      description: "Comunicación de llegada a España para ajustar retenciones.",
    },
    {
      code: "030",
      href: "/consultor-fiscal/modelos/030",
      description: "Cambio de domicilio y datos censales de personas físicas.",
    },
    {
      code: "149",
      href: "/consultor-fiscal/modelos/149",
      description:
        "Opción y comunicaciones del régimen especial de desplazados a España.",
    },
    {
      code: "210",
      href: "/consultor-fiscal/modelos/210",
      description: "Declaración de rentas españolas de no residentes.",
    },
  ],
  specificFaq: [
    {
      question: "¿Puede utilizarlo un autónomo?",
      answer:
        "No. El procedimiento está diseñado para trabajadores por cuenta ajena y su relación con el pagador.",
    },
    {
      question: "¿Cómo debe abrirse el PDF?",
      answer:
        "Descárgalo, guárdalo localmente y ábrelo con un lector compatible; los navegadores pueden no ejecutar correctamente sus funciones.",
    },
  ],
});
