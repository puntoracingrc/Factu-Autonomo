import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { PNG } from "pngjs";
import {
  collectManualScreenshotApprovalProblems,
  isAfterGitTimestamp,
  manualScreenshotManifest,
  parseStrictIsoInstant,
  type ManualScreenshotContract,
  type ManualScreenshotManifest,
} from "./screenshot-contracts";
import {
  collectManualScreenshotUsages,
  collectManualScreenshots,
  manualScreenshotPublicPath,
} from "./screenshots";
import { resolveManualSlug } from "./route-help";

const SHA256_PATTERN = /^[a-f0-9]{64}$/;
const COMMIT_PATTERN = /^[a-f0-9]{40}$/;
const STATE_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SAFE_SCREENSHOT_PATH = /^\/ayuda\/capturas\/[a-z0-9-]+\.png$/;
const FIXTURE_PATH = "scripts/manual-demo-data.json";
const CAPTURE_SCRIPT_PATH = "scripts/capture-manual-screenshots.mjs";
export const MANUAL_SCREENSHOT_ROUTE_TEMPLATES = [
  "/",
  "/avisos",
  "/clientes",
  "/clientes/nuevo",
  "/configuracion",
  "/configuracion/plantillas",
  "/consultor-fiscal",
  "/consultor-fiscal/diagnostico",
  "/cuenta",
  "/demo",
  "/facturas",
  "/facturas/[id]",
  "/facturas/[id]/rectificar",
  "/facturas/nuevo",
  "/gastos",
  "/gastos/fijos",
  "/gastos/nuevo",
  "/importar",
  "/impuestos",
  "/presupuestos",
  "/presupuestos/[id]",
  "/presupuestos/nuevo",
  "/productos",
  "/productos/nuevo",
  "/proveedores",
  "/proveedores/nuevo",
  "/recibos",
  "/recibos/[id]",
  "/recibos/nuevo",
  "/rentabilidad-real",
  "/rentabilidad-real/calculadora/horas",
  "/rentabilidad-real/calculadora/trabajo",
  "/rentabilidad-real/evolucion",
  "/rentabilidad-real/informes",
  "/rentabilidad-real/simulador-precio-minimo",
  "/rentabilidad-real/test",
  "/rentabilidad-real/validar-configuracion",
] as const;

export interface ManualScreenshotArtifact {
  src: string;
  sha256: string;
  width: number;
  height: number;
  validPng: boolean;
}

export interface ManualScreenshotVerificationIssue {
  code: string;
  message: string;
  src?: string;
}

export interface ManualScreenshotVerificationReport {
  errors: ManualScreenshotVerificationIssue[];
  warnings: ManualScreenshotVerificationIssue[];
  stats: {
    usages: number;
    referenced: number;
    artifacts: number;
    orphaned: number;
    reviewed: number;
    pendingReview: number;
    knownDefects: number;
  };
  completeVisualCoverage: boolean;
}

interface VerifyManualScreenshotContractsInput {
  manifest: ManualScreenshotManifest;
  referencedSources: string[];
  usageCount: number;
  artifacts: ManualScreenshotArtifact[];
  now?: Date;
}

function issue(
  code: string,
  message: string,
  src?: string,
): ManualScreenshotVerificationIssue {
  return { code, message, ...(src ? { src } : {}) };
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function matchesNextRouteTemplate(template: string, pathname: string): boolean {
  const templateSegments = template.split("/").filter(Boolean);
  const pathSegments = pathname.split("/").filter(Boolean);
  if (templateSegments.length !== pathSegments.length) return false;
  return templateSegments.every(
    (segment, index) =>
      (/^\[[^/]+\]$/.test(segment) && Boolean(pathSegments[index])) ||
      segment === pathSegments[index],
  );
}

export function resolveManualScreenshotRoute(route: unknown): string | null {
  if (
    typeof route !== "string" ||
    !route.startsWith("/") ||
    route.startsWith("//") ||
    route.includes("\\") ||
    route.includes("://")
  ) {
    return null;
  }
  const encodedPath = route.split(/[?#]/, 1)[0] || "/";
  let path: string;
  try {
    path = decodeURIComponent(encodedPath);
  } catch {
    return null;
  }
  if (
    !path.startsWith("/") ||
    path.includes("//") ||
    path.includes("\\") ||
    path.split("/").some((segment) => segment === "." || segment === "..")
  ) {
    return null;
  }
  const normalizedPath = path.length > 1 ? path.replace(/\/$/, "") : path;
  const slug = resolveManualSlug(normalizedPath);
  if (!slug) return null;
  return MANUAL_SCREENSHOT_ROUTE_TEMPLATES.some((template) =>
    matchesNextRouteTemplate(template, normalizedPath),
  )
    ? slug
    : null;
}

function validateContext(
  contextId: string,
  context: ManualScreenshotManifest["contexts"][string],
  now: Date,
  errors: ManualScreenshotVerificationIssue[],
) {
  if (
    !context ||
    typeof context !== "object" ||
    !["legacy-inferred", "generated"].includes(context.kind)
  ) {
    errors.push(issue("context-kind", `Contexto inválido: ${contextId}`));
    return;
  }
  for (const [field, value] of [
    ["assetCommit", context.assetCommit],
    ["scriptCommit", context.scriptCommit],
  ] as const) {
    if (typeof value !== "string" || !COMMIT_PATTERN.test(value)) {
      errors.push(
        issue("context-commit", `${contextId}.${field} no es un commit completo`),
      );
    }
  }
  const assetCommittedAt = parseStrictIsoInstant(context.assetCommittedAt);
  if (assetCommittedAt === null) {
    errors.push(
      issue("context-date", `${contextId}.assetCommittedAt no es una fecha válida`),
    );
  } else if (assetCommittedAt > now.getTime()) {
    errors.push(
      issue("future-context", `${contextId}.assetCommittedAt está en el futuro`),
    );
  }
  if (
    typeof context.fixtureGitBlob !== "string" ||
    !COMMIT_PATTERN.test(context.fixtureGitBlob)
  ) {
    errors.push(
      issue("fixture-hash", `${contextId}.fixtureGitBlob no es un blob Git`),
    );
  }
  if (
    !Number.isInteger(context.viewport?.width) ||
    !Number.isInteger(context.viewport?.height) ||
    context.viewport.width <= 0 ||
    context.viewport.height <= 0
  ) {
    errors.push(issue("viewport", `${contextId} no declara un viewport válido`));
  }
  if (
    typeof context.deviceScaleFactor !== "number" ||
    !Number.isFinite(context.deviceScaleFactor) ||
    context.deviceScaleFactor <= 0
  ) {
    errors.push(issue("device-scale", `${contextId} no declara DPR válido`));
  }
  if (
    !isNonEmptyString(context.locale) ||
    !isNonEmptyString(context.themeEvidence) ||
    !isNonEmptyString(context.browser) ||
    !["light", "dark"].includes(context.theme)
  ) {
    errors.push(
      issue("capture-context", `${contextId} no declara locale/evidencia de tema`),
    );
  }
  if (
    context.appCommit !== null &&
    (typeof context.appCommit !== "string" ||
      !COMMIT_PATTERN.test(context.appCommit))
  ) {
    errors.push(issue("app-commit", `${contextId}.appCommit no es válido`));
  }
  const capturedAt =
    context.capturedAt === null
      ? null
      : parseStrictIsoInstant(context.capturedAt);
  if (context.capturedAt !== null && capturedAt === null) {
    errors.push(issue("captured-at", `${contextId}.capturedAt no es válido`));
  } else if (capturedAt !== null && capturedAt > now.getTime()) {
    errors.push(issue("future-capture", `${contextId}.capturedAt está en el futuro`));
  }
  if (context.kind === "generated") {
    if (!context.appCommit || !context.capturedAt) {
      errors.push(
        issue(
          "generated-provenance",
          `${contextId} generado debe fijar appCommit y capturedAt`,
        ),
      );
    }
    if (
      typeof context.fixtureSha256 !== "string" ||
      !SHA256_PATTERN.test(context.fixtureSha256)
    ) {
      errors.push(
        issue("fixture-sha256", `${contextId}.fixtureSha256 no es válido`),
      );
    }
    if (
      typeof context.sourceTreeSha256 !== "string" ||
      !SHA256_PATTERN.test(context.sourceTreeSha256)
    ) {
      errors.push(
        issue("source-tree-hash", `${contextId}.sourceTreeSha256 no es válido`),
      );
    }
  } else if (
    context.fixtureSha256 !== null ||
    context.sourceTreeSha256 !== null ||
    context.appCommit !== null ||
    context.capturedAt !== null
  ) {
    errors.push(
      issue(
        "legacy-provenance",
        `${contextId} no debe inventar procedencia desconocida`,
      ),
    );
  }
}

function validateContract(
  contract: ManualScreenshotContract,
  manifest: ManualScreenshotManifest,
  now: Date,
  errors: ManualScreenshotVerificationIssue[],
  warnings: ManualScreenshotVerificationIssue[],
) {
  const { src } = contract;
  if (!SAFE_SCREENSHOT_PATH.test(src)) {
    errors.push(issue("unsafe-src", `Ruta de captura no permitida: ${src}`, src));
  }
  if (!resolveManualScreenshotRoute(contract.intended.route)) {
    errors.push(
      issue(
        "unmapped-route",
        `La ruta prevista no resuelve ayuda contextual: ${contract.intended.route}`,
        src,
      ),
    );
  }
  if (
    typeof contract.intended.stateId !== "string" ||
    !STATE_ID_PATTERN.test(contract.intended.stateId)
  ) {
    errors.push(issue("state-id", "stateId vacío o inestable", src));
  }
  if (
    typeof contract.intended.setupId !== "string" ||
    !STATE_ID_PATTERN.test(contract.intended.setupId)
  ) {
    errors.push(issue("setup-id", "setupId vacío o inestable", src));
  }
  const markers = contract.intended.expectedMarkers;
  if (
    !Array.isArray(markers) ||
    markers.length === 0 ||
    markers.some(
      (marker) => typeof marker !== "string" || !marker.trim(),
    ) ||
    new Set(markers).size !== markers.length
  ) {
    errors.push(issue("markers", "Debe declarar marcadores visibles únicos", src));
  }
  if (
    typeof contract.artifact.sha256 !== "string" ||
    !SHA256_PATTERN.test(contract.artifact.sha256)
  ) {
    errors.push(issue("artifact-hash", "SHA-256 de artefacto inválido", src));
  }
  if (
    !Number.isInteger(contract.artifact.width) ||
    !Number.isInteger(contract.artifact.height) ||
    contract.artifact.width <= 0 ||
    contract.artifact.height <= 0
  ) {
    errors.push(issue("artifact-size", "Dimensiones de artefacto inválidas", src));
  }
  const context = manifest.contexts[contract.provenance.contextId];
  if (!context) {
    errors.push(issue("missing-context", "Contexto de captura inexistente", src));
    return;
  }
  if (
    !isNonEmptyString(contract.review.tracking) ||
    !isNonEmptyString(contract.review.reason)
  ) {
    errors.push(issue("review-tracking", "La revisión no tiene seguimiento/motivo", src));
  }

  if (contract.review.status === "reviewed") {
    for (const problem of collectManualScreenshotApprovalProblems(
      contract,
      context,
      manifest.policy.maxReviewAgeDays,
      now,
    )) {
      errors.push(issue(problem.code, problem.message, src));
    }
  } else if (
    contract.review.status === "pending-review" ||
    contract.review.status === "known-defect"
  ) {
    warnings.push(
      issue(
        contract.review.status,
        `${contract.review.tracking}: ${contract.review.reason}`,
        src,
      ),
    );
  } else {
    errors.push(issue("review-status", "Estado de revisión desconocido", src));
  }

  if (!(["referenced", "orphan"] as unknown[]).includes(contract.usage)) {
    errors.push(issue("usage", "Uso de captura desconocido", src));
  }

  if (contract.usage === "orphan" && contract.review.status === "reviewed") {
    errors.push(
      issue("reviewed-orphan", "Un PNG huérfano no cuenta como revisado", src),
    );
  }
}

export function verifyManualScreenshotContracts({
  manifest,
  referencedSources,
  usageCount,
  artifacts,
  now = new Date(),
}: VerifyManualScreenshotContractsInput): ManualScreenshotVerificationReport {
  const errors: ManualScreenshotVerificationIssue[] = [];
  const warnings: ManualScreenshotVerificationIssue[] = [];

  if (manifest.schemaVersion !== 1) {
    errors.push(issue("schema-version", "Versión de manifiesto no soportada"));
  }
  if (
    typeof manifest.policy.maxReviewAgeDays !== "number" ||
    !Number.isInteger(manifest.policy.maxReviewAgeDays) ||
    manifest.policy.maxReviewAgeDays <= 0
  ) {
    errors.push(issue("review-policy", "maxReviewAgeDays debe ser positivo"));
  }
  if (
    !isNonEmptyString(manifest.policy.recaptureTracking) ||
    !isNonEmptyString(manifest.policy.visualMatrixTracking)
  ) {
    errors.push(issue("policy-tracking", "La deuda P2-03/P2-04 no está trazada"));
  }

  for (const [contextId, context] of Object.entries(manifest.contexts)) {
    validateContext(contextId, context, now, errors);
  }

  const contractsBySrc = new Map<string, ManualScreenshotContract>();
  for (const contract of manifest.captures) {
    if (contractsBySrc.has(contract.src)) {
      errors.push(issue("duplicate-contract", "Contrato duplicado", contract.src));
      continue;
    }
    contractsBySrc.set(contract.src, contract);
    validateContract(contract, manifest, now, errors, warnings);
  }

  const uniqueReferences = new Set(referencedSources);
  for (const src of uniqueReferences) {
    const contract = contractsBySrc.get(src);
    if (!contract) {
      errors.push(issue("missing-contract", "Captura referenciada sin contrato", src));
    } else if (contract.usage !== "referenced") {
      errors.push(issue("orphan-referenced", "Captura marcada huérfana pero usada", src));
    }
  }
  for (const contract of manifest.captures) {
    const isReferenced = uniqueReferences.has(contract.src);
    if (contract.usage === "referenced" && !isReferenced) {
      errors.push(issue("stale-reference", "Contrato marcado usado pero huérfano", contract.src));
    }
    if (contract.usage === "orphan" && isReferenced) {
      errors.push(issue("unexpected-reference", "PNG huérfano volvió a usarse", contract.src));
    }
  }

  const artifactsBySrc = new Map<string, ManualScreenshotArtifact>();
  for (const artifact of artifacts) {
    if (artifact.src.endsWith("-fallback.png")) {
      errors.push(issue("fallback-artifact", "Fallback visual detectado", artifact.src));
    }
    if (artifactsBySrc.has(artifact.src)) {
      errors.push(issue("duplicate-artifact", "Artefacto duplicado", artifact.src));
      continue;
    }
    artifactsBySrc.set(artifact.src, artifact);
    const contract = contractsBySrc.get(artifact.src);
    if (!contract) {
      errors.push(issue("untracked-artifact", "PNG sin contrato", artifact.src));
      continue;
    }
    if (!artifact.validPng) {
      errors.push(
        issue("invalid-png", "PNG no decodificable o con CRC inválido", artifact.src),
      );
    }
    if (artifact.sha256 !== contract.artifact.sha256) {
      errors.push(issue("hash-mismatch", "El PNG cambió sin nueva revisión", artifact.src));
    }
    if (
      artifact.width !== contract.artifact.width ||
      artifact.height !== contract.artifact.height
    ) {
      errors.push(
        issue("dimension-mismatch", "Las dimensiones no coinciden con el contrato", artifact.src),
      );
    }
  }
  for (const contract of manifest.captures) {
    if (!artifactsBySrc.has(contract.src)) {
      errors.push(issue("missing-artifact", "Falta el PNG declarado", contract.src));
    }
  }

  const referencedContracts = manifest.captures.filter(
    (contract) => contract.usage === "referenced",
  );
  const reviewed = referencedContracts.filter(
    (contract) =>
      collectManualScreenshotApprovalProblems(
        contract,
        manifest.contexts[contract.provenance.contextId],
        manifest.policy.maxReviewAgeDays,
        now,
      ).length === 0,
  ).length;
  const pendingReview = manifest.captures.filter(
    (contract) => contract.review.status === "pending-review",
  ).length;
  const knownDefects = manifest.captures.filter(
    (contract) => contract.review.status === "known-defect",
  ).length;

  return {
    errors,
    warnings,
    stats: {
      usages: usageCount,
      referenced: uniqueReferences.size,
      artifacts: artifacts.length,
      orphaned: manifest.captures.filter((contract) => contract.usage === "orphan")
        .length,
      reviewed,
      pendingReview,
      knownDefects,
    },
    completeVisualCoverage:
      errors.length === 0 &&
      reviewed === referencedContracts.length &&
      knownDefects === 0 &&
      pendingReview === 0,
  };
}

export function readManualScreenshotArtifact(
  root: string,
  src: string,
): ManualScreenshotArtifact {
  const filePath = join(root, "public", manualScreenshotPublicPath(src));
  const bytes = readFileSync(filePath);
  let width = 0;
  let height = 0;
  let validPng = false;
  try {
    const decoded = PNG.sync.read(bytes, { checkCRC: true });
    width = decoded.width;
    height = decoded.height;
    validPng = width > 0 && height > 0 && decoded.data.length > 0;
  } catch {
    // Fail-closed: firma/cabecera no bastan; debe decodificar con CRC válido.
  }
  return {
    src,
    sha256: createHash("sha256").update(bytes).digest("hex"),
    width,
    height,
    validPng,
  };
}

export function collectManualScreenshotArtifactSources(
  capturesDir: string,
  prefix = "",
): string[] {
  const sources: string[] = [];
  for (const entry of readdirSync(capturesDir, { withFileTypes: true })) {
    const relativeName = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      sources.push(
        ...collectManualScreenshotArtifactSources(
          join(capturesDir, entry.name),
          relativeName,
        ),
      );
    } else if (/\.png$/i.test(entry.name)) {
      sources.push(`/ayuda/capturas/${relativeName}`);
    }
  }
  return sources.sort();
}

function gitBytes(root: string, args: string[]): Buffer | null {
  try {
    return execFileSync("git", ["-C", root, ...args], {
      encoding: "buffer",
      maxBuffer: 50 * 1024 * 1024,
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch {
    return null;
  }
}

function gitText(root: string, args: string[]): string | null {
  const output = gitBytes(root, args);
  return output ? output.toString("utf8").trim() : null;
}

function gitIsAncestor(
  root: string,
  ancestor: string,
  descendant: string,
): boolean {
  return (
    gitBytes(root, [
      "merge-base",
      "--is-ancestor",
      ancestor,
      descendant,
    ]) !== null
  );
}

export function verifyRepositoryManualScreenshotProvenance(
  root: string,
  manifest = manualScreenshotManifest,
): ManualScreenshotVerificationIssue[] {
  const errors: ManualScreenshotVerificationIssue[] = [];

  for (const [contextId, context] of Object.entries(manifest.contexts)) {
    for (const [field, commit] of [
      ["assetCommit", context.assetCommit],
      ["scriptCommit", context.scriptCommit],
      ...(context.appCommit ? [["appCommit", context.appCommit]] : []),
    ] as Array<[string, string]>) {
      if (!gitBytes(root, ["cat-file", "-e", `${commit}^{commit}`])) {
        errors.push(
          issue(
            "git-commit-missing",
            `${contextId}.${field} no existe como commit en el repositorio`,
          ),
        );
      }
    }

    const committedAt = gitText(root, [
      "show",
      "-s",
      "--format=%cI",
      context.assetCommit,
    ]);
    if (committedAt !== context.assetCommittedAt) {
      errors.push(
        issue(
          "asset-commit-date",
          `${contextId}.assetCommittedAt no coincide con Git`,
        ),
      );
    }
    if (!gitIsAncestor(root, context.scriptCommit, context.assetCommit)) {
      errors.push(
        issue(
          "script-asset-ancestry",
          `${contextId}.scriptCommit no es ancestro de assetCommit`,
        ),
      );
    }
    if (!gitIsAncestor(root, context.assetCommit, "HEAD")) {
      errors.push(
        issue(
          "asset-head-ancestry",
          `${contextId}.assetCommit no pertenece a la historia actual`,
        ),
      );
    }

    if (
      !gitBytes(root, [
        "cat-file",
        "-e",
        `${context.scriptCommit}:${CAPTURE_SCRIPT_PATH}`,
      ])
    ) {
      errors.push(
        issue(
          "capture-script-missing",
          `${contextId} no conserva el generador declarado`,
        ),
      );
    }
    const fixtureBlob = gitText(root, [
      "rev-parse",
      `${context.scriptCommit}:${FIXTURE_PATH}`,
    ]);
    if (fixtureBlob !== context.fixtureGitBlob) {
      errors.push(
        issue(
          "fixture-blob-mismatch",
          `${contextId}.fixtureGitBlob no coincide con el fixture del commit`,
        ),
      );
    }
    const fixtureBytes = gitBytes(root, [
      "show",
      `${context.scriptCommit}:${FIXTURE_PATH}`,
    ]);
    if (context.kind === "generated" && fixtureBytes) {
      const fixtureSha256 = createHash("sha256")
        .update(fixtureBytes)
        .digest("hex");
      if (fixtureSha256 !== context.fixtureSha256) {
        errors.push(
          issue(
            "fixture-content-mismatch",
            `${contextId}.fixtureSha256 no coincide con los bytes de Git`,
          ),
        );
      }
    }
    if (context.kind === "generated" && context.appCommit) {
      if (!gitIsAncestor(root, context.appCommit, context.assetCommit)) {
        errors.push(
          issue(
            "app-asset-ancestry",
            `${contextId}.appCommit no es ancestro de assetCommit`,
          ),
        );
      }
      const appCommittedAt = parseStrictIsoInstant(
        gitText(root, ["show", "-s", "--format=%cI", context.appCommit]),
      );
      const scriptCommittedAt = parseStrictIsoInstant(
        gitText(root, ["show", "-s", "--format=%cI", context.scriptCommit]),
      );
      const capturedAt = parseStrictIsoInstant(context.capturedAt);
      const assetCommittedAt = parseStrictIsoInstant(committedAt);
      if (
        appCommittedAt === null ||
        capturedAt === null ||
        isAfterGitTimestamp(appCommittedAt, capturedAt)
      ) {
        errors.push(
          issue(
            "app-capture-order",
            `${contextId} afirma capturar antes de que existiera appCommit`,
          ),
        );
      }
      if (
        scriptCommittedAt === null ||
        capturedAt === null ||
        isAfterGitTimestamp(scriptCommittedAt, capturedAt)
      ) {
        errors.push(
          issue(
            "script-capture-order",
            `${contextId} afirma capturar antes de que existiera scriptCommit`,
          ),
        );
      }
      if (
        capturedAt === null ||
        assetCommittedAt === null ||
        isAfterGitTimestamp(capturedAt, assetCommittedAt)
      ) {
        errors.push(
          issue(
            "capture-asset-order",
            `${contextId} declara assetCommit anterior a la captura`,
          ),
        );
      }
      const sourceTree = gitBytes(root, [
        "ls-tree",
        "-r",
        "--full-tree",
        context.appCommit,
      ]);
      const sourceTreeSha256 = sourceTree
        ? createHash("sha256").update(sourceTree).digest("hex")
        : null;
      if (sourceTreeSha256 !== context.sourceTreeSha256) {
        errors.push(
          issue(
            "source-tree-mismatch",
            `${contextId}.sourceTreeSha256 no coincide con el árbol Git`,
          ),
        );
      }
    }
  }

  for (const contract of manifest.captures) {
    const context = manifest.contexts[contract.provenance.contextId];
    if (!context) continue;
    const committedAsset = gitBytes(root, [
      "show",
      `${context.assetCommit}:public${contract.src}`,
    ]);
    if (!committedAsset) {
      errors.push(
        issue(
          "asset-not-in-commit",
          "El PNG no existe en el assetCommit declarado",
          contract.src,
        ),
      );
      continue;
    }
    const committedSha256 = createHash("sha256")
      .update(committedAsset)
      .digest("hex");
    if (committedSha256 !== contract.artifact.sha256) {
      errors.push(
        issue(
          "asset-commit-mismatch",
          "El PNG no coincide con los bytes del assetCommit declarado",
          contract.src,
        ),
      );
    }
  }
  return errors;
}

export function verifyRepositoryManualScreenshots(
  root = process.cwd(),
  now = new Date(),
): ManualScreenshotVerificationReport {
  const capturesDir = join(root, "public", "ayuda", "capturas");
  const artifactSources = collectManualScreenshotArtifactSources(capturesDir);
  const artifacts = artifactSources.map((src) =>
    readManualScreenshotArtifact(root, src),
  );
  const usages = collectManualScreenshotUsages();
  const report = verifyManualScreenshotContracts({
    manifest: manualScreenshotManifest,
    referencedSources: collectManualScreenshots().map((shot) => shot.src),
    usageCount: usages.length,
    artifacts,
    now,
  });
  report.errors.push(
    ...verifyRepositoryManualScreenshotProvenance(root, manualScreenshotManifest),
  );
  if (report.errors.length > 0) report.completeVisualCoverage = false;
  return report;
}

export function formatManualScreenshotReport(
  report: ManualScreenshotVerificationReport,
): string {
  const { stats } = report;
  return [
    `Capturas: ${stats.artifacts} PNG; ${stats.referenced} referenciados; ${stats.orphaned} huérfanos declarados.`,
    `Usos en el manual: ${stats.usages}. Cobertura visual aprobada: ${stats.reviewed}/${stats.referenced}.`,
    `Deuda explícita: ${stats.pendingReview} pendientes; ${stats.knownDefects} defectuosas (AUD-P2-03/AUD-P2-04).`,
    `Contrato: ${report.errors.length === 0 ? "válido" : `${report.errors.length} errores`}.`,
  ].join("\n");
}
