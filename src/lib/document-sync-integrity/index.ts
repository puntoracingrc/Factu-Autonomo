export type {
  DocumentSyncAuditEvent,
  DocumentSyncAuditEventInput,
  DocumentSyncAuditEventType,
} from "./sync-audit";
export {
  assertSafeDocumentSyncAuditEvent,
  buildDocumentSyncAuditEvent,
  redactDocumentSyncAuditEvent,
} from "./sync-audit";
export { DocumentSyncPolicyError } from "./errors";
export type {
  LocalStagingDocumentSyncAdapter,
  LocalStagingDocumentSyncAdapterResult,
  LocalStagingDocumentSyncConflictReport,
  LocalStagingDocumentSyncSafeState,
} from "./sync-adapter";
export { createLocalStagingDocumentSyncAdapter } from "./sync-adapter";
export type {
  DocumentSyncSafeReport,
} from "./sync-report";
export { buildDocumentSyncSafeReport } from "./sync-report";
export type {
  DocumentSyncStore,
  DocumentSyncStoreOperationResult,
  DocumentSyncStoreRecord,
  DocumentSyncStoreScope,
  DocumentSyncStoreSnapshot,
  InMemoryDocumentSyncStore,
} from "./sync-store";
export { createInMemoryDocumentSyncStore } from "./sync-store";
export type {
  DocumentSyncAllowedMutationPlan,
  DocumentSyncConflictPlan,
  DocumentSyncMutationPlan,
  DocumentSyncMutationPlanStatus,
  DocumentSyncNoopPlan,
  DocumentSyncRejectedMutationPlan,
} from "./sync-planner";
export { planDocumentSyncMutation } from "./sync-planner";
export type {
  DocumentSyncVersionComparison,
  DocumentSyncVersionComparisonInput,
} from "./sync-conflicts";
export {
  buildDocumentSyncConflict,
  compareDocumentSyncVersions,
  isExpectedVersionSatisfied,
} from "./sync-conflicts";
export {
  buildDocumentSyncSafeSummary,
  evaluateDocumentSyncPolicy,
} from "./sync-policy";
export type {
  DocumentSyncSupabaseAdapterOptions,
  DocumentSyncSupabaseClientLike,
  DocumentSyncSupabaseConflictRow,
  DocumentSyncSupabaseDatabaseTarget,
  DocumentSyncSupabaseErrorLike,
  DocumentSyncSupabaseFilterBuilder,
  DocumentSyncSupabaseQueryResult,
  DocumentSyncSupabaseRow,
  DocumentSyncSupabaseSafetyMode,
  DocumentSyncSupabaseStore,
  DocumentSyncSupabaseTableClient,
  DocumentSyncSupabaseVersionRow,
  ResolvedDocumentSyncSupabaseAdapterOptions,
} from "./supabase-contract";
export {
  assertDocumentSyncSupabaseClientLike,
  assertDocumentSyncSupabaseScope,
  DocumentSyncSupabaseSafetyError,
  resolveDocumentSyncSupabaseAdapterOptions,
} from "./supabase-contract";
export {
  DOCUMENT_SYNC_SUPABASE_CONFLICT_COLUMNS,
  DOCUMENT_SYNC_SUPABASE_DOCUMENT_COLUMNS,
  DocumentSyncSupabaseMappingError,
  mapDocumentSyncRecordToSupabaseInsert,
  mapDocumentSyncRecordToSupabaseUpdate,
  mapSupabaseConflictRowToSyncConflict,
  mapSupabaseDocumentRowToStoreRecord,
  mapSupabaseDocumentRowToSyncCurrentState,
  mapSyncConflictToSupabaseConflictInsert,
  mapSyncMutationToSupabaseDraftUpdate,
} from "./supabase-mapping";
export { createSupabaseDocumentSyncStore } from "./supabase-store";
export { DocumentSyncSupabaseStoreError } from "./supabase-store";
export type {
  SupabaseLocalStagingDocumentSyncAdapter,
  SupabaseLocalStagingDocumentSyncAdapterOptions,
  SupabaseLocalStagingDocumentSyncAdapterResult,
  SupabaseLocalStagingDocumentSyncConflictReport,
  SupabaseLocalStagingDocumentSyncSafeState,
} from "./supabase-adapter";
export { createSupabaseLocalStagingDocumentSyncAdapter } from "./supabase-adapter";
export {
  DOCUMENT_SYNC_SERVER_COMMAND_MAX_BATCH_SIZE,
  DocumentSyncServerCommandError,
  buildDocumentSyncServerCommand,
  summarizeDocumentSyncServerCommand,
  validateDocumentSyncServerCommand,
} from "./server-sync-command";
export type {
  DocumentSyncServerAuthContext,
  DocumentSyncServerCommand,
  DocumentSyncServerCommandErrorCode,
  DocumentSyncServerCommandInput,
  DocumentSyncServerCommandKind,
  DocumentSyncServerCommandOptions,
  DocumentSyncServerCommandPayload,
  DocumentSyncServerCommandResult,
  DocumentSyncServerCommandSafeSummary,
} from "./server-sync-command";
export {
  applyDocumentSyncBatch,
  planDocumentSyncBatch,
  summarizeDocumentSyncBatchResult,
} from "./server-sync-batch";
export type {
  DocumentSyncServerApplyResult,
  DocumentSyncServerBatchAdapter,
  DocumentSyncServerBatchItemResult,
  DocumentSyncServerBatchResult,
  DocumentSyncServerBatchSafeSummary,
} from "./server-sync-batch";
export {
  createDocumentSyncServerService,
} from "./server-sync-service";
export type {
  DocumentSyncServerConflictReport,
  DocumentSyncServerSafeState,
  DocumentSyncServerService,
  DocumentSyncServerServiceAdapter,
  DocumentSyncServerServiceDependencies,
} from "./server-sync-service";
export {
  assertSafeDocumentSyncServerJson,
  redactDocumentSyncServerError,
  serializeDocumentSyncServerResult,
} from "./server-sync-response";
export {
  buildDocumentSyncServerAuditEvent,
  createInMemoryDocumentSyncServerAuditSink,
} from "./server-sync-audit";
export type {
  DocumentSyncServerAuditEvent,
  DocumentSyncServerAuditEventInput,
  DocumentSyncServerAuditEventType,
  InMemoryDocumentSyncServerAuditSink,
} from "./server-sync-audit";
export {
  DOCUMENT_SYNC_ROUTE_SHELL_ENABLED_KEY,
  DOCUMENT_SYNC_ROUTE_SHELL_PRIVATE_MODE_KEY,
  DOCUMENT_SYNC_ROUTE_SHELL_PRIVATE_MODE_LOCAL,
  assertDocumentSyncRouteShellDisabledByDefault,
  evaluateDocumentSyncRouteShellFlag,
  summarizeDocumentSyncRouteShellFlag,
} from "./route-shell-flag";
export type {
  DocumentSyncRouteShellEnvLike,
  DocumentSyncRouteShellFlagEvaluation,
  DocumentSyncRouteShellFlagReason,
  DocumentSyncRouteShellFlagSafeSummary,
  DocumentSyncRouteShellFlagStatus,
} from "./route-shell-flag";
export {
  buildDisabledRouteAuthContext,
  rejectMissingRouteAuthContext,
  summarizeRouteAuthContext,
} from "./route-auth-context";
export type {
  DocumentSyncRouteAuthContextInput,
  DocumentSyncRouteAuthContextReason,
  DocumentSyncRouteAuthContextResult,
  DocumentSyncRouteAuthContextSafeSummary,
  DocumentSyncRouteAuthContextStatus,
} from "./route-auth-context";
export {
  DOCUMENT_SYNC_ROUTE_ENVELOPE_MAX_BYTES,
  buildDocumentSyncRouteDisabledResponse,
  buildDocumentSyncRouteErrorResponse,
  buildDocumentSyncRouteLocalFakeResponse,
  buildDocumentSyncRouteSafeResponse,
  parseDocumentSyncRouteEnvelope,
} from "./route-envelope";
export type {
  DocumentSyncRouteEnvelopeInput,
  DocumentSyncRouteEnvelopeResult,
  DocumentSyncRouteEnvelopeSafeSummary,
  DocumentSyncRouteEnvelopeStatus,
  DocumentSyncRouteSafeResponse,
  DocumentSyncRouteSafeResponseBody,
} from "./route-envelope";
export {
  DOCUMENT_SYNC_ROUTE_FAKE_ADAPTER_ENABLED_KEY,
  DOCUMENT_SYNC_ROUTE_FAKE_ADAPTER_MODE_IN_MEMORY,
  DOCUMENT_SYNC_ROUTE_FAKE_ADAPTER_MODE_KEY,
  assertDocumentSyncLocalExecutionAllowed,
  evaluateDocumentSyncLocalExecutionMode,
  summarizeDocumentSyncLocalExecutionMode,
} from "./route-local-execution-contract";
export type {
  DocumentSyncLocalExecutionEvaluation,
  DocumentSyncLocalExecutionReason,
  DocumentSyncLocalExecutionSafeSummary,
  DocumentSyncLocalExecutionStatus,
} from "./route-local-execution-contract";
export {
  DOCUMENT_SYNC_ROUTE_FAKE_SCOPE_ID,
  DOCUMENT_SYNC_ROUTE_FAKE_USER_ID,
  buildDocumentSyncRouteFakeCommand,
  createDocumentSyncRouteFakeAdapter,
  createDocumentSyncRouteFakeService,
  seedDocumentSyncRouteFakeStore,
} from "./route-fake-adapter";
export type {
  DocumentSyncRouteFakeRuntime,
} from "./route-fake-adapter";
export {
  createInMemoryDocumentSyncRouteRateLimiter,
  evaluateDocumentSyncRouteRateLimit,
  generateSafeDocumentSyncRouteRequestId,
  normalizeDocumentSyncRouteRequestId,
  summarizeDocumentSyncRouteRateLimit,
} from "./route-rate-limit";
export type {
  DocumentSyncRouteRateLimitOptions,
  DocumentSyncRouteRateLimitResult,
  InMemoryDocumentSyncRouteRateLimiter,
} from "./route-rate-limit";
export {
  buildDocumentSyncRouteIdempotencyKey,
  createInMemoryDocumentSyncRouteIdempotencyStore,
  evaluateDocumentSyncRouteIdempotency,
  normalizeDocumentSyncRouteIdempotencyKey,
  summarizeDocumentSyncRouteIdempotency,
} from "./route-idempotency";
export type {
  DocumentSyncRouteIdempotencyResult,
  InMemoryDocumentSyncRouteIdempotencyStore,
} from "./route-idempotency";
export {
  buildDocumentSyncRouteTelemetryReport,
  createInMemoryDocumentSyncRouteTelemetry,
  recordDocumentSyncRouteTelemetryEvent,
  redactDocumentSyncRouteTelemetryEvent,
} from "./route-telemetry";
export type {
  DocumentSyncRouteTelemetryEvent,
  DocumentSyncRouteTelemetryEventType,
  InMemoryDocumentSyncRouteTelemetry,
} from "./route-telemetry";
export type {
  DocumentSyncCandidate,
  DocumentSyncConflict,
  DocumentSyncConflictReason,
  DocumentSyncCurrentState,
  DocumentSyncDecision,
  DocumentSyncDecisionStatus,
  DocumentSyncIntegrityLock,
  DocumentSyncLifecycle,
  DocumentSyncOperationKind,
  DocumentSyncPolicyErrorCode,
  DocumentSyncResponseShape,
  DocumentSyncRiskFlag,
  DocumentSyncSafeSummary,
  DocumentSyncServerContext,
} from "./types";
