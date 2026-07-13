import { describe, expect, it } from "vitest";
import { FISCAL_NOTIFICATION_GUIDE_ENTRIES_V1 } from "@/lib/fiscal-notifications/guide/catalog.v1";
import { searchFiscalNotificationGuideV1 } from "@/lib/fiscal-notifications/guide/search.v1";

describe("fiscal notification guide search v1", () => {
  it("finds requerimientos by name and category aliases", () => {
    const result = searchFiscalNotificationGuideV1(
      FISCAL_NOTIFICATION_GUIDE_ENTRIES_V1,
      "requerimiento",
    );
    expect(result.status).toBe("READY");
    if (result.status !== "READY") throw new Error("Expected ready search");
    expect(result.total).toBeGreaterThan(0);
    expect(result.entries.map((entry) => entry.familyId)).toEqual(
      expect.arrayContaining([
        "compliance.formal_filing_requirement",
        "compliance.document_request",
        "compliance.individual_information_requirement",
      ]),
    );
  });

  it("is accent-insensitive and supports category terms", () => {
    const withoutAccent = searchFiscalNotificationGuideV1(
      FISCAL_NOTIFICATION_GUIDE_ENTRIES_V1,
      "reposicion",
    );
    const withAccent = searchFiscalNotificationGuideV1(
      FISCAL_NOTIFICATION_GUIDE_ENTRIES_V1,
      "reposición",
    );
    expect(withoutAccent.status).toBe("READY");
    expect(withAccent.status).toBe("READY");
    if (withoutAccent.status !== "READY" || withAccent.status !== "READY") {
      throw new Error("Expected ready searches");
    }
    expect(withoutAccent.entries.map((entry) => entry.familyId)).toEqual(
      withAccent.entries.map((entry) => entry.familyId),
    );
    expect(withoutAccent.entries.map((entry) => entry.familyId)).toContain(
      "review.recurso_reposicion",
    );

    const embargo = searchFiscalNotificationGuideV1(
      FISCAL_NOTIFICATION_GUIDE_ENTRIES_V1,
      "embargo",
    );
    expect(embargo.status).toBe("READY");
    if (embargo.status !== "READY") throw new Error("Expected ready search");
    expect(embargo.entries.every((entry) => entry.category === "SEIZURE")).toBe(
      true,
    );
  });

  it("keeps payment instruments and payment evidence distinguishable", () => {
    const paymentForm = searchFiscalNotificationGuideV1(
      FISCAL_NOTIFICATION_GUIDE_ENTRIES_V1,
      "carta de pago",
    );
    const receipt = searchFiscalNotificationGuideV1(
      FISCAL_NOTIFICATION_GUIDE_ENTRIES_V1,
      "nrc",
    );
    expect(paymentForm.status).toBe("READY");
    expect(receipt.status).toBe("READY");
    if (paymentForm.status !== "READY" || receipt.status !== "READY") {
      throw new Error("Expected ready searches");
    }
    expect(paymentForm.entries.map((entry) => entry.familyId)).toContain(
      "payment.payment_form",
    );
    expect(paymentForm.entries.map((entry) => entry.familyId)).not.toContain(
      "payment.receipt",
    );
    expect(receipt.entries.map((entry) => entry.familyId)).toContain(
      "payment.receipt",
    );
  });

  it("returns all 87 entries for an empty query without mutating the input", () => {
    const input = [...FISCAL_NOTIFICATION_GUIDE_ENTRIES_V1];
    const before = input.map((entry) => entry.familyId);
    const result = searchFiscalNotificationGuideV1(input, "   ");
    expect(result.status).toBe("READY");
    if (result.status !== "READY") throw new Error("Expected ready search");
    expect(result.query).toBe("");
    expect(result.total).toBe(87);
    expect(input.map((entry) => entry.familyId)).toEqual(before);
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.entries)).toBe(true);
  });

  it("blocks malformed and oversized local queries without returning entries", () => {
    for (const query of ["requerimiento\n", "x".repeat(81), null, undefined]) {
      expect(
        searchFiscalNotificationGuideV1(
          FISCAL_NOTIFICATION_GUIDE_ENTRIES_V1,
          query,
        ),
      ).toEqual({
        status: "BLOCKED",
        query: "",
        entries: [],
        total: 0,
        reason: "INVALID_QUERY",
      });
    }
  });
});
