import type { AdminHealthLevel } from "@/lib/admin/health";

export interface AdminOperationsRun {
  id: number | null;
  name: string;
  status: string;
  conclusion: string | null;
  headSha: string | null;
  updatedAt: string | null;
  url: string | null;
}

export interface AdminFirewallEventSummary {
  action: string;
  host: string;
  count: number;
  latestAt: string | null;
}

export interface AdminOperationsStatus {
  generatedAt: string;
  level: AdminHealthLevel;
  label: string;
  headline: string;
  github: {
    level: AdminHealthLevel;
    mainSha: string | null;
    mainUpdatedAt: string | null;
    ci: AdminOperationsRun | null;
    codeql: AdminOperationsRun | null;
    scheduler: AdminOperationsRun | null;
    schedulerLevel: AdminHealthLevel;
  };
  deployment: {
    level: AdminHealthLevel;
    domain: string;
    alignedWithMain: boolean | null;
    domainPointsToLatest: boolean | null;
    aliasDeploymentId: string | null;
    latestDeploymentId: string | null;
    deployedSha: string | null;
    branch: string | null;
    createdAt: string | null;
  };
  firewall: {
    level: AdminHealthLevel;
    available: boolean;
    enabled: boolean;
    botProtection: string;
    aiBots: string;
    events24h: number;
    latestAt: string | null;
    events: AdminFirewallEventSummary[];
  };
  recommendations: string[];
}

interface OperationsStatusInput {
  githubCommit: unknown;
  githubRuns: unknown;
  vercelAlias: unknown;
  vercelDeployments: unknown;
  vercelFirewallConfig: unknown;
  vercelFirewallEvents: unknown;
  domain?: string | null;
  now?: Date;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function safeString(value: unknown, maxLength = 240): string | null {
  if (typeof value !== "string") return null;
  const clean = value.replace(/[\r\n\t]+/g, " ").trim();
  return clean ? clean.slice(0, maxLength) : null;
}

function safeTimestamp(value: unknown): string | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }
  const text = safeString(value);
  if (!text) return null;
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function nonNegativeInteger(value: unknown): number {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.floor(number)) : 0;
}

function levelRank(level: AdminHealthLevel): number {
  return level === "action" ? 2 : level === "watch" ? 1 : 0;
}

function maxLevel(levels: AdminHealthLevel[]): AdminHealthLevel {
  return levels.reduce<AdminHealthLevel>(
    (highest, level) => (levelRank(level) > levelRank(highest) ? level : highest),
    "ok",
  );
}

function normalizeRun(value: unknown): AdminOperationsRun {
  const row = asRecord(value);
  return {
    id: Number.isFinite(Number(row.id)) ? Number(row.id) : null,
    name: safeString(row.name, 80) ?? "Workflow",
    status: safeString(row.status, 40) ?? "unknown",
    conclusion: safeString(row.conclusion, 40),
    headSha: safeString(row.head_sha, 64),
    updatedAt: safeTimestamp(row.updated_at),
    url: safeString(row.html_url, 500),
  };
}

function runLevel(run: AdminOperationsRun | null): AdminHealthLevel {
  if (!run) return "watch";
  if (run.status !== "completed") return "watch";
  return run.conclusion === "success" ? "ok" : "action";
}

const SCHEDULER_WATCH_STALE_MS = 60 * 60_000;
const SCHEDULER_ACTION_STALE_MS = 4 * 60 * 60_000;

function schedulerRunLevel(
  run: AdminOperationsRun | null,
  now: Date,
): AdminHealthLevel {
  const baseLevel = runLevel(run);
  if (baseLevel !== "ok") return baseLevel;
  if (!run?.updatedAt) return "watch";
  const ageMs = now.getTime() - new Date(run.updatedAt).getTime();
  if (ageMs > SCHEDULER_ACTION_STALE_MS) return "action";
  return ageMs > SCHEDULER_WATCH_STALE_MS ? "watch" : "ok";
}

function managedRuleMode(config: Record<string, unknown>, id: string): string {
  const managedRules = asRecord(config.managedRules);
  const rule = asRecord(managedRules[id]);
  if (rule.active !== true) return "off";
  return safeString(rule.action, 20) ?? "active";
}

function aggregateFirewallEvents(value: unknown): {
  events: AdminFirewallEventSummary[];
  total: number;
  latestAt: string | null;
} {
  const rows = asArray(asRecord(value).actions);
  const aggregated = new Map<string, AdminFirewallEventSummary>();
  let total = 0;
  let latestAt: string | null = null;

  for (const value of rows) {
    const row = asRecord(value);
    const action = safeString(row.action_type, 80) ?? "unknown";
    const host = safeString(row.host, 200) ?? "unknown";
    const count = nonNegativeInteger(row.count);
    const rowLatest = safeTimestamp(row.endTime ?? row.startTime);
    const key = `${action}::${host}`;
    const current = aggregated.get(key) ?? {
      action,
      host,
      count: 0,
      latestAt: null,
    };
    current.count += count;
    if (
      rowLatest &&
      (!current.latestAt || new Date(rowLatest).getTime() > new Date(current.latestAt).getTime())
    ) {
      current.latestAt = rowLatest;
    }
    aggregated.set(key, current);
    total += count;
    if (
      rowLatest &&
      (!latestAt || new Date(rowLatest).getTime() > new Date(latestAt).getTime())
    ) {
      latestAt = rowLatest;
    }
  }

  return {
    events: Array.from(aggregated.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 8),
    total,
    latestAt,
  };
}

export function buildAdminOperationsStatus(
  input: OperationsStatusInput,
): AdminOperationsStatus {
  const now = input.now ?? new Date();
  const githubCommit = asRecord(input.githubCommit);
  const commitData = asRecord(githubCommit.commit);
  const committer = asRecord(commitData.committer);
  const mainSha = safeString(githubCommit.sha, 64);
  const mainUpdatedAt = safeTimestamp(committer.date);
  const workflowRuns = asArray(asRecord(input.githubRuns).workflow_runs).map(
    normalizeRun,
  );
  const ci = workflowRuns.find((run) => run.name.toLowerCase() === "ci") ?? null;
  const codeql =
    workflowRuns.find((run) => run.name.toLowerCase().includes("codeql")) ?? null;
  const scheduler =
    workflowRuns.find(
      (run) => run.name.toLowerCase() === "security health alert",
    ) ?? null;
  const ciLevel = runLevel(ci);
  // CodeQL is weekly, so its last run can fall outside the recent-run window.
  // Absence is displayed as unconfirmed but must not create a permanent alert.
  const codeqlLevel = codeql ? runLevel(codeql) : "ok";
  const schedulerLevel = schedulerRunLevel(scheduler, now);
  const githubLevel = maxLevel([ciLevel, codeqlLevel, schedulerLevel]);

  const alias = asRecord(input.vercelAlias);
  const aliasDeploymentId =
    safeString(alias.deploymentId, 100) ?? safeString(asRecord(alias.deployment).id, 100);
  const deployments = asArray(asRecord(input.vercelDeployments).deployments).map(
    asRecord,
  );
  const latestDeployment = deployments[0] ?? {};
  const latestDeploymentId =
    safeString(latestDeployment.uid, 100) ?? safeString(latestDeployment.id, 100);
  const aliasDeployment =
    deployments.find((row) => {
      const id = safeString(row.uid, 100) ?? safeString(row.id, 100);
      return Boolean(id && id === aliasDeploymentId);
    }) ?? (aliasDeploymentId === latestDeploymentId ? latestDeployment : {});
  const deployedSha = safeString(asRecord(aliasDeployment.meta).githubCommitSha, 64);
  const branch = safeString(asRecord(aliasDeployment.meta).githubCommitRef, 120);
  const deploymentCreatedAt = safeTimestamp(aliasDeployment.createdAt);
  const domainPointsToLatest =
    aliasDeploymentId && latestDeploymentId
      ? aliasDeploymentId === latestDeploymentId
      : null;
  const alignedWithMain =
    mainSha && deployedSha ? mainSha === deployedSha : null;

  let deploymentLevel: AdminHealthLevel = "ok";
  if (domainPointsToLatest === false) deploymentLevel = "action";
  if (alignedWithMain === false) {
    deploymentLevel = ciLevel === "ok" ? "action" : "watch";
  }
  if (domainPointsToLatest === null || alignedWithMain === null) {
    deploymentLevel = maxLevel([deploymentLevel, "watch"]);
  }
  deploymentLevel = maxLevel([deploymentLevel, ciLevel]);

  const firewallConfig = asRecord(input.vercelFirewallConfig);
  const firewallAvailable = Object.keys(firewallConfig).length > 0;
  const firewallEnabled = firewallConfig.firewallEnabled === true;
  const botProtection = managedRuleMode(firewallConfig, "bot_protection");
  const aiBots = managedRuleMode(firewallConfig, "ai_bots");
  const firewallEvents = aggregateFirewallEvents(input.vercelFirewallEvents);
  const trafficLevel: AdminHealthLevel =
    firewallEvents.total >= 5_000
      ? "action"
      : firewallEvents.total >= 500
        ? "watch"
        : "ok";
  const firewallConfigLevel: AdminHealthLevel = !firewallAvailable
    ? "watch"
    : !firewallEnabled
      ? "action"
      : botProtection === "off" || aiBots === "off"
        ? "watch"
        : "ok";
  const firewallLevel = maxLevel([firewallConfigLevel, trafficLevel]);
  const level = maxLevel([githubLevel, deploymentLevel, firewallLevel]);

  const recommendations: string[] = [];
  if (level === "ok") {
    recommendations.push("Codigo, despliegue, dominio y vigilancia de bots estan alineados.");
  }
  if (ciLevel === "action") {
    recommendations.push("El ultimo CI de main ha fallado; revisar GitHub Actions antes de desplegar.");
  }
  if (codeqlLevel === "action") {
    recommendations.push("CodeQL ha fallado; revisar el analisis de seguridad del repositorio.");
  }
  if (schedulerLevel === "action") {
    recommendations.push(
      "Las alertas automaticas han fallado o llevan mas de cuatro horas sin ejecutarse.",
    );
  } else if (schedulerLevel === "watch") {
    recommendations.push(
      "La ultima alerta automatica lleva mas de una hora sin renovarse; GitHub puede haber retrasado el cron.",
    );
  }
  if (alignedWithMain === false || domainPointsToLatest === false) {
    recommendations.push("El dominio no coincide con el ultimo main listo; revisar Production Domain.");
  }
  if (!firewallAvailable || !firewallEnabled) {
    recommendations.push("La configuracion de Firewall no se ha podido confirmar como activa.");
  }
  if (botProtection === "off" || aiBots === "off") {
    recommendations.push("Revisar Bot Protection y AI Bots en Vercel Firewall.");
  }
  if (trafficLevel !== "ok") {
    recommendations.push("Hay volumen de bots elevado en las ultimas 24 horas; revisar el log copiable.");
  }

  return {
    generatedAt: now.toISOString(),
    level,
    label:
      level === "action" ? "Actuar" : level === "watch" ? "Vigilar" : "Todo bien",
    headline:
      level === "action"
        ? "Hay una senal operativa que requiere revision."
        : level === "watch"
          ? "La operacion funciona, con algun punto por confirmar."
          : "Produccion y controles externos estan alineados.",
    github: {
      level: githubLevel,
      mainSha,
      mainUpdatedAt,
      ci,
      codeql,
      scheduler,
      schedulerLevel,
    },
    deployment: {
      level: deploymentLevel,
      domain: input.domain?.trim() || "facturacion-autonomos.app",
      alignedWithMain,
      domainPointsToLatest,
      aliasDeploymentId,
      latestDeploymentId,
      deployedSha,
      branch,
      createdAt: deploymentCreatedAt,
    },
    firewall: {
      level: firewallLevel,
      available: firewallAvailable,
      enabled: firewallEnabled,
      botProtection,
      aiBots,
      events24h: firewallEvents.total,
      latestAt: firewallEvents.latestAt,
      events: firewallEvents.events,
    },
    recommendations,
  };
}
