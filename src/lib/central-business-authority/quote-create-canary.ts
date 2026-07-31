"use client";

import type { AppDataDurabilityResult } from "@/lib/app-data-durability";
import { editableQuoteWithLocalStatus } from "@/lib/document-integrity/quote-status";
import { stableStringifySnapshot } from "@/lib/document-integrity/snapshots";
import type { AppData, Document } from "@/lib/types";

import {
  withCentralBusinessQueueLock,
} from "./durable-queue";
import type { CentralBusinessEventsAppDataSyncResult } from "./events-app-data-sync";
import type { CentralBusinessJson } from "./mutation-command";
import {
  preflightCentralBusinessNonfiscalSeries,
  type CentralBusinessNonfiscalSeriesPreflightResult,
} from "./nonfiscal-document-series-preflight";
import {
  mutateCentralBusinessNumberedDocumentFromBrowser,
  type CentralBusinessNumberedDocumentBrowserInput,
  type CentralBusinessNumberedDocumentBrowserResult,
  type CentralBusinessNumberedDocumentCreateBrowserResult,
} from "./numbered-document-client";
import {
  acknowledgeCentralBusinessNumberedDocument,
  drainCentralBusinessNumberedDocumentJournal,
  enqueueCentralBusinessNumberedDocumentCreate,
  loadCentralBusinessNumberedDocumentJournal,
  type CentralBusinessNumberedDocumentJournalStorage,
} from "./numbered-document-journal";
import {
  fetchCentralBusinessAuthorityStatusFromBrowser,
  type CentralBusinessAuthorityStatusResult,
} from "./status-client";

export const CENTRAL_QUOTE_CREATE_CANARY =
  "CENTRAL_QUOTE_CREATE_CANARY_V1";

export type CentralQuoteDraft = Omit<
  Document,
  "id" | "number" | "createdAt" | "updatedAt"
> & { type: "presupuesto" };

export type CentralQuoteCreateResult =
  | {
      ok: true;
      document: Document;
      delivery: "local" | "central_confirmed" | "central_recovered";
    }
  | { ok: false; error: string };

export interface CentralQuoteCreateCanaryEnvironment {
  enabled?: string;
  userIds?: string;
}

export interface CentralQuoteCreateCanaryDependencies {
  getCurrentData(): AppData;
  addDocumentFallback(draft: CentralQuoteDraft): Document;
  addCentralDocumentDurably(
    expected: AppData,
    entityType: "quote",
    confirmation: CentralBusinessNumberedDocumentCreateBrowserResult,
  ): Promise<AppDataDurabilityResult<Document>>;
  syncEventsBeforeWrite?: () => Promise<CentralBusinessEventsAppDataSyncResult>;
  fetchStatus?: () => Promise<CentralBusinessAuthorityStatusResult>;
  preflight?: typeof preflightCentralBusinessNonfiscalSeries;
  mutate?: (
    input: CentralBusinessNumberedDocumentBrowserInput,
  ) => Promise<CentralBusinessNumberedDocumentBrowserResult>;
  storage?: CentralBusinessNumberedDocumentJournalStorage;
  createId?: () => string;
  now?: () => string;
  statusTimeoutMs?: number;
  withLock?: typeof withCentralBusinessQueueLock;
  environment?: CentralQuoteCreateCanaryEnvironment;
}

const publicEnvironment: CentralQuoteCreateCanaryEnvironment = {
  enabled:
    process.env.NEXT_PUBLIC_CENTRAL_BUSINESS_QUOTE_CREATE_CANARY_ENABLED,
  userIds:
    process.env.NEXT_PUBLIC_CENTRAL_BUSINESS_QUOTE_CREATE_CANARY_USER_IDS,
};

function values(value: string | undefined): Set<string> {
  return new Set(
    (value ?? "")
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean),
  );
}

export function isCentralQuoteCreateCanaryEnabledForUser(
  userId: string | null | undefined,
  environment: CentralQuoteCreateCanaryEnvironment = publicEnvironment,
): boolean {
  return (
    environment.enabled?.trim().toLowerCase() === "true" &&
    isCentralQuoteCreateCanaryCohortUser(userId, environment)
  );
}

function isCentralQuoteCreateCanaryCohortUser(
  userId: string | null | undefined,
  environment: CentralQuoteCreateCanaryEnvironment,
): userId is string {
  return (
    typeof userId === "string" &&
    values(environment.userIds).has(userId)
  );
}

function jsonObject(value: unknown): { [key: string]: CentralBusinessJson } {
  return JSON.parse(JSON.stringify(value)) as {
    [key: string]: CentralBusinessJson;
  };
}

function assertNewQuoteDraft(draft: CentralQuoteDraft) {
  if (
    draft.type !== "presupuesto" ||
    draft.rectification ||
    draft.centralInvoiceAuthority ||
    draft.verifactu ||
    draft.documentSnapshot ||
    draft.pdfSnapshot ||
    draft.snapshotSeal ||
    draft.legacyImportAttestation ||
    draft.legacyImportProvenance ||
    draft.appIssuedRecoveryAttestation
  ) {
    throw new Error("CENTRAL_QUOTE_DRAFT_INVALID");
  }
}

function buildPayloadWithoutNumber(
  draft: CentralQuoteDraft,
  id: string,
  now: string,
): { [key: string]: CentralBusinessJson } {
  assertNewQuoteDraft(draft);
  const provisional: Document = {
    ...draft,
    id,
    number: "CENTRAL-PENDING",
    createdAt: now,
    updatedAt: now,
  };
  const materialized =
    draft.status === "borrador"
      ? provisional
      : editableQuoteWithLocalStatus(provisional, now);
  const withoutNumber = jsonObject(materialized);
  delete withoutNumber.number;
  return withoutNumber;
}

function comparablePayload(payload: unknown): string {
  const normalized = jsonObject(payload);
  delete normalized.id;
  delete normalized.number;
  delete normalized.createdAt;
  delete normalized.updatedAt;
  delete normalized.issuedAt;
  delete normalized.sentAt;
  delete normalized.paidAt;
  delete normalized.acceptedAt;
  return stableStringifySnapshot(normalized);
}

async function statusWithTimeout(
  fetchStatus: () => Promise<CentralBusinessAuthorityStatusResult>,
  timeoutMs: number,
): Promise<CentralBusinessAuthorityStatusResult> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      fetchStatus(),
      new Promise<CentralBusinessAuthorityStatusResult>((resolve) => {
        timeout = setTimeout(
          () =>
            resolve({
              ok: false,
              status: 0,
              code: "CENTRAL_QUOTE_STATUS_TIMEOUT",
              message: "La comprobacion central tardo demasiado.",
            }),
          timeoutMs,
        );
      }),
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

async function commitConfirmation(
  dependencies: CentralQuoteCreateCanaryDependencies,
  confirmation: CentralBusinessNumberedDocumentCreateBrowserResult,
): Promise<AppDataDurabilityResult<Document>> {
  let last: AppDataDurabilityResult<Document> | null = null;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      last = await dependencies.addCentralDocumentDurably(
        dependencies.getCurrentData(),
        "quote",
        confirmation,
      );
    } catch {
      return { status: "blocked", reason: "transition_failed" };
    }
    if (
      last.status !== "blocked" ||
      last.reason !== "stale_precondition"
    ) {
      return last;
    }
  }
  return last ?? { status: "blocked", reason: "transition_failed" };
}

type ExistingJournalRecovery =
  | { status: "empty" }
  | {
      status: "recovered";
      document: Document;
      matchesCurrentDraft: boolean;
    }
  | { status: "blocked"; error: string };

async function recoverExistingJournalOperation(input: {
  ownerScope: string;
  intendedPayload: { [key: string]: CentralBusinessJson };
  dependencies: CentralQuoteCreateCanaryDependencies;
}): Promise<ExistingJournalRecovery> {
  const { dependencies } = input;
  const before = loadCentralBusinessNumberedDocumentJournal(
    input.ownerScope,
    dependencies.storage,
  );
  if (before.operations.length === 0) return { status: "empty" };

  const drained = await drainCentralBusinessNumberedDocumentJournal({
    ownerScope: input.ownerScope,
    mutate:
      dependencies.mutate ??
      mutateCentralBusinessNumberedDocumentFromBrowser,
    storage: dependencies.storage,
    now: dependencies.now,
  });
  if (drained.status !== "confirmed") {
    return {
      status: "blocked",
      error:
        drained.status === "retryable"
          ? "El presupuesto sigue protegido en la cola local porque no se pudo confirmar el servidor. Vuelve a intentarlo con conexion; se reutilizara la misma operacion."
          : "Hay un documento numerado pendiente de revision. No se creara otro hasta resolverlo.",
    };
  }
  if (drained.operation.input.entityType !== "quote") {
    return {
      status: "blocked",
      error:
        "Hay otro documento numerado pendiente de terminar en este dispositivo.",
    };
  }

  const local = await commitConfirmation(
    dependencies,
    drained.operation.confirmation,
  );
  if (local.status !== "applied") {
    return {
      status: "blocked",
      error:
        local.status === "indeterminate"
          ? "El servidor ya confirmo el presupuesto, pero el almacenamiento local requiere revision. No repitas el alta; recarga y vuelve a guardar para recuperarla."
          : "El servidor ya confirmo el presupuesto, pero este dispositivo no pudo incorporarlo sin conflicto. No repitas el alta.",
    };
  }

  try {
    acknowledgeCentralBusinessNumberedDocument({
      ownerScope: input.ownerScope,
      operationId: drained.operation.operationId,
      eventId: drained.operation.confirmation.eventId,
      contentHash: drained.operation.confirmation.contentHash,
      storage: dependencies.storage,
    });
  } catch {
    return {
      status: "blocked",
      error:
        "El presupuesto quedo guardado, pero falta cerrar su acuse local. Recarga y vuelve a guardar; no se creara otro numero.",
    };
  }

  return {
    status: "recovered",
    document: local.value,
    matchesCurrentDraft:
      comparablePayload(drained.operation.input.payloadWithoutNumber) ===
      comparablePayload(input.intendedPayload),
  };
}

function recoveryResult(
  recovery: ExistingJournalRecovery,
): CentralQuoteCreateResult | null {
  if (recovery.status === "empty") return null;
  if (recovery.status === "blocked") {
    return { ok: false, error: recovery.error };
  }
  if (!recovery.matchesCurrentDraft) {
    return {
      ok: false,
      error:
        `Se recupero el presupuesto ${recovery.document.number} que estaba pendiente. Revisa el listado y vuelve a guardar el presupuesto actual.`,
    };
  }
  return {
    ok: true,
    document: recovery.document,
    delivery: "central_recovered",
  };
}

function failureMessage(
  result: Extract<
    CentralBusinessNonfiscalSeriesPreflightResult,
    { ok: false }
  >,
): string {
  if (result.retryable) {
    return "No se pudo confirmar la serie central. No se asigno ningun numero; comprueba la conexion y vuelve a intentarlo.";
  }
  return result.message || "La serie central requiere revision antes de guardar.";
}

export async function createQuoteWithCentralCanary(input: {
  userId: string | null | undefined;
  draft: CentralQuoteDraft;
  dependencies: CentralQuoteCreateCanaryDependencies;
}): Promise<CentralQuoteCreateResult> {
  const { dependencies } = input;
  const environment = dependencies.environment ?? publicEnvironment;
  const canaryEnabled = isCentralQuoteCreateCanaryEnabledForUser(
    input.userId,
    environment,
  );
  const ownerScope = isCentralQuoteCreateCanaryCohortUser(
    input.userId,
    environment,
  )
    ? input.userId
    : null;
  const withLock = dependencies.withLock ?? withCentralBusinessQueueLock;
  const saveLocally = (): CentralQuoteCreateResult => {
    try {
      return {
        ok: true,
        document: dependencies.addDocumentFallback(input.draft),
        delivery: "local",
      };
    } catch {
      return { ok: false, error: "No se pudo guardar el presupuesto." };
    }
  };

  if (!canaryEnabled) {
    if (!ownerScope) return saveLocally();

    try {
      const state = loadCentralBusinessNumberedDocumentJournal(
        ownerScope,
        dependencies.storage,
      );
      if (state.operations.length === 0) return saveLocally();

      const previewPayload = buildPayloadWithoutNumber(
        input.draft,
        "central-quote-preview",
        "2000-01-01T00:00:00.000Z",
      );
      const pendingRecovery = await withLock(ownerScope, () =>
        recoverExistingJournalOperation({
          ownerScope,
          intendedPayload: previewPayload,
          dependencies,
        }),
      );
      const recovered = recoveryResult(pendingRecovery);
      if (recovered) return recovered;
    } catch {
      return {
        ok: false,
        error:
          "Hay una operacion numerada anterior que no se pudo revisar. No se guardara otro presupuesto hasta recuperarla.",
      };
    }
    return saveLocally();
  }

  if (!ownerScope) {
    return {
      ok: false,
      error: "El canario central no tiene un propietario valido.",
    };
  }

  try {
    const previewPayload = buildPayloadWithoutNumber(
      input.draft,
      "central-quote-preview",
      "2000-01-01T00:00:00.000Z",
    );
    const firstRecovery = await withLock(ownerScope, () =>
      recoverExistingJournalOperation({
        ownerScope,
        intendedPayload: previewPayload,
        dependencies,
      }),
    );
    const recovered = recoveryResult(firstRecovery);
    if (recovered) return recovered;

    const eventSync = await dependencies.syncEventsBeforeWrite?.();
    if (eventSync && !eventSync.ok) {
      return {
        ok: false,
        error:
          "No se pudieron aplicar todos los cambios centrales antes de numerar. Revisa la sincronizacion y vuelve a intentarlo.",
      };
    }

    const status = await statusWithTimeout(
      dependencies.fetchStatus ??
        fetchCentralBusinessAuthorityStatusFromBrowser,
      dependencies.statusTimeoutMs ?? 3_000,
    );
    if (!status.ok || !status.summary.writesPossible) {
      return {
        ok: false,
        error:
          "El servidor central no esta listo para asignar el numero. No se guardo el presupuesto.",
      };
    }

    return await withLock(ownerScope, async () => {
      const raceRecovery = await recoverExistingJournalOperation({
        ownerScope,
        intendedPayload: previewPayload,
        dependencies,
      });
      const recoveredAfterWait = recoveryResult(raceRecovery);
      if (recoveredAfterWait) return recoveredAfterWait;

      const baseline = dependencies.getCurrentData();
      const fiscalYear = Number(input.draft.date.slice(0, 4));
      const preflight = await (
        dependencies.preflight ??
        preflightCentralBusinessNonfiscalSeries
      )(
        {
          data: baseline,
          entityType: "quote",
          fiscalYear,
        },
        {
          mutate:
            dependencies.mutate ??
            mutateCentralBusinessNumberedDocumentFromBrowser,
        },
      );
      if (!preflight.ok) {
        return { ok: false, error: failureMessage(preflight) };
      }
      if (dependencies.getCurrentData() !== baseline) {
        return {
          ok: false,
          error:
            "Los datos cambiaron durante la conciliacion. No se asigno ningun numero; vuelve a guardar.",
        };
      }

      const id = (dependencies.createId ?? (() => crypto.randomUUID()))();
      const now = (dependencies.now ?? (() => new Date().toISOString()))();
      const payloadWithoutNumber = buildPayloadWithoutNumber(
        input.draft,
        id,
        now,
      );
      const operationId = `CENTRAL_QUOTE_CREATE:${id}`;
      enqueueCentralBusinessNumberedDocumentCreate({
        ownerScope,
        operationId,
        command: {
          action: "create",
          idempotencyKey: operationId,
          entityType: "quote",
          entityId: id,
          numberTemplate: preflight.summary.numberTemplate,
          padding: preflight.summary.padding,
          fiscalYear,
          payloadWithoutNumber,
        },
        storage: dependencies.storage,
        now: () => now,
      });

      const delivery = await recoverExistingJournalOperation({
        ownerScope,
        intendedPayload: payloadWithoutNumber,
        dependencies,
      });
      if (delivery.status === "blocked") {
        return { ok: false, error: delivery.error };
      }
      if (delivery.status !== "recovered") {
        return {
          ok: false,
          error:
            "La operacion numerada quedo conservada, pero todavia no se pudo confirmar.",
        };
      }
      if (!delivery.matchesCurrentDraft) {
        return {
          ok: false,
          error:
            "Se termino otra operacion numerada pendiente. Vuelve a guardar este presupuesto.",
        };
      }
      return {
        ok: true,
        document: delivery.document,
        delivery: "central_confirmed",
      };
    });
  } catch {
    return {
      ok: false,
      error:
        "No se pudo preparar y verificar el guardado central. No se genero otro numero; vuelve a intentarlo.",
    };
  }
}
