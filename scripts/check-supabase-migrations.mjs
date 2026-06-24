import fs from "node:fs";
import path from "node:path";

const root = path.resolve(new URL("../", import.meta.url).pathname);
const migrationsDir = path.join(root, "supabase", "migrations");
const rollbacksDir = path.join(root, "supabase", "rollbacks");

const migrationPattern = /^\d{14}_[a-z0-9]+(?:_[a-z0-9]+)*\.sql$/;
const rollbackPattern = /^\d{14}_[a-z0-9]+(?:_[a-z0-9]+)*\.down\.sql$/;
const versionPattern = /^(\d{14})_/;

function listFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .sort();
}

const migrations = listFiles(migrationsDir);
const rollbacks = listFiles(rollbacksDir);
const errors = [];

for (const file of migrations) {
  if (file.endsWith(".down.sql")) {
    errors.push(
      `Rollback file must live in supabase/rollbacks, not migrations: ${file}`,
    );
  }
  if (!migrationPattern.test(file)) {
    errors.push(
      `Migration name must match YYYYMMDDHHMMSS_slug.sql: ${file}`,
    );
  }
}

for (const file of rollbacks) {
  if (!rollbackPattern.test(file)) {
    errors.push(
      `Rollback name must match YYYYMMDDHHMMSS_slug.down.sql: ${file}`,
    );
  }
}

const versions = new Map();
for (const file of migrations) {
  const version = file.match(versionPattern)?.[1];
  if (!version) continue;
  const previous = versions.get(version);
  if (previous) {
    errors.push(
      `Duplicate migration version ${version}: ${previous} and ${file}`,
    );
    continue;
  }
  versions.set(version, file);
}

for (const file of rollbacks) {
  const version = file.match(versionPattern)?.[1];
  if (!version) continue;
  if (!versions.has(version)) {
    errors.push(
      `Rollback has no matching migration version ${version}: ${file}`,
    );
  }
}

if (errors.length > 0) {
  console.error("Supabase migration convention check failed:");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log(
  `Supabase migration convention check passed (${migrations.length} migrations, ${rollbacks.length} rollbacks).`,
);
