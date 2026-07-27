// CENTRAL_INVOICE_AUTHORITY_STATUS_READINESS_V1
assertServerOnlyModule();

export const CENTRAL_INVOICE_AUTHORITY_STATUS_READINESS =
  "CENTRAL_INVOICE_AUTHORITY_STATUS_READINESS_V1";

export const CENTRAL_INVOICE_AUTHORITY_STATUS_REQUIRED_TABLES = [
  "central_invoice_series_state",
  "central_invoice_documents",
  "central_invoice_commands",
  "central_invoice_identities",
  "central_invoice_outbox",
] as const;

export type CentralInvoiceAuthorityStatusRequiredTable =
  (typeof CENTRAL_INVOICE_AUTHORITY_STATUS_REQUIRED_TABLES)[number];

export type CentralInvoiceAuthorityStatusCheckId =
  | "admin_client"
  | `table:${CentralInvoiceAuthorityStatusRequiredTable}`
  | "rpc:issue_central_invoice_v1:dry_invalid"
  | "rpc:list_central_invoice_events_v1:dry_invalid";

export type CentralInvoiceAuthorityStatusCheckKind =
  | "configuration"
  | "table"
  | "rpc";

export type CentralInvoiceAuthorityStatusCheckStatus =
  | "ready"
  | "blocked";

export type CentralInvoiceAuthorityStatusBlocker =
  | "missing_admin_client"
  | "central_invoice_table_unavailable"
  | "central_invoice_issue_rpc_unavailable"
  | "central_invoice_events_rpc_unavailable";

export interface CentralInvoiceAuthorityStatusProbeError {
  code?: string;
  message?: string;
}

export interface CentralInvoiceAuthorityStatusProbeResult {
  data?: unknown;
  error: CentralInvoiceAuthorityStatusProbeError | null;
}

export interface CentralInvoiceAuthorityStatusProbeClient {
  from(table: CentralInvoiceAuthorityStatusRequiredTable): {
    select(
      columns: "id",
      options: { count: "exact"; head: true },
    ): {
      limit(count: 1): Promise<CentralInvoiceAuthorityStatusProbeResult>;
    };
  };
  rpc(
    name: "issue_central_invoice_v1" | "list_central_invoice_events_v1",
    args: Record<string, unknown>,
  ): Promise<CentralInvoiceAuthorityStatusProbeResult>;
}

export interface CentralInvoiceAuthorityStatusCheck {
  id: CentralInvoiceAuthorityStatusCheckId;
  kind: CentralInvoiceAuthorityStatusCheckKind;
  status: CentralInvoiceAuthorityStatusCheckStatus;
  blocker?: CentralInvoiceAuthorityStatusBlocker;
  causeCode?: string;
  message: string;
  noBusinessRows: true;
  destructive: false;
}

export interface CentralInvoiceAuthorityStatusReadiness {
  schema: typeof CENTRAL_INVOICE_AUTHORITY_STATUS_READINESS;
  checkedAt: string;
  ready: boolean;
  checks: CentralInvoiceAuthorityStatusCheck[];
  blockers: CentralInvoiceAuthorityStatusBlocker[];
}

interface CentralInvoiceAuthorityStatusReadinessInput {
  client: CentralInvoiceAuthorityStatusProbeClient | null;
  checkedAt?: string;
}

const EXPECTED_ISSUE_DRY_RUN_ERROR =
  "invalid central invoice issue command";
const EXPECTED_EVENTS_DRY_RUN_ERROR =
  "invalid central invoice event pull request";

function assertServerOnlyModule() {
  if (typeof window !== "undefined") {
    throw new Error(
      "El preflight de autoridad central solo puede cargarse en servidor.",
    );
  }
}

function readyCheck(
  id: CentralInvoiceAuthorityStatusCheckId,
  kind: CentralInvoiceAuthorityStatusCheckKind,
  message: string,
): CentralInvoiceAuthorityStatusCheck {
  return {
    id,
    kind,
    status: "ready",
    message,
    noBusinessRows: true,
    destructive: false,
  };
}

function blockedCheck(
  id: CentralInvoiceAuthorityStatusCheckId,
  kind: CentralInvoiceAuthorityStatusCheckKind,
  blocker: CentralInvoiceAuthorityStatusBlocker,
  message: string,
  error?: CentralInvoiceAuthorityStatusProbeError | null,
): CentralInvoiceAuthorityStatusCheck {
  return {
    id,
    kind,
    status: "blocked",
    blocker,
    causeCode: error?.code,
    message,
    noBusinessRows: true,
    destructive: false,
  };
}

function expectedError(error: CentralInvoiceAuthorityStatusProbeError | null, text: string) {
  return Boolean(error?.message?.includes(text));
}

function missingRpc(error: CentralInvoiceAuthorityStatusProbeError | null) {
  return (
    error?.code === "42883" ||
    error?.code === "PGRST202" ||
    error?.message?.toLowerCase().includes("function") === true
  );
}

async function probeTable(
  client: CentralInvoiceAuthorityStatusProbeClient,
  table: CentralInvoiceAuthorityStatusRequiredTable,
): Promise<CentralInvoiceAuthorityStatusCheck> {
  const result = await client
    .from(table)
    .select("id", { count: "exact", head: true })
    .limit(1);

  if (!result.error) {
    return readyCheck(
      `table:${table}`,
      "table",
      "Tabla central accesible mediante lectura HEAD sin filas.",
    );
  }

  return blockedCheck(
    `table:${table}`,
    "table",
    "central_invoice_table_unavailable",
    "La tabla central no esta disponible para el cliente servidor.",
    result.error,
  );
}

async function probeIssueRpc(
  client: CentralInvoiceAuthorityStatusProbeClient,
): Promise<CentralInvoiceAuthorityStatusCheck> {
  const result = await client.rpc("issue_central_invoice_v1", {
    p_user_id: null,
    p_device_id: "",
    p_session_hash: "",
    p_idempotency_key_hash: "",
    p_request_hash: "",
    p_kind: "__factu_status_preflight_invalid__",
    p_local_document_id: "",
    p_expected_version: -1,
    p_draft_hash: "",
    p_environment: "__invalid__",
    p_issuer_nif: "",
    p_series_code: "",
    p_fiscal_year: 0,
    p_issued_at: null,
    p_document_payload: null,
    p_emitted_snapshot: null,
    p_emitted_hash: "",
    p_rectifies_identity_id: null,
  });

  if (expectedError(result.error, EXPECTED_ISSUE_DRY_RUN_ERROR)) {
    return readyCheck(
      "rpc:issue_central_invoice_v1:dry_invalid",
      "rpc",
      "RPC de emision existe y corta el dry-run antes de escribir.",
    );
  }

  return blockedCheck(
    "rpc:issue_central_invoice_v1:dry_invalid",
    "rpc",
    "central_invoice_issue_rpc_unavailable",
    missingRpc(result.error)
      ? "La RPC de emision central no existe o no esta expuesta al servidor."
      : "La RPC de emision central no devolvio el rechazo seguro esperado.",
    result.error,
  );
}

async function probeEventsRpc(
  client: CentralInvoiceAuthorityStatusProbeClient,
): Promise<CentralInvoiceAuthorityStatusCheck> {
  const result = await client.rpc("list_central_invoice_events_v1", {
    p_user_id: null,
    p_device_id: "",
    p_after_created_at: null,
    p_after_event_id: null,
    p_limit: 1,
  });

  if (expectedError(result.error, EXPECTED_EVENTS_DRY_RUN_ERROR)) {
    return readyCheck(
      "rpc:list_central_invoice_events_v1:dry_invalid",
      "rpc",
      "RPC de eventos existe y corta el dry-run antes de leer eventos.",
    );
  }

  return blockedCheck(
    "rpc:list_central_invoice_events_v1:dry_invalid",
    "rpc",
    "central_invoice_events_rpc_unavailable",
    missingRpc(result.error)
      ? "La RPC de eventos centrales no existe o no esta expuesta al servidor."
      : "La RPC de eventos centrales no devolvio el rechazo seguro esperado.",
    result.error,
  );
}

function blockersFromChecks(checks: readonly CentralInvoiceAuthorityStatusCheck[]) {
  return Array.from(
    new Set(
      checks
        .map((check) => check.blocker)
        .filter(
          (blocker): blocker is CentralInvoiceAuthorityStatusBlocker =>
            Boolean(blocker),
        ),
    ),
  );
}

export async function probeCentralInvoiceAuthorityStatusReadiness(
  input: CentralInvoiceAuthorityStatusReadinessInput,
): Promise<CentralInvoiceAuthorityStatusReadiness> {
  const checkedAt = input.checkedAt ?? new Date().toISOString();
  if (!input.client) {
    const checks = [
      blockedCheck(
        "admin_client",
        "configuration",
        "missing_admin_client",
        "Falta el cliente Supabase de servidor para comprobar la autoridad central.",
      ),
    ];
    return {
      schema: CENTRAL_INVOICE_AUTHORITY_STATUS_READINESS,
      checkedAt,
      ready: false,
      checks,
      blockers: blockersFromChecks(checks),
    };
  }

  const checks: CentralInvoiceAuthorityStatusCheck[] = [
    readyCheck(
      "admin_client",
      "configuration",
      "Cliente Supabase de servidor disponible.",
    ),
  ];

  for (const table of CENTRAL_INVOICE_AUTHORITY_STATUS_REQUIRED_TABLES) {
    checks.push(await probeTable(input.client, table));
  }
  checks.push(await probeIssueRpc(input.client));
  checks.push(await probeEventsRpc(input.client));

  const blockers = blockersFromChecks(checks);
  return {
    schema: CENTRAL_INVOICE_AUTHORITY_STATUS_READINESS,
    checkedAt,
    ready: blockers.length === 0,
    checks,
    blockers,
  };
}
