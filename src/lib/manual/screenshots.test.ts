import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  mkdtempSync,
  mkdirSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  collectManualScreenshotApprovalProblems,
  isAfterGitTimestamp,
  isManualScreenshotApproved,
  manualScreenshotManifest,
  parseStrictIsoInstant,
  type ManualScreenshotManifest,
} from "./screenshot-contracts";
import {
  collectManualScreenshotArtifactSources,
  formatManualScreenshotReport,
  MANUAL_SCREENSHOT_ROUTE_TEMPLATES,
  readManualScreenshotArtifact,
  resolveManualScreenshotRoute,
  verifyManualScreenshotContracts,
  verifyRepositoryManualScreenshotProvenance,
  verifyRepositoryManualScreenshots,
  type ManualScreenshotArtifact,
} from "./screenshot-verifier";
import {
  collectManualScreenshotUsages,
  collectManualScreenshots,
} from "./screenshots";
import { resolveManualSlug } from "./route-help";

const REVIEW_DATE = new Date("2026-07-12T00:00:00Z");
const GIT_VERIFICATION_TIMEOUT_MS = 20_000;

function cloneManifest(): ManualScreenshotManifest {
  return structuredClone(manualScreenshotManifest);
}

function repositoryArtifacts(
  manifest = manualScreenshotManifest,
): ManualScreenshotArtifact[] {
  return manifest.captures.map((contract) =>
    readManualScreenshotArtifact(process.cwd(), contract.src),
  );
}

function verify(
  manifest: ManualScreenshotManifest,
  artifacts = repositoryArtifacts(manifest),
  referencedSources = collectManualScreenshots().map((shot) => shot.src),
) {
  return verifyManualScreenshotContracts({
    manifest,
    referencedSources,
    usageCount: collectManualScreenshotUsages().length,
    artifacts,
    now: REVIEW_DATE,
  });
}

function errorCodes(report: ReturnType<typeof verify>): string[] {
  return report.errors.map((entry) => entry.code);
}

function collectAppPageRouteTemplates(
  directory: string,
  segments: string[] = [],
): string[] {
  const entries = readdirSync(directory, { withFileTypes: true });
  const routes = entries.some(
    (entry) => entry.isFile() && entry.name === "page.tsx",
  )
    ? [`/${segments.filter((segment) => !/^\(.+\)$/.test(segment)).join("/")}`]
    : [];
  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name.startsWith("@")) continue;
    routes.push(
      ...collectAppPageRouteTemplates(join(directory, entry.name), [
        ...segments,
        entry.name,
      ]),
    );
  }
  return routes.map((route) => route || "/").sort();
}

describe("manual screenshots", () => {
  it(
    "atestigua bytes y expone la deuda visual sin dar cobertura falsa",
    () => {
      const report = verifyRepositoryManualScreenshots(process.cwd());

      expect(report.errors).toEqual([]);
      expect(report.stats).toEqual({
        usages: 31,
        referenced: 30,
        artifacts: 32,
        orphaned: 2,
        reviewed: 0,
        pendingReview: 12,
        knownDefects: 20,
      });
      expect(report.completeVisualCoverage).toBe(false);
      expect(report.warnings).toHaveLength(32);
      console.info(`\n${formatManualScreenshotReport(report)}\n`);
    },
    GIT_VERIFICATION_TIMEOUT_MS,
  );

  it("no publica ningún PNG legacy hasta ligarlo a revisión y procedencia", () => {
    for (const contract of manualScreenshotManifest.captures) {
      expect(isManualScreenshotApproved(contract.src)).toBe(false);
    }

    const obsolete = manualScreenshotManifest.captures.filter(
      (contract) => contract.review.status === "known-defect",
    );
    expect(obsolete.map((contract) => contract.src)).toEqual(
      expect.arrayContaining([
        "/ayuda/capturas/ajustes-datos-negocio.png",
        "/ayuda/capturas/facturas-nueva.png",
        "/ayuda/capturas/cuenta-nube.png",
        "/ayuda/capturas/gastos-fijos.png",
        "/ayuda/capturas/facturas-enviar.png",
        "/ayuda/capturas/inicio-accesos-rapidos.png",
      ]),
    );
    expect(JSON.stringify(obsolete)).toContain("VeriFactu fail-closed");
    expect(JSON.stringify(obsolete)).toContain("6 caracteres");
    expect(JSON.stringify(obsolete)).toContain("Runtime TypeError");
  });

  it("declara los dos PNG huérfanos sin contarlos como cobertura", () => {
    const orphaned = manualScreenshotManifest.captures.filter(
      (contract) => contract.usage === "orphan",
    );
    expect(orphaned.map((contract) => contract.src).sort()).toEqual([
      "/ayuda/capturas/impuestos-trimestre.png",
      "/ayuda/capturas/navegacion-inferior.png",
    ]);
    expect(orphaned.every((contract) => contract.review.status !== "reviewed"))
      .toBe(true);
  });

  it("falla ante hash, dimensiones, PNG o fallback distintos", () => {
    const manifest = cloneManifest();
    const artifacts = repositoryArtifacts(manifest);
    artifacts[0] = {
      ...artifacts[0],
      sha256: "0".repeat(64),
      width: artifacts[0]!.width + 1,
      validPng: false,
    };
    artifacts.push({
      src: "/ayuda/capturas/prueba-fallback.png",
      sha256: "1".repeat(64),
      width: 720,
      height: 1280,
      validPng: true,
    });

    const codes = errorCodes(verify(manifest, artifacts));
    expect(codes).toEqual(
      expect.arrayContaining([
        "hash-mismatch",
        "dimension-mismatch",
        "invalid-png",
        "fallback-artifact",
        "untracked-artifact",
      ]),
    );
  });

  it("rechaza un PNG truncado aunque tenga firma e IHDR plausibles", () => {
    const root = mkdtempSync(join(tmpdir(), "manual-png-"));
    const directory = join(root, "public", "ayuda", "capturas");
    mkdirSync(directory, { recursive: true });
    const truncated = Buffer.from(
      "89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c489",
      "hex",
    );
    writeFileSync(join(directory, "truncado.png"), truncated);
    writeFileSync(join(directory, "legacy.PNG"), truncated);
    mkdirSync(join(directory, "sub"));
    writeFileSync(join(directory, "sub", "oculta.png"), truncated);
    try {
      expect(
        readManualScreenshotArtifact(
          root,
          "/ayuda/capturas/truncado.png",
        ).validPng,
      ).toBe(false);
      expect(collectManualScreenshotArtifactSources(directory)).toEqual([
        "/ayuda/capturas/legacy.PNG",
        "/ayuda/capturas/sub/oculta.png",
        "/ayuda/capturas/truncado.png",
      ]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("cubre exactamente las plantillas Next que tienen ayuda contextual", () => {
    const mappedAppTemplates = collectAppPageRouteTemplates(
      join(process.cwd(), "src", "app"),
    ).filter((template) => {
      const sample = template.replace(/\[[^/]+\]/g, "id-de-prueba");
      return resolveManualSlug(sample) !== null;
    });

    expect([...MANUAL_SCREENSHOT_ROUTE_TEMPLATES].sort()).toEqual(
      mappedAppTemplates,
    );
    for (const template of mappedAppTemplates) {
      const sample = template.replace(/\[[^/]+\]/g, "id-de-prueba");
      expect(resolveManualScreenshotRoute(sample)).not.toBeNull();
    }
  });

  it("falla ante contrato ausente, duplicado o ruta/estado sin anclas", () => {
    const manifest = cloneManifest();
    const original = manifest.captures[0]!;
    manifest.captures.push(structuredClone(original));
    original.intended.route = "/facturas-maliciosa";
    original.intended.stateId = "Estado inestable";
    original.intended.expectedMarkers = [];
    manifest.captures[1]!.intended.route = "/facturas/%2e%2e/gastos";
    manifest.captures[2]!.intended.route =
      "/facturas/no-existe/cualquier/cosa";
    manifest.captures[3]!.intended.route = "/facturas//nuevo";
    const referenced = [
      ...collectManualScreenshots().map((shot) => shot.src),
      "/ayuda/capturas/sin-contrato.png",
    ];

    const report = verify(manifest, repositoryArtifacts(), referenced);
    const codes = errorCodes(report);
    expect(codes).toEqual(
      expect.arrayContaining([
        "duplicate-contract",
        "unmapped-route",
        "state-id",
        "markers",
        "missing-contract",
      ]),
    );
    expect(
      report.errors
        .filter((entry) => entry.code === "unmapped-route")
        .map((entry) => entry.src),
    ).toEqual(
      expect.arrayContaining([
        original.src,
        manifest.captures[1]!.src,
        manifest.captures[2]!.src,
        manifest.captures[3]!.src,
      ]),
    );
  });

  it("falla cerrado ante un usage fuera del enum", () => {
    const manifest = cloneManifest();
    const orphan = manifest.captures.find(
      (contract) => contract.usage === "orphan",
    )!;
    orphan.usage = "ignorado" as "orphan";

    const report = verify(manifest);
    expect(errorCodes(report)).toContain("usage");
    expect(report.completeVisualCoverage).toBe(false);
  });

  it("no acepta coerciones de tipos que incumplen el esquema runtime", () => {
    const manifest = cloneManifest();
    const contract = manifest.captures[0]!;
    const context = manifest.contexts[contract.provenance.contextId]!;
    contract.intended.stateId = 123 as unknown as string;
    contract.intended.setupId = true as unknown as string;
    context.deviceScaleFactor = "2" as unknown as number;
    manifest.policy.maxReviewAgeDays = "90" as unknown as number;

    const codes = errorCodes(verify(manifest));
    expect(codes).toEqual(
      expect.arrayContaining([
        "state-id",
        "setup-id",
        "device-scale",
        "review-policy",
      ]),
    );
  });

  it("rechaza una revisión caducada aunque esté ligada a hash y commit", () => {
    const manifest = cloneManifest();
    const contract = manifest.captures[0]!;
    const context = manifest.contexts[contract.provenance.contextId]!;
    const appCommit = "a".repeat(40);
    context.kind = "generated";
    context.appCommit = appCommit;
    context.fixtureSha256 = "b".repeat(64);
    context.sourceTreeSha256 = "c".repeat(64);
    context.capturedAt = "2026-01-01T10:00:00Z";
    contract.review = {
      status: "reviewed",
      tracking: "AUD-P2-02",
      reason: "Revisión sintética de regresión",
      reviewedAt: "2026-01-02T10:00:00Z",
      validUntil: "2026-02-01T23:59:59Z",
      reviewedArtifactSha256: contract.artifact.sha256,
      reviewedAgainstAppCommit: appCommit,
    };

    expect(errorCodes(verify(manifest))).toContain("stale-review");
  });

  it("aplica una única regla estricta a fechas, vigencia y ligaduras", () => {
    const manifest = cloneManifest();
    const contract = manifest.captures[0]!;
    const context = manifest.contexts[contract.provenance.contextId]!;
    const appCommit = "a".repeat(40);
    context.kind = "generated";
    context.appCommit = appCommit;
    context.fixtureSha256 = "b".repeat(64);
    context.sourceTreeSha256 = "c".repeat(64);
    context.capturedAt = "2026-06-10T10:00:00Z";
    contract.review = {
      status: "reviewed",
      tracking: "AUD-P2-02",
      reason: "Revisión sintética de regresión",
      reviewedAt: "2026-06-12T10:00:00Z",
      validUntil: "2026-08-01T10:00:00Z",
      reviewedArtifactSha256: contract.artifact.sha256,
      reviewedAgainstAppCommit: appCommit,
    };

    expect(
      collectManualScreenshotApprovalProblems(
        contract,
        context,
        manifest.policy.maxReviewAgeDays,
        REVIEW_DATE,
      ),
    ).toEqual([]);
    expect(parseStrictIsoInstant("2026-02-30T10:00:00Z")).toBeNull();

    context.capturedAt = "2026-06-11T04:16:40.900Z";
    expect(
      isAfterGitTimestamp(
        parseStrictIsoInstant(context.capturedAt)!,
        parseStrictIsoInstant(context.assetCommittedAt)!,
      ),
    ).toBe(false);
    expect(
      collectManualScreenshotApprovalProblems(
        contract,
        context,
        manifest.policy.maxReviewAgeDays,
        REVIEW_DATE,
      ).map((problem) => problem.code),
    ).not.toContain("capture-asset-order");
    context.capturedAt = "2026-06-10T10:00:00Z";

    contract.artifact.sha256 = "no-es-un-hash";
    contract.review.reviewedArtifactSha256 = "no-es-un-hash";
    expect(
      collectManualScreenshotApprovalProblems(
        contract,
        context,
        manifest.policy.maxReviewAgeDays,
        REVIEW_DATE,
      ).map((problem) => problem.code),
    ).toEqual(expect.arrayContaining(["artifact-hash", "reviewed-hash"]));

    contract.artifact.sha256 = manualScreenshotManifest.captures[0]!.artifact.sha256;
    contract.review.reviewedArtifactSha256 = contract.artifact.sha256;
    contract.review.reviewedAt = "2026-07-13T10:00:00Z";
    contract.review.validUntil = "2026-08-13T10:00:00Z";
    expect(
      collectManualScreenshotApprovalProblems(
        contract,
        context,
        manifest.policy.maxReviewAgeDays,
        REVIEW_DATE,
      ).map((problem) => problem.code),
    ).toContain("future-review");
  });

  it(
    "contrasta commits, fixture y bytes de cada PNG contra Git",
    () => {
      expect(
        verifyRepositoryManualScreenshotProvenance(
          process.cwd(),
          manualScreenshotManifest,
        ),
      ).toEqual([]);

      const manifest = cloneManifest();
      const contract = manifest.captures[0]!;
      contract.artifact.sha256 = "0".repeat(64);
      const context = manifest.contexts[contract.provenance.contextId]!;
      context.scriptCommit = "a".repeat(40);

      const codes = verifyRepositoryManualScreenshotProvenance(
        process.cwd(),
        manifest,
      ).map((entry) => entry.code);
      expect(codes).toEqual(
        expect.arrayContaining([
          "git-commit-missing",
          "fixture-blob-mismatch",
          "asset-commit-mismatch",
        ]),
      );

      const impossible = cloneManifest();
      const impossibleContract = impossible.captures[0]!;
      const impossibleContext =
        impossible.contexts[impossibleContract.provenance.contextId]!;
      const head = execFileSync("git", ["rev-parse", "HEAD"], {
        encoding: "utf8",
      }).trim();
      impossibleContext.kind = "generated";
      impossibleContext.appCommit = head;
      impossibleContext.capturedAt = "2026-06-10T10:00:00Z";
      impossibleContext.fixtureSha256 = createHash("sha256")
        .update(
          execFileSync("git", [
            "show",
            `${impossibleContext.scriptCommit}:scripts/manual-demo-data.json`,
          ]),
        )
        .digest("hex");
      impossibleContext.sourceTreeSha256 = createHash("sha256")
        .update(execFileSync("git", ["ls-tree", "-r", "--full-tree", head]))
        .digest("hex");

      const causalCodes = verifyRepositoryManualScreenshotProvenance(
        process.cwd(),
        impossible,
      ).map((entry) => entry.code);
      expect(causalCodes).toEqual(
        expect.arrayContaining(["app-asset-ancestry", "app-capture-order"]),
      );
    },
    GIT_VERIFICATION_TIMEOUT_MS,
  );
});
