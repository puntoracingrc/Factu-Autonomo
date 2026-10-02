import { describe, expect, it } from "vitest";

import {
  applyIrpfEstimatePercentChange,
  documentIrpfEstimateAnchor,
  normalizeIrpfEstimatePolicy,
  resolveIrpfEstimatePercentAt,
} from "./irpf-estimate-policy";
import { DEFAULT_PROFILE, type BusinessProfile, type Document } from "./types";

function profile(percent: number): BusinessProfile {
  return { ...DEFAULT_PROFILE, irpfPercent: percent };
}

describe("internal IRPF estimate policy", () => {
  it("keeps each company's existing percentage as its own baseline", () => {
    const oldCompany = applyIrpfEstimatePercentChange({
      current: profile(20),
      next: profile(19),
      effectiveAt: "2027-01-01T09:00:00.000Z",
    });
    const newCompany = applyIrpfEstimatePercentChange({
      current: profile(15),
      next: profile(20),
      effectiveAt: "2027-01-01T09:00:00.000Z",
    });

    expect(oldCompany.irpfEstimatePolicy).toMatchObject({
      baselinePercent: 20,
      changes: [{ percent: 19 }],
    });
    expect(newCompany.irpfEstimatePolicy).toMatchObject({
      baselinePercent: 15,
      changes: [{ percent: 20 }],
    });
    expect(
      resolveIrpfEstimatePercentAt(
        newCompany,
        "2026-12-31T23:59:59.999Z",
      ),
    ).toBe(15);
    expect(
      resolveIrpfEstimatePercentAt(
        newCompany,
        "2027-01-01T09:00:00.000Z",
      ),
    ).toBe(20);
  });

  it("records later changes without rewriting the earlier 15% and 20% periods", () => {
    const atTwenty = applyIrpfEstimatePercentChange({
      current: profile(15),
      next: profile(20),
      effectiveAt: "2027-01-01T09:00:00.000Z",
    });
    const atNineteen = applyIrpfEstimatePercentChange({
      current: atTwenty,
      next: { ...atTwenty, irpfPercent: 19 },
      effectiveAt: "2028-01-01T09:00:00.000Z",
    });

    expect(
      resolveIrpfEstimatePercentAt(atNineteen, "2026-10-01T10:00:00.000Z"),
    ).toBe(15);
    expect(
      resolveIrpfEstimatePercentAt(atNineteen, "2027-06-01T10:00:00.000Z"),
    ).toBe(20);
    expect(
      resolveIrpfEstimatePercentAt(atNineteen, "2028-06-01T10:00:00.000Z"),
    ).toBe(19);
  });

  it("does not create history when unrelated profile settings are saved", () => {
    const current = profile(15);
    const saved = applyIrpfEstimatePercentChange({
      current,
      next: { ...current, phone: "600 000 000" },
      effectiveAt: "2027-01-01T09:00:00.000Z",
    });
    expect(saved.irpfEstimatePolicy).toBeUndefined();
  });

  it("uses the issued timestamp as an external ordering anchor without changing the invoice", () => {
    const document = {
      id: "invoice-new-sl-1",
      type: "factura",
      number: "F-2026-0001",
      date: "2026-10-01",
      client: { name: "Cliente" },
      items: [],
      status: "enviado",
      issuedAt: "2026-10-01T10:00:00.000Z",
      createdAt: "2026-09-30T18:00:00.000Z",
      updatedAt: "2026-10-01T10:00:00.000Z",
    } satisfies Document;
    const before = structuredClone(document);
    expect(documentIrpfEstimateAnchor(document)).toBe(document.issuedAt);
    expect(document).toEqual(before);
    expect(document).not.toHaveProperty("irpfPercent");
    expect(document).not.toHaveProperty("irpfEstimatePolicy");
  });

  it("rejects malformed policy data instead of partially inventing history", () => {
    expect(
      normalizeIrpfEstimatePolicy({
        schemaVersion: 1,
        baselinePercent: 15,
        changes: [{ effectiveAt: "not-a-date", percent: 20 }],
      }),
    ).toBeUndefined();
  });
});
