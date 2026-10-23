import type { QuickIntent, QuickReceipt } from "@/lib/quick-invoicing/model";
import type { QuickCollectionIntent } from "@/lib/quick-invoicing/collections-model";
export interface QuickLocalState {
  deviceToken?: string;
  intent?: QuickIntent;
  pending?: QuickIntent;
  receipt?: QuickReceipt;
  step?: number;
  collectionDraft?: QuickCollectionIntent;
  collectionPending?: QuickCollectionIntent;
  collectionInvoice?: { operationId: string; amount: number };
}
const DB = "factu-quick-private-v1";
let database: Promise<IDBDatabase> | undefined;
function open() {
  return database ??= new Promise<IDBDatabase>((resolve,reject) => {
    const request = indexedDB.open(DB,1);
    request.onupgradeneeded = () => request.result.createObjectStore("state");
    request.onerror = () => reject(new Error("No se pudo abrir el borrador de este dispositivo."));
    request.onsuccess = () => resolve(request.result);
    request.onblocked = () => reject(new Error("Cierra otras ventanas de Factu Rápido para continuar."));
  });
}
export async function readLocal(key: string): Promise<QuickLocalState | undefined> {
  const db = await open();
  return new Promise((resolve,reject) => {
    const request = db.transaction("state").objectStore("state").get(key);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
export async function saveLocal(key: string, state: QuickLocalState): Promise<void> {
  const db = await open();
  return new Promise((resolve,reject) => {
    const transaction = db.transaction("state","readwrite");
    transaction.objectStore("state").put(state,key);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(new Error("No se pudo guardar el borrador del móvil. No borres datos; conserva esta pantalla."));
    transaction.onabort = transaction.onerror;
  });
}
