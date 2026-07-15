import { createFinalPracticalGuideV1 } from "./create-final-practical-guide.v1";

const home = (code: string) => `aeat.model-${code}.procedure-home.2026-07-14`;
const record = (code: string) =>
  `aeat.model-${code}.procedure-record.2026-07-14`;

export const MODEL_991_GUIDE_V1 = createFinalPracticalGuideV1({
  code: "991",
  category: "Información entre Administraciones Públicas",
  statusLabel: "Institucional · fianzas de arrendamiento",
  intro: [
    "El Modelo 991 permite que comunidades autónomas y organismos públicos depositarios comuniquen a la AEAT información sobre fianzas derivadas de arrendamientos.",
    "No es el formulario para depositar la fianza y no lo presentan ni arrendador ni inquilino.",
  ],
  notices: [
    {
      title: "Depositar la fianza y presentar el 991 son actuaciones distintas",
      paragraphs: [
        "El depósito se realiza ante el organismo autonómico competente. Ese organismo suministra después la información a la AEAT mediante el 991.",
        "El modelo no sustituye las retenciones de los Modelos 115 y 180 ni decide por sí solo la tributación del alquiler.",
      ],
    },
  ],
  declarationType: "Declaración informativa institucional",
  presenter:
    "La comunidad autónoma u organismo público responsable del depósito de fianzas.",
  nonPresenter:
    "No lo presenta el arrendador, el inquilino ni la inmobiliaria.",
  periodicity:
    "Suministro por ejercicio conforme al diseño institucional vigente.",
  deadline:
    "Plazo institucional de cada campaña; las partes del contrato no tienen un plazo propio de Modelo 991.",
  channel:
    "Presentación electrónica institucional por ejercicio, con consulta, modificación y acceso a ejercicios anteriores.",
  result:
    "Información sin pago que puede contrastarse con datos de alquiler; no determina por sí sola una renta, retención o deducción.",
  included: [
    "Organismo depositario, arrendador, arrendatario e inmueble conforme al diseño.",
    "Fecha del contrato, uso, importe de fianza, devolución y finalización cuando proceda.",
    "Referencia catastral y otros identificadores solo si figuran en el diseño vigente.",
    "Altas, modificaciones y bajas del suministro institucional.",
  ],
  excluded: [
    "El trámite autonómico de depósito o devolución de la fianza.",
    "Las retenciones periódicas y anuales de los Modelos 115 y 180.",
    "La declaración del alquiler en Renta o IRNR.",
    "La recogida de contratos, fianzas o datos del inmueble por Factu.",
  ],
  preparation: [
    "Registro autonómico del depósito y organismo competente.",
    "Contrato, inmueble, partes, fechas e importe.",
    "Diseño técnico del ejercicio y trazabilidad de modificaciones.",
    "Pruebas de devolución o finalización cuando el diseño las requiera.",
  ],
  commonMistakes: [
    "Indicar al arrendador que presente el 991.",
    "Confundir la declaración institucional con el depósito de la fianza.",
    "Tratarlo como sustituto de los Modelos 115 o 180.",
    "Mantener un contrato finalizado o un importe incorrecto sin corregir el registro autonómico.",
  ],
  correction:
    "Arrendador o inquilino deben solicitar la corrección al organismo autonómico depositario. Ese organismo modifica el suministro; después se revisa la declaración propia si procede.",
  procedureSourceId: home("991"),
  recordSourceId: record("991"),
  related: [
    {
      code: "115",
      href: "/consultor-fiscal/modelos/115",
      description: "Retención periódica sobre determinados alquileres urbanos.",
    },
    {
      code: "180",
      href: "/consultor-fiscal/modelos/180",
      description: "Resumen anual de esas retenciones.",
    },
    {
      code: "100",
      href: "/consultor-fiscal/modelos/100",
      description:
        "Declaración personal de rentas y deducciones relacionadas con alquileres.",
    },
    {
      code: "210",
      href: "/consultor-fiscal/modelos/210",
      description:
        "Declaración de determinadas rentas inmobiliarias de no residentes.",
    },
  ],
  specificFaq: [
    {
      question: "¿Lo presenta el arrendador?",
      answer: "No. Lo presenta el organismo público responsable del depósito.",
    },
    {
      question: "¿Es el formulario para depositar la fianza?",
      answer:
        "No. El depósito se tramita ante el organismo autonómico competente.",
    },
    {
      question: "¿Sustituye al Modelo 115?",
      answer:
        "No. El 115 declara retenciones; el 991 es un suministro institucional de fianzas.",
    },
    {
      question: "¿Qué hago si el importe está mal o el contrato terminó?",
      answer:
        "Solicita la corrección al organismo depositario de la comunidad autónoma.",
    },
  ],
  institutional: true,
});

export const MODEL_992_GUIDE_V1 = createFinalPracticalGuideV1({
  code: "992",
  category: "Información entre Administraciones Públicas",
  statusLabel: "Institucional · tributos cedidos del juego",
  intro: [
    "El Modelo 992 permite que las comunidades autónomas comuniquen a la AEAT información relativa a tributos cedidos sobre el juego.",
    "Es un intercambio administrativo, no la autoliquidación que debe presentar directamente un jugador u operador mediante esta ficha.",
  ],
  notices: [
    {
      title: "No sustituye los modelos propios del operador",
      paragraphs: [
        "El 992 no reemplaza los Modelos 043, 044, 045, 685 o 763. Cada uno tiene sujeto, territorio, hecho imponible y plazo propios.",
      ],
    },
  ],
  declarationType: "Suministro institucional sobre tributos cedidos",
  presenter: "La comunidad autónoma competente.",
  nonPresenter:
    "No lo presenta el jugador ni, mediante este procedimiento institucional, el casino, salón, operador o empresa ordinaria.",
  periodicity: "Suministro por ejercicio conforme al diseño vigente.",
  deadline:
    "Plazo institucional de la campaña; los operadores deben atender sus modelos tributarios propios.",
  channel:
    "Presentación electrónica institucional, consulta y corrección por ejercicios.",
  result:
    "Intercambio de información sin un segundo pago para la persona informada.",
  included: [
    "Tributos cedidos sobre casinos, bingo, máquinas, apuestas u otras modalidades solo cuando figuren en el diseño.",
    "Operador, establecimiento, base, cuota y periodo conforme a los campos vigentes.",
    "Altas y modificaciones institucionales del ejercicio.",
  ],
  excluded: [
    "La autoliquidación del jugador.",
    "Los Modelos 043, 044, 045, 685 o 763 del sujeto obligado correspondiente.",
    "Una competencia estatal o autonómica inferida sin revisar territorio y modalidad.",
    "La recogida de datos de apuestas por Factu.",
  ],
  preparation: [
    "Diseño institucional vigente y comunidad declarante.",
    "Modalidad de juego y tributo cedido correctamente identificado.",
    "Operador, establecimiento, base, cuota y periodo cuando los exija el diseño.",
    "Trazabilidad de correcciones y bajas.",
  ],
  commonMistakes: [
    "Pedir al jugador o al operador que presente el 992.",
    "Confundirlo con los Modelos 043, 044, 045, 685 o 763.",
    "Generar un segundo pago por un dato ya informado.",
    "Copiar campos o plazos de otro tributo de juego por analogía.",
  ],
  correction:
    "El operador afectado solicita la rectificación a la Administración autonómica que comunicó el dato y revisa por separado su autoliquidación propia si existe un error tributario.",
  procedureSourceId: home("992"),
  recordSourceId: record("992"),
  related: [
    {
      code: "043",
      href: "/consultor-fiscal/modelos/043",
      description: "Tasa estatal sobre el juego del bingo en sus supuestos.",
    },
    {
      code: "044",
      href: "/consultor-fiscal/modelos/044",
      description: "Tasa sobre casinos de juego.",
    },
    {
      code: "045",
      href: "/consultor-fiscal/modelos/045",
      description: "Tasa sobre máquinas recreativas y de azar.",
    },
    {
      code: "685",
      href: "/consultor-fiscal/modelos/685",
      description:
        "Apuestas y combinaciones aleatorias en los supuestos estatales.",
    },
    {
      code: "763",
      href: "/consultor-fiscal/modelos/763",
      description:
        "Impuesto sobre actividades de juego de operadores estatales.",
    },
  ],
  specificFaq: [
    {
      question: "¿Lo presenta el jugador?",
      answer: "No. Lo presenta la comunidad autónoma.",
    },
    {
      question: "¿Lo presenta directamente un casino?",
      answer:
        "No mediante esta ficha institucional; el operador atiende sus modelos propios.",
    },
    {
      question: "¿Genera un nuevo pago?",
      answer: "No. Es información entre administraciones.",
    },
    {
      question: "¿Qué hago si el dato autonómico es incorrecto?",
      answer:
        "Solicita la corrección a la comunidad autónoma que lo suministró.",
    },
  ],
  institutional: true,
});

export const MODEL_993_GUIDE_V1 = createFinalPracticalGuideV1({
  code: "993",
  category: "Información entre Administraciones Públicas",
  statusLabel: "Institucional · control de deducciones autonómicas",
  intro: [
    "El Modelo 993 permite que las comunidades autónomas comuniquen información necesaria para comprobar determinadas deducciones autonómicas del IRPF.",
    "No es una solicitud de deducción: la aplicación efectiva se realiza en el Modelo 100 y exige cumplir la norma autonómica del ejercicio.",
  ],
  notices: [
    {
      title: "La información no concede por sí sola la deducción",
      paragraphs: [
        "Las deducciones y requisitos varían por comunidad y ejercicio. No se puede crear una lista permanente ni trasladar una regla de un territorio a otro.",
      ],
    },
  ],
  declarationType: "Suministro institucional para control fiscal",
  presenter: "La comunidad autónoma u organismo emisor autorizado.",
  nonPresenter:
    "No lo presenta el contribuyente que aplica una deducción en la Renta.",
  periodicity: "Suministro por ejercicio según el diseño vigente.",
  deadline:
    "Plazo institucional de la campaña; la aplicación en Renta sigue el plazo del Modelo 100.",
  channel:
    "Presentación electrónica institucional con consulta y corrección por ejercicios.",
  result:
    "Información de contraste sin pago y sin reconocimiento automático del derecho a deducir.",
  included: [
    "Contribuyente, comunidad, ejercicio y deducción en los campos del diseño vigente.",
    "Datos de vivienda, familia, estudios, nacimiento, discapacidad, donaciones, alquiler u otros solo si los contempla la campaña.",
    "Altas y correcciones institucionales.",
  ],
  excluded: [
    "La solicitud personal de una deducción.",
    "La aplicación efectiva en el Modelo 100.",
    "Una lista nacional única de requisitos o bonificaciones.",
    "El almacenamiento de justificantes personales por Factu.",
  ],
  preparation: [
    "Normativa autonómica aplicable al ejercicio.",
    "Diseño institucional y organismo emisor.",
    "Identidad, concepto y datos estrictamente exigidos.",
    "Trazabilidad de correcciones y protección de datos.",
  ],
  commonMistakes: [
    "Pedir al contribuyente que presente el 993.",
    "Tratar el suministro como concesión de la deducción.",
    "Aplicar requisitos de otra comunidad o ejercicio.",
    "Corregir solo la Renta sin pedir al organismo que rectifique el dato de origen.",
  ],
  correction:
    "Solicita la corrección a la comunidad u organismo que emitió la información, conserva justificantes y revisa el Modelo 100 si el error afectó a la deducción declarada.",
  procedureSourceId: home("993"),
  recordSourceId: record("993"),
  related: [
    {
      code: "100",
      href: "/consultor-fiscal/modelos/100",
      description:
        "Declaración donde se aplican las deducciones autonómicas si concurren sus requisitos.",
    },
  ],
  specificFaq: [
    {
      question: "¿Lo presenta el contribuyente?",
      answer: "No. Lo presenta la comunidad autónoma.",
    },
    {
      question: "¿Cómo se solicita una deducción autonómica?",
      answer:
        "Se aplica, cuando corresponde, en el Modelo 100 conforme a la normativa autonómica.",
    },
    {
      question: "¿El 993 concede la deducción?",
      answer: "No. Suministra información para su contraste.",
    },
    {
      question: "¿Qué hago si falta un dato o el importe es incorrecto?",
      answer:
        "Pide la rectificación al organismo autonómico que lo emitió y revisa tu Renta.",
    },
  ],
  institutional: true,
});

export const MODEL_995_GUIDE_V1 = createFinalPracticalGuideV1({
  code: "995",
  category: "Información entre Administraciones Públicas",
  statusLabel: "Institucional · entidades locales",
  intro: [
    "El Modelo 995 permite que las entidades locales suministren a la AEAT determinados datos urbanísticos, inmobiliarios y tributarios.",
    "No lo presentan propietarios, promotores o arquitectos y no sustituye licencias ni tributos municipales.",
  ],
  notices: [
    {
      title: "Canal exclusivo de entidades locales",
      paragraphs: [
        "El formulario vigente admite hasta 40.000 registros; para volúmenes superiores o cuando convenga se utiliza el fichero autorizado.",
        "La regla institucional utilizada sitúa la campaña anual durante marzo del año siguiente, pero debe confirmarse en el programa vigente.",
      ],
    },
  ],
  declarationType: "Cesión institucional de información urbanística",
  presenter: "Ayuntamiento, diputación u organismo local autorizado.",
  nonPresenter:
    "No lo presenta el propietario, promotor, arquitecto o contribuyente afectado.",
  periodicity: "Anual.",
  deadline:
    "Durante marzo del año siguiente conforme a la campaña institucional, sujeto a comprobación del programa y diseño vigentes.",
  channel:
    "Formulario electrónico hasta 40.000 registros o presentación mediante fichero, con consulta y modificación desde los ejercicios habilitados.",
  result:
    "Información sin pago; no concede licencias ni liquida IBI, ICIO o plusvalía municipal.",
  included: [
    "Datos urbanísticos, licencias y obras en los bloques del diseño vigente.",
    "ICIO, IIVTNU, determinados inmuebles de no residentes y cambios de clasificación del suelo.",
    "Referencias catastrales, titulares, promotores, fechas e importes solo cuando se exijan.",
    "Formulario acotado, fichero, consulta y corrección de registros.",
  ],
  excluded: [
    "Solicitud o concesión de una licencia urbanística.",
    "Autoliquidaciones municipales o estatales del ciudadano.",
    "Una garantía de que todos los datos catastrales son correctos.",
    "El almacenamiento de datos urbanísticos o inmobiliarios por Factu.",
  ],
  preparation: [
    "Programa y diseño de registro del ejercicio vigente.",
    "Competencia y autorización de la entidad local declarante.",
    "Bloques de ICIO, IIVTNU, inmuebles, suelo y licencias que correspondan.",
    "Control de duplicados, registros erróneos y declaración sustitutiva.",
  ],
  commonMistakes: [
    "Pedir al propietario que presente el 995.",
    "Confundir el suministro con una licencia o un impuesto municipal.",
    "Enviar más de 40.000 registros por el formulario acotado.",
    "Publicar marzo como regla inmutable sin comprobar la campaña vigente.",
    "Completar bloques por analogía aunque no figuren en el diseño actual.",
  ],
  correction:
    "El ciudadano solicita la corrección a la entidad local que originó el dato. La entidad modifica o sustituye el suministro y el contribuyente revisa su declaración propia si procede.",
  procedureSourceId: home("995"),
  recordSourceId: record("995"),
  officialLinks: [
    {
      label: "Diseño de registro vigente del Modelo 995",
      href: "https://sede.agenciatributaria.gob.es/static_files/Sede/Disenyo_registro/DR_Resto_Mod/archivos/dr995_2025.pdf",
    },
  ],
  related: [
    {
      code: "100",
      href: "/consultor-fiscal/modelos/100",
      description:
        "Declaración personal que puede incluir información inmobiliaria.",
    },
    {
      code: "200",
      href: "/consultor-fiscal/modelos/200",
      description: "Declaración de Sociedades de entidades afectadas.",
    },
    {
      code: "210",
      href: "/consultor-fiscal/modelos/210",
      description: "Rentas inmobiliarias de no residentes.",
    },
    {
      code: "600",
      href: "/consultor-fiscal/modelos/600",
      description: "ITP y AJD en los supuestos de competencia correspondiente.",
    },
    {
      code: "650",
      href: "/consultor-fiscal/modelos/650",
      description:
        "Sucesiones cuando existe una adquisición por fallecimiento.",
    },
    {
      code: "651",
      href: "/consultor-fiscal/modelos/651",
      description: "Donaciones y adquisiciones gratuitas inter vivos.",
    },
  ],
  specificFaq: [
    {
      question: "¿Lo presenta el propietario?",
      answer: "No. Lo presenta la entidad local autorizada.",
    },
    {
      question: "¿Sustituye una licencia?",
      answer: "No. Es un suministro informativo a la AEAT.",
    },
    {
      question: "¿Qué límite tiene el formulario?",
      answer:
        "La campaña vigente publica un formulario de hasta 40.000 registros; el fichero cubre otros volúmenes.",
    },
    {
      question: "¿Qué hago si los datos del inmueble están mal?",
      answer:
        "Solicita la corrección a la entidad local que suministró la información.",
    },
  ],
  institutional: true,
});

export const MODEL_996_GUIDE_V1 = createFinalPracticalGuideV1({
  code: "996",
  category: "Gestión recaudatoria entre Administraciones",
  statusLabel: "Institucional · embargo de devoluciones",
  intro: [
    "El Modelo 996 forma parte del procedimiento mediante el que determinados organismos públicos o autoridades judiciales solicitan el embargo de devoluciones gestionadas por la AEAT.",
    "La persona cuya devolución se ve afectada no presenta el 996 para cancelar el embargo: debe atender la notificación y el recurso indicado.",
  ],
  notices: [
    {
      title: "No es un formulario del deudor",
      paragraphs: [
        "Solo lo utilizan organismos o autoridades autorizados y puede exigir incorporación institucional previa. Factu no consulta deudas, no transmite órdenes y no almacena embargos.",
      ],
    },
  ],
  declarationType: "Procedimiento institucional recaudatorio",
  presenter: "Organismo público o autoridad judicial autorizada.",
  nonPresenter:
    "No lo presenta la persona o empresa cuya devolución puede ser embargada.",
  periodicity: "Según las órdenes o remesas del organismo autorizado.",
  deadline:
    "El calendario depende del procedimiento y de la orden institucional; el afectado atiende el plazo de su notificación.",
  channel:
    "Alta institucional cuando proceda y posterior envío, consulta, corrección o anulación por los sistemas oficiales.",
  result:
    "Puede retener una devolución gestionada por la AEAT cuando existe orden válida; no extingue la deuda ni impide los recursos legales.",
  included: [
    "Organismo o autoridad embargante, deudor, NIF, deuda, importe y referencia.",
    "Orden o providencia, fechas y devolución susceptible de cruce.",
    "Alta, presentación, consulta de errores, corrección y anulación institucional.",
    "Resultado del cruce y notificación al afectado conforme al procedimiento.",
  ],
  excluded: [
    "Una solicitud del deudor para cancelar el embargo.",
    "El embargo de pagos presupuestarios de otras Administraciones, propio del 997.",
    "La eliminación automática del embargo al borrar o repetir un registro.",
    "La consulta de deudas o expedientes desde Factu.",
  ],
  preparation: [
    "Habilitación del organismo y alta institucional.",
    "Orden válida, referencia, deudor, importe y órgano competente.",
    "Diseño de fichero y controles de errores vigentes.",
    "Trazabilidad de altas, correcciones y anulaciones.",
  ],
  commonMistakes: [
    "Pedir al deudor que presente el 996.",
    "Confundir devoluciones AEAT con pagos presupuestarios del 997.",
    "Afirmar que otro 996 cancela automáticamente el embargo.",
    "Abrir el PDF de alta directamente en el navegador y confundir generar el código con presentar.",
  ],
  correction:
    "El organismo corrige o anula el registro por el cauce institucional. La persona afectada revisa la notificación y recurre ante el órgano indicado; no presenta personalmente un 996.",
  procedureSourceId: home("996"),
  recordSourceId: record("996"),
  related: [
    {
      code: "997",
      href: "/consultor-fiscal/modelos/997",
      description:
        "Procedimiento para determinados pagos presupuestarios de otras Administraciones.",
    },
  ],
  specificFaq: [
    {
      question: "¿Lo presenta la persona embargada?",
      answer: "No. Solo el organismo o autoridad autorizada.",
    },
    {
      question: "¿Puede cancelarse presentando otro 996?",
      answer:
        "No por iniciativa del deudor. Debe seguirse la corrección, anulación o recurso del procedimiento competente.",
    },
    {
      question: "¿Qué diferencia existe con el 997?",
      answer:
        "El 996 afecta a devoluciones gestionadas por la AEAT; el 997 se refiere a pagos presupuestarios de otras Administraciones.",
    },
    {
      question: "¿Cómo debe abrirse el PDF oficial de alta?",
      answer:
        "Descárgalo y ábrelo con Adobe Acrobat Reader; generar su código no equivale a presentar el alta.",
    },
  ],
  extraSections: [
    {
      id: "model-996-pdf",
      title: "Apertura del PDF oficial de alta",
      cards: [
        {
          title: "Descarga antes de abrir",
          paragraphs: [
            "Guarda el PDF oficial y ábrelo con Adobe Acrobat Reader. Chrome o Edge pueden impedir que funcione correctamente la generación del código.",
          ],
        },
        {
          title: "El código no es la presentación",
          paragraphs: [
            "El aviso de documento modificado puede deberse al código incorporado por el propio PDF. Generarlo no acredita que el alta haya sido registrada.",
          ],
        },
      ],
    },
  ],
  institutional: true,
});

export const MODEL_997_GUIDE_V1 = createFinalPracticalGuideV1({
  code: "997",
  category: "Gestión recaudatoria entre Administraciones",
  statusLabel: "Institucional · pagos presupuestarios",
  intro: [
    "El Modelo 997 permite que determinadas Administraciones comuniquen pagos presupuestarios antes de realizarlos para que la AEAT compruebe si el beneficiario tiene deudas susceptibles de embargo.",
    "La persona o empresa que va a cobrar no presenta el modelo y no puede cancelarlo desde esta ficha.",
  ],
  notices: [
    {
      title: "El cruce no significa embargo automático",
      paragraphs: [
        "El manual vigente incluye como contenido mínimo general determinados pagos de los capítulos II y VI superiores a 2.000 euros y un plazo mínimo de retención de siete días naturales. El organismo puede incluir otros pagos conforme al procedimiento.",
        "Que un pago se comunique no significa que vaya a ser embargado: la AEAT realiza el cruce y, cuando procede, emite la actuación correspondiente.",
      ],
    },
  ],
  declarationType: "Procedimiento institucional de embargo",
  presenter:
    "Comunidad autónoma, entidad local u organismo público pagador adherido.",
  nonPresenter: "No lo presenta el beneficiario del pago presupuestario.",
  periodicity: "Según las remesas y la operativa de la tesorería participante.",
  deadline:
    "El pago se mantiene durante el plazo indicado por el organismo, con mínimo general de siete días naturales en el manual vigente.",
  channel:
    "Incorporación previa y normalmente única; después, portal institucional y fichero TXT para consulta, envío y descarga.",
  result:
    "La AEAT cruza el pago con su censo de deudores y puede ordenar la retención; no todo pago comunicado resulta embargado.",
  included: [
    "Administración pagadora, tesorería, beneficiario, NIF, importe y fecha prevista.",
    "Contenido mínimo general del manual vigente: capítulos II y VI y pagos superiores a 2.000 euros.",
    "Posibilidad de incluir otros pagos por decisión del organismo.",
    "Fecha de caducidad, fichero TXT, respuesta, errores y correcciones.",
  ],
  excluded: [
    "Una declaración tributaria del beneficiario.",
    "La afirmación de que cualquier pago superior a 2.000 euros queda embargado.",
    "Las devoluciones gestionadas por la AEAT del Modelo 996.",
    "La consulta o cancelación de deudas por Factu.",
  ],
  preparation: [
    "Alta previa del organismo y certificado electrónico autorizado.",
    "Manual, diseño TXT y portal vigentes.",
    "NIF, beneficiario, importe, capítulo y fecha prevista de pago.",
    "Fecha de caducidad no inferior al mínimo del procedimiento.",
  ],
  commonMistakes: [
    "Pedir al beneficiario que presente el 997.",
    "Afirmar que superar 2.000 euros provoca embargo automático.",
    "Confundir pagos presupuestarios con devoluciones del 996.",
    "Liberar el pago antes de la fecha de caducidad o utilizar un diseño antiguo.",
  ],
  correction:
    "La Administración pagadora corrige o sustituye el fichero. El beneficiario revisa la diligencia o notificación e interpone el recurso ante el órgano indicado, no un Modelo 997.",
  procedureSourceId: home("997"),
  recordSourceId: record("997"),
  officialLinks: [
    {
      label: "Manual oficial de pagos presupuestarios",
      href: "https://sede.agenciatributaria.gob.es/static_files/Sede/Procedimiento_ayuda/ZA09/embargos.pdf",
    },
  ],
  related: [
    {
      code: "996",
      href: "/consultor-fiscal/modelos/996",
      description:
        "Procedimiento distinto para devoluciones gestionadas por la AEAT.",
    },
  ],
  specificFaq: [
    {
      question: "¿Lo presenta quien va a cobrar?",
      answer: "No. Lo presenta la Administración pública pagadora.",
    },
    {
      question: "¿Todo pago superior a 2.000 euros queda embargado?",
      answer:
        "No. Puede entrar en el suministro mínimo, pero la AEAT debe realizar el cruce y decidir si procede actuar.",
    },
    {
      question: "¿Cuánto tiempo debe mantenerse el pago?",
      answer:
        "Hasta la fecha de caducidad indicada, con un mínimo general de siete días naturales según el manual vigente.",
    },
    {
      question: "¿Qué diferencia existe con el 996?",
      answer:
        "El 997 trata pagos presupuestarios de otras Administraciones; el 996, devoluciones gestionadas por la AEAT.",
    },
  ],
  institutional: true,
});
