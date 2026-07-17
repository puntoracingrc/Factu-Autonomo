import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import postgres from "postgres";

const MIGRATION_PATH = new URL(
  "../supabase/migrations/20260717090000_partner_program_foundation.sql",
  import.meta.url,
);
const EXPECTED_SHA256 =
  "602c2cb715ab65e9b46d7202240b3f445e6479506d573293b785232df98236df";
const REQUIRED_TABLES = [
  "partner_accounts",
  "partner_commission_entries",
  "partner_payouts",
];
const POSTGREST_TABLE_CHECKS = [
  ["partner_accounts", "user_id"],
  ["partner_commission_entries", "id"],
  ["partner_payouts", "id"],
];

function isProductionVercelBuild() {
  return process.env.VERCEL === "1" && process.env.VERCEL_ENV === "production";
}

if (!isProductionVercelBuild()) {
  console.log("Partner schema: skipped outside a Vercel production build.");
  process.exit(0);
}

const connectionString =
  process.env.POSTGRES_URL_NON_POOLING ?? process.env.POSTGRES_URL;
if (!connectionString || !/^postgres(?:ql)?:\/\//i.test(connectionString)) {
  throw new Error("Partner schema: production database connection is unavailable.");
}

const migrationSql = await readFile(MIGRATION_PATH, "utf8");
const migrationSha256 = createHash("sha256").update(migrationSql).digest("hex");
if (migrationSha256 !== EXPECTED_SHA256) {
  throw new Error("Partner schema: migration checksum does not match the reviewed file.");
}

const sql = postgres(connectionString, {
  connect_timeout: 15,
  idle_timeout: 5,
  max: 1,
  prepare: false,
  ssl: "require",
  onnotice: () => {},
});

async function verifyPostgrestSchema() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  const serviceKey = process.env.SUPABASE_SECRET_KEY;
  if (!supabaseUrl || !serviceKey) {
    throw new Error("Partner schema: PostgREST verification credentials are unavailable.");
  }

  for (let attempt = 0; attempt < 5; attempt += 1) {
    let allReady = true;
    for (const [table, column] of POSTGREST_TABLE_CHECKS) {
      const response = await fetch(
        `${supabaseUrl}/rest/v1/${table}?select=${column}&limit=0`,
        {
          headers: {
            apikey: serviceKey,
            Authorization: `Bearer ${serviceKey}`,
            Accept: "application/json",
          },
          redirect: "error",
          signal: AbortSignal.timeout(10_000),
        },
      );
      if (!response.ok) {
        allReady = false;
        break;
      }
    }
    if (allReady) return;
    await new Promise((resolve) => setTimeout(resolve, 1_000));
  }

  throw new Error("Partner schema: PostgREST did not expose the reviewed tables.");
}

try {
  await sql.begin(async (transaction) => {
    await transaction`select pg_advisory_xact_lock(hashtext('factu_partner_program_v1'))`;
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
      throw new Error("Partner schema: post-migration security verification failed.");
    }
  });
  await sql.unsafe("notify pgrst, 'reload schema'");
  await verifyPostgrestSchema();
  console.log(
    "Partner schema: migration, security and PostgREST verification completed.",
  );
} catch {
  throw new Error("Partner schema: transactional deployment failed.");
} finally {
  await sql.end({ timeout: 5 });
}
