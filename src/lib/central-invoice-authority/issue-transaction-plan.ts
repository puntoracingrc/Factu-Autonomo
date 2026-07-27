import type { CentralInvoiceAuthorityIssueCommand } from "./issue-command";
import type { CentralInvoiceAuthorityIdempotencyDecision } from "./issue-idempotency";

// CENTRAL_INVOICE_AUTHORITY_TRANSACTION_PLAN_V1
assertServerOnlyModule();

export const CENTRAL_INVOICE_AUTHORITY_TRANSACTION_PLAN =
  "CENTRAL_INVOICE_AUTHORITY_TRANSACTION_PLAN_V1";

export type CentralInvoiceAuthorityTransactionStepId =
  | "derive_server_context"
  | "reserve_idempotency_command"
  | "lock_local_draft"
  | "verify_expected_draft_version"
  | "lock_series_scope"
  | "allocate_next_identity"
  | "freeze_document_snapshot"
  | "commit_command_result"
  | "enqueue_sync_outbox"
  | "publish_realtime_hint";

export interface CentralInvoiceAuthorityTransactionStep {
  id: CentralInvoiceAuthorityTransactionStepId;
  databaseBoundary: "before_transaction" | "inside_transaction" | "after_commit";
  required: boolean;
  blocksFiscalIdentity: boolean;
  description: string;
}

export interface CentralInvoiceAuthoritySeriesLockScope {
  userId: string;
  environment: CentralInvoiceAuthorityIssueCommand["series"]["environment"];
  issuerNifHash: string;
  seriesCode: string;
  fiscalYear: number;
}

export interface CentralInvoiceAuthorityTransactionPlan {
  schema: typeof CENTRAL_INVOICE_AUTHORITY_TRANSACTION_PLAN;
  commandRequestId: string;
  userId: string;
  idempotencyDecisionKind: CentralInvoiceAuthorityIdempotencyDecision["kind"];
  acceptedForExecution: boolean;
  replay: boolean;
  seriesLockScope: CentralInvoiceAuthoritySeriesLockScope;
  steps: CentralInvoiceAuthorityTransactionStep[];
  clientProvidedFiscalIdentityAllowed: false;
}

function assertServerOnlyModule() {
  if (typeof window !== "undefined") {
    throw new Error(
      "El plan transaccional de autoridad central solo puede cargarse en servidor.",
    );
  }
}

const transactionSteps: CentralInvoiceAuthorityTransactionStep[] = [
  {
    id: "derive_server_context",
    databaseBoundary: "before_transaction",
    required: true,
    blocksFiscalIdentity: true,
    description: "Derivar usuario, dispositivo y sesion desde el servidor.",
  },
  {
    id: "reserve_idempotency_command",
    databaseBoundary: "inside_transaction",
    required: true,
    blocksFiscalIdentity: true,
    description: "Reservar o resolver la clave de idempotencia antes de tocar la serie.",
  },
  {
    id: "lock_local_draft",
    databaseBoundary: "inside_transaction",
    required: true,
    blocksFiscalIdentity: true,
    description: "Bloquear el borrador tecnico que se quiere emitir.",
  },
  {
    id: "verify_expected_draft_version",
    databaseBoundary: "inside_transaction",
    required: true,
    blocksFiscalIdentity: true,
    description: "Comparar version esperada y huella del borrador bajo bloqueo.",
  },
  {
    id: "lock_series_scope",
    databaseBoundary: "inside_transaction",
    required: true,
    blocksFiscalIdentity: true,
    description: "Bloquear usuario, entorno, NIF emisor, serie y ejercicio fiscal.",
  },
  {
    id: "allocate_next_identity",
    databaseBoundary: "inside_transaction",
    required: true,
    blocksFiscalIdentity: false,
    description: "Asignar la siguiente identidad fiscal solo dentro de la transaccion.",
  },
  {
    id: "freeze_document_snapshot",
    databaseBoundary: "inside_transaction",
    required: true,
    blocksFiscalIdentity: false,
    description: "Congelar el documento emitido y su huella auditable.",
  },
  {
    id: "commit_command_result",
    databaseBoundary: "inside_transaction",
    required: true,
    blocksFiscalIdentity: false,
    description: "Guardar el resultado confirmado para replays idempotentes.",
  },
  {
    id: "enqueue_sync_outbox",
    databaseBoundary: "inside_transaction",
    required: true,
    blocksFiscalIdentity: false,
    description: "Encolar el cambio central para sincronizacion posterior.",
  },
  {
    id: "publish_realtime_hint",
    databaseBoundary: "after_commit",
    required: true,
    blocksFiscalIdentity: false,
    description: "Avisar a otros dispositivos despues del commit confirmado.",
  },
];

export function buildCentralInvoiceAuthorityTransactionPlan(
  command: CentralInvoiceAuthorityIssueCommand,
  decision: CentralInvoiceAuthorityIdempotencyDecision,
): CentralInvoiceAuthorityTransactionPlan {
  return {
    schema: CENTRAL_INVOICE_AUTHORITY_TRANSACTION_PLAN,
    commandRequestId: command.requestId,
    userId: command.userId,
    idempotencyDecisionKind: decision.kind,
    acceptedForExecution:
      decision.accepted && !decision.replay && decision.kind !== "replay_committed",
    replay: decision.replay,
    seriesLockScope: {
      userId: command.userId,
      environment: command.series.environment,
      issuerNifHash: command.safeSummary.issuerNifHash,
      seriesCode: command.series.seriesCode,
      fiscalYear: command.series.fiscalYear,
    },
    steps: transactionSteps.map((step) => ({ ...step })),
    clientProvidedFiscalIdentityAllowed: false,
  };
}

export function summarizeCentralInvoiceAuthorityTransactionPlan(
  plan: CentralInvoiceAuthorityTransactionPlan,
) {
  return {
    schema: plan.schema,
    commandRequestId: plan.commandRequestId,
    userId: plan.userId,
    idempotencyDecisionKind: plan.idempotencyDecisionKind,
    acceptedForExecution: plan.acceptedForExecution,
    replay: plan.replay,
    seriesLockScope: plan.seriesLockScope,
    stepIds: plan.steps.map((step) => step.id),
    clientProvidedFiscalIdentityAllowed: plan.clientProvidedFiscalIdentityAllowed,
  };
}
