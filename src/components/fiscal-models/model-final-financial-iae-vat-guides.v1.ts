import { createFinalPracticalGuideV1 } from "./create-final-practical-guide.v1";

const M798_HOME = "aeat.model-798.procedure-home.2026-07-14";
const M798_RECORD = "aeat.model-798.procedure-record.2026-07-14";
const M848_HOME = "aeat.model-840-848.procedure-home.2026-07-14";
const M848_RECORD = "aeat.model-840-848.procedure-record.2026-07-14";
const M952_HOME = "aeat.model-952.procedure-home.2026-07-14";
const M952_RECORD = "aeat.model-952.procedure-record.2026-07-14";

export const MODEL_798_GUIDE_V1 = createFinalPracticalGuideV1({
  code: "798",
  category: "Histórico financiero",
  statusLabel: "Histórico · pago anticipado de 2023 y 2024",
  statusTone: "historical",
  intro: [
    "El Modelo 798 se utilizó en 2023 y 2024 para adelantar parte del antiguo gravamen temporal aplicable a determinadas entidades de crédito y establecimientos financieros.",
    "No es el pago a cuenta del impuesto financiero vigente: el sistema actual utiliza los Modelos 780 y 781.",
  ],
  notices: [
    {
      title: "No existe presentación corriente del Modelo 798",
      paragraphs: [
        "Las instrucciones oficiales limitan la obligación a los ejercicios 2023 y 2024. La página de la AEAT permanece disponible para consultas, complementarias, aportación documental y actuaciones sobre esos periodos.",
        "No utilices el umbral de 2019, el tipo del 4,8 % ni el anticipo del 50 % como reglas del impuesto financiero actual.",
      ],
    },
  ],
  declarationType: "Pago anticipado histórico",
  presenter:
    "En 2023 y 2024, determinadas entidades de crédito y establecimientos financieros que operaban en España y alcanzaban el umbral legal; en grupos, la entidad representante conforme a la Ley 38/2022.",
  nonPresenter:
    "No lo presentan autónomos, clientes bancarios ni entidades para periodos posteriores a 2024.",
  periodicity:
    "Un único pago anticipado, periodo 0A, en cada uno de 2023 y 2024.",
  deadline:
    "Primeros veinte días naturales de febrero de 2023 y de 2024. No existe campaña 2025 o 2026.",
  channel:
    "Presentación histórica electrónica con certificado, por el obligado, su apoderado o colaborador social. La sede conserva consulta y aportación para ejercicios antiguos.",
  result:
    "El pago anticipado histórico era el 50 % de la prestación calculada al 4,8 %; la liquidación final correspondía al Modelo 797.",
  included: [
    "Entidades de crédito y establecimientos financieros con actividad en España.",
    "Umbral histórico: ingresos por intereses y comisiones de 2019 iguales o superiores a 800.000.000 de euros.",
    "Tratamiento específico de grupos fiscales y grupos mercantiles.",
    "Base formada conforme a la Ley 38/2022, tipo histórico del 4,8 % y anticipo del 50 %.",
    "Consultas, complementarias y documentación de 2023 o 2024.",
  ],
  excluded: [
    "El impuesto financiero vigente de los Modelos 780 y 781.",
    "Cualquier obligación ordinaria de 2025 o 2026.",
    "La liquidación final histórica, que correspondía al Modelo 797.",
    "Una obligación nacida solo porque la página de la sede siga accesible.",
  ],
  preparation: [
    "Ejercicio 2023 o 2024 y justificante de la declaración original.",
    "Cuentas de 2019 utilizadas para comprobar el umbral histórico.",
    "Composición del grupo fiscal o mercantil y entidad representante.",
    "Margen de intereses, ingresos y gastos por comisiones conciliados.",
    "NRC, domiciliación histórica y documentación aportada.",
  ],
  commonMistakes: [
    "Presentarlo como obligación vigente o como sustituto del Modelo 781.",
    "Aplicar el 4,8 % o el umbral de 800 millones al impuesto actual.",
    "Confundir el pago anticipado 798 con la liquidación final 797.",
    "Omitir la consolidación o la entidad representante del grupo.",
    "Interpretar que un botón activo en la sede acredita vigencia material.",
  ],
  correction:
    "Consulta la declaración de 2023 o 2024 y utiliza el cauce oficial de complementaria, rectificación o aportación documental según el error; no abras una obligación corriente.",
  procedureSourceId: M798_HOME,
  recordSourceId: M798_RECORD,
  legalLinks: [
    {
      label: "Ley 38/2022 del gravamen temporal",
      sourceId: "boe.law-38-2022.model-798.2026-07-14",
    },
    {
      label: "Orden HFP/94/2023 de los Modelos 797 y 798",
      sourceId: "boe.order-hfp-94-2023.model-798.2026-07-14",
    },
  ],
  related: [
    {
      code: "797",
      href: "/consultor-fiscal/modelos/797",
      description: "Liquidación final histórica del mismo gravamen temporal.",
    },
    {
      code: "780",
      href: "/consultor-fiscal/modelos/780",
      description: "Autoliquidación del impuesto financiero vigente.",
    },
    {
      code: "781",
      href: "/consultor-fiscal/modelos/781",
      description: "Pago fraccionado del impuesto financiero vigente.",
    },
  ],
  specificFaq: [
    {
      question: "¿Sigue vigente el Modelo 798?",
      answer:
        "No como obligación corriente: las instrucciones lo limitan a 2023 y 2024.",
    },
    {
      question: "¿Cuál era el umbral?",
      answer:
        "800 millones de euros de ingresos por intereses y comisiones referidos a 2019, con las reglas de grupo previstas legalmente.",
    },
    {
      question: "¿Qué porcentajes utilizaba?",
      answer:
        "La prestación histórica aplicaba el 4,8 % y el Modelo 798 anticipaba el 50 % de la prestación resultante.",
    },
    {
      question: "¿Qué modelo contenía la liquidación final?",
      answer: "El Modelo 797, también histórico.",
    },
    {
      question: "¿Qué modelos se utilizan en el impuesto actual?",
      answer:
        "Los Modelos 780 y 781, con reglas propias que no se deducen del antiguo gravamen.",
    },
    {
      question: "¿Por qué sigue publicada la página de la AEAT?",
      answer:
        "Para consultas, correcciones, documentación y actuaciones relativas a declaraciones antiguas; no prueba vigencia en 2026.",
    },
    {
      question: "¿Puede presentarse para 2026?",
      answer: "No. No existe una obligación 798 para 2026.",
    },
  ],
  extraSections: [
    {
      id: "model-798-historical-calculation",
      title: "Cómo funcionaba el cálculo histórico",
      cards: [
        {
          title: "Prestación temporal",
          paragraphs: [
            "La base histórica partía del margen de intereses más ingresos y gastos por comisiones conforme a la Ley 38/2022; sobre ella se aplicaba el 4,8 %.",
          ],
        },
        {
          title: "Pago anticipado",
          paragraphs: [
            "El Modelo 798 adelantaba el 50 % de la prestación. La liquidación final se declaraba mediante el Modelo 797.",
          ],
        },
      ],
      note: "Estos porcentajes solo describen 2023 y 2024 y no deben reutilizarse en los Modelos 780 o 781.",
    },
  ],
  primaryActionLabel: "Consultar declaraciones históricas",
  allowCurrentFiling: false,
  filingYear: 2024,
  requiresAnnualReview: false,
});

export const MODEL_848_GUIDE_V1 = createFinalPracticalGuideV1({
  code: "848",
  category: "IAE y cifra de negocios",
  statusLabel: "Comunicación excepcional · no anual automática",
  intro: [
    "El Modelo 848 comunica a la Agencia Tributaria el importe neto de la cifra de negocios cuando ese dato es necesario para el IAE y Hacienda no lo conoce por otra declaración.",
    "No es el Modelo 840: el 840 comunica alta, variación o baja de una actividad; el 848 comunica una cifra de negocios.",
  ],
  notices: [
    {
      title: "Primero comprueba si la AEAT ya conoce la cifra",
      paragraphs: [
        "Las personas físicas no presentan el 848. Tampoco se presenta con carácter general si la cifra es inferior a un millón de euros o si ya fue comunicada mediante Sociedades, IRNR, Modelo 184 o la información del grupo.",
        "Superar un millón de euros no basta por sí solo: la comunicación se utiliza cuando existe obligación y la AEAT no dispone del dato.",
      ],
    },
  ],
  declarationType: "Comunicación censal del IAE",
  presenter:
    "Sociedades, entidades, establecimientos permanentes o grupos no exentos cuya cifra de negocios deba comunicarse y no conste ya en otra declaración oficial.",
  nonPresenter:
    "Nunca una persona física. Tampoco, con carácter general, entidades por debajo de un millón de euros o aquellas cuya cifra ya conoce la AEAT.",
  periodicity:
    "Solo cuando nace la obligación de comunicar la cifra; no es una declaración anual automática.",
  deadline:
    "Del 1 de enero al 14 de febrero del ejercicio en que deba surtir efecto.",
  channel:
    "Presentación electrónica o formulario oficial en papel, según el cauce publicado; puede actuar un representante autorizado.",
  result:
    "La cifra comunicada puede utilizarse para comprobar la exención o aplicar el coeficiente de ponderación del IAE; no constituye un alta de actividad.",
  included: [
    "Importe neto de la cifra de negocios del periodo de referencia correcto.",
    "Elevación al año de ejercicios inferiores a doce meses cuando proceda.",
    "Cifra conjunta de grupos mercantiles o fiscales conforme a las reglas aplicables.",
    "Establecimientos permanentes y entidades en atribución en los supuestos oficiales.",
  ],
  excluded: [
    "Alta, variación o baja en el IAE: corresponde al 840 o al 036 según el caso.",
    "Personas físicas, que están exentas del IAE por su propia condición.",
    "Cifras ya comunicadas correctamente mediante Sociedades, IRNR, 184 o el grupo.",
    "Una declaración de facturación del ejercicio en curso elegida sin revisar el periodo de referencia.",
  ],
  preparation: [
    "Naturaleza jurídica y condición de persona física, entidad o establecimiento permanente.",
    "Importe neto de la cifra de negocios y ejercicio de referencia.",
    "Declaraciones de Sociedades, IRNR o Modelo 184 ya presentadas.",
    "Composición del grupo y cifra conjunta cuando resulte aplicable.",
    "Periodo corto y cálculo de elevación anual, si procede.",
  ],
  commonMistakes: [
    "Presentarlo siendo autónomo persona física.",
    "Duplicar una cifra ya declarada en Sociedades o IRNR.",
    "Confundir el Modelo 848 con el alta o baja del Modelo 840.",
    "Usar la facturación de un periodo equivocado o no anualizar un ejercicio corto.",
    "Olvidar la cifra conjunta del grupo o presentarlo después del 14 de febrero.",
  ],
  correction:
    "Consulta la comunicación presentada y corrige la cifra por el cauce oficial; si el error afecta al alta, actividad o matrícula, revisa también el Modelo 840 o 036 correspondiente.",
  procedureSourceId: M848_HOME,
  recordSourceId: M848_RECORD,
  legalLinks: [
    {
      label: "Orden HAC/85/2003 del Modelo 848",
      sourceId: "boe.order-hac-85-2003.model-848.2026-07-14",
    },
  ],
  related: [
    {
      code: "840",
      href: "/consultor-fiscal/modelos/840",
      description: "Comunica altas, variaciones y bajas del IAE.",
    },
    {
      code: "036",
      href: "/consultor-fiscal/modelos/036",
      description:
        "Declaración censal utilizada, entre otros casos, por sujetos exentos del IAE.",
    },
    {
      code: "200",
      href: "/consultor-fiscal/modelos/200",
      description:
        "Sociedades puede proporcionar a la AEAT la cifra que evita duplicar el 848.",
    },
    {
      code: "220",
      href: "/consultor-fiscal/modelos/220",
      description: "Declaración consolidada relacionada con grupos fiscales.",
    },
  ],
  specificFaq: [
    {
      question: "¿Lo presenta un autónomo persona física?",
      answer:
        "No. Las personas físicas están exentas del IAE y no presentan el Modelo 848.",
    },
    {
      question: "¿Qué ocurre por debajo de un millón de euros?",
      answer:
        "La entidad está exenta por la cifra de negocios y no presenta esta comunicación por ese motivo.",
    },
    {
      question: "¿Se presenta todos los años?",
      answer:
        "No. Solo cuando existe obligación y la AEAT no conoce la cifra por otro cauce.",
    },
    {
      question: "¿Qué diferencia existe con el 840?",
      answer:
        "El 840 comunica alta, variación o baja en el IAE; el 848 comunica el importe neto de la cifra de negocios.",
    },
    {
      question: "¿Qué ocurre en un grupo?",
      answer:
        "Debe aplicarse la regla de cifra conjunta y comprobar quién ya informó el dato; no se suman entidades por intuición.",
    },
    {
      question: "¿Puede presentarse en papel?",
      answer:
        "La sede mantiene el formulario oficial y los cauces permitidos; comprueba el formato vigente antes de presentarlo.",
    },
  ],
  extraSections: [
    {
      id: "model-848-decision-guide",
      title: "Guía rápida de decisión",
      accordions: [
        {
          question: "Soy autónomo persona física",
          paragraphs: ["No presentas el Modelo 848."],
        },
        {
          question: "Tengo una sociedad por debajo de un millón",
          paragraphs: [
            "Está exenta del IAE por cifra de negocios y, con carácter general, no presenta esta comunicación.",
          ],
        },
        {
          question: "Supero el límite y ya declaré la cifra en Sociedades",
          paragraphs: [
            "Normalmente no se duplica el dato con el 848; verifica que la declaración efectivamente lo comunicó.",
          ],
        },
        {
          question: "Quiero dar de alta o baja una actividad",
          paragraphs: [
            "Revisa el Modelo 840 o el 036. El 848 no produce el alta ni la baja.",
          ],
        },
      ],
    },
  ],
  primaryActionLabel: "Comprobar si debo comunicar la cifra",
});

export const MODEL_952_GUIDE_V1 = createFinalPracticalGuideV1({
  code: "952",
  category: "IVA y facturas impagadas",
  statusLabel: "Alta relevancia para autónomos · revisión caso a caso",
  intro: [
    "El Modelo 952 comunica a la AEAT que un acreedor ha modificado la base imponible y el IVA de una factura por concurso del cliente o por un crédito que cumple todos los requisitos de incobrable.",
    "No basta con que la factura esté vencida: deben cumplirse los plazos, la reclamación, la factura rectificativa, el registro y el ajuste del IVA.",
  ],
  notices: [
    {
      title: "La comunicación es solo una pieza del procedimiento",
      paragraphs: [
        "Debes emitir y remitir la factura rectificativa, registrarla en los libros o en el SII cuando corresponda, presentar el Modelo 952 dentro del mes siguiente a su expedición y reflejar el ajuste en el Modelo 303.",
        "Presentar el 952 no garantiza la recuperación del IVA ni corrige por sí solo la factura, los libros o la autoliquidación.",
      ],
    },
    {
      title: "Los plazos de concurso y crédito incobrable son distintos",
      paragraphs: [
        "No apliques una regla antigua o genérica. Comprueba la Ley del IVA, su Reglamento y la normativa concursal vigentes para las fechas exactas del caso.",
      ],
    },
  ],
  declarationType: "Comunicación electrónica de modificación de IVA",
  presenter:
    "El acreedor sujeto pasivo que modifica la base imponible por concurso o crédito incobrable y cumple acumulativamente todos los requisitos legales.",
  nonPresenter:
    "No cualquier empresa con una factura vencida, ni quien no haya reclamado el cobro cuando es obligatorio, ni quien esté fuera de plazo o ante un crédito excluido.",
  periodicity:
    "No periódica: una comunicación vinculada a cada modificación y a sus facturas rectificativas.",
  deadline:
    "Dentro del mes siguiente a la fecha de expedición de la factura rectificativa, sin confundirlo con el plazo previo para emitirla.",
  channel:
    "Formulario electrónico de la AEAT, con aportación previa o asociada de la factura rectificativa y documentos que acreditan el supuesto y la reclamación.",
  result:
    "Comunica la reducción practicada; el efecto en IVA se coordina con factura rectificativa, libros o SII y Modelo 303. No origina una transferencia automática.",
  included: [
    "Créditos incobrables que cumplen todos los requisitos del artículo 80 de la Ley del IVA.",
    "Modificaciones vinculadas a un procedimiento concursal o de insolvencia admitido por la norma.",
    "Impago total o parcial correctamente facturado, contabilizado y reclamado.",
    "Factura rectificativa expedida y remitida dentro del plazo aplicable.",
    "Documentación complementaria y registro del ajuste en libros o SII.",
  ],
  excluded: [
    "Una factura simplemente vencida o una promesa de impago del cliente.",
    "La parte garantizada, afianzada o asegurada de un crédito.",
    "Créditos entre personas o entidades vinculadas.",
    "Operaciones excluidas por localización o sin reclamación acreditable.",
    "El ajuste del Modelo 303 y del SII, que siguen siendo obligaciones separadas.",
  ],
  preparation: [
    "Factura original y factura rectificativa con su acreditación de envío.",
    "Libro registro de facturas expedidas y registro SII cuando corresponda.",
    "Reclamación judicial, requerimiento notarial u otra prueba fehaciente admitida.",
    "Documentación del concurso y datos de la administración concursal, si aplica.",
    "Contrato, vencimientos, cobros parciales, garantías, seguros y vinculaciones.",
    "Modelo 303 del periodo afectado y justificante del Modelo 952.",
  ],
  commonMistakes: [
    "Presentar por cualquier factura impagada o sin esperar el periodo legal.",
    "Emitir tarde la factura rectificativa o comunicarla pasado el mes.",
    "No reclamar el cobro o no conservar una prueba fehaciente.",
    "No remitir la factura al cliente o a la administración concursal cuando corresponda.",
    "No registrar el ajuste en SII o no reflejarlo en el Modelo 303.",
    "Reducir partes aseguradas, garantizadas o vinculadas.",
    "Duplicar una comunicación o ignorar un cobro posterior.",
  ],
  correction:
    "Consulta la comunicación presentada y la documentación asociada. Corrige de forma coordinada la factura rectificativa, el SII o libros y el Modelo 303; ante cobros posteriores o cambios concursales, revisa si debe aumentarse de nuevo la base.",
  procedureSourceId: M952_HOME,
  recordSourceId: M952_RECORD,
  legalLinks: [
    {
      label: "Artículo 24 del Reglamento del IVA",
      sourceId: "boe.riva.model-952.2026-07-14",
    },
    {
      label: "Artículo 80 de la Ley del IVA",
      href: "https://www.boe.es/buscar/act.php?id=BOE-A-1992-28740",
    },
  ],
  officialLinks: [
    {
      label: "Procedimiento oficial para recuperar IVA impagado",
      href: "https://sede.agenciatributaria.gob.es/Sede/iva/necesito-rectificar-iva-repercutido_iva-soportado/puedo-recuperar-iva-impagado-clientes/que-procedimiento-debe-seguirse-modificar-imponible.html",
    },
  ],
  related: [
    {
      code: "303",
      href: "/consultor-fiscal/modelos/303",
      description:
        "Autoliquidación en la que debe reflejarse el ajuste de IVA del periodo correspondiente.",
    },
    {
      code: "390",
      href: "/consultor-fiscal/modelos/390",
      description:
        "Resumen anual que debe ser coherente con los periodos de IVA declarados.",
    },
  ],
  specificFaq: [
    {
      question: "¿Basta con que el cliente no pague?",
      answer:
        "No. Deben cumplirse conjuntamente espera, registro, reclamación, factura rectificativa, comunicación y demás requisitos legales.",
    },
    {
      question: "¿Cuánto tiempo hay que esperar?",
      answer:
        "La regla general es un año; determinados empresarios con volumen del año anterior no superior a 6.010.121,04 euros pueden optar por seis meses o un año. Revisa además reglas especiales de plazos y criterio de caja.",
    },
    {
      question: "¿Qué ocurre si el cliente es un particular?",
      answer:
        "Para el supuesto de crédito incobrable, la base imponible de la operación debe superar 50 euros, además de cumplirse el resto de requisitos.",
    },
    {
      question: "¿Tengo que reclamar judicialmente?",
      answer:
        "Debe existir reclamación judicial, requerimiento notarial u otro medio fehaciente admitido por la redacción vigente; guarda la prueba completa.",
    },
    {
      question: "¿Qué plazo tengo para presentar el 952?",
      answer:
        "Un mes desde la fecha de expedición de la factura rectificativa.",
    },
    {
      question: "¿Debo modificar el Modelo 303?",
      answer:
        "Sí, en el periodo que corresponda. El 952 no sustituye la autoliquidación.",
    },
    {
      question: "¿Qué ocurre si llevo SII?",
      answer:
        "La factura rectificativa y su causa deben registrarse correctamente en el SII; la comunicación 952 no reemplaza ese registro.",
    },
    {
      question: "¿Puedo modificar un crédito asegurado?",
      answer:
        "No la parte cubierta. Debe separarse cualquier parte no cubierta y verificar el resto de requisitos.",
    },
    {
      question: "¿Qué ocurre si cobro después?",
      answer:
        "Puede existir obligación de volver a aumentar la base imponible según el supuesto; revisa factura, SII y 303 de forma coordinada.",
    },
    {
      question: "¿La presentación garantiza que recuperaré el IVA?",
      answer:
        "No. La AEAT puede comprobar requisitos y documentación; tampoco produce una devolución bancaria inmediata.",
    },
  ],
  extraSections: [
    {
      id: "model-952-timeline",
      title: "Línea temporal del crédito incobrable",
      cards: [
        {
          title: "1. Devengo y espera",
          paragraphs: [
            "Desde el devengo, espera el periodo legal: un año con carácter general o la opción de seis meses o un año para quienes cumplen el límite de volumen.",
          ],
        },
        {
          title: "2. Rectificación",
          paragraphs: [
            "Tras concluir la espera, la factura rectificativa debe expedirse dentro de los seis meses siguientes y remitirse al destinatario.",
          ],
        },
        {
          title: "3. Comunicación",
          paragraphs: [
            "Presenta el Modelo 952 dentro del mes siguiente a la expedición de la factura rectificativa y aporta la documentación obligatoria.",
          ],
        },
        {
          title: "4. IVA declarado",
          paragraphs: [
            "Registra la rectificación en libros o SII y refleja el ajuste en el Modelo 303 del periodo correspondiente.",
          ],
        },
      ],
      note: "Esta secuencia no es un calculador de fechas. Concurso, operaciones a plazos y criterio de caja tienen reglas específicas.",
    },
    {
      id: "model-952-concurso",
      title: "Cuando el deudor está en concurso",
      accordions: [
        {
          question: "¿Qué debe comprobarse?",
          paragraphs: [
            "La existencia del procedimiento, la fecha relevante y el plazo vigente para expedir la rectificativa conforme a la Ley del IVA, su Reglamento y la normativa concursal.",
          ],
          bullets: [
            "Remisión al destinatario y, cuando proceda, a la administración concursal.",
            "Comunicación dentro del mes desde la factura.",
            "Revisión posterior si se revoca el concurso, se cobra, se desiste o se alcanza un acuerdo.",
          ],
        },
      ],
    },
    {
      id: "model-952-recipient",
      title: "Obligaciones del destinatario",
      cards: [
        {
          title: "Destinatario empresario o profesional",
          paragraphs: [
            "Puede tener que minorar el IVA deducido en su autoliquidación y comunicar la recepción de las facturas rectificativas por el cauce oficial.",
          ],
        },
        {
          title: "No confundir responsabilidades",
          paragraphs: [
            "La obligación del deudor es distinta de la del acreedor. Su falta de actuación no sustituye la comprobación de que el acreedor cumplió correctamente sus propios requisitos.",
          ],
        },
      ],
    },
  ],
  primaryActionLabel: "Comprobar requisitos del Modelo 952",
});
