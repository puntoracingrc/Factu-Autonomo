import type {
  DiagnosticQuestion,
  DiagnosticQuestionSection,
  DiagnosticVatRegime,
  FourWayAnswer,
  TaxpayerProfile,
} from "./contracts";

export const QUESTION_SECTIONS: readonly DiagnosticQuestionSection[] = [
  { sectionId: "A", shortLabel: "Quién factura", title: "Quién realiza la actividad", description: "Separamos a la persona física de cualquier sociedad o entidad." },
  { sectionId: "B", shortLabel: "Ejercicio", title: "Ejercicio y fechas", description: "Las reglas y los períodos dependen del año y de cuándo estuvo activa la actividad." },
  { sectionId: "C", shortLabel: "Actividad", title: "Tipo de actividad", description: "Una misma persona puede desarrollar actividades con tratamientos distintos." },
  { sectionId: "D", shortLabel: "IRPF", title: "IRPF y pagos fraccionados", description: "Determinamos si hay estimación directa, módulos o atribución de rentas." },
  { sectionId: "E", shortLabel: "IVA", title: "IVA y regímenes", description: "Distinguimos régimen general, especiales, exención y operaciones no sujetas." },
  { sectionId: "F", shortLabel: "Retenciones", title: "Empleados y profesionales", description: "Importa lo que pagas como retenedor, no las retenciones de tus facturas emitidas." },
  { sectionId: "G", shortLabel: "Alquiler", title: "Alquileres de la actividad", description: "Comprobamos si pagas un alquiler urbano sujeto a retención." },
  { sectionId: "H", shortLabel: "Exterior", title: "Capital y no residentes", description: "Los pagos al extranjero requieren conocer la clase de renta y el convenio." },
  { sectionId: "I", shortLabel: "UE", title: "Operaciones intracomunitarias", description: "Separamos bienes, servicios, compras, ventas y el alta efectiva en ROI." },
  { sectionId: "J", shortLabel: "OSS", title: "Ventas a consumidores europeos", description: "Revisamos ventas B2C y el uso de OSS o IOSS." },
  { sectionId: "K", shortLabel: "Terceros", title: "Operaciones con terceros", description: "El umbral no basta: existen operaciones y sujetos excluidos." },
  { sectionId: "L", shortLabel: "Entidad", title: "Sociedades y entidades", description: "Las obligaciones de la entidad se muestran separadas de las personales." },
  { sectionId: "M", shortLabel: "Personales", title: "Obligaciones personales complementarias", description: "Se muestran aparte de los modelos propios de la actividad." },
  { sectionId: "N", shortLabel: "Cambios", title: "Cambios durante el ejercicio", description: "Un cambio puede exigir una declaración censal con fecha de efecto." },
] as const;

const FOUR_WAY_OPTIONS = [
  { value: "YES", label: "Sí" },
  { value: "NO", label: "No" },
  { value: "UNKNOWN", label: "No lo sé" },
  { value: "NOT_APPLICABLE", label: "No aplica" },
] as const;

function question(
  input: Omit<DiagnosticQuestion, "required"> & { required?: boolean },
): DiagnosticQuestion {
  return { ...input, required: input.required ?? true };
}

function fourWay(
  input: Omit<DiagnosticQuestion, "kind" | "options" | "required"> & {
    required?: boolean;
  },
): DiagnosticQuestion {
  return question({ ...input, kind: "FOUR_WAY", options: FOUR_WAY_OPTIONS });
}

export const DIAGNOSTIC_QUESTIONS: readonly DiagnosticQuestion[] = [
  question({
    questionId: "A_INVOICING_SUBJECT",
    sectionId: "A",
    field: "invoicingSubject",
    kind: "CHOICE",
    label: "¿Quién emite realmente las facturas?",
    explanation: "El nombre que aparece como emisor determina quién es el posible obligado.",
    why: "Evita atribuir a un autónomo societario los modelos que corresponden a su sociedad.",
    affectedModels: ["100", "130", "131", "184", "200", "202", "303"],
    example: "Si las facturas llevan el NIF de una SL, el sujeto es la sociedad aunque su administrador esté en RETA.",
    supportingDocument: "Una factura emitida reciente, NIF de la entidad o certificado censal actual.",
    options: [
      { value: "NATURAL_PERSON", label: "Persona física" },
      { value: "COMPANY", label: "Sociedad limitada u otra sociedad" },
      { value: "COMMUNITY_OF_PROPERTY", label: "Comunidad de bienes" },
      { value: "CIVIL_PARTNERSHIP", label: "Sociedad civil" },
      { value: "OTHER_ENTITY", label: "Otra entidad" },
      { value: "UNKNOWN", label: "No lo sé" },
    ],
  }),
  question({
    questionId: "A_TAXPAYER_ROLE",
    sectionId: "A",
    field: "taxpayerRole",
    kind: "CHOICE",
    label: "¿Cuál describe mejor tu relación con la actividad?",
    explanation: "RETA y la forma de facturar no significan siempre lo mismo.",
    why: "Separa las obligaciones personales de las de una entidad.",
    affectedModels: ["100", "130", "131", "184", "200"],
    example: "Una administradora de una SL puede ser autónoma societaria sin facturar personalmente.",
    supportingDocument: "Informe de situación actual en RETA y documentación de la entidad.",
    options: [
      { value: "INDIVIDUAL_SELF_EMPLOYED", label: "Autónomo individual" },
      { value: "CORPORATE_SELF_EMPLOYED", label: "Autónomo societario" },
      { value: "COLLABORATING_SELF_EMPLOYED", label: "Autónomo colaborador" },
      { value: "PARTNER_OR_COMMUNITY_MEMBER", label: "Socio o comunero" },
      { value: "DIRECTOR", label: "Administrador" },
      { value: "SEVERAL", label: "Varias de las anteriores" },
      { value: "UNKNOWN", label: "No lo sé" },
    ],
  }),
  fourWay({
    questionId: "A_PERSONAL_ACTIVITY",
    sectionId: "A",
    field: "hasPersonalActivity",
    label: "¿Tienes además una actividad que facturas personalmente?",
    explanation: "Una segunda actividad personal puede generar modelos distintos a los de la sociedad.",
    why: "Permite analizar por separado a la persona y a la entidad.",
    affectedModels: ["100", "130", "131", "303"],
    example: "Eres administrador de una SL y también impartes formación con tu propio NIF.",
    supportingDocument: "Facturas emitidas personalmente y situación censal de la persona.",
    applicability: "Se pregunta especialmente cuando factura una entidad.",
  }),
  question({
    questionId: "B_FISCAL_YEAR",
    sectionId: "B",
    field: "fiscalYear",
    kind: "CHOICE",
    label: "¿Qué ejercicio fiscal quieres analizar?",
    explanation: "Cada ejercicio usa su propia versión de reglas y calendario.",
    why: "Umbrales, exoneraciones y plazos pueden cambiar de un año a otro.",
    affectedModels: ["036", "100", "130", "131", "303", "390"],
    example: "Para declaraciones de operaciones realizadas en 2025, elige 2025 aunque algunas se presenten en 2026.",
    supportingDocument: "Declaraciones y libros del ejercicio elegido.",
    options: [
      { value: "2026", label: "2026" },
      { value: "2025", label: "2025" },
    ],
  }),
  question({
    questionId: "B_TERRITORY",
    sectionId: "B",
    field: "territory",
    kind: "CHOICE",
    label: "¿Cuál es el territorio fiscal de la actividad?",
    explanation: "IVA estatal, IGIC, IPSI y sistemas forales no deben mezclarse.",
    why: "Es la primera puerta del motor territorial.",
    affectedModels: ["036", "130", "303", "390"],
    example: "Una actividad establecida en Canarias no debe recibir automáticamente modelos estatales de IVA.",
    supportingDocument: "Domicilio fiscal y lugares de actividad en la situación censal actual.",
    options: [
      { value: "ES_COMMON", label: "Territorio común AEAT" },
      { value: "ES_CANARY", label: "Canarias" },
      { value: "ES_NAVARRA", label: "Navarra" },
      { value: "ES_BASQUE_ALAVA", label: "País Vasco · Álava" },
      { value: "ES_BASQUE_BIZKAIA", label: "País Vasco · Bizkaia" },
      { value: "ES_BASQUE_GIPUZKOA", label: "País Vasco · Gipuzkoa" },
      { value: "ES_CEUTA", label: "Ceuta" },
      { value: "ES_MELILLA", label: "Melilla" },
      { value: "NON_RESIDENT", label: "No residente" },
      { value: "UNCERTAIN", label: "Situación territorial dudosa" },
      { value: "UNKNOWN", label: "No lo sé" },
    ],
  }),
  question({
    questionId: "B_START_DATE",
    sectionId: "B",
    field: "activityStartDate",
    kind: "DATE",
    label: "¿Cuándo comenzó la actividad dentro del ejercicio?",
    explanation: "La fecha permite limitar modelos a los meses o trimestres activos.",
    why: "No todas las obligaciones aplican al ejercicio completo.",
    affectedModels: ["036", "111", "115", "130", "131", "303"],
    example: "Un alta el 15 de mayo puede afectar desde el segundo trimestre.",
    supportingDocument: "Situación censal o 036 de alta con fecha de efecto.",
    required: false,
  }),
  question({
    questionId: "B_END_DATE",
    sectionId: "B",
    field: "activityEndDate",
    kind: "DATE",
    label: "¿Cuándo cesó la actividad, si cesó?",
    explanation: "El cese puede cerrar obligaciones periódicas y exigir una modificación censal.",
    why: "Evita mostrar períodos posteriores al cese como si siguieran activos.",
    affectedModels: ["036", "111", "115", "130", "131", "303"],
    example: "Un cese el 30 de junio limita normalmente el análisis a los dos primeros trimestres.",
    supportingDocument: "036 de baja o situación censal posterior.",
    required: false,
  }),
  fourWay({
    questionId: "B_RETA",
    sectionId: "B",
    field: "retaDuringYear",
    label: "¿Estuviste de alta en RETA en algún momento del ejercicio?",
    explanation: "Basta un período de alta para que pueda existir obligación anual de IRPF.",
    why: "Afecta a una obligación personal, incluso si la actividad duró poco.",
    affectedModels: ["100"],
    example: "Alta de enero a marzo y baja el resto del año.",
    supportingDocument: "Informe de situación actual o vida laboral.",
  }),
  question({
    questionId: "C_ACTIVITY_KINDS",
    sectionId: "C",
    field: "activityKinds",
    kind: "MULTI_CHOICE",
    label: "¿Qué tipos de actividad desarrollaste?",
    explanation: "Puedes seleccionar varias si tienen naturaleza distinta.",
    why: "La excepción de retenciones y algunos regímenes no se aplican igual a todas.",
    affectedModels: ["130", "131", "303", "347"],
    example: "Servicios profesionales y una tienda online pueden convivir.",
    supportingDocument: "Relación actual de actividades y epígrafes IAE.",
    options: [
      { value: "PROFESSIONAL", label: "Profesional" },
      { value: "BUSINESS", label: "Empresarial" },
      { value: "AGRICULTURE", label: "Agrícola" },
      { value: "LIVESTOCK", label: "Ganadera" },
      { value: "FORESTRY", label: "Forestal" },
      { value: "OTHER", label: "Otra o no lo sé" },
    ],
  }),
  question({
    questionId: "D_INCOME_TAX_REGIME",
    sectionId: "D",
    field: "incomeTaxRegime",
    kind: "CHOICE",
    label: "¿Cómo determinas el rendimiento en IRPF?",
    explanation: "Estimación directa y objetiva utilizan pagos fraccionados distintos.",
    why: "Distingue los modelos 130 y 131 y los casos de entidad.",
    affectedModels: ["130", "131", "184"],
    example: "Una actividad en módulos usa estimación objetiva.",
    supportingDocument: "Situación censal actual o apartado de IRPF del 036.",
    options: [
      { value: "DIRECT_SIMPLIFIED", label: "Estimación directa simplificada" },
      { value: "DIRECT_NORMAL", label: "Estimación directa normal" },
      { value: "OBJECTIVE_ESTIMATION", label: "Estimación objetiva (módulos)" },
      { value: "ENTITY_ATTRIBUTION", label: "Actividad mediante entidad en atribución" },
      { value: "NOT_APPLICABLE", label: "No aplica a este sujeto" },
      { value: "UNKNOWN", label: "No lo sé" },
    ],
  }),
  question({
    questionId: "D_WITHHELD_PERCENT",
    sectionId: "D",
    field: "withheldIncomePercent",
    kind: "PERCENTAGE",
    label: "¿Qué porcentaje real de ingresos de la actividad estuvo sometido a retención?",
    explanation: "Se calcula sobre ingresos, no sobre número de facturas.",
    why: "La regla del 70 % puede excluir pagos fraccionados en actividades concretas.",
    affectedModels: ["130", "131"],
    example: "7.500 € retenidos sobre 10.000 € de ingresos equivalen al 75 %.",
    supportingDocument: "Libro de facturas emitidas del año anterior o del período si es inicio.",
    applicability: "Solo cuando hay actividad profesional, agrícola, ganadera o forestal.",
    required: false,
  }),
  question({
    questionId: "E_VAT_REGIMES",
    sectionId: "E",
    field: "vatRegimes",
    kind: "MULTI_CHOICE",
    label: "¿Qué regímenes o tratamientos de IVA aplican a tus actividades?",
    explanation: "Selecciona todos los que existan; una actividad puede estar exenta y otra sujeta.",
    why: "Determina las autoliquidaciones periódicas y los casos no periódicos.",
    affectedModels: ["303", "309", "390"],
    example: "Formación exenta y consultoría en régimen general.",
    supportingDocument: "Situación censal y detalle de actividades.",
    options: [
      { value: "GENERAL", label: "Régimen general" },
      { value: "SIMPLIFIED", label: "Régimen simplificado" },
      { value: "EQUIVALENCE_SURCHARGE", label: "Recargo de equivalencia" },
      { value: "AGRICULTURE_LIVESTOCK_FISHING", label: "Agricultura, ganadería y pesca" },
      { value: "CASH_ACCOUNTING", label: "Criterio de caja" },
      { value: "EXEMPT", label: "Actividad exenta" },
      { value: "NOT_SUBJECT", label: "Actividad no sujeta" },
      { value: "OTHER_SPECIAL", label: "Otro régimen o no lo sé" },
    ],
  }),
  fourWay({ questionId: "E_REDEME", sectionId: "E", field: "redeme", label: "¿Estuviste inscrito en REDEME?", explanation: "REDEME suele implicar liquidación mensual.", why: "Afecta a periodicidad y revisión del resumen anual.", affectedModels: ["303", "390"], example: "Inscripción en el registro de devolución mensual.", supportingDocument: "Situación censal o acuerdo de inscripción." }),
  fourWay({ questionId: "E_SII", sectionId: "E", field: "sii", label: "¿Llevaste los libros de IVA mediante SII?", explanation: "El SII modifica obligaciones informativas y periodicidad.", why: "Puede excluir el 347 y el 390.", affectedModels: ["303", "347", "390"], example: "Envío electrónico casi inmediato de registros de facturación.", supportingDocument: "Situación censal y configuración SII." }),
  fourWay({ questionId: "E_LARGE_COMPANY", sectionId: "E", field: "largeCompany", label: "¿Tenías condición de gran empresa?", explanation: "La condición censal puede cambiar la periodicidad a mensual.", why: "Afecta a IVA y retenciones.", affectedModels: ["111", "115", "123", "216", "303"], example: "La cifra relevante y su fecha deben constar en el censo.", supportingDocument: "Situación censal actual." }),
  fourWay({ questionId: "E_390_EXEMPT", sectionId: "E", field: "vatAnnualSummaryExempt", label: "¿Consta que estás exonerado de presentar el resumen anual de IVA?", explanation: "Presentar 303 no implica siempre presentar 390.", why: "Evita añadir automáticamente el resumen anual.", affectedModels: ["390"], example: "Determinados liquidadores trimestrales o sujetos en SII pueden estar exonerados.", supportingDocument: "Instrucciones del ejercicio y situación censal.", applicability: "Cuando existe autoliquidación periódica de IVA." }),
  fourWay({ questionId: "E_REVERSE_CHARGE", sectionId: "E", field: "reverseChargeTransactions", label: "¿Tuviste operaciones con inversión del sujeto pasivo?", explanation: "Algunas compras o entregas cambian quién declara el IVA.", why: "Puede afectar al 303 o al 309.", affectedModels: ["303", "309"], example: "Un servicio recibido de un proveedor extranjero.", supportingDocument: "Facturas recibidas y libro de IVA." }),
  fourWay({ questionId: "E_SPECIAL_REFUND", sectionId: "E", field: "specialVatRefundSituation", label: "¿Tuviste alguna devolución o compensación especial de IVA?", explanation: "Los modelos 308 y 341 solo cubren supuestos específicos.", why: "No deben añadirse por el mero hecho de presentar IVA.", affectedModels: ["308", "341"], example: "Reintegro de compensaciones en el régimen agrario.", supportingDocument: "Justificante de la operación y régimen aplicable." }),
  fourWay({ questionId: "F_EMPLOYEES", sectionId: "F", field: "employees", label: "¿Pagaste nóminas o retribuciones de trabajo?", explanation: "Quien paga la renta y practica la retención presenta el modelo.", why: "Activa retenciones periódicas y resumen anual.", affectedModels: ["111", "190"], example: "Una nómina pagada durante un solo trimestre.", supportingDocument: "Nóminas y resumen de trabajadores." }),
  fourWay({ questionId: "F_PROFESSIONALS", sectionId: "F", field: "paidProfessionalsWithWithholding", label: "¿Pagaste facturas de profesionales con retención?", explanation: "Se pregunta por facturas recibidas, no por tus facturas emitidas.", why: "El pagador que retiene puede presentar 111 y 190.", affectedModels: ["111", "190"], example: "Factura de asesoría con retención de IRPF.", supportingDocument: "Facturas recibidas y justificantes de pago." }),
  fourWay({ questionId: "F_OTHER_WITHHOLDING", sectionId: "F", field: "otherIrpfWithholdingPayments", label: "¿Pagaste otras rentas sujetas a retención de trabajo o actividad?", explanation: "Incluye premios y ciertos rendimientos de actividades económicas.", why: "Completa el análisis del retenedor.", affectedModels: ["111", "190"], example: "Un premio sujeto a retención.", supportingDocument: "Libro de retenciones y justificantes." }),
  fourWay({ questionId: "G_RENTS_PREMISES", sectionId: "G", field: "rentsBusinessPremises", label: "¿Alquilaste un local, oficina, despacho, nave u otro inmueble urbano para la actividad?", explanation: "No todos los alquileres generan retención.", why: "Es la puerta para analizar 115 y 180.", affectedModels: ["115", "180"], example: "Despacho alquilado a un propietario residente.", supportingDocument: "Contrato y facturas de alquiler." }),
  fourWay({ questionId: "G_RENT_WITHHOLDING", sectionId: "G", field: "rentSubjectToWithholding", label: "¿La renta estaba sujeta a retención?", explanation: "Debe comprobarse en la factura y en las excepciones oficiales.", why: "Sin retención aplicable no se concluye 115.", affectedModels: ["115", "180"], example: "La factura separa base, IVA y retención.", supportingDocument: "Factura reciente del arrendador.", applicability: "Solo si existe alquiler de inmueble urbano." }),
  fourWay({ questionId: "G_LANDLORD_EXEMPTION", sectionId: "G", field: "landlordWithholdingExemption", label: "¿El arrendador acreditó una exoneración de retención?", explanation: "La exoneración debe acreditarse; no se presume.", why: "Puede excluir 115 y 180 pese a existir alquiler.", affectedModels: ["115", "180"], example: "Certificado vigente del arrendador.", supportingDocument: "Certificado de exoneración y fecha de vigencia.", applicability: "Solo si hay alquiler." }),
  fourWay({ questionId: "H_CAPITAL", sectionId: "H", field: "paidCapitalIncome", label: "¿Pagaste intereses u otros rendimientos de capital sujetos a retención?", explanation: "Hay excepciones y modelos específicos según la renta.", why: "Permite analizar 123 y 193 sin confundirlos con cualquier pago financiero.", affectedModels: ["123", "193"], example: "Intereses pagados por un préstamo privado.", supportingDocument: "Contrato, liquidación y certificado de retenciones." }),
  fourWay({ questionId: "H_NON_RESIDENT", sectionId: "H", field: "paidNonResidentIncome", label: "¿Pagaste rentas a una persona o empresa no residente?", explanation: "Una factura extranjera no genera automáticamente el modelo 216.", why: "Hay que conocer país, renta, establecimiento y convenio.", affectedModels: ["216", "296"], example: "Cánones pagados a una empresa no residente.", supportingDocument: "Factura, certificado de residencia y convenio aplicable." }),
  fourWay({ questionId: "H_NON_RESIDENT_CONFIRMED", sectionId: "H", field: "nonResidentWithholdingConfirmed", label: "¿Está confirmado que debías declarar esa renta como retenedor en España?", explanation: "Esta confirmación exige revisar la renta y el convenio.", why: "Evita añadir 216 por cualquier proveedor extranjero.", affectedModels: ["216", "296"], example: "Revisión profesional con certificado de residencia fiscal.", supportingDocument: "Certificado fiscal y análisis del convenio.", applicability: "Solo si pagaste rentas a no residentes." }),
  fourWay({ questionId: "I_EU_GOODS_SALES", sectionId: "I", field: "euGoodsSales", label: "¿Vendiste bienes a empresas de otros países de la UE?", explanation: "Bienes y servicios tienen reglas distintas.", why: "Puede afectar ROI, 349 e IVA.", affectedModels: ["036", "303", "349"], example: "Mercancía enviada desde España a una empresa francesa.", supportingDocument: "Facturas, transporte y validación VIES." }),
  fourWay({ questionId: "I_EU_GOODS_PURCHASES", sectionId: "I", field: "euGoodsPurchases", label: "¿Compraste bienes a empresas de otros países de la UE?", explanation: "La adquisición puede exigir autorrepercusión y declaración recapitulativa.", why: "Afecta 303 o 309 y 349.", affectedModels: ["303", "309", "349"], example: "Compra de mercancía a un proveedor alemán.", supportingDocument: "Factura y libro de IVA." }),
  fourWay({ questionId: "I_EU_SERVICES_SALES", sectionId: "I", field: "euServicesSales", label: "¿Prestaste servicios a empresas de otros países de la UE?", explanation: "Hay que confirmar localización y NIF-IVA del cliente.", why: "Puede afectar ROI, 349 e IVA.", affectedModels: ["036", "303", "349"], example: "Consultoría B2B a una empresa italiana con VAT válido.", supportingDocument: "Factura y consulta VIES." }),
  fourWay({ questionId: "I_EU_SERVICES_PURCHASES", sectionId: "I", field: "euServicesPurchases", label: "¿Recibiste servicios de empresas de otros países de la UE?", explanation: "Incluye publicidad, software, comisiones y alojamiento web.", why: "Puede existir inversión del sujeto pasivo y 349.", affectedModels: ["303", "309", "349"], example: "Publicidad facturada por una plataforma irlandesa.", supportingDocument: "Facturas de plataformas y suscripciones." }),
  fourWay({ questionId: "I_ROI", sectionId: "I", field: "roiRegistered", label: "¿Estabas dado de alta efectivamente en ROI y tenías NIF-IVA válido?", explanation: "Solicitar el alta no equivale siempre a estar incluido.", why: "Detecta discrepancias censales y no genera 349 sin operaciones.", affectedModels: ["036", "349"], example: "El NIF aparece como válido en VIES en la fecha de la operación.", supportingDocument: "Situación censal y consulta VIES." }),
  fourWay({ questionId: "J_EU_CONSUMERS", sectionId: "J", field: "euConsumerSales", label: "¿Vendiste bienes o servicios a consumidores de otros países europeos?", explanation: "B2C puede activar reglas de destino y ventanilla única.", why: "Es la puerta para analizar 035 y 369.", affectedModels: ["035", "369"], example: "Descargas o suscripciones vendidas a particulares franceses.", supportingDocument: "Ventas por país de consumo y tipo de cliente." }),
  fourWay({ questionId: "J_OSS", sectionId: "J", field: "ossRegistered", label: "¿Estabas acogido a OSS o IOSS?", explanation: "La inscripción y el régimen concreto deben estar confirmados.", why: "Distingue la declaración 369 de posibles obligaciones fuera de España.", affectedModels: ["035", "369"], example: "Alta en régimen de la Unión mediante formulario 035.", supportingDocument: "Justificante 035 y declaraciones 369 previas.", applicability: "Solo si hubo ventas a consumidores europeos." }),
  fourWay({ questionId: "K_THRESHOLD", sectionId: "K", field: "thirdPartyThresholdExceeded", label: "¿Superaste el umbral anual por algún cliente o proveedor?", explanation: "Debe calcularse por persona o entidad y según la regla del ejercicio.", why: "Es un indicio para el 347, no una conclusión automática.", affectedModels: ["347"], example: "Suma anual de operaciones con un proveedor por encima del umbral oficial.", supportingDocument: "Libro mayor o listado anual por tercero." }),
  fourWay({ questionId: "K_ALL_EXCLUDED", sectionId: "K", field: "thirdPartyOperationsAllExcluded", label: "¿Todas esas operaciones ya estaban excluidas del 347?", explanation: "Retenciones, operaciones UE, SII y otros supuestos pueden excluir información.", why: "Evita declarar dos veces o incluir operaciones no declarables.", affectedModels: ["347"], example: "Operaciones ya informadas en 349 o durante todo el año por SII.", supportingDocument: "Desglose por tipo de operación y modelos informativos." }),
  fourWay({ questionId: "L_COMPANY_INSTALLMENTS", sectionId: "L", field: "companyInstallmentPayments", label: "¿La sociedad debía efectuar pagos fraccionados del Impuesto sobre Sociedades?", explanation: "El modelo 202 tiene excepciones y modalidades propias.", why: "No se añade automáticamente a toda sociedad.", affectedModels: ["202"], example: "Revisión de cifra de negocios, tipo y modalidad del artículo 40 LIS.", supportingDocument: "Modelo 200 anterior, cifra de negocios y situación censal.", applicability: "Solo cuando factura una sociedad." }),
  fourWay({ questionId: "L_ATTRIBUTION_THRESHOLD", sectionId: "L", field: "attributionEntityIncomeAboveThreshold", label: "¿La entidad en atribución ejerció actividad económica o superó el umbral anual de rentas?", explanation: "La entidad y sus miembros tienen obligaciones separadas.", why: "Determina la posible declaración informativa 184.", affectedModels: ["184"], example: "Una comunidad de bienes que explota un negocio.", supportingDocument: "Ingresos de la entidad y contrato de constitución.", applicability: "Solo para comunidad de bienes o sociedad civil en atribución." }),
  fourWay({ questionId: "M_FOREIGN_ASSETS", sectionId: "M", field: "foreignAssetsPotentiallyReportable", label: "¿Tuviste bienes o derechos en el extranjero que podrían superar los límites informativos?", explanation: "Es una obligación personal separada y con categorías específicas.", why: "Permite señalar el 720 para revisión sin confundirlo con la actividad.", affectedModels: ["720"], example: "Cuentas o inmuebles en el extranjero.", supportingDocument: "Certificados bancarios y titularidad por bloques de bienes." }),
  fourWay({ questionId: "M_FOREIGN_CRYPTO", sectionId: "M", field: "foreignCryptoPotentiallyReportable", label: "¿Tuviste monedas virtuales custodiadas en el extranjero potencialmente declarables?", explanation: "Importan custodio, localización y valor, no solo poseer criptoactivos.", why: "Permite señalar el 721 como revisión personal.", affectedModels: ["721"], example: "Saldo en un custodio extranjero al cierre del ejercicio.", supportingDocument: "Extractos del custodio y valoración." }),
  fourWay({ questionId: "M_WEALTH", sectionId: "M", field: "wealthTaxPotentiallyApplicable", label: "¿Tu patrimonio podría obligarte a presentar el Impuesto sobre el Patrimonio?", explanation: "Los límites y bonificaciones dependen también de la comunidad autónoma.", why: "Separa el 714 de las obligaciones de la actividad.", affectedModels: ["714"], example: "Patrimonio elevado o cuota resultante según residencia autonómica.", supportingDocument: "Inventario patrimonial y residencia fiscal autonómica." }),
  fourWay({ questionId: "N_CHANGES", sectionId: "N", field: "changesDuringYear", label: "¿Hubo altas, bajas o cambios relevantes durante el ejercicio?", explanation: "Incluye actividad, local, trabajadores, alquiler, UE, régimen o sujeto que factura.", why: "Puede exigir una modificación censal con fecha de efecto.", affectedModels: ["036"], example: "Primer trabajador, nuevo local o inicio de operaciones UE.", supportingDocument: "Situación censal actual y justificantes de cada cambio." }),
  fourWay({ questionId: "N_CENSUS_REVIEWED", sectionId: "N", field: "censusReviewed", label: "¿Has revisado una situación censal actual para este ejercicio?", explanation: "Una lista vacía confirmada no significa lo mismo que no haber consultado el censo.", why: "Permite comparar obligaciones derivadas y censales sin convertir la falta de documento en una discrepancia.", affectedModels: ["111", "115", "123", "130", "131", "216", "303"], example: "Descargas un certificado de situación censal vigente y compruebas sus obligaciones periódicas.", supportingDocument: "Certificado de situación censal actual de la AEAT." }),
  question({ questionId: "N_CENSUS_OBLIGATIONS", sectionId: "N", field: "censusObligations", kind: "MULTI_CHOICE", label: "¿Qué obligaciones periódicas figuran en el censo revisado?", explanation: "Marca únicamente códigos que aparezcan expresamente; si no figura ninguno, usa el botón de lista vacía confirmada.", why: "El cruce detecta altas pendientes, obligaciones antiguas o datos que requieren comprobar su fecha de efecto.", affectedModels: ["111", "115", "123", "130", "131", "216", "303"], example: "El certificado muestra 130 y 303, pero no 115.", supportingDocument: "Apartado de obligaciones periódicas del certificado censal.", options: [
    { value: "111", label: "111 · Trabajo y profesionales" },
    { value: "115", label: "115 · Alquileres" },
    { value: "123", label: "123 · Capital" },
    { value: "130", label: "130 · IRPF estimación directa" },
    { value: "131", label: "131 · IRPF módulos" },
    { value: "216", label: "216 · No residentes" },
    { value: "303", label: "303 · IVA periódico" },
  ], applicability: "Solo después de revisar una situación censal actual." }),
] as const;

const SECTION_BY_ID = new Map(
  QUESTION_SECTIONS.map((section) => [section.sectionId, section]),
);

export function getQuestionSection(sectionId: string): DiagnosticQuestionSection {
  const section = SECTION_BY_ID.get(sectionId);
  if (!section) throw new Error(`Sección de cuestionario desconocida: ${sectionId}`);
  return section;
}

export function questionsForSection(sectionId: string): DiagnosticQuestion[] {
  return DIAGNOSTIC_QUESTIONS.filter((item) => item.sectionId === sectionId);
}

function anyYes(values: FourWayAnswer[]): boolean {
  return values.some((value) => value === "YES");
}

function hasPeriodicVat(regimes: DiagnosticVatRegime[]): boolean {
  return regimes.some((regime) =>
    regime === "GENERAL" ||
    regime === "SIMPLIFIED" ||
    regime === "CASH_ACCOUNTING" ||
    regime === "OTHER_SPECIAL",
  );
}

export function isQuestionApplicable(
  item: DiagnosticQuestion,
  profile: TaxpayerProfile,
): boolean {
  if (item.questionId === "A_PERSONAL_ACTIVITY") {
    return profile.invoicingSubject !== "NATURAL_PERSON";
  }
  if (item.questionId === "D_WITHHELD_PERCENT") {
    return profile.activityKinds.some((kind) =>
      kind === "PROFESSIONAL" ||
      kind === "AGRICULTURE" ||
      kind === "LIVESTOCK" ||
      kind === "FORESTRY",
    );
  }
  if (item.questionId === "E_390_EXEMPT") return hasPeriodicVat(profile.vatRegimes);
  if (
    item.questionId === "G_RENT_WITHHOLDING" ||
    item.questionId === "G_LANDLORD_EXEMPTION"
  ) {
    return profile.rentsBusinessPremises !== "NO" &&
      profile.rentsBusinessPremises !== "NOT_APPLICABLE";
  }
  if (item.questionId === "H_NON_RESIDENT_CONFIRMED") {
    return profile.paidNonResidentIncome !== "NO" &&
      profile.paidNonResidentIncome !== "NOT_APPLICABLE";
  }
  if (item.questionId === "I_ROI") {
    return anyYes([
      profile.euGoodsSales,
      profile.euGoodsPurchases,
      profile.euServicesSales,
      profile.euServicesPurchases,
    ]) || [
      profile.euGoodsSales,
      profile.euGoodsPurchases,
      profile.euServicesSales,
      profile.euServicesPurchases,
    ].some((value) => value === "UNKNOWN");
  }
  if (item.questionId === "J_OSS") {
    return profile.euConsumerSales !== "NO" &&
      profile.euConsumerSales !== "NOT_APPLICABLE";
  }
  if (item.questionId === "L_COMPANY_INSTALLMENTS") {
    return profile.invoicingSubject === "COMPANY";
  }
  if (item.questionId === "L_ATTRIBUTION_THRESHOLD") {
    return profile.invoicingSubject === "COMMUNITY_OF_PROPERTY" ||
      profile.invoicingSubject === "CIVIL_PARTNERSHIP";
  }
  if (item.questionId === "N_CENSUS_OBLIGATIONS") {
    return profile.censusReviewed === "YES";
  }
  return true;
}

export function questionHasAnswer(
  item: DiagnosticQuestion,
  profile: TaxpayerProfile,
): boolean {
  const value = profile[item.field];
  if (item.kind === "FOUR_WAY") return value !== "UNKNOWN";
  if (item.kind === "DATE") return !item.required || typeof value === "string";
  if (item.kind === "PERCENTAGE") return !item.required || typeof value === "number";
  if (item.kind === "MULTI_CHOICE") return Array.isArray(value) && value.length > 0;
  return value !== "UNKNOWN" && value !== null;
}

export function unansweredRequiredQuestions(
  profile: TaxpayerProfile,
): DiagnosticQuestion[] {
  return DIAGNOSTIC_QUESTIONS.filter(
    (item) =>
      item.required &&
      isQuestionApplicable(item, profile) &&
      !questionHasAnswer(item, profile),
  );
}
