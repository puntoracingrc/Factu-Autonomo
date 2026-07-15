#!/usr/bin/env node

import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, relative, resolve } from "node:path";

import {
  diffRegistries,
  normalizedContentHash,
  registryHash,
  sha256,
  snapshotChangeMetadata,
  validateState,
} from "./cli-core.mjs";
import {
  ROOT,
  readCurrentOfficialSources,
  readCurrentRuleInventory,
  sourceRuleAssociations,
} from "./registry-source.mjs";

const DEFAULT_DIRECTORY = join(ROOT, "docs/fiscal/sources");
const DEFAULT_REGISTRY = join(
  DEFAULT_DIRECTORY,
  "source-snapshot-registry.v2.json",
);
const DEFAULT_REVIEWS = join(DEFAULT_DIRECTORY, "review-decisions.v2.json");

function option(name, fallback = null) {
  const index = process.argv.indexOf(name);
  return index === -1 ? fallback : process.argv[index + 1];
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function writeJson(path, value) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

function officialLocator(authority, locator) {
  const hostname = new URL(locator).hostname.toLowerCase();
  if (authority === "BOE") {
    return hostname === "boe.es" || hostname === "www.boe.es";
  }
  if (authority === "AEAT") return hostname.endsWith("agenciatributaria.gob.es");
  if (authority === "SEGURIDAD_SOCIAL") return hostname.endsWith("seg-social.es");
  if (authority === "EU") return hostname.endsWith("europa.eu");
  return false;
}

async function fetchOfficialSnapshot(source) {
  let locator = source.officialLocator;
  for (let redirect = 0; redirect <= 5; redirect += 1) {
    if (!officialLocator(source.authority, locator)) {
      throw new Error(`${source.sourceId}:NON_OFFICIAL_REDIRECT:${locator}`);
    }
    const response = await fetch(locator, {
      redirect: "manual",
      headers: {
        Accept: "text/html,application/xhtml+xml,application/pdf;q=0.9,*/*;q=0.8",
        "User-Agent": "FactuFiscalSourceSnapshot/1.0 (+technical-audit)",
      },
      signal: AbortSignal.timeout(45_000),
    });
    if (response.status >= 300 && response.status < 400) {
      const next = response.headers.get("location");
      if (!next) throw new Error(`${source.sourceId}:REDIRECT_WITHOUT_LOCATION`);
      locator = new URL(next, locator).toString();
      continue;
    }
    if (!response.ok) {
      throw new Error(`${source.sourceId}:HTTP_${response.status}`);
    }
    return {
      bytes: Buffer.from(await response.arrayBuffer()),
      contentType: response.headers.get("content-type") ?? "application/octet-stream",
      finalOfficialLocator: locator,
    };
  }
  throw new Error(`${source.sourceId}:TOO_MANY_REDIRECTS`);
}

function materialSnapshot(source, captured) {
  const fragment = new URL(source.officialLocator).hash.slice(1);
  if (!fragment || !captured.contentType.toLowerCase().includes("html")) {
    return { bytes: captured.bytes, captureScope: "FULL_DOCUMENT" };
  }
  const html = captured.bytes.toString("utf8");
  const markers = [`id="${fragment}"`, `id='${fragment}'`];
  const markerIndex = markers
    .map((marker) => html.indexOf(marker))
    .find((index) => index >= 0);
  if (markerIndex === undefined) {
    throw new Error(`${source.sourceId}:LOCATOR_FRAGMENT_NOT_FOUND:${fragment}`);
  }
  const start = html.lastIndexOf("<div", markerIndex);
  const endCandidates = [
    html.indexOf('<p class="linkSubir"', markerIndex),
    html.indexOf("<hr class=\"bloque\"", markerIndex),
  ].filter((index) => index > markerIndex);
  const end = Math.min(...endCandidates);
  if (start < 0 || !Number.isFinite(end)) {
    throw new Error(`${source.sourceId}:LOCATOR_FRAGMENT_BOUNDARY_MISSING:${fragment}`);
  }
  return {
    bytes: Buffer.from(html.slice(start, end), "utf8"),
    captureScope: "LOCATOR_FRAGMENT",
  };
}

async function runPool(items, concurrency, worker) {
  const results = new Array(items.length);
  let next = 0;
  async function run() {
    while (next < items.length) {
      const index = next;
      next += 1;
      results[index] = await worker(items[index], index);
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, () => run()),
  );
  return results;
}

async function snapshot() {
  const retrievedAt = option("--retrieved-at", new Date().toISOString().slice(0, 10));
  const outputDirectory = resolve(option("--output", DEFAULT_DIRECTORY));
  const registryPath = join(outputDirectory, "source-snapshot-registry.v2.json");
  if (existsSync(registryPath) && !process.argv.includes("--force")) {
    throw new Error(`REGISTRY_EXISTS:${registryPath}:use --force or --output`);
  }
  const previousRegistry =
    existsSync(registryPath) && !process.argv.includes("--reset-history")
      ? readJson(registryPath)
      : null;
  const previousById = new Map(
    (previousRegistry?.sources ?? []).map((source) => [source.sourceId, source]),
  );
  const sources = readCurrentOfficialSources();
  const inventory = readCurrentRuleInventory();
  const associations = sourceRuleAssociations(inventory);
  const records = await runPool(sources, 4, async (source) => {
    process.stdout.write(`Capturing ${source.sourceId}...\n`);
    const captured = await fetchOfficialSnapshot(source);
    const selected = materialSnapshot(source, captured);
    const extension = captured.contentType.includes("pdf") ? "pdf" : "html";
    const absoluteSnapshotPath = join(
      outputDirectory,
      "snapshots",
      retrievedAt,
      `${source.sourceId}.${extension}`,
    );
    mkdirSync(dirname(absoluteSnapshotPath), { recursive: true });
    writeFileSync(absoluteSnapshotPath, selected.bytes);
    const contentHash = sha256(selected.bytes);
    const currentNormalizedContentHash = normalizedContentHash(
      selected.bytes,
      captured.contentType,
    );
    const previous = previousById.get(source.sourceId);
    const currentForDiff = {
      sourceId: source.sourceId,
      authority: source.authority,
      title: source.title,
      officialLocator: source.officialLocator,
      finalOfficialLocator: captured.finalOfficialLocator,
      retrievedAt,
      declaredOfficialUpdatedAt: source.declaredOfficialUpdatedAt,
      materialValidity: {
        status: "UNVERIFIED",
        effectiveFrom: null,
        effectiveTo: null,
        basis: "PENDING_FISCAL_REVIEW",
      },
      contentHash,
      normalizedContentHash: currentNormalizedContentHash,
      contentLength: selected.bytes.byteLength,
      contentType: captured.contentType,
      captureScope: selected.captureScope,
      snapshotPath: relative(ROOT, absoluteSnapshotPath).split("\\").join("/"),
      materialScope: source.materialScope,
      affectedRuleIds: associations.get(source.sourceId) ?? [],
      verificationStatus: "PENDING_FISCAL_REVIEW",
      technicalHashStatus: "VALID",
    };
    return {
      ...currentForDiff,
      ...snapshotChangeMetadata(previous, currentForDiff),
    };
  });
  const unsigned = {
    contractVersion: "fiscal-source-registry.v2",
    generatedAt: retrievedAt,
    sourceCount: records.length,
    sources: records,
  };
  const registry = { ...unsigned, registryHash: registryHash(unsigned) };
  writeJson(registryPath, registry);
  process.stdout.write(
    `Captured ${records.length} official sources at ${registry.registryHash}\n`,
  );
}

function validate() {
  const registryPath = resolve(option("--registry", DEFAULT_REGISTRY));
  const reviewsPath = resolve(option("--reviews", DEFAULT_REVIEWS));
  const currentSources = readCurrentOfficialSources();
  const inventory = readCurrentRuleInventory();
  const errors = validateState({
    root: ROOT,
    registry: readJson(registryPath),
    reviews: readJson(reviewsPath),
    currentSources,
    inventory,
    associations: sourceRuleAssociations(inventory),
  });
  const summary = {
    contractVersion: "fiscal-source-validation.v2",
    status: errors.length === 0 ? "PASS" : "FAIL",
    sourceCount: currentSources.length,
    ruleCount: inventory.rules.length,
    pendingFiscalReviewRules: inventory.rules.filter(
      (rule) => rule.reviewStatus === "PENDING_FISCAL_REVIEW",
    ).length,
    openRules: inventory.rules.filter(
      (rule) => rule.resolutionStatus === "OPEN",
    ).length,
    approvedRules: inventory.rules.filter(
      (rule) => rule.reviewStatus === "APPROVED",
    ).length,
    resolvedRules: inventory.rules.filter(
      (rule) => rule.resolutionStatus === "RESOLVED",
    ).length,
    authorizedExclusions: inventory.rules.filter(
      (rule) => rule.exclusionAuthorized,
    ).length,
    reviewDecisions: readJson(reviewsPath).decisions.length,
    errors,
  };
  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
  if (errors.length > 0) process.exitCode = 1;
}

function diff() {
  const baselinePath = resolve(option("--baseline", DEFAULT_REGISTRY));
  const candidatePath = resolve(option("--candidate", DEFAULT_REGISTRY));
  const reviewsPath = resolve(option("--reviews", DEFAULT_REVIEWS));
  const report = diffRegistries(
    readJson(baselinePath),
    readJson(candidatePath),
    readJson(reviewsPath),
  );
  const output = option("--report");
  if (output) writeJson(resolve(output), report);
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  if (
    process.argv.includes("--fail-on-change") &&
    report.status === "CHANGED_REQUIRES_FISCAL_REVIEW"
  ) {
    process.exitCode = 2;
  }
}

const command = process.argv[2];
if (command === "snapshot") await snapshot();
else if (command === "validate") validate();
else if (command === "diff") diff();
else {
  throw new Error("Usage: run.mjs <snapshot|diff|validate>");
}
