import { describe, expect, it } from "vitest";
import {
  PRICING_REVIEW,
  PRICING_REVIEW_MAX_STALE_DAYS,
  buildPricingRanking,
  daysSincePricingReview,
  getComparableCompetitors,
  getPricingRankingSummary,
  isPricingReviewStale,
} from "./competitor-pricing";
import { PLANS } from "./plans";

describe("competitor pricing", () => {
  it("incluye solo competidores del segmento lite-invoicing", () => {
    const competitors = getComparableCompetitors();
    expect(competitors.length).toBeGreaterThanOrEqual(4);
    expect(competitors.every((c) => c.segment === "lite-invoicing")).toBe(true);
  });

  it("coloca Factura Autónomo en el ranking ordenado por precio habitual", () => {
    const ranking = buildPricingRanking();
    const us = ranking.find((entry) => entry.isUs);

    expect(us).toBeDefined();
    expect(us?.referenceMonthlyEur).toBe(PLANS.pro.priceMonthlyEur);
    expect(ranking[0].isUs).toBe(true);
    expect(ranking.every((entry, i) => entry.rank === i + 1)).toBe(true);

    for (let i = 1; i < ranking.length; i += 1) {
      expect(ranking[i].referenceMonthlyEur).toBeGreaterThanOrEqual(
        ranking[i - 1].referenceMonthlyEur,
      );
    }
  });

  it("resume la posición en el ranking", () => {
    const summary = getPricingRankingSummary();
    expect(summary.rank).toBe(1);
    expect(summary.total).toBe(getComparableCompetitors().length + 1);
    expect(summary.headline).toContain("más barato");
  });

  it("la revisión de precios no lleva más de 90 días sin actualizar", () => {
    const today = new Date(`${PRICING_REVIEW.lastVerified}T12:00:00`);
    expect(daysSincePricingReview(today)).toBe(0);
    expect(isPricingReviewStale(today)).toBe(false);

    const staleDay = new Date(`${PRICING_REVIEW.lastVerified}T12:00:00`);
    staleDay.setDate(staleDay.getDate() + PRICING_REVIEW_MAX_STALE_DAYS + 1);
    expect(isPricingReviewStale(staleDay)).toBe(true);
  });
});
