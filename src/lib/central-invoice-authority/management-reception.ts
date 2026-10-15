import type { AppDataDurabilityResult } from "@/lib/app-data-durability";
import type { AppData, Document } from "@/lib/types";
import type { CentralInvoiceAuthorityEventsAppDataSyncValue } from "./events-app-data-sync";

type Reception = AppDataDurabilityResult<CentralInvoiceAuthorityEventsAppDataSyncValue>;

function canRetryReception(result: Reception): boolean {
  // A concurrent operational pull can commit while the invoice request is in
  // flight. Start a NEW pull against the new baseline, never reuse that stale
  // full-document transition or repeat the mutation that already committed.
  if (result.status === "blocked") return result.reason === "stale_precondition";
  if (result.status !== "applied" || result.value.localSync.ok) return false;
  const sync = result.value.localSync;
  return sync.status === 0 || sync.status === 408 || sync.status >= 500;
}

export async function receiveConfirmedCentralInvoiceChange(input: {
  action: "update" | "delete";
  document: Document;
  eventId: string;
  isCurrent: () => boolean;
  getCurrentData: () => AppData;
  syncEvents: (data: AppData, options: { eventId: string }) => Promise<Reception>;
}): Promise<Document | null> {
  const link = input.document.centralInvoiceAuthority;
  if (!link) throw new Error("Falta la identidad central de la factura.");

  for (let attempt = 0; attempt < 3; attempt += 1) {
    if (!input.isCurrent()) break;
    const received = await input.syncEvents(input.getCurrentData(), { eventId: input.eventId });
    if (!input.isCurrent()) break;
    if (received.status === "applied" && received.value.localSync.ok) {
      const documents = input.getCurrentData().documents;
      const current = documents.find((item) => item.id === input.document.id);
      if (input.action === "delete") {
        const sameIdentity = documents.some((item) =>
          item.centralInvoiceAuthority?.serverDocumentId === link.serverDocumentId &&
          item.centralInvoiceAuthority.identityId === link.identityId);
        if (!current && !sameIdentity) return null;
      } else if (current?.centralInvoiceAuthority?.serverDocumentId === link.serverDocumentId &&
          current.centralInvoiceAuthority.identityId === link.identityId &&
          current.centralInvoiceAuthority.documentVersion > link.documentVersion) {
        return current;
      }
    }
    if (!canRetryReception(received)) break;
  }

  if (!input.isCurrent()) {
    throw new Error("El cambio se confirmó en servidor, pero has cambiado de empresa. Vuelve a abrirla.");
  }
  throw new Error(input.action === "delete"
    ? "El servidor confirmó el borrado, pero falta recibirlo aquí. Pulsa Sincronizar ahora; no hace falta volver a borrar."
    : "El servidor confirmó la corrección, pero falta recibirla aquí. Pulsa Sincronizar ahora; no emitas otra factura.");
}
