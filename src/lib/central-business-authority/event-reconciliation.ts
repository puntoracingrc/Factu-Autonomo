import type { CentralBusinessEventsAppDataSyncResult } from "./events-app-data-sync";

export const CENTRAL_BUSINESS_EVENT_RECONCILIATION =
  "CENTRAL_BUSINESS_EVENT_RECONCILIATION_V1" as const;

export type CentralBusinessEventReconciliationResult =
  | {
      ok: true;
      schema: typeof CENTRAL_BUSINESS_EVENT_RECONCILIATION;
      pages: number;
      pulled: number;
      applied: number;
      skipped: number;
      nextSequence: number;
    }
  | {
      ok: false;
      schema: typeof CENTRAL_BUSINESS_EVENT_RECONCILIATION;
      code: string;
      message: string;
      retryable: boolean;
      nextSequence: number;
    };

export interface CentralBusinessEventReconciliationDependencies {
  rewind(): Promise<{ lastAppliedEventSequence: number }>;
  hasPendingOperations(): boolean;
  syncPage(): Promise<CentralBusinessEventsAppDataSyncResult>;
}

function failed(input: {
  code: string;
  message: string;
  nextSequence: number;
  retryable?: boolean;
}): CentralBusinessEventReconciliationResult {
  return {
    ok: false,
    schema: CENTRAL_BUSINESS_EVENT_RECONCILIATION,
    code: input.code,
    message: input.message,
    retryable: input.retryable ?? false,
    nextSequence: input.nextSequence,
  };
}

export async function reconcileCentralBusinessEventHistory(
  input: { maxPages?: number },
  dependencies: CentralBusinessEventReconciliationDependencies,
): Promise<CentralBusinessEventReconciliationResult> {
  const maxPages = Math.min(Math.max(input.maxPages ?? 100, 1), 100);
  let rewound: { lastAppliedEventSequence: number };
  try {
    rewound = await dependencies.rewind();
  } catch (error) {
    return failed({
      code: "CENTRAL_BUSINESS_RECONCILIATION_REWIND_FAILED",
      message:
        error instanceof Error
          ? error.message
          : "No se pudo preparar la relectura central.",
      nextSequence: 0,
    });
  }

  let pulled = 0;
  let applied = 0;
  let skipped = 0;
  let nextSequence = rewound.lastAppliedEventSequence;
  for (let page = 1; page <= maxPages; page += 1) {
    let hasPendingOperations: boolean;
    try {
      hasPendingOperations = dependencies.hasPendingOperations();
    } catch (error) {
      return failed({
        code: "CENTRAL_BUSINESS_RECONCILIATION_STATE_FAILED",
        message:
          error instanceof Error
            ? error.message
            : "No se pudo comprobar la cola central local.",
        nextSequence,
      });
    }
    if (hasPendingOperations) {
      return failed({
        code: "CENTRAL_BUSINESS_RECONCILIATION_PENDING_OPERATIONS",
        message:
          "Ha aparecido un cambio local pendiente. La relectura central se ha detenido.",
        nextSequence,
      });
    }

    let result: CentralBusinessEventsAppDataSyncResult;
    try {
      result = await dependencies.syncPage();
    } catch (error) {
      return failed({
        code: "CENTRAL_BUSINESS_RECONCILIATION_SYNC_FAILED",
        message:
          error instanceof Error
            ? error.message
            : "No se pudo releer el historial central.",
        nextSequence,
        retryable: true,
      });
    }
    if (!result.ok) {
      return failed({
        code: result.code,
        message: result.message,
        retryable: result.retryable,
        nextSequence: result.nextSequence,
      });
    }
    pulled += result.pulled;
    applied += result.applied;
    skipped += result.skipped;
    nextSequence = result.nextSequence;
    if (!result.hasMore) {
      return {
        ok: true,
        schema: CENTRAL_BUSINESS_EVENT_RECONCILIATION,
        pages: page,
        pulled,
        applied,
        skipped,
        nextSequence,
      };
    }
  }

  return failed({
    code: "CENTRAL_BUSINESS_RECONCILIATION_PAGE_LIMIT",
    message:
      "El historial central supera el limite seguro de esta comprobacion. Vuelve a intentarlo.",
    nextSequence,
    retryable: true,
  });
}
