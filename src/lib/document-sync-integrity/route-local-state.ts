import {
  createDocumentSyncRouteFakeService,
  type DocumentSyncRouteFakeRuntime,
} from "./route-fake-adapter";
import {
  createInMemoryDocumentSyncRouteIdempotencyStore,
  type InMemoryDocumentSyncRouteIdempotencyStore,
} from "./route-idempotency";
import {
  createInMemoryDocumentSyncRouteRateLimiter,
  type InMemoryDocumentSyncRouteRateLimiter,
} from "./route-rate-limit";
import {
  createInMemoryDocumentSyncRouteTelemetry,
  type InMemoryDocumentSyncRouteTelemetry,
} from "./route-telemetry";

// PHASE2C39_SYNC_ROUTE_LOCAL_FAKE_EXECUTION_BOUNDARY_V1
assertServerOnlyModule();

const routeRateLimiter = createInMemoryDocumentSyncRouteRateLimiter({
  limit: 12,
  windowMs: 60_000,
});
const routeIdempotency = createInMemoryDocumentSyncRouteIdempotencyStore();
const routeTelemetry = createInMemoryDocumentSyncRouteTelemetry();
let routeFakeRuntime: DocumentSyncRouteFakeRuntime | undefined;

function assertServerOnlyModule() {
  if (typeof window !== "undefined") {
    throw new Error(
      "El estado local/fake de document sync route solo vive en servidor.",
    );
  }
}

export function getDocumentSyncRouteRateLimiter():
  InMemoryDocumentSyncRouteRateLimiter {
  return routeRateLimiter;
}

export function getDocumentSyncRouteIdempotencyStore():
  InMemoryDocumentSyncRouteIdempotencyStore {
  return routeIdempotency;
}

export function getDocumentSyncRouteTelemetry(): InMemoryDocumentSyncRouteTelemetry {
  return routeTelemetry;
}

export function getDocumentSyncRouteFakeRuntime(): DocumentSyncRouteFakeRuntime {
  routeFakeRuntime ??= createDocumentSyncRouteFakeService();
  return routeFakeRuntime;
}

export function resetDocumentSyncRouteLocalStateForTests(): void {
  routeFakeRuntime = undefined;
  routeRateLimiter.reset();
  routeIdempotency.reset();
  routeTelemetry.reset();
}
