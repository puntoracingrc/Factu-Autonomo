import { describe, expect, it } from "vitest";

import { normalizeLoadedData } from "./storage";
import { DEFAULT_PROFILE } from "./types";

describe("IRPF estimate policy persistence", () => {
  it("preserves the company's valid internal history through normalization", () => {
    const normalized = normalizeLoadedData({
      profile: {
        ...DEFAULT_PROFILE,
        irpfPercent: 19,
        irpfEstimatePolicy: {
          schemaVersion: 1,
          baselinePercent: 15,
          changes: [
            { effectiveAt: "2027-01-01T09:00:00.000Z", percent: 20 },
            { effectiveAt: "2028-01-01T09:00:00.000Z", percent: 19 },
          ],
        },
      },
    });

    expect(normalized.profile.irpfEstimatePolicy).toEqual({
      schemaVersion: 1,
      baselinePercent: 15,
      changes: [
        { effectiveAt: "2027-01-01T09:00:00.000Z", percent: 20 },
        { effectiveAt: "2028-01-01T09:00:00.000Z", percent: 19 },
      ],
    });
  });

  it("keeps legacy companies on their own current percentage until the first change", () => {
    const oldCompany = normalizeLoadedData({
      profile: { ...DEFAULT_PROFILE, irpfPercent: 20 },
    });
    const newCompany = normalizeLoadedData({
      profile: { ...DEFAULT_PROFILE, irpfPercent: 15 },
    });

    expect(oldCompany.profile.irpfPercent).toBe(20);
    expect(oldCompany.profile.irpfEstimatePolicy).toBeUndefined();
    expect(newCompany.profile.irpfPercent).toBe(15);
    expect(newCompany.profile.irpfEstimatePolicy).toBeUndefined();
  });
});
