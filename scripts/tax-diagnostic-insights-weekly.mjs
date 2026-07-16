#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  aggregateTaxDiagnosticInsights,
  renderTaxDiagnosticInsightsMarkdown,
} from "../src/lib/tax-diagnostic-insights/aggregate.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUTPUT_DIR = resolve(ROOT, "reports/tax-diagnostic");
const RETENTION_DAYS = Math.min(365, Math.max(1, Number(process.env.TAX_PRODUCT_EVENT_RETENTION_DAYS ?? 90)));

function argument(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : null;
}

function defaultPeriod(generatedAt) {
  const to = new Date(generatedAt);
  to.setUTCHours(0, 0, 0, 0);
  const from = new Date(to);
  from.setUTCDate(from.getUTCDate() - 7);
  return { from: from.toISOString(), to: to.toISOString() };
}

function supabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return url && key ? { url: url.replace(/\/$/, ""), key } : null;
}

async function supabaseRequest(config, path, init = {}) {
  const response = await fetch(`${config.url}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: config.key,
      Authorization: `Bearer ${config.key}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  if (!response.ok) {
    throw new Error(`SUPABASE_REQUEST_${response.status}`);
  }
  if (response.status === 204) return null;
  return response.json();
}

async function fetchEvents(config, period) {
  const events = [];
  const pageSize = 1_000;
  for (let offset = 0; ; offset += pageSize) {
    const query = new URLSearchParams({
      select: "occurred_at,session_id,event_type,page,device_category,question_id,question_group,risk_tag,model_number,recommendation_status,document_family,extraction_method,confidence_bucket,fiscal_year,engine_version,ruleset_version,layout_version,properties",
      occurred_at: `gte.${period.from}`,
      and: `(occurred_at.lt.${period.to})`,
      order: "occurred_at.asc",
      limit: String(pageSize),
      offset: String(offset),
    });
    const rows = await supabaseRequest(config, `tax_product_events?${query}`);
    events.push(...rows);
    if (rows.length < pageSize) break;
  }
  return events;
}

async function fetchPreviousReport(config, period) {
  const query = new URLSearchParams({
    select: "report",
    period_end: `lte.${period.from.slice(0, 10)}`,
    order: "period_end.desc",
    limit: "1",
  });
  const rows = await supabaseRequest(config, `tax_product_weekly_reports?${query}`);
  return rows[0]?.report ?? null;
}

async function persistAggregate(config, report) {
  await supabaseRequest(config, "tax_product_weekly_reports?on_conflict=period_start,period_end", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({
      period_start: report.period.from.slice(0, 10),
      period_end: report.period.to.slice(0, 10),
      schema_version: report.schemaVersion,
      report,
      generated_at: report.generatedAt,
    }),
  });
  await supabaseRequest(config, "rpc/purge_tax_product_events", {
    method: "POST",
    body: JSON.stringify({ p_retention_days: RETENTION_DAYS }),
  });
}

async function main() {
  const generatedAt = argument("--generated-at") ?? new Date().toISOString();
  const defaultRange = defaultPeriod(generatedAt);
  const period = {
    from: new Date(argument("--from") ?? defaultRange.from).toISOString(),
    to: new Date(argument("--to") ?? defaultRange.to).toISOString(),
  };
  const input = argument("--input");
  const config = supabaseConfig();
  let events = [];
  let previous = null;
  let source = "EMPTY_LOCAL";
  if (input) {
    events = JSON.parse(await readFile(resolve(process.cwd(), input), "utf8"));
    source = "INPUT_FILE";
  } else if (config) {
    [events, previous] = await Promise.all([
      fetchEvents(config, period),
      fetchPreviousReport(config, period),
    ]);
    source = "SUPABASE";
  }
  if (!Array.isArray(events)) throw new Error("INPUT_MUST_BE_AN_EVENT_ARRAY");

  const report = aggregateTaxDiagnosticInsights(events, {
    generatedAt,
    period,
    previous,
    retentionDays: RETENTION_DAYS,
  });
  report.source = source;
  await mkdir(OUTPUT_DIR, { recursive: true });
  await Promise.all([
    writeFile(resolve(OUTPUT_DIR, "latest.json"), `${JSON.stringify(report, null, 2)}\n`),
    writeFile(resolve(OUTPUT_DIR, "latest.md"), renderTaxDiagnosticInsightsMarkdown(report)),
  ]);
  if (config && !input) await persistAggregate(config, report);
  process.stdout.write(`Tax diagnostic insights: ${events.length} events, ${report.signals.length} signals (${source}).\n`);
}

main().catch((error) => {
  process.stderr.write(`tax:insights:weekly failed: ${error instanceof Error ? error.message : "UNKNOWN"}\n`);
  process.exitCode = 1;
});
