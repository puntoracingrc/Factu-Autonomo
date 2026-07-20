import type { AeatP0DeepProfileIdV10 } from "./knowledge/p0-deep-contracts.v10";

export const AEAT_P0_RELATION_ENGINE_VERSION_V10 = "10.0.0" as const;
export const AEAT_P0_RELATION_RULE_IDS_V10 = Object.freeze([
  "RESPONSE_TO",
  "REQUESTS_EXTENSION_FOR",
  "DECIDES_EXTENSION_REQUEST",
  "RECTIFIES_FILING",
  "CONTINUES_RECTIFICATION",
  "RESOLVES_RECTIFICATION",
  "PRECEDES_REFUND_PAYMENT",
  "EXECUTES_REVIEW_RESOLUTION",
  "CORRECTS_CERTIFICATE",
] as const);
export type AeatP0RelationRuleIdV10 = (typeof AEAT_P0_RELATION_RULE_IDS_V10)[number];

export interface AeatP0RelationDocumentV10 {
  readonly documentId: string;
  readonly ownerScope: string;
  readonly familyId: string;
  /** Owner-partitioned SHA-256 fingerprints. No raw references or values. */
  readonly exactFingerprints: Readonly<Record<string, string>>;
  /** Model/period/date/amount context can only create a suggestion. */
  readonly contextFingerprints: Readonly<Record<string, string>>;
}

export interface AeatP0RelationV10 {
  readonly relationId: string;
  readonly ruleId: AeatP0RelationRuleIdV10;
  readonly sourceDocumentId: string;
  readonly targetDocumentId: string;
  readonly sourceFamilyId: string;
  readonly targetFamilyId: string;
  readonly status: "SYSTEM_CONFIRMED_EXACT" | "SUGGESTED";
  readonly matchingFieldIds: readonly string[];
  readonly explanation: string;
  readonly forbiddenInference: string;
  readonly assertionLayer: "CONFIRMED_BY_LATER_DOCUMENT" | "RELATION_INFERRED";
  readonly requiresHumanReview: true;
  readonly autoMaterialization: false;
}

export interface AeatP0RelationRuleV10 {
  readonly ruleId: AeatP0RelationRuleIdV10;
  readonly sourceProfiles: readonly string[];
  readonly target: "REQUIREMENT_OR_PROPOSAL" | "ACT_WITH_DEADLINE" | "ORIGINAL_SELF_ASSESSMENT" | readonly string[];
  readonly exactGroups: readonly (readonly string[])[];
  readonly suggestedFields: readonly string[];
  readonly exactPhrase: string;
  readonly suggestedPhrase: string;
  readonly forbidden: string;
}

export const AEAT_P0_RELATION_RULES_V10 = Object.freeze([
  rule("RESPONSE_TO", ["evidence.submission_receipt"], "REQUIREMENT_OR_PROPOSAL", [["ACT_ID", "PROCEDURE_ID", "NOTIFICATION_ID"]], ["MODEL", "TAX_PERIOD", "DOCUMENT_DATE"], "Este justificante acredita que se presentó una respuesta al documento anterior en la fecha indicada.", "Puede ser la respuesta al documento anterior por coincidencia de trámite y fecha. Revisa la referencia antes de confirmarlo.", "No decir que la AEAT aceptó el contenido."),
  rule("REQUESTS_EXTENSION_FOR", ["procedure.deadline_extension_request"], "ACT_WITH_DEADLINE", [["PROCEDURE_ID", "ACT_ID"], ["ORIGINAL_DEADLINE"]], ["PROCEDURE_FAMILY", "FILING_DATE"], "Esta solicitud pide ampliar el plazo del trámite anterior.", "Puede referirse al plazo del documento anterior. Revisa el expediente y la fecha límite.", "No afirmar sin evaluar el artículo 91 que el plazo se mantiene o se amplía."),
  rule("DECIDES_EXTENSION_REQUEST", ["procedure.deadline_extension_decision"], ["procedure.deadline_extension_request"], [["FILING_RECEIPT_ID", "PROCEDURE_ID"], ["EXPLICIT_REQUEST_CITATION"]], ["PROCEDURE_ID", "DOCUMENT_DATE"], "Este acuerdo decide la solicitud de ampliación anterior y fija su efecto sobre el plazo.", "Puede decidir la solicitud anterior, pero falta una referencia común.", "No modificar otros plazos."),
  rule("RECTIFIES_FILING", ["assessment.rectification_request", "filing.rectifying_self_assessment_receipt"], "ORIGINAL_SELF_ASSESSMENT", [["ORIGINAL_FILING_RECEIPT_ID"], ["MODEL"], ["FISCAL_YEAR"], ["TAX_PERIOD"]], ["MODEL", "FISCAL_YEAR", "TAX_PERIOD"], "Este documento rectifica la autoliquidación anterior identificada por su justificante.", "Puede referirse a la autoliquidación anterior por modelo y período; confirma el número de justificante.", "No confundir solicitud tradicional con autoliquidación rectificativa."),
  rule("CONTINUES_RECTIFICATION", ["assessment.rectification_requirement", "assessment.rectification_proposal"], ["assessment.rectification_request"], [["PROCEDURE_ID"], ["ORIGINAL_FILING_RECEIPT_ID"]], ["MODEL", "TAX_PERIOD", "REQUEST_DATE"], "Este documento continúa el procedimiento de rectificación iniciado por la solicitud anterior.", "Puede pertenecer a la misma rectificación; revisa el expediente.", "No afirmar resultado definitivo."),
  rule("RESOLVES_RECTIFICATION", ["assessment.rectification_resolution"], ["assessment.rectification_request", "assessment.rectification_proposal"], [["PROCEDURE_ID"], ["ORIGINAL_FILING_RECEIPT_ID"]], ["MODEL", "TAX_PERIOD", "RESULT"], "Esta resolución decide la rectificación solicitada anteriormente.", "Puede resolver la rectificación anterior, pero falta una referencia exacta.", "No afirmar pago de una devolución."),
  rule("PRECEDES_REFUND_PAYMENT", ["assessment.rectification_resolution"], ["refund.payment_communication"], [["REFUND_REFERENCE", "ACT_ID"]], ["MODEL", "TAX_PERIOD", "AMOUNT"], "La comunicación posterior informa del pago o aplicación de la devolución reconocida en esta resolución.", "Puede corresponder a la devolución reconocida; revisa la referencia.", "Resolución favorable no equivale a transferencia."),
  rule("EXECUTES_REVIEW_RESOLUTION", ["review.execution_resolution"], ["review.resolution"], [["REVIEW_RESOLUTION_ID"]], ["ORIGINAL_ACT_ID", "RESULT"], "Este acuerdo ejecuta materialmente la resolución anterior en el alcance indicado.", "Puede ser la ejecución de la resolución anterior; falta el identificador exacto.", "No confundir resolución estimatoria con ejecución completada."),
  rule("CORRECTS_CERTIFICATE", ["certificate.correction_or_disagreement"], ["certificate.specialized"], [["CERTIFICATE_ID", "REPLACEMENT_CERTIFICATE_ID"]], ["CERTIFICATE_KIND", "DOCUMENT_DATE"], "Este documento corrige o sustituye el certificado anterior en los datos indicados.", "Puede referirse al certificado anterior, pero falta una referencia exacta.", "No invalidar campos no mencionados."),
] as const satisfies readonly AeatP0RelationRuleV10[]);

function rule(ruleId: AeatP0RelationRuleIdV10, sourceProfiles: readonly AeatP0DeepProfileIdV10[], target: AeatP0RelationRuleV10["target"], exactGroups: readonly (readonly string[])[], suggestedFields: readonly string[], exactPhrase: string, suggestedPhrase: string, forbidden: string): AeatP0RelationRuleV10 {
  return Object.freeze({ ruleId, sourceProfiles: Object.freeze([...sourceProfiles]), target, exactGroups: Object.freeze(exactGroups.map((group) => Object.freeze([...group]))), suggestedFields: Object.freeze([...suggestedFields]), exactPhrase, suggestedPhrase, forbidden });
}

const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/u;
const SAFE_FIELD = /^[A-Z][A-Z0-9_]{0,159}$/u;
const SHA256 = /^[0-9a-f]{64}$/u;
const MAX_DOCUMENTS = 2_000;
const MAX_RELATIONS = 10_000;

function snapshotFingerprints(value: unknown, path: string): Readonly<Record<string, string>> {
  if (value === null || typeof value !== "object" || Array.isArray(value) || (Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null)) throw new Error(`AEAT_P0_RELATION_V10_INVALID:${path}`);
  const descriptors = Object.getOwnPropertyDescriptors(value);
  if (Object.keys(descriptors).length > 128) throw new Error("AEAT_P0_RELATION_V10_LIMIT");
  const output: Record<string, string> = {};
  for (const [fieldId, descriptor] of Object.entries(descriptors)) {
    if (descriptor.get || descriptor.set || !("value" in descriptor) || !SAFE_FIELD.test(fieldId) || typeof descriptor.value !== "string" || !SHA256.test(descriptor.value)) throw new Error(`AEAT_P0_RELATION_V10_INVALID:${path}`);
    output[fieldId] = descriptor.value;
  }
  return Object.freeze(output);
}

function snapshotDocument(value: AeatP0RelationDocumentV10): AeatP0RelationDocumentV10 {
  if (value === null || typeof value !== "object" || Array.isArray(value)) throw new Error("AEAT_P0_RELATION_V10_INVALID:document");
  const keys = Object.keys(value);
  if (keys.length !== 5 || keys.some((key) => !["documentId", "ownerScope", "familyId", "exactFingerprints", "contextFingerprints"].includes(key))) throw new Error("AEAT_P0_RELATION_V10_INVALID:document");
  if (!SAFE_ID.test(value.documentId) || !SAFE_ID.test(value.ownerScope) || !SAFE_ID.test(value.familyId)) throw new Error("AEAT_P0_RELATION_V10_INVALID:document");
  return Object.freeze({ documentId: value.documentId, ownerScope: value.ownerScope, familyId: value.familyId, exactFingerprints: snapshotFingerprints(value.exactFingerprints, "exactFingerprints"), contextFingerprints: snapshotFingerprints(value.contextFingerprints, "contextFingerprints") });
}

function targetMatches(target: AeatP0RelationRuleV10["target"], familyId: string): boolean {
  if (Array.isArray(target)) return target.includes(familyId);
  if (target === "REQUIREMENT_OR_PROPOSAL") return familyId.includes("requirement") || familyId.includes("proposal");
  if (target === "ACT_WITH_DEADLINE") return familyId !== "procedure.deadline_extension_request" && familyId !== "procedure.deadline_extension_decision";
  return familyId.includes("self_assessment") || familyId.includes("self-assessment") || familyId === "filing.return_receipt";
}

function matchedFields(source: AeatP0RelationDocumentV10, target: AeatP0RelationDocumentV10, fields: readonly string[], context: boolean): readonly string[] {
  const left = context ? source.contextFingerprints : source.exactFingerprints;
  const right = context ? target.contextFingerprints : target.exactFingerprints;
  return Object.freeze(fields.filter((fieldId) => left[fieldId] !== undefined && left[fieldId] === right[fieldId]));
}

export function reconcileAeatP0RelationsV10(input: readonly AeatP0RelationDocumentV10[]): readonly AeatP0RelationV10[] {
  if (!Array.isArray(input) || input.length > MAX_DOCUMENTS) throw new Error("AEAT_P0_RELATION_V10_LIMIT");
  const documents = input.map(snapshotDocument);
  const seen = new Set<string>();
  documents.forEach((document) => {
    const key = `${document.ownerScope}:${document.documentId}`;
    if (seen.has(key)) throw new Error("AEAT_P0_RELATION_V10_DUPLICATE");
    seen.add(key);
  });
  const relations = new Map<string, AeatP0RelationV10>();
  for (const definition of AEAT_P0_RELATION_RULES_V10) {
    const sources = documents.filter((document) => definition.sourceProfiles.includes(document.familyId));
    const targets = documents.filter((document) => targetMatches(definition.target, document.familyId));
    for (const source of sources) for (const target of targets) {
      if (source.ownerScope !== target.ownerScope || source.documentId === target.documentId) continue;
      const exactMatches = definition.exactGroups.flatMap((group) => matchedFields(source, target, group, false));
      const exact = definition.exactGroups.every((group) => matchedFields(source, target, group, false).length > 0);
      const suggestionMatches = matchedFields(source, target, definition.suggestedFields, true);
      if (!exact && suggestionMatches.length === 0) continue;
      const relationId = `p0-v10:${definition.ruleId}:${source.documentId}:${target.documentId}`;
      relations.set(relationId, Object.freeze({
        relationId,
        ruleId: definition.ruleId,
        sourceDocumentId: source.documentId,
        targetDocumentId: target.documentId,
        sourceFamilyId: source.familyId,
        targetFamilyId: target.familyId,
        status: exact ? "SYSTEM_CONFIRMED_EXACT" : "SUGGESTED",
        matchingFieldIds: Object.freeze(exact ? [...new Set(exactMatches)] : suggestionMatches),
        explanation: exact ? definition.exactPhrase : definition.suggestedPhrase,
        forbiddenInference: definition.forbidden,
        assertionLayer: exact ? "CONFIRMED_BY_LATER_DOCUMENT" : "RELATION_INFERRED",
        requiresHumanReview: true,
        autoMaterialization: false,
      }));
      if (relations.size > MAX_RELATIONS) throw new Error("AEAT_P0_RELATION_V10_LIMIT");
    }
  }
  return Object.freeze([...relations.values()].sort((left, right) => left.relationId.localeCompare(right.relationId)));
}
