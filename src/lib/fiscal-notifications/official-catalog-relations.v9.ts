export const AEAT_OFFICIAL_CATALOG_RELATIONS_VERSION_V9 = "9.0.0" as const;

export interface AeatOfficialCatalogRelationDocumentV9 {
  readonly documentId: string;
  readonly ownerScope: string;
  readonly familyId: string;
  /** Owner-scoped fingerprints only. Raw references are rejected. */
  readonly referenceFingerprints: Readonly<Record<string, string>>;
  /** Model, period, date or amount fingerprints can only support suggestions. */
  readonly contextFingerprints: Readonly<Record<string, string>>;
}

export interface AeatOfficialCatalogRelationV9 {
  readonly relationId: string;
  readonly chainId: AeatOfficialCatalogChainIdV9;
  readonly fromDocumentId: string;
  readonly toDocumentId: string;
  readonly fromFamilyId: string;
  readonly toFamilyId: string;
  readonly status: "SYSTEM_CONFIRMED_EXACT" | "SUGGESTED";
  readonly matchingReferenceFieldIds: readonly string[];
  readonly explanation: string;
  readonly forbiddenInference: string;
  readonly autoMaterialization: false;
  readonly requiresHumanReview: true;
}

export type AeatOfficialCatalogChainIdV9 =
  | "V9-C01"
  | "V9-C02"
  | "V9-C03"
  | "V9-C04"
  | "V9-C05"
  | "V9-C06"
  | "V9-C07"
  | "V9-C08"
  | "V9-C09"
  | "V9-C10"
  | "V9-C11";

interface ChainV9 {
  readonly id: AeatOfficialCatalogChainIdV9;
  readonly nodes: readonly string[];
  readonly exactReferenceFieldIds: readonly string[];
  readonly explanation: string;
  readonly forbiddenInference: string;
}

export const AEAT_OFFICIAL_CATALOG_CHAINS_V9 = Object.freeze([
  chain("V9-C01", [
    "assessment.rectification_request",
    "assessment.rectification_requirement",
    "assessment.rectification_proposal",
    "assessment.rectification_resolution",
    "refund.payment_communication",
  ], ["ORIGINAL_FILING_RECEIPT_ID", "PROCEDURE_ID"],
  "La solicitud pide corregir una autoliquidación anterior. La propuesta anticipa el resultado; la resolución decide y solo una comunicación posterior confirma el pago de una devolución.",
  "Solicitud no equivale a rectificación aceptada; una resolución favorable no acredita una transferencia bancaria."),
  chain("V9-C02", [
    "filing.rectifying_self_assessment_receipt",
    "payment.payment_form",
    "refund.request_or_recognition",
  ], ["ORIGINAL_FILING_RECEIPT_ID", "FILING_RECEIPT_ID"],
  "Esta presentación modifica la última autoliquidación identificada. El justificante acredita la presentación, no que la AEAT comparta el criterio declarado.",
  "No confundir rectificativa con complementaria ni con resolución administrativa."),
  chain("V9-C03", [
    "procedure.deadline_extension_request",
    "procedure.deadline_extension_decision",
  ], ["PROCEDURE_ID", "ACT_ID", "FILING_RECEIPT_ID"],
  "Se pidió más tiempo para este trámite. El plazo solo cambia si existe un acuerdo que lo conceda o una nueva fecha expresa.",
  "La solicitud no suspende automáticamente el plazo original."),
  chain("V9-C04", [
    "registry.redeme_requirement",
    "registry.redeme_proposal",
    "registry.redeme_resolution",
    "registry.redeme_cautionary_deregistration",
    "registry.sii_inclusion_or_exclusion",
  ], ["REGISTRY_ID", "PROCEDURE_ID", "ACT_ID"],
  "La resolución decide la situación en el REDEME. Una baja puede afectar al SII desde la fecha indicada, pero no elimina el resto de obligaciones de IVA.",
  "Una propuesta no es una resolución y una baja cautelar no es una baja definitiva."),
  chain("V9-C05", [
    "certificate.specialized",
    "certificate.correction_or_disagreement",
  ], ["CERTIFICATE_ID", "REGISTRY_ID"],
  "El certificado acredita únicamente el hecho, alcance y fecha impresos. La corrección posterior sustituye los datos concretos que indique.",
  "Un certificado negativo no es una liquidación y un resultado histórico no prueba el estado actual."),
  chain("V9-C06", [
    "review.resolution",
    "review.execution_resolution",
    "review.execution_challenge",
  ], ["REVIEW_RESOLUTION_ID", "ORIGINAL_ACT_ID", "EXECUTION_ACT_ID"],
  "La resolución decide la impugnación; el acuerdo de ejecución aplica materialmente lo decidido. El recurso contra la ejecución discute esa aplicación, no necesariamente todo el fondo.",
  "Un recurso no implica suspensión y una resolución estimatoria no acredita que su ejecución ya se haya completado."),
  chain("V9-C07", [
    "representation.power_registration",
    "representation.power_change",
  ], ["REGISTRY_ID", "PREVIOUS_REGISTRY_ID"],
  "El poder permite actuar únicamente en el alcance y período indicados. La revocación o renuncia surte efectos desde la fecha registrada.",
  "Un poder específico no equivale a un poder general."),
  chain("V9-C08", [
    "notification.electronic_assignment",
    "notification.dehu_envelope",
  ], ["NOTIFICATION_ID", "ACT_ID", "PROCEDURE_ID"],
  "La asignación establece el canal; la evidencia DEHú acredita la puesta a disposición o acceso; el acto adjunto contiene la obligación real.",
  "La asignación no es una notificación concreta y la disponibilidad no equivale al acceso."),
  chain("V9-C09", [
    "seizure.real_estate",
    "collection.asset_valuation",
    "collection.auction_announcement",
    "collection.auction_suspension_or_release",
    "collection.auction_adjudication",
    "collection.extinction_or_balance_notice",
  ], ["SEIZURE_ORDER_ID", "AUCTION_ID", "ASSET_OPAQUE_ID"],
  "La valoración prepara la venta; el anuncio abre la subasta; la adjudicación informa del resultado. Solo la aplicación del producto permite conocer cuánto reduce la deuda.",
  "La valoración no es el precio final y la adjudicación no acredita la extinción total."),
  chain("V9-C10", [
    "refund.request_or_recognition",
    "refund.bank_data_requirement",
    "evidence.submission_receipt",
    "refund.payment_communication",
  ], ["REFUND_REFERENCE", "PROCEDURE_ID", "FILING_RECEIPT_ID"],
  "La AEAT necesita completar los datos para ordenar el pago. La contestación no acredita la transferencia; la comunicación de pago informa de la orden.",
  "El requerimiento bancario no equivale a una devolución denegada."),
  chain("V9-C11", [
    "sanction.initiation_and_hearing",
    "sanction.termination_without_penalty",
  ], ["SANCTION_REFERENCE", "ACT_ID"],
  "El expediente se cierra sin imponer sanción por la causa indicada.",
  "El archivo sancionador no anula automáticamente una liquidación tributaria separada."),
] as const satisfies readonly ChainV9[]);

function chain(
  id: AeatOfficialCatalogChainIdV9,
  nodes: readonly string[],
  exactReferenceFieldIds: readonly string[],
  explanation: string,
  forbiddenInference: string,
): ChainV9 {
  return Object.freeze({
    id,
    nodes: Object.freeze([...nodes]),
    exactReferenceFieldIds: Object.freeze([...exactReferenceFieldIds]),
    explanation,
    forbiddenInference,
  });
}

const SAFE_ID = /^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,159}$/u;
const SAFE_FIELD = /^[A-Z][A-Z0-9_]{0,159}$/u;
const OWNER_FINGERPRINT = /^[0-9a-f]{64}$/u;
const DOCUMENT_KEYS = new Set([
  "documentId",
  "ownerScope",
  "familyId",
  "referenceFingerprints",
  "contextFingerprints",
]);
const MAX_RELATION_DOCUMENTS_V9 = 2_000;
const MAX_RELATIONS_V9 = 10_000;
const SUGGESTION_CONTEXT_FIELDS = new Set([
  "MODEL",
  "FISCAL_YEAR",
  "TAX_PERIOD",
  "DOCUMENT_DATE",
  "AMOUNT",
]);

function dataRecord(value: unknown, keys?: ReadonlySet<string>): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("AEAT_OFFICIAL_CATALOG_RELATION_V9_INVALID");
  }
  if (
    (Object.getPrototypeOf(value) !== Object.prototype &&
      Object.getPrototypeOf(value) !== null) ||
    Reflect.ownKeys(value).some((key) => typeof key === "symbol")
  ) throw new Error("AEAT_OFFICIAL_CATALOG_RELATION_V9_INVALID");
  const descriptors = Object.getOwnPropertyDescriptors(value);
  for (const [key, descriptor] of Object.entries(descriptors)) {
    if (
      descriptor.get ||
      descriptor.set ||
      !("value" in descriptor) ||
      (keys && !keys.has(key))
    ) throw new Error("AEAT_OFFICIAL_CATALOG_RELATION_V9_INVALID");
  }
  if (keys && Object.keys(descriptors).length !== keys.size) {
    throw new Error("AEAT_OFFICIAL_CATALOG_RELATION_V9_INVALID");
  }
  return Object.fromEntries(
    Object.entries(descriptors).map(([key, descriptor]) => [key, descriptor.value]),
  );
}

function validateDocument(value: unknown): AeatOfficialCatalogRelationDocumentV9 {
  const document = dataRecord(value, DOCUMENT_KEYS);
  const referenceFingerprints = dataRecord(document.referenceFingerprints);
  const contextFingerprints = dataRecord(document.contextFingerprints);
  if (
    typeof document.documentId !== "string" ||
    typeof document.ownerScope !== "string" ||
    typeof document.familyId !== "string" ||
    !SAFE_ID.test(document.documentId) ||
    !SAFE_ID.test(document.ownerScope) ||
    !SAFE_ID.test(document.familyId) ||
    Object.keys(referenceFingerprints).length > 80 ||
    Object.keys(contextFingerprints).length > 10
  ) throw new Error("AEAT_OFFICIAL_CATALOG_RELATION_V9_INVALID");
  for (const [fieldId, fingerprint] of Object.entries(referenceFingerprints)) {
    if (typeof fingerprint !== "string" || !SAFE_FIELD.test(fieldId) || !OWNER_FINGERPRINT.test(fingerprint)) {
      throw new Error("AEAT_OFFICIAL_CATALOG_RELATION_V9_INVALID");
    }
  }
  for (const [fieldId, fingerprint] of Object.entries(contextFingerprints)) {
    if (typeof fingerprint !== "string" || !SUGGESTION_CONTEXT_FIELDS.has(fieldId) || !OWNER_FINGERPRINT.test(fingerprint)) {
      throw new Error("AEAT_OFFICIAL_CATALOG_RELATION_V9_INVALID");
    }
  }
  return Object.freeze({
    documentId: document.documentId,
    ownerScope: document.ownerScope,
    familyId: document.familyId,
    referenceFingerprints: Object.freeze({ ...referenceFingerprints }) as Readonly<Record<string, string>>,
    contextFingerprints: Object.freeze({ ...contextFingerprints }) as Readonly<Record<string, string>>,
  });
}

function exactReferenceMatches(
  left: AeatOfficialCatalogRelationDocumentV9,
  right: AeatOfficialCatalogRelationDocumentV9,
  chainDefinition: ChainV9,
): readonly string[] {
  return Object.freeze(chainDefinition.exactReferenceFieldIds.filter((fieldId) => {
    const leftValue = left.referenceFingerprints[fieldId];
    const rightValue = right.referenceFingerprints[fieldId];
    return leftValue !== undefined && rightValue !== undefined && leftValue === rightValue;
  }));
}

function suggestionContextMatches(
  left: AeatOfficialCatalogRelationDocumentV9,
  right: AeatOfficialCatalogRelationDocumentV9,
): boolean {
  return [...SUGGESTION_CONTEXT_FIELDS].some((fieldId) => {
    const leftValue = left.contextFingerprints[fieldId];
    const rightValue = right.contextFingerprints[fieldId];
    return leftValue !== undefined && rightValue !== undefined && leftValue === rightValue;
  });
}

export function reconcileAeatOfficialCatalogRelationsV9(
  documents: readonly AeatOfficialCatalogRelationDocumentV9[],
): readonly AeatOfficialCatalogRelationV9[] {
  if (!Array.isArray(documents) || documents.length > MAX_RELATION_DOCUMENTS_V9) {
    throw new Error("AEAT_OFFICIAL_CATALOG_RELATION_V9_LIMIT");
  }
  for (const [key, descriptor] of Object.entries(
    Object.getOwnPropertyDescriptors(documents),
  )) {
    if (
      key !== "length" &&
      (!/^(?:0|[1-9]\d*)$/u.test(key) ||
        Number(key) >= documents.length ||
        descriptor.get ||
        descriptor.set ||
        !("value" in descriptor))
    ) {
      throw new Error("AEAT_OFFICIAL_CATALOG_RELATION_V9_INVALID");
    }
  }
  if (Object.keys(documents).length !== documents.length) {
    throw new Error("AEAT_OFFICIAL_CATALOG_RELATION_V9_INVALID");
  }
  const safeDocuments = documents.map(validateDocument);
  const seenDocumentIds = new Set<string>();
  for (const document of safeDocuments) {
    const key = `${document.ownerScope}:${document.documentId}`;
    if (seenDocumentIds.has(key)) throw new Error("AEAT_OFFICIAL_CATALOG_RELATION_V9_DUPLICATE");
    seenDocumentIds.add(key);
  }

  const output = new Map<string, AeatOfficialCatalogRelationV9>();
  for (const chainDefinition of AEAT_OFFICIAL_CATALOG_CHAINS_V9) {
    const positions = new Map(chainDefinition.nodes.map((node, index) => [node, index] as const));
    const candidates = safeDocuments.filter((document) => positions.has(document.familyId));
    for (const left of candidates) {
      const leftPosition = positions.get(left.familyId)!;
      for (const right of candidates) {
        const rightPosition = positions.get(right.familyId)!;
        if (rightPosition !== leftPosition + 1 || left.ownerScope !== right.ownerScope) continue;
        const matching = exactReferenceMatches(left, right, chainDefinition);
        if (matching.length === 0 && !suggestionContextMatches(left, right)) continue;
        const status = matching.length > 0 ? "SYSTEM_CONFIRMED_EXACT" : "SUGGESTED";
        const relationId = `${chainDefinition.id}:${left.documentId}:${right.documentId}`;
        output.set(relationId, Object.freeze({
          relationId,
          chainId: chainDefinition.id,
          fromDocumentId: left.documentId,
          toDocumentId: right.documentId,
          fromFamilyId: left.familyId,
          toFamilyId: right.familyId,
          status,
          matchingReferenceFieldIds: matching,
          explanation: chainDefinition.explanation,
          forbiddenInference: chainDefinition.forbiddenInference,
          autoMaterialization: false,
          requiresHumanReview: true,
        }));
        if (output.size > MAX_RELATIONS_V9) {
          throw new Error("AEAT_OFFICIAL_CATALOG_RELATION_V9_LIMIT");
        }
      }
    }
  }
  return Object.freeze([...output.values()].sort((left, right) => left.relationId.localeCompare(right.relationId)));
}
