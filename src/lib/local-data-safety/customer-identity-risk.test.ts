import { describe, expect, it } from "vitest";
import { analyzeCustomerIdentityImportRisk, summarizeCustomerIdentityImportRisk } from "./customer-identity-risk";

// PHASE2D61_CUSTOMER_IDENTITY_IMPORT_RISK_ANALYZER_V1

describe("customer identity import risk analyzer", () => {
  it("detects duplicate customers, missing refs and duplicate synthetic tax ids", () => {
    const assessment = analyzeCustomerIdentityImportRisk(
      {},
      {
        customers: [
          { id: "SYNTHETIC_ONLY_CUSTOMER_A", displayName: "Cliente A", taxId: "SYNTHETIC_ONLY_TAX_DUP" },
          { id: "SYNTHETIC_ONLY_CUSTOMER_A", displayName: "Cliente A bis", taxId: "SYNTHETIC_ONLY_TAX_DUP" },
        ],
        documents: [{ id: "SYNTHETIC_ONLY_DOC", customerId: "SYNTHETIC_ONLY_MISSING_CUSTOMER" }],
      },
    );
    const summary = summarizeCustomerIdentityImportRisk(assessment);

    expect(summary.riskIds).toEqual(
      expect.arrayContaining(["duplicate_customer_id", "document_missing_customer", "possible_duplicate_synthetic_tax_id"]),
    );
    expect(summary.highestSeverity).toBe("blocked");
    expect(summary.autoMergeAllowed).toBe(false);
  });

  it("blocks protected document customer mismatches and does not echo raw payloads", () => {
    const assessment = analyzeCustomerIdentityImportRisk(
      { customers: [{ id: "SYNTHETIC_ONLY_CUSTOMER", displayName: "Cliente original" }] },
      {
        customers: [{ id: "SYNTHETIC_ONLY_CUSTOMER", displayName: "Cliente cambiado" }],
        documents: [
          {
            id: "SYNTHETIC_ONLY_ISSUED",
            status: "emitida",
            documentLifecycle: "issued",
            customerId: "SYNTHETIC_ONLY_CUSTOMER",
          },
        ],
      },
    );
    const summary = summarizeCustomerIdentityImportRisk(assessment);

    expect(summary.riskIds).toContain("protected_doc_customer_mismatch");
    expect(summary.highestSeverity).toBe("blocked");
    expect(JSON.stringify(summary)).not.toMatch(/documentSnapshot|rawPayload|authorization/i);
  });
});
