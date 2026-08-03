"use client";

import type { AppDataDurabilityResult } from "@/lib/app-data-durability";
import type { CentralInvoiceAuthorityEventsAppDataSyncValue } from "@/lib/central-invoice-authority/events-app-data-sync";
import { resolveCentralInvoiceAuthorityRectificationTarget } from "@/lib/central-invoice-authority/document-form-canary";
import {
  importCentralInvoiceAuthorityHistoricalOriginalFromBrowser,
  type CentralInvoiceAuthorityHistoricalImportResult,
} from "@/lib/central-invoice-authority/historical-import-client";
import type { ReceiptGenerationCommandResult } from "@/lib/receipt-generation-command";
import { inspectReceiptGeneration } from "@/lib/receipts";
import type { AppData, Document } from "@/lib/types";

import { buildCentralBusinessReceiptPayloadWithoutNumber } from "./central-receipt-materialization";
import { withCentralBusinessQueueLock } from "./durable-queue";
import type { CentralBusinessEventsAppDataSyncResult } from "./events-app-data-sync";
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

export const CENTRAL_RECEIPT_CREATE_CANARY =
  "CENTRAL_RECEIPT_CREATE_CANARY_V1";

export type CentralReceiptCreateResult =
  | {
      ok: true;
      receipt: Document;
      delivery:
        | "local"
        | "existing"
        | "central_confirmed"
        | "central_recovered";
    }
  | { ok: false; error: string };

export interface CentralReceiptCreateCanaryEnvironment {
  enabled?: string;
  userIds?: string;
}

export interface CentralReceiptCreateCanaryDependencies {
  getCurrentData(): AppData;
  generateReceiptFallback(invoiceId: string): ReceiptGenerationCommandResult;
  addCentralDocumentDurably(
    expected: AppData,
    entityType: "receipt",
    confirmation: CentralBusinessNumberedDocumentCreateBrowserResult,
  ): Promise<AppDataDurabilityResult<Document>>;
  syncBusinessEventsBeforeWrite?: () => Promise<CentralBusinessEventsAppDataSyncResult>;
  syncInvoiceEventsBeforeWrite?: () => Promise<
    AppDataDurabilityResult<CentralInvoiceAuthorityEventsAppDataSyncValue>
  >;
  importHistoricalOriginal?: (
    document: Document,
  ) => Promise<CentralInvoiceAuthorityHistoricalImportResult>;
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
  environment?: CentralReceiptCreateCanaryEnvironment;
}

const publicEnvironment: CentralReceiptCreateCanaryEnvironment = {
  enabled:
    process.env.NEXT_PUBLIC_CENTRAL_BUSINESS_RECEIPT_CREATE_CANARY_ENABLED,
  userIds:
    process.env.NEXT_PUBLIC_CENTRAL_BUSINESS_RECEIPT_CREATE_CANARY_USER_IDS,
};

function values(value: string | undefined): Set<string> {
  return new Set(
    (value ?? "")
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean),
  );
}

function isCohortUser(
  userId: string | null | undefined,
  environment: CentralReceiptCreateCanaryEnvironment,
): userId is string {
  return typeof userId === "string" && values(environment.userIds).has(userId);
}

export function isCentralReceiptCreateCanaryEnabledForUser(
  userId: string | null | undefined,
  environment: CentralReceiptCreateCanaryEnvironment = publicEnvironment,
): boolean {
  return (
    environment.enabled?.trim().toLowerCase() === "true" &&
    isCohortUser(userId, environment)
  );
}

function fallbackResult(
  result: ReceiptGenerationCommandResult,
): CentralReceiptCreateResult {
  if (result.status === "created") {
    return { ok: true, receipt: result.receipt, delivery: "local" };
  }
  if (result.status === "existing") {
    return { ok: true, receipt: result.receipt, delivery: "existing" };
  }
  if (result.status === "blocked") {
    return {
      ok: false,
      error: `No se pudo crear el recibo (${result.reason}).`,
    };
  }
  return {
    ok: false,
    error:
      "No se pudo confirmar el almacenamiento local del recibo. Recarga antes de repetirlo.",
  };
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
              code: "CENTRAL_RECEIPT_STATUS_TIMEOUT",
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
  dependencies: CentralReceiptCreateCanaryDependencies,
  confirmation: CentralBusinessNumberedDocumentCreateBrowserResult,
): Promise<AppDataDurabilityResult<Document>> {
  let last: AppDataDurabilityResult<Document> | null = null;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      last = await dependencies.addCentralDocumentDurably(
        dependencies.getCurrentData(),
        "receipt",
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

type JournalRecovery =
  | { status: "empty" }
  | { status: "recovered"; receipt: Document; matchesInvoice: boolean }
  | { status: "blocked"; error: string };

async function recoverExistingJournalOperation(input: {
  ownerScope: string;
  invoiceId: string;
  dependencies: CentralReceiptCreateCanaryDependencies;
}): Promise<JournalRecovery> {
  const before = loadCentralBusinessNumberedDocumentJournal(
    input.ownerScope,
    input.dependencies.storage,
  );
  if (before.operations.length === 0) return { status: "empty" };

  const drained = await drainCentralBusinessNumberedDocumentJournal({
    ownerScope: input.ownerScope,
    mutate:
      input.dependencies.mutate ??
      mutateCentralBusinessNumberedDocumentFromBrowser,
    storage: input.dependencies.storage,
    now: input.dependencies.now,
  });
  if (drained.status !== "confirmed") {
    return {
      status: "blocked",
      error:
        drained.status === "retryable"
          ? "El recibo sigue protegido en la cola local porque el servidor no pudo confirmarlo. Vuelve a intentarlo con conexion."
          : "Hay un documento numerado pendiente de revision. No se creara otro hasta resolverlo.",
    };
  }
  if (drained.operation.input.entityType !== "receipt") {
    return {
      status: "blocked",
      error:
        "Hay otro documento numerado pendiente de terminar en este dispositivo.",
    };
  }

  const local = await commitConfirmation(
    input.dependencies,
    drained.operation.confirmation,
  );
  if (local.status !== "applied") {
    return {
      status: "blocked",
      error:
        local.status === "indeterminate"
          ? "El servidor ya confirmo el recibo, pero este dispositivo no pudo verificar su almacenamiento. No repitas el alta."
          : "El servidor ya confirmo el recibo, pero este dispositivo no pudo sellarlo y vincularlo. No repitas el alta.",
    };
  }

  try {
    acknowledgeCentralBusinessNumberedDocument({
      ownerScope: input.ownerScope,
      operationId: drained.operation.operationId,
      eventId: drained.operation.confirmation.eventId,
      contentHash: drained.operation.confirmation.contentHash,
      storage: input.dependencies.storage,
    });
  } catch {
    return {
      status: "blocked",
      error:
        "El recibo quedo guardado, pero falta cerrar su acuse local. Recarga y vuelve a pulsar; no se creara otro numero.",
    };
  }

  const payload = drained.operation.confirmation.documentPayload;
  return {
    status: "recovered",
    receipt: local.value,
    matchesInvoice:
      payload !== null &&
      typeof payload === "object" &&
      !Array.isArray(payload) &&
      payload.sourceDocumentId === input.invoiceId,
  };
}

function recoveryResult(
  recovery: JournalRecovery,
): CentralReceiptCreateResult | null {
  if (recovery.status === "empty") return null;
  if (recovery.status === "blocked") {
    return { ok: false, error: recovery.error };
  }
  if (!recovery.matchesInvoice) {
    return {
      ok: false,
      error: `Se recupero el recibo ${recovery.receipt.number} que estaba pendiente. Revisa el listado y vuelve a crear el recibo actual.`,
    };
  }
  return {
    ok: true,
    receipt: recovery.receipt,
    delivery: "central_recovered",
  };
}

function preflightFailure(
  result: Extract<
    CentralBusinessNonfiscalSeriesPreflightResult,
    { ok: false }
  >,
): string {
  if (result.retryable) {
    return "No se pudo confirmar la serie central de recibos. No se asigno ningun numero; comprueba la conexion.";
  }
  return result.message || "La serie central de recibos requiere revision.";
}

async function synchronizeInvoiceAuthority(
  dependencies: CentralReceiptCreateCanaryDependencies,
): Promise<boolean> {
  if (!dependencies.syncInvoiceEventsBeforeWrite) return false;
  const result = await dependencies.syncInvoiceEventsBeforeWrite();
  return (
    result.status === "applied" &&
    result.value.localSync.conflicts.length === 0
  );
}

async function ensureCentralSourceInvoice(input: {
  invoiceId: string;
  dependencies: CentralReceiptCreateCanaryDependencies;
}): Promise<{ ok: true; invoice: Document } | { ok: false; error: string }> {
  let invoice = input.dependencies
    .getCurrentData()
    .documents.find((document) => document.id === input.invoiceId);
  if (!invoice) {
    return { ok: false, error: "No se encontro la factura de origen." };
  }
  if (resolveCentralInvoiceAuthorityRectificationTarget(invoice)) {
    return { ok: true, invoice };
  }

  const imported = await (
    input.dependencies.importHistoricalOriginal ??
    importCentralInvoiceAuthorityHistoricalOriginalFromBrowser
  )(invoice);
  if (!imported.ok) return { ok: false, error: imported.message };
  if (!(await synchronizeInvoiceAuthority(input.dependencies))) {
    return {
      ok: false,
      error:
        "La factura original ya se registro en el servidor, pero este dispositivo no pudo incorporar su identidad central. Sincroniza las facturas antes de crear el recibo.",
    };
  }
  invoice = input.dependencies
    .getCurrentData()
    .documents.find((document) => document.id === input.invoiceId);
  if (!invoice || !resolveCentralInvoiceAuthorityRectificationTarget(invoice)) {
    return {
      ok: false,
      error:
        "La factura de origen no conserva una identidad central verificable.",
    };
  }
  return { ok: true, invoice };
}

export async function createReceiptWithCentralCanary(input: {
  userId: string | null | undefined;
  invoiceId: string;
  dependencies: CentralReceiptCreateCanaryDependencies;
}): Promise<CentralReceiptCreateResult> {
  const { dependencies } = input;
  const environment = dependencies.environment ?? publicEnvironment;
  const enabled = isCentralReceiptCreateCanaryEnabledForUser(
    input.userId,
    environment,
  );
  const ownerScope = isCohortUser(input.userId, environment)
    ? input.userId
    : null;
  const withLock = dependencies.withLock ?? withCentralBusinessQueueLock;

  if (!enabled) {
    if (ownerScope) {
      try {
        const recovery = await withLock(ownerScope, () =>
          recoverExistingJournalOperation({
            ownerScope,
            invoiceId: input.invoiceId,
            dependencies,
          }),
        );
        const recovered = recoveryResult(recovery);
        if (recovered) return recovered;
      } catch {
        return {
          ok: false,
          error:
            "Hay una operacion numerada anterior que no se pudo revisar. No se creara otro recibo.",
        };
      }
    }
    return fallbackResult(dependencies.generateReceiptFallback(input.invoiceId));
  }
  if (!ownerScope) {
    return { ok: false, error: "El recibo central no tiene propietario valido." };
  }

  try {
    const firstRecovery = await withLock(ownerScope, () =>
      recoverExistingJournalOperation({
        ownerScope,
        invoiceId: input.invoiceId,
        dependencies,
      }),
    );
    const recovered = recoveryResult(firstRecovery);
    if (recovered) return recovered;

    if (!(await synchronizeInvoiceAuthority(dependencies))) {
      return {
        ok: false,
        error:
          "No se pudieron aplicar todos los cambios centrales de la factura antes de crear el recibo.",
      };
    }
    const centralSource = await ensureCentralSourceInvoice({
      invoiceId: input.invoiceId,
      dependencies,
    });
    if (!centralSource.ok) return centralSource;

    const businessSync = await dependencies.syncBusinessEventsBeforeWrite?.();
    if (businessSync && !businessSync.ok) {
      return {
        ok: false,
        error:
          "No se pudieron aplicar todos los cambios centrales antes de numerar el recibo.",
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
          "El servidor central no esta listo para asignar el numero. No se creo el recibo.",
      };
    }

    return await withLock(ownerScope, async () => {
      const raceRecovery = await recoverExistingJournalOperation({
        ownerScope,
        invoiceId: input.invoiceId,
        dependencies,
      });
      const recoveredAfterWait = recoveryResult(raceRecovery);
      if (recoveredAfterWait) return recoveredAfterWait;

      const baseline = dependencies.getCurrentData();
      const inspection = inspectReceiptGeneration(
        baseline.documents,
        input.invoiceId,
      );
      if (inspection.status === "existing") {
        return {
          ok: true,
          receipt: inspection.receipt,
          delivery: "existing",
        };
      }
      if (inspection.status === "blocked") {
        return {
          ok: false,
          error: `La factura no permite crear el recibo (${inspection.reason}).`,
        };
      }
      if (!resolveCentralInvoiceAuthorityRectificationTarget(inspection.invoice)) {
        return {
          ok: false,
          error: "La factura perdio su identidad central antes de crear el recibo.",
        };
      }

      const now = (dependencies.now ?? (() => new Date().toISOString()))();
      const receiptDate =
        inspection.invoice.date > now.slice(0, 10)
          ? inspection.invoice.date
          : now.slice(0, 10);
      const fiscalYear = Number(receiptDate.slice(0, 4));
      const preflight = await (
        dependencies.preflight ?? preflightCentralBusinessNonfiscalSeries
      )(
        { data: baseline, entityType: "receipt", fiscalYear },
        {
          mutate:
            dependencies.mutate ??
            mutateCentralBusinessNumberedDocumentFromBrowser,
        },
      );
      if (!preflight.ok) {
        return { ok: false, error: preflightFailure(preflight) };
      }
      if (dependencies.getCurrentData() !== baseline) {
        return {
          ok: false,
          error:
            "Los datos cambiaron durante la conciliacion. No se asigno ningun numero; vuelve a intentarlo.",
        };
      }

      const createId = dependencies.createId ?? (() => crypto.randomUUID());
      const receiptId = createId();
      const payloadWithoutNumber =
        buildCentralBusinessReceiptPayloadWithoutNumber({
          data: baseline,
          invoiceId: input.invoiceId,
          receiptId,
          issuedAt: now,
          createLineId: createId,
        });
      const operationId = `CENTRAL_RECEIPT_CREATE:${receiptId}`;
      enqueueCentralBusinessNumberedDocumentCreate({
        ownerScope,
        operationId,
        command: {
          action: "create",
          idempotencyKey: operationId,
          entityType: "receipt",
          entityId: receiptId,
          numberTemplate: preflight.summary.numberTemplate,
          padding: preflight.summary.padding,
          fiscalYear,
          payloadWithoutNumber: JSON.parse(
            JSON.stringify(payloadWithoutNumber),
          ),
        },
        storage: dependencies.storage,
        now: () => now,
      });

      const delivery = await recoverExistingJournalOperation({
        ownerScope,
        invoiceId: input.invoiceId,
        dependencies,
      });
      if (delivery.status === "blocked") {
        return { ok: false, error: delivery.error };
      }
      if (delivery.status !== "recovered") {
        return {
          ok: false,
          error:
            "El recibo quedo conservado en la cola, pero todavia no se pudo confirmar.",
        };
      }
      if (!delivery.matchesInvoice) {
        return {
          ok: false,
          error:
            "Se termino otro recibo pendiente. Vuelve a crear el recibo actual.",
        };
      }
      return {
        ok: true,
        receipt: delivery.receipt,
        delivery: "central_confirmed",
      };
    });
  } catch {
    return {
      ok: false,
      error:
        "No se pudo preparar y verificar el recibo central. No se genero otro numero; vuelve a intentarlo.",
    };
  }
}
