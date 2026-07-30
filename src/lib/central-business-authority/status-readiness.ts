// CENTRAL_BUSINESS_AUTHORITY_STATUS_READINESS_V1
assertServerOnlyModule();

export const CENTRAL_BUSINESS_AUTHORITY_STATUS_READINESS =
  "CENTRAL_BUSINESS_AUTHORITY_STATUS_READINESS_V1";

export const CENTRAL_BUSINESS_AUTHORITY_STATUS_REQUIRED_TABLES = [
  "central_business_entities",
  "central_business_commands",
  "central_business_outbox",
  "central_business_bootstraps",
] as const;

export type CentralBusinessAuthorityStatusRequiredTable =
  (typeof CENTRAL_BUSINESS_AUTHORITY_STATUS_REQUIRED_TABLES)[number];

export type CentralBusinessAuthorityStatusBlocker =
  | "missing_admin_client"
  | "central_business_table_unavailable"
  | "central_business_mutation_rpc_unavailable"
  | "central_business_batch_mutation_rpc_unavailable"
  | "central_business_events_rpc_unavailable"
  | "central_business_bootstrap_rpc_unavailable";

export interface CentralBusinessAuthorityStatusProbeError {
  code?: string;
  message?: string;
}

export interface CentralBusinessAuthorityStatusProbeResult {
  data?: unknown;
  error: CentralBusinessAuthorityStatusProbeError | null;
}

export interface CentralBusinessAuthorityStatusProbeClient {
  from(table: CentralBusinessAuthorityStatusRequiredTable): {
    select(
      columns: "id",
      options: { count: "exact"; head: true },
    ): {
      limit(count: 1): Promise<CentralBusinessAuthorityStatusProbeResult>;
    };
  };
  rpc(
    name:
      | "mutate_central_business_entity_v1"
      | "mutate_central_business_batch_v1"
      | "list_central_business_events_v1"
      | "bootstrap_central_business_entities_v1",
    args: Record<string, unknown>,
  ): Promise<CentralBusinessAuthorityStatusProbeResult>;
}

export interface CentralBusinessAuthorityStatusCheck {
  id: string;
  kind: "configuration" | "table" | "rpc";
  status: "ready" | "blocked";
  blocker?: CentralBusinessAuthorityStatusBlocker;
  causeCode?: string;
  message: string;
  noBusinessRows: true;
  destructive: false;
}

export interface CentralBusinessAuthorityStatusReadiness {
  schema: typeof CENTRAL_BUSINESS_AUTHORITY_STATUS_READINESS;
  checkedAt: string;
  ready: boolean;
  checks: CentralBusinessAuthorityStatusCheck[];
  blockers: CentralBusinessAuthorityStatusBlocker[];
}

function assertServerOnlyModule() {
  if (typeof window !== "undefined") {
    throw new Error(
      "El preflight de datos de negocio solo puede cargarse en servidor.",
    );
  }
}

function ready(
  id: string,
  kind: CentralBusinessAuthorityStatusCheck["kind"],
  message: string,
): CentralBusinessAuthorityStatusCheck {
  return {
    id,
    kind,
    status: "ready",
    message,
    noBusinessRows: true,
    destructive: false,
  };
}

function blocked(
  id: string,
  kind: CentralBusinessAuthorityStatusCheck["kind"],
  blocker: CentralBusinessAuthorityStatusBlocker,
  message: string,
  error?: CentralBusinessAuthorityStatusProbeError | null,
): CentralBusinessAuthorityStatusCheck {
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

function expectedError(
  error: CentralBusinessAuthorityStatusProbeError | null,
  text: string,
) {
  return Boolean(error?.message?.includes(text));
}

async function probeTable(
  client: CentralBusinessAuthorityStatusProbeClient,
  table: CentralBusinessAuthorityStatusRequiredTable,
) {
  const result = await client
    .from(table)
    .select("id", { count: "exact", head: true })
    .limit(1);
  return result.error
    ? blocked(
        `table:${table}`,
        "table",
        "central_business_table_unavailable",
        "Una tabla central de negocio no esta disponible para el servidor.",
        result.error,
      )
    : ready(
        `table:${table}`,
        "table",
        "Tabla central accesible mediante lectura HEAD sin filas.",
      );
}

async function probeMutationRpc(
  client: CentralBusinessAuthorityStatusProbeClient,
) {
  const result = await client.rpc("mutate_central_business_entity_v1", {
    p_user_id: null,
    p_device_id: "",
    p_session_hash: "",
    p_idempotency_key_hash: "",
    p_request_hash: "",
    p_operation_kind: "__factu_status_preflight_invalid__",
    p_entity_type: "__invalid__",
    p_entity_id: "",
    p_expected_version: -1,
    p_payload: null,
    p_content_hash: "",
  });
  return expectedError(
    result.error,
    "invalid central business mutation command",
  )
    ? ready(
        "rpc:mutate_central_business_entity_v1:dry_invalid",
        "rpc",
        "RPC de mutacion existe y corta el dry-run antes de escribir.",
      )
    : blocked(
        "rpc:mutate_central_business_entity_v1:dry_invalid",
        "rpc",
        "central_business_mutation_rpc_unavailable",
        "La RPC de mutacion no devolvio el rechazo seguro esperado.",
        result.error,
      );
}

async function probeBatchMutationRpc(
  client: CentralBusinessAuthorityStatusProbeClient,
) {
  const result = await client.rpc("mutate_central_business_batch_v1", {
    p_user_id: null,
    p_device_id: "",
    p_session_hash: "",
    p_operations: [],
  });
  return expectedError(
    result.error,
    "invalid central business batch command",
  )
    ? ready(
        "rpc:mutate_central_business_batch_v1:dry_invalid",
        "rpc",
        "RPC atomica existe y corta el dry-run antes de escribir.",
      )
    : blocked(
        "rpc:mutate_central_business_batch_v1:dry_invalid",
        "rpc",
        "central_business_batch_mutation_rpc_unavailable",
        "La RPC atomica no devolvio el rechazo seguro esperado.",
        result.error,
      );
}

async function probeEventsRpc(
  client: CentralBusinessAuthorityStatusProbeClient,
) {
  const result = await client.rpc("list_central_business_events_v1", {
    p_user_id: null,
    p_device_id: "",
    p_after_sequence: -1,
    p_limit: 1,
  });
  return expectedError(
    result.error,
    "invalid central business event pull request",
  )
    ? ready(
        "rpc:list_central_business_events_v1:dry_invalid",
        "rpc",
        "RPC de eventos existe y corta el dry-run antes de leer.",
      )
    : blocked(
        "rpc:list_central_business_events_v1:dry_invalid",
        "rpc",
        "central_business_events_rpc_unavailable",
        "La RPC de eventos no devolvio el rechazo seguro esperado.",
        result.error,
      );
}

async function probeBootstrapRpc(
  client: CentralBusinessAuthorityStatusProbeClient,
) {
  const result = await client.rpc("bootstrap_central_business_entities_v1", {
    p_user_id: null,
    p_device_id: "",
    p_session_hash: "",
    p_idempotency_key_hash: "",
    p_request_hash: "",
    p_snapshot_digest: "",
    p_central_state_digest: "",
    p_preview_digest: "",
    p_entities: [],
  });
  return expectedError(
    result.error,
    "invalid central business bootstrap command",
  )
    ? ready(
        "rpc:bootstrap_central_business_entities_v1:dry_invalid",
        "rpc",
        "RPC de bootstrap existe y corta el dry-run antes de escribir.",
      )
    : blocked(
        "rpc:bootstrap_central_business_entities_v1:dry_invalid",
        "rpc",
        "central_business_bootstrap_rpc_unavailable",
        "La RPC de bootstrap no devolvio el rechazo seguro esperado.",
        result.error,
      );
}

export async function probeCentralBusinessAuthorityStatusReadiness(input: {
  client: CentralBusinessAuthorityStatusProbeClient | null;
  checkedAt?: string;
}): Promise<CentralBusinessAuthorityStatusReadiness> {
  if (!input.client) {
    return {
      schema: CENTRAL_BUSINESS_AUTHORITY_STATUS_READINESS,
      checkedAt: input.checkedAt ?? new Date().toISOString(),
      ready: false,
      checks: [
        blocked(
          "admin_client",
          "configuration",
          "missing_admin_client",
          "El cliente servidor de Supabase no esta disponible.",
        ),
      ],
      blockers: ["missing_admin_client"],
    };
  }

  const checks = await Promise.all([
    ...CENTRAL_BUSINESS_AUTHORITY_STATUS_REQUIRED_TABLES.map((table) =>
      probeTable(input.client!, table),
    ),
    probeMutationRpc(input.client),
    probeBatchMutationRpc(input.client),
    probeEventsRpc(input.client),
    probeBootstrapRpc(input.client),
  ]);
  const blockers = [
    ...new Set(
      checks.flatMap((check) => (check.blocker ? [check.blocker] : [])),
    ),
  ];
  return {
    schema: CENTRAL_BUSINESS_AUTHORITY_STATUS_READINESS,
    checkedAt: input.checkedAt ?? new Date().toISOString(),
    ready: blockers.length === 0,
    checks,
    blockers,
  };
}
