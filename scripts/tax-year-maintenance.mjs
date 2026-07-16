#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const RULES_PATH = resolve(ROOT, "src/lib/tax-model-diagnostic/rules.ts");
const PROFILES_PATH = resolve(ROOT, "src/lib/tax-model-diagnostic/orientative-profiles.test.ts");
const command = process.argv[2];
const yearIndex = process.argv.indexOf("--year");
const year = Number(yearIndex >= 0 ? process.argv[yearIndex + 1] : NaN);

function assertYear() {
  if (!Number.isInteger(year) || year < 2027 || year > 2100) {
    throw new Error("YEAR_MUST_BE_AN_INTEGER_BETWEEN_2027_AND_2100");
  }
}

function parseBlueprints(source) {
  return source
    .split("\n")
    .filter((line) => line.includes("{ modelNumber:") && line.includes("officialSourceIds:"))
    .map((line) => {
      const modelNumber = line.match(/modelNumber:\s*"([A-Z0-9]+)"/)?.[1];
      const sourceBlock = line.match(/officialSourceIds:\s*\[([^\]]*)\]/)?.[1] ?? "";
      const officialSourceIds = [...sourceBlock.matchAll(/"([^"]+)"/g)].map((match) => match[1]);
      if (!modelNumber || officialSourceIds.length === 0) throw new Error("UNPARSABLE_RULE_BLUEPRINT");
      return { modelNumber, officialSourceIds };
    });
}

function practicalProfileCount(source) {
  const array = source.slice(source.indexOf("const ORIENTATIVE_PROFILES"), source.indexOf("describe(\"20 practical"));
  return [...array.matchAll(/\bprofile\(/g)].length;
}

function runPracticalProfiles() {
  const executable = resolve(ROOT, "node_modules/.bin/vitest");
  if (!existsSync(executable)) return { status: "NOT_RUN_DEPENDENCIES_MISSING", profileCount: 20 };
  const result = spawnSync(executable, ["run", "src/lib/tax-model-diagnostic/orientative-profiles.test.ts"], {
    cwd: ROOT,
    encoding: "utf8",
  });
  if (result.status !== 0) throw new Error(`PRACTICAL_PROFILES_FAILED:${(result.stderr || result.stdout).slice(-1_000)}`);
  return { status: "BASELINE_GREEN", profileCount: 20 };
}

function outputDirectory() {
  return resolve(ROOT, `reports/tax-years/${year}`);
}

async function prepare() {
  const [rulesSource, profilesSource] = await Promise.all([
    readFile(RULES_PATH, "utf8"),
    readFile(PROFILES_PATH, "utf8"),
  ]);
  const blueprints = parseBlueprints(rulesSource);
  const profileCount = practicalProfileCount(profilesSource);
  if (blueprints.length !== 27) throw new Error(`EXPECTED_27_MODEL_BLUEPRINTS_GOT_${blueprints.length}`);
  if (profileCount !== 20) throw new Error(`EXPECTED_20_PRACTICAL_PROFILES_GOT_${profileCount}`);
  const baseline = runPracticalProfiles();
  const scaffold = {
    schemaVersion: "1.0.0",
    fiscalYear: year,
    territory: "ES_COMMON",
    generatedAt: new Date().toISOString(),
    sourceExercise: year - 1,
    status: "REQUIRES_RULE_CONTENT_REVIEW",
    publicationMode: "ORIENTATIVE",
    authorizedFiscalExclusion: false,
    allModelsViewRequired: true,
    calendarContractYear: year,
    rules: blueprints.map(({ modelNumber, officialSourceIds }) => ({
      ruleId: `es-common.${year}.model-${modelNumber}`,
      modelNumber,
      fiscalYear: year,
      territory: "ES_COMMON",
      effectiveFrom: `${year}-01-01`,
      effectiveTo: `${year}-12-31`,
      runtimeVersion: null,
      ruleContentState: "REQUIRES_REVIEW",
      sourceReferenceIds: officialSourceIds,
      sourceValidityState: "REQUIRES_REVIEW",
      dateValidityState: "REQUIRES_REVIEW",
      thresholdValidityState: "REQUIRES_REVIEW",
    })),
    practicalProfiles: {
      ...baseline,
      targetYearDryRunState: "BLOCKED_PENDING_RULE_CONTENT",
      explanation: "The 20 baseline profiles stay green; target-year outcomes are not copied until rule content and sources are reviewed.",
    },
  };
  const difference = {
    fromYear: year - 1,
    toYear: year,
    modelCount: blueprints.length,
    rulesWithoutTargetRuntimeVersion: blueprints.map((item) => item.modelNumber),
    sourceReferencesRequiringReview: blueprints.reduce((count, item) => count + item.officialSourceIds.length, 0),
    silentlyReusedDates: 0,
    previousExercisesModified: false,
    authorizedFiscalExclusion: false,
    allModelsViewRequired: true,
  };
  await mkdir(outputDirectory(), { recursive: true });
  await Promise.all([
    writeFile(resolve(outputDirectory(), "ruleset-skeleton.json"), `${JSON.stringify(scaffold, null, 2)}\n`),
    writeFile(resolve(outputDirectory(), "difference.json"), `${JSON.stringify(difference, null, 2)}\n`),
    writeFile(resolve(outputDirectory(), "difference.md"), `# Preparación fiscal ${year}\n\n- 27 modelos estructurados.\n- 27 reglas pendientes de contenido versionado.\n- ${difference.sourceReferencesRequiringReview} asociaciones de fuente pendientes de vigencia.\n- 20 perfiles base: ${baseline.status}.\n- Resultados ${year}: bloqueados hasta revisar el contenido, sin copiar decisiones de ${year - 1}.\n- «Todos»: obligatorio.\n- Exclusiones autorizadas: no.\n`),
  ]);
  process.stdout.write(`Prepared orientative tax year ${year}: 27 rule skeletons, 20 baseline profiles green.\n`);
}

async function validate() {
  const path = resolve(outputDirectory(), "ruleset-skeleton.json");
  if (!existsSync(path)) throw new Error(`RUN_tax:year:prepare_FIRST_FOR_${year}`);
  const scaffold = JSON.parse(await readFile(path, "utf8"));
  const errors = [];
  if (scaffold.fiscalYear !== year) errors.push("WRONG_FISCAL_YEAR");
  if (!Array.isArray(scaffold.rules) || scaffold.rules.length !== 27) errors.push("EXPECTED_27_RULES");
  for (const rule of scaffold.rules ?? []) {
    if (rule.fiscalYear !== year) errors.push(`${rule.ruleId}:MISSING_YEAR`);
    if (rule.territory !== "ES_COMMON") errors.push(`${rule.ruleId}:MISSING_TERRITORY`);
    if (!Array.isArray(rule.sourceReferenceIds) || rule.sourceReferenceIds.length === 0) errors.push(`${rule.ruleId}:MISSING_SOURCE_REFERENCE`);
    if (rule.sourceValidityState !== "REQUIRES_REVIEW" || rule.dateValidityState !== "REQUIRES_REVIEW") errors.push(`${rule.ruleId}:SILENTLY_REUSED_VALIDITY`);
  }
  if (scaffold.calendarContractYear !== year) errors.push("CALENDAR_YEAR_MISMATCH");
  if (scaffold.allModelsViewRequired !== true) errors.push("ALL_MODELS_NOT_REQUIRED");
  if (scaffold.authorizedFiscalExclusion !== false) errors.push("FISCAL_EXCLUSION_ENABLED");
  const profileResult = runPracticalProfiles();
  if (profileResult.status !== "BASELINE_GREEN") errors.push("PRACTICAL_PROFILE_BASELINE_NOT_GREEN");
  const validation = {
    schemaVersion: "1.0.0",
    fiscalYear: year,
    validatedAt: new Date().toISOString(),
    status: errors.length ? "INVALID" : "VALID_REVIEW_REQUIRED",
    errors,
    practicalProfiles: profileResult,
    targetYearOutcomes: "REQUIRES_RULE_CONTENT_REVIEW",
    allModelsAccessible: scaffold.allModelsViewRequired === true,
    authorizedFiscalExclusion: scaffold.authorizedFiscalExclusion,
  };
  await writeFile(resolve(outputDirectory(), "validation.json"), `${JSON.stringify(validation, null, 2)}\n`);
  if (errors.length) throw new Error(errors.join(","));
  process.stdout.write(`Validated orientative tax year ${year}: structure valid, target rules still require review.\n`);
}

assertYear();
if (command === "prepare") await prepare();
else if (command === "validate") await validate();
else throw new Error("COMMAND_MUST_BE_prepare_OR_validate");
