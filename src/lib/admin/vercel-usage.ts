import type { AdminHealthLevel } from "@/lib/admin/health";

export interface AdminVercelUsageResource {
  id: string;
  label: string;
  service: string;
  resource: string;
  costUsd: number;
  usageQuantity: number | null;
  usageUnit: string | null;
  project: string | null;
  sharePercent: number;
}

export interface AdminVercelUsageProject {
  project: string;
  costUsd: number;
  sharePercent: number;
}

export interface AdminVercelUsageSnapshot {
  generatedAt: string;
  level: AdminHealthLevel;
  label: string;
  headline: string;
  source: "vercel_billing_charges_api";
  period: {
    from: string;
    to: string;
    daysRemaining: number;
  };
  plan: {
    name: "Pro";
    monthlyCreditUsd: number;
    includedFastDataTransferGb: number;
    includedEdgeRequests: number;
  };
  summary: {
    totalCostUsd: number;
    creditUsedUsd: number;
    onDemandUsd: number;
    creditUsedPercent: number;
    lineCount: number;
    primaryProjectSlug: string | null;
  };
  topResources: AdminVercelUsageResource[];
  topProjects: AdminVercelUsageProject[];
  recommendations: string[];
}

export interface VercelBillingChargeLine {
  service: string;
  resource: string;
  costUsd: number;
  usageQuantity: number | null;
  usageUnit: string | null;
  project: string | null;
}

const MONTHLY_CREDIT_USD = 20;
const INCLUDED_FAST_DATA_TRANSFER_GB = 1024;
const INCLUDED_EDGE_REQUESTS = 10_000_000;
const WATCH_CREDIT_PERCENT = 75;

const COST_KEYS = [
  "BilledCost",
  "EffectiveCost",
  "ContractedCost",
  "ListCost",
  "ChargeAmount",
  "billedCost",
  "effectiveCost",
  "cost",
  "amount",
];

const SERVICE_KEYS = [
  "ServiceName",
  "serviceName",
  "ServiceCategory",
  "ProductName",
  "productName",
  "service",
];

const RESOURCE_KEYS = [
  "ResourceName",
  "resourceName",
  "SkuPriceId",
  "SkuId",
  "sku",
  "MeterName",
  "UsageType",
  "resource",
];

const QUANTITY_KEYS = [
  "ConsumedQuantity",
  "PricingQuantity",
  "UsageQuantity",
  "consumedQuantity",
  "usageQuantity",
  "quantity",
];

const UNIT_KEYS = [
  "ConsumedUnit",
  "PricingUnit",
  "UsageUnit",
  "consumedUnit",
  "usageUnit",
  "unit",
];

const PROJECT_KEYS = [
  "ProjectName",
  "projectName",
  "ProjectSlug",
  "projectSlug",
  "x_Vercel_Project_Name",
  "x_Vercel_Project_Slug",
  "VercelProjectName",
  "VercelProjectSlug",
];

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function stringFrom(row: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }
  return null;
}

function numberFrom(row: Record<string, unknown>, keys: string[]): number | null {
  for (const key of keys) {
    const value = row[key];
    const numeric =
      typeof value === "number"
        ? value
        : typeof value === "string"
          ? Number(value)
          : Number.NaN;
    if (Number.isFinite(numeric)) return numeric;
  }
  return null;
}

function projectFromTags(tags: unknown): string | null {
  const tagRecord = asRecord(tags);
  for (const key of PROJECT_KEYS) {
    const value = tagRecord[key] ?? tagRecord[key.toLowerCase()];
    if (typeof value === "string" && value.trim()) return value.trim();
  }

  for (const [key, value] of Object.entries(tagRecord)) {
    if (!/project/i.test(key)) continue;
    if (typeof value === "string" && value.trim()) return value.trim();
  }

  return null;
}

function projectFromRow(row: Record<string, unknown>): string | null {
  return (
    stringFrom(row, PROJECT_KEYS) ??
    projectFromTags(row.Tags) ??
    projectFromTags(row.tags) ??
    projectFromTags(row.TagSet) ??
    null
  );
}

function lineToCharge(row: Record<string, unknown>): VercelBillingChargeLine {
  const service = stringFrom(row, SERVICE_KEYS) ?? "Vercel";
  const resource = stringFrom(row, RESOURCE_KEYS) ?? service;
  const costUsd = numberFrom(row, COST_KEYS) ?? 0;
  const usageQuantity = numberFrom(row, QUANTITY_KEYS);
  const usageUnit = stringFrom(row, UNIT_KEYS);

  return {
    service,
    resource,
    costUsd,
    usageQuantity,
    usageUnit,
    project: projectFromRow(row),
  };
}

function safeJsonParse(value: string): unknown | null {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

export function parseVercelBillingChargesJsonl(
  body: string,
): VercelBillingChargeLine[] {
  const trimmed = body.trim();
  if (!trimmed) return [];

  if (trimmed.startsWith("[")) {
    const parsed = safeJsonParse(trimmed);
    if (Array.isArray(parsed)) {
      return parsed.map((row) => lineToCharge(asRecord(row)));
    }
  }

  return trimmed
    .split(/\r?\n/)
    .map((line) => safeJsonParse(line.trim()))
    .filter(Boolean)
    .map((row) => lineToCharge(asRecord(row)));
}

function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}

function percent(used: number, limit: number): number {
  if (limit <= 0) return 0;
  return Math.round((used / limit) * 1000) / 10;
}

function daysRemaining(to: string, now = new Date()): number {
  const toMs = new Date(to).getTime();
  if (!Number.isFinite(toMs)) return 0;
  return Math.max(0, Math.ceil((toMs - now.getTime()) / (24 * 60 * 60 * 1000)));
}

function aggregateResources(
  charges: VercelBillingChargeLine[],
  totalCostUsd: number,
): AdminVercelUsageResource[] {
  const byResource = new Map<
    string,
    Omit<AdminVercelUsageResource, "id" | "label" | "sharePercent">
  >();

  for (const charge of charges) {
    const costUsd = Math.max(0, charge.costUsd);
    if (costUsd === 0) continue;
    const key = `${charge.service}::${charge.resource}::${charge.project ?? ""}`;
    const current =
      byResource.get(key) ??
      {
        service: charge.service,
        resource: charge.resource,
        costUsd: 0,
        usageQuantity: 0,
        usageUnit: charge.usageUnit,
        project: charge.project,
      };
    current.costUsd += costUsd;
    current.usageQuantity =
      current.usageQuantity !== null && charge.usageQuantity !== null
        ? current.usageQuantity + charge.usageQuantity
        : current.usageQuantity;
    current.usageUnit = current.usageUnit ?? charge.usageUnit;
    byResource.set(key, current);
  }

  return Array.from(byResource.entries())
    .map(([key, item]) => {
      const label =
        item.resource && item.resource !== item.service
          ? `${item.service}: ${item.resource}`
          : item.service;
      return {
        ...item,
        id: key,
        label,
        costUsd: roundCurrency(item.costUsd),
        usageQuantity: item.usageQuantity,
        sharePercent: percent(item.costUsd, totalCostUsd),
      };
    })
    .sort((a, b) => b.costUsd - a.costUsd)
    .slice(0, 8);
}

function aggregateProjects(
  charges: VercelBillingChargeLine[],
  totalCostUsd: number,
): AdminVercelUsageProject[] {
  const byProject = new Map<string, number>();
  for (const charge of charges) {
    if (!charge.project) continue;
    const costUsd = Math.max(0, charge.costUsd);
    if (costUsd === 0) continue;
    byProject.set(charge.project, (byProject.get(charge.project) ?? 0) + costUsd);
  }

  return Array.from(byProject.entries())
    .map(([project, costUsd]) => ({
      project,
      costUsd: roundCurrency(costUsd),
      sharePercent: percent(costUsd, totalCostUsd),
    }))
    .sort((a, b) => b.costUsd - a.costUsd)
    .slice(0, 8);
}

export function buildVercelUsageSnapshot(input: {
  charges: VercelBillingChargeLine[];
  from: string;
  to: string;
  primaryProjectSlug?: string | null;
  now?: Date;
}): AdminVercelUsageSnapshot {
  const positiveCostUsd = input.charges.reduce(
    (total, charge) => total + Math.max(0, charge.costUsd),
    0,
  );
  const totalCostUsd = roundCurrency(positiveCostUsd);
  const creditUsedUsd = roundCurrency(Math.min(totalCostUsd, MONTHLY_CREDIT_USD));
  const onDemandUsd = roundCurrency(Math.max(0, totalCostUsd - MONTHLY_CREDIT_USD));
  const creditUsedPercent = Math.min(
    100,
    percent(creditUsedUsd, MONTHLY_CREDIT_USD),
  );
  const level: AdminHealthLevel =
    onDemandUsd > 0 || creditUsedPercent >= 100
      ? "action"
      : creditUsedPercent >= WATCH_CREDIT_PERCENT
        ? "watch"
        : "ok";
  const topResources = aggregateResources(input.charges, totalCostUsd);
  const topProjects = aggregateProjects(input.charges, totalCostUsd);
  const recommendations: string[] = [];

  if (level === "ok") {
    recommendations.push("Vercel va cómodo en el ciclo consultado.");
  }
  if (level === "watch") {
    recommendations.push("Vercel se acerca al 75% del crédito mensual incluido.");
  }
  if (level === "action") {
    recommendations.push("Vercel ya ha consumido el crédito estimado del ciclo.");
  }
  if (topProjects.length === 0) {
    recommendations.push(
      "La API de costes no ha devuelto desglose por proyecto; revisar Usage si sube el coste.",
    );
  }
  if (onDemandUsd > 0) {
    recommendations.push("Revisar los recursos con más coste antes de que cierre el ciclo.");
  }

  return {
    generatedAt: (input.now ?? new Date()).toISOString(),
    level,
    label:
      level === "action" ? "Actuar" : level === "watch" ? "Vigilar" : "Todo bien",
    headline:
      level === "action"
        ? "Hay consumo bajo demanda en Vercel."
        : level === "watch"
          ? "Vercel se acerca al crédito mensual incluido."
          : "Vercel va holgado.",
    source: "vercel_billing_charges_api",
    period: {
      from: input.from,
      to: input.to,
      daysRemaining: daysRemaining(input.to, input.now),
    },
    plan: {
      name: "Pro",
      monthlyCreditUsd: MONTHLY_CREDIT_USD,
      includedFastDataTransferGb: INCLUDED_FAST_DATA_TRANSFER_GB,
      includedEdgeRequests: INCLUDED_EDGE_REQUESTS,
    },
    summary: {
      totalCostUsd,
      creditUsedUsd,
      onDemandUsd,
      creditUsedPercent,
      lineCount: input.charges.length,
      primaryProjectSlug: input.primaryProjectSlug ?? null,
    },
    topResources,
    topProjects,
    recommendations,
  };
}

function envInteger(
  env: Record<string, string | undefined>,
  key: string,
): number | null {
  const value = Number(env[key]);
  if (!Number.isFinite(value)) return null;
  return Math.floor(value);
}

function addMonths(date: Date, months: number): Date {
  const copy = new Date(date);
  copy.setUTCMonth(copy.getUTCMonth() + months);
  return copy;
}

export function currentVercelBillingPeriod(
  now = new Date(),
  env: Record<string, string | undefined> = process.env,
): { from: string; to: string } {
  const cycleDay = envInteger(env, "VERCEL_BILLING_CYCLE_START_DAY");
  const cycleHour = envInteger(env, "VERCEL_BILLING_CYCLE_START_HOUR") ?? 0;

  if (cycleDay && cycleDay >= 1 && cycleDay <= 28) {
    let from = new Date(now);
    from.setUTCDate(cycleDay);
    from.setUTCHours(Math.min(Math.max(cycleHour, 0), 23), 0, 0, 0);
    if (from.getTime() > now.getTime()) {
      from = addMonths(from, -1);
    }
    return {
      from: from.toISOString(),
      to: addMonths(from, 1).toISOString(),
    };
  }

  const from = new Date(now);
  from.setUTCDate(1);
  from.setUTCHours(0, 0, 0, 0);
  return {
    from: from.toISOString(),
    to: addMonths(from, 1).toISOString(),
  };
}
