import {
  FiscalNotificationInputError,
  assertBoundedDocumentInput,
  assertNotAborted,
  type BoundedDocumentInput,
} from "../input-contract";
import type { FiscalNotificationDocumentFamilyIdV3 } from "../knowledge/document-families.v3";
import type {
  AdministrativeActV1,
  AdministrativeEntityV1,
  AssetConstraintV1,
  DebtClaimV1,
  EntityEvidenceV1,
  PartyRoleV1,
  PartyV1,
  PaymentEventV1,
  TaxProcedureV1,
} from "./domain.v1";
import {
  createDocumentSegmentV1,
  type DocumentSegmentV1,
} from "./document-segment.v1";
import type { ExtractorOutputV1 } from "./extractor-contract.v1";
import {
  createMonetaryComponentV1,
  type MonetaryComponentTypeV1,
  type MonetaryComponentV1,
} from "./monetary-component.v1";
import {
  createProceduralDateV1,
  type ProceduralDateTypeV1,
  type ProceduralDateV1,
} from "./procedural-date.v1";
import {
  normalizeReferenceV1,
  type ReferenceTypeV1,
  type ReferenceV1,
} from "./reference.v1";
import {
  FISCAL_NOTIFICATION_EXTRACTOR_CORE_RELEASE_V1,
  FISCAL_NOTIFICATION_EXTRACTOR_CORE_VERSION_V1,
  assertExactDataRecordV1,
} from "./shared.v1";

export const SEIZURE_EXTRACTOR_VERSION_V1 = "1.1.0" as const;

export const SEIZURE_EXTRACTOR_LIMITS_V1 = Object.freeze({
  maxLines: 10_000,
  maxLineChars: 2_000,
  maxTextFactChars: 1_000,
  maxHeaderLines: 60,
  maxRepeatedFacts: 128,
} as const);

export type SeizureDocumentKindV1 =
  | "SEIZURE_ORDER"
  | "SEIZURE_REITERATION"
  | "SEIZURE_RELEASE"
  | "THIRD_PARTY_RESPONSE"
  | "THIRD_PARTY_PAYMENT";

export type SeizureSubtypeV1 =
  | "BANK_ACCOUNT"
  | "MOVABLE_PROPERTY"
  | "COMMERCIAL_OR_RENT_CREDIT"
  | "WAGES_OR_PENSIONS"
  | "SECURITIES_OR_FINANCIAL_ASSETS"
  | "TPV_RECEIPTS"
  | "BUSINESS_INCOME_OR_RENTS"
  | "CASH_REFUND_OR_PUBLIC_CREDIT"
  | "REAL_ESTATE"
  | "COMPLIANCE_REITERATION"
  | "RELEASE"
  | "THIRD_PARTY_RESPONSE"
  | "THIRD_PARTY_PAYMENT";

export type SeizurePrintedStateV1 =
  | "SEIZURE_ORDER_RECORDED_REVIEW_REQUIRED"
  | "SEIZURE_REITERATION_RECORDED_REVIEW_REQUIRED"
  | "RELEASE_RECORDED_REVIEW_REQUIRED"
  | "THIRD_PARTY_RESPONSE_RECORDED_REVIEW_REQUIRED"
  | "THIRD_PARTY_PAYMENT_RECORDED_REVIEW_REQUIRED";

export type SeizureRecipientRoleV1 =
  | "DEBTOR"
  | "FINANCIAL_ENTITY"
  | "SECURITIES_DEPOSITARY"
  | "ASSET_HOLDER_OR_DEPOSITARY"
  | "COMMERCIAL_OR_RENT_PAYER"
  | "ACTIVITY_OR_RENT_PAYER"
  | "EMPLOYER_OR_PENSION_PAYER"
  | "PAYMENT_SERVICE_PROVIDER"
  | "GARNISHED_THIRD_PARTY"
  | "UNKNOWN";

export interface SeizureTextFactV1 {
  readonly printedValue: string;
  readonly pageNumbers: readonly number[];
  readonly sourceLabel: string;
  readonly extractionMethod: "CLOSED_LABEL";
  readonly assertionType: "EXPLICIT_IN_DOCUMENT";
  readonly reviewStatus: "REVIEW_REQUIRED";
}

export interface SeizureDateFactV1 extends SeizureTextFactV1 {
  readonly parsedDate: string | null;
}

export type SeizureMoneyRoleV1 =
  | "PRINCIPAL"
  | "EXECUTIVE_SURCHARGE"
  | "LATE_INTEREST"
  | "COSTS"
  | "TOTAL_PENDING"
  | "SEIZED_AMOUNT"
  | "SEIZURE_LIMIT"
  | "RETAINED_AMOUNT"
  | "AVAILABLE_BALANCE"
  | "THIRD_PARTY_TRANSFERRED"
  | "RELEASED_AMOUNT";

export interface SeizureMoneyFactV1 {
  readonly role: SeizureMoneyRoleV1;
  readonly printedValue: string;
  readonly amountCents: number;
  readonly sign: "POSITIVE" | "NEGATIVE";
  readonly sourcePage: number;
  readonly sourceLabel: string;
  readonly assertionType: "EXPLICIT_IN_DOCUMENT";
  readonly reviewStatus: "REVIEW_REQUIRED";
}

export type SeizureSpecificFieldIdV1 =
  | "FINANCIAL_ENTITY"
  | "MASKED_ACCOUNT"
  | "ACCOUNT_OR_DEPOSIT"
  | "ASSET_DESCRIPTION"
  | "VEHICLE_REGISTRATION"
  | "VEHICLE_IDENTIFICATION_NUMBER"
  | "MOVABLE_PROPERTY_REGISTRY"
  | "POSSESSOR_OR_DEPOSITARY"
  | "DEPOSIT_INSTRUCTIONS"
  | "PAYER"
  | "CREDIT_DEBTOR"
  | "CONTRACT_OR_INVOICE"
  | "CREDIT_PAYMENT_PERIODICITY"
  | "PROHIBITION_TO_PAY_DEBTOR"
  | "REMUNERATION_TYPE"
  | "PRINTED_WITHHOLDING_LIMIT"
  | "SECURITIES_DEPOSITARY"
  | "SECURITY_OR_FINANCIAL_ASSET"
  | "SECURITY_ACCOUNT"
  | "SECURITY_QUANTITY"
  | "DISPOSAL_RESTRICTION"
  | "PAYMENT_SERVICE_PROVIDER"
  | "TERMINAL_OR_MERCHANT"
  | "COLLECTION_FLOW"
  | "PRINTED_PERCENTAGE"
  | "ACTIVITY_OR_RENT_PAYER"
  | "INCOME_OR_RENT_SOURCE"
  | "PROPERTY_HOLDER"
  | "PROPERTY_ADDRESS"
  | "CADASTRAL_REFERENCE"
  | "LAND_REGISTRY"
  | "PROPERTY_NUMBER"
  | "SEIZED_RIGHT"
  | "OWNERSHIP_SHARE"
  | "VALUATION"
  | "CHARGES"
  | "RELEASED_ASSET_OR_RIGHT"
  | "EXPLICIT_RELEASE_REASON"
  | "RELEASE_EXTENT"
  | "RELATIONSHIP_TO_DEBTOR"
  | "CREDIT_OR_BALANCE_EXISTS"
  | "THIRD_PARTY_RESPONSE"
  | "TRANSFER_RECEIPT"
  | "REITERATION_REASON";

export interface SeizureSpecificFactV1 extends SeizureTextFactV1 {
  readonly fieldId: SeizureSpecificFieldIdV1;
  readonly disclosurePolicy: "STRUCTURED_REVIEW_ONLY" | "MASKED_LAST_FOUR_ONLY";
}

export interface SeizureFactsV1 {
  readonly documentKind: SeizureDocumentKindV1 | null;
  readonly subtype: SeizureSubtypeV1 | null;
  readonly printedState: SeizurePrintedStateV1 | null;
  readonly recipientRole: SeizureRecipientRoleV1;
  readonly recipientRoleBasis: "EXACT_DOCUMENT_SUBTYPE" | "UNKNOWN";
  readonly seizureOrderId: SeizureTextFactV1 | null;
  readonly expediente: SeizureTextFactV1 | null;
  readonly debtKeys: readonly SeizureTextFactV1[];
  readonly liquidationKeys: readonly SeizureTextFactV1[];
  readonly previousEnforcementReference: SeizureTextFactV1 | null;
  readonly csv: SeizureTextFactV1 | null;
  readonly debtorName: SeizureTextFactV1 | null;
  readonly debtorTaxId: SeizureTextFactV1 | null;
  readonly recipientName: SeizureTextFactV1 | null;
  readonly recipientTaxId: SeizureTextFactV1 | null;
  readonly thirdPartyName: SeizureTextFactV1 | null;
  readonly thirdPartyTaxId: SeizureTextFactV1 | null;
  readonly moneyFacts: readonly SeizureMoneyFactV1[];
  readonly issueDate: SeizureDateFactV1 | null;
  readonly seizureDate: SeizureDateFactV1 | null;
  readonly releaseDate: SeizureDateFactV1 | null;
  readonly responseDate: SeizureDateFactV1 | null;
  readonly paymentDate: SeizureDateFactV1 | null;
  readonly reiterationDate: SeizureDateFactV1 | null;
  readonly rawResponseDeadline: SeizureTextFactV1 | null;
  readonly instructions: SeizureTextFactV1 | null;
  readonly printedResources: SeizureTextFactV1 | null;
  readonly specificFacts: readonly SeizureSpecificFactV1[];
}

export interface SeizureExtractorOutputV1 extends ExtractorOutputV1 {
  readonly seizureFacts: SeizureFactsV1;
  readonly retainedSourceContent: "NONE";
  readonly familyDecisionPolicy: "EXACT_CLOSED_TITLE_AND_TRUSTED_AEAT_AUTHORITY_REQUIRED";
  readonly partyRolePolicy: "DEBTOR_RECIPIENT_AND_GARNISHED_THIRD_PARTY_REMAIN_DISTINCT";
  readonly stateDecisionPolicy: "DOCUMENT_KIND_ONLY_NO_CURRENT_ENFORCEMENT_STATE_INFERENCE";
  readonly balanceDecisionPolicy: "PRINTED_COMPONENTS_ONLY_NO_BALANCE_RECALCULATION";
  readonly legalInterpretationPolicy: "OFFICIAL_SOURCES_CONTEXT_ONLY_DOCUMENT_TEXT_CONTROLS_FACTS";
}

export interface ExtractSeizureInputV1 {
  readonly document: BoundedDocumentInput;
  readonly segments: readonly DocumentSegmentV1[];
}

interface PrivateLineV1 {
  readonly pageNumber: number;
  readonly lineIndex: number;
  readonly raw: string;
  readonly folded: string;
}

interface RecognitionV1 {
  readonly documentKind: SeizureDocumentKindV1;
  readonly subtype: SeizureSubtypeV1;
  readonly familyId: FiscalNotificationDocumentFamilyIdV3;
}

interface ParsedSeizureV1 extends RecognitionV1 {
  readonly facts: SeizureFactsV1;
  readonly references: readonly ReferenceV1[];
  readonly money: readonly MonetaryComponentV1[];
  readonly dates: readonly ProceduralDateV1[];
  readonly warnings: readonly string[];
}

const TITLE_DEFINITIONS = Object.freeze([
  title("diligencia de embargo de cuentas bancarias", "SEIZURE_ORDER", "BANK_ACCOUNT", "seizure.bank_account"),
  title("diligencia de embargo de cuentas en entidades de credito", "SEIZURE_ORDER", "BANK_ACCOUNT", "seizure.bank_account"),
  title("diligencia de embargo de vehiculos", "SEIZURE_ORDER", "MOVABLE_PROPERTY", "seizure.movable_asset"),
  title("diligencia de embargo de bienes muebles", "SEIZURE_ORDER", "MOVABLE_PROPERTY", "seizure.movable_asset"),
  title("diligencia de embargo de bienes muebles y semovientes", "SEIZURE_ORDER", "MOVABLE_PROPERTY", "seizure.movable_asset"),
  title("diligencia de embargo de creditos comerciales o arrendaticios", "SEIZURE_ORDER", "COMMERCIAL_OR_RENT_CREDIT", "seizure.commercial_credits"),
  title("diligencia de embargo de creditos comerciales", "SEIZURE_ORDER", "COMMERCIAL_OR_RENT_CREDIT", "seizure.commercial_credits"),
  title("diligencia de embargo de creditos arrendaticios", "SEIZURE_ORDER", "COMMERCIAL_OR_RENT_CREDIT", "seizure.commercial_credits"),
  title("diligencia de embargo de sueldos, salarios o pensiones", "SEIZURE_ORDER", "WAGES_OR_PENSIONS", "seizure.wages_or_pensions"),
  title("diligencia de embargo de sueldos salarios o pensiones", "SEIZURE_ORDER", "WAGES_OR_PENSIONS", "seizure.wages_or_pensions"),
  title("diligencia de embargo de sueldos y salarios", "SEIZURE_ORDER", "WAGES_OR_PENSIONS", "seizure.wages_or_pensions"),
  title("diligencia de embargo de valores", "SEIZURE_ORDER", "SECURITIES_OR_FINANCIAL_ASSETS", "seizure.securities_or_financial_assets"),
  title("diligencia de embargo de valores mobiliarios", "SEIZURE_ORDER", "SECURITIES_OR_FINANCIAL_ASSETS", "seizure.securities_or_financial_assets"),
  title("diligencia de embargo de valores y activos financieros", "SEIZURE_ORDER", "SECURITIES_OR_FINANCIAL_ASSETS", "seizure.securities_or_financial_assets"),
  title("diligencia de embargo de cobros mediante terminal de punto de venta", "SEIZURE_ORDER", "TPV_RECEIPTS", "seizure.tpv_receipts"),
  title("diligencia de embargo de tpv", "SEIZURE_ORDER", "TPV_RECEIPTS", "seizure.tpv_receipts"),
  title("diligencia de embargo de intereses rentas y frutos de toda especie", "SEIZURE_ORDER", "BUSINESS_INCOME_OR_RENTS", "seizure.business_income_or_rents"),
  title("diligencia de embargo de intereses, rentas y frutos de toda especie", "SEIZURE_ORDER", "BUSINESS_INCOME_OR_RENTS", "seizure.business_income_or_rents"),
  title("diligencia de embargo de ingresos de actividad o rentas", "SEIZURE_ORDER", "BUSINESS_INCOME_OR_RENTS", "seizure.business_income_or_rents"),
  title("diligencia de embargo de dinero efectivo devoluciones o creditos frente a la administracion", "SEIZURE_ORDER", "CASH_REFUND_OR_PUBLIC_CREDIT", "seizure.cash_or_refund"),
  title("diligencia de embargo de devoluciones tributarias", "SEIZURE_ORDER", "CASH_REFUND_OR_PUBLIC_CREDIT", "seizure.cash_or_refund"),
  title("diligencia de embargo de bienes inmuebles", "SEIZURE_ORDER", "REAL_ESTATE", "seizure.real_estate"),
  title("reiteracion de diligencia de embargo", "SEIZURE_REITERATION", "COMPLIANCE_REITERATION", "seizure.compliance_reiteration"),
  title("reiteracion de embargo de creditos", "SEIZURE_REITERATION", "COMPLIANCE_REITERATION", "seizure.compliance_reiteration"),
  title("reiteracion para el ingreso de embargo", "SEIZURE_REITERATION", "COMPLIANCE_REITERATION", "seizure.compliance_reiteration"),
  title("levantamiento de diligencia de embargo", "SEIZURE_RELEASE", "RELEASE", "seizure.release"),
  title("orden de levantamiento de embargo", "SEIZURE_RELEASE", "RELEASE", "seizure.release"),
  title("justificante de contestacion a diligencia de embargo", "THIRD_PARTY_RESPONSE", "THIRD_PARTY_RESPONSE", "seizure.third_party_response"),
  title("contestacion a diligencia de embargo", "THIRD_PARTY_RESPONSE", "THIRD_PARTY_RESPONSE", "seizure.third_party_response"),
  title("justificante de ingreso de diligencia de embargo", "THIRD_PARTY_PAYMENT", "THIRD_PARTY_PAYMENT", "seizure.third_party_payment"),
  title("ingreso efectuado por tercero retenedor", "THIRD_PARTY_PAYMENT", "THIRD_PARTY_PAYMENT", "seizure.third_party_payment"),
] as const);

const LABELS = Object.freeze({
  seizureOrderId: ["numero de diligencia", "numero de la diligencia", "diligencia de embargo numero", "referencia de la diligencia"],
  expediente: ["numero de expediente", "expediente"],
  debtKey: ["clave de deuda", "deuda"],
  liquidationKey: ["clave de liquidacion", "liquidacion"],
  previousEnforcementReference: ["providencia de apremio", "referencia de la providencia", "deuda de origen"],
  csv: ["codigo seguro de verificacion (csv)", "codigo seguro de verificacion", "csv"],
  debtorName: ["nombre del deudor", "deudor", "obligado al pago"],
  debtorTaxId: ["nif del deudor", "nif del obligado al pago"],
  recipientName: ["nombre del destinatario", "destinatario"],
  recipientTaxId: ["nif del destinatario"],
  thirdPartyName: ["tercero obligado", "tercero retenedor", "pagador"],
  thirdPartyTaxId: ["nif del tercero", "nif del pagador"],
  issueDate: ["fecha de emision", "fecha de expedicion"],
  seizureDate: ["fecha del embargo", "fecha de la diligencia"],
  releaseDate: ["fecha de efecto del levantamiento", "fecha del levantamiento"],
  responseDate: ["fecha de contestacion", "fecha de presentacion de la contestacion"],
  paymentDate: ["fecha del ingreso", "fecha de pago"],
  reiterationDate: ["fecha de la reiteracion", "fecha del requerimiento reiterado"],
  responseDeadline: ["plazo de contestacion", "fecha limite de contestacion", "plazo para contestar"],
  instructions: ["instrucciones", "forma de contestacion", "forma de ingreso"],
  resources: ["recursos que proceden", "recursos", "impugnacion"],
} as const);

const MONEY_LABELS = Object.freeze({
  PRINCIPAL: ["importe principal pendiente", "principal pendiente", "principal"],
  EXECUTIVE_SURCHARGE: ["recargo de apremio", "recargo ejecutivo", "recargo"],
  LATE_INTEREST: ["intereses de demora", "intereses"],
  COSTS: ["costas del procedimiento", "costas"],
  TOTAL_PENDING: ["importe total pendiente", "total pendiente", "importe de la deuda pendiente"],
  SEIZED_AMOUNT: ["importe a embargar", "importe embargado", "importe de la diligencia"],
  SEIZURE_LIMIT: ["limite del embargo", "limite a embargar", "importe maximo a retener"],
  RETAINED_AMOUNT: ["importe retenido", "cantidad retenida"],
  AVAILABLE_BALANCE: ["saldo disponible", "saldo existente"],
  THIRD_PARTY_TRANSFERRED: ["importe ingresado", "importe transferido", "total ingresado"],
  RELEASED_AMOUNT: ["importe levantado", "importe liberado"],
} as const satisfies Readonly<Record<SeizureMoneyRoleV1, readonly string[]>>);

const SPECIFIC_LABELS = Object.freeze({
  FINANCIAL_ENTITY: ["entidad financiera", "entidad de credito"],
  MASKED_ACCOUNT: ["iban", "cuenta bancaria", "numero de cuenta"],
  ACCOUNT_OR_DEPOSIT: ["cuenta o deposito", "tipo de cuenta", "deposito"],
  ASSET_DESCRIPTION: ["descripcion del bien", "bien mueble embargado", "vehiculo embargado"],
  VEHICLE_REGISTRATION: ["matricula", "matricula del vehiculo"],
  VEHICLE_IDENTIFICATION_NUMBER: ["numero de bastidor", "bastidor"],
  MOVABLE_PROPERTY_REGISTRY: ["registro de bienes muebles", "registro del bien"],
  POSSESSOR_OR_DEPOSITARY: ["poseedor o depositario", "depositario", "poseedor del bien"],
  DEPOSIT_INSTRUCTIONS: ["instrucciones de deposito", "lugar de deposito", "deposito del bien"],
  PAYER: ["pagador", "empleador", "arrendatario"],
  CREDIT_DEBTOR: ["deudor del credito"],
  CONTRACT_OR_INVOICE: ["contrato o factura", "factura", "contrato"],
  CREDIT_PAYMENT_PERIODICITY: ["periodicidad", "frecuencia de pago"],
  PROHIBITION_TO_PAY_DEBTOR: ["prohibicion de pago al deudor", "instruccion de no pagar al deudor"],
  REMUNERATION_TYPE: ["tipo de retribucion", "clase de salario", "pension"],
  PRINTED_WITHHOLDING_LIMIT: ["limite de retencion", "limites aplicables"],
  SECURITIES_DEPOSITARY: ["entidad depositaria", "depositario de los valores"],
  SECURITY_OR_FINANCIAL_ASSET: ["valor o activo financiero", "valores embargados", "activo financiero"],
  SECURITY_ACCOUNT: ["cuenta de valores", "cuenta de deposito de valores"],
  SECURITY_QUANTITY: ["numero de valores", "cantidad de valores", "numero de titulos"],
  DISPOSAL_RESTRICTION: ["prohibicion de disponer", "restriccion de transmision", "retencion de valores"],
  PAYMENT_SERVICE_PROVIDER: ["proveedor de servicios de pago", "entidad adquirente"],
  TERMINAL_OR_MERCHANT: ["terminal o comercio", "numero de terminal", "comercio"],
  COLLECTION_FLOW: ["flujo de cobros", "operaciones de cobro"],
  PRINTED_PERCENTAGE: ["porcentaje a retener", "porcentaje"],
  ACTIVITY_OR_RENT_PAYER: ["pagador de la actividad o renta", "pagador de la renta", "arrendatario o pagador"],
  INCOME_OR_RENT_SOURCE: ["origen del ingreso o renta", "actividad o renta", "concepto de la renta"],
  PROPERTY_HOLDER: ["titular del inmueble", "titular"],
  PROPERTY_ADDRESS: ["direccion del inmueble", "domicilio del inmueble"],
  CADASTRAL_REFERENCE: ["referencia catastral"],
  LAND_REGISTRY: ["registro de la propiedad", "registro"],
  PROPERTY_NUMBER: ["numero de finca", "finca registral", "finca"],
  SEIZED_RIGHT: ["derecho embargado", "bien o derecho embargado"],
  OWNERSHIP_SHARE: ["porcentaje de titularidad", "cuota de titularidad"],
  VALUATION: ["valoracion", "valor del inmueble"],
  CHARGES: ["cargas", "cargas registrales"],
  RELEASED_ASSET_OR_RIGHT: ["bien o derecho levantado", "bien o derecho"],
  EXPLICIT_RELEASE_REASON: ["motivo del levantamiento", "causa del levantamiento"],
  RELEASE_EXTENT: ["alcance del levantamiento", "tipo de levantamiento"],
  RELATIONSHIP_TO_DEBTOR: ["relacion con el deudor", "vinculo con el deudor"],
  CREDIT_OR_BALANCE_EXISTS: ["existencia de credito o saldo", "existe credito o saldo"],
  THIRD_PARTY_RESPONSE: ["respuesta del tercero", "contestacion"],
  TRANSFER_RECEIPT: ["numero de justificante", "justificante del ingreso"],
  REITERATION_REASON: ["motivo de la reiteracion", "incumplimiento indicado", "actuacion reiterada"],
} as const satisfies Readonly<Record<SeizureSpecificFieldIdV1, readonly string[]>>);

const ALL_LABELS = Object.freeze([
  ...Object.values(LABELS).flat(),
  ...Object.values(MONEY_LABELS).flat(),
  ...Object.values(SPECIFIC_LABELS).flat(),
]);

const OFFICIAL_AEAT_DOMAINS = new Set([
  "sede.agenciatributaria.gob.es",
  "www.agenciatributaria.es",
]);
const CONFLICTING_AUTHORITY_MARKERS = Object.freeze([
  "tesoreria general de la seguridad social",
  "agencia tributaria canaria",
  "agencia tributaria de cataluna",
  "agencia tributaria de catalunya",
  "hacienda foral",
  "diputacion foral",
  "hacienda tributaria de navarra",
]);
const NON_DOCUMENT_HEADER_PREFIXES = Object.freeze([
  "manual",
  "guia",
  "documento de ejemplo",
  "tutorial",
]);

const MONEY_COMPONENT_TYPES = Object.freeze({
  PRINCIPAL: "PRINCIPAL",
  EXECUTIVE_SURCHARGE: "EXECUTIVE_SURCHARGE",
  LATE_INTEREST: "LATE_INTEREST",
  COSTS: "COSTS",
  TOTAL_PENDING: "TOTAL_PENDING",
  SEIZED_AMOUNT: "SEIZED_AMOUNT",
  SEIZURE_LIMIT: "SEIZED_AMOUNT",
  RETAINED_AMOUNT: "SEIZED_AMOUNT",
  AVAILABLE_BALANCE: "OTHER",
  THIRD_PARTY_TRANSFERRED: "TOTAL_PAID",
  RELEASED_AMOUNT: "RELEASED_AMOUNT",
} as const satisfies Readonly<Record<SeizureMoneyRoleV1, MonetaryComponentTypeV1>>);

export function extractSeizureV1(
  input: ExtractSeizureInputV1,
): SeizureExtractorOutputV1 {
  assertExactDataRecordV1(input, "seizureInput", ["document", "segments"]);
  assertBoundedDocumentInput(input.document);
  assertNotAborted(input.document.signal);
  const mainSegments = validateSegments(input.document, input.segments);
  if (mainSegments.length === 0) return emptyOutput("UNKNOWN");

  const pages = new Set(
    mainSegments.flatMap((segment) => range(segment.pageFrom, segment.pageTo)),
  );
  const lines = collectLines(input.document, pages);
  const recognition = recognizeSeizure(lines, mainSegments);
  if (recognition.status !== "RECOGNIZED") {
    return emptyOutput(recognition.status, recognition.warning);
  }

  const parsed = parseSeizure(input.document.documentId, recognition, lines);
  const evidence = createEvidence(input.document, mainSegments);
  const actId = entityId(input.document, "act", 0);
  const act: AdministrativeActV1 = Object.freeze({
    entityId: actId,
    ownerScope: input.document.ownerScope,
    entityKind: "ADMINISTRATIVE_ACT",
    evidence,
    familyId: recognition.familyId,
    actSubtype: `${recognition.documentKind}:${recognition.subtype}`,
    references: parsed.references,
    dates: parsed.dates,
  });
  const procedure: TaxProcedureV1 = Object.freeze({
    entityId: entityId(input.document, "procedure", 0),
    ownerScope: input.document.ownerScope,
    entityKind: "TAX_PROCEDURE",
    evidence,
    procedureType: "ENFORCEMENT_SEIZURE_REVIEW",
    referenceIds: Object.freeze([]),
    actIds: Object.freeze([actId]),
  });
  const entities: AdministrativeEntityV1[] = [act, procedure];

  if (recognition.documentKind === "SEIZURE_ORDER" || recognition.documentKind === "SEIZURE_RELEASE") {
    const constraint: AssetConstraintV1 = Object.freeze({
      entityId: entityId(input.document, "constraint", 0),
      ownerScope: input.document.ownerScope,
      entityKind: "ASSET_CONSTRAINT",
      evidence,
      constraintType: recognition.documentKind === "SEIZURE_RELEASE" ? "RELEASE" : "SEIZURE",
      assetClass: recognition.subtype,
      monetaryComponents: parsed.money,
      referenceIds: Object.freeze([]),
    });
    entities.push(constraint);
  }

  const explicitPending = parsed.money.filter((component) =>
    component.componentType === "TOTAL_PENDING" ||
    component.componentType === "PRINCIPAL" ||
    component.componentType === "EXECUTIVE_SURCHARGE" ||
    component.componentType === "LATE_INTEREST" ||
    component.componentType === "COSTS"
  );
  if (recognition.documentKind === "SEIZURE_ORDER" && explicitPending.length > 0) {
    const debt: DebtClaimV1 = Object.freeze({
      entityId: entityId(input.document, "debt", 0),
      ownerScope: input.document.ownerScope,
      entityKind: "DEBT_CLAIM",
      evidence,
      creationBasis: "EXPLICITLY_PRINTED_DEBT",
      monetaryComponents: Object.freeze(explicitPending),
      referenceIds: Object.freeze([]),
    });
    entities.push(debt);
  }
  if (recognition.documentKind === "THIRD_PARTY_PAYMENT") {
    const payment: PaymentEventV1 = Object.freeze({
      entityId: entityId(input.document, "third-party-payment", 0),
      ownerScope: input.document.ownerScope,
      entityKind: "PAYMENT_EVENT",
      evidence,
      paymentStatus: "PAID",
      monetaryComponents: Object.freeze(parsed.money.filter((component) => component.componentType === "TOTAL_PAID")),
      referenceIds: Object.freeze([]),
    });
    entities.push(payment);
  }

  addPartyEntity(entities, input.document, evidence, "debtor", parsed.facts.debtorName, "PRIMARY_DEBTOR");
  addPartyEntity(entities, input.document, evidence, "recipient", parsed.facts.recipientName, partyRoleForRecipient(parsed.facts.recipientRole));
  addPartyEntity(entities, input.document, evidence, "third-party", parsed.facts.thirdPartyName, "GARNISHED_THIRD_PARTY");

  return Object.freeze({
    contractVersion: FISCAL_NOTIFICATION_EXTRACTOR_CORE_VERSION_V1,
    releaseId: FISCAL_NOTIFICATION_EXTRACTOR_CORE_RELEASE_V1,
    extractorId: "seizure",
    extractorVersion: FISCAL_NOTIFICATION_EXTRACTOR_CORE_VERSION_V1,
    status: "REVIEW_REQUIRED",
    familyCandidates: Object.freeze([Object.freeze({
      familyId: recognition.familyId,
      confidence: 1,
      matchingEvidenceIds: Object.freeze(mainSegments.map((segment) => segment.segmentId)),
      contradictoryEvidenceIds: Object.freeze([]),
    })]),
    entities: Object.freeze(entities),
    references: parsed.references,
    monetaryComponents: parsed.money,
    proceduralDates: parsed.dates,
    warnings: parsed.warnings,
    requiresHumanReview: true,
    materializationPolicy: "PROHIBITED_UNTIL_HUMAN_REVIEW",
    permitsDebtCreation: false,
    permitsDeadlineCreation: false,
    permitsPaymentAction: false,
    permitsAccountingAction: false,
    permitsAutomaticFamilyConfirmation: false,
    seizureFacts: parsed.facts,
    retainedSourceContent: "NONE",
    familyDecisionPolicy: "EXACT_CLOSED_TITLE_AND_TRUSTED_AEAT_AUTHORITY_REQUIRED",
    partyRolePolicy: "DEBTOR_RECIPIENT_AND_GARNISHED_THIRD_PARTY_REMAIN_DISTINCT",
    stateDecisionPolicy: "DOCUMENT_KIND_ONLY_NO_CURRENT_ENFORCEMENT_STATE_INFERENCE",
    balanceDecisionPolicy: "PRINTED_COMPONENTS_ONLY_NO_BALANCE_RECALCULATION",
    legalInterpretationPolicy: "OFFICIAL_SOURCES_CONTEXT_ONLY_DOCUMENT_TEXT_CONTROLS_FACTS",
  });
}

function title(
  literal: string,
  documentKind: SeizureDocumentKindV1,
  subtype: SeizureSubtypeV1,
  familyId: FiscalNotificationDocumentFamilyIdV3,
) {
  return Object.freeze({ literal, documentKind, subtype, familyId });
}

function recognizeSeizure(
  lines: readonly PrivateLineV1[],
  segments: readonly DocumentSegmentV1[],
):
  | ({ readonly status: "RECOGNIZED" } & RecognitionV1)
  | { readonly status: "UNKNOWN" | "BLOCKED"; readonly warning: string | null } {
  const firstPage = Math.min(...segments.map((segment) => segment.pageFrom));
  const headers = lines.filter((line) =>
    line.pageNumber === firstPage && line.lineIndex < SEIZURE_EXTRACTOR_LIMITS_V1.maxHeaderLines
  );
  if (headers.some((line) => NON_DOCUMENT_HEADER_PREFIXES.some((prefix) => line.folded.startsWith(prefix)))) {
    return { status: "BLOCKED", warning: "CONFLICTING_NON_DOCUMENT_GUIDE" };
  }
  if (lines.some((line) => CONFLICTING_AUTHORITY_MARKERS.some((marker) => containsTokenSequence(line.folded, marker)))) {
    return { status: "BLOCKED", warning: "CONFLICTING_AUTHORITY_OR_TERRITORY" };
  }
  const trustedAuthority = segments.every((segment) =>
    segment.detectedAuthority === "AEAT" && segment.classificationConfidence >= 0.9
  );
  const officialDomainPrinted = headers.some((line) => OFFICIAL_AEAT_DOMAINS.has(line.folded));
  if (!trustedAuthority && !officialDomainPrinted) {
    return { status: "UNKNOWN", warning: null };
  }
  if (segments.length !== 1) {
    return {
      status: "BLOCKED",
      warning: "MULTIPLE_SEIZURE_ACTS_REQUIRE_SEPARATE_EXTRACTION",
    };
  }

  const matches = new Map<string, RecognitionV1>();
  for (const value of [
    ...segments.map((segment) => fold(segment.detectedTitle ?? "")),
    ...headers.map((line) => line.folded),
  ]) {
    const definition = TITLE_DEFINITIONS.find(({ literal }) =>
      value === literal || value.startsWith(`${literal} `)
    );
    if (definition) {
      const key = `${definition.documentKind}:${definition.subtype}:${definition.familyId}`;
      matches.set(key, definition);
    }
  }
  if (matches.size > 1) {
    return { status: "BLOCKED", warning: "CONFLICTING_SEIZURE_DOCUMENT_KIND" };
  }
  const match = [...matches.values()][0];
  return match
    ? { status: "RECOGNIZED", ...match }
    : { status: "UNKNOWN", warning: null };
}

function parseSeizure(
  documentId: string,
  recognition: RecognitionV1,
  lines: readonly PrivateLineV1[],
): ParsedSeizureV1 {
  const warnings: string[] = [];
  const seizureOrderId = uniqueTextFact(lines, LABELS.seizureOrderId, "Número de diligencia", warnings, "CONFLICTING_SEIZURE_ORDER_ID");
  const expediente = uniqueTextFact(lines, LABELS.expediente, "Número de expediente", warnings, "CONFLICTING_EXPEDIENTE");
  const debtKeys = repeatedTextFacts(lines, LABELS.debtKey, "Clave de deuda", warnings, "TOO_MANY_DEBT_KEYS");
  const liquidationKeys = repeatedTextFacts(lines, LABELS.liquidationKey, "Clave de liquidación", warnings, "TOO_MANY_LIQUIDATION_KEYS");
  const previousEnforcementReference = uniqueTextFact(lines, LABELS.previousEnforcementReference, "Referencia de la providencia", warnings, "CONFLICTING_ENFORCEMENT_REFERENCE");
  const csv = uniqueTextFact(lines, LABELS.csv, "Código Seguro de Verificación", warnings, "CONFLICTING_CSV");
  const debtorName = uniqueTextFact(lines, LABELS.debtorName, "Deudor", warnings, "CONFLICTING_DEBTOR_NAME");
  const debtorTaxId = uniqueTextFact(lines, LABELS.debtorTaxId, "NIF del deudor", warnings, "CONFLICTING_DEBTOR_TAX_ID");
  const recipientName = uniqueTextFact(lines, LABELS.recipientName, "Destinatario", warnings, "CONFLICTING_RECIPIENT_NAME");
  const recipientTaxId = uniqueTextFact(lines, LABELS.recipientTaxId, "NIF del destinatario", warnings, "CONFLICTING_RECIPIENT_TAX_ID");
  const thirdPartyName = uniqueTextFact(lines, LABELS.thirdPartyName, "Tercero obligado", warnings, "CONFLICTING_THIRD_PARTY_NAME");
  const thirdPartyTaxId = uniqueTextFact(lines, LABELS.thirdPartyTaxId, "NIF del tercero", warnings, "CONFLICTING_THIRD_PARTY_TAX_ID");
  const issueDate = uniqueDateFact(lines, LABELS.issueDate, "Fecha de emisión", warnings, "CONFLICTING_ISSUE_DATE");
  const seizureDate = uniqueDateFact(lines, LABELS.seizureDate, "Fecha del embargo", warnings, "CONFLICTING_SEIZURE_DATE");
  const releaseDate = uniqueDateFact(lines, LABELS.releaseDate, "Fecha del levantamiento", warnings, "CONFLICTING_RELEASE_DATE");
  const responseDate = uniqueDateFact(lines, LABELS.responseDate, "Fecha de contestación", warnings, "CONFLICTING_RESPONSE_DATE");
  const paymentDate = uniqueDateFact(lines, LABELS.paymentDate, "Fecha del ingreso", warnings, "CONFLICTING_PAYMENT_DATE");
  const reiterationDate = uniqueDateFact(lines, LABELS.reiterationDate, "Fecha de la reiteración", warnings, "CONFLICTING_REITERATION_DATE");
  const rawResponseDeadline = uniqueTextFact(lines, LABELS.responseDeadline, "Plazo de contestación", warnings, "CONFLICTING_RESPONSE_DEADLINE");
  const instructions = uniqueTextFact(lines, LABELS.instructions, "Instrucciones", warnings, "CONFLICTING_INSTRUCTIONS");
  const printedResources = uniqueTextFact(lines, LABELS.resources, "Recursos impresos", warnings, "CONFLICTING_PRINTED_RESOURCES");
  const moneyFacts = extractMoneyFacts(lines, warnings);
  const specificFacts = extractSpecificFacts(lines, warnings);
  const recipientRole = recipientRoleForSubtype(recognition.subtype, recipientName !== null);

  if (!seizureOrderId) warnings.push("MISSING_EXPLICIT_SEIZURE_ORDER_ID");
  if (!debtorName && !debtorTaxId) warnings.push("MISSING_EXPLICIT_DEBTOR");
  if (recognition.documentKind === "THIRD_PARTY_PAYMENT" && !moneyFacts.some((fact) => fact.role === "THIRD_PARTY_TRANSFERRED")) {
    warnings.push("MISSING_EXPLICIT_THIRD_PARTY_TRANSFER_AMOUNT");
  }
  if (recognition.documentKind === "SEIZURE_RELEASE" && !releaseDate) {
    warnings.push("MISSING_EXPLICIT_RELEASE_DATE");
  }

  const references: ReferenceV1[] = [];
  addReference(references, documentId, "SEIZURE_ORDER_ID", seizureOrderId);
  addReference(references, documentId, "EXPEDIENTE_ID", expediente);
  debtKeys.forEach((fact) => addReference(references, documentId, "DEBT_KEY", fact));
  liquidationKeys.forEach((fact) => addReference(references, documentId, "LIQUIDATION_KEY", fact));
  addReference(references, documentId, "ACT_ID", previousEnforcementReference);
  addReference(references, documentId, "CSV", csv);
  addReference(references, documentId, "NIF", debtorTaxId);
  addReference(references, documentId, "NIF", recipientTaxId);
  addReference(references, documentId, "NIF", thirdPartyTaxId);
  const transferReceipt = specificFacts.find((fact) => fact.fieldId === "TRANSFER_RECEIPT") ?? null;
  addReference(references, documentId, "PAYMENT_RECEIPT_ID", transferReceipt);

  const money = Object.freeze(moneyFacts.map((fact, index) =>
    createMonetaryComponentV1({
      componentId: `${stablePrefix(documentId)}-money-${index}`,
      componentType: MONEY_COMPONENT_TYPES[fact.role],
      amountCents: fact.amountCents,
      currency: "EUR",
      sign: fact.sign,
      sourceDocumentId: documentId,
      sourcePage: fact.sourcePage,
      sourceLabel: fact.sourceLabel,
      sourceCoordinates: null,
      extractionConfidence: 1,
      explicitlyPrinted: true,
      calculated: false,
      calculationFormula: null,
      relatedDebtKey: null,
      requiresHumanReview: true,
    })
  ));
  const dates: ProceduralDateV1[] = [];
  addDate(dates, documentId, issueDate, "ISSUE_DATE");
  addDate(dates, documentId, seizureDate, "SEIZURE_DATE");
  addDate(dates, documentId, releaseDate, "RELEASE_DATE");
  addDate(dates, documentId, responseDate, "ACTION_DATE");
  addDate(dates, documentId, paymentDate, "PAYMENT_DATE");
  addDate(dates, documentId, reiterationDate, "ACTION_DATE");
  if (rawResponseDeadline) {
    dates.push(createProceduralDateV1({
      proceduralDateId: `${stablePrefix(documentId)}-date-response-deadline`,
      dateType: "RESPONSE_DEADLINE",
      rawText: rawResponseDeadline.printedValue,
      rawDeadlineText: rawResponseDeadline.printedValue,
      parsedDate: parsePrintedDate(rawResponseDeadline.printedValue),
      timezone: null,
      sourceDocumentId: documentId,
      sourcePage: rawResponseDeadline.pageNumbers[0]!,
      sourceLabel: rawResponseDeadline.sourceLabel,
      sourceCoordinates: null,
      extractionConfidence: 1,
      explicitlyPrinted: true,
      legallyComputed: false,
      computationRuleId: null,
      requiresReview: true,
    }));
  }

  return Object.freeze({
    ...recognition,
    facts: Object.freeze({
      documentKind: recognition.documentKind,
      subtype: recognition.subtype,
      printedState: printedStateFor(recognition.documentKind),
      recipientRole,
      recipientRoleBasis: recipientRole === "UNKNOWN" ? "UNKNOWN" : "EXACT_DOCUMENT_SUBTYPE",
      seizureOrderId,
      expediente,
      debtKeys,
      liquidationKeys,
      previousEnforcementReference,
      csv,
      debtorName,
      debtorTaxId,
      recipientName,
      recipientTaxId,
      thirdPartyName,
      thirdPartyTaxId,
      moneyFacts,
      issueDate,
      seizureDate,
      releaseDate,
      responseDate,
      paymentDate,
      reiterationDate,
      rawResponseDeadline,
      instructions,
      printedResources,
      specificFacts,
    }),
    references: Object.freeze(references),
    money,
    dates: Object.freeze(dates),
    warnings: Object.freeze([...new Set(warnings)].sort()),
  });
}

function uniqueTextFact(
  lines: readonly PrivateLineV1[],
  labels: readonly string[],
  sourceLabel: string,
  warnings: string[],
  conflictWarning: string,
): SeizureTextFactV1 | null {
  const observations = labelObservations(lines, labels);
  const byValue = new Map<string, { value: string; pages: number[] }>();
  for (const observation of observations) {
    const key = fold(observation.value);
    const current = byValue.get(key) ?? { value: observation.value, pages: [] };
    current.pages.push(observation.pageNumber);
    byValue.set(key, current);
  }
  if (byValue.size > 1) {
    warnings.push(conflictWarning);
    return null;
  }
  const only = [...byValue.values()][0];
  return only ? textFact(only.value, only.pages, sourceLabel) : null;
}

function repeatedTextFacts(
  lines: readonly PrivateLineV1[],
  labels: readonly string[],
  sourceLabel: string,
  warnings: string[],
  limitWarning: string,
): readonly SeizureTextFactV1[] {
  const observations = labelObservations(lines, labels);
  if (observations.length > SEIZURE_EXTRACTOR_LIMITS_V1.maxRepeatedFacts) {
    warnings.push(limitWarning);
    return Object.freeze([]);
  }
  const byValue = new Map<string, { value: string; pages: number[] }>();
  for (const observation of observations) {
    const key = fold(observation.value);
    const current = byValue.get(key) ?? { value: observation.value, pages: [] };
    current.pages.push(observation.pageNumber);
    byValue.set(key, current);
  }
  return Object.freeze([...byValue.values()].map((item) => textFact(item.value, item.pages, sourceLabel)));
}

function uniqueDateFact(
  lines: readonly PrivateLineV1[],
  labels: readonly string[],
  sourceLabel: string,
  warnings: string[],
  conflictWarning: string,
): SeizureDateFactV1 | null {
  const fact = uniqueTextFact(lines, labels, sourceLabel, warnings, conflictWarning);
  return fact ? Object.freeze({ ...fact, parsedDate: parsePrintedDate(fact.printedValue) }) : null;
}

function labelObservations(
  lines: readonly PrivateLineV1[],
  labels: readonly string[],
): readonly { readonly value: string; readonly pageNumber: number }[] {
  return Object.freeze(lines.flatMap((line, index) => {
    if (!labels.some((label) => matchesLabel(line.folded, label))) return [];
    const value = extractLabelValue(lines, line, index);
    return value ? [Object.freeze({ value, pageNumber: line.pageNumber })] : [];
  }));
}

function extractMoneyFacts(
  lines: readonly PrivateLineV1[],
  warnings: string[],
): readonly SeizureMoneyFactV1[] {
  const facts: SeizureMoneyFactV1[] = [];
  for (const [role, labels] of Object.entries(MONEY_LABELS) as readonly [SeizureMoneyRoleV1, readonly string[]][]) {
    const observations = labelObservations(lines, labels).flatMap((item) => {
      const parsed = parsePrintedEuro(item.value);
      if (!parsed) {
        if (/\d[\d., ]*(?:€|eur|euros?)/iu.test(item.value)) warnings.push(`INVALID_PRINTED_AMOUNT_${role}`);
        return [];
      }
      return [Object.freeze({ ...item, ...parsed })];
    });
    const distinct = new Map(observations.map((item) => [`${item.sign}:${item.amountCents}`, item]));
    if (distinct.size > 1) {
      warnings.push(`CONFLICTING_PRINTED_AMOUNT_${role}`);
      continue;
    }
    const only = [...distinct.values()][0];
    if (!only) continue;
    facts.push(Object.freeze({
      role,
      printedValue: only.value,
      amountCents: only.amountCents,
      sign: only.sign,
      sourcePage: only.pageNumber,
      sourceLabel: role,
      assertionType: "EXPLICIT_IN_DOCUMENT",
      reviewStatus: "REVIEW_REQUIRED",
    }));
  }
  return Object.freeze(facts);
}

function extractSpecificFacts(
  lines: readonly PrivateLineV1[],
  warnings: string[],
): readonly SeizureSpecificFactV1[] {
  const facts: SeizureSpecificFactV1[] = [];
  for (const [fieldId, labels] of Object.entries(SPECIFIC_LABELS) as readonly [SeizureSpecificFieldIdV1, readonly string[]][]) {
    const fact = uniqueTextFact(lines, labels, fieldId, warnings, `CONFLICTING_SPECIFIC_FIELD_${fieldId}`);
    if (!fact) continue;
    const masked = fieldId === "MASKED_ACCOUNT";
    facts.push(Object.freeze({
      ...fact,
      fieldId,
      printedValue: masked ? maskAccount(fact.printedValue) : fact.printedValue,
      disclosurePolicy: masked ? "MASKED_LAST_FOUR_ONLY" : "STRUCTURED_REVIEW_ONLY",
    }));
  }
  return Object.freeze(facts);
}

function validateSegments(
  document: BoundedDocumentInput,
  rawSegments: readonly DocumentSegmentV1[],
): readonly DocumentSegmentV1[] {
  if (!Array.isArray(rawSegments) || rawSegments.length === 0 || rawSegments.length > document.pages.length) {
    throw new FiscalNotificationInputError("COLLECTION_LIMIT_EXCEEDED", "seizure.segments");
  }
  const segments = rawSegments.map((segment) => createDocumentSegmentV1(segment));
  const covered = new Set<number>();
  const ids = new Set<string>();
  for (const segment of segments) {
    if (segment.documentId !== document.documentId || ids.has(segment.segmentId)) {
      throw new FiscalNotificationInputError("INVALID_INPUT", "seizure.segments.identity");
    }
    ids.add(segment.segmentId);
    for (let page = segment.pageFrom; page <= segment.pageTo; page += 1) {
      if (covered.has(page) || page > document.pages.length) {
        throw new FiscalNotificationInputError("INVALID_INPUT", "seizure.segments.coverage");
      }
      covered.add(page);
    }
  }
  if (covered.size !== document.pages.length) {
    throw new FiscalNotificationInputError("INVALID_INPUT", "seizure.segments.coverage");
  }
  return Object.freeze(segments.filter((segment) => segment.segmentType === "MAIN_ADMINISTRATIVE_ACT"));
}

function collectLines(
  document: BoundedDocumentInput,
  includedPages: ReadonlySet<number>,
): readonly PrivateLineV1[] {
  const lines: PrivateLineV1[] = [];
  for (const page of document.pages) {
    if (!includedPages.has(page.pageNumber)) continue;
    const pageLines = page.text.split(/\r\n|[\n\r\u2028\u2029]/u);
    for (let index = 0; index < pageLines.length; index += 1) {
      assertNotAborted(document.signal);
      const raw = pageLines[index]!.trim();
      if (raw.length === 0) continue;
      if (raw.length > SEIZURE_EXTRACTOR_LIMITS_V1.maxLineChars) {
        throw new FiscalNotificationInputError("INVALID_INPUT", `seizure.pages[${page.pageNumber}].line`);
      }
      lines.push(Object.freeze({ pageNumber: page.pageNumber, lineIndex: index, raw, folded: fold(raw) }));
      if (lines.length > SEIZURE_EXTRACTOR_LIMITS_V1.maxLines) {
        throw new FiscalNotificationInputError("COLLECTION_LIMIT_EXCEEDED", "seizure.lines");
      }
    }
  }
  return Object.freeze(lines);
}

function extractLabelValue(
  lines: readonly PrivateLineV1[],
  line: PrivateLineV1,
  index: number,
): string | null {
  const separator = line.raw.search(/[:\-]/u);
  const sameLine = separator >= 0 ? line.raw.slice(separator + 1).trim() : "";
  if (sameLine.length > 0 && sameLine.length <= SEIZURE_EXTRACTOR_LIMITS_V1.maxTextFactChars) {
    return sameLine;
  }
  const next = lines[index + 1];
  if (
    next &&
    next.pageNumber === line.pageNumber &&
    next.raw.length <= SEIZURE_EXTRACTOR_LIMITS_V1.maxTextFactChars &&
    !ALL_LABELS.some((label) => matchesLabel(next.folded, label))
  ) {
    return next.raw;
  }
  return null;
}

function textFact(
  value: string,
  pages: readonly number[],
  sourceLabel: string,
): SeizureTextFactV1 {
  return Object.freeze({
    printedValue: value,
    pageNumbers: uniqueNumbers(pages),
    sourceLabel,
    extractionMethod: "CLOSED_LABEL",
    assertionType: "EXPLICIT_IN_DOCUMENT",
    reviewStatus: "REVIEW_REQUIRED",
  });
}

function addReference(
  target: ReferenceV1[],
  documentId: string,
  referenceType: ReferenceTypeV1,
  fact: SeizureTextFactV1 | null,
): void {
  if (!fact) return;
  target.push(normalizeReferenceV1({
    referenceType,
    rawValue: fact.printedValue,
    sourceDocumentId: documentId,
    sourcePage: fact.pageNumbers[0]!,
    sourceLabel: fact.sourceLabel,
    sourceCoordinates: null,
    confidence: 1,
  }));
}

function addDate(
  target: ProceduralDateV1[],
  documentId: string,
  fact: SeizureDateFactV1 | null,
  dateType: ProceduralDateTypeV1,
): void {
  if (!fact) return;
  target.push(createProceduralDateV1({
    proceduralDateId: `${stablePrefix(documentId)}-date-${dateType.toLowerCase()}`,
    dateType,
    rawText: fact.printedValue,
    rawDeadlineText: null,
    parsedDate: fact.parsedDate,
    timezone: null,
    sourceDocumentId: documentId,
    sourcePage: fact.pageNumbers[0]!,
    sourceLabel: fact.sourceLabel,
    sourceCoordinates: null,
    extractionConfidence: 1,
    explicitlyPrinted: true,
    legallyComputed: false,
    computationRuleId: null,
    requiresReview: true,
  }));
}

function createEvidence(
  document: BoundedDocumentInput,
  segments: readonly DocumentSegmentV1[],
): EntityEvidenceV1 {
  return Object.freeze({
    sourceDocumentIds: Object.freeze([document.documentId]),
    sourceSegmentIds: Object.freeze(segments.map((segment) => segment.segmentId)),
    evidenceBasis: "EXPLICIT_DOCUMENT_TEXT",
    confidence: 1,
    requiresHumanReview: true,
    materializationPolicy: "PROHIBITED_UNTIL_HUMAN_REVIEW",
  });
}

function addPartyEntity(
  entities: AdministrativeEntityV1[],
  document: BoundedDocumentInput,
  evidence: EntityEvidenceV1,
  suffix: string,
  name: SeizureTextFactV1 | null,
  role: PartyRoleV1 | null,
): void {
  if (!name || !role) return;
  const party: PartyV1 = Object.freeze({
    entityId: entityId(document, `party-${suffix}`, 0),
    ownerScope: document.ownerScope,
    entityKind: "PARTY",
    evidence,
    displayName: name.printedValue,
    taxIdReferenceId: null,
    roles: Object.freeze([role]),
  });
  entities.push(party);
}

function partyRoleForRecipient(role: SeizureRecipientRoleV1): PartyRoleV1 | null {
  switch (role) {
    case "DEBTOR": return "PRIMARY_DEBTOR";
    case "FINANCIAL_ENTITY": return "FINANCIAL_ENTITY";
    case "SECURITIES_DEPOSITARY": return "FINANCIAL_ENTITY";
    case "ASSET_HOLDER_OR_DEPOSITARY": return "GARNISHED_THIRD_PARTY";
    case "COMMERCIAL_OR_RENT_PAYER": return "PAYER";
    case "ACTIVITY_OR_RENT_PAYER": return "PAYER";
    case "EMPLOYER_OR_PENSION_PAYER": return "PAYER";
    case "PAYMENT_SERVICE_PROVIDER": return "FINANCIAL_ENTITY";
    case "GARNISHED_THIRD_PARTY": return "GARNISHED_THIRD_PARTY";
    case "UNKNOWN": return null;
  }
}

function recipientRoleForSubtype(
  subtype: SeizureSubtypeV1,
  recipientPrinted: boolean,
): SeizureRecipientRoleV1 {
  if (!recipientPrinted) return "UNKNOWN";
  switch (subtype) {
    case "BANK_ACCOUNT": return "FINANCIAL_ENTITY";
    case "MOVABLE_PROPERTY": return "ASSET_HOLDER_OR_DEPOSITARY";
    case "COMMERCIAL_OR_RENT_CREDIT": return "COMMERCIAL_OR_RENT_PAYER";
    case "WAGES_OR_PENSIONS": return "EMPLOYER_OR_PENSION_PAYER";
    case "SECURITIES_OR_FINANCIAL_ASSETS": return "SECURITIES_DEPOSITARY";
    case "TPV_RECEIPTS": return "PAYMENT_SERVICE_PROVIDER";
    case "BUSINESS_INCOME_OR_RENTS": return "ACTIVITY_OR_RENT_PAYER";
    case "COMPLIANCE_REITERATION": return "GARNISHED_THIRD_PARTY";
    case "THIRD_PARTY_RESPONSE":
    case "THIRD_PARTY_PAYMENT": return "GARNISHED_THIRD_PARTY";
    case "CASH_REFUND_OR_PUBLIC_CREDIT":
    case "REAL_ESTATE":
    case "RELEASE": return "DEBTOR";
  }
}

function printedStateFor(kind: SeizureDocumentKindV1): SeizurePrintedStateV1 {
  switch (kind) {
    case "SEIZURE_ORDER": return "SEIZURE_ORDER_RECORDED_REVIEW_REQUIRED";
    case "SEIZURE_REITERATION": return "SEIZURE_REITERATION_RECORDED_REVIEW_REQUIRED";
    case "SEIZURE_RELEASE": return "RELEASE_RECORDED_REVIEW_REQUIRED";
    case "THIRD_PARTY_RESPONSE": return "THIRD_PARTY_RESPONSE_RECORDED_REVIEW_REQUIRED";
    case "THIRD_PARTY_PAYMENT": return "THIRD_PARTY_PAYMENT_RECORDED_REVIEW_REQUIRED";
  }
}

function parsePrintedEuro(
  value: string,
): { readonly amountCents: number; readonly sign: "POSITIVE" | "NEGATIVE" } | null {
  const normalized = value.normalize("NFKC").trim();
  const match = /(?:^|\s)(-?)(?:(\d{1,3}(?:[. ]\d{3})+)|([0-9]+)),(\d{2})(?:\s*(?:€|eur|euros?))?(?:$|\s)/iu.exec(normalized);
  if (!match) return null;
  const integer = (match[2] ?? match[3] ?? "").replace(/[. ]/gu, "");
  const amountCents = Number(integer) * 100 + Number(match[4]);
  return Number.isSafeInteger(amountCents)
    ? Object.freeze({ amountCents, sign: match[1] === "-" ? "NEGATIVE" : "POSITIVE" })
    : null;
}

function parsePrintedDate(value: string): string | null {
  const match = /\b(\d{1,2})[/-](\d{1,2})[/-]((?:19|20)\d{2})\b/u.exec(value);
  if (!match) return null;
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
    ? `${year.toString().padStart(4, "0")}-${month.toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}`
    : null;
}

function maskAccount(value: string): string {
  const compact = value.normalize("NFKC").replace(/[^A-Za-z0-9]/gu, "");
  return compact.length >= 4 ? `****${compact.slice(-4).toUpperCase()}` : "****";
}

function emptyOutput(
  status: "UNKNOWN" | "BLOCKED",
  warning: string | null = null,
): SeizureExtractorOutputV1 {
  return Object.freeze({
    contractVersion: FISCAL_NOTIFICATION_EXTRACTOR_CORE_VERSION_V1,
    releaseId: FISCAL_NOTIFICATION_EXTRACTOR_CORE_RELEASE_V1,
    extractorId: "seizure",
    extractorVersion: FISCAL_NOTIFICATION_EXTRACTOR_CORE_VERSION_V1,
    status,
    familyCandidates: Object.freeze([]),
    entities: Object.freeze([]),
    references: Object.freeze([]),
    monetaryComponents: Object.freeze([]),
    proceduralDates: Object.freeze([]),
    warnings: Object.freeze(warning ? [warning] : []),
    requiresHumanReview: true,
    materializationPolicy: "PROHIBITED_UNTIL_HUMAN_REVIEW",
    permitsDebtCreation: false,
    permitsDeadlineCreation: false,
    permitsPaymentAction: false,
    permitsAccountingAction: false,
    permitsAutomaticFamilyConfirmation: false,
    seizureFacts: Object.freeze({
      documentKind: null,
      subtype: null,
      printedState: null,
      recipientRole: "UNKNOWN",
      recipientRoleBasis: "UNKNOWN",
      seizureOrderId: null,
      expediente: null,
      debtKeys: Object.freeze([]),
      liquidationKeys: Object.freeze([]),
      previousEnforcementReference: null,
      csv: null,
      debtorName: null,
      debtorTaxId: null,
      recipientName: null,
      recipientTaxId: null,
      thirdPartyName: null,
      thirdPartyTaxId: null,
      moneyFacts: Object.freeze([]),
      issueDate: null,
      seizureDate: null,
      releaseDate: null,
      responseDate: null,
      paymentDate: null,
      reiterationDate: null,
      rawResponseDeadline: null,
      instructions: null,
      printedResources: null,
      specificFacts: Object.freeze([]),
    }),
    retainedSourceContent: "NONE",
    familyDecisionPolicy: "EXACT_CLOSED_TITLE_AND_TRUSTED_AEAT_AUTHORITY_REQUIRED",
    partyRolePolicy: "DEBTOR_RECIPIENT_AND_GARNISHED_THIRD_PARTY_REMAIN_DISTINCT",
    stateDecisionPolicy: "DOCUMENT_KIND_ONLY_NO_CURRENT_ENFORCEMENT_STATE_INFERENCE",
    balanceDecisionPolicy: "PRINTED_COMPONENTS_ONLY_NO_BALANCE_RECALCULATION",
    legalInterpretationPolicy: "OFFICIAL_SOURCES_CONTEXT_ONLY_DOCUMENT_TEXT_CONTROLS_FACTS",
  });
}

function fold(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[‐‑‒–—−]/gu, "-")
    .replace(/\s+/gu, " ")
    .trim()
    .toLowerCase();
}

function matchesLabel(value: string, label: string): boolean {
  return value === label || value.startsWith(`${label}:`) || value.startsWith(`${label} -`);
}

function containsTokenSequence(value: string, marker: string): boolean {
  return ` ${value} `.includes(` ${marker} `);
}

function uniqueNumbers(values: readonly number[]): readonly number[] {
  return Object.freeze([...new Set(values)].sort((left, right) => left - right));
}

function range(from: number, to: number): number[] {
  return Array.from({ length: to - from + 1 }, (_, index) => from + index);
}

function stablePrefix(value: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return `fx-seizure-${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

function entityId(document: BoundedDocumentInput, kind: string, index: number): string {
  return `${stablePrefix(`${document.ownerScope}|${document.documentId}`)}-${kind}-${index}`;
}

export const SEIZURE_EXTRACTOR_RELEASE_V1 = Object.freeze({
  version: SEIZURE_EXTRACTOR_VERSION_V1,
  familyIds: Object.freeze([
    "seizure.bank_account",
    "seizure.movable_asset",
    "seizure.commercial_credits",
    "seizure.wages_or_pensions",
    "seizure.securities_or_financial_assets",
    "seizure.tpv_receipts",
    "seizure.business_income_or_rents",
    "seizure.cash_or_refund",
    "seizure.real_estate",
    "seizure.compliance_reiteration",
    "seizure.release",
    "seizure.third_party_response",
    "seizure.third_party_payment",
  ] as const),
  officialInterpretationSources: Object.freeze([
    Object.freeze({
      sourceId: "aeat.collection.seizure.types",
      url: "https://sede.agenciatributaria.gob.es/Sede/deudas-apremios-embargos-subastas/embargos/tipos-embargo.html",
    }),
    Object.freeze({
      sourceId: "aeat.collection.seizure.overview",
      url: "https://sede.agenciatributaria.gob.es/Sede/deudas-apremios-embargos-subastas/embargos/que-embargo.html",
    }),
    Object.freeze({
      sourceId: "aeat.collection.seizure.third-party-response",
      url: "https://sede.agenciatributaria.gob.es/Sede/ayuda/consultas-informaticas/otros-servicios-ayuda-tecnica/contestar-diligencia-embargo.html",
    }),
    Object.freeze({
      sourceId: "boe.collection.regulation.articles-75-115",
      url: "https://www.boe.es/buscar/act.php?id=BOE-A-2005-14803",
    }),
  ]),
  sourcePriority: "DOCUMENT_LITERAL_CONTROLS_FACTS",
  familyPolicy: "EXACT_CLOSED_TITLE_AND_TRUSTED_AEAT_AUTHORITY_REQUIRED",
  partyPolicy: "DEBTOR_RECIPIENT_AND_GARNISHED_THIRD_PARTY_REMAIN_DISTINCT",
  balancePolicy: "NEVER_RECALCULATE_OR_EXTINGUISH_FROM_INCOMPLETE_DOCUMENT_SET",
  actionPolicy: "NO_DEBT_PAYMENT_DEADLINE_SEIZURE_OR_ACCOUNTING_ACTION",
});
