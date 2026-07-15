import { createBatch2PracticalGuideV1 } from "./create-batch-2-practical-guide.v1";

export const MODEL_230_GUIDE_V1 = createBatch2PracticalGuideV1({
  code: "230",
  category: "Loterías · Retenciones",
  statusLabel: "Mensual · Lo presenta el pagador",
  statusTone: "current",
  effectiveYear: 2026,
  intro: [
    "El Modelo 230 permite a las entidades pagadoras ingresar mensualmente las retenciones del gravamen especial sobre determinados premios de loterías y apuestas.",
    "No lo presenta el ganador y no abarca cualquier concurso: la retención general es el 20 % sobre la parte del premio que exceda del importe exento aplicable.",
  ],
  notices: [
    {
      title: "Pagador, no premiado",
      paragraphs: [
        "Cuando la retención se practica correctamente, el ganador no presenta normalmente el Modelo 136. El resumen anual del pagador es el Modelo 270.",
      ],
    },
  ],
  type: "Autoliquidación de retenciones sobre premios.",
  presenter:
    "Entidad pagadora de premios incluidos de SELAE, ONCE, Cruz Roja, organismos autonómicos o entidades análogas admitidas.",
  nonPresenter:
    "El ganador del premio o el organizador de cualquier concurso no incluido en este gravamen especial.",
  periodicity: "Mensual.",
  deadline:
    "Primeros veinte días del mes siguiente, con la regla oficial especial aplicable a julio y límites propios de domiciliación.",
  channel:
    "Presentación electrónica y pago; puede existir declaración negativa en los supuestos admitidos.",
  result: "Ingreso del 20 % sobre la parte no exenta de los premios sujetos.",
  included: [
    "Premios de las entidades y sorteos comprendidos legalmente.",
    "Parte exenta, base gravada y retención del 20 %.",
    "Premios compartidos, prorrateo e identificación de beneficiarios.",
    "Número de premios, certificación y periodo mensual.",
  ],
  excluded: [
    "Cualquier premio de un concurso privado.",
    "La autoliquidación del ganador cuando no hubo retención, Modelo 136.",
    "El resumen anual del Modelo 270.",
    "Retenciones ordinarias del Modelo 111.",
  ],
  preparation: [
    "Identificar sorteo, fecha y premio total.",
    "Aplicar correctamente la parte exenta y el prorrateo.",
    "Identificar perceptores y retención practicada.",
    "Conciliar el mes con pagos y certificados.",
  ],
  correction:
    "Presenta complementaria si faltó retención; para excesos o datos incorrectos utiliza la rectificación oficial y ajusta después el Modelo 270.",
  procedureSourceId: "aeat.model-230.procedure-home.2026-06-09",
  recordSourceId: "aeat.model-230.procedure-record.2026-06-09",
  helpSourceId: "aeat.model-230.topic-page.2024-10-02",
  legalSourceIds: [
    "boe.models-136-230.order-hap-70-2013",
    "boe.tax-filing-order-hap-2194-2013",
  ],
  related: [
    {
      code: "270",
      href: "/consultor-fiscal/modelos/270",
      description: "Resumen anual de premios, perceptores y retenciones.",
    },
    {
      code: "136",
      href: "/consultor-fiscal/modelos/136",
      description:
        "Autoliquidación del perceptor cuando el premio sujeto no soportó la retención debida.",
    },
  ],
  specificFaq: [
    {
      question: "¿Qué ocurre si el premio es compartido?",
      answer:
        "El importe exento y la parte gravada se prorratean entre los beneficiarios según su participación, que debe quedar identificada.",
    },
    {
      question: "¿Qué porcentaje se retiene?",
      answer:
        "El 20 % sobre la parte del premio que supere el importe exento vigente.",
    },
  ],
});

export const MODEL_270_GUIDE_V1 = createBatch2PracticalGuideV1({
  code: "270",
  category: "Loterías · Resumen anual",
  statusLabel: "Anual · Presentación por fichero",
  statusTone: "current",
  effectiveYear: 2026,
  informationYear: 2025,
  filingYear: 2026,
  intro: [
    "El Modelo 270 identifica anualmente los premios, perceptores y retenciones que el pagador declaró periódicamente mediante el Modelo 230.",
    "Es informativo: no vuelve a pagar las retenciones y debe conciliar exactamente con los periodos mensuales del año.",
  ],
  notices: [
    {
      title: "No es un segundo pago",
      paragraphs: [
        "Lo presenta el pagador mediante fichero. Las claves, diseños y fechas de cada campaña deben revisarse antes de generar registros.",
      ],
    },
  ],
  type: "Declaración informativa anual.",
  presenter:
    "Entidad pagadora obligada que declaró premios y retenciones mediante el Modelo 230.",
  nonPresenter: "El premiado o una entidad que no pagó premios incluidos.",
  periodicity: "Anual.",
  deadline:
    "Durante enero; para la información de 2025, del 1 de enero al 2 de febrero de 2026.",
  channel:
    "Presentación electrónica mediante fichero conforme al diseño de registro vigente.",
  result: "Información anual; no genera un nuevo ingreso.",
  included: [
    "Pagador y perceptores con NIF.",
    "Premio, fecha, importe, parte exenta, base y retención.",
    "Premios compartidos y número de beneficiarios.",
    "Conciliación anual con todos los Modelos 230.",
  ],
  excluded: [
    "Volver a ingresar las retenciones.",
    "Premios ajenos al gravamen especial.",
    "Declaración del ganador mediante el 136.",
    "Registros que no cumplan el diseño del ejercicio.",
  ],
  preparation: [
    "Conciliar los doce periodos del Modelo 230.",
    "Validar NIF y reparto de premios compartidos.",
    "Aplicar el diseño de registro del ejercicio.",
    "Revisar totales, registros erróneos y certificados.",
  ],
  correction:
    "Corrige, da de baja o sustituye los registros por el procedimiento oficial, manteniendo la coherencia con los Modelos 230 afectados.",
  procedureSourceId: "aeat.model-270.procedure-home.2026-07-08",
  recordSourceId: "aeat.model-270.procedure-record.2026-07-08",
  helpSourceId: "aeat.model-270.file-help.2026-04-22",
  document: {
    label: "Consultar diseño de registro del Modelo 270",
    sourceId: "aeat.model-270.register-design-pdf.2024-01-23",
  },
  legalSourceIds: [
    "boe.model-270.law-16-2012.original",
    "boe.model-270.order-hap-2368-2013.original",
    "boe.model-270.order-hac-1431-2025.original",
  ],
  related: [
    {
      code: "230",
      href: "/consultor-fiscal/modelos/230",
      description: "Ingreso mensual de las retenciones sobre premios.",
    },
    {
      code: "136",
      href: "/consultor-fiscal/modelos/136",
      description:
        "Autoliquidación excepcional del perceptor sin retención suficiente.",
    },
  ],
  specificFaq: [
    {
      question: "¿Debe coincidir con el Modelo 230?",
      answer:
        "Sí. Perceptores, bases y retenciones deben conciliar con los periodos mensuales del año.",
    },
    {
      question: "¿Incluye premios exentos?",
      answer:
        "Incluye la información exigida por el diseño vigente, separando importe total, parte exenta y base gravada cuando corresponda.",
    },
  ],
});
