import {
  evaluateCentralInvoiceAuthorityActivation,
  type CentralInvoiceAuthorityActivation,
} from "./activation";
import {
  buildCentralInvoiceAuthorityIssueCommand,
  summarizeCentralInvoiceAuthorityIssueCommand,
  type CentralInvoiceAuthorityIssueCommandSafeSummary,
  type CentralInvoiceAuthorityIssueInput,
} from "./issue-command";
import { decideCentralInvoiceAuthorityIdempotency } from "./issue-idempotency";
import {
  issueCentralInvoiceThroughRpc,
  type CentralInvoiceAuthorityIssueRpcClient,
  type CentralInvoiceAuthorityIssueRpcInput,
  type CentralInvoiceAuthorityIssueRpcResult,
} from "./issue-rpc-adapter";
import { buildCentralInvoiceAuthorityTransactionPlan } from "./issue-transaction-plan";

// CENTRAL_INVOICE_AUTHORITY_ISSUE_SERVICE_V1
assertServerOnlyModule();

export const CENTRAL_INVOICE_AUTHORITY_ISSUE_SERVICE =
  "CENTRAL_INVOICE_AUTHORITY_ISSUE_SERVICE_V1";

export interface CentralInvoiceAuthorityIssueServiceInput
  extends Omit<CentralInvoiceAuthorityIssueRpcInput, "command"> {
  issueInput: CentralInvoiceAuthorityIssueInput;
  rpcClient: CentralInvoiceAuthorityIssueRpcClient;
  activation?: CentralInvoiceAuthorityActivation;
  userEmail?: string | null;
}

export interface CentralInvoiceAuthorityIssueServiceResult {
  schema: typeof CENTRAL_INVOICE_AUTHORITY_ISSUE_SERVICE;
  activation: CentralInvoiceAuthorityActivation;
  commandSafeSummary: CentralInvoiceAuthorityIssueCommandSafeSummary;
  transactionStepIds: string[];
  rpcResult: CentralInvoiceAuthorityIssueRpcResult;
}

export type CentralInvoiceAuthorityIssueServiceErrorCode =
  | "CENTRAL_AUTHORITY_DISABLED"
  | "CENTRAL_AUTHORITY_SHADOW_ONLY";

export class CentralInvoiceAuthorityIssueServiceError extends Error {
  readonly code: CentralInvoiceAuthorityIssueServiceErrorCode;
  readonly activation: CentralInvoiceAuthorityActivation;

  constructor(
    code: CentralInvoiceAuthorityIssueServiceErrorCode,
    message: string,
    activation: CentralInvoiceAuthorityActivation,
  ) {
    super(message);
    this.name = "CentralInvoiceAuthorityIssueServiceError";
    this.code = code;
    this.activation = activation;
  }
}

function assertServerOnlyModule() {
  if (typeof window !== "undefined") {
    throw new Error(
      "El servicio de emision con autoridad central solo puede cargarse en servidor.",
    );
  }
}

function assertFiscalWritesEnabled(activation: CentralInvoiceAuthorityActivation) {
  if (activation.enabled && !activation.fiscalWritesEnabled) {
    throw new CentralInvoiceAuthorityIssueServiceError(
      "CENTRAL_AUTHORITY_SHADOW_ONLY",
      "La autoridad central esta en shadow y no puede emitir facturas fiscales.",
      activation,
    );
  }
  if (!activation.fiscalWritesEnabled) {
    throw new CentralInvoiceAuthorityIssueServiceError(
      "CENTRAL_AUTHORITY_DISABLED",
      "La autoridad central de facturas no esta habilitada para escrituras fiscales.",
      activation,
    );
  }
}

export async function issueCentralInvoiceWithAuthority(
  input: CentralInvoiceAuthorityIssueServiceInput,
): Promise<CentralInvoiceAuthorityIssueServiceResult> {
  const command = buildCentralInvoiceAuthorityIssueCommand(input.issueInput);
  const activation =
    input.activation ??
    evaluateCentralInvoiceAuthorityActivation({
      userId: command.userId,
      userEmail: input.userEmail,
    });

  assertFiscalWritesEnabled(activation);

  const idempotencyDecision = decideCentralInvoiceAuthorityIdempotency(
    command,
    null,
  );
  const plan = buildCentralInvoiceAuthorityTransactionPlan(
    command,
    idempotencyDecision,
  );
  const rpcResult = await issueCentralInvoiceThroughRpc(input.rpcClient, {
    command,
    documentPayload: input.documentPayload,
    emittedSnapshot: input.emittedSnapshot,
    emittedHash: input.emittedHash,
  });

  return {
    schema: CENTRAL_INVOICE_AUTHORITY_ISSUE_SERVICE,
    activation,
    commandSafeSummary: summarizeCentralInvoiceAuthorityIssueCommand(command),
    transactionStepIds: plan.steps.map((step) => step.id),
    rpcResult,
  };
}
