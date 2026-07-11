import { describe, expect, it } from "vitest";
import { issueDocument, markDocumentPaid } from "@/lib/document-integrity";
import { DEFAULT_PROFILE, type Document } from "@/lib/types";
import { isReceiptGenerationEligible } from "./generate-receipt-eligibility";

const PROFILE = { ...DEFAULT_PROFILE, nif: "12345678Z" };
const NOW = "2026-07-11T10:00:00.000Z";

function paidInvoice(rectification = false): Document {
  return markDocumentPaid(
    issueDocument(
      {
        id: rectification ? "rectification" : "invoice",
        type: "factura",
        number: rectification ? "FR-2026-0001" : "F-2026-0001",
        date: "2026-07-11",
        client: { name: "Cliente" },
        items: [
          {
            id: "line",
            description: "Servicio",
            quantity: 1,
            unitPrice: rectification ? -100 : 100,
            ivaPercent: 21,
          },
        ],
        rectification: rectification
          ? {
              originalDocumentId: "original",
              originalNumber: "F-2026-0001",
              originalDate: "2026-07-10",
              reason: "Anulación",
              type: "anulacion",
            }
          : undefined,
        status: "borrador",
        documentLifecycle: "draft",
        integrityLock: "unlocked",
        createdAt: NOW,
        updatedAt: NOW,
      },
      PROFILE,
      NOW,
    ),
    NOW,
  );
}

describe("elegibilidad de GenerateReceiptButton", () => {
  it("permite una factura ordinaria cobrada", () => {
    expect(isReceiptGenerationEligible(paidInvoice())).toBe(true);
  });

  it("oculta una rectificativa cobrada aunque se borre su dato vivo", () => {
    const rectification = paidInvoice(true);
    const drifted: Document = { ...rectification, rectification: undefined };

    expect(drifted.documentSnapshot?.rectification).toBeDefined();
    expect(isReceiptGenerationEligible(drifted)).toBe(false);
  });

  it("oculta la acción si persiste un vínculo de recibo aunque sea huérfano", () => {
    const linked: Document = {
      ...paidInvoice(),
      receiptDocumentId: "receipt-missing",
    };

    expect(isReceiptGenerationEligible(linked)).toBe(false);
  });
});
