import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import postgres from "postgres";

const MIGRATION_PATH = new URL(
  "../supabase/migrations/20260717104000_referral_schema_runtime_alignment.sql",
  import.meta.url,
);
const EXPECTED_SHA256 =
  "3302e48f56f15ebe6ee8f840cef92750d488da149a599d648dc2b5ba8dd00c14";
const REQUIRED_TABLES = ["referral_codes", "referral_redemptions"];

function isProductionVercelBuild() {
  return process.env.VERCEL === "1" && process.env.VERCEL_ENV === "production";
}

if (!isProductionVercelBuild()) {
  console.log("Partner referrals: skipped outside a Vercel production build.");
  process.exit(0);
}

const connectionString =
  process.env.POSTGRES_URL_NON_POOLING ?? process.env.POSTGRES_URL;
if (!connectionString || !/^postgres(?:ql)?:\/\//i.test(connectionString)) {
  throw new Error("Partner referrals: production database connection is unavailable.");
}

const migrationSql = await readFile(MIGRATION_PATH, "utf8");
const migrationSha256 = createHash("sha256").update(migrationSql).digest("hex");
if (migrationSha256 !== EXPECTED_SHA256) {
  throw new Error("Partner referrals: migration checksum does not match the reviewed file.");
}

const sql = postgres(connectionString, {
  connect_timeout: 15,
  idle_timeout: 5,
  max: 1,
  prepare: false,
  ssl: "require",
  onnotice: () => {},
});

try {
  await sql.begin(async (transaction) => {
    await transaction`select pg_advisory_xact_lock(hashtext('factu_partner_referral_runtime_v1'))`;
    await transaction.unsafe(migrationSql);

    const tables = await transaction`
      select
        c.relname as table_name,
        c.relrowsecurity as rls_enabled,
        has_table_privilege('anon', c.oid, 'select') as anon_can_select,
        has_table_privilege('authenticated', c.oid, 'select') as authenticated_can_select,
        has_table_privilege('service_role', c.oid, 'select,insert,update,delete') as service_role_can_manage
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public'
        and c.relname in ${transaction(REQUIRED_TABLES)}
      order by c.relname
    `;

    if (
      tables.length !== REQUIRED_TABLES.length ||
      tables.some(
        (table) =>
          table.rls_enabled !== true ||
          table.anon_can_select !== false ||
          table.authenticated_can_select !== false ||
          table.service_role_can_manage !== true,
      )
    ) {
      throw new Error("Partner referrals: post-migration security verification failed.");
    }
  });
  console.log("Partner referrals: migration and security verification completed.");
} catch {
  throw new Error("Partner referrals: transactional deployment failed.");
} finally {
  await sql.end({ timeout: 5 });
}
