import rawManifest from "./screenshot-manifest.json";

export type ManualScreenshotReviewStatus =
  | "pending-review"
  | "known-defect"
  | "reviewed";

export interface ManualScreenshotContext {
  kind: "legacy-inferred" | "generated";
  assetCommit: string;
  assetCommittedAt: string;
  scriptCommit: string;
  fixtureGitBlob: string;
  fixtureSha256: string | null;
  sourceTreeSha256: string | null;
  appCommit: string | null;
  capturedAt: string | null;
  viewport: { width: number; height: number };
  deviceScaleFactor: number;
  locale: string;
  theme: "light" | "dark";
  themeEvidence: string;
  browser: string;
  browserVersion: string | null;
  operatingSystem: string | null;
  timezone: string | null;
}

export interface ManualScreenshotContract {
  src: string;
  usage: "referenced" | "orphan";
  intended: {
    route: string;
    stateId: string;
    setupId: string;
    expectedMarkers: string[];
  };
  artifact: {
    sha256: string;
    width: number;
    height: number;
  };
  provenance: { contextId: string };
  review: {
    status: ManualScreenshotReviewStatus;
    tracking: string;
    reason: string;
    reviewedAt?: string;
    validUntil?: string;
    reviewedArtifactSha256?: string;
    reviewedAgainstAppCommit?: string;
  };
}

export interface ManualScreenshotManifest {
  schemaVersion: number;
  policy: {
    maxReviewAgeDays: number;
    recaptureTracking: string;
    visualMatrixTracking: string;
  };
  contexts: Record<string, ManualScreenshotContext>;
  captures: ManualScreenshotContract[];
}

export const manualScreenshotManifest =
  rawManifest as unknown as ManualScreenshotManifest;

export interface ManualScreenshotApprovalProblem {
  code: string;
  message: string;
}

const SHA256_PATTERN = /^[a-f0-9]{64}$/;
const COMMIT_PATTERN = /^[a-f0-9]{40}$/;
const ISO_INSTANT_PATTERN =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?(Z|[+-]\d{2}:\d{2})$/;

/** Date.parse acepta fechas como 30 de febrero; esta variante no. */
export function parseStrictIsoInstant(value: unknown): number | null {
  if (typeof value !== "string") return null;
  const match = ISO_INSTANT_PATTERN.exec(value);
  if (!match) return null;
  const [, yearText, monthText, dayText, hourText, minuteText, secondText, , zone] =
    match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const hour = Number(hourText);
  const minute = Number(minuteText);
  const second = Number(secondText);
  if (
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > new Date(Date.UTC(year, month, 0)).getUTCDate() ||
    hour > 23 ||
    minute > 59 ||
    second > 59
  ) {
    return null;
  }
  if (zone !== "Z") {
    const zoneHours = Number(zone.slice(1, 3));
    const zoneMinutes = Number(zone.slice(4, 6));
    if (
      zoneHours > 14 ||
      zoneMinutes > 59 ||
      (zoneHours === 14 && zoneMinutes !== 0)
    ) {
      return null;
    }
  }
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? null : timestamp;
}

/** Git fecha commits a segundos; no inventa orden dentro del mismo segundo. */
export function isAfterGitTimestamp(left: number, right: number): boolean {
  return Math.floor(left / 1000) > Math.floor(right / 1000);
}

export function collectManualScreenshotApprovalProblems(
  contract: ManualScreenshotContract,
  context: ManualScreenshotContext | undefined,
  maxReviewAgeDays: number,
  now = new Date(),
): ManualScreenshotApprovalProblem[] {
  const problems: ManualScreenshotApprovalProblem[] = [];
  if (contract.review.status !== "reviewed") {
    return [{ code: "not-reviewed", message: "La captura no está revisada" }];
  }
  if (!context || context.kind !== "generated") {
    problems.push({
      code: "reviewed-legacy",
      message: "Una captura legacy inferida no puede declararse revisada",
    });
    return problems;
  }
  if (!Number.isInteger(maxReviewAgeDays) || maxReviewAgeDays <= 0) {
    problems.push({
      code: "review-policy",
      message: "La política de vigencia de revisiones no es válida",
    });
  }
  if (!context.appCommit || !COMMIT_PATTERN.test(context.appCommit)) {
    problems.push({ code: "app-commit", message: "Falta appCommit válido" });
  }
  if (!COMMIT_PATTERN.test(context.assetCommit)) {
    problems.push({ code: "asset-commit", message: "Falta assetCommit válido" });
  }
  if (!COMMIT_PATTERN.test(context.scriptCommit)) {
    problems.push({ code: "script-commit", message: "Falta scriptCommit válido" });
  }
  if (!COMMIT_PATTERN.test(context.fixtureGitBlob)) {
    problems.push({
      code: "fixture-blob",
      message: "Falta el blob Git válido del fixture",
    });
  }
  if (!context.sourceTreeSha256 || !SHA256_PATTERN.test(context.sourceTreeSha256)) {
    problems.push({
      code: "source-tree-hash",
      message: "Falta la huella del árbol fuente capturado",
    });
  }
  if (!context.fixtureSha256 || !SHA256_PATTERN.test(context.fixtureSha256)) {
    problems.push({
      code: "fixture-sha256",
      message: "Falta la huella SHA-256 del fixture",
    });
  }

  const capturedAt = parseStrictIsoInstant(context.capturedAt);
  const assetCommittedAt = parseStrictIsoInstant(context.assetCommittedAt);
  const reviewedAt = parseStrictIsoInstant(contract.review.reviewedAt);
  const validUntil = parseStrictIsoInstant(contract.review.validUntil);
  const nowMs = now.getTime();
  if (
    capturedAt === null ||
    assetCommittedAt === null ||
    reviewedAt === null ||
    validUntil === null
  ) {
    problems.push({
      code: "review-dates",
      message:
        "assetCommittedAt, capturedAt, reviewedAt y validUntil deben ser instantes ISO reales",
    });
  } else {
    const maxUntil = reviewedAt + maxReviewAgeDays * 86_400_000;
    if (capturedAt > nowMs || reviewedAt > nowMs) {
      problems.push({
        code: "future-review",
        message: "La captura o su revisión están fechadas en el futuro",
      });
    }
    if (reviewedAt < capturedAt) {
      problems.push({
        code: "review-before-capture",
        message: "La revisión precede a la captura",
      });
    }
    if (isAfterGitTimestamp(capturedAt, assetCommittedAt)) {
      problems.push({
        code: "capture-asset-order",
        message: "assetCommit aparece fechado antes de la captura",
      });
    }
    if (validUntil < reviewedAt) {
      problems.push({
        code: "review-date-order",
        message: "validUntil precede a reviewedAt",
      });
    }
    if (validUntil > maxUntil) {
      problems.push({
        code: "review-window",
        message: "La vigencia supera la política del manual",
      });
    }
    if (validUntil < nowMs) {
      problems.push({ code: "stale-review", message: "La revisión ha caducado" });
    }
  }
  if (!SHA256_PATTERN.test(contract.artifact.sha256)) {
    problems.push({
      code: "artifact-hash",
      message: "El artefacto no declara un SHA-256 válido",
    });
  }
  if (
    typeof contract.review.reviewedArtifactSha256 !== "string" ||
    !SHA256_PATTERN.test(contract.review.reviewedArtifactSha256) ||
    contract.review.reviewedArtifactSha256 !== contract.artifact.sha256
  ) {
    problems.push({
      code: "reviewed-hash",
      message: "La revisión no está ligada al hash actual",
    });
  }
  if (contract.review.reviewedAgainstAppCommit !== context.appCommit) {
    problems.push({
      code: "reviewed-commit",
      message: "La revisión no está ligada al commit de app",
    });
  }
  return problems;
}

const contractsBySrc = new Map(
  manualScreenshotManifest.captures.map((contract) => [contract.src, contract]),
);

export function getManualScreenshotContract(
  src: string,
): ManualScreenshotContract | undefined {
  return contractsBySrc.get(src);
}

/** Solo una revisión vigente y ligada al hash permite publicar el PNG. */
export function isManualScreenshotApproved(
  src: string,
  now = new Date(),
): boolean {
  const contract = getManualScreenshotContract(src);
  if (!contract) return false;
  return (
    collectManualScreenshotApprovalProblems(
      contract,
      manualScreenshotManifest.contexts[contract.provenance.contextId],
      manualScreenshotManifest.policy.maxReviewAgeDays,
      now,
    ).length === 0
  );
}
