import type { AdministrativeMoneyKind } from "./administrative-domain";
import type { AdministrativeDocumentType, ExternalReferenceType } from "./types";
import { resolveFiscalNotificationOfficialSourceV2 } from "./knowledge/official-sources.v2";

export const FISCAL_NOTIFICATION_DOCUMENT_EXPLANATION_ENGINE_ID_V1 =
  "fiscal-notification-document-explanation" as const;
export const FISCAL_NOTIFICATION_DOCUMENT_EXPLANATION_ENGINE_VERSION_V1 =
  "1.0.0" as const;
export const FISCAL_NOTIFICATION_DOCUMENT_KNOWLEDGE_SNAPSHOT_V1 =
  "official-context.2026-07-15.v1" as const;

export interface FiscalNotificationExplanationMoneyInputV1 {
  readonly kind: AdministrativeMoneyKind;
  readonly amountCents: number;
  readonly currency: "EUR" | "UNKNOWN";
  readonly sourceReferenceType: ExternalReferenceType | null;
}

export interface FiscalNotificationExplanationFactInputV1 {
  readonly label: string;
  readonly value: string;
}

export interface FiscalNotificationDocumentExplanationInputV1 {
  readonly documentType: AdministrativeDocumentType;
  readonly documentSubtype: string | null;
  readonly documentDate: string | null;
  readonly receiptDate: string | null;
  readonly facts: readonly FiscalNotificationExplanationFactInputV1[];
  readonly money: readonly FiscalNotificationExplanationMoneyInputV1[];
}

export interface FiscalNotificationDocumentExplanationV1 {
  readonly schemaVersion: 1;
  readonly engineId: typeof FISCAL_NOTIFICATION_DOCUMENT_EXPLANATION_ENGINE_ID_V1;
  readonly engineVersion: typeof FISCAL_NOTIFICATION_DOCUMENT_EXPLANATION_ENGINE_VERSION_V1;
  readonly knowledgeSnapshotId: typeof FISCAL_NOTIFICATION_DOCUMENT_KNOWLEDGE_SNAPSHOT_V1;
  readonly ruleId: string;
  readonly ruleVersion: string;
  readonly status: "EXPLAINED" | "PARTIAL";
  readonly whatItIs: string;
  readonly whyReceived: string;
  readonly result: string;
  readonly nextStep: Readonly<{
    status:
      | "NO_PAYMENT_SHOWN"
      | "REVIEW_DOCUMENT_ACTION"
      | "PAYMENT_OR_RESPONSE_MAY_BE_REQUIRED";
    title: string;
    detail: string;
  }>;
  readonly deadline: Readonly<{
    status:
      | "NOT_IDENTIFIED"
      | "DOCUMENT_STATED"
      | "MISSING_RECEIPT_DATE"
      | "RECEIPT_DATE_AVAILABLE";
    title: string;
    detail: string;
  }>;
  readonly keyFacts: readonly Readonly<{
    label: string;
    value: string;
    basis: "PRINTED" | "CALCULATED_FROM_PRINTED_VALUES";
  }>[];
  readonly officialSources: readonly Readonly<{
    id: string;
    title: string;
    authority: "AEAT" | "BOE";
    canonicalUrl: string;
  }>[];
  readonly documentFactsPolicy: "DOCUMENT_IS_PRIMARY";
  readonly legalContextPolicy: "OFFICIAL_CONTEXT_DOES_NOT_OVERRIDE_DOCUMENT";
  readonly networkPolicy: "NO_NETWORK";
  readonly requiresHumanReview: true;
  readonly materializationPolicy: "PROHIBITED_UNTIL_REVIEW";
}

interface BaseExplanationProfile {
  readonly whatItIs: string;
  readonly whyReceived: string;
  readonly result: string;
  readonly nextStepTitle: string;
  readonly nextStepDetail: string;
  readonly sourceIds: readonly string[];
}

const BASE_PROFILES = Object.freeze({
  AEAT_ENFORCEMENT_ORDER: profile(
    "Una providencia de apremio inicia o continúa la vía ejecutiva para una deuda que el documento identifica.",
    "La AEAT comunica que una deuda figura pendiente en vía ejecutiva.",
    "El resultado exacto depende de la deuda, recargo, importe pendiente y fechas impresas en esta ficha.",
    "Revisa deuda, recargo y fecha de pago",
    "Comprueba que la clave, el importe y el plazo coinciden con el documento antes de pagar, recurrir o pedir asistencia.",
    ["aeat.collection.enforcement", "boe.tax.general.law", "boe.tax.collection.regulation"],
  ),
  AEAT_INSTALLMENT_OR_DEFERRAL_GRANT: profile(
    "Una concesión de aplazamiento o fraccionamiento fija las condiciones aceptadas por la AEAT.",
    "Resuelve favorablemente, en los términos impresos, una solicitud previa de aplazamiento o fraccionamiento.",
    "Las cuotas, vencimientos e importes válidos son los que aparecen en el documento.",
    "Comprueba las cuotas concedidas",
    "Revisa cada vencimiento, la cuenta de cargo y las condiciones impresas antes de confirmar el plan en Factu.",
    ["aeat.collection.deferral", "aeat.collection.deferral_management", "boe.tax.collection.regulation"],
  ),
  AEAT_INSTALLMENT_OR_DEFERRAL_DENIAL: profile(
    "Una denegación rechaza una solicitud de aplazamiento o fraccionamiento.",
    "La AEAT comunica que no concede la solicitud en los términos presentados.",
    "La consecuencia y el plazo aplicable deben leerse en la resolución y desde su fecha de notificación.",
    "Revisa el motivo y el plazo",
    "Comprueba el motivo impreso, la deuda afectada y la fecha real de notificación antes de decidir cómo actuar.",
    ["aeat.collection.deferral", "boe.tax.collection.regulation"],
  ),
  AEAT_OFFSET_AGREEMENT: profile(
    "Un acuerdo de compensación aplica un crédito reconocido a una o varias deudas.",
    "La AEAT resuelve una compensación solicitada por el obligado o practicada de oficio.",
    "El resultado depende de los créditos, deudas y efectos impresos en el acuerdo.",
    "Revisa el resultado de la compensación",
    "Comprueba qué deudas quedan extinguidas y si el documento deja algún importe pendiente.",
    [
      "aeat.collection.offset.requested",
      "boe.tax.general.law",
      "boe.tax.collection.regulation",
      "aeat.review.reconsideration",
      "aeat.review.economic_administrative",
    ],
  ),
  AEAT_PAYMENT_FORM: profile(
    "Un documento de pago contiene referencias e instrucciones para realizar un ingreso.",
    "Se entrega para pagar una deuda o autoliquidación identificada en el propio documento.",
    "No acredita por sí solo que el pago ya se haya realizado.",
    "Comprueba importe, referencia y vencimiento",
    "No marques el pago como realizado hasta disponer de justificante o confirmación expresa.",
    ["aeat.collection.payment_and_receipts", "aeat.payment.nrc_receipt"],
  ),
  AEAT_INFORMATION_REQUEST: profile(
    "Un requerimiento pide información, documentación o una actuación concreta.",
    "La AEAT necesita completar o comprobar un expediente identificado en el documento.",
    "La respuesta exigida y su plazo deben constar expresamente en la notificación.",
    "Prepara la respuesta solicitada",
    "Revisa exactamente qué se pide y la fecha de notificación; no des por cumplido el requerimiento sin justificante de presentación.",
    ["aeat.compliance.individual_information", "boe.tax.management_inspection.regulation"],
  ),
  AEAT_ASSESSMENT_PROPOSAL: profile(
    "Una propuesta de liquidación expone un cálculo o regularización todavía sujeto al trámite indicado.",
    "La AEAT comunica diferencias que considera relevantes antes de dictar, en su caso, una liquidación.",
    "No debe tratarse como una liquidación definitiva si el documento dice que es propuesta.",
    "Revisa cálculos y alegaciones",
    "Comprueba los hechos, importes y el plazo de alegaciones que figuran en la notificación.",
    ["aeat.assessment.irpf", "aeat.assessment.vat", "boe.tax.management_inspection.regulation"],
  ),
  AEAT_ASSESSMENT: profile(
    "Una liquidación determina una deuda o resultado tributario en los términos del acto notificado.",
    "La AEAT cierra una comprobación o regularización con los importes y motivos impresos.",
    "El importe, forma de pago y vías de revisión dependen del acto concreto.",
    "Comprueba el resultado y las opciones",
    "Revisa el importe, el período, la fecha de notificación y las instrucciones antes de pagar o recurrir.",
    ["boe.tax.general.law", "boe.tax.management_inspection.regulation"],
  ),
  AEAT_SANCTION_PROPOSAL: profile(
    "Una propuesta sancionadora comunica una posible sanción aún sujeta al procedimiento indicado.",
    "La AEAT atribuye provisionalmente una infracción y ofrece el trámite que figura en el documento.",
    "No equivale a una sanción firme si el propio documento la identifica como propuesta.",
    "Revisa hechos, reducciones y alegaciones",
    "Comprueba la conducta imputada, los importes y el plazo impreso antes de aceptar o formular alegaciones.",
    ["aeat.sanction.general", "boe.tax.sanction.regulation"],
  ),
  AEAT_SANCTION_DECISION: profile(
    "Una resolución sancionadora decide un procedimiento de sanción.",
    "La AEAT comunica la decisión, el importe y las vías de revisión del expediente.",
    "El estado y las posibles reducciones dependen de lo que indique la resolución.",
    "Revisa pago, reducciones y recursos",
    "Comprueba el importe, las condiciones de reducción y la fecha real de notificación antes de actuar.",
    ["aeat.sanction.general", "boe.tax.sanction.regulation", "boe.tax.review.regulation"],
  ),
  AEAT_SEIZURE_ORDER: profile(
    "Una diligencia de embargo identifica bienes, cuentas, créditos o derechos afectados por la recaudación.",
    "La AEAT comunica una actuación de embargo vinculada a deudas en vía ejecutiva.",
    "El bien afectado, el importe y las posibilidades de oposición son los impresos en la diligencia.",
    "Comprueba qué se embarga y por qué deuda",
    "Revisa el objeto, la cuantía, la referencia y la fecha de notificación antes de pagar, oponerte o pedir ayuda.",
    ["aeat.collection.seizure_types", "aeat.collection.seizure_resources", "boe.tax.collection.regulation"],
  ),
  TGSS_DEBT_NOTICE: genericProfile("un aviso de deuda de la Tesorería General de la Seguridad Social"),
  TGSS_ENFORCEMENT_NOTICE: genericProfile("una actuación ejecutiva de la Tesorería General de la Seguridad Social"),
  MUNICIPAL_FINE: genericProfile("una notificación sancionadora municipal"),
  MUNICIPAL_TAX_NOTICE: genericProfile("una notificación tributaria municipal"),
  REGIONAL_AUTHORITY_NOTICE: genericProfile("una notificación de una administración autonómica"),
  GENERIC_ADMINISTRATIVE_NOTICE: genericProfile("una notificación administrativa"),
  UNKNOWN: profile(
    "El tipo exacto del documento todavía no se ha identificado.",
    "No hay hechos suficientes para explicar con seguridad por qué se emitió.",
    "No se deduce ninguna obligación ni efecto por ausencia de información.",
    "Revisa o corrige la clasificación",
    "Confirma el título, el organismo, las fechas y las referencias antes de usar esta ficha.",
    [],
  ),
} satisfies Readonly<Record<AdministrativeDocumentType, BaseExplanationProfile>>);

export function explainFiscalNotificationDocumentV1(
  input: FiscalNotificationDocumentExplanationInputV1,
): FiscalNotificationDocumentExplanationV1 {
  const base = BASE_PROFILES[input.documentType];
  const specialized =
    input.documentType === "AEAT_OFFSET_AGREEMENT"
      ? explainOffset(input, base)
      : explainBase(input, base);
  return freezeExplanation(specialized);
}

function explainOffset(
  input: FiscalNotificationDocumentExplanationInputV1,
  base: BaseExplanationProfile,
): Omit<FiscalNotificationDocumentExplanationV1, "schemaVersion" | "engineId" | "engineVersion" | "knowledgeSnapshotId" | "documentFactsPolicy" | "legalContextPolicy" | "networkPolicy" | "requiresHumanReview" | "materializationPolicy"> {
  const creditTotal = sumMoney(input.money, "CREDIT_TOTAL");
  const creditApplied = sumMoney(
    input.money,
    "OFFSET_APPLIED",
    "DOCUMENT_REFERENCE",
  );
  const debtTotals = input.money.filter(
    (fact) => fact.kind === "TOTAL_BEFORE_OFFSET",
  );
  const remaining = input.money.filter(
    (fact) => fact.kind === "REMAINING_AFTER_OFFSET",
  );
  const remainingTotal = safeSum(remaining.map((fact) => fact.amountCents));
  const totalDebt = safeSum(debtTotals.map((fact) => fact.amountCents));
  const totalEffects = input.facts.filter(
    (fact) =>
      fact.label === "Efecto indicado en el documento" &&
      /totalmente extinguida/u.test(fact.value.toLowerCase()),
  ).length;
  const allListedDebtsExtinguished =
    remaining.length > 0 &&
    remaining.every((fact) => fact.amountCents === 0) &&
    totalEffects >= remaining.length;
  const residualCredit =
    creditTotal !== null &&
    creditApplied !== null &&
    creditTotal >= creditApplied
      ? creditTotal - creditApplied
      : null;
  const requestDate = factValue(input.facts, "Fecha de solicitud impresa");
  const requested = input.documentSubtype === "REQUESTED";
  const whyReceived = requested
    ? `Porque se presentó una solicitud de compensación${requestDate ? ` el ${requestDate}` : ""} y la AEAT ha comunicado su acuerdo.`
    : input.documentSubtype === "EX_OFFICIO"
      ? "Porque la AEAT ha aplicado de oficio un crédito reconocido a deudas que identifica en el acuerdo."
      : base.whyReceived;
  const result = allListedDebtsExtinguished
    ? `El documento indica que ${remaining.length === 1 ? "la deuda incluida queda totalmente extinguida" : `${remaining.length} deudas incluidas quedan totalmente extinguidas`} y muestra 0,00 € pendiente tras la compensación.`
    : remainingTotal !== null && remainingTotal > 0
      ? `El documento muestra ${formatEuros(remainingTotal)} pendientes después de compensar. Debes revisar a qué deuda y plazo corresponde.`
      : remaining.length > 0
        ? "Los importes impresos dejan 0,00 € pendiente, pero falta un efecto textual suficiente para afirmar la extinción completa."
        : base.result;
  const nextStep = allListedDebtsExtinguished
    ? Object.freeze({
        status: "NO_PAYMENT_SHOWN" as const,
        title: "No aparece un pago pendiente por estas deudas",
        detail:
          "Si las referencias e importes coinciden con tu situación, este acuerdo no pide pagar de nuevo las deudas listadas. Conserva la resolución y comprueba el destino del crédito que no se haya consumido.",
      })
    : Object.freeze({
        status: remainingTotal !== null && remainingTotal > 0
          ? ("PAYMENT_OR_RESPONSE_MAY_BE_REQUIRED" as const)
          : ("REVIEW_DOCUMENT_ACTION" as const),
        title: base.nextStepTitle,
        detail: base.nextStepDetail,
      });
  const deadline = offsetDeadline(input.receiptDate);
  const keyFacts: Array<{
    label: string;
    value: string;
    basis: "PRINTED" | "CALCULATED_FROM_PRINTED_VALUES";
  }> = [];
  if (creditTotal !== null) {
    keyFacts.push({ label: "Crédito total", value: formatEuros(creditTotal), basis: "PRINTED" });
  }
  if (creditApplied !== null) {
    keyFacts.push({ label: "Aplicado a las deudas", value: formatEuros(creditApplied), basis: "PRINTED" });
  }
  if (debtTotals.length > 0) {
    keyFacts.push({ label: "Deudas incluidas", value: String(debtTotals.length), basis: "PRINTED" });
  }
  if (remainingTotal !== null) {
    keyFacts.push({ label: "Pendiente en esas deudas", value: formatEuros(remainingTotal), basis: "PRINTED" });
  }
  if (residualCredit !== null) {
    keyFacts.push({
      label: "Crédito no consumido",
      value: formatEuros(residualCredit),
      basis: "CALCULATED_FROM_PRINTED_VALUES",
    });
  }
  if (totalDebt !== null && creditApplied !== null && totalDebt !== creditApplied) {
    keyFacts.push({
      label: "Comprobación pendiente",
      value: "El total de deuda y la compensación aplicada no coinciden",
      basis: "CALCULATED_FROM_PRINTED_VALUES",
    });
  }
  return {
    ruleId: "aeat.offset-agreement.explanation",
    ruleVersion: "1.0.0",
    status: remaining.length > 0 && creditTotal !== null ? "EXPLAINED" : "PARTIAL",
    whatItIs: requested
      ? "Es la resolución de una compensación que se solicitó a la AEAT: usa un crédito reconocido para cancelar deudas incluidas en el acuerdo."
      : input.documentSubtype === "EX_OFFICIO"
        ? "Es un acuerdo por el que la AEAT compensa de oficio un crédito reconocido con deudas incluidas en la resolución."
        : base.whatItIs,
    whyReceived,
    result,
    nextStep,
    deadline,
    keyFacts: Object.freeze(keyFacts.map((fact) => Object.freeze(fact))),
    officialSources: resolveSources(base.sourceIds),
  };
}

function explainBase(
  input: FiscalNotificationDocumentExplanationInputV1,
  base: BaseExplanationProfile,
): Omit<FiscalNotificationDocumentExplanationV1, "schemaVersion" | "engineId" | "engineVersion" | "knowledgeSnapshotId" | "documentFactsPolicy" | "legalContextPolicy" | "networkPolicy" | "requiresHumanReview" | "materializationPolicy"> {
  return {
    ruleId: `document-type.${input.documentType.toLowerCase()}.explanation`,
    ruleVersion: "1.0.0",
    status: input.documentType === "UNKNOWN" ? "PARTIAL" : "EXPLAINED",
    whatItIs: base.whatItIs,
    whyReceived: base.whyReceived,
    result: base.result,
    nextStep: Object.freeze({
      status: "REVIEW_DOCUMENT_ACTION" as const,
      title: base.nextStepTitle,
      detail: base.nextStepDetail,
    }),
    deadline: Object.freeze({
      status: "NOT_IDENTIFIED" as const,
      title: "Busca el plazo impreso y la fecha de notificación",
      detail:
        "El motor no convierte la fecha del documento o del escaneo en fecha de notificación. Si falta ese dato, no inventa un vencimiento.",
    }),
    keyFacts: Object.freeze([]),
    officialSources: resolveSources(base.sourceIds),
  };
}

function offsetDeadline(
  receiptDate: string | null,
): FiscalNotificationDocumentExplanationV1["deadline"] {
  return receiptDate
    ? Object.freeze({
        status: "RECEIPT_DATE_AVAILABLE" as const,
        title: "Si no estás conforme: un mes desde el día siguiente a la recepción",
        detail: `La fecha de recepción registrada es ${receiptDate}. Antes de presentar un recurso debe confirmarse el último día hábil; el motor no lo convierte en una acción automática.`,
      })
    : Object.freeze({
        status: "MISSING_RECEIPT_DATE" as const,
        title: "Si no estás conforme: falta la fecha de recepción",
        detail:
          "La AEAT indica un máximo de un mes desde el día siguiente a la recepción para elegir recurso de reposición o reclamación económico-administrativa. La fecha de firma, la fecha del PDF y la fecha de escaneo no sustituyen la recepción.",
      });
}

function sumMoney(
  money: readonly FiscalNotificationExplanationMoneyInputV1[],
  kind: AdministrativeMoneyKind,
  referenceType?: ExternalReferenceType,
): number | null {
  return safeSum(
    money
      .filter(
        (fact) =>
          fact.kind === kind &&
          fact.currency === "EUR" &&
          (referenceType === undefined ||
            fact.sourceReferenceType === referenceType),
      )
      .map((fact) => fact.amountCents),
  );
}

function safeSum(values: readonly number[]): number | null {
  if (values.length === 0) return null;
  let result = 0;
  for (const value of values) {
    if (!Number.isSafeInteger(value) || value < 0) return null;
    result += value;
    if (!Number.isSafeInteger(result)) return null;
  }
  return result;
}

function factValue(
  facts: readonly FiscalNotificationExplanationFactInputV1[],
  label: string,
): string | null {
  return facts.find((fact) => fact.label === label)?.value ?? null;
}

function formatEuros(cents: number): string {
  const euros = Math.floor(cents / 100);
  const decimals = String(cents % 100).padStart(2, "0");
  return `${String(euros).replace(/\B(?=(\d{3})+(?!\d))/gu, ".")},${decimals} €`;
}

function resolveSources(sourceIds: readonly string[]) {
  return Object.freeze(
    sourceIds.flatMap((id) => {
      const source = resolveFiscalNotificationOfficialSourceV2(id);
      return source
        ? [
            Object.freeze({
              id: source.id,
              title: source.title,
              authority: source.authority,
              canonicalUrl: source.canonicalUrl,
            }),
          ]
        : [];
    }),
  );
}

function profile(
  whatItIs: string,
  whyReceived: string,
  result: string,
  nextStepTitle: string,
  nextStepDetail: string,
  sourceIds: readonly string[],
): BaseExplanationProfile {
  return Object.freeze({
    whatItIs,
    whyReceived,
    result,
    nextStepTitle,
    nextStepDetail,
    sourceIds: Object.freeze([...sourceIds]),
  });
}

function genericProfile(description: string): BaseExplanationProfile {
  return profile(
    `Es ${description}.`,
    "El organismo emisor comunica un acto o una actuación que identifica en el documento.",
    "El efecto exacto depende del título, los hechos, las fechas y las instrucciones impresas.",
    "Revisa qué comunica y qué solicita",
    "Comprueba organismo, referencias, fecha de notificación, instrucciones y plazo antes de actuar.",
    [],
  );
}

function freezeExplanation(
  value: Omit<FiscalNotificationDocumentExplanationV1, "schemaVersion" | "engineId" | "engineVersion" | "knowledgeSnapshotId" | "documentFactsPolicy" | "legalContextPolicy" | "networkPolicy" | "requiresHumanReview" | "materializationPolicy">,
): FiscalNotificationDocumentExplanationV1 {
  return Object.freeze({
    schemaVersion: 1,
    engineId: FISCAL_NOTIFICATION_DOCUMENT_EXPLANATION_ENGINE_ID_V1,
    engineVersion: FISCAL_NOTIFICATION_DOCUMENT_EXPLANATION_ENGINE_VERSION_V1,
    knowledgeSnapshotId: FISCAL_NOTIFICATION_DOCUMENT_KNOWLEDGE_SNAPSHOT_V1,
    ...value,
    keyFacts: Object.freeze([...value.keyFacts]),
    officialSources: Object.freeze([...value.officialSources]),
    documentFactsPolicy: "DOCUMENT_IS_PRIMARY",
    legalContextPolicy: "OFFICIAL_CONTEXT_DOES_NOT_OVERRIDE_DOCUMENT",
    networkPolicy: "NO_NETWORK",
    requiresHumanReview: true,
    materializationPolicy: "PROHIBITED_UNTIL_REVIEW",
  });
}
