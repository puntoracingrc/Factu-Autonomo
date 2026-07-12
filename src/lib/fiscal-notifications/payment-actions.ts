import {
  FISCAL_NOTIFICATION_INPUT_LIMITS,
  assertBoundedId,
  assertBoundedOwnerScope,
  assertNonNegativeIntegerCents,
} from "./input-contract";
import type {
  AccountingDraftProposal,
  FiscalNotificationAuditEventType,
  FiscalNotificationsWorkspace,
  PaymentInstallment,
  TimelineEvent,
} from "./types";
import { validateFiscalNotificationsWorkspaceIntegrity } from "./workspace-integrity";

type PaymentActorScope = "LOCAL_USER" | "AUTHENTICATED_USER";

interface PaymentActionInput {
  ownerScope: string;
  workspace: FiscalNotificationsWorkspace;
  installmentId: string;
  paidAt: string;
  now: string;
  nextId: () => string;
  actorScope: PaymentActorScope;
}

interface AccountingDraftInput {
  ownerScope: string;
  workspace: FiscalNotificationsWorkspace;
  installmentId: string;
  now: string;
  nextId: () => string;
  actorScope: PaymentActorScope;
}

interface PaymentTransition {
  expectedStatus: PaymentInstallment["status"];
  expectedObligationStatus: FiscalNotificationsWorkspace["obligations"][number]["status"];
  nextStatus: "PAID_UNCONFIRMED" | "PAID";
  obligationStatus: "PAID_UNCONFIRMED" | "PAID";
  auditType: Extract<
    FiscalNotificationAuditEventType,
    "PAYMENT_REPORTED" | "PAYMENT_CONFIRMED"
  >;
  timelineType: Extract<
    TimelineEvent["eventType"],
    "PAYMENT_REPORTED" | "PAYMENT_CONFIRMED"
  >;
  summary: string;
}

const PAYMENT_ACTION_KEYS = Object.freeze([
  "ownerScope",
  "workspace",
  "installmentId",
  "paidAt",
  "now",
  "nextId",
  "actorScope",
] as const);

const ACCOUNTING_DRAFT_KEYS = Object.freeze([
  "ownerScope",
  "workspace",
  "installmentId",
  "now",
  "nextId",
  "actorScope",
] as const);

const WORKSPACE_ENTITY_COLLECTIONS = Object.freeze([
  "packages",
  "files",
  "documents",
  "parts",
  "authorities",
  "references",
  "evidence",
  "debts",
  "debtObservations",
  "cases",
  "relations",
  "analysisSnapshots",
  "paymentOptions",
  "paymentPlans",
  "installments",
  "interestCalculations",
  "deadlineRules",
  "obligations",
  "timeline",
  "accountingDrafts",
  "auditEvents",
] as const satisfies readonly (keyof FiscalNotificationsWorkspace)[]);

const INSTALLMENT_STATUSES = new Set<PaymentInstallment["status"]>([
  "PENDING_CONFIRMATION",
  "PENDING",
  "PAID_UNCONFIRMED",
  "PAID",
  "RECONCILED",
  "PAYMENT_REJECTED",
  "OVERDUE_NO_PAYMENT_RECORDED",
  "UNPAID_CONFIRMED",
  "CANCELLED",
]);

const UNSAFE_GENERATED_ID_PREFIXES = [
  "nif",
  "taxid",
  "iban",
  "bankaccount",
  "csvvalue",
  "rawvalue",
  "textsnippet",
  "documenttext",
  "filename",
  "prompt",
] as const;

export interface InstallmentDisplayState {
  status: PaymentInstallment["status"];
  label: string;
  isDerived: boolean;
}

export function installmentDisplayState(
  installment: PaymentInstallment,
  referenceDate: string,
): InstallmentDisplayState {
  const snapshot = snapshotInstallmentDisplayFields(installment);
  if (!snapshot || !INSTALLMENT_STATUSES.has(snapshot.status)) {
    throw new Error("FISCAL_NOTIFICATIONS_INVALID_INSTALLMENT_DISPLAY_INPUT");
  }
  const referenceCalendarDate = calendarDateFromDateLike(referenceDate);
  if (
    snapshot.status === "PENDING" &&
    snapshot.dueDate !== undefined
  ) {
    const dueCalendarDate = calendarDateFromDateLike(snapshot.dueDate);
    if (dueCalendarDate < referenceCalendarDate) {
      return {
        status: "OVERDUE_NO_PAYMENT_RECORDED",
        label: "Vencida; no consta pago en el programa",
        isDerived: true,
      };
    }
  }

  const labels: Record<PaymentInstallment["status"], string> = {
    PENDING_CONFIRMATION: "Pendiente de confirmación",
    PENDING: "Pendiente",
    PAID_UNCONFIRMED: "Pago indicado por el usuario",
    PAID: "Pago confirmado por el usuario",
    RECONCILED: "Pago conciliado",
    PAYMENT_REJECTED: "Pago rechazado",
    OVERDUE_NO_PAYMENT_RECORDED: "Vencida; no consta pago en el programa",
    UNPAID_CONFIRMED: "Impago confirmado por evidencia posterior",
    CANCELLED: "Cancelada",
  };
  return {
    status: snapshot.status,
    label: labels[snapshot.status],
    isDerived: false,
  };
}

export function reportInstallmentPayment(
  input: PaymentActionInput,
): FiscalNotificationsWorkspace {
  return updateInstallmentPaymentState(input, {
    expectedStatus: "PENDING",
    expectedObligationStatus: "PENDING",
    nextStatus: "PAID_UNCONFIRMED",
    obligationStatus: "PAID_UNCONFIRMED",
    auditType: "PAYMENT_REPORTED",
    timelineType: "PAYMENT_REPORTED",
    summary: "El usuario ha indicado un pago; todavía no está conciliado.",
  });
}

export function confirmReportedInstallmentPayment(
  input: PaymentActionInput,
): FiscalNotificationsWorkspace {
  return updateInstallmentPaymentState(input, {
    expectedStatus: "PAID_UNCONFIRMED",
    expectedObligationStatus: "PAID_UNCONFIRMED",
    nextStatus: "PAID",
    obligationStatus: "PAID",
    auditType: "PAYMENT_CONFIRMED",
    timelineType: "PAYMENT_CONFIRMED",
    summary: "El usuario ha confirmado el pago; no equivale a conciliación bancaria.",
  });
}

function updateInstallmentPaymentState(
  rawInput: PaymentActionInput,
  transition: PaymentTransition,
): FiscalNotificationsWorkspace {
  const input = parsePaymentActionInput(rawInput);
  const nowTimestamp = assertIsoTimestamp(input.now, "FISCAL_NOTIFICATIONS_INVALID_NOW");
  const paidAtTimestamp = assertIsoTimestamp(
    input.paidAt,
    "FISCAL_NOTIFICATIONS_INVALID_PAID_AT",
  );
  if (paidAtTimestamp > nowTimestamp) {
    throw new Error("FISCAL_NOTIFICATIONS_PAID_AT_IN_FUTURE");
  }
  const next = cloneValidatedWorkspace(input.workspace, input.ownerScope);
  assertMonotonicUpdate(next, nowTimestamp);
  const installment = next.installments.find(
    (item) => item.id === input.installmentId,
  );
  if (!installment) {
    throw new Error("FISCAL_NOTIFICATIONS_INSTALLMENT_NOT_FOUND");
  }
  const plan = next.paymentPlans.find(
    (item) => item.id === installment.paymentPlanId,
  );
  if (!plan) {
    throw new Error("FISCAL_NOTIFICATIONS_PAYMENT_PLAN_NOT_FOUND");
  }
  const obligations = next.obligations.filter(
    (item) => item.installmentId === installment.id,
  );
  if (obligations.length > 1) {
    throw new Error("FISCAL_NOTIFICATIONS_AMBIGUOUS_PAYMENT_OBLIGATION");
  }
  const obligation = obligations[0];
  if (obligation && obligation.type !== "PAY") {
    throw new Error("FISCAL_NOTIFICATIONS_PAYMENT_OBLIGATION_TYPE_MISMATCH");
  }
  if (obligation && !paymentAmountsMatch(installment, obligation)) {
    throw new Error("FISCAL_NOTIFICATIONS_PAYMENT_AMOUNT_MISMATCH");
  }
  const administrativeCase = plan.caseId
    ? next.cases.find((item) => item.id === plan.caseId)
    : undefined;
  if (plan.caseId && !administrativeCase) {
    throw new Error("FISCAL_NOTIFICATIONS_CASE_NOT_FOUND");
  }

  if (
    paymentTransitionAlreadyApplied({
      workspace: next,
      installment,
      obligation,
      caseId: plan.caseId,
      paidAt: input.paidAt,
      now: input.now,
      transition,
    })
  ) {
    validateActionWorkspace(next, input.ownerScope);
    return next;
  }
  if (
    !hasCanonicalPaymentEvents(
      next,
      installment,
      plan.caseId,
      input.now,
      transition.auditType === "PAYMENT_CONFIRMED"
        ? ["PAYMENT_REPORTED"]
        : [],
    )
  ) {
    throw new Error("FISCAL_NOTIFICATIONS_PAYMENT_HISTORY_REQUIRED");
  }
  if (installment.status !== transition.expectedStatus) {
    throw new Error("FISCAL_NOTIFICATIONS_INVALID_PAYMENT_TRANSITION");
  }
  if (
    obligation &&
    obligation.status !== transition.expectedObligationStatus
  ) {
    throw new Error("FISCAL_NOTIFICATIONS_INCONSISTENT_PAYMENT_STATE");
  }
  if (
    transition.auditType === "PAYMENT_CONFIRMED" &&
    installment.paidAt !== input.paidAt
  ) {
    throw new Error("FISCAL_NOTIFICATIONS_PAYMENT_DATE_MISMATCH");
  }
  if (
    transition.auditType === "PAYMENT_REPORTED" &&
    installment.paidAt !== undefined
  ) {
    throw new Error("FISCAL_NOTIFICATIONS_INCONSISTENT_PAYMENT_STATE");
  }

  installment.status = transition.nextStatus;
  if (transition.auditType === "PAYMENT_REPORTED") {
    installment.paidAt = input.paidAt;
  }
  installment.userConfirmed = true;
  if (obligation) {
    obligation.status = transition.obligationStatus;
    obligation.userConfirmed = true;
  }

  const artifactCount = administrativeCase && plan.caseId ? 2 : 1;
  preflightMutation(next, input.ownerScope, input.now, artifactCount, (candidate, ids) => {
    appendPaymentArtifacts(candidate, ids, input, transition);
  });
  const usedIds = collectWorkspaceIds(next);
  const generatedIds = generateIds(input.nextId, usedIds, artifactCount);
  appendPaymentArtifacts(next, generatedIds, input, transition);

  // PAID is only a human-confirmed report. Completion of the plan and debt is
  // reserved for a future, evidence-backed RECONCILED transition.
  return finalizeWorkspace(next, input.ownerScope, input.now);
}

export function prepareAccountingDraft(
  rawInput: AccountingDraftInput,
): { workspace: FiscalNotificationsWorkspace; draft: AccountingDraftProposal } {
  const input = parseAccountingDraftInput(rawInput);
  const nowTimestamp = assertIsoTimestamp(input.now, "FISCAL_NOTIFICATIONS_INVALID_NOW");
  const next = cloneValidatedWorkspace(input.workspace, input.ownerScope);
  assertMonotonicUpdate(next, nowTimestamp);
  const installment = next.installments.find(
    (item) => item.id === input.installmentId,
  );
  if (!installment) {
    throw new Error("FISCAL_NOTIFICATIONS_INSTALLMENT_NOT_FOUND");
  }
  if (installment.status !== "PAID" && installment.status !== "RECONCILED") {
    throw new Error("FISCAL_NOTIFICATIONS_PAYMENT_NOT_CONFIRMED");
  }
  if (!installment.userConfirmed || !installment.paidAt) {
    throw new Error("FISCAL_NOTIFICATIONS_PAYMENT_NOT_CONFIRMED");
  }
  const paidAtTimestamp = assertIsoTimestamp(
    installment.paidAt,
    "FISCAL_NOTIFICATIONS_PAYMENT_NOT_CONFIRMED",
  );
  if (paidAtTimestamp > nowTimestamp) {
    throw new Error("FISCAL_NOTIFICATIONS_PAYMENT_NOT_CONFIRMED");
  }
  if (installment.status === "RECONCILED") {
    if (!installment.paymentMatchId || installment.evidenceIds.length === 0) {
      throw new Error("FISCAL_NOTIFICATIONS_RECONCILIATION_EVIDENCE_REQUIRED");
    }
    assertBoundedId(installment.paymentMatchId, "installment.paymentMatchId");
  }

  const plan = next.paymentPlans.find(
    (item) => item.id === installment.paymentPlanId,
  );
  if (!plan) {
    throw new Error("FISCAL_NOTIFICATIONS_PAYMENT_PLAN_NOT_FOUND");
  }
  const obligations = next.obligations.filter(
    (item) => item.installmentId === installment.id,
  );
  if (obligations.length !== 1) {
    throw new Error(
      obligations.length === 0
        ? "FISCAL_NOTIFICATIONS_PAYMENT_OBLIGATION_NOT_FOUND"
        : "FISCAL_NOTIFICATIONS_AMBIGUOUS_PAYMENT_OBLIGATION",
    );
  }
  const obligation = obligations[0]!;
  if (obligation.type !== "PAY") {
    throw new Error("FISCAL_NOTIFICATIONS_PAYMENT_OBLIGATION_TYPE_MISMATCH");
  }
  const requiredObligationStatus =
    installment.status === "RECONCILED" ? "RECONCILED" : "PAID";
  if (
    obligation.status !== requiredObligationStatus ||
    !obligation.userConfirmed ||
    !hasCanonicalPaymentHistory(next, installment, plan.caseId, input.now)
  ) {
    throw new Error("FISCAL_NOTIFICATIONS_PAYMENT_HISTORY_REQUIRED");
  }
  const totalCents = installment.totalCents;
  if (totalCents === undefined) {
    throw new Error("FISCAL_NOTIFICATIONS_INVALID_ACCOUNTING_AMOUNT");
  }
  assertNonNegativeIntegerCents(totalCents, "installment.totalCents");
  let componentSum = 0;
  for (let index = 0; index < installment.components.length; index += 1) {
    const amount = installment.components[index]!.amountCents;
    assertNonNegativeIntegerCents(
      amount,
      `installment.components[${index}].amountCents`,
    );
    componentSum += amount;
    if (!Number.isSafeInteger(componentSum)) {
      throw new Error("FISCAL_NOTIFICATIONS_ACCOUNTING_AMOUNT_OVERFLOW");
    }
  }
  if (componentSum !== totalCents) {
    throw new Error("FISCAL_NOTIFICATIONS_ACCOUNTING_COMPONENT_MISMATCH");
  }
  if (!paymentAmountsMatch(installment, obligation)) {
    throw new Error("FISCAL_NOTIFICATIONS_PAYMENT_AMOUNT_MISMATCH");
  }

  const existingDrafts = next.accountingDrafts.filter(
    (draft) =>
      draft.installmentId === installment.id && draft.status !== "REJECTED",
  );
  if (existingDrafts.length > 1) {
    throw new Error("FISCAL_NOTIFICATIONS_AMBIGUOUS_ACCOUNTING_DRAFT");
  }
  const existing = existingDrafts[0];
  if (existing) {
    if (!existingDraftMatchesInstallment(existing, installment, plan)) {
      throw new Error("FISCAL_NOTIFICATIONS_STALE_ACCOUNTING_DRAFT");
    }
    validateActionWorkspace(next, input.ownerScope);
    return { workspace: next, draft: existing };
  }

  const artifactCount = plan.caseId ? 3 : 2;
  preflightMutation(next, input.ownerScope, input.now, artifactCount, (candidate, ids) => {
    appendAccountingDraftArtifacts(candidate, ids, input);
  });
  const usedIds = collectWorkspaceIds(next);
  const generatedIds = generateIds(input.nextId, usedIds, artifactCount);
  const draft = appendAccountingDraftArtifacts(next, generatedIds, input);

  return {
    workspace: finalizeWorkspace(next, input.ownerScope, input.now),
    draft,
  };
}

function parsePaymentActionInput(input: PaymentActionInput): PaymentActionInput {
  const record = snapshotExactDataObject(input, PAYMENT_ACTION_KEYS);
  if (!record) throw new Error("FISCAL_NOTIFICATIONS_INVALID_ACTION_INPUT");
  return parseCommonInput(record, true) as PaymentActionInput;
}

function parseAccountingDraftInput(
  input: AccountingDraftInput,
): AccountingDraftInput {
  const record = snapshotExactDataObject(input, ACCOUNTING_DRAFT_KEYS);
  if (!record) throw new Error("FISCAL_NOTIFICATIONS_INVALID_ACTION_INPUT");
  return parseCommonInput(record, false) as AccountingDraftInput;
}

function parseCommonInput(
  record: Record<string, unknown>,
  requiresPaidAt: boolean,
): PaymentActionInput | AccountingDraftInput {
  assertBoundedOwnerScope(record.ownerScope, "ownerScope");
  assertBoundedId(record.installmentId, "installmentId");
  if (
    !record.workspace ||
    typeof record.workspace !== "object" ||
    Array.isArray(record.workspace) ||
    typeof record.now !== "string" ||
    typeof record.nextId !== "function" ||
    (record.actorScope !== "LOCAL_USER" &&
      record.actorScope !== "AUTHENTICATED_USER") ||
    (requiresPaidAt && typeof record.paidAt !== "string")
  ) {
    throw new Error("FISCAL_NOTIFICATIONS_INVALID_ACTION_INPUT");
  }
  return record as unknown as PaymentActionInput | AccountingDraftInput;
}

function snapshotExactDataObject(
  value: unknown,
  allowedKeys: readonly string[],
): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  try {
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) return null;
    const allowed = new Set(allowedKeys);
    const result: Record<string, unknown> = Object.create(null);
    for (const key of Reflect.ownKeys(value)) {
      if (typeof key !== "string" || !allowed.has(key)) return null;
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (!descriptor || !descriptor.enumerable || !("value" in descriptor)) {
        return null;
      }
      result[key] = descriptor.value;
    }
    if (Object.keys(result).length !== allowedKeys.length) return null;
    return result;
  } catch {
    return null;
  }
}

function validateInputWorkspace(
  workspace: FiscalNotificationsWorkspace,
  ownerScope: string,
): void {
  const result = validateFiscalNotificationsWorkspaceIntegrity(
    workspace,
    ownerScope,
  );
  if (!result.valid) {
    if (result.issues.some((issue) => issue.code === "OWNER_SCOPE_MISMATCH")) {
      throw new Error("FISCAL_NOTIFICATIONS_OWNER_SCOPE_MISMATCH");
    }
    throw new Error("FISCAL_NOTIFICATIONS_INVALID_WORKSPACE");
  }
}

function validateActionWorkspace(
  workspace: FiscalNotificationsWorkspace,
  ownerScope: string,
): void {
  const result = validateFiscalNotificationsWorkspaceIntegrity(
    workspace,
    ownerScope,
  );
  if (!result.valid) {
    throw new Error("FISCAL_NOTIFICATIONS_INVALID_ACTION_OUTPUT");
  }
}

function cloneValidatedWorkspace(
  workspace: FiscalNotificationsWorkspace,
  ownerScope: string,
): FiscalNotificationsWorkspace {
  validateInputWorkspace(workspace, ownerScope);
  if (!hasOnlyEnumerableDataProperties(workspace)) {
    throw new Error("FISCAL_NOTIFICATIONS_INVALID_WORKSPACE");
  }
  let clone: FiscalNotificationsWorkspace;
  try {
    clone = structuredClone(workspace);
  } catch {
    throw new Error("FISCAL_NOTIFICATIONS_INVALID_WORKSPACE");
  }
  // Revalidate the exact clone that will be mutated. This closes TOCTOU and
  // descriptor-loss gaps between the defensive N1 snapshot and structuredClone.
  validateInputWorkspace(clone, ownerScope);
  return clone;
}

function hasOnlyEnumerableDataProperties(value: unknown): boolean {
  if (!value || typeof value !== "object") return true;
  const visited = new WeakSet<object>();
  const pending: object[] = [value];
  const maxInspectedProperties =
    FISCAL_NOTIFICATION_INPUT_LIMITS.maxWorkspaceEntities * 64;
  let inspectedProperties = 0;

  try {
    while (pending.length > 0) {
      const current = pending.pop()!;
      if (visited.has(current)) continue;
      visited.add(current);

      for (const key of Reflect.ownKeys(current)) {
        if (Array.isArray(current) && key === "length") continue;
        if (typeof key !== "string") return false;
        const descriptor = Object.getOwnPropertyDescriptor(current, key);
        if (
          !descriptor ||
          !descriptor.enumerable ||
          !("value" in descriptor)
        ) {
          return false;
        }
        inspectedProperties += 1;
        if (inspectedProperties > maxInspectedProperties) return false;
        if (descriptor.value && typeof descriptor.value === "object") {
          pending.push(descriptor.value);
        }
      }
    }
    return true;
  } catch {
    return false;
  }
}

function finalizeWorkspace(
  workspace: FiscalNotificationsWorkspace,
  ownerScope: string,
  now: string,
): FiscalNotificationsWorkspace {
  if (workspace.revision >= Number.MAX_SAFE_INTEGER) {
    throw new Error("FISCAL_NOTIFICATIONS_REVISION_OVERFLOW");
  }
  workspace.revision += 1;
  workspace.updatedAt = now;
  validateActionWorkspace(workspace, ownerScope);
  return workspace;
}

function assertMonotonicUpdate(
  workspace: FiscalNotificationsWorkspace,
  nowTimestamp: number,
): void {
  const previous = assertIsoTimestamp(
    workspace.updatedAt,
    "FISCAL_NOTIFICATIONS_INVALID_WORKSPACE",
  );
  if (nowTimestamp < previous) {
    throw new Error("FISCAL_NOTIFICATIONS_NON_MONOTONIC_UPDATE");
  }
}

function assertIsoTimestamp(value: string, errorCode: string): number {
  if (typeof value !== "string") throw new Error(errorCode);
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp) || new Date(timestamp).toISOString() !== value) {
    throw new Error(errorCode);
  }
  return timestamp;
}

function isIsoCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const timestamp = Date.parse(`${value}T00:00:00.000Z`);
  return (
    Number.isFinite(timestamp) &&
    new Date(timestamp).toISOString().slice(0, 10) === value
  );
}

function calendarDateFromDateLike(value: string): string {
  if (isIsoCalendarDate(value)) return value;
  assertIsoTimestamp(value, "FISCAL_NOTIFICATIONS_INVALID_REFERENCE_DATE");
  return value.slice(0, 10);
}

function snapshotInstallmentDisplayFields(
  value: unknown,
): { status: PaymentInstallment["status"]; dueDate?: string } | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  try {
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) return null;
    const statusDescriptor = Object.getOwnPropertyDescriptor(value, "status");
    const dueDateDescriptor = Object.getOwnPropertyDescriptor(value, "dueDate");
    if (!statusDescriptor || !("value" in statusDescriptor)) return null;
    if (dueDateDescriptor && !("value" in dueDateDescriptor)) return null;
    if (
      typeof statusDescriptor.value !== "string" ||
      (dueDateDescriptor !== undefined &&
        dueDateDescriptor.value !== undefined &&
        typeof dueDateDescriptor.value !== "string")
    ) {
      return null;
    }
    return {
      status: statusDescriptor.value as PaymentInstallment["status"],
      ...(dueDateDescriptor?.value !== undefined
        ? { dueDate: dueDateDescriptor.value as string }
        : {}),
    };
  } catch {
    return null;
  }
}

function collectWorkspaceIds(
  workspace: FiscalNotificationsWorkspace,
): Set<string> {
  const ids = new Set<string>();
  for (const collection of WORKSPACE_ENTITY_COLLECTIONS) {
    for (const entity of workspace[collection] as readonly { id?: unknown }[]) {
      if (typeof entity.id === "string") ids.add(entity.id);
    }
  }
  return ids;
}

function nextGeneratedId(nextId: () => string, usedIds: Set<string>): string {
  const id = nextId();
  assertBoundedId(id, "nextId");
  if (
    UNSAFE_GENERATED_ID_PREFIXES.some((prefix) =>
      id.toLowerCase().startsWith(prefix),
    )
  ) {
    throw new Error("FISCAL_NOTIFICATIONS_UNSAFE_GENERATED_ID");
  }
  if (usedIds.has(id)) {
    throw new Error("FISCAL_NOTIFICATIONS_DUPLICATE_GENERATED_ID");
  }
  usedIds.add(id);
  return id;
}

function generateIds(
  nextId: () => string,
  usedIds: Set<string>,
  count: number,
): string[] {
  return Array.from({ length: count }, () => nextGeneratedId(nextId, usedIds));
}

function preflightMutation(
  workspace: FiscalNotificationsWorkspace,
  ownerScope: string,
  now: string,
  idCount: number,
  apply: (candidate: FiscalNotificationsWorkspace, ids: readonly string[]) => void,
): void {
  const candidate = structuredClone(workspace);
  const usedIds = collectWorkspaceIds(candidate);
  const ids = Array.from({ length: idCount }, (_, index) =>
    preflightGeneratedId(index, usedIds),
  );
  apply(candidate, ids);
  finalizeWorkspace(candidate, ownerScope, now);
}

function preflightGeneratedId(index: number, usedIds: Set<string>): string {
  const maxAttempts =
    FISCAL_NOTIFICATION_INPUT_LIMITS.maxWorkspaceEntities + 1;
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const prefix = `preflight-payment-action-${index}-${attempt}-`;
    const id = `${prefix}${"x".repeat(160 - prefix.length)}`;
    if (!usedIds.has(id)) {
      usedIds.add(id);
      return id;
    }
  }
  throw new Error("FISCAL_NOTIFICATIONS_PREFLIGHT_ID_EXHAUSTED");
}

function appendPaymentArtifacts(
  workspace: FiscalNotificationsWorkspace,
  ids: readonly string[],
  input: PaymentActionInput,
  transition: PaymentTransition,
): void {
  const installment = workspace.installments.find(
    (item) => item.id === input.installmentId,
  );
  if (!installment) throw new Error("FISCAL_NOTIFICATIONS_INSTALLMENT_NOT_FOUND");
  const plan = workspace.paymentPlans.find(
    (item) => item.id === installment.paymentPlanId,
  );
  if (!plan) throw new Error("FISCAL_NOTIFICATIONS_PAYMENT_PLAN_NOT_FOUND");
  workspace.auditEvents.push({
    id: ids[0]!,
    ownerScope: input.ownerScope,
    eventType: transition.auditType,
    entityType: "INSTALLMENT",
    entityId: installment.id,
    actorScope: input.actorScope,
    occurredAt: input.now,
    safeMetadata: { sequence: installment.sequence },
  });
  if (!plan.caseId) return;
  const administrativeCase = workspace.cases.find(
    (item) => item.id === plan.caseId,
  );
  if (!administrativeCase || !ids[1]) {
    throw new Error("FISCAL_NOTIFICATIONS_CASE_NOT_FOUND");
  }
  const event: TimelineEvent = {
    id: ids[1],
    ownerScope: input.ownerScope,
    caseId: plan.caseId,
    occurredAt: input.now,
    eventType: transition.timelineType,
    documentId: plan.sourceDocumentId,
    installmentId: installment.id,
    summary: transition.summary,
    evidenceIds: [],
  };
  workspace.timeline.push(event);
  administrativeCase.timelineEventIds.push(event.id);
}

function appendAccountingDraftArtifacts(
  workspace: FiscalNotificationsWorkspace,
  ids: readonly string[],
  input: AccountingDraftInput,
): AccountingDraftProposal {
  const installment = workspace.installments.find(
    (item) => item.id === input.installmentId,
  );
  if (!installment) throw new Error("FISCAL_NOTIFICATIONS_INSTALLMENT_NOT_FOUND");
  const plan = workspace.paymentPlans.find(
    (item) => item.id === installment.paymentPlanId,
  );
  if (!plan) throw new Error("FISCAL_NOTIFICATIONS_PAYMENT_PLAN_NOT_FOUND");
  if (installment.totalCents === undefined || !ids[0] || !ids[1]) {
    throw new Error("FISCAL_NOTIFICATIONS_INVALID_ACCOUNTING_AMOUNT");
  }
  const draft: AccountingDraftProposal = {
    id: ids[0],
    ownerScope: input.ownerScope,
    documentId: plan.sourceDocumentId,
    caseId: plan.caseId,
    debtId: plan.debtIds.length === 1 ? plan.debtIds[0] : undefined,
    installmentId: installment.id,
    paymentMatchId: installment.paymentMatchId,
    status: "PENDING_CLASSIFICATION",
    components: installment.components.map((component) => ({
      componentType: component.type,
      amountCents: component.amountCents,
      treatmentStatus: "PENDING_EXISTING_ENGINE",
    })),
    totalCents: installment.totalCents,
    requiresUserConfirmation: true,
    createsExpense: false,
    createsJournalEntry: false,
    createdAt: input.now,
  };
  workspace.accountingDrafts.push(draft);
  workspace.auditEvents.push({
    id: ids[1],
    ownerScope: input.ownerScope,
    eventType: "ACCOUNTING_DRAFT_CREATED",
    entityType: "ACCOUNTING_DRAFT",
    entityId: draft.id,
    actorScope: input.actorScope,
    occurredAt: input.now,
    safeMetadata: { componentCount: draft.components.length },
  });
  if (!plan.caseId) return draft;
  const administrativeCase = workspace.cases.find(
    (item) => item.id === plan.caseId,
  );
  if (!administrativeCase || !ids[2]) {
    throw new Error("FISCAL_NOTIFICATIONS_CASE_NOT_FOUND");
  }
  const event: TimelineEvent = {
    id: ids[2],
    ownerScope: input.ownerScope,
    caseId: plan.caseId,
    occurredAt: input.now,
    eventType: "ACCOUNTING_DRAFT_PROPOSED",
    documentId: plan.sourceDocumentId,
    debtId: plan.debtIds.length === 1 ? plan.debtIds[0] : undefined,
    installmentId: installment.id,
    summary: "Borrador contable pendiente de clasificación y confirmación.",
    evidenceIds: [...installment.evidenceIds],
  };
  workspace.timeline.push(event);
  administrativeCase.timelineEventIds.push(event.id);
  return draft;
}

function paymentTransitionAlreadyApplied(input: {
  workspace: FiscalNotificationsWorkspace;
  installment: PaymentInstallment;
  obligation: FiscalNotificationsWorkspace["obligations"][number] | undefined;
  caseId: string | undefined;
  paidAt: string;
  now: string;
  transition: PaymentTransition;
}): boolean {
  const allowedInstallmentStatuses =
    input.transition.auditType === "PAYMENT_REPORTED"
      ? new Set<PaymentInstallment["status"]>([
          "PAID_UNCONFIRMED",
          "PAID",
          "RECONCILED",
        ])
      : new Set<PaymentInstallment["status"]>(["PAID", "RECONCILED"]);
  if (
    !allowedInstallmentStatuses.has(input.installment.status) ||
    input.installment.paidAt !== input.paidAt ||
    !input.installment.userConfirmed ||
    (input.obligation !== undefined &&
      (input.obligation.status !== input.installment.status ||
        !input.obligation.userConfirmed))
  ) {
    return false;
  }
  const requiredEventTypes = paymentEventTypesForStatus(
    input.installment.status,
  );
  return (
    requiredEventTypes !== null &&
    hasCanonicalPaymentEvents(
      input.workspace,
      input.installment,
      input.caseId,
      input.now,
      requiredEventTypes,
    )
  );
}

function hasCanonicalPaymentHistory(
  workspace: FiscalNotificationsWorkspace,
  installment: PaymentInstallment,
  caseId: string | undefined,
  now: string,
): boolean {
  const requiredEventTypes = paymentEventTypesForStatus(installment.status);
  return (
    requiredEventTypes !== null &&
    hasCanonicalPaymentEvents(
      workspace,
      installment,
      caseId,
      now,
      requiredEventTypes,
    )
  );
}

type PaymentHistoryEventType = Extract<
  FiscalNotificationAuditEventType,
  "PAYMENT_REPORTED" | "PAYMENT_CONFIRMED" | "PAYMENT_RECONCILED"
>;

const PAYMENT_HISTORY_EVENT_TYPES = Object.freeze([
  "PAYMENT_REPORTED",
  "PAYMENT_CONFIRMED",
  "PAYMENT_RECONCILED",
] as const satisfies readonly PaymentHistoryEventType[]);

function paymentEventTypesForStatus(
  status: PaymentInstallment["status"],
): readonly PaymentHistoryEventType[] | null {
  if (status === "PAID_UNCONFIRMED") return ["PAYMENT_REPORTED"];
  if (status === "PAID") {
    return ["PAYMENT_REPORTED", "PAYMENT_CONFIRMED"];
  }
  if (status === "RECONCILED") {
    return [
      "PAYMENT_REPORTED",
      "PAYMENT_CONFIRMED",
      "PAYMENT_RECONCILED",
    ];
  }
  return null;
}

function hasCanonicalPaymentEvents(
  workspace: FiscalNotificationsWorkspace,
  installment: PaymentInstallment,
  caseId: string | undefined,
  now: string,
  requiredEventTypes: readonly PaymentHistoryEventType[],
): boolean {
  if (
    (requiredEventTypes.length === 0 && installment.paidAt !== undefined) ||
    (requiredEventTypes.length > 0 && !installment.paidAt)
  ) return false;
  const required = new Set(requiredEventTypes);
  const orderedTimestamps: string[] = [];
  for (const eventType of PAYMENT_HISTORY_EVENT_TYPES) {
    const audits = workspace.auditEvents.filter(
      (event) =>
        event.eventType === eventType &&
        event.entityType === "INSTALLMENT" &&
        event.entityId === installment.id,
    );
    const timelineEvents = workspace.timeline.filter(
      (event) =>
        event.installmentId === installment.id &&
        event.eventType === eventType,
    );
    if (!required.has(eventType)) {
      if (audits.length !== 0 || timelineEvents.length !== 0) return false;
      continue;
    }
    if (
      audits.length !== 1 ||
      (eventType !== "PAYMENT_RECONCILED" &&
        audits[0]!.actorScope === "SYSTEM") ||
      (caseId === undefined
        ? timelineEvents.length !== 0
        : timelineEvents.length !== 1 ||
          timelineEvents[0]!.caseId !== caseId ||
          timelineEvents[0]!.occurredAt !== audits[0]!.occurredAt)
    ) return false;
    orderedTimestamps.push(audits[0]!.occurredAt);
  }
  return timestampsAreOrderedWithinRange(
    orderedTimestamps,
    installment.paidAt ?? workspace.updatedAt,
    now,
  );
}

function paymentAmountsMatch(
  installment: PaymentInstallment,
  obligation: FiscalNotificationsWorkspace["obligations"][number],
): boolean {
  const installmentAmounts = snapshotPaymentAmounts(installment.components);
  const obligationAmounts = snapshotPaymentAmounts(obligation.components);
  if (
    !installmentAmounts ||
    !obligationAmounts ||
    (installment.totalCents !== undefined &&
      obligation.amountCents !== undefined &&
      installment.totalCents !== obligation.amountCents)
  ) {
    return false;
  }
  for (const [type, installmentValues] of installmentAmounts) {
    const obligationValues = obligationAmounts.get(type);
    if (!obligationValues) continue;
    if (
      installmentValues.length !== obligationValues.length ||
      installmentValues.some(
        (value, index) => value !== obligationValues[index],
      )
    ) return false;
  }
  return true;
}

function snapshotPaymentAmounts(
  components: PaymentInstallment["components"],
): Map<string, number[]> | null {
  const valuesByType = new Map<string, number[]>();
  for (const component of components) {
    if (
      !Number.isSafeInteger(component.amountCents) ||
      component.amountCents < 0
    ) {
      return null;
    }
    const values = valuesByType.get(component.type) ?? [];
    values.push(component.amountCents);
    valuesByType.set(component.type, values);
  }
  for (const values of valuesByType.values()) {
    values.sort((left, right) => left - right);
  }
  return valuesByType;
}

function isTimestampWithinRange(
  value: string,
  minimum: string,
  maximum: string,
): boolean {
  return value >= minimum && value <= maximum;
}

function timestampsAreOrderedWithinRange(
  values: readonly string[],
  minimum: string,
  maximum: string,
): boolean {
  let previous = minimum;
  for (const value of values) {
    if (!isTimestampWithinRange(value, previous, maximum)) return false;
    previous = value;
  }
  return true;
}

function existingDraftMatchesInstallment(
  draft: AccountingDraftProposal,
  installment: PaymentInstallment,
  plan: FiscalNotificationsWorkspace["paymentPlans"][number],
): boolean {
  const expectedDebtId = plan.debtIds.length === 1 ? plan.debtIds[0] : undefined;
  return (
    draft.ownerScope === installment.ownerScope &&
    draft.documentId === plan.sourceDocumentId &&
    draft.caseId === plan.caseId &&
    draft.debtId === expectedDebtId &&
    draft.paymentMatchId === installment.paymentMatchId &&
    draft.totalCents === installment.totalCents &&
    draft.requiresUserConfirmation === true &&
    draft.createsExpense === false &&
    draft.createsJournalEntry === false &&
    draft.components.length === installment.components.length &&
    draft.components.every(
      (component, index) =>
        component.componentType === installment.components[index]?.type &&
        component.amountCents === installment.components[index]?.amountCents &&
        component.treatmentStatus === "PENDING_EXISTING_ENGINE",
    )
  );
}
