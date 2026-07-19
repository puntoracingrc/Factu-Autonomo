import { describe, expect, it } from "vitest";
import type { BoundedDocumentInput } from "./input-contract";
import { extractAeatOfficialCatalogDocumentV9 } from "./extractor-core/official-catalog-extractor.v9";
import { projectAeatOfficialCatalogReviewV9 } from "./official-catalog-review.v9";

function document(text: string): BoundedDocumentInput {
  return Object.freeze({
    ownerScope: "owner-v9-review",
    documentId: "document-v9-review",
    pages: Object.freeze([
      Object.freeze({ pageNumber: 1, text, isBlank: text.length === 0 }),
    ]),
  });
}

describe("AEAT official catalog review v9", () => {
  it("does not turn a catalog-only recognition into document facts", () => {
    const outcome = extractAeatOfficialCatalogDocumentV9({
      document: document(
        "AGENCIA TRIBUTARIA\nSolicitud de rectificación de autoliquidación o declaración\nPRIVATE_TEXT_NOT_RETAINED",
      ),
    });
    const review = projectAeatOfficialCatalogReviewV9(outcome);
    expect(review.status).toBe("INFORMATION_PENDING");
    expect(review.documents).toEqual([]);
    expect(JSON.stringify(review)).not.toContain("OFFICIAL_ONLY_");
    expect(JSON.stringify(review)).not.toContain("PRIVATE_TEXT_NOT_RETAINED");
    expect(review.retainedSourceContent).toBe("NONE");
    expect(review.permitsDebtCreation).toBe(false);
    expect(review.permitsDeadlineCreation).toBe(false);
    expect(review.permitsPaymentAction).toBe(false);
    expect(review.permitsAccountingAction).toBe(false);
  });

  it("does not project unknown, ambiguous or blocked documents", () => {
    const unknown = projectAeatOfficialCatalogReviewV9(
      extractAeatOfficialCatalogDocumentV9({
        document: document("AGENCIA TRIBUTARIA\nDocumento desconocido"),
      }),
    );
    expect(unknown.status).toBe("INFORMATION_PENDING");
    expect(unknown.documents).toEqual([]);

    const blocked = projectAeatOfficialCatalogReviewV9(
      extractAeatOfficialCatalogDocumentV9({
        document: document(
          "TESORERÍA GENERAL DE LA SEGURIDAD SOCIAL\nSolicitud o justificante de ampliación de plazo",
        ),
      }),
    );
    expect(blocked.status).toBe("BLOCKED");
    expect(blocked.documents).toEqual([]);
  });
});
