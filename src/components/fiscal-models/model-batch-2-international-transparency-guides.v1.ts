import { createBatch2PracticalGuideV1 } from "./create-batch-2-practical-guide.v1";

export const MODEL_231_GUIDE_V1 = createBatch2PracticalGuideV1({
  code: "231",
  category: "CBC/DAC4 · Grandes grupos multinacionales",
  statusLabel: "Umbral general superior a 750 millones",
  statusTone: "current",
  effectiveYear: 2026,
  intro: [
    "El Modelo 231 es la declaración de información país por país —CBC/DAC4— de determinados grupos multinacionales cuya cifra de negocios consolidada supera, con carácter general, 750 millones de euros.",
    "No genera un pago. Las entidades españolas del grupo deben además cumplir la comunicación previa de la entidad que presentará la información, que puede efectuarse conjuntamente.",
  ],
  notices: [
    {
      title: "Umbral, comunicación previa y doce meses",
      paragraphs: [
        "La AEAT exige el informe desde el día siguiente al cierre y hasta que transcurran doce meses. No debe confundirse con operaciones vinculadas del Modelo 232.",
      ],
    },
  ],
  type: "Declaración informativa internacional país por país.",
  presenter:
    "Entidad matriz última, subrogada o constitutiva obligada del grupo multinacional conforme a las reglas CBC/DAC4.",
  nonPresenter:
    "Una pyme ordinaria, toda filial por el mero hecho de ser española o una empresa con operaciones vinculadas sin encajar en CBC.",
  periodicity: "Anual, por el periodo impositivo del grupo.",
  deadline:
    "Desde el día siguiente al cierre hasta que transcurran doce meses desde la finalización del periodo.",
  channel:
    "Servicio web/XML como vía técnica y formulario disponible; la comunicación previa utiliza su trámite específico.",
  result: "Información intercambiable por jurisdicciones; no liquida impuesto.",
  included: [
    "Ingresos, resultado antes de impuestos, impuestos pagados y devengados por jurisdicción.",
    "Capital, resultados acumulados, empleados y activos materiales.",
    "Entidades constitutivas, residencia y actividades por jurisdicción.",
    "Entidad que comunica y referencia de la comunicación previa.",
  ],
  excluded: [
    "Cálculo o pago del Impuesto sobre Sociedades.",
    "Operaciones vinculadas del Modelo 232.",
    "Impuesto Complementario de los Modelos 240–242.",
    "Grupos por debajo del umbral sin supuesto especial de obligación.",
  ],
  preparation: [
    "Confirmar cifra de negocios consolidada y condición del grupo.",
    "Identificar matriz, entidad declarante y constitutivas.",
    "Conciliar datos financieros y fiscales por jurisdicción.",
    "Presentar o revisar la comunicación previa de las entidades españolas.",
  ],
  correction:
    "La entidad presentadora debe modificar o anular los registros por formulario o servicio web conforme al manual; un requerimiento no corrige los datos automáticamente.",
  procedureSourceId: "aeat.model-231.procedure-home.2026-07-08",
  recordSourceId: "aeat.model-231.procedure-record.2026-07-08",
  helpSourceId: "aeat.model-231.basic-questions.2026-07-08",
  additionalOfficialLinks: [
    {
      label: "Ayuda del servicio web CBC",
      sourceId: "aeat.model-231.web-service-help.2026-06-09",
    },
    {
      label: "Ayuda del formulario CBC",
      sourceId: "aeat.model-231.form-help.2026-06-09",
    },
  ],
  document: {
    label: "Consultar manual oficial del Modelo 231",
    sourceId: "aeat.model-231.form-manual-pdf.v2-1.2021-10-27",
  },
  legalSourceIds: [
    "boe.model-231.order-hfp-1978-2016",
    "boe.model-231.order-hac-941-2018",
    "boe.model-231.order-hac-1285-2020",
  ],
  related: [
    {
      code: "232",
      href: "/consultor-fiscal/modelos/232",
      description:
        "Información sobre operaciones vinculadas y determinados territorios.",
    },
    {
      code: "240",
      href: "/consultor-fiscal/modelos/240",
      description:
        "Comunicación de la entidad declarante del Impuesto Complementario.",
    },
    {
      code: "241",
      href: "/consultor-fiscal/modelos/241",
      description:
        "Declaración informativa GIR/DAC9 del Impuesto Complementario.",
    },
  ],
  specificFaq: [
    {
      question: "¿Todas las filiales españolas deben comunicar algo?",
      answer:
        "Las entidades residentes españolas del grupo obligado deben comunicar la identificación y residencia de la entidad que presenta; puede hacerse conjuntamente.",
    },
    {
      question: "¿Cuál es el umbral general?",
      answer:
        "Más de 750 millones de euros de cifra de negocios consolidada en los doce meses anteriores al inicio del periodo, sin ignorar los supuestos especiales de la norma.",
    },
  ],
});

const DAC6_LEGAL = [
  "boe.cross-border-mechanisms.law-10-2020",
  "boe.cross-border-mechanisms.royal-decree-243-2021",
  "boe.models-234-236.order-hac-342-2021.consolidated-2024-03-22",
] as const;

export const MODEL_234_GUIDE_V1 = createBatch2PracticalGuideV1({
  code: "234",
  category: "DAC6 · Mecanismos transfronterizos",
  statusLabel: "Comunicación inicial · 30 días",
  statusTone: "current",
  effectiveYear: 2026,
  intro: [
    "El Modelo 234 comunica inicialmente determinados mecanismos transfronterizos sujetos a las señas distintivas de DAC6.",
    "No toda operación internacional es declarable: debe existir un mecanismo transfronterizo, una seña distintiva y el sujeto obligado que determinen la norma.",
  ],
  notices: [
    {
      title: "Intermediario, obligado interesado y secreto profesional",
      paragraphs: [
        "El plazo general es de 30 días naturales desde el hito aplicable. El secreto profesional puede desplazar la obligación y exige comunicaciones entre intervinientes.",
      ],
    },
  ],
  type: "Declaración informativa inicial DAC6.",
  presenter:
    "Intermediario o, en los supuestos previstos, obligado tributario interesado en el mecanismo transfronterizo.",
  nonPresenter:
    "Cualquier empresa por realizar una operación internacional sin mecanismo sujeto ni seña distintiva.",
  periodicity: "Por mecanismo y por el hecho que activa la obligación.",
  deadline:
    "Treinta días naturales desde la puesta a disposición, disponibilidad para ejecución, primer paso o prestación de ayuda relevante.",
  channel:
    "Formulario, servicio web o XML conforme a la ayuda técnica vigente.",
  result:
    "Comunicación informativa con número de referencia; no liquida impuesto.",
  included: [
    "Intermediarios, obligados interesados y participantes.",
    "Señas distintivas y criterio del beneficio principal cuando proceda.",
    "Jurisdicciones, resumen, valor, normas y fecha del primer paso.",
    "Número de referencia, secreto profesional y comunicaciones.",
  ],
  excluded: [
    "Toda operación internacional de forma automática.",
    "Actualización trimestral del Modelo 235.",
    "Uso anual del Modelo 236.",
    "Mecanismos CRS/estructuras opacas del Modelo 239.",
  ],
  preparation: [
    "Mapear participantes, jurisdicciones y fechas.",
    "Analizar señas distintivas y beneficio principal.",
    "Documentar secreto profesional y comunicaciones.",
    "Preparar resumen neutral, valor y normas afectadas.",
  ],
  correction:
    "Modifica o anula la declaración por el canal oficial conservando el número de referencia y comunicando el cambio a quienes corresponda.",
  procedureSourceId: "aeat.model-234.procedure-home.2026-07-08",
  recordSourceId: "aeat.model-234.procedure-record.2026-07-08",
  helpSourceId: "aeat.model-234.technical-help.2026-04-22",
  document: {
    label: "Consultar FAQ oficial DAC6",
    sourceId: "aeat.models-234-236.faq-pdf.2024-06-05",
  },
  legalSourceIds: [...DAC6_LEGAL, "boe.model-234.order-hac-266-2024"],
  related: [
    {
      code: "235",
      href: "/consultor-fiscal/modelos/235",
      description: "Actualización trimestral de mecanismos comercializables.",
    },
    {
      code: "236",
      href: "/consultor-fiscal/modelos/236",
      description: "Utilización anual en España de mecanismos DAC6.",
    },
    {
      code: "239",
      href: "/consultor-fiscal/modelos/239",
      description:
        "Mecanismos CRS y estructuras opacas, pendiente de activación.",
    },
  ],
  specificFaq: [
    {
      question: "¿Qué es una seña distintiva?",
      answer:
        "Es una característica definida legalmente que puede hacer declarable el mecanismo; algunas exigen además el criterio del beneficio principal.",
    },
    {
      question: "¿Qué ocurre con el secreto profesional?",
      answer:
        "Puede exonerar al intermediario en los términos legales y desplazar la obligación, pero exige realizar las comunicaciones previstas.",
    },
  ],
});

export const MODEL_235_GUIDE_V1 = createBatch2PracticalGuideV1({
  code: "235",
  category: "DAC6 · Mecanismos comercializables",
  statusLabel: "Actualización trimestral",
  statusTone: "current",
  effectiveYear: 2026,
  intro: [
    "El Modelo 235 actualiza trimestralmente la información de determinados mecanismos transfronterizos comercializables previamente comunicados.",
    "No sustituye la declaración inicial del Modelo 234 y debe conservar el número de referencia del mecanismo.",
  ],
  notices: [
    {
      title: "Solo mecanismos comercializables",
      paragraphs: [
        "La obligación se refiere a la nueva información disponible y no a repetir indiscriminadamente datos sin cambios.",
      ],
    },
  ],
  type: "Declaración informativa de actualización DAC6.",
  presenter:
    "Intermediario obligado respecto de un mecanismo transfronterizo comercializable previamente declarado.",
  nonPresenter:
    "El usuario de un mecanismo a medida o cualquier participante sin la condición de intermediario obligado.",
  periodicity:
    "Trimestral, solo para mecanismos comercializables en el ámbito del modelo.",
  deadline:
    "Durante el mes natural siguiente a la finalización de cada trimestre natural.",
  channel:
    "Formulario, servicio web o XML con el número de referencia del mecanismo.",
  result: "Actualización informativa; no genera pago.",
  included: [
    "Número de referencia del 234.",
    "Nuevos obligados, jurisdicciones y cambios relevantes.",
    "Periodo trimestral y nueva información disponible.",
    "Registros de mecanismos comercializables.",
  ],
  excluded: [
    "Declaración inicial del 234.",
    "Mecanismos a medida fuera del concepto comercializable.",
    "Uso anual informado por el 236.",
    "Duplicar información sin cambio por defecto.",
  ],
  preparation: [
    "Confirmar que el mecanismo es comercializable.",
    "Recuperar la referencia del Modelo 234.",
    "Identificar novedades del trimestre.",
    "Validar XML o formulario antes del envío.",
  ],
  correction:
    "Corrige o anula los registros por el procedimiento técnico oficial, manteniendo la referencia y el periodo trimestral correctos.",
  procedureSourceId: "aeat.model-235.procedure-home.2026-07-08",
  recordSourceId: "aeat.model-235.procedure-record.2026-07-08",
  helpSourceId: "aeat.model-235.technical-help.2026-04-22",
  document: {
    label: "Consultar manual técnico DAC6",
    sourceId: "aeat.models-234-236.technical-manual.v1-14.2022-03-01",
  },
  legalSourceIds: DAC6_LEGAL,
  related: [
    {
      code: "234",
      href: "/consultor-fiscal/modelos/234",
      description: "Declaración inicial que genera la referencia.",
    },
    {
      code: "236",
      href: "/consultor-fiscal/modelos/236",
      description: "Declaración anual de utilización en España.",
    },
  ],
  specificFaq: [
    {
      question: "¿Sustituye al Modelo 234?",
      answer:
        "No. El 234 comunica inicialmente; el 235 actualiza un mecanismo comercializable ya referenciado.",
    },
    {
      question: "¿Se presenta si no hay cambios?",
      answer:
        "Debe aplicarse la obligación de actualización prevista para la nueva información; no debe duplicarse contenido sin analizar el trimestre.",
    },
  ],
});

export const MODEL_236_GUIDE_V1 = createBatch2PracticalGuideV1({
  code: "236",
  category: "DAC6 · Utilización en España",
  statusLabel: "Anual · Octubre a diciembre",
  statusTone: "current",
  effectiveYear: 2026,
  intro: [
    "El Modelo 236 informa del uso efectivo en España de determinados mecanismos transfronterizos DAC6 previamente comunicados.",
    "Lo presenta el obligado tributario interesado, no el intermediario por declarar inicialmente el mecanismo.",
  ],
  notices: [
    {
      title: "Uso anual, no comunicación inicial",
      paragraphs: [
        "Debe vincularse al número de referencia del mecanismo y presentarse del 1 de octubre al 31 de diciembre del año siguiente al de utilización.",
      ],
    },
  ],
  type: "Declaración informativa anual de utilización DAC6.",
  presenter:
    "Obligado tributario interesado que utilizó en España un mecanismo transfronterizo previamente comunicado.",
  nonPresenter:
    "El intermediario por el solo hecho de diseñar o comunicar el mecanismo, ni quien no lo utilizó en España.",
  periodicity: "Anual respecto del ejercicio de utilización efectiva.",
  deadline:
    "Del 1 de octubre al 31 de diciembre del año siguiente al de utilización.",
  channel:
    "Formulario, servicio web o XML, indicando la referencia del mecanismo.",
  result: "Información sobre el uso; no genera directamente un impuesto.",
  included: [
    "Número de referencia del mecanismo.",
    "Ejercicio y utilización efectiva en España.",
    "Valor, efectos, participantes y jurisdicciones.",
    "Identificación del obligado interesado.",
  ],
  excluded: [
    "Comunicación inicial del Modelo 234.",
    "Actualización trimestral comercializable del 235.",
    "Mecanismos sin utilización efectiva por el declarante.",
    "Liquidación del efecto fiscal del mecanismo.",
  ],
  preparation: [
    "Recuperar el número de referencia.",
    "Documentar la utilización efectiva y el ejercicio.",
    "Conciliar valor, participantes y jurisdicciones.",
    "Validar registros y evidencia de la operación.",
  ],
  correction:
    "Modifica o anula por el canal oficial, conservando la referencia correcta y evitando cambiar el ejercicio sin revisar la utilización real.",
  procedureSourceId: "aeat.model-236.procedure-home.2026-01-20",
  recordSourceId: "aeat.model-236.procedure-record.2026-07-08",
  helpSourceId: "aeat.model-236.technical-help.2026-04-22",
  document: {
    label: "Consultar nota informativa DAC6",
    sourceId: "aeat.models-234-236.information-note.2021-04-14",
  },
  legalSourceIds: DAC6_LEGAL,
  related: [
    {
      code: "234",
      href: "/consultor-fiscal/modelos/234",
      description: "Comunicación inicial del mecanismo.",
    },
    {
      code: "235",
      href: "/consultor-fiscal/modelos/235",
      description: "Actualización de mecanismos comercializables.",
    },
  ],
  specificFaq: [
    {
      question: "¿Qué significa utilizar un mecanismo?",
      answer:
        "Aplicarlo efectivamente en España durante el ejercicio, no solo conocerlo, diseñarlo o tenerlo disponible.",
    },
    {
      question: "¿Se presenta todos los años?",
      answer:
        "Se informa por el ejercicio de utilización cuando concurren los requisitos; no es una repetición automática sin uso.",
    },
  ],
});

export const MODEL_239_GUIDE_V1 = createBatch2PracticalGuideV1({
  code: "239",
  category: "AMAC · Elusión CRS y estructuras opacas",
  statusLabel: "Presentación pendiente de activación internacional",
  statusTone: "future",
  effectiveYear: 2026,
  intro: [
    "El Modelo 239 está aprobado para informar de determinados mecanismos destinados a eludir el estándar CRS y de estructuras extraterritoriales opacas.",
    "La presentación no está disponible mientras no entre en vigor el acuerdo multilateral AMAC respecto de una jurisdicción.",
  ],
  notices: [
    {
      title: "Presentación no disponible todavía",
      paragraphs: [
        "La normativa y la ficha pueden consultarse, pero Factu no muestra una acción de presentación ni presupone cuándo se activará internacionalmente.",
      ],
    },
  ],
  type: "Declaración informativa internacional pendiente de activación.",
  presenter:
    "En el futuro, intermediario o usuario que resulte obligado por un mecanismo de elusión CRS o estructura extraterritorial opaca activado para una jurisdicción.",
  nonPresenter:
    "Cualquier titular de una cuenta extranjera o participante internacional mientras no concurra el supuesto y la activación exigidos.",
  periodicity:
    "No aplicable todavía; dependerá del mecanismo y de la entrada en vigor internacional.",
  deadline:
    "Sin plazo operativo de presentación mientras no exista una jurisdicción respecto de la que haya entrado en vigor el AMAC correspondiente.",
  channel:
    "No hay presentación disponible; solo consulta de estado, normativa y futuras actualizaciones.",
  result: "Información futura; actualmente no produce envío ni pago.",
  included: [
    "Conceptos de AMAC y CRS.",
    "Mecanismos de elusión del CRS y estructuras extraterritoriales opacas.",
    "Intermediario, usuario, activos, cuentas, titular real y jurisdicción.",
    "Condición internacional necesaria para activar la presentación.",
  ],
  excluded: [
    "Presentación actual.",
    "Declaración CRS ordinaria del Modelo 289.",
    "Mecanismos DAC6 de los Modelos 234–236.",
    "Inferir una fecha o jurisdicción de activación.",
  ],
  preparation: [
    "Consultar periódicamente la ficha oficial.",
    "Conservar la normativa aprobada y la versión consultada.",
    "No preparar un envío sin activación internacional.",
    "Diferenciar CRS, DAC6 y estructuras opacas.",
  ],
  correction:
    "No existe declaración operativa que corregir. Si la AEAT activa el modelo, habrá que aplicar el procedimiento y versiones que publique entonces.",
  procedureSourceId: "aeat.model-239.procedure-home.2026-07-08",
  recordSourceId: "aeat.model-239.procedure-record.2026-07-08",
  legalSourceIds: [
    "boe.model-239.royal-decree-1065-2007-article-49-ter",
    "boe.model-239.order-hac-266-2024",
    "boe.model-239.multilateral-agreement-2023",
  ],
  related: [
    {
      code: "289",
      href: "/consultor-fiscal/modelos/289",
      description: "Información anual CRS de cuentas financieras reportables.",
    },
    {
      code: "234",
      href: "/consultor-fiscal/modelos/234",
      description: "Comunicación inicial de mecanismos transfronterizos DAC6.",
    },
  ],
  allowProcedureAction: false,
  readOnlyActionLabel: "Consultar estado y normativa",
  externalActionNotice:
    "Presentación no disponible todavía. Factu solo enlaza información oficial y no envía datos.",
  specificFaq: [
    {
      question: "¿Puede presentarse actualmente?",
      answer:
        "No. La AEAT indica que falta la entrada en vigor del acuerdo internacional respecto de alguna jurisdicción.",
    },
    {
      question: "¿Qué diferencia tiene con el Modelo 289?",
      answer:
        "El 289 es el reporte CRS anual de cuentas; el 239 se dirige a mecanismos de elusión CRS y estructuras opacas y sigue pendiente de activación.",
    },
  ],
});
