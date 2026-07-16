import { assertBoundedOwnerScope } from "./input-contract";

export const REAL_CORPUS_RELATION_ENGINE_VERSION_V2 =
  "real-corpus-relations.2026-07-16.v2" as const;

export type RealCorpusRelationTypeV2 =
  | "REFUND_PAYMENT_COMPLETES_COMPENSATION"
  | "NOTIFICATION_EVIDENCE_FOR"
  | "SAME_TAX_YEAR_CONTEXT"
  | "PROPOSAL_PRECEDES_ASSESSMENT"
  | "ANNUAL_REPORT_SERIES";

export interface RealCorpusRelationDocumentV2 {
  readonly ownerScope: string;
  readonly documentId: string;
  readonly familyId: string;
  readonly officialReferences: Readonly<
    Partial<
      Record<
        | "DOCUMENT_REFERENCE"
        | "AGREEMENT_ID"
        | "REFUND_REFERENCE"
        | "UNDERLYING_ACT_REFERENCE",
        string
      >
    >
  >;
  readonly taxConcept: string | null;
  readonly fiscalYear: string | null;
  readonly documentStage:
    "PUBLICATION_ONLY" | "EFFECTIVE_NOTIFICATION" | "PREPUBLICATION" | null;
}

export interface RealCorpusRelationV2 {
  readonly engineVersion: typeof REAL_CORPUS_RELATION_ENGINE_VERSION_V2;
  readonly relationType: RealCorpusRelationTypeV2;
  readonly status: "SYSTEM_CONFIRMED_EXACT" | "SUGGESTED" | "CONTEXT_ONLY";
  readonly sourceDocumentId: string;
  readonly targetDocumentId: string;
  readonly exactReference: string | null;
  readonly phrase: string;
  readonly requiresHumanReview: true;
  readonly permitsAutomaticAction: false;
}

const ID = /^[A-Za-z0-9][A-Za-z0-9_.:/-]{0,159}$/u;
const REFERENCE = /^[A-Z0-9][A-Z0-9./:_-]{2,199}$/u;
const PRIVATE_REFERENCE =
  /^(?:\d{8}[A-Z]|[XYZ]\d{7}[A-Z]|[ABCDEFGHJNPQRSUVW]\d{7}[0-9A-J]|ES\d{22}|[6789]\d{8})$/u;

function validDocument(input: RealCorpusRelationDocumentV2): boolean {
  try {
    assertBoundedOwnerScope(input.ownerScope, "relation.ownerScope");
  } catch {
    return false;
  }
  return (
    ID.test(input.documentId) &&
    Object.values(input.officialReferences).every(
      (value) =>
        value === undefined ||
        (REFERENCE.test(value) && !PRIVATE_REFERENCE.test(value)),
    ) &&
    (input.fiscalYear === null || /^(?:19|20)\d{2}$/u.test(input.fiscalYear))
  );
}

function relation(
  input: Omit<
    RealCorpusRelationV2,
    "engineVersion" | "requiresHumanReview" | "permitsAutomaticAction"
  >,
): RealCorpusRelationV2 {
  return Object.freeze({
    engineVersion: REAL_CORPUS_RELATION_ENGINE_VERSION_V2,
    ...input,
    requiresHumanReview: true as const,
    permitsAutomaticAction: false as const,
  });
}

function sameExact(
  left: string | undefined,
  right: string | undefined,
): string | null {
  return left && right && left === right ? left : null;
}

/**
 * Relates two already-structured documents without fuzzy matching. Exact
 * relations require the same owner and the precise official reference(s).
 */
export function relateRealCorpusDocumentsV2(
  source: RealCorpusRelationDocumentV2,
  target: RealCorpusRelationDocumentV2,
): readonly RealCorpusRelationV2[] {
  if (
    !validDocument(source) ||
    !validDocument(target) ||
    source.documentId === target.documentId ||
    source.ownerScope !== target.ownerScope
  ) {
    return Object.freeze([]);
  }
  const relations: RealCorpusRelationV2[] = [];
  const payment =
    source.familyId === "refund.payment_communication" ? source : target;
  const offset =
    source.familyId === "collection.offset_requested" ? source : target;
  if (
    payment.familyId === "refund.payment_communication" &&
    offset.familyId === "collection.offset_requested"
  ) {
    const agreement = sameExact(
      payment.officialReferences.AGREEMENT_ID,
      offset.officialReferences.AGREEMENT_ID,
    );
    const refund = sameExact(
      payment.officialReferences.REFUND_REFERENCE,
      offset.officialReferences.REFUND_REFERENCE,
    );
    if (agreement && refund) {
      relations.push(
        relation({
          relationType: "REFUND_PAYMENT_COMPLETES_COMPENSATION",
          status: "SYSTEM_CONFIRMED_EXACT",
          sourceDocumentId: offset.documentId,
          targetDocumentId: payment.documentId,
          exactReference: agreement,
          phrase:
            "Esta comunicación cierra el resultado económico del acuerdo de compensación anterior: confirma la cantidad aplicada a las deudas y el importe líquido cuya transferencia se ordenó.",
        }),
      );
    }
  }

  const evidence =
    source.familyId === "notification.publication_or_appearance"
      ? source
      : target;
  const underlying = evidence === source ? target : source;
  if (evidence.familyId === "notification.publication_or_appearance") {
    const reference = sameExact(
      evidence.officialReferences.UNDERLYING_ACT_REFERENCE,
      underlying.officialReferences.DOCUMENT_REFERENCE,
    );
    if (reference) {
      const phrase =
        evidence.documentStage === "EFFECTIVE_NOTIFICATION"
          ? "Este certificado acredita que el acto identificado quedó notificado por comparecencia en la fecha impresa. No sustituye el acto ni explica su contenido."
          : evidence.documentStage === "PREPUBLICATION"
            ? "Esta comunicación anuncia una futura publicación. Todavía no acredita que el acto haya quedado notificado."
            : "Este documento acredita la publicación de la citación, pero no permite afirmar la fecha efectiva de notificación.";
      relations.push(
        relation({
          relationType: "NOTIFICATION_EVIDENCE_FOR",
          status: "SYSTEM_CONFIRMED_EXACT",
          sourceDocumentId: evidence.documentId,
          targetDocumentId: underlying.documentId,
          exactReference: reference,
          phrase,
        }),
      );
    }
  }

  const proposal =
    source.familyId === "assessment.allegations_and_proposal" ? source : target;
  const assessment =
    source.familyId === "assessment.final_provisional_assessment"
      ? source
      : target;
  if (
    proposal.familyId === "assessment.allegations_and_proposal" &&
    assessment.familyId === "assessment.final_provisional_assessment"
  ) {
    const reference = sameExact(
      proposal.officialReferences.DOCUMENT_REFERENCE,
      assessment.officialReferences.DOCUMENT_REFERENCE,
    );
    if (reference) {
      relations.push(
        relation({
          relationType: "PROPOSAL_PRECEDES_ASSESSMENT",
          status: "SYSTEM_CONFIRMED_EXACT",
          sourceDocumentId: proposal.documentId,
          targetDocumentId: assessment.documentId,
          exactReference: reference,
          phrase:
            "La liquidación posterior resuelve esta propuesta y el trámite de alegaciones. Debe compararse el resultado final con el importe propuesto.",
        }),
      );
    }
  }

  if (
    source.familyId === "information.tax_data_report" &&
    target.familyId === "information.tax_data_report" &&
    source.fiscalYear !== null &&
    target.fiscalYear !== null &&
    source.fiscalYear !== target.fiscalYear
  ) {
    relations.push(
      relation({
        relationType: "ANNUAL_REPORT_SERIES",
        status: "CONTEXT_ONLY",
        sourceDocumentId: source.documentId,
        targetDocumentId: target.documentId,
        exactReference: null,
        phrase:
          "Es el informe de datos fiscales de otro ejercicio. No sustituye ni corrige el de este año.",
      }),
    );
  } else if (
    source.taxConcept !== null &&
    source.taxConcept === target.taxConcept &&
    source.fiscalYear !== null &&
    source.fiscalYear === target.fiscalYear &&
    relations.length === 0
  ) {
    relations.push(
      relation({
        relationType: "SAME_TAX_YEAR_CONTEXT",
        status: "SUGGESTED",
        sourceDocumentId: source.documentId,
        targetDocumentId: target.documentId,
        exactReference: null,
        phrase:
          "Ambos documentos corresponden al mismo impuesto y ejercicio, pero esa coincidencia no demuestra que formen el mismo expediente. Revísalo antes de confirmar la relación.",
      }),
    );
  }
  return Object.freeze(relations);
}
