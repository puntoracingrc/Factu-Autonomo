export type FiscalWatchAdminLevel = "ok" | "watch" | "action";

export type FiscalWatchIssueKind = "change" | "baseline";

export interface FiscalWatchAdminIssue {
  number: number;
  kind: FiscalWatchIssueKind;
  title: string;
  url: string;
  sourceLabel: string | null;
  sourceUrl: string | null;
  detectedAt: string;
  modelCodes: string[];
  modelHintsTruncated: boolean;
}

export interface FiscalWatchAdminStatus {
  generatedAt: string;
  signalId: string;
  level: FiscalWatchAdminLevel;
  label: string;
  headline: string;
  lastRunAt: string | null;
  pendingReviews: number;
  baselinePending: boolean;
  issues: FiscalWatchAdminIssue[];
  workflowUrl: string | null;
  workflow: {
    id: number | null;
    status: "queued" | "in_progress" | "completed" | "unknown";
    conclusion: string | null;
    stale: boolean;
  };
  sourcesValid: boolean;
  recommendations: string[];
}

export interface FiscalWatchAdminStatusInput {
  workflowRuns: unknown;
  unreviewedIssues: unknown;
  baselineIssues: unknown;
  now?: Date;
}

const REPOSITORY_PATH = "/puntoracingrc/Factu-Autonomo";
const MAX_ISSUES_PER_LABEL = 20;
const MAX_ISSUE_BODY_LENGTH = 65_536;
const STALE_AFTER_MS = 36 * 60 * 60_000;
const FUTURE_CLOCK_SKEW_MS = 5 * 60_000;
const MAX_MODEL_HINTS = 80;
const CHANGE_ISSUE_MARKER =
  /<!-- fiscal-watch-change:v1:[a-z0-9-]+:[a-f0-9]{32} -->/g;
const BASELINE_ISSUE_MARKER =
  /<!-- fiscal-watch-baseline:v1:[A-Za-z0-9._-]+:[A-Za-z0-9._-]+ -->/g;
const MODEL_HINT_MARKER =
  /<!-- fiscal-watch-model-hint:v1:(A\d{2}|\d{2,3}[A-Z]?) -->/g;
const MODEL_HINT_MARKER_PREFIX = "<!-- fiscal-watch-model-hint:v1:";
const MODEL_HINTS_TRUNCATED_MARKER =
  /<!-- fiscal-watch-model-hints-truncated:v1 -->/g;
const REVIEW_KEY_PATTERN = /^(change|baseline):([1-9]\d{0,15})$/;
const MAX_REVIEW_KEYS = 500;

const WORKFLOW_STATUSES = new Set([
  "queued",
  "in_progress",
  "completed",
  "waiting",
  "requested",
  "pending",
]);

const WORKFLOW_CONCLUSIONS = new Set([
  "success",
  "failure",
  "cancelled",
  "timed_out",
  "action_required",
  "neutral",
  "skipped",
  "stale",
  "startup_failure",
]);

const OFFICIAL_SOURCE_HOSTS = new Map([
  ["www.boe.es", "BOE"],
  ["boe.es", "BOE"],
  ["sede.agenciatributaria.gob.es", "Agencia Tributaria"],
  ["www2.agenciatributaria.gob.es", "Agencia Tributaria · INFORMA"],
]);

interface NormalizedWorkflow {
  valid: boolean;
  id: number | null;
  status: "queued" | "in_progress" | "completed" | "unknown";
  conclusion: string | null;
  updatedAt: string | null;
  url: string | null;
}

interface NormalizedIssues {
  valid: boolean;
  issues: FiscalWatchAdminIssue[];
}

interface NormalizedModelHints {
  valid: boolean;
  codes: string[];
  truncated: boolean;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function cleanText(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") return null;
  const cleaned = value
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned) return null;
  return Array.from(cleaned).slice(0, maxLength).join("");
}

function isoTimestamp(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 80) return null;
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return null;
  return new Date(timestamp).toISOString();
}

function positiveSafeInteger(value: unknown): number | null {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0
    ? value
    : null;
}

function exactGithubUrl(
  value: unknown,
  kind: "workflow" | "issue",
  id: number,
): string | null {
  if (typeof value !== "string" || value.length > 500) return null;
  try {
    const url = new URL(value);
    const suffix =
      kind === "workflow" ? `/actions/runs/${id}` : `/issues/${id}`;
    if (
      url.protocol !== "https:" ||
      url.hostname !== "github.com" ||
      url.port ||
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      url.pathname !== `${REPOSITORY_PATH}${suffix}`
    ) {
      return null;
    }
    return url.toString();
  } catch {
    return null;
  }
}

function officialSourceUrl(value: string): {
  label: string;
  url: string;
} | null {
  if (value.length > 800) return null;
  try {
    const url = new URL(value);
    const label = OFFICIAL_SOURCE_HOSTS.get(url.hostname);
    if (
      !label ||
      url.protocol !== "https:" ||
      url.port ||
      url.username ||
      url.password
    ) {
      return null;
    }
    url.hash = "";
    return { label, url: url.toString() };
  } catch {
    return null;
  }
}

function firstOfficialSource(body: string | null): {
  label: string | null;
  url: string | null;
} {
  if (!body) return { label: null, url: null };
  const candidates = body.match(/https:\/\/[^\s<>"'`\])}]+/gu) ?? [];
  for (const candidate of candidates.slice(0, 40)) {
    const normalized = officialSourceUrl(candidate.replace(/[.,;:]+$/u, ""));
    if (normalized) return normalized;
  }
  return { label: null, url: null };
}

function normalizedLabels(value: unknown): string[] | null {
  if (!Array.isArray(value) || value.length > 30) return null;
  const labels: string[] = [];
  for (const candidate of value) {
    if (typeof candidate === "string") {
      const label = cleanText(candidate, 100);
      if (!label) return null;
      labels.push(label);
      continue;
    }
    const record = asRecord(candidate);
    const label = cleanText(record?.name, 100);
    if (!record || !label) return null;
    labels.push(label);
  }
  return labels;
}

function normalizeModelHints(
  body: string | null,
  kind: FiscalWatchIssueKind,
): NormalizedModelHints {
  if (!body) return { valid: true, codes: [], truncated: false };
  MODEL_HINT_MARKER.lastIndex = 0;
  MODEL_HINTS_TRUNCATED_MARKER.lastIndex = 0;
  const codes = [...body.matchAll(MODEL_HINT_MARKER)].map(
    (match) => match[1],
  );
  const markerPrefixCount = body.split(MODEL_HINT_MARKER_PREFIX).length - 1;
  const truncatedMarkers = [
    ...body.matchAll(MODEL_HINTS_TRUNCATED_MARKER),
  ];
  const uniqueSorted = [...new Set(codes)].sort();
  const valid =
    codes.length <= MAX_MODEL_HINTS &&
    markerPrefixCount === codes.length &&
    truncatedMarkers.length <= 1 &&
    codes.length === uniqueSorted.length &&
    codes.every((code, index) => code === uniqueSorted[index]) &&
    (truncatedMarkers.length === 0 || codes.length === MAX_MODEL_HINTS) &&
    (kind === "change" ||
      (codes.length === 0 && truncatedMarkers.length === 0));
  return {
    valid,
    codes: valid ? uniqueSorted : [],
    truncated: valid && truncatedMarkers.length === 1,
  };
}

function normalizeWorkflow(value: unknown): NormalizedWorkflow {
  const record = asRecord(value);
  const rows = record?.workflow_runs;
  if (!record || !Array.isArray(rows) || rows.length > 1) {
    return {
      valid: false,
      id: null,
      status: "unknown",
      conclusion: null,
      updatedAt: null,
      url: null,
    };
  }
  if (rows.length === 0) {
    return {
      valid: true,
      id: null,
      status: "unknown",
      conclusion: null,
      updatedAt: null,
      url: null,
    };
  }

  const run = asRecord(rows[0]);
  const id = positiveSafeInteger(run?.id);
  const rawStatus = cleanText(run?.status, 40);
  const rawConclusion =
    run?.conclusion === null ? null : cleanText(run?.conclusion, 40);
  const updatedAt = isoTimestamp(run?.updated_at);
  if (
    !run ||
    !id ||
    !rawStatus ||
    !WORKFLOW_STATUSES.has(rawStatus) ||
    !updatedAt ||
    (rawConclusion !== null && !WORKFLOW_CONCLUSIONS.has(rawConclusion)) ||
    (rawStatus === "completed" && rawConclusion === null)
  ) {
    return {
      valid: false,
      id: null,
      status: "unknown",
      conclusion: null,
      updatedAt: null,
      url: null,
    };
  }
  const url = exactGithubUrl(run.html_url, "workflow", id);
  if (!url) {
    return {
      valid: false,
      id: null,
      status: "unknown",
      conclusion: null,
      updatedAt: null,
      url: null,
    };
  }

  return {
    valid: true,
    id,
    status:
      rawStatus === "completed"
        ? "completed"
        : rawStatus === "in_progress"
          ? "in_progress"
          : "queued",
    conclusion: rawConclusion,
    updatedAt,
    url,
  };
}

function normalizeIssues(
  value: unknown,
  expectedLabel: "fiscal-watch:unreviewed" | "fiscal-watch:baseline",
  kind: FiscalWatchIssueKind,
): NormalizedIssues {
  if (!Array.isArray(value) || value.length > MAX_ISSUES_PER_LABEL) {
    return { valid: false, issues: [] };
  }

  const issues: FiscalWatchAdminIssue[] = [];
  for (const candidate of value) {
    const issue = asRecord(candidate);
    const number = positiveSafeInteger(issue?.number);
    const title = cleanText(issue?.title, 240);
    const detectedAt = isoTimestamp(issue?.created_at);
    const updatedAt = isoTimestamp(issue?.updated_at);
    const labels = normalizedLabels(issue?.labels);
    const body = issue?.body;
    const modelHints = normalizeModelHints(
      typeof body === "string" ? body : null,
      kind,
    );
    const author = asRecord(issue?.user);
    const markerPattern =
      kind === "change" ? CHANGE_ISSUE_MARKER : BASELINE_ISSUE_MARKER;
    markerPattern.lastIndex = 0;
    const markers =
      typeof body === "string" ? [...body.matchAll(markerPattern)] : [];
    const fiscalWatchLabels =
      labels?.filter((label) => label.startsWith("fiscal-watch:")) ?? [];
    if (
      !issue ||
      !number ||
      !title ||
      !detectedAt ||
      !updatedAt ||
      issue.state !== "open" ||
      "pull_request" in issue ||
      author?.login !== "github-actions[bot]" ||
      author.type !== "Bot" ||
      fiscalWatchLabels.length !== 1 ||
      fiscalWatchLabels[0] !== expectedLabel ||
      (body !== null && typeof body !== "string") ||
      (typeof body === "string" &&
        Array.from(body).length > MAX_ISSUE_BODY_LENGTH) ||
      markers.length !== 1 ||
      !modelHints.valid
    ) {
      return { valid: false, issues: [] };
    }
    const url = exactGithubUrl(issue.html_url, "issue", number);
    if (!url) return { valid: false, issues: [] };
    const source = firstOfficialSource(typeof body === "string" ? body : null);
    issues.push({
      number,
      kind,
      title,
      url,
      sourceLabel: source.label,
      sourceUrl: source.url,
      detectedAt,
      modelCodes: modelHints.codes,
      modelHintsTruncated: modelHints.truncated,
    });
  }

  issues.sort((left, right) => {
    const time = Date.parse(right.detectedAt) - Date.parse(left.detectedAt);
    return time || right.number - left.number;
  });
  return { valid: true, issues };
}

function stableSignalId(
  level: FiscalWatchAdminLevel,
  workflowId: number | null,
  changes: readonly FiscalWatchAdminIssue[],
  baselines: readonly FiscalWatchAdminIssue[],
): string {
  const changeIds =
    changes
      .map((issue) => issue.number)
      .sort((a, b) => a - b)
      .join(".") || "none";
  const baselineIds =
    baselines
      .map((issue) => issue.number)
      .sort((a, b) => a - b)
      .join(".") || "none";
  return `fiscal-watch:${level}:run-${workflowId ?? "none"}:changes-${changeIds}:baseline-${baselineIds}`;
}

export function fiscalWatchReviewKey(
  kind: FiscalWatchIssueKind,
  issueNumber: number,
): string | null {
  if (!Number.isSafeInteger(issueNumber) || issueNumber <= 0) return null;
  return `${kind}:${issueNumber}`;
}

function invalidReviewedStatus(
  status: FiscalWatchAdminStatus,
): FiscalWatchAdminStatus {
  return {
    ...status,
    signalId: stableSignalId(
      "action",
      status.workflow.id,
      status.issues.filter((issue) => issue.kind === "change"),
      status.issues.filter((issue) => issue.kind === "baseline"),
    ),
    level: "action",
    label: "Acción necesaria",
    headline: "La vigilancia fiscal no puede verificarse.",
    sourcesValid: false,
    recommendations: [
      "Revisa la ejecución técnica antes de confiar en la vigilancia diaria.",
    ],
  };
}

export function applyFiscalWatchReviews(
  status: FiscalWatchAdminStatus,
  reviewedKeys: unknown,
): FiscalWatchAdminStatus {
  if (!Array.isArray(reviewedKeys) || reviewedKeys.length > MAX_REVIEW_KEYS) {
    return invalidReviewedStatus(status);
  }
  const keys = new Set<string>();
  for (const value of reviewedKeys) {
    if (
      typeof value !== "string" ||
      !REVIEW_KEY_PATTERN.test(value) ||
      keys.has(value)
    ) {
      return invalidReviewedStatus(status);
    }
    keys.add(value);
  }
  if (!status.sourcesValid || keys.size === 0) return status;

  const issues = status.issues.filter((issue) => {
    const key = fiscalWatchReviewKey(issue.kind, issue.number);
    return key === null || !keys.has(key);
  });
  const changes = issues.filter((issue) => issue.kind === "change");
  const baselines = issues.filter((issue) => issue.kind === "baseline");
  const workflowFailed =
    status.workflow.status === "completed" &&
    status.workflow.conclusion !== "success";

  let level: FiscalWatchAdminLevel;
  let label: string;
  let headline: string;
  if (status.workflow.id === null) {
    level = "action";
    label = "Acción necesaria";
    headline = "La vigilancia fiscal no puede verificarse.";
  } else if (workflowFailed) {
    level = "action";
    label = "Acción necesaria";
    headline = "La última vigilancia fiscal terminó con error.";
  } else if (status.workflow.stale) {
    level = "action";
    label = "Acción necesaria";
    headline = "La vigilancia fiscal lleva más de 36 horas sin completarse.";
  } else if (changes.length > 0) {
    level = "watch";
    label = "Revisión pendiente";
    headline =
      changes.length === 1
        ? "Hay un aviso oficial pendiente de revisión humana."
        : `Hay ${changes.length} avisos oficiales pendientes de revisión humana.`;
  } else if (baselines.length > 0) {
    level = "watch";
    label = "Revisión pendiente";
    headline = "La línea base de fuentes oficiales está pendiente de validación.";
  } else if (status.workflow.status !== "completed") {
    level = "watch";
    label = "Comprobando";
    headline = "La revisión diaria de fuentes oficiales está en curso.";
  } else {
    level = "ok";
    label = "Al día";
    headline = "Fuentes oficiales revisadas; no hay cambios pendientes.";
  }

  const recommendations =
    level === "action"
      ? [
          "Revisa la ejecución técnica antes de confiar en la vigilancia diaria.",
        ]
      : changes.length > 0
        ? [
            "Examina cada cambio y valida su efecto fiscal antes de modificar el producto.",
          ]
        : baselines.length > 0
          ? [
              "Valida la primera captura para empezar a comparar cambios diarios.",
            ]
          : ["No se requiere ninguna intervención."];

  return {
    ...status,
    signalId: stableSignalId(level, status.workflow.id, changes, baselines),
    level,
    label,
    headline,
    pendingReviews: changes.length,
    baselinePending: baselines.length > 0,
    issues,
    recommendations,
  };
}

export function buildFiscalWatchAdminStatus(
  input: FiscalWatchAdminStatusInput,
): FiscalWatchAdminStatus {
  const now = input.now ?? new Date();
  const generatedAt = Number.isFinite(now.getTime())
    ? now.toISOString()
    : new Date(0).toISOString();
  const workflow = normalizeWorkflow(input.workflowRuns);
  const changes = normalizeIssues(
    input.unreviewedIssues,
    "fiscal-watch:unreviewed",
    "change",
  );
  const baselines = normalizeIssues(
    input.baselineIssues,
    "fiscal-watch:baseline",
    "baseline",
  );
  const sourcesValid = workflow.valid && changes.valid && baselines.valid;
  const lastRunTime = workflow.updatedAt
    ? Date.parse(workflow.updatedAt)
    : Number.NaN;
  const stale =
    workflow.valid &&
    workflow.id !== null &&
    Number.isFinite(lastRunTime) &&
    (now.getTime() - lastRunTime > STALE_AFTER_MS ||
      lastRunTime - now.getTime() > FUTURE_CLOCK_SKEW_MS);
  const workflowFailed =
    workflow.status === "completed" && workflow.conclusion !== "success";
  const workflowMissing = workflow.valid && workflow.id === null;

  let level: FiscalWatchAdminLevel;
  let label: string;
  let headline: string;
  if (!sourcesValid || workflowMissing) {
    level = "action";
    label = "Acción necesaria";
    headline = "La vigilancia fiscal no puede verificarse.";
  } else if (workflowFailed) {
    level = "action";
    label = "Acción necesaria";
    headline = "La última vigilancia fiscal terminó con error.";
  } else if (stale) {
    level = "action";
    label = "Acción necesaria";
    headline = "La vigilancia fiscal lleva más de 36 horas sin completarse.";
  } else if (changes.issues.length > 0) {
    level = "watch";
    label = "Revisión pendiente";
    headline =
      changes.issues.length === 1
        ? "Hay un aviso oficial pendiente de revisión humana."
        : `Hay ${changes.issues.length} avisos oficiales pendientes de revisión humana.`;
  } else if (baselines.issues.length > 0) {
    level = "watch";
    label = "Revisión pendiente";
    headline =
      "La línea base de fuentes oficiales está pendiente de validación.";
  } else if (workflow.status !== "completed") {
    level = "watch";
    label = "Comprobando";
    headline = "La revisión diaria de fuentes oficiales está en curso.";
  } else {
    level = "ok";
    label = "Al día";
    headline = "Fuentes oficiales revisadas; no hay cambios pendientes.";
  }

  const issues = [...changes.issues, ...baselines.issues]
    .sort((left, right) => {
      const time = Date.parse(right.detectedAt) - Date.parse(left.detectedAt);
      return time || right.number - left.number;
    })
    .slice(0, MAX_ISSUES_PER_LABEL * 2);
  const recommendations =
    level === "action"
      ? [
          "Revisa la ejecución técnica antes de confiar en la vigilancia diaria.",
        ]
      : changes.issues.length > 0
        ? [
            "Examina cada cambio y valida su efecto fiscal antes de modificar el producto.",
          ]
        : baselines.issues.length > 0
          ? [
              "Valida la primera captura para empezar a comparar cambios diarios.",
            ]
          : ["No se requiere ninguna intervención."];

  return {
    generatedAt,
    signalId: stableSignalId(
      level,
      workflow.id,
      changes.issues,
      baselines.issues,
    ),
    level,
    label,
    headline,
    lastRunAt: workflow.updatedAt,
    pendingReviews: changes.issues.length,
    baselinePending: baselines.issues.length > 0,
    issues,
    workflowUrl: workflow.url,
    workflow: {
      id: workflow.id,
      status: workflow.status,
      conclusion: workflow.conclusion,
      stale,
    },
    sourcesValid,
    recommendations,
  };
}
