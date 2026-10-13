import type { CentralBusinessEventsAppDataSyncResult } from "./events-app-data-sync";

export const CENTRAL_BUSINESS_PREWRITE_EVENT_LIMIT = 500;
const MAX_PAGES = 20;
const MAX_STALE_RETRIES = 2;

/** Read every pending page before preparing a write. Never skip a conflict. */
export async function syncCentralBusinessBeforeWrite(
  sync: () => Promise<CentralBusinessEventsAppDataSyncResult>,
  isCurrent: () => boolean = () => true,
): Promise<CentralBusinessEventsAppDataSyncResult> {
  let previousSequence: number | undefined;
  let staleRetries = 0;
  for (let page = 0; page < MAX_PAGES; ) {
    if (!isCurrent())
      return failure(
        "WORKSPACE_CHANGED",
        "La empresa activa ha cambiado.",
        previousSequence ?? 0,
      );
    const result = await sync();
    if (!isCurrent())
      return failure(
        "WORKSPACE_CHANGED",
        "La empresa activa ha cambiado.",
        previousSequence ?? 0,
      );
    if (!result.ok) {
      // A background read can win the local CAS. Reread, do not replace it.
      if (
        result.code === "CENTRAL_BUSINESS_LOCAL_WRITE_BLOCKED" &&
        result.retryable &&
        staleRetries < MAX_STALE_RETRIES
      ) {
        staleRetries += 1;
        continue;
      }
      return result;
    }
    if (!result.hasMore) return result;
    if (
      previousSequence !== undefined &&
      result.nextSequence <= previousSequence
    )
      return failure(
        "CENTRAL_BUSINESS_PREWRITE_NO_PROGRESS",
        "La sincronización no ha podido avanzar. La edición sigue pendiente y no se ha sobrescrito nada.",
        result.nextSequence,
      );
    previousSequence = result.nextSequence;
    page += 1;
  }
  return failure(
    "CENTRAL_BUSINESS_PREWRITE_PAGE_LIMIT",
    "La sincronización sigue recibiendo cambios. Espera un momento y vuelve a guardar; la edición sigue en este formulario.",
    previousSequence ?? 0,
  );
}

function failure(
  code: string,
  message: string,
  nextSequence: number,
): CentralBusinessEventsAppDataSyncResult {
  return {
    ok: false,
    schema: "CENTRAL_BUSINESS_EVENTS_APP_DATA_SYNC_V1",
    code,
    message,
    nextSequence,
    retryable: code !== "WORKSPACE_CHANGED",
  };
}
