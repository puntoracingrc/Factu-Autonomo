import { describe, expect, it } from "vitest";
import {
  defaultTrialEndIso,
  resolveEffectivePlan,
  trialDaysRemaining,
} from "./subscription";

describe("subscription", () => {
  it("resuelve plan pro activo", () => {
    const plan = resolveEffectivePlan(
      {
        userId: "u1",
        plan: "pro",
        status: "active",
        currentPeriodEnd: "2027-01-01T00:00:00.000Z",
      },
      new Date("2026-06-01"),
    );
    expect(plan).toBe("pro");
  });

  it("resuelve plan pro plus activo", () => {
    const plan = resolveEffectivePlan(
      {
        userId: "u1",
        plan: "pro_plus",
        status: "active",
        currentPeriodEnd: "2027-01-01T00:00:00.000Z",
      },
      new Date("2026-06-01"),
    );
    expect(plan).toBe("pro_plus");
  });

  it("baja a free si el periodo expiró", () => {
    const plan = resolveEffectivePlan(
      {
        userId: "u1",
        plan: "pro",
        status: "active",
        currentPeriodEnd: "2026-01-01T00:00:00.000Z",
      },
      new Date("2026-06-01"),
    );
    expect(plan).toBe("free");
  });

  it("mantiene trial vigente", () => {
    const plan = resolveEffectivePlan(
      {
        userId: "u1",
        plan: "trial",
        status: "trialing",
        trialEndsAt: "2026-06-20T00:00:00.000Z",
      },
      new Date("2026-06-10"),
    );
    expect(plan).toBe("trial");
  });

  it("aplica un plan promocional vigente sin convertirlo en plan Stripe", () => {
    const plan = resolveEffectivePlan(
      {
        userId: "u1",
        plan: "free",
        status: "inactive",
        promotionalPlan: "pro_plus",
        promotionalPlanEndsAt: "2026-07-31T23:59:59.000Z",
      },
      new Date("2026-07-20T00:00:00.000Z"),
    );
    expect(plan).toBe("pro_plus");
  });

  it("mantiene prioridad del plan de pago y descarta la promoción caducada", () => {
    expect(
      resolveEffectivePlan(
        {
          userId: "u1",
          plan: "pro",
          status: "active",
          currentPeriodEnd: "2026-08-01T00:00:00.000Z",
          promotionalPlan: "pro_plus",
          promotionalPlanEndsAt: "2026-09-01T00:00:00.000Z",
        },
        new Date("2026-07-20T00:00:00.000Z"),
      ),
    ).toBe("pro");
    expect(
      resolveEffectivePlan(
        {
          userId: "u1",
          plan: "free",
          status: "inactive",
          promotionalPlan: "pro_plus",
          promotionalPlanEndsAt: "2026-07-01T00:00:00.000Z",
        },
        new Date("2026-07-20T00:00:00.000Z"),
      ),
    ).toBe("free");
  });

  it("usa la promoción si el periodo pagado anterior ya terminó", () => {
    expect(
      resolveEffectivePlan(
        {
          userId: "u1",
          plan: "pro",
          status: "active",
          currentPeriodEnd: "2026-07-01T00:00:00.000Z",
          promotionalPlan: "pro_plus",
          promotionalPlanEndsAt: "2026-08-20T00:00:00.000Z",
        },
        new Date("2026-07-20T00:00:00.000Z"),
      ),
    ).toBe("pro_plus");
  });

  it("calcula días de trial restantes", () => {
    const days = trialDaysRemaining(
      {
        userId: "u1",
        plan: "trial",
        status: "trialing",
        trialEndsAt: "2026-06-20T00:00:00.000Z",
      },
      new Date("2026-06-10"),
    );
    expect(days).toBeGreaterThan(0);
  });

  it("genera fin de trial", () => {
    const end = defaultTrialEndIso(14, new Date("2026-06-01"));
    expect(new Date(end).getDate()).toBe(15);
  });
});
