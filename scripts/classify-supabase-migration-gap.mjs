import assert from "node:assert/strict";
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const inventoryPath =
  "docs/architecture/supabase-production-schema-inventory-2026-07-24.json";
const reconciliationPath =
  "docs/architecture/central-invoice-authority-supabase-reconciliation-2026-07-24.json";
const outputPath =
  "docs/architecture/supabase-production-migration-gap-classification-2026-07-24.json";

const inventoriedSchemas = new Set(["public", "storage"]);
const ephemeralSchemas = new Set(["pg_temp"]);

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function unique(values) {
  return [...new Set(values)].sort();
}

function objectName(matchSchema, matchName, fallbackSchema = "public") {
  return `${matchSchema ?? fallbackSchema}.${matchName}`;
}

function stripComments(sql) {
  return sql
    .replace(/--.*$/gm, "")
    .replace(/\/\*[\s\S]*?\*\//g, "");
}

function extractObjects(sql) {
  const clean = stripComments(sql);
  const schemas = unique(
    [...clean.matchAll(/\bcreate\s+schema\s+(?:if\s+not\s+exists\s+)?([a-z_][\w]*)/gi)]
      .map((match) => match[1]),
  );
  const tables = unique(
    [...clean.matchAll(/\bcreate\s+table\s+(?:if\s+not\s+exists\s+)?(?:(?!(?:if|select)\b)([a-z_][\w]*)\.)?([a-z_][\w]*)/gi)]
      .map((match) => objectName(match[1], match[2])),
  );
  const functions = unique(
    [...clean.matchAll(/\bcreate\s+(?:or\s+replace\s+)?function\s+(?:(?!(?:if|select)\b)([a-z_][\w]*)\.)?([a-z_][\w]*)/gi)]
      .map((match) => objectName(match[1], match[2])),
  );
  const alteredTables = unique(
    [...clean.matchAll(/\balter\s+table\s+(?:if\s+exists\s+|only\s+)?(?:(?!(?:if|select)\b)([a-z_][\w]*)\.)?([a-z_][\w]*)/gi)]
      .map((match) => objectName(match[1], match[2])),
  );

  return { schemas, tables, functions, alteredTables };
}

function hasNonInventoriedSchema(objects) {
  const names = [
    ...objects.schemas.map((schema) => `${schema}.`),
    ...objects.tables,
    ...objects.functions,
    ...objects.alteredTables,
  ];
  return names.some((name) => {
    const schema = name.split(".")[0];
    if (ephemeralSchemas.has(schema)) {
      return false;
    }
    return !inventoriedSchemas.has(schema);
  });
}

function classify(objects, productionTables, productionFunctions) {
  if (hasNonInventoriedSchema(objects)) {
    return "requires_private_schema_inventory";
  }

  const createdTables = objects.tables.filter((name) =>
    inventoriedSchemas.has(name.split(".")[0]),
  );
  const createdFunctions = objects.functions.filter((name) =>
    inventoriedSchemas.has(name.split(".")[0]),
  );
  const createdObjects = [...createdTables, ...createdFunctions];
  const presentObjects = [
    ...createdTables.filter((name) => productionTables.has(name)),
    ...createdFunctions.filter((name) => productionFunctions.has(name)),
  ];

  if (createdObjects.length === 0) {
    return "catalog_limited_hardening_or_alter_only";
  }
  if (presentObjects.length === createdObjects.length) {
    return "production_catalog_covered_not_recorded";
  }
  if (presentObjects.length === 0) {
    return "not_present_in_public_storage_inventory";
  }
  return "partially_covered_by_public_storage_inventory";
}

function buildReport() {
  const inventory = readJson(inventoryPath);
  const reconciliation = readJson(reconciliationPath);
  const productionTables = new Set(
    inventory.tables.map((table) => `${table.schema}.${table.name}`),
  );
  const productionFunctions = new Set(
    inventory.functions.map((fn) => `${fn.schema}.${fn.name}`),
  );
  const liveVersions = new Set(inventory.migrationHistory.liveVersions);
  const gapVersions =
    reconciliation.migrationReconciliation.repositoryVersionsNotVisibleInProduction;
  const migrationFiles = readdirSync("supabase/migrations")
    .filter((file) => /^\d{14}_.+\.sql$/.test(file))
    .sort();

  const entries = migrationFiles
    .filter((file) => gapVersions.includes(file.slice(0, 14)))
    .map((file) => {
      const version = file.slice(0, 14);
      const objects = extractObjects(
        readFileSync(join("supabase/migrations", file), "utf8"),
      );
      const status = classify(objects, productionTables, productionFunctions);
      const createdObjects = unique([...objects.tables, ...objects.functions]);
      const presentObjects = createdObjects.filter(
        (name) => productionTables.has(name) || productionFunctions.has(name),
      );
      const missingObjectsInInventory = createdObjects.filter(
        (name) => !productionTables.has(name) && !productionFunctions.has(name),
      );

      return {
        version,
        file,
        status,
        createdSchemas: objects.schemas,
        createdObjects,
        presentObjects,
        missingObjectsInInventory,
        alteredTables: objects.alteredTables,
        action:
          status === "production_catalog_covered_not_recorded"
            ? "candidate_for_accepted_baseline_marker_after_restore_evidence"
            : "manual_review_required_before_any_production_sql",
      };
    });

  const summaryByStatus = entries.reduce((summary, entry) => {
    summary[entry.status] = (summary[entry.status] ?? 0) + 1;
    return summary;
  }, {});

  return {
    schemaVersion: "supabase-production-migration-gap-classification-v1",
    basedOn: {
      inventoryFile: inventoryPath,
      reconciliationFile: reconciliationPath,
      productionProjectRef: inventory.projectRef,
      capturedAt: inventory.capturedAt,
    },
    scope: {
      mode: "read-only-derived-from-versioned-catalog-inventory",
      inventoriedSchemas: [...inventoriedSchemas],
      excludedSchemasRequireSeparateReadOnlyInventory: unique(
        entries.flatMap((entry) =>
          [
            ...entry.createdSchemas,
            ...entry.createdObjects.map((name) => name.split(".")[0]),
            ...entry.alteredTables.map((name) => name.split(".")[0]),
          ].filter(
            (schema) =>
              !inventoriedSchemas.has(schema) && !ephemeralSchemas.has(schema),
          ),
        ),
      ),
      productionVisibleVersions: [...liveVersions].sort(),
      gapVersions: gapVersions,
    },
    summary: {
      totalGapVersions: entries.length,
      ...summaryByStatus,
      baselineReconciledWithGit: false,
      decision: "blocked-before-production-sql",
    },
    entries,
  };
}

const report = buildReport();

assert.equal(report.scope.gapVersions.length, 41);
assert.equal(report.entries.length, report.scope.gapVersions.length);
assert.equal(report.summary.baselineReconciledWithGit, false);
assert.equal(report.summary.decision, "blocked-before-production-sql");
assert.equal(
  report.summary.production_catalog_covered_not_recorded > 0,
  true,
);
assert.equal(
  report.summary.not_present_in_public_storage_inventory > 0,
  true,
);
assert.equal(
  report.scope.excludedSchemasRequireSeparateReadOnlyInventory.includes(
    "expense_learning_private",
  ),
  true,
);
assert.equal(
  report.entries.some((entry) => /central_invoice/i.test(entry.file)),
  false,
);

if (process.argv.includes("--write")) {
  writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(`wrote ${outputPath}`);
} else {
  const expected = readJson(outputPath);
  assert.deepEqual(expected, report);
  console.log("Supabase migration gap classification: OK");
}
