import type {
  ProfileDateFieldCodeV2,
  ProfileFactFieldCodeV2,
  ProfileMoneyFieldCodeV2,
  ProfileParticipantRoleCodeV2,
  ProfileReferenceFieldCodeV2,
} from "./profile-field-adapter.v2";

export const PROFILE_FIELD_LABELS_SCHEMA_VERSION_V2 = 2 as const;
export const PROFILE_FIELD_LABELS_VERSION_V2 =
  "profile-field-labels.2026-07-16.v2" as const;

export const PROFILE_FIELD_LABEL_LIMITS_V2 = Object.freeze({
  maxLabelChars: 96,
  maxAliasChars: 96,
  maxAliasesPerField: 6,
} as const);

export type ProfileFieldKindV2 =
  "REFERENCE" | "DATE" | "MONEY" | "FACT" | "PARTICIPANT_ROLE";

export type ProfileFieldParserV2 =
  "REFERENCE" | "ISO_DATE" | "EUR_MONEY" | "PRESENCE" | "ROLE";

export type ProfileFieldPrivacyV2 =
  | "NORMALIZED_VALUE"
  | "SENSITIVE_FINGERPRINT"
  | "PRESENCE_ONLY"
  | "ROLE_ORDINAL";

interface ProfileFieldLabelBaseV2<
  TCode extends string,
  TKind extends ProfileFieldKindV2,
  TParser extends ProfileFieldParserV2,
  TPrivacy extends ProfileFieldPrivacyV2,
> {
  readonly fieldCode: TCode;
  readonly kind: TKind;
  readonly parser: TParser;
  readonly privacy: TPrivacy;
  readonly labelEs: string;
  readonly aliasesEs: readonly string[];
}

export type ProfileReferenceFieldLabelV2 = ProfileFieldLabelBaseV2<
  ProfileReferenceFieldCodeV2,
  "REFERENCE",
  "REFERENCE",
  "NORMALIZED_VALUE" | "SENSITIVE_FINGERPRINT"
>;

export type ProfileDateFieldLabelV2 = ProfileFieldLabelBaseV2<
  ProfileDateFieldCodeV2,
  "DATE",
  "ISO_DATE",
  "NORMALIZED_VALUE"
>;

export type ProfileMoneyFieldLabelV2 = ProfileFieldLabelBaseV2<
  ProfileMoneyFieldCodeV2,
  "MONEY",
  "EUR_MONEY",
  "NORMALIZED_VALUE"
>;

export type ProfileFactFieldLabelV2 = ProfileFieldLabelBaseV2<
  ProfileFactFieldCodeV2,
  "FACT",
  "PRESENCE",
  "PRESENCE_ONLY"
>;

export type ProfileParticipantRoleFieldLabelV2 = ProfileFieldLabelBaseV2<
  ProfileParticipantRoleCodeV2,
  "PARTICIPANT_ROLE",
  "ROLE",
  "ROLE_ORDINAL"
>;

export type ProfileFieldLabelV2 =
  | ProfileReferenceFieldLabelV2
  | ProfileDateFieldLabelV2
  | ProfileMoneyFieldLabelV2
  | ProfileFactFieldLabelV2
  | ProfileParticipantRoleFieldLabelV2;

function freezeAliases(aliasesEs: readonly string[]): readonly string[] {
  return Object.freeze([...aliasesEs]);
}

function referenceField(
  fieldCode: ProfileReferenceFieldCodeV2,
  labelEs: string,
  aliasesEs: readonly string[],
  privacy: ProfileReferenceFieldLabelV2["privacy"] = "NORMALIZED_VALUE",
): ProfileReferenceFieldLabelV2 {
  return Object.freeze({
    fieldCode,
    kind: "REFERENCE",
    parser: "REFERENCE",
    privacy,
    labelEs,
    aliasesEs: freezeAliases(aliasesEs),
  });
}

function dateField(
  fieldCode: ProfileDateFieldCodeV2,
  labelEs: string,
  aliasesEs: readonly string[],
): ProfileDateFieldLabelV2 {
  return Object.freeze({
    fieldCode,
    kind: "DATE",
    parser: "ISO_DATE",
    privacy: "NORMALIZED_VALUE",
    labelEs,
    aliasesEs: freezeAliases(aliasesEs),
  });
}

function moneyField(
  fieldCode: ProfileMoneyFieldCodeV2,
  labelEs: string,
  aliasesEs: readonly string[],
): ProfileMoneyFieldLabelV2 {
  return Object.freeze({
    fieldCode,
    kind: "MONEY",
    parser: "EUR_MONEY",
    privacy: "NORMALIZED_VALUE",
    labelEs,
    aliasesEs: freezeAliases(aliasesEs),
  });
}

function factField(
  fieldCode: ProfileFactFieldCodeV2,
  labelEs: string,
  aliasesEs: readonly string[],
): ProfileFactFieldLabelV2 {
  return Object.freeze({
    fieldCode,
    kind: "FACT",
    parser: "PRESENCE",
    privacy: "PRESENCE_ONLY",
    labelEs,
    aliasesEs: freezeAliases(aliasesEs),
  });
}

function participantRoleField(
  fieldCode: ProfileParticipantRoleCodeV2,
  labelEs: string,
  aliasesEs: readonly string[],
): ProfileParticipantRoleFieldLabelV2 {
  return Object.freeze({
    fieldCode,
    kind: "PARTICIPANT_ROLE",
    parser: "ROLE",
    privacy: "ROLE_ORDINAL",
    labelEs,
    aliasesEs: freezeAliases(aliasesEs),
  });
}

export const PROFILE_REFERENCE_FIELD_LABELS_V2 = Object.freeze([
  referenceField("ACT_ID", "Identificador del acto", [
    "identificador del acto",
    "número del acto",
    "referencia del documento",
    "referencia de la providencia",
  ]),
  referenceField("AGREEMENT_ID", "Identificador del acuerdo", [
    "identificador del acuerdo",
    "número de acuerdo",
  ]),
  referenceField(
    "BANK_REFERENCE",
    "Referencia bancaria",
    ["referencia bancaria", "referencia de la entidad bancaria"],
    "SENSITIVE_FINGERPRINT",
  ),
  referenceField(
    "CSV",
    "Código seguro de verificación",
    ["código seguro de verificación", "código de verificación del documento"],
    "SENSITIVE_FINGERPRINT",
  ),
  referenceField("DEBT_KEY", "Clave de deuda", [
    "clave de deuda",
    "identificador de la deuda",
  ]),
  referenceField("EXPEDIENTE_ID", "Número de expediente", [
    "número de expediente",
    "referencia del expediente",
  ]),
  referenceField("FILING_RECEIPT_ID", "Justificante de presentación", [
    "número de justificante de presentación",
    "referencia de presentación",
  ]),
  referenceField("FISCAL_YEAR", "Ejercicio fiscal", [
    "ejercicio fiscal",
    "ejercicio tributario",
  ]),
  referenceField("LIQUIDATION_KEY", "Clave de liquidación", [
    "clave de liquidación",
    "referencia de liquidación",
  ]),
  referenceField("MODEL", "Modelo tributario", [
    "modelo tributario",
    "número de modelo",
  ]),
  referenceField("NOTIFICATION_ID", "Identificador de notificación", [
    "identificador de notificación",
    "número de notificación",
  ]),
  referenceField(
    "NRC",
    "Número de referencia completo",
    ["número de referencia completo", "referencia completa del pago"],
    "SENSITIVE_FINGERPRINT",
  ),
  referenceField("OTHER_OFFICIAL_REFERENCE", "Otra referencia oficial", [
    "otra referencia oficial",
    "referencia administrativa adicional",
  ]),
  referenceField("PAYMENT_RECEIPT_ID", "Justificante de pago", [
    "número de justificante de pago",
    "referencia del justificante de pago",
  ]),
  referenceField("PROCEDURE_ID", "Identificador del procedimiento", [
    "identificador del procedimiento",
    "número de procedimiento",
  ]),
  referenceField("REGISTRY_ID", "Número de registro", [
    "número de registro",
    "referencia registral de entrada",
  ]),
  referenceField("REQUEST_NUMBER", "Número de solicitud", [
    "número de solicitud",
    "referencia de la solicitud",
  ]),
  referenceField("SEIZURE_ORDER_ID", "Número de diligencia de embargo", [
    "número de diligencia de embargo",
    "número de diligencia",
    "referencia de la orden de embargo",
  ]),
  referenceField("TAX_PERIOD", "Período tributario", [
    "período tributario",
    "periodo de liquidación",
  ]),
  referenceField(
    "THIRD_PARTY_RESPONSE_ID",
    "Identificador de respuesta del tercero",
    [
      "identificador de respuesta del tercero",
      "referencia de contestación del tercero",
    ],
  ),
] satisfies readonly ProfileReferenceFieldLabelV2[]);

export const PROFILE_DATE_FIELD_LABELS_V2 = Object.freeze([
  dateField("ACCESS_DATE", "Fecha de acceso", [
    "fecha de acceso",
    "fecha de apertura de la notificación",
  ]),
  dateField("ACTION_DATE", "Fecha del acto", [
    "fecha del acto",
    "fecha de la actuación",
  ]),
  dateField("APPEAL_DEADLINE", "Fecha límite para recurrir", [
    "fecha límite para recurrir",
    "plazo máximo de recurso",
  ]),
  dateField("AVAILABILITY_DATE", "Fecha de puesta a disposición", [
    "fecha de puesta a disposición",
    "fecha de disponibilidad de la notificación",
  ]),
  dateField("EFFECTIVE_NOTIFICATION_DATE", "Fecha efectiva de notificación", [
    "fecha efectiva de notificación",
    "fecha en que se entiende notificado",
  ]),
  dateField("END_DATE", "Fecha de finalización", [
    "fecha de finalización",
    "fecha de fin",
  ]),
  dateField("EXPIRATION_DATE", "Fecha de caducidad", [
    "fecha de caducidad",
    "fecha de vencimiento de vigencia",
  ]),
  dateField("FILING_DATE", "Fecha de presentación", [
    "fecha de presentación",
    "fecha de registro de entrada",
  ]),
  dateField("INSTALLMENT_DUE_DATE", "Vencimiento de la cuota", [
    "vencimiento de la cuota",
    "fecha de pago del plazo",
  ]),
  dateField("INTEREST_END_DATE", "Fin del período de intereses", [
    "fecha final de intereses",
    "fin del período de devengo de intereses",
    "fecha hasta",
  ]),
  dateField("INTEREST_START_DATE", "Inicio del período de intereses", [
    "fecha inicial de intereses",
    "inicio del período de devengo de intereses",
    "fecha desde",
  ]),
  dateField("ISSUE_DATE", "Fecha de emisión", [
    "fecha de emisión",
    "fecha de expedición del documento",
  ]),
  dateField("PAYMENT_DATE", "Fecha de pago", [
    "fecha de pago",
    "fecha del ingreso",
  ]),
  dateField("REJECTION_DATE", "Fecha de rechazo", [
    "fecha de rechazo",
    "fecha de rechazo de la notificación",
  ]),
  dateField("RELEASE_DATE", "Fecha de levantamiento", [
    "fecha de levantamiento",
    "fecha de liberación del bien o derecho",
  ]),
  dateField("RESPONSE_DEADLINE", "Fecha límite de respuesta", [
    "fecha límite de respuesta",
    "plazo máximo para contestar",
    "plazo de contestación",
  ]),
  dateField("SEIZURE_DATE", "Fecha de embargo", [
    "fecha de embargo",
    "fecha del embargo",
    "fecha de la diligencia de embargo",
  ]),
  dateField("SIGNING_DATE", "Fecha de firma", [
    "fecha de firma",
    "fecha de firma del documento",
  ]),
  dateField("START_DATE", "Fecha de inicio", [
    "fecha de inicio",
    "fecha inicial del procedimiento",
  ]),
  dateField("VOLUNTARY_PAYMENT_DEADLINE", "Fecha límite de pago voluntario", [
    "fecha límite de pago voluntario",
    "vencimiento del período voluntario",
    "fecha de finalización del período voluntario",
    "fin del período voluntario",
  ]),
] satisfies readonly ProfileDateFieldLabelV2[]);

export const PROFILE_MONEY_FIELD_LABELS_V2 = Object.freeze([
  moneyField("CHARGES", "Costas y gastos", [
    "importe de costas y gastos",
    "gastos repercutidos en el documento",
  ]),
  moneyField("COSTS", "Costas", [
    "importe de costas",
    "costas del procedimiento",
  ]),
  moneyField("CREDIT_TOTAL", "Crédito total", [
    "importe total del crédito",
    "total reconocido a favor",
  ]),
  moneyField("DEFERRAL_INTEREST", "Intereses del aplazamiento", [
    "importe de intereses del aplazamiento",
    "intereses del fraccionamiento",
  ]),
  moneyField("DOCUMENT_TOTAL", "Total del documento", [
    "importe total del documento",
    "importe total",
    "total indicado en el documento",
  ]),
  moneyField(
    "EXECUTIVE_SURCHARGE_10",
    "Recargo ejecutivo del diez por ciento",
    [
      "importe del recargo ejecutivo reducido",
      "recargo ejecutivo del diez por ciento",
    ],
  ),
  moneyField(
    "EXECUTIVE_SURCHARGE_20",
    "Recargo ejecutivo del veinte por ciento",
    [
      "importe del recargo ejecutivo ordinario",
      "recargo ejecutivo del veinte por ciento",
      "recargo de apremio ordinario",
    ],
  ),
  moneyField(
    "EXECUTIVE_SURCHARGE_5",
    "Recargo ejecutivo del cinco por ciento",
    [
      "importe del recargo ejecutivo inicial",
      "recargo ejecutivo del cinco por ciento",
    ],
  ),
  moneyField("EXECUTIVE_SURCHARGE_PRINTED", "Recargo ejecutivo", [
    "importe del recargo ejecutivo",
    "recargo de apremio indicado",
    "recargo de apremio",
  ]),
  moneyField("FINAL_QUOTA", "Cuota final", [
    "importe de la cuota final",
    "cuota resultante definitiva",
  ]),
  moneyField("LATE_PAYMENT_INTEREST", "Intereses de demora", [
    "importe de intereses de demora",
    "interés de demora liquidado",
    "importe total intereses",
    "total intereses",
  ]),
  moneyField("NET_REFUND_PAYMENT", "Devolución neta pagada", [
    "importe neto de la devolución",
    "pago neto de devolución",
  ]),
  moneyField("OFFSET_APPLIED", "Compensación aplicada", [
    "importe compensado",
    "crédito aplicado a compensar",
  ]),
  moneyField("ORIGINAL_TAX_PRINCIPAL", "Principal tributario original", [
    "importe principal original",
    "deuda tributaria principal de origen",
  ]),
  moneyField("OUTSTANDING_PRINCIPAL", "Principal pendiente", [
    "importe principal pendiente",
    "deuda principal aún pendiente",
    "principal",
  ]),
  moneyField("PAYMENT_CONFIRMED", "Pago confirmado", [
    "importe cuyo pago consta confirmado",
    "cantidad pagada confirmada",
  ]),
  moneyField("PAYMENT_ON_ACCOUNT", "Ingreso a cuenta", [
    "importe del ingreso a cuenta",
    "pago realizado a cuenta",
  ]),
  moneyField("PROPOSED_QUOTA", "Cuota propuesta", [
    "importe de la cuota propuesta",
    "cuota incluida en la propuesta",
  ]),
  moneyField("REFUND_CREDIT", "Crédito a devolver", [
    "importe del crédito a devolver",
    "devolución reconocida como crédito",
  ]),
  moneyField("RELEASED_AMOUNT", "Importe liberado", [
    "importe objeto de levantamiento",
    "cantidad liberada del embargo",
  ]),
  moneyField("REMAINING_AFTER_OFFSET", "Pendiente tras compensar", [
    "importe pendiente tras la compensación",
    "saldo restante después de compensar",
  ]),
  moneyField("REMITTED_AMOUNT", "Importe remitido", [
    "cantidad remitida",
    "importe transferido por el tercero",
  ]),
  moneyField("RETAINED_AMOUNT", "Importe retenido", [
    "cantidad retenida",
    "importe objeto de retención",
  ]),
  moneyField("SANCTION_INITIAL", "Sanción inicial", [
    "importe inicial de la sanción",
    "cuantía de sanción antes de reducciones",
  ]),
  moneyField("SANCTION_REDUCED", "Sanción reducida", [
    "importe reducido de la sanción",
    "cuantía de sanción tras reducciones",
  ]),
  moneyField("SANCTION_REDUCTION", "Reducción de la sanción", [
    "importe de reducción de la sanción",
    "cantidad descontada de la sanción",
  ]),
  moneyField("SEIZED_AMOUNT", "Importe embargado", [
    "cantidad embargada",
    "importe afectado por el embargo",
    "importe a embargar",
  ]),
  moneyField("TOTAL_PENDING", "Total pendiente", [
    "importe total pendiente",
    "total pendiente",
  ]),
  moneyField("TOTAL_BEFORE_OFFSET", "Total antes de compensar", [
    "importe total previo a la compensación",
    "saldo antes de aplicar la compensación",
  ]),
  moneyField("VALUATION", "Valoración económica", [
    "importe de valoración",
    "valor económico asignado",
  ]),
] satisfies readonly ProfileMoneyFieldLabelV2[]);

export const PROFILE_FACT_FIELD_LABELS_V2 = Object.freeze([
  factField("ACCOUNT_OR_DEPOSIT", "Cuenta o depósito identificado", [
    "consta una cuenta o depósito",
    "se identifica un depósito bancario",
  ]),
  factField("APPEAL_INFORMATION", "Información sobre recursos", [
    "constan vías de recurso",
    "se informa cómo recurrir",
  ]),
  factField("BARCODE_REFERENCE", "Código de barras presente", [
    "consta un código de barras",
    "aparece una referencia en código de barras",
  ]),
  factField("CADASTRAL_REFERENCE", "Referencia catastral presente", [
    "consta una referencia catastral",
    "se identifica catastralmente el inmueble",
  ]),
  factField("CHARGES", "Concepto de costas o gastos", [
    "constan conceptos de costas y gastos",
    "se detallan cargas económicas adicionales",
  ]),
  factField("CONTRACT_OR_INVOICE", "Contrato o factura relacionado", [
    "consta un contrato relacionado",
    "se menciona una factura vinculada",
  ]),
  factField("CREDIT_DEBTOR", "Deudor del crédito identificado", [
    "consta quién debe pagar el crédito",
    "se identifica al obligado frente al tercero",
  ]),
  factField("DOCUMENTATION_REQUIRED", "Documentación requerida", [
    "se solicitan documentos",
    "consta una relación de documentación a aportar",
  ]),
  factField("DOCUMENT_STATUS", "Estado documental indicado", [
    "consta el estado del documento",
    "se indica la situación del trámite",
  ]),
  factField("EXPLICIT_CONSEQUENCE", "Consecuencia expresa", [
    "consta una consecuencia expresa",
    "se indica qué ocurre si no se actúa",
  ]),
  factField("EXPLICIT_RELEASE_REASON", "Motivo expreso del levantamiento", [
    "consta el motivo del levantamiento",
    "se explica la causa de liberación",
  ]),
  factField("FACT_OR_GROUND", "Hecho o fundamento", [
    "constan hechos o fundamentos",
    "se expone el motivo de la actuación",
  ]),
  factField("FINANCIAL_ENTITY", "Entidad financiera identificada", [
    "consta el nombre de una entidad financiera",
    "se identifica el banco interviniente",
  ]),
  factField("ISSUING_AUTHORITY", "Órgano emisor identificado", [
    "consta el órgano que emite el documento",
    "se identifica la unidad emisora",
  ]),
  factField("LAND_REGISTRY", "Registro de la Propiedad identificado", [
    "consta el registro de la propiedad",
    "se identifica la oficina registral",
  ]),
  factField("NOTIFICATION_CHANNEL", "Canal de notificación", [
    "consta el canal de notificación",
    "se indica el medio de notificación",
  ]),
  factField("NOTIFICATION_SUBJECT", "Asunto de la notificación", [
    "consta el asunto notificado",
    "se identifica el objeto de la notificación",
  ]),
  factField("OBLIGATION", "Obligación indicada", [
    "consta una obligación tributaria",
    "se indica una actuación exigida",
  ]),
  factField("OFFSET_EFFECT_MEANING", "Efecto de la compensación", [
    "consta el efecto de la compensación",
    "se explica el resultado de compensar",
  ]),
  factField("OWNERSHIP_SHARE", "Cuota de titularidad indicada", [
    "consta un porcentaje de titularidad",
    "se indica una participación en la propiedad",
  ]),
  factField("PAYMENT_MEDIUM", "Medio de pago", [
    "consta el medio de pago",
    "se indica cómo se realizó el pago",
  ]),
  factField("PAYMENT_RESULT", "Resultado del pago", [
    "consta el resultado del pago",
    "se indica si el pago fue aceptado o rechazado",
  ]),
  factField("PAYMENT_SCOPE", "Alcance del pago", [
    "consta qué conceptos cubre el pago",
    "se delimita el alcance del ingreso",
  ]),
  factField("PAYMENT_SERVICE_PROVIDER", "Proveedor de pago identificado", [
    "consta el nombre del proveedor de pago",
    "se identifica el intermediario del pago",
  ]),
  factField("PAYMENT_TIME", "Hora de pago indicada", [
    "consta la hora del pago",
    "se indica el momento horario del ingreso",
  ]),
  factField("PRINTED_NOTIFICATION_STATE", "Estado de notificación indicado", [
    "consta el estado de la notificación",
    "se indica si fue accedida o rechazada",
  ]),
  factField("PRINTED_WITHHOLDING_LIMIT", "Límite de retención indicado", [
    "consta un límite de retención",
    "se indica el máximo embargable",
  ]),
  factField("PROHIBITION_TO_PAY_DEBTOR", "Prohibición de pagar al deudor", [
    "consta la prohibición de pagar al deudor",
    "se ordena no entregar fondos al obligado",
  ]),
  factField("PROPERTY_ADDRESS", "Dirección del inmueble presente", [
    "consta la dirección de un inmueble",
    "se localiza el bien inmueble",
  ]),
  factField("PROPERTY_HOLDER", "Titular del inmueble identificado", [
    "consta el titular del inmueble",
    "se identifica a quien figura como propietario",
  ]),
  factField("PROPERTY_NUMBER", "Número de finca presente", [
    "consta un número de finca",
    "se identifica registralmente el inmueble",
  ]),
  factField("REASON", "Motivo indicado", [
    "consta un motivo",
    "se explica la razón de la decisión",
  ]),
  factField("REJECTION_REASON", "Motivo de rechazo", [
    "consta el motivo de rechazo",
    "se explica por qué fue rechazado",
  ]),
  factField("RELEASED_ASSET_OR_RIGHT", "Bien o derecho liberado", [
    "consta el bien o derecho liberado",
    "se identifica lo que deja de estar embargado",
  ]),
  factField("RELEASE_EXTENT", "Alcance del levantamiento", [
    "consta el alcance del levantamiento",
    "se indica si la liberación es total o parcial",
  ]),
  factField("REMUNERATION_TYPE", "Tipo de remuneración", [
    "consta el tipo de remuneración",
    "se indica la clase de salario o prestación",
  ]),
  factField("RESPONSE_CHANNEL", "Canal de respuesta", [
    "consta el canal para responder",
    "se indica dónde presentar la contestación",
  ]),
  factField("SEIZED_RIGHT", "Derecho embargado", [
    "consta el derecho embargado",
    "se identifica el crédito o derecho afectado",
  ]),
  factField("SEIZURE_INSTRUCTIONS", "Instrucciones de embargo", [
    "constan instrucciones de embargo",
    "se indica cómo cumplir la diligencia",
    "instrucciones",
  ]),
  factField("SEIZURE_RECIPIENT_ROLE", "Papel del destinatario del embargo", [
    "consta el papel del destinatario en el embargo",
    "se indica por qué recibe la diligencia el tercero",
  ]),
  factField("TERMINAL_OR_MERCHANT", "Terminal o comercio identificado", [
    "consta un terminal de pago",
    "se identifica el comercio de la operación",
  ]),
  factField("THIRD_PARTY_RESPONSE", "Respuesta del tercero", [
    "consta una contestación del tercero",
    "se indica la respuesta al embargo",
  ]),
  factField("TRANSFER_RECEIPT", "Justificante de transferencia presente", [
    "consta un justificante de transferencia",
    "se acredita una remisión de fondos",
  ]),
  factField("VALUATION", "Criterio de valoración", [
    "consta un criterio de valoración",
    "se explica cómo se valoró el bien",
  ]),
] satisfies readonly ProfileFactFieldLabelV2[]);

export const PROFILE_PARTICIPANT_ROLE_LABELS_V2 = Object.freeze([
  participantRoleField("ACCOUNT_HOLDER", "Titular de la cuenta", [
    "interviene el titular de la cuenta",
    "consta una persona titular del depósito",
  ]),
  participantRoleField("EMPLOYER_OR_PAYER", "Empleador o pagador", [
    "interviene el empleador",
    "consta una entidad pagadora",
  ]),
  participantRoleField("FINANCIAL_ENTITY", "Entidad financiera interviniente", [
    "interviene una entidad financiera",
    "consta un banco destinatario",
  ]),
  participantRoleField("ISSUING_AUTHORITY", "Órgano emisor", [
    "interviene el órgano emisor",
    "consta una unidad administrativa emisora",
  ]),
  participantRoleField("LIABLE_PARTY", "Responsable tributario", [
    "interviene una persona declarada responsable",
    "consta el responsable de la obligación",
  ]),
  participantRoleField("ORIGINATING_AUTHORITY", "Órgano de origen", [
    "interviene el órgano de origen",
    "consta la administración que inició el acto",
  ]),
  participantRoleField(
    "PAYMENT_SERVICE_PROVIDER",
    "Proveedor del servicio de pago",
    ["interviene un proveedor de pago", "consta un intermediario del pago"],
  ),
  participantRoleField("PRIMARY_DEBTOR", "Deudor principal", [
    "interviene el deudor principal",
    "consta el obligado originario",
  ]),
  participantRoleField("REPRESENTATIVE", "Representante", [
    "interviene una persona representante",
    "consta una representación acreditada",
  ]),
  participantRoleField("SUCCESSOR", "Sucesor", [
    "interviene una persona sucesora",
    "consta el sucesor del obligado",
  ]),
  participantRoleField("TAX_DEBTOR", "Obligado tributario", [
    "interviene el obligado tributario",
    "consta la persona deudora tributaria",
  ]),
  participantRoleField("THIRD_PARTY", "Tercero", [
    "interviene una tercera persona",
    "consta un tercero relacionado",
  ]),
  participantRoleField("THIRD_PARTY_DEBTOR", "Tercero deudor del obligado", [
    "interviene quien debe dinero al obligado",
    "consta un tercero deudor del contribuyente",
  ]),
  participantRoleField("THIRD_PARTY_PAYER", "Tercero pagador", [
    "interviene un tercero pagador",
    "consta quien debe retener o ingresar fondos",
  ]),
  participantRoleField("THIRD_PARTY_SPOUSE", "Cónyuge tercero", [
    "interviene el cónyuge como tercero",
    "consta la persona cónyuge afectada",
  ]),
] satisfies readonly ProfileParticipantRoleFieldLabelV2[]);

export const PROFILE_FIELD_LABELS_V2: readonly ProfileFieldLabelV2[] =
  Object.freeze([
    ...PROFILE_REFERENCE_FIELD_LABELS_V2,
    ...PROFILE_DATE_FIELD_LABELS_V2,
    ...PROFILE_MONEY_FIELD_LABELS_V2,
    ...PROFILE_FACT_FIELD_LABELS_V2,
    ...PROFILE_PARTICIPANT_ROLE_LABELS_V2,
  ]);

const profileFieldLabelsByKey = new Map<string, ProfileFieldLabelV2>(
  PROFILE_FIELD_LABELS_V2.map((field) => [
    `${field.kind}:${field.fieldCode}`,
    field,
  ]),
);

export function resolveProfileFieldLabelV2(
  kind: ProfileFieldKindV2,
  fieldCode: string,
): ProfileFieldLabelV2 | null {
  return profileFieldLabelsByKey.get(`${kind}:${fieldCode}`) ?? null;
}
