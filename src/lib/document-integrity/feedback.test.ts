import { describe, expect, it } from "vitest";
import { getDocumentIntegrityBlockedFeedback } from "./feedback";

describe("getDocumentIntegrityBlockedFeedback", () => {
  it("explica una evidencia histórica ausente sin confundirla con la inmutabilidad", () => {
    const feedback = getDocumentIntegrityBlockedFeedback([
      "document_snapshot_missing",
      "pdf_snapshot_missing",
      "snapshot_seal_missing",
    ]);

    expect(feedback.title).toBe("Integridad bloqueada");
    expect(feedback.reason).toContain("Falta el snapshot, el PDF o el sello");
    expect(feedback.consequence).toContain(
      "No es la inmutabilidad normal de un documento emitido",
    );
    expect(feedback.consequence).toContain("0,00 €");
    expect(feedback.consequence).toContain("fail-closed");
  });

  it("describe una evidencia incoherente sin proponer regenerarla", () => {
    const feedback = getDocumentIntegrityBlockedFeedback([
      "document_hash_mismatch",
      "pdf_seal_mismatch",
    ]);

    expect(feedback.reason).toContain("no supera la comprobación de coherencia");
    expect(feedback.recovery).toBe(
      "Conserva el PDF original y una copia de seguridad. Cualquier reparación debe ser explícita y auditable.",
    );
    expect(
      `${feedback.reason} ${feedback.consequence} ${feedback.recovery}`,
    ).not.toMatch(/regenera|resella|reescribe/i);
  });

  it("identifica por separado una relación fiscal inválida", () => {
    const feedback = getDocumentIntegrityBlockedFeedback([
      "document_relationship_invalid",
    ]);

    expect(feedback.reason).toBe(
      "La relación fiscal entre documentos no coincide con sus copias históricas selladas.",
    );
  });

  it("mantiene un mensaje seguro ante señales mixtas o no detalladas", () => {
    const mixed = getDocumentIntegrityBlockedFeedback([
      "snapshot_seal_missing",
      "document_hash_mismatch",
      "document_relationship_invalid",
    ]);
    const unspecified = getDocumentIntegrityBlockedFeedback();

    for (const feedback of [mixed, unspecified]) {
      expect(feedback.reason).toContain(
        "snapshot, el PDF, el sello o la relación fiscal",
      );
      expect(feedback.recovery).toContain("explícita y auditable");
    }
  });
});
