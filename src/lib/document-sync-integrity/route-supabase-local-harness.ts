import {
  buildDisabledRouteAuthContext,
} from "./route-auth-context";
import {
  createDocumentSyncRouteHandler,
  type DocumentSyncRouteHandler,
} from "./route-handler";
import {
  createInMemoryDocumentSyncRouteIdempotencyStore,
  type InMemoryDocumentSyncRouteIdempotencyStore,
} from "./route-idempotency";
import {
  createInMemoryDocumentSyncRouteRateLimiter,
  type InMemoryDocumentSyncRouteRateLimiter,
} from "./route-rate-limit";
import {
  DOCUMENT_SYNC_ROUTE_SHELL_ENABLED_KEY,
  DOCUMENT_SYNC_ROUTE_SHELL_PRIVATE_MODE_KEY,
  DOCUMENT_SYNC_ROUTE_SHELL_PRIVATE_MODE_LOCAL,
  evaluateDocumentSyncRouteShellFlag,
} from "./route-shell-flag";
import {
  createInMemoryDocumentSyncRouteTelemetry,
  type InMemoryDocumentSyncRouteTelemetry,
} from "./route-telemetry";
import {
  createDocumentSyncServerService,
  type DocumentSyncServerService,
} from "./server-sync-service";
import {
  createSupabaseLocalStagingDocumentSyncAdapter,
} from "./supabase-adapter";
import {
  type DocumentSyncSupabaseClientLike,
} from "./supabase-contract";
import {
  createSupabaseDocumentSyncStore,
} from "./supabase-store";
import type { DocumentSyncStoreScope } from "./sync-store";

// PHASE2C51_SUPABASE_LOCAL_SYNC_HANDLER_HARNESS_OPT_IN_V1
assertServerOnlyModule();

export interface DocumentSyncSupabaseLocalHandlerHarnessMetadata {
  mode?: "local_staging_only";
  databaseTarget?: "local";
  remote?: false;
  databaseUrl?: string;
}

export interface DocumentSyncSupabaseLocalHandlerHarnessInput {
  serverScope: DocumentSyncStoreScope;
  metadata?: DocumentSyncSupabaseLocalHandlerHarnessMetadata;
  client?: DocumentSyncSupabaseClientLike;
  service?: DocumentSyncServerService;
  rateLimiter?: InMemoryDocumentSyncRouteRateLimiter;
  idempotencyStore?: InMemoryDocumentSyncRouteIdempotencyStore;
  telemetry?: InMemoryDocumentSyncRouteTelemetry;
  now?: () => string;
  idFactory?: (prefix: string) => string;
  requestIdFactory?: () => string;
}

export interface DocumentSyncSupabaseLocalHandlerHarness {
  handler: DocumentSyncRouteHandler;
  service: DocumentSyncServerService;
  mode: "local_staging_only";
  databaseTarget: "local";
  remote: false;
  syntheticOnly: true;
}

export class DocumentSyncSupabaseLocalHandlerHarnessError extends Error {
  readonly code:
    | "INVALID_HARNESS_MODE"
    | "REMOTE_HARNESS_REJECTED"
    | "NON_LOCAL_HARNESS_URL"
    | "MISSING_HARNESS_SCOPE"
    | "MISSING_HARNESS_SERVICE";

  constructor(
    code: DocumentSyncSupabaseLocalHandlerHarnessError["code"],
    message: string,
  ) {
    super(message);
    this.name = "DocumentSyncSupabaseLocalHandlerHarnessError";
    this.code = code;
  }
}

const routeShellEnabledEnv = {
  [DOCUMENT_SYNC_ROUTE_SHELL_ENABLED_KEY]: "true",
  [DOCUMENT_SYNC_ROUTE_SHELL_PRIVATE_MODE_KEY]:
    DOCUMENT_SYNC_ROUTE_SHELL_PRIVATE_MODE_LOCAL,
};

const localHosts = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

function assertServerOnlyModule() {
  if (typeof window !== "undefined") {
    throw new Error(
      "El harness Supabase local de document sync solo puede cargarse en servidor.",
    );
  }
}

function isSynthetic(value: string | undefined): boolean {
  return typeof value === "string" && value.startsWith("SYNTHETIC_ONLY_");
}

function assertSyntheticScope(scope: DocumentSyncStoreScope): void {
  if (!isSynthetic(scope.userId) || (scope.scopeId && !isSynthetic(scope.scopeId))) {
    throw new DocumentSyncSupabaseLocalHandlerHarnessError(
      "MISSING_HARNESS_SCOPE",
      "El harness local requiere scope sintetico derivado por servidor.",
    );
  }
}

function assertLocalUrl(value: string): void {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new DocumentSyncSupabaseLocalHandlerHarnessError(
      "NON_LOCAL_HARNESS_URL",
      "La URL del harness local no es valida.",
    );
  }
  if (!localHosts.has(parsed.hostname)) {
    throw new DocumentSyncSupabaseLocalHandlerHarnessError(
      "NON_LOCAL_HARNESS_URL",
      "La URL del harness debe apuntar a localhost.",
    );
  }
}

function assertHarnessMetadata(
  metadata: DocumentSyncSupabaseLocalHandlerHarnessMetadata = {},
): void {
  if (metadata.mode && metadata.mode !== "local_staging_only") {
    throw new DocumentSyncSupabaseLocalHandlerHarnessError(
      "INVALID_HARNESS_MODE",
      "El harness solo permite local_staging_only.",
    );
  }
  if (metadata.databaseTarget && metadata.databaseTarget !== "local") {
    throw new DocumentSyncSupabaseLocalHandlerHarnessError(
      "INVALID_HARNESS_MODE",
      "El harness solo permite destino local.",
    );
  }
  if (metadata.remote !== undefined && metadata.remote !== false) {
    throw new DocumentSyncSupabaseLocalHandlerHarnessError(
      "REMOTE_HARNESS_REJECTED",
      "El harness rechaza destinos no locales.",
    );
  }
  if (metadata.databaseUrl) assertLocalUrl(metadata.databaseUrl);
}

function resolveService(
  input: DocumentSyncSupabaseLocalHandlerHarnessInput,
): DocumentSyncServerService {
  if (input.service) return input.service;
  if (!input.client) {
    throw new DocumentSyncSupabaseLocalHandlerHarnessError(
      "MISSING_HARNESS_SERVICE",
      "El harness requiere servicio o cliente local inyectado.",
    );
  }
  const store = createSupabaseDocumentSyncStore(input.client, {
    safetyMode: "local_staging_only",
    databaseTarget: "local",
    remote: false,
    serverScope: input.serverScope,
    now: input.now,
    idFactory: input.idFactory,
  });
  const adapter = createSupabaseLocalStagingDocumentSyncAdapter(store, {
    serverScope: input.serverScope,
  });
  return createDocumentSyncServerService({ adapter });
}

export function createDocumentSyncSupabaseLocalHandlerHarness(
  input: DocumentSyncSupabaseLocalHandlerHarnessInput,
): DocumentSyncSupabaseLocalHandlerHarness {
  assertSyntheticScope(input.serverScope);
  assertHarnessMetadata(input.metadata);
  const service = resolveService(input);

  return {
    mode: "local_staging_only",
    databaseTarget: "local",
    remote: false,
    syntheticOnly: true,
    service,
    handler: createDocumentSyncRouteHandler(
      {
        evaluateShellFlag: () => evaluateDocumentSyncRouteShellFlag(routeShellEnabledEnv),
        evaluateLocalExecution: () => ({
          enabled: true,
          reason: "supabase_local_harness_allowed",
        }),
        rateLimiter:
          input.rateLimiter ??
          createInMemoryDocumentSyncRouteRateLimiter({
            limit: 20,
            windowMs: 60_000,
          }),
        idempotencyStore:
          input.idempotencyStore ??
          createInMemoryDocumentSyncRouteIdempotencyStore(),
        telemetry: input.telemetry ?? createInMemoryDocumentSyncRouteTelemetry(),
        authContextFactory: (authInput) =>
          buildDisabledRouteAuthContext({
            ...authInput,
            mode: "synthetic_local_test",
            syntheticUserId: input.serverScope.userId,
            syntheticScopeId: input.serverScope.scopeId,
          }),
        serviceFactory: () => service,
        requestIdFactory: input.requestIdFactory,
      },
      {
        completionCode: "route_supabase_local_harness_completed",
        rejectedCode: "ROUTE_SUPABASE_LOCAL_HARNESS_REJECTED",
      },
    ),
  };
}
