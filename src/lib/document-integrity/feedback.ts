import type { DocumentSnapshotIntegrityIssue } from "../types";

export interface DocumentIntegrityBlockedFeedback {
  title: "Integridad bloqueada";
  reason: string;
  consequence: string;
  recovery: string;
}

const MISSING_ISSUES = new Set<DocumentSnapshotIntegrityIssue>([
  "document_snapshot_missing",
  "pdf_snapshot_missing",
  "pdf_without_document_snapshot",
  "snapshot_seal_missing",
]);

/**
 * Builds safe, non-technical feedback for a fail-closed document.
 *
 * The message deliberately does not suggest regenerating, resealing or editing
 * an issued document: recovery needs its own explicit, auditable workflow.
 */
export function getDocumentIntegrityBlockedFeedback(
  issues: readonly DocumentSnapshotIntegrityIssue[] = [],
): DocumentIntegrityBlockedFeedback {
  const hasMissingEvidence = issues.some((issue) => MISSING_ISSUES.has(issue));
  const hasRelationshipIssue = issues.includes("document_relationship_invalid");
  const hasInconsistentEvidence = issues.some(
    (issue) =>
      !MISSING_ISSUES.has(issue) && issue !== "document_relationship_invalid",
  );

  let reason: string;
  if (hasRelationshipIssue && !hasMissingEvidence && !hasInconsistentEvidence) {
    reason =
      "La relación fiscal entre documentos no coincide con sus copias históricas selladas.";
  } else if (hasMissingEvidence && !hasInconsistentEvidence) {
    reason =
      "Falta el snapshot, el PDF o el sello necesario para comprobar la copia histórica, o falta una relación fiscal verificable.";
  } else if (hasInconsistentEvidence && !hasMissingEvidence) {
    reason =
      "El snapshot, el PDF, el sello o su contexto no supera la comprobación de coherencia.";
  } else {
    reason =
      "El snapshot, el PDF, el sello o la relación fiscal falta o no supera la comprobación de coherencia.";
  }

  return {
    title: "Integridad bloqueada",
    reason,
    consequence:
      "No es la inmutabilidad normal de un documento emitido. Como protección fail-closed, sus importes se muestran como 0,00 € y sus acciones y cálculos permanecen bloqueados.",
    recovery:
      "Conserva el PDF original y una copia de seguridad. Cualquier reparación debe ser explícita y auditable.",
  };
}
