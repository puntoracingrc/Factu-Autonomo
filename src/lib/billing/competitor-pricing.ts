import { PLANS } from "./plans";

/** Revisar trimestralmente y actualizar lastVerified + precios. Ver docs/MARKET_PRICING.md */
export const PRICING_REVIEW_MAX_STALE_DAYS = 90;

export const PRICING_REVIEW = {
  lastVerified: "2026-06-10",
  sources: [
    "Webs públicas de tarifas (junio 2026)",
    "docs/MARKET_PRICING.md",
  ],
} as const;

export type ComparableSegment = "lite-invoicing";

export interface ComparableCompetitor {
  id: string;
  name: string;
  planName: string;
  segment: ComparableSegment;
  /** Precio habitual mensual (sin promos temporales) para ordenar el ranking. */
  referenceMonthlyEur: number;
  /** Precio promo actual, si existe. */
  promotionalMonthlyEur?: number;
  priceYearlyEur?: number;
  limitsNote: string;
  extrasBeyondUs: string[];
  sourceUrl: string;
  priceNote?: string;
}

export interface PricingRankingEntry {
  rank: number;
  id: string;
  name: string;
  planName: string;
  referenceMonthlyEur: number;
  promotionalMonthlyEur?: number;
  limitsNote: string;
  extrasBeyondUs: string[];
  priceNote?: string;
  isUs: boolean;
}

export interface PricingRankingSummary {
  rank: number;
  total: number;
  cheaperThanUs: number;
  headline: string;
  subtitle: string;
}

const OUR_PRODUCT_ID = "factura-autonomo-pro";

/**
 * Solo software de facturación ligera para autónomos, sin ERP completo,
 * banca ni presentación automática de modelos AEAT.
 */
export const COMPARABLE_COMPETITORS: ComparableCompetitor[] = [
  {
    id: "billin-pro",
    name: "Billin",
    planName: "Pro (anual)",
    segment: "lite-invoicing",
    referenceMonthlyEur: 15,
    promotionalMonthlyEur: 12.5,
    priceYearlyEur: 150,
    limitsNote: "Hasta 50 clientes y 50 productos",
    extrasBeyondUs: [
      "OCR gastos (50 docs/mes)",
      "Verifactu certificado",
      "Albaranes y facturas recurrentes",
    ],
    sourceUrl: "https://www.billin.net/precios/",
    priceNote: "12,50 €/mes con pago anual; 15 €/mes si es mensual",
  },
  {
    id: "contasimple-professional",
    name: "Contasimple",
    planName: "Professional (anual)",
    segment: "lite-invoicing",
    referenceMonthlyEur: 12.95,
    promotionalMonthlyEur: 10.95,
    priceYearlyEur: 131.4,
    limitsNote: "500 documentos/año",
    extrasBeyondUs: [
      "Presentación modelos AEAT",
      "Verifactu",
      "Gestión cobros y remesas",
    ],
    sourceUrl: "https://www.contasimple.com/precios/",
    priceNote: "10,95 €/mes con pago anual; 12,95 €/mes trimestral",
  },
  {
    id: "contasimple-ultimate",
    name: "Contasimple",
    planName: "Ultimate (anual)",
    segment: "lite-invoicing",
    referenceMonthlyEur: 19.95,
    promotionalMonthlyEur: 15.95,
    priceYearlyEur: 191.4,
    limitsNote: "Documentos ilimitados",
    extrasBeyondUs: [
      "Presentación modelos AEAT",
      "Verifactu",
      "Inventario y remesas",
    ],
    sourceUrl: "https://www.contasimple.com/precios/",
    priceNote: "15,95 €/mes con pago anual; 19,95 €/mes trimestral",
  },
  {
    id: "quipu-starter",
    name: "Quipu",
    planName: "Starter (referencia)",
    segment: "lite-invoicing",
    referenceMonthlyEur: 17,
    promotionalMonthlyEur: 8.5,
    priceYearlyEur: 168,
    limitsNote: "Facturas y presupuestos ilimitados",
    extrasBeyondUs: [
      "Previsión fiscal / modelos",
      "30 escaneos OCR/mes",
      "Verifactu",
    ],
    sourceUrl: "https://getquipu.com/es/plan-de-precios",
    priceNote: "8,50 €/mes promo 50 % los 3 primeros meses; 17 €/mes habitual",
  },
  {
    id: "billin-ilimitado",
    name: "Billin",
    planName: "Ilimitado (anual)",
    segment: "lite-invoicing",
    referenceMonthlyEur: 24,
    promotionalMonthlyEur: 20,
    priceYearlyEur: 240,
    limitsNote: "Clientes y productos ilimitados",
    extrasBeyondUs: [
      "Conciliación bancaria",
      "Integración Shopify",
      "250 escaneos OCR/mes",
    ],
    sourceUrl: "https://www.billin.net/precios/",
    priceNote: "20 €/mes con pago anual; 24 €/mes si es mensual",
  },
];

export const COMPARISON_METHODOLOGY = [
  "Solo entran herramientas de facturación para autónomos con funciones parecidas a Factura Autónomo.",
  "Comparamos el plan de pago más cercano a Pro: facturas, presupuestos y gastos básicos.",
  "Excluimos ERP (Holded completo), nóminas, banca y contabilidad asistida.",
  "El ranking usa el precio mensual habitual publicado, no promos temporales.",
  "Los precios son orientativos y sin IVA, según la web del competidor en la fecha indicada.",
] as const;

function ourComparableEntry(): ComparableCompetitor {
  const monthly = PLANS.pro.priceMonthlyEur ?? 0;
  const yearly = PLANS.pro.priceYearlyEur ?? 0;

  return {
    id: OUR_PRODUCT_ID,
    name: "Factura Autónomo",
    planName: "Pro",
    segment: "lite-invoicing",
    referenceMonthlyEur: monthly,
    priceYearlyEur: yearly,
    limitsNote: "Documentos y clientes ilimitados",
    extrasBeyondUs: [],
    sourceUrl: "/precios",
    priceNote: `${yearly.toLocaleString("es-ES")} €/año (≈ ${(yearly / 12).toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €/mes)`,
  };
}

export function getComparableCompetitors(): ComparableCompetitor[] {
  return COMPARABLE_COMPETITORS.filter((c) => c.segment === "lite-invoicing");
}

export function buildPricingRanking(): PricingRankingEntry[] {
  const all = [ourComparableEntry(), ...getComparableCompetitors()];

  const sorted = [...all].sort(
    (a, b) => a.referenceMonthlyEur - b.referenceMonthlyEur,
  );

  return sorted.map((entry, index) => ({
    rank: index + 1,
    id: entry.id,
    name: entry.name,
    planName: entry.planName,
    referenceMonthlyEur: entry.referenceMonthlyEur,
    promotionalMonthlyEur: entry.promotionalMonthlyEur,
    limitsNote: entry.limitsNote,
    extrasBeyondUs: entry.extrasBeyondUs,
    priceNote: entry.priceNote,
    isUs: entry.id === OUR_PRODUCT_ID,
  }));
}

export function getPricingRankingSummary(): PricingRankingSummary {
  const ranking = buildPricingRanking();
  const us = ranking.find((entry) => entry.isUs);
  const rank = us?.rank ?? ranking.length;
  const total = ranking.length;
  const cheaperThanUs = rank - 1;

  const headline =
    rank === 1
      ? `El más barato del ranking (${total} herramientas comparables)`
      : `${rank}.º más barato de ${total} herramientas comparables`;

  const subtitle =
    cheaperThanUs === 0
      ? "Facturación clara para autónomos, por debajo de alternativas similares del mercado"
      : `Facturación clara para autónomos — ${cheaperThanUs} alternativa${cheaperThanUs === 1 ? "" : "s"} comparable${cheaperThanUs === 1 ? "" : "s"} con precio habitual menor`;

  return { rank, total, cheaperThanUs, headline, subtitle };
}

export function formatVerifiedDate(isoDate: string): string {
  const date = new Date(`${isoDate}T12:00:00`);
  return date.toLocaleDateString("es-ES", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function daysSincePricingReview(
  today = new Date(),
  lastVerified = PRICING_REVIEW.lastVerified,
): number {
  const verified = new Date(`${lastVerified}T12:00:00`);
  const ms = today.getTime() - verified.getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

export function isPricingReviewStale(
  today = new Date(),
  maxStaleDays = PRICING_REVIEW_MAX_STALE_DAYS,
): boolean {
  return daysSincePricingReview(today) > maxStaleDays;
}

export function formatReferencePrice(amount: number): string {
  return `${amount.toLocaleString("es-ES", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} €`;
}
