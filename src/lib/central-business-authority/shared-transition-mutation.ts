"use client";

import type {
  AppDataDurabilityResult,
  AppDataTransition,
} from "@/lib/app-data-durability";
import { stableStringifySnapshot } from "@/lib/document-integrity/snapshots";
import type { AppData } from "@/lib/types";
import { centralBusinessReceiptServerPayload } from "./central-receipt-materialization";
import {
  isSharedDocumentDraft,
  sharedDraftServerPayload,
} from "./shared-document-drafts";
import { CENTRAL_BUSINESS_ATOMIC_BATCH_MAX_OPERATIONS } from "./batch-contract";
import {
  mutateCentralBusinessBatchFromBrowser,
  type CentralBusinessBrowserBatchMutationInput,
} from "./batch-mutation-client";
import {
  drainCentralBusinessDurableQueue,
  enqueueCentralBusinessBatch,
  loadCentralBusinessDurableQueue,
  withCentralBusinessQueueLock,
  discardCentralBusinessOperation,
  type CentralBusinessQueueStorage,
} from "./durable-queue";
import type { CentralBusinessEventsAppDataSyncResult } from "./events-app-data-sync";
import { mutateCentralBusinessFromBrowser } from "./mutation-client";
import type {
  CentralBusinessEntityType,
  CentralBusinessJson,
} from "./mutation-command";
import {
  fetchCentralBusinessAuthorityStatusFromBrowser,
  type CentralBusinessAuthorityStatusResult,
} from "./status-client";

export type SharedTransitionResult<T> =
  { ok: true; value: T } | { ok: false; error: string };
type Mutation = Omit<
  CentralBusinessBrowserBatchMutationInput,
  "expectedVersion" | "idempotencyKey"
> & { existed: boolean };

/** Only explicitly selected operational collections may be published, never a fiscal invoice. */
export function sharedTransitionMutations(
  before: AppData,
  after: AppData,
): Mutation[] {
  const mutations: Mutation[] = [];
  const collections = [
    ["customer", before.customers, after.customers],
    ["supplier", before.suppliers, after.suppliers],
    ["product", before.products, after.products],
    ["expense", before.expenses, after.expenses],
    ["user_reminder", before.userReminders, after.userReminders],
    [
      "quote",
      before.documents.filter((d) => d.type === "presupuesto"),
      after.documents.filter((d) => d.type === "presupuesto"),
    ],
    [
      "receipt",
      before.documents.filter(
        (d) => d.type === "recibo" && !isSharedDocumentDraft(d),
      ),
      after.documents.filter(
        (d) => d.type === "recibo" && !isSharedDocumentDraft(d),
      ),
    ],
    [
      "document_draft",
      before.documents.filter(isSharedDocumentDraft),
      after.documents.filter(isSharedDocumentDraft),
    ],
  ] as const;
  for (const [entityType, previous, next] of collections) {
    const old = new Map<string, unknown>(
      previous.map((entry) => [entry.id, entry]),
    );
    const ids = new Set(next.map((entry) => entry.id));
    for (const entry of next) {
      if (
        old.has(entry.id) &&
        stableStringifySnapshot(old.get(entry.id)) ===
          stableStringifySnapshot(entry)
      )
        continue;
      const payload =
        entityType === "receipt"
          ? centralBusinessReceiptServerPayload(
              entry as AppData["documents"][number],
            )
          : entityType === "document_draft"
            ? sharedDraftServerPayload(entry as AppData["documents"][number])
            : entry;
      mutations.push({
        entityType,
        entityId: entry.id,
        operationKind: "upsert",
        existed: old.has(entry.id),
        payload: JSON.parse(JSON.stringify(payload)) as CentralBusinessJson,
      });
    }
    for (const entityId of old.keys()) {
      if (!ids.has(entityId))
        mutations.push({
          entityType,
          entityId,
          operationKind: "delete",
          existed: true,
          payload: null,
        });
    }
  }
  return mutations;
}

export interface SharedTransitionDependencies<T> {
  getCurrentData(): AppData;
  prepare(data: AppData, now: string): AppDataTransition<T>;
  commit(
    expected: AppData,
    transition: AppDataTransition<T>,
  ): Promise<AppDataDurabilityResult<T>>;
  sync(): Promise<CentralBusinessEventsAppDataSyncResult>;
  isCurrent(): boolean;
  fetchStatus?: () => Promise<CentralBusinessAuthorityStatusResult>;
  mutate?: typeof mutateCentralBusinessFromBrowser;
  mutateBatch?: typeof mutateCentralBusinessBatchFromBrowser;
  storage?: CentralBusinessQueueStorage;
  now?: () => string;
  createId?: () => string;
  /** Only an explicit Save may publish an old, previously local draft. */
  allowUnpublishedDraft?: boolean;
}

export async function commitSharedTransition<T>(
  ownerScope: string,
  deps: SharedTransitionDependencies<T>,
): Promise<SharedTransitionResult<T>> {
  try {
    if (!deps.isCurrent()) throw new Error("La empresa activa ha cambiado.");
    // Retry the SAME durable identities after an ambiguous response before
    // preparing another command. Never strand a saved request behind a new ID.
    if (
      loadCentralBusinessDurableQueue(ownerScope, deps.storage).operations
        .length
    ) {
      const recovered = await withCentralBusinessQueueLock(ownerScope, () =>
        drainCentralBusinessDurableQueue({
          ownerScope,
          storage: deps.storage,
          mutate:
            deps.mutate ??
            ((mutation) =>
              mutateCentralBusinessFromBrowser(mutation, {
                expectedOwnerScope: ownerScope,
              })),
          mutateBatch:
            deps.mutateBatch ??
            ((batch) =>
              mutateCentralBusinessBatchFromBrowser(batch, {
                expectedOwnerScope: ownerScope,
              })),
          now: deps.now,
        }),
      );
      if (recovered.state.operations.length)
        throw new Error(
          "Queda un cambio anterior pendiente de confirmar. Reintenta con conexión antes de guardar otro.",
        );
    }
    const sync = await deps.sync();
    if (!sync.ok || sync.hasMore)
      return {
        ok: false,
        error:
          "Quedan cambios centrales por recibir. Sincroniza antes de guardar este cambio.",
      };
    let timer: ReturnType<typeof setTimeout> | undefined;
    let status: CentralBusinessAuthorityStatusResult;
    try {
      status = await Promise.race([
        (deps.fetchStatus ?? fetchCentralBusinessAuthorityStatusFromBrowser)(),
        new Promise<CentralBusinessAuthorityStatusResult>((resolve) => {
          timer = setTimeout(
            () =>
              resolve({
                ok: false,
                status: 0,
                code: "STATUS_TIMEOUT",
                message: "Sin conexión central.",
              }),
            3000,
          );
        }),
      ]);
    } finally {
      clearTimeout(timer);
    }
    if (!status.ok || !status.summary.writesPossible || !deps.isCurrent())
      return {
        ok: false,
        error:
          "No se pudo confirmar el servidor o la empresa activa. No se ha aplicado ningún cambio.",
      };
    return await withCentralBusinessQueueLock(ownerScope, async () => {
      if (!deps.isCurrent()) throw new Error("La empresa activa ha cambiado.");
      const before = deps.getCurrentData();
      const now = (deps.now ?? (() => new Date().toISOString()))();
      const transition = deps.prepare(before, now);
      const prepared = sharedTransitionMutations(before, transition.data);
      if (prepared.length === 0) return { ok: true, value: transition.value };
      if (prepared.length > CENTRAL_BUSINESS_ATOMIC_BATCH_MAX_OPERATIONS)
        throw new Error(
          "La operación afecta a más de 100 fichas. Reduce la selección para guardarla como una única operación segura.",
        );
      const queue = loadCentralBusinessDurableQueue(ownerScope, deps.storage);
      const batchId = `CENTRAL_SHARED:${(deps.createId ?? (() => crypto.randomUUID()))()}`;
      const mutations = prepared.map((entry, index) => {
        const key = `${entry.entityType}:${entry.entityId}`;
        const known = queue.entityVersions[key];
        if (
          queue.operations.some(
            (op) => `${op.input.entityType}:${op.input.entityId}` === key,
          )
        )
          throw new Error(
            "Una ficha afectada ya tiene un cambio pendiente de confirmar. Sincroniza antes de reintentarlo.",
          );
        if (
          (entry.existed &&
            !known &&
            !(
              deps.allowUnpublishedDraft &&
              entry.entityType === "document_draft" &&
              entry.operationKind === "upsert"
            )) ||
          known?.deleted ||
          (!entry.existed && known)
        )
          throw new Error(
            "Falta recibir la versión central de una ficha. Sincroniza antes de reintentarlo.",
          );
        return {
          entityType: entry.entityType as CentralBusinessEntityType,
          entityId: entry.entityId,
          operationKind: entry.operationKind,
          payload: entry.payload,
          expectedVersion: known?.version ?? 0,
          idempotencyKey: `${batchId}:${index}`,
        };
      });
      enqueueCentralBusinessBatch({
        ownerScope,
        batchId,
        mutations,
        storage: deps.storage,
        now: () => now,
      });
      const drained = await drainCentralBusinessDurableQueue({
        ownerScope,
        storage: deps.storage,
        mutate:
          deps.mutate ??
          ((mutation) =>
            mutateCentralBusinessFromBrowser(mutation, {
              expectedOwnerScope: ownerScope,
            })),
        mutateBatch:
          deps.mutateBatch ??
          ((batch) =>
            mutateCentralBusinessBatchFromBrowser(batch, {
              expectedOwnerScope: ownerScope,
            })),
        now: deps.now,
      });
      const pending = drained.state.operations.filter(
        (op) => op.batchId === batchId,
      );
      if (pending.length) {
        // Definitive rejection is not an offline edit. Ambiguous requests retain their same identity.
        if (pending.every((op) => op.status !== "pending"))
          for (const op of pending)
            discardCentralBusinessOperation({
              ownerScope,
              operationId: op.operationId,
              storage: deps.storage,
            });
        return {
          ok: false,
          error:
            "El servidor no confirmó el cambio. No se ha aplicado nada localmente; sincroniza antes de reintentarlo.",
        };
      }
      if (!deps.isCurrent())
        return {
          ok: false,
          error:
            "El servidor guardó el cambio en su empresa original. Abre de nuevo esa empresa para verlo.",
        };
      const local = await deps.commit(before, transition);
      return local.status === "applied"
        ? { ok: true, value: local.value }
        : {
            ok: false,
            error:
              "El cambio está guardado en el servidor, pero la caché no pudo actualizarse. Sincroniza para recibirlo; no se ha perdido.",
          };
    });
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "No se pudo confirmar el cambio central.",
    };
  }
}
