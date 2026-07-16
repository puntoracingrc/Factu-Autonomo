import { describe, expect, it } from "vitest";
import {
  buildPartnerCommissionSummary,
  buildPartnerPlanCounts,
} from "./metrics";

describe("partner metrics", () => {
  it("cuenta registros una sola vez y solo pagos vigentes", () => {
    const result = buildPartnerPlanCounts(
      ["u1", "u1", "u2", "u3", "u4"],
      [
        { userId: "u1", plan: "pro", status: "active" },
        { userId: "u2", plan: "pro_plus", status: "past_due" },
        { userId: "u3", plan: "trial", status: "trialing" },
        { userId: "outside", plan: "pro", status: "active" },
      ],
      new Date("2026-07-17T00:00:00Z"),
    );

    expect(result).toMatchObject({
      registeredCount: 4,
      payingCount: 1,
      inactiveCount: 3,
    });
    expect(result.planCounts.find((item) => item.plan === "pro")).toEqual({
      plan: "pro",
      label: "Pro",
      registered: 1,
      paying: 1,
    });
    expect(result.planCounts.find((item) => item.plan === "free")?.registered).toBe(1);
  });

  it("separa saldos y solo habilita pago con umbral y cuenta configurada", () => {
    const entries = [
      { status: "pending", commissionCents: 100 },
      { status: "available", commissionCents: 4_000 },
      { status: "available", commissionCents: 2_000 },
      { status: "paid", commissionCents: 900 },
      { status: "reversed", commissionCents: 25 },
      { status: "unknown", commissionCents: 100_000 },
    ];

    expect(
      buildPartnerCommissionSummary(entries, {
        thresholdCents: 6_000,
        payoutConfigured: true,
      }),
    ).toEqual({
      pendingCents: 100,
      availableCents: 6_000,
      paidCents: 900,
      reversedCents: 25,
      thresholdCents: 6_000,
      eligibleForPayout: true,
      automaticAccrualEnabled: false,
    });
    expect(
      buildPartnerCommissionSummary(entries, {
        thresholdCents: 6_000,
        payoutConfigured: false,
      }).eligibleForPayout,
    ).toBe(false);
  });
});
