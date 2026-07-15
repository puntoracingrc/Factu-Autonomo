import type { FiscalNotificationDocumentFamilyIdV2 } from "@/lib/fiscal-notifications/knowledge/document-families.v2";
import type { FiscalNotificationOfficialSourceIdV4 } from "@/lib/fiscal-notifications/knowledge/official-sources.v4";

export const FISCAL_NOTIFICATION_PLAIN_LANGUAGE_GUIDANCE_SCHEMA_VERSION_V1 =
  1 as const;
export const FISCAL_NOTIFICATION_PLAIN_LANGUAGE_GUIDANCE_RELEASE_ID_V1 =
  "fiscal-notification-plain-language-guidance.2026-07-15.v1" as const;

export interface FiscalNotificationPlainLanguageGuidanceV1 {
  readonly schemaVersion: 1;
  readonly releaseId: typeof FISCAL_NOTIFICATION_PLAIN_LANGUAGE_GUIDANCE_RELEASE_ID_V1;
  readonly profileId: string;
  readonly profileVersion: "1.0.0";
  readonly familyId: FiscalNotificationDocumentFamilyIdV2;
  readonly status: "GENERAL_CONTEXT_EXPLAINED";
  readonly inShort: string;
  readonly whyItUsuallyArrives: string;
  readonly usualNextStep: string;
  readonly deadline: Readonly<{
    title: string;
    detail: string;
    basis: "RECEIPT_OR_DOCUMENT_ONLY";
  }>;
  readonly keyPoints: readonly string[];
  readonly searchTerms: readonly string[];
  readonly sourceIds: readonly FiscalNotificationOfficialSourceIdV4[];
  readonly documentPolicy: "DOCUMENT_IS_PRIMARY";
  readonly networkPolicy: "NO_RUNTIME_NETWORK";
  readonly inferencePolicy: "NO_DOCUMENT_SPECIFIC_INFERENCE";
  readonly deadlinePolicy: "NEVER_CALCULATE_FROM_ISSUE_OR_SCAN_DATE";
  readonly operationalPolicy: "INFORMATION_ONLY_NO_AUTOMATIC_ACTION";
}

interface GuidanceProfileSeedV1 {
  readonly profileId: string;
  readonly inShort: string;
  readonly whyItUsuallyArrives: string;
  readonly usualNextStep: string;
  readonly deadlineTitle: string;
  readonly deadlineDetail: string;
  readonly keyPoints: readonly string[];
  readonly searchTerms: readonly string[];
  readonly sourceIds: readonly FiscalNotificationOfficialSourceIdV4[];
}

const PROFILES_V1 = Object.freeze({
  ELECTRONIC_NOTIFICATION: profile(
    "notification-envelope",
    "Es el sobre o justificante de entrega. Por sí solo no explica el asunto: el contenido importante está en el acto adjunto.",
    "La AEAT lo usa para dejar constancia de cuándo puso a disposición o notificó una comunicación.",
    "Abre el acto adjunto, identifica qué te pide y conserva la fecha real de acceso o notificación.",
    "La fecha de notificación es clave",
    "En una notificación electrónica, el acceso produce la notificación; si no se accede, puede entenderse producida al pasar 10 días naturales desde la puesta a disposición. Para un plazo concreto manda el justificante de notificación y el acto adjunto.",
    [
      "Si el mismo acto llega por más de un canal, prevalece la primera notificación correctamente practicada.",
      "Un aviso por correo o móvil no sustituye el acceso al contenido ni demuestra por sí solo la fecha efectiva.",
    ],
    ["dehu", "notifica", "acuse", "puesta a disposición", "comparecencia", "sobre"],
    [
      "aeat.notification.electronic_faq",
      "boe.tax.general.law",
      "boe.common.administrative_procedure.law",
    ],
  ),
  MISSING_RETURN_NOTICE: profile(
    "missing-return-notice",
    "Hacienda indica que no le consta una declaración o autoliquidación que esperaba recibir.",
    "Suele llegar cuando sus registros muestran una obligación de presentar y no encuentran la presentación correspondiente.",
    "Comprueba el modelo y período. Si ya lo presentaste, localiza el justificante; si no, revisa exactamente qué pide el escrito antes de responder.",
    "Mira el plazo escrito",
    "No calcules el plazo desde la fecha impresa en la cabecera: usa la fecha real de notificación y el plazo que figure en el documento.",
    [
      "Que Hacienda no encuentre la presentación no demuestra por sí solo que nunca se presentara.",
      "Una carta informativa y un requerimiento formal no tienen necesariamente los mismos efectos.",
    ],
    ["no presentada", "modelo pendiente", "declaración omitida", "autoliquidación"],
    [
      "aeat.compliance.omitted_return",
      "boe.tax.general.law",
      "boe.tax.management_inspection.regulation",
    ],
  ),
  FORMAL_FILING_REQUIREMENT: profile(
    "formal-filing-requirement",
    "Es una petición formal para presentar una declaración o justificar por qué no corresponde presentarla.",
    "La AEAT considera que falta una obligación concreta y abre un trámite para que la cumplas o aclares la situación.",
    "Identifica modelo, ejercicio y período; presenta o contesta por el canal indicado y conserva el justificante.",
    "Respeta el plazo del requerimiento",
    "El plazo debe leerse en el documento y relacionarse con la fecha real de notificación. La fecha de emisión o de escaneo no basta.",
    [
      "Responder no equivale a que Hacienda haya aceptado todavía la explicación.",
      "No des por cumplido el trámite sin un justificante de presentación o registro.",
    ],
    ["requerimiento", "presentar modelo", "presentación obligatoria", "contestar hacienda"],
    [
      "aeat.compliance.omitted_return",
      "boe.tax.general.law",
      "boe.tax.management_inspection.regulation",
    ],
  ),
  INFORMATION_OR_DOCUMENT_REQUEST: profile(
    "information-document-request",
    "Hacienda te pide datos, explicaciones o documentos concretos para comprobar un asunto.",
    "Suele formar parte de una comprobación o de una actuación de recaudación y debe indicar qué información necesita.",
    "Haz una lista exacta de lo pedido, prepara solo lo necesario, presenta por el canal indicado y guarda el justificante.",
    "El plazo está en la notificación",
    "Cuenta desde la notificación efectiva conforme a lo que diga el acto. No lo deduzcas de la fecha del PDF ni del día en que lo subiste a Factu.",
    [
      "No responder y responder de forma incompleta son situaciones distintas; el documento debe indicar el alcance.",
      "La petición no prueba por sí sola que exista una deuda o una infracción.",
    ],
    ["aportar documentación", "requerimiento información", "facturas", "justificantes", "subsanar"],
    [
      "aeat.compliance.individual_information",
      "aeat.assessment.irpf",
      "aeat.assessment.vat",
      "boe.tax.management_inspection.regulation",
    ],
  ),
  ASSESSMENT_START: profile(
    "assessment-start",
    "Hacienda comunica que empieza una comprobación de una declaración, período o dato concreto.",
    "Ha detectado algo que quiere verificar o ha seleccionado el expediente para comprobarlo.",
    "Revisa el alcance: impuesto, período, elementos comprobados y documentación solicitada. Todavía no des por fijado un resultado final.",
    "Puede incluir un trámite inmediato",
    "Si el inicio pide documentos o alegaciones, sigue el plazo del propio acto desde su notificación efectiva.",
    [
      "El inicio de una comprobación no equivale por sí solo a una deuda.",
      "El alcance impreso limita qué está comunicando esa actuación concreta.",
    ],
    ["inicio comprobación", "verificación datos", "comprobación limitada", "regularización"],
    [
      "aeat.assessment.irpf",
      "aeat.assessment.vat",
      "boe.tax.management_inspection.regulation",
    ],
  ),
  ASSESSMENT_PROPOSAL: profile(
    "assessment-proposal",
    "Hacienda propone una regularización y explica sus cálculos, pero todavía existe el trámite que indique el documento.",
    "La comprobación ha llegado a unas diferencias provisionales y la AEAT te las comunica antes de resolver.",
    "Compara hechos, períodos e importes con tus documentos y revisa el trámite de alegaciones. No la trates como pago ya realizado ni como resolución firme.",
    "Revisa el plazo de alegaciones",
    "Usa la fecha real de notificación y el plazo impreso. No lo calcules desde la fecha de firma, generación o escaneo.",
    [
      "Una propuesta no es lo mismo que una liquidación final.",
      "Alegar no suspende ni confirma automáticamente ninguna deuda futura.",
    ],
    ["propuesta liquidación", "alegaciones", "regularización provisional", "trámite audiencia"],
    [
      "aeat.assessment.irpf",
      "aeat.assessment.vat",
      "boe.tax.management_inspection.regulation",
    ],
  ),
  FINAL_ASSESSMENT: profile(
    "final-provisional-assessment",
    "Es una resolución que fija el resultado de la comprobación en los términos impresos y puede incluir una cantidad a ingresar o devolver.",
    "La AEAT ha terminado esa fase de comprobación y comunica su decisión y sus motivos.",
    "Comprueba resultado, período, importe, forma de pago y vías de revisión. Una liquidación no demuestra que el pago ya se haya hecho.",
    "Pago y recurso tienen sus propios plazos",
    "Lee ambos en el documento y parte de la notificación efectiva. No presupongas que recurrir suspende el cobro.",
    [
      "La liquidación y una posible sanción son actos distintos, aunque puedan estar relacionados.",
      "Para marcar un pago hace falta una evidencia de pago, no solo la liquidación.",
    ],
    ["liquidación provisional", "resolución comprobación", "cuota a ingresar", "resultado comprobación"],
    [
      "aeat.assessment.irpf",
      "aeat.assessment.vat",
      "boe.tax.general.law",
      "boe.tax.management_inspection.regulation",
    ],
  ),
  NO_ADJUSTMENT: profile(
    "no-adjustment-resolution",
    "Hacienda cierra la comprobación indicada sin practicar la regularización o liquidación que se estaba revisando.",
    "Tras comprobar el asunto, el documento comunica que esa actuación termina sin el ajuste señalado.",
    "Comprueba exactamente qué impuesto, período y alcance cierra. No lo extiendas automáticamente a otros períodos o procedimientos.",
    "Normalmente no pide pagar por este resultado",
    "Si el documento incluye otra actuación o vía de revisión, atiende a sus fechas; la ficha general no crea un plazo.",
    [
      "Cerrar una comprobación concreta no borra ni confirma otros expedientes.",
      "El alcance impreso determina qué se ha cerrado.",
    ],
    ["sin regularización", "sin liquidación", "terminación comprobación", "archivo comprobación"],
    [
      "aeat.assessment.irpf",
      "aeat.assessment.vat",
      "boe.tax.management_inspection.regulation",
    ],
  ),
  PAYMENT_FORM: profile(
    "payment-form",
    "Es un documento con los datos necesarios para pagar. No es una prueba de que el pago ya esté hecho.",
    "Acompaña a una deuda, liquidación u obligación para indicar importe, referencia y canal de ingreso.",
    "Comprueba importe, referencia, período y vencimiento. Si pagas, guarda el NRC o justificante y relaciónalo con esta carta.",
    "Manda el vencimiento impreso",
    "No calcules la fecha desde el escaneo. Usa el período de pago indicado en el acto o la carta y la fecha real de notificación cuando corresponda.",
    [
      "Una carta de pago pendiente y un recibo pagado son documentos diferentes.",
      "El mismo importe no basta para vincular silenciosamente un justificante.",
    ],
    ["carta de pago", "documento de ingreso", "pagar deuda", "referencia completa", "nrc"],
    [
      "aeat.collection.payment_and_receipts",
      "aeat.payment.nrc_receipt",
      "boe.tax.collection.regulation",
    ],
  ),
  PAYMENT_RECEIPT: profile(
    "payment-receipt",
    "Es una evidencia de un ingreso realizado si identifica de forma verificable la operación, el importe y la deuda o autoliquidación.",
    "Se genera después de ordenar o completar un pago por una entidad colaboradora o un canal admitido.",
    "Comprueba NRC, fecha, importe y referencia. Vincúlalo solo con el documento al que esas referencias correspondan.",
    "No suele abrir un nuevo plazo",
    "Su función habitual es acreditar el ingreso. Si aparece anulado, rechazado o devuelto, revisa el estado real antes de marcar nada como pagado.",
    [
      "El NRC y las referencias son más fiables para relacionar que una mera coincidencia de importe.",
      "El justificante acredita lo que contiene; no confirma por sí solo el cierre completo del expediente.",
    ],
    ["justificante pago", "recibo", "nrc", "pago realizado", "ingreso"],
    [
      "aeat.payment.nrc_receipt",
      "aeat.collection.payment_and_receipts",
      "boe.tax.collection.regulation",
    ],
  ),
  FAILED_PAYMENT: profile(
    "failed-payment",
    "Indica que una orden de pago no terminó correctamente o que el ingreso fue rechazado, anulado o devuelto.",
    "Puede deberse a un problema del medio de pago, de la cuenta, de la referencia o a una anulación posterior.",
    "Comprueba el estado real de la deuda y si existe otro justificante válido. No des por reabierta ni por pagada la deuda solo con este documento.",
    "Puede seguir corriendo el plazo original",
    "El fallo no crea por sí solo un nuevo vencimiento. Consulta el acto de origen y la fecha de notificación para saber qué plazo seguía vigente.",
    [
      "Una orden fallida no es un pago.",
      "Tampoco demuestra por sí sola que Hacienda haya reabierto una deuda ya extinguida.",
    ],
    ["pago rechazado", "pago devuelto", "nrc anulado", "fallo pago", "pago fallido"],
    ["aeat.collection.payment_and_receipts", "boe.tax.collection.regulation"],
  ),
  ENFORCEMENT_ORDER: profile(
    "enforcement-order",
    "Es una providencia de apremio: Hacienda reclama en vía ejecutiva una deuda que considera no pagada en período voluntario.",
    "Llega cuando la deuda ha entrado en período ejecutivo según los datos de la AEAT.",
    "Comprueba deuda, recargo, importe y plazo. Si ya pagaste, pediste aplazamiento o compensación en plazo, o no recibiste la liquidación, localiza las pruebas antes de actuar.",
    "Tiene plazo de pago y un mes para impugnar",
    "El pago sigue el plazo impreso en la providencia. La AEAT indica un mes desde el día siguiente a la recepción para optar por reposición o reclamación económico-administrativa, con motivos de oposición limitados.",
    [
      "El recargo puede ser del 5 %, 10 % o 20 % según cuándo se pague y si se cumplen las condiciones legales; usa el recargo que figure en tu acto.",
      "Si termina el plazo de la providencia sin ingreso, puede comenzar la fase de embargo para cubrir deuda, recargos, intereses y costas.",
      "Recurrir no demuestra por sí solo que el cobro esté suspendido.",
    ],
    ["providencia apremio", "vía ejecutiva", "recargo ejecutivo", "recargo apremio", "deuda apremiada"],
    [
      "aeat.collection.enforcement",
      "aeat.collection.enforcement_surcharges",
      "aeat.collection.enforcement_nonpayment",
      "aeat.collection.enforcement_resources",
      "boe.tax.general.law",
      "boe.tax.collection.regulation",
    ],
  ),
  SEIZURE: profile(
    "seizure-order",
    "Es una diligencia que afecta un bien, cuenta, sueldo, crédito, devolución u otro derecho para cobrar una deuda en vía ejecutiva.",
    "Suele aparecer después de que termine sin pago el plazo de una providencia de apremio.",
    "Identifica quién recibe la diligencia, qué se embarga, hasta qué importe y por qué deuda. Si eres un tercero retenedor, sigue solo las obligaciones que el documento te dirige.",
    "Revisa la fecha de recepción y las instrucciones",
    "La oposición al embargo tiene motivos legales limitados. Usa el plazo y las vías impresas en la diligencia; no calcules desde la fecha del PDF o del escaneo.",
    [
      "El embargo no demuestra por sí solo que la deuda original sea correcta.",
      "Deudor, banco, cliente, pagador o empleador pueden recibir documentos distintos y no deben confundirse.",
      "Pagar o contestar como tercero no autoriza a modificar silenciosamente la ficha de deuda del usuario.",
    ],
    ["embargo", "diligencia embargo", "retener", "cuenta bloqueada", "crédito embargado", "salario"],
    [
      "aeat.collection.seizure_overview",
      "aeat.collection.seizure_types",
      "aeat.collection.seizure_resources",
      "boe.tax.general.law",
      "boe.tax.collection.regulation",
    ],
  ),
  SEIZURE_THIRD_PARTY_RESPONSE: profile(
    "seizure-third-party-response",
    "Es la contestación de quien recibió una diligencia de embargo como tercero, por ejemplo un cliente, banco, pagador o empleador.",
    "La AEAT pide al tercero que confirme si debe o retiene cantidades del deudor y que actúe según la diligencia.",
    "Comprueba el papel del tercero, el crédito afectado, la cuantía y la respuesta presentada. No lo confundas con una admisión de deuda propia.",
    "Manda el plazo de contestación impreso",
    "La ficha general no lo calcula. Debe tomarse de la diligencia recibida y de su notificación efectiva.",
    [
      "El tercero y el deudor son roles diferentes.",
      "Una respuesta del tercero no acredita por sí sola que ya se haya ingresado el dinero.",
    ],
    ["contestación embargo", "tercero retenedor", "respuesta diligencia", "cliente pagador"],
    [
      "aeat.seizure.credits",
      "aeat.collection.seizure_types",
      "boe.tax.collection.regulation",
    ],
  ),
  SEIZURE_THIRD_PARTY_PAYMENT: profile(
    "seizure-third-party-payment",
    "Es un justificante de que el tercero ingresó una cantidad retenida por una diligencia de embargo.",
    "Se genera al cumplir una orden de retención o ingreso dirigida al tercero.",
    "Verifica diligencia, referencia, importe y fecha; vincúlalo al embargo exacto y no a otra deuda por simple coincidencia.",
    "Normalmente acredita una actuación ya realizada",
    "No crea por sí solo un nuevo plazo. Comprueba si el documento indica saldo pendiente u otra obligación posterior.",
    [
      "El ingreso del tercero puede ser parcial y no demuestra automáticamente que toda la deuda esté extinguida.",
      "La referencia explícita es necesaria para relacionarlo con la diligencia correcta.",
    ],
    ["pago tercero", "ingreso embargo", "retención ingresada", "justificante diligencia"],
    [
      "aeat.collection.payment_and_receipts",
      "aeat.seizure.credits",
      "boe.tax.collection.regulation",
    ],
  ),
  SEIZURE_RELEASE: profile(
    "seizure-release",
    "Es el documento que comunica que un embargo concreto se levanta o deja de producir el efecto indicado.",
    "Puede emitirse por pago, extinción, suspensión, corrección u otra causa que debe constar en el propio acuerdo.",
    "Comprueba qué bien, cuenta o crédito se libera, desde cuándo y si el levantamiento es total o parcial.",
    "Atiende a la fecha de efectos impresa",
    "No extiendas el levantamiento a otros embargos o deudas. Si falta la fecha de efectos, conserva ese dato como pendiente.",
    [
      "Levantar un embargo concreto no equivale necesariamente a extinguir todo el expediente.",
      "El motivo y el alcance válidos son los que constan en el acuerdo.",
    ],
    ["levantamiento embargo", "desembargo", "liberar cuenta", "cancelación retención"],
    [
      "aeat.collection.seizure_overview",
      "aeat.collection.seizure_types",
      "boe.tax.collection.regulation",
    ],
  ),
} as const);

const FAMILY_PROFILE_BINDINGS_V1 = Object.freeze([
  bind(PROFILES_V1.ELECTRONIC_NOTIFICATION, [
    "notification.delivery_attempt",
    "notification.publication_or_appearance",
    "notification.dehu_envelope",
  ]),
  bind(PROFILES_V1.MISSING_RETURN_NOTICE, [
    "compliance.informal_missing_return_notice",
  ]),
  bind(PROFILES_V1.FORMAL_FILING_REQUIREMENT, [
    "compliance.formal_filing_requirement",
  ]),
  bind(PROFILES_V1.INFORMATION_OR_DOCUMENT_REQUEST, [
    "compliance.document_request",
    "compliance.individual_information_requirement",
  ]),
  bind(PROFILES_V1.ASSESSMENT_START, ["assessment.procedure_start"]),
  bind(PROFILES_V1.ASSESSMENT_PROPOSAL, [
    "assessment.allegations_and_proposal",
  ]),
  bind(PROFILES_V1.FINAL_ASSESSMENT, [
    "assessment.final_provisional_assessment",
  ]),
  bind(PROFILES_V1.NO_ADJUSTMENT, ["assessment.no_adjustment_resolution"]),
  bind(PROFILES_V1.PAYMENT_FORM, ["payment.payment_form"]),
  bind(PROFILES_V1.PAYMENT_RECEIPT, ["payment.receipt"]),
  bind(PROFILES_V1.FAILED_PAYMENT, ["payment.failed_or_reversed"]),
  bind(PROFILES_V1.ENFORCEMENT_ORDER, ["collection.enforcement_order"]),
  bind(PROFILES_V1.SEIZURE, [
    "seizure.bank_account",
    "seizure.movable_asset",
    "seizure.real_estate",
    "seizure.commercial_credits",
    "seizure.compliance_reiteration",
    "seizure.wages_or_pensions",
    "seizure.securities_or_financial_assets",
    "seizure.cash_or_refund",
    "seizure.tpv_receipts",
    "seizure.business_income_or_rents",
  ]),
  bind(PROFILES_V1.SEIZURE_THIRD_PARTY_RESPONSE, [
    "seizure.third_party_response",
  ]),
  bind(PROFILES_V1.SEIZURE_THIRD_PARTY_PAYMENT, [
    "seizure.third_party_payment",
  ]),
  bind(PROFILES_V1.SEIZURE_RELEASE, ["seizure.release"]),
]);

export const FISCAL_NOTIFICATION_PLAIN_LANGUAGE_GUIDANCE_V1 = Object.freeze(
  FAMILY_PROFILE_BINDINGS_V1.flatMap(({ profile: seed, familyIds }) =>
    familyIds.map((familyId) => freezeGuidance(seed, familyId)),
  ),
) satisfies readonly FiscalNotificationPlainLanguageGuidanceV1[];

const guidanceByFamilyId = new Map(
  FISCAL_NOTIFICATION_PLAIN_LANGUAGE_GUIDANCE_V1.map((guidance) => [
    guidance.familyId,
    guidance,
  ] as const),
);
const CONTROL_CHARACTER_PATTERN = /[\u0000-\u001f\u007f-\u009f]/u;

export function resolveFiscalNotificationPlainLanguageGuidanceV1(
  familyId: unknown,
): FiscalNotificationPlainLanguageGuidanceV1 | null {
  return typeof familyId === "string" &&
    familyId.length > 0 &&
    familyId.length <= 160 &&
    familyId.trim() === familyId &&
    !CONTROL_CHARACTER_PATTERN.test(familyId)
    ? (guidanceByFamilyId.get(
        familyId as FiscalNotificationDocumentFamilyIdV2,
      ) ?? null)
    : null;
}

function profile(
  profileId: string,
  inShort: string,
  whyItUsuallyArrives: string,
  usualNextStep: string,
  deadlineTitle: string,
  deadlineDetail: string,
  keyPoints: readonly string[],
  searchTerms: readonly string[],
  sourceIds: readonly FiscalNotificationOfficialSourceIdV4[],
): GuidanceProfileSeedV1 {
  return Object.freeze({
    profileId,
    inShort,
    whyItUsuallyArrives,
    usualNextStep,
    deadlineTitle,
    deadlineDetail,
    keyPoints: Object.freeze([...keyPoints]),
    searchTerms: Object.freeze([...searchTerms]),
    sourceIds: Object.freeze([...sourceIds]),
  });
}

function bind(
  profileSeed: GuidanceProfileSeedV1,
  familyIds: readonly FiscalNotificationDocumentFamilyIdV2[],
) {
  return Object.freeze({
    profile: profileSeed,
    familyIds: Object.freeze([...familyIds]),
  });
}

function freezeGuidance(
  seed: GuidanceProfileSeedV1,
  familyId: FiscalNotificationDocumentFamilyIdV2,
): FiscalNotificationPlainLanguageGuidanceV1 {
  return Object.freeze({
    schemaVersion: FISCAL_NOTIFICATION_PLAIN_LANGUAGE_GUIDANCE_SCHEMA_VERSION_V1,
    releaseId: FISCAL_NOTIFICATION_PLAIN_LANGUAGE_GUIDANCE_RELEASE_ID_V1,
    profileId: seed.profileId,
    profileVersion: "1.0.0",
    familyId,
    status: "GENERAL_CONTEXT_EXPLAINED",
    inShort: seed.inShort,
    whyItUsuallyArrives: seed.whyItUsuallyArrives,
    usualNextStep: seed.usualNextStep,
    deadline: Object.freeze({
      title: seed.deadlineTitle,
      detail: seed.deadlineDetail,
      basis: "RECEIPT_OR_DOCUMENT_ONLY",
    }),
    keyPoints: Object.freeze([...seed.keyPoints]),
    searchTerms: Object.freeze([...seed.searchTerms]),
    sourceIds: Object.freeze([...seed.sourceIds]),
    documentPolicy: "DOCUMENT_IS_PRIMARY",
    networkPolicy: "NO_RUNTIME_NETWORK",
    inferencePolicy: "NO_DOCUMENT_SPECIFIC_INFERENCE",
    deadlinePolicy: "NEVER_CALCULATE_FROM_ISSUE_OR_SCAN_DATE",
    operationalPolicy: "INFORMATION_ONLY_NO_AUTOMATIC_ACTION",
  });
}
