import { createFinalPracticalGuideV1 } from "./create-final-practical-guide.v1";

const home = (code: string) => `aeat.model-${code}.procedure-home.2026-07-14`;
const record = (code: string) =>
  `aeat.model-${code}.procedure-record.2026-07-14`;

export const MODEL_901_GUIDE_V1 = createFinalPracticalGuideV1({
  code: "901",
  category: "Información entre Administraciones Públicas",
  statusLabel: "Institucional · no lo presenta el propietario",
  intro: [
    "El Modelo 901 permite que las comunidades autónomas comuniquen a la Agencia Tributaria información procedente de certificados de eficiencia energética.",
    "La existencia del dato ayuda a contrastar requisitos fiscales, pero no registra el certificado ni concede automáticamente una deducción.",
  ],
  notices: [
    {
      title: "El propietario y el técnico no presentan este modelo",
      paragraphs: [
        "El certificado se tramita ante el registro autonómico competente. La comunidad autónoma es quien suministra después la información institucional a la AEAT.",
        "Si el dato es incorrecto, corrige primero el certificado o su registro autonómico y conserva la documentación rectificada.",
      ],
    },
  ],
  declarationType: "Suministro institucional de información",
  presenter: "La comunidad autónoma u organismo público autorizado.",
  nonPresenter:
    "No lo presenta el propietario, el técnico certificador, la empresa que ejecutó la obra ni el contribuyente que pretende una deducción.",
  periodicity:
    "Suministro por ejercicio conforme al diseño técnico y los accesos publicados para cada campaña.",
  deadline:
    "Plazo institucional según el acuerdo, el ejercicio y el diseño vigente; no se muestra una fecha ciudadana inventada.",
  channel:
    "Presentación electrónica institucional por el organismo autorizado, con consulta y modificación por ejercicios.",
  result:
    "Información sin pago que puede utilizarse para contrastar datos; no reconoce por sí sola una deducción en IRPF.",
  included: [
    "Identidad del organismo y del certificado conforme al diseño vigente.",
    "Inmueble, titular, fechas, código de registro y referencia catastral cuando estén previstos.",
    "Calificación, consumo o emisiones en los campos que establezca la campaña.",
    "Altas y modificaciones institucionales del ejercicio.",
  ],
  excluded: [
    "El registro autonómico del certificado energético.",
    "La declaración de la Renta o la solicitud de una deducción.",
    "Una validación automática de la obra o del derecho fiscal.",
    "La recogida del certificado o datos del inmueble por Factu.",
  ],
  preparation: [
    "Diseño técnico del ejercicio y organismo autorizado.",
    "Certificado inscrito y código de registro autonómico.",
    "Datos del inmueble y referencias exigidas por el diseño vigente.",
    "Trazabilidad de altas, cambios y bajas.",
  ],
  commonMistakes: [
    "Indicar al propietario o al técnico que presente el 901.",
    "Confundir el suministro a la AEAT con el registro autonómico.",
    "Afirmar que el modelo concede automáticamente la deducción.",
    "Reutilizar campos o fechas de una campaña anterior sin verificar.",
  ],
  correction:
    "El propietario debe solicitar la corrección al registro u organismo autonómico emisor. La Administración corrige después el suministro institucional; el contribuyente revisa su propia Renta si procede.",
  procedureSourceId: home("901"),
  recordSourceId: record("901"),
  related: [
    {
      code: "100",
      href: "/consultor-fiscal/modelos/100",
      description:
        "Declaración en la que pueden aplicarse las deducciones de IRPF si se cumplen sus requisitos.",
    },
  ],
  specificFaq: [
    {
      question: "¿Lo presenta el propietario?",
      answer:
        "No. Lo presenta la comunidad autónoma o el organismo autorizado.",
    },
    {
      question: "¿Lo presenta el técnico certificador?",
      answer:
        "No. El técnico participa en el certificado, pero no realiza este suministro institucional a la AEAT.",
    },
    {
      question: "¿Concede automáticamente una deducción?",
      answer:
        "No. El dato sirve de contraste y la deducción exige cumplir su normativa y declararse correctamente.",
    },
    {
      question: "¿Qué hago si el certificado es incorrecto?",
      answer:
        "Solicita la rectificación al registro autonómico y conserva el certificado corregido.",
    },
    {
      question: "¿Factu almacena el certificado?",
      answer:
        "No. Esta ficha es informativa y no recoge certificados, referencias catastrales ni datos personales.",
    },
  ],
  institutional: true,
});

export const MODEL_933_GUIDE_V1 = createFinalPracticalGuideV1({
  code: "933",
  category: "Información entre Administraciones Públicas",
  statusLabel: "Institucional · centros autorizados",
  intro: [
    "El Modelo 933 permite que las comunidades autónomas informen a la AEAT de las guarderías y centros de educación infantil con autorización válida.",
    "El 933 informa de la autorización del centro; el Modelo 233 informa, cuando corresponde, de menores, meses y gastos.",
  ],
  notices: [
    {
      title: "No es el modelo de las familias ni de los gastos de guardería",
      paragraphs: [
        "No lo presentan los padres. El centro tampoco lo utiliza para informar gastos: esa función corresponde al Modelo 233 cuando existe obligación.",
        "La presencia del centro en el 933 no concede por sí sola el incremento de maternidad.",
      ],
    },
  ],
  declarationType: "Información institucional sobre autorizaciones",
  presenter: "La comunidad autónoma competente u organismo autorizado.",
  nonPresenter:
    "No lo presentan las familias; el centro no lo usa para declarar los gastos de menores.",
  periodicity:
    "Suministro por ejercicio y actualizaciones de altas, modificaciones, bajas o reactivaciones conforme a la herramienta vigente.",
  deadline:
    "Plazo institucional de la campaña y del diseño vigente; no se traslada al ciudadano una fecha genérica.",
  channel:
    "Herramienta electrónica institucional, con carga manual o CSV cuando esté habilitada, validación, consulta y modificación.",
  result:
    "Informa de centros autorizados sin generar pago ni conceder automáticamente una deducción familiar.",
  included: [
    "Centro, titular y organismo que concede la autorización.",
    "Código, naturaleza y fechas de vigencia de la autorización.",
    "Altas, modificaciones, bajas y reactivaciones con identificador de registro.",
    "Dirección y demás campos estrictamente previstos por el diseño actual.",
  ],
  excluded: [
    "Menores, meses y gastos del Modelo 233.",
    "Solicitud del abono anticipado del Modelo 140.",
    "Declaración de la Renta del Modelo 100.",
    "Una garantía automática de deducción para la familia.",
  ],
  preparation: [
    "Autorización educativa o de funcionamiento vigente.",
    "Código, fechas, titular y organismo competente.",
    "Plantilla CSV y separador de la campaña, si se usa carga masiva.",
    "Historial de modificaciones y bajas para evitar duplicados.",
  ],
  commonMistakes: [
    "Confundir el 933 con el 233.",
    "Indicar a los padres que presenten este modelo.",
    "Dar por concedida la deducción solo porque el centro figure autorizado.",
    "Cargar un CSV con plantilla, campos o fechas de otro ejercicio.",
  ],
  correction:
    "El centro debe dirigirse a la autoridad autonómica que gestiona su autorización. La familia consulta al centro y revisa su propia Renta, pero no presenta un 933.",
  procedureSourceId: home("933"),
  recordSourceId: record("933"),
  related: [
    {
      code: "233",
      href: "/consultor-fiscal/modelos/233",
      description:
        "Información anual de menores, meses y gastos por el centro obligado.",
    },
    {
      code: "140",
      href: "/consultor-fiscal/modelos/140",
      description: "Solicitud del abono anticipado de maternidad.",
    },
    {
      code: "100",
      href: "/consultor-fiscal/modelos/100",
      description:
        "Declaración en la que se aplica el beneficio si concurren sus requisitos.",
    },
  ],
  specificFaq: [
    {
      question: "¿Lo presentan los padres?",
      answer: "No. Es un suministro de la comunidad autónoma.",
    },
    {
      question: "¿Qué diferencia existe con el 233?",
      answer:
        "El 933 identifica autorizaciones; el 233 informa de menores, meses y gastos por el centro obligado.",
    },
    {
      question: "¿Concede la deducción?",
      answer:
        "No. Solo aporta información institucional que puede utilizarse para contrastar requisitos.",
    },
    {
      question: "¿Qué hago si el centro no aparece?",
      answer:
        "El centro debe contactar con la autoridad autonómica que concedió o gestiona su autorización.",
    },
    {
      question: "¿Puede cargarse mediante fichero?",
      answer:
        "La herramienta oficial admite las modalidades que publique para la campaña; usa siempre su plantilla y validación actuales.",
    },
  ],
  institutional: true,
});

export const MODEL_980_GUIDE_V1 = createFinalPracticalGuideV1({
  code: "980",
  category: "Información entre Administraciones Públicas",
  statusLabel: "Institucional · intereses pagados",
  intro: [
    "El Modelo 980 permite que las comunidades autónomas comuniquen a Hacienda los intereses de demora que han pagado a contribuyentes.",
    "El suministro no crea un nuevo pago ni determina por sí solo cómo tributa el interés: el tratamiento depende del origen, la resolución, el impuesto y la persona perceptora.",
  ],
  notices: [
    {
      title: "No todos los intereses tienen el mismo tratamiento fiscal",
      paragraphs: [
        "No se puede clasificar el importe solo por aparecer en el Modelo 980. Revisa la resolución, el principal devuelto, el tipo de interés y el impuesto afectado.",
      ],
    },
  ],
  declarationType: "Información institucional de pagos",
  presenter: "La comunidad autónoma que paga los intereses.",
  nonPresenter:
    "No lo presenta el contribuyente, la persona o empresa que cobró el importe ni su asesor.",
  periodicity:
    "Suministro por ejercicio conforme a la campaña institucional vigente.",
  deadline:
    "Plazo institucional según el ejercicio y el diseño vigente; el perceptor no tiene un plazo propio de Modelo 980.",
  channel:
    "Presentación electrónica institucional por ejercicio, con consulta y corrección por la comunidad pagadora.",
  result:
    "Informa a la AEAT de intereses pagados; no genera un segundo ingreso ni fija automáticamente su tributación.",
  included: [
    "Comunidad pagadora, perceptor, NIF, importe y ejercicio.",
    "Fecha, procedimiento de origen y concepto cuando figuren en el diseño vigente.",
    "Altas y correcciones del suministro institucional.",
  ],
  excluded: [
    "El principal devuelto, costas o indemnizaciones si no forman parte del campo informado.",
    "Una calificación fiscal universal de todos los intereses.",
    "La declaración propia del perceptor en IRPF o Sociedades.",
    "La recogida de resoluciones o datos bancarios por Factu.",
  ],
  preparation: [
    "Resolución y expediente que originan el pago.",
    "Separación de principal, intereses, costas e indemnizaciones.",
    "Identidad del perceptor, ejercicio y fecha de pago.",
    "Diseño institucional de la campaña.",
  ],
  commonMistakes: [
    "Pedir al perceptor que presente el 980.",
    "Afirmar que todos los intereses tributan de igual manera.",
    "Confundir el principal devuelto con los intereses.",
    "Corregir solo la declaración personal sin pedir al pagador que rectifique el dato de origen.",
  ],
  correction:
    "Solicita la corrección a la comunidad autónoma pagadora y conserva la resolución y el certificado corregidos; después revisa el Modelo 100 o 200 si el dato afectó a la declaración propia.",
  procedureSourceId: home("980"),
  recordSourceId: record("980"),
  related: [
    {
      code: "100",
      href: "/consultor-fiscal/modelos/100",
      description:
        "Declaración de la persona física, cuyo tratamiento debe analizarse según el origen del interés.",
    },
    {
      code: "200",
      href: "/consultor-fiscal/modelos/200",
      description: "Declaración de Sociedades para entidades perceptoras.",
    },
  ],
  specificFaq: [
    {
      question: "¿Lo presenta quien cobró los intereses?",
      answer: "No. Lo presenta la comunidad autónoma pagadora.",
    },
    {
      question: "¿Genera un nuevo impuesto?",
      answer:
        "No. Es un suministro informativo; la tributación se analiza aparte.",
    },
    {
      question: "¿Todos los intereses tributan igual?",
      answer:
        "No. Depende del origen, la resolución, el impuesto y la naturaleza del perceptor.",
    },
    {
      question: "¿Qué documento debo conservar?",
      answer:
        "La resolución, el desglose del pago y cualquier certificado emitido por la comunidad pagadora.",
    },
    {
      question: "¿Qué hago si el importe es incorrecto?",
      answer:
        "Pide la rectificación a la comunidad autónoma que pagó e informó los intereses.",
    },
  ],
  institutional: true,
});

export const MODEL_981_GUIDE_V1 = createFinalPracticalGuideV1({
  code: "981",
  category: "Información entre Administraciones Públicas",
  statusLabel: "Histórico · declaración extraordinaria de 2019",
  statusTone: "historical",
  intro: [
    "El Modelo 981 fue el suministro extraordinario utilizado en 2019 para identificar determinadas prestaciones de maternidad o paternidad satisfechas en 2014, 2015, 2016 o 2017.",
    "No es una declaración informativa anual vigente para prestaciones actuales.",
  ],
  notices: [
    {
      title: "Presentación histórica y acotada",
      paragraphs: [
        "El ejercicio de presentación es 2019 y solo admite devengos de 2014 a 2017, con clave L y subclave 27. El beneficiario nunca presenta personalmente el 981.",
        "La sede puede conservar consultas y correcciones históricas sin que exista una campaña 2025 o 2026.",
      ],
    },
  ],
  declarationType: "Suministro institucional extraordinario e histórico",
  presenter: "La entidad que satisfizo la prestación histórica.",
  nonPresenter:
    "No lo presenta la persona que cobró la prestación ni se utiliza para prestaciones actuales.",
  periodicity:
    "Presentación extraordinaria única correspondiente al ejercicio 2019.",
  deadline:
    "Campaña extraordinaria de 2019 para devengos de 2014, 2015, 2016 y 2017; no existe plazo anual vigente.",
  channel:
    "Fichero TGVI online histórico, con registros tipo 1 y tipo 2 y los cauces de complementaria o sustitutiva publicados.",
  result:
    "Suministro informativo sin pago, destinado a identificar prestaciones históricas y sus retenciones.",
  included: [
    "Entidad pagadora y perceptor.",
    "Un registro por perceptor y ejercicio de devengo.",
    "Prestaciones devengadas exclusivamente en 2014, 2015, 2016 o 2017.",
    "Clave L, subclave 27, importes satisfechos y retenciones.",
    "Complementarias y sustitutivas de la declaración extraordinaria.",
  ],
  excluded: [
    "Prestaciones devengadas fuera de 2014–2017.",
    "Una declaración anual corriente de 2025 o 2026.",
    "La solicitud personal de devolución o abono anticipado.",
    "Mezclar varios ejercicios de devengo en un único registro.",
  ],
  preparation: [
    "Declaración original de 2019 y número de justificante anterior.",
    "Perceptor, NIF, importe, retenciones y año de devengo.",
    "Clave L y subclave 27.",
    "Registros tipo 1 y tipo 2 del fichero histórico.",
  ],
  commonMistakes: [
    "Presentarlo como modelo anual vigente.",
    "Indicar como ejercicio de presentación el año de devengo.",
    "Incluir prestaciones posteriores a 2017.",
    "Omitir retenciones o mezclar años en un registro.",
    "Pedir al beneficiario que presente personalmente el modelo.",
  ],
  correction:
    "El beneficiario contacta con la entidad pagadora. Esta consulta la declaración histórica y utiliza complementaria o sustitutiva con la referencia correcta.",
  procedureSourceId: home("981"),
  recordSourceId: record("981"),
  related: [
    {
      code: "190",
      href: "/consultor-fiscal/modelos/190",
      description:
        "Resumen anual actual de determinadas retenciones y rendimientos del trabajo.",
    },
    {
      code: "100",
      href: "/consultor-fiscal/modelos/100",
      description:
        "Declaración personal relacionada con los datos fiscales del beneficiario.",
    },
    {
      code: "140",
      href: "/consultor-fiscal/modelos/140",
      description:
        "Solicitud actual del abono anticipado por maternidad, con finalidad distinta.",
    },
  ],
  specificFaq: [
    {
      question: "¿Sigue siendo un modelo anual?",
      answer: "No. Fue una declaración extraordinaria correspondiente a 2019.",
    },
    {
      question: "¿Qué años de prestaciones incluye?",
      answer: "Solo devengos de 2014, 2015, 2016 y 2017.",
    },
    {
      question: "¿Qué clave se utiliza?",
      answer: "Clave L y subclave 27, conforme a la nota oficial.",
    },
    {
      question: "¿Lo presenta quien cobró la prestación?",
      answer: "No. Lo presentó la entidad pagadora.",
    },
    {
      question: "¿Por qué sigue accesible la página?",
      answer:
        "Para consulta y corrección de la campaña histórica, no porque exista una obligación anual actual.",
    },
  ],
  institutional: true,
  allowCurrentFiling: false,
  filingYear: 2019,
  requiresAnnualReview: false,
});

export const MODEL_990_GUIDE_V1 = createFinalPracticalGuideV1({
  code: "990",
  category: "Información entre Administraciones Públicas",
  statusLabel: "Institucional · mensual · datos sensibles",
  intro: [
    "El Modelo 990 permite que las comunidades autónomas comuniquen mensualmente a la AEAT información sobre títulos de familia numerosa y situaciones de discapacidad.",
    "El suministro puede apoyar la comprobación de deducciones familiares, pero no concede automáticamente el derecho ni sustituye el Modelo 143.",
  ],
  notices: [
    {
      title: "Información sensible gestionada por la comunidad autónoma",
      paragraphs: [
        "La familia y la persona con discapacidad no presentan el 990. Si falta un miembro, una fecha o un grado, la rectificación se solicita al organismo autonómico que emitió el título o certificado.",
        "Factu no recoge ni almacena títulos, miembros, menores o grados de discapacidad.",
      ],
    },
  ],
  declarationType: "Suministro institucional sensible",
  presenter: "La comunidad autónoma competente.",
  nonPresenter:
    "No lo presenta la familia, la persona con discapacidad ni quien solicita una deducción.",
  periodicity: "Mensual, conforme al diseño institucional vigente.",
  deadline:
    "Plazo mensual institucional definido para el suministro; no existe un plazo de presentación ciudadana.",
  channel:
    "Transmisión electrónica institucional, con consulta y gestión de ejercicios anteriores por la comunidad autorizada.",
  result:
    "Información sin pago que puede contrastar deducciones; no reconoce automáticamente la deducción o el abono anticipado.",
  included: [
    "Título de familia numerosa, categoría, vigencia y renovaciones.",
    "Miembros y fechas estrictamente previstos por el diseño vigente.",
    "Discapacidad, grado y fechas de reconocimiento o efectos según la campaña.",
    "Altas y correcciones mensuales de la comunidad autónoma.",
  ],
  excluded: [
    "La solicitud del abono anticipado del Modelo 143.",
    "La aplicación de la deducción en el Modelo 100.",
    "Una decisión automática sobre el derecho o su cuantía.",
    "La recogida de datos familiares o sanitarios por Factu.",
  ],
  preparation: [
    "Título o certificado autonómico y sus fechas de vigencia.",
    "Identificador del expediente y trazabilidad de modificaciones.",
    "Diseño mensual vigente y organismo autorizado.",
    "Controles reforzados de acceso y protección de datos.",
  ],
  commonMistakes: [
    "Pedir a la familia que presente el 990.",
    "Confundirlo con la solicitud del Modelo 143.",
    "Afirmar que el suministro concede automáticamente la deducción.",
    "Mantener títulos caducados o grados sin actualizar.",
    "Exponer o almacenar datos sensibles fuera del canal institucional.",
  ],
  correction:
    "La persona afectada solicita la corrección a la comunidad autónoma que emitió el título o certificado. La Administración actualiza el suministro y el contribuyente revisa 143, 121, 122 o 100 si procede.",
  procedureSourceId: home("990"),
  recordSourceId: record("990"),
  related: [
    {
      code: "143",
      href: "/consultor-fiscal/modelos/143",
      description:
        "Solicitud del abono anticipado de determinadas deducciones familiares.",
    },
    {
      code: "121",
      href: "/consultor-fiscal/modelos/121",
      description: "Cesión de determinadas deducciones por no declarantes.",
    },
    {
      code: "122",
      href: "/consultor-fiscal/modelos/122",
      description: "Regularización de abonos familiares por no declarantes.",
    },
    {
      code: "100",
      href: "/consultor-fiscal/modelos/100",
      description:
        "Declaración en la que se aplican las deducciones si concurren los requisitos.",
    },
  ],
  specificFaq: [
    {
      question: "¿Lo presenta la familia?",
      answer: "No. Lo presenta la comunidad autónoma.",
    },
    {
      question: "¿Es mensual?",
      answer: "Sí, el suministro institucional es mensual.",
    },
    {
      question: "¿Sustituye el Modelo 143?",
      answer:
        "No. El 143 es la solicitud del abono anticipado; el 990 es información autonómica.",
    },
    {
      question: "¿Qué hago si falta una persona o el grado es incorrecto?",
      answer:
        "Solicita la rectificación al organismo autonómico que emitió el título o certificado.",
    },
    {
      question: "¿Factu almacena esta información?",
      answer:
        "No. La ficha no recoge miembros, menores, discapacidad ni documentos acreditativos.",
    },
  ],
  institutional: true,
});
