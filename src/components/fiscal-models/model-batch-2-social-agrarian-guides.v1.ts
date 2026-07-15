import { createBatch2PracticalGuideV1 } from "./create-batch-2-practical-guide.v1";

export const MODEL_345_GUIDE_V1 = createBatch2PracticalGuideV1({
  code: "345",
  category: "Previsión social · Información anual",
  statusLabel: "Anual · Lo presenta la entidad",
  statusTone: "current",
  effectiveYear: 2026,
  informationYear: 2025,
  filingYear: 2026,
  intro: [
    "El Modelo 345 informa anualmente de partícipes y aportaciones a planes de pensiones y otros sistemas de previsión social.",
    "No lo presenta el partícipe; lo presentan gestoras, promotores, aseguradoras, mutualidades y demás entidades obligadas.",
  ],
  notices: [
    {
      title: "Más amplio que los planes de pensiones",
      paragraphs: [
        "Incluye varios sistemas de previsión y distingue aportaciones individuales, contribuciones empresariales, excesos, claves y subclaves del ejercicio.",
      ],
    },
  ],
  type: "Declaración informativa anual.",
  presenter:
    "Gestora, promotora, aseguradora, mutualidad u otro obligado respecto de sistemas de previsión social.",
  nonPresenter:
    "El partícipe, asegurado o trabajador por realizar una aportación.",
  periodicity: "Anual.",
  deadline:
    "Durante enero; información de 2025: del 1 de enero al 2 de febrero de 2026.",
  channel:
    "Formulario hasta 40.000 registros o presentación mediante fichero; puede admitir presentaciones parciales.",
  result: "Información para datos fiscales y control; no genera pago.",
  included: [
    "Planes de pensiones, mutualidades y planes de previsión asegurados.",
    "Previsión social empresarial, seguros de dependencia y otros sistemas incluidos.",
    "Partícipes, asegurados, mutualistas, promotores y aportaciones.",
    "Contribuciones empresariales, aportaciones del trabajador, excesos y claves.",
  ],
  excluded: [
    "Declaración del partícipe.",
    "Plan de Ahorro a Largo Plazo del 280.",
    "Prestación o rescate no incluido en el diseño.",
    "Garantía automática de reducción en Renta.",
  ],
  preparation: [
    "Conciliar partícipes y contratos.",
    "Separar aportaciones propias y contribuciones empresariales.",
    "Aplicar claves y subclaves del ejercicio.",
    "Cuadrar certificados y presentaciones parciales.",
  ],
  correction:
    "Corrige o da de baja los registros por la gestión oficial y emite o rectifica el certificado del partícipe cuando corresponda.",
  procedureSourceId: "aeat.model-345.procedure-home.2026-07-08",
  recordSourceId: "aeat.model-345.procedure-record.2026-07-08",
  helpSourceId: "aeat.model-345.form-help.2026-06-19",
  additionalOfficialLinks: [
    {
      label: "Ayuda de presentación por fichero",
      sourceId: "aeat.model-345.file-help.2026-06-19",
    },
    {
      label: "Nota aclaratoria oficial",
      sourceId: "aeat.model-345.clarifying-note.2026-07-08",
    },
  ],
  document: {
    label: "Consultar diseño de registro del Modelo 345",
    sourceId: "aeat.model-345.register-design-pdf.2025-12-12",
  },
  legalSourceIds: [
    "boe.model-345.order-hfp-823-2022.original",
    "boe.model-345.order-hac-1430-2025.original",
  ],
  related: [
    {
      code: "100",
      href: "/consultor-fiscal/modelos/100",
      description: "Renta del partícipe.",
    },
    {
      code: "190",
      href: "/consultor-fiscal/modelos/190",
      description: "Resumen anual de retenciones del trabajo.",
    },
    {
      code: "280",
      href: "/consultor-fiscal/modelos/280",
      description:
        "Planes de Ahorro a Largo Plazo, distintos de la previsión social del 345.",
    },
  ],
  specificFaq: [
    {
      question: "¿Incluye aportaciones empresariales?",
      answer:
        "Sí. Debe distinguir contribuciones del empleador y aportaciones del trabajador con sus claves correspondientes.",
    },
    {
      question: "¿Qué hago si falta una aportación en mis datos fiscales?",
      answer:
        "Contacta con la entidad declarante para que revise y, si procede, corrija el 345 y el certificado.",
    },
  ],
});

export const MODEL_346_GUIDE_V1 = createBatch2PracticalGuideV1({
  code: "346",
  category: "Sector agrario · Ayudas pagadas",
  statusLabel: "Plazo sujeto a revisión anual",
  statusTone: "current",
  effectiveYear: 2026,
  requiresAnnualReview: true,
  intro: [
    "El Modelo 346 informa de subvenciones e indemnizaciones agrarias satisfechas por entidades públicas o privadas obligadas.",
    "Lo presenta la entidad pagadora, no el agricultor o ganadero, y el modelo no decide por sí solo si una ayuda está exenta.",
  ],
  notices: [
    {
      title: "No hardcodear un plazo antiguo",
      paragraphs: [
        "La página y los diseños pueden conservar fechas de campañas anteriores. El vencimiento debe verificarse en la orden y el calendario aplicables al ejercicio.",
      ],
    },
  ],
  type: "Declaración informativa anual de ayudas agrarias.",
  presenter:
    "Entidad pública o privada obligada que satisface subvenciones o indemnizaciones a agricultores o ganaderos.",
  nonPresenter: "El agricultor o ganadero que recibe la ayuda.",
  periodicity: "Anual, con calendario sujeto a revisión del ejercicio.",
  deadline:
    "Debe comprobarse en la orden y calendario vigentes; no se publica como regla permanente una referencia antigua al 20 de febrero.",
  channel:
    "Presentación electrónica mediante fichero y diseño de registro vigente.",
  result: "Información; no determina pago ni exención del perceptor.",
  included: [
    "Entidad pagadora y perceptor con NIF.",
    "Subvención, indemnización, tipo de ayuda y actividad.",
    "Fecha de pago, ejercicio e importe.",
    "Ayudas corrientes o de capital y administración concedente.",
  ],
  excluded: [
    "Declaración por el beneficiario.",
    "Decidir automáticamente que toda ayuda tributa o está exenta.",
    "Reintegros de compensaciones agrarias del 341.",
    "Operaciones generales con terceros del 347.",
  ],
  preparation: [
    "Conciliar resoluciones, pagos y perceptores.",
    "Clasificar ayuda e indemnización.",
    "Validar NIF, actividad, fecha e importe.",
    "Comprobar el plazo y diseño del ejercicio.",
  ],
  correction:
    "La entidad pagadora debe corregir o dar de baja el registro. El beneficiario debe comunicar discrepancias y revisar su propia declaración sin alterar el dato unilateralmente.",
  procedureSourceId: "aeat.model-346.procedure-home.2026-03-01",
  recordSourceId: "aeat.model-346.procedure-record.2026-07-08",
  helpSourceId: "aeat.model-346.file-help.2026-01-22",
  document: {
    label: "Consultar diseño de registro del Modelo 346",
    sourceId: "aeat.model-346.register-design-pdf.2025-01-02",
  },
  legalSourceIds: [
    "boe.model-346.order-2001-08-07.original",
    "boe.model-346.order-hac-1504-2024.original",
  ],
  related: [
    {
      code: "100",
      href: "/consultor-fiscal/modelos/100",
      description: "Renta del beneficiario persona física.",
    },
    {
      code: "184",
      href: "/consultor-fiscal/modelos/184",
      description: "Atribución de rentas cuando el perceptor es una entidad.",
    },
    {
      code: "200",
      href: "/consultor-fiscal/modelos/200",
      description: "Sociedades del beneficiario.",
    },
    {
      code: "341",
      href: "/consultor-fiscal/modelos/341",
      description: "Reintegro de compensaciones del régimen especial agrario.",
    },
    {
      code: "347",
      href: "/consultor-fiscal/modelos/347",
      description: "Operaciones anuales con terceros.",
    },
  ],
  specificFaq: [
    {
      question: "¿Toda ayuda tributa?",
      answer:
        "No puede decidirse por el 346. Debe analizarse la norma de la ayuda y la situación del beneficiario.",
    },
    {
      question: "¿Qué hago si el importe no coincide?",
      answer:
        "Solicita a la entidad pagadora que revise y corrija el registro; conserva la resolución y los justificantes de cobro.",
    },
  ],
});
