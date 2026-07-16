import { describe, expect, it } from "vitest";
import {
  compareFiscalNotificationChronologyAscendingV2,
  compareFiscalNotificationChronologyDescendingV2,
  resolveFiscalNotificationChronologyV2,
} from "./chronology-date.v2";

describe("fiscal notification chronology v2", () => {
  it("applies the mandated documentary-date priority", () => {
    expect(
      resolveFiscalNotificationChronologyV2({
        issueDate: "2026-04-01",
        signingDate: "2026-04-02",
        actionDate: "2026-04-03",
        effectiveNotificationDate: "2026-04-04",
      }),
    ).toEqual({
      schemaVersion: 2,
      chronologyDate: "2026-04-01",
      chronologyDateBasis: "ISSUE_DATE",
    });

    expect(
      resolveFiscalNotificationChronologyV2({
        signingDate: "2026-04-02",
        actionDate: "2026-04-03",
        effectiveNotificationDate: "2026-04-04",
      }),
    ).toMatchObject({
      chronologyDate: "2026-04-02",
      chronologyDateBasis: "SIGNING_DATE",
    });

    expect(
      resolveFiscalNotificationChronologyV2({
        actionDate: "2026-04-03",
        effectiveNotificationDate: "2026-04-04",
      }),
    ).toMatchObject({
      chronologyDate: "2026-04-03",
      chronologyDateBasis: "ACTION_DATE",
    });

    expect(
      resolveFiscalNotificationChronologyV2({
        effectiveNotificationDate: "2026-04-04",
      }),
    ).toMatchObject({
      chronologyDate: "2026-04-04",
      chronologyDateBasis: "EFFECTIVE_NOTIFICATION_DATE",
    });
  });

  it("never substitutes malformed, scan, upload or creation dates", () => {
    const untrusted = {
      issueDate: "2026-02-30",
      signingDate: "16/07/2026",
      actionDate: "2026-07-16T08:00:00Z",
      effectiveNotificationDate: "",
      scannedAt: "2026-07-16",
      uploadedAt: "2026-07-16",
      createdAt: "2026-07-16",
    };

    expect(resolveFiscalNotificationChronologyV2(untrusted)).toEqual({
      schemaVersion: 2,
      chronologyDate: null,
      chronologyDateBasis: null,
    });
  });

  it("orders the library descending and a case timeline ascending", () => {
    const entries = [
      { id: "undated", chronologyDate: null },
      { id: "older", chronologyDate: "2024-01-01" },
      { id: "newer", chronologyDate: "2026-01-01" },
    ];

    expect(
      [...entries]
        .sort(compareFiscalNotificationChronologyDescendingV2)
        .map((entry) => entry.id),
    ).toEqual(["newer", "older", "undated"]);
    expect(
      [...entries]
        .sort(compareFiscalNotificationChronologyAscendingV2)
        .map((entry) => entry.id),
    ).toEqual(["older", "newer", "undated"]);
  });

  it("returns frozen values without mutating the input", () => {
    const input = { issueDate: "2026-07-16" };
    const before = structuredClone(input);
    const result = resolveFiscalNotificationChronologyV2(input);

    expect(input).toEqual(before);
    expect(Object.isFrozen(result)).toBe(true);
  });
});
