import { pathToFileURL } from "node:url";

import { loadFiscalWatchCatalog, runFiscalWatch } from "./core.mjs";
import {
  createGithubIssuesClient,
  inspectExistingFiscalWatchIssues,
  publishFiscalWatchIssues,
} from "./github-issues.mjs";

function publicSummary(run, publication = null) {
  return {
    schemaVersion: "fiscal-watch-cli-summary.v1",
    status: run.status,
    parserContractVersion: run.parserContractVersion,
    checkedAt: run.checkedAt,
    sourceCount: run.sourceCount,
    degradedCount: run.degradedCount,
    changeCount: run.changeCount,
    publication,
    sources: run.results.map((result) => ({
      sourceId: result.sourceId,
      status: result.status,
      itemCount: result.itemCount,
      changeCount: result.changes.length,
      ...(result.failureCode ? { failureCode: result.failureCode } : {}),
    })),
  };
}

export async function main({ env = process.env, fetchImpl = fetch, now = () => new Date() } = {}) {
  const catalog = await loadFiscalWatchCatalog();
  const dryRun = env.FISCAL_WATCH_DRY_RUN === "true";
  let context = {
    previousStates: new Map(),
    baselineAcceptedSourceIds: new Set(),
    openReviewSourceIds: new Set(),
    sourceIssues: new Map(),
    changeFingerprints: new Set(),
    baselineIssue: null,
  };
  let client = null;
  if (!dryRun) {
    client = createGithubIssuesClient({
      token: env.GITHUB_TOKEN,
      repository: env.GITHUB_REPOSITORY,
      fetchImpl,
    });
    context = inspectExistingFiscalWatchIssues(await client.listIssues(), catalog);
  }
  const run = await runFiscalWatch({
    catalog,
    previousStates: context.previousStates,
    baselineAcceptedSourceIds: context.baselineAcceptedSourceIds,
    openReviewSourceIds: context.openReviewSourceIds,
    fetchImpl,
    now,
  });
  const publication = dryRun
    ? { mode: "DRY_RUN", writes: 0 }
    : { mode: "GITHUB_ISSUES", ...(await publishFiscalWatchIssues(client, run, context)) };
  process.stdout.write(`${JSON.stringify(publicSummary(run, publication))}\n`);
  return run.degradedCount === 0 ? 0 : 1;
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  main()
    .then((exitCode) => {
      process.exitCode = exitCode;
    })
    .catch((error) => {
      process.stderr.write(
        `${JSON.stringify({
          schemaVersion: "fiscal-watch-cli-error.v1",
          status: "DEGRADED",
          code: typeof error?.code === "string" ? error.code : "UNEXPECTED_FAILURE",
        })}\n`,
      );
      process.exitCode = 1;
    });
}
