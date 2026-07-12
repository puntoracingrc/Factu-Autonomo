import { describe, expect, it } from "vitest";
import {
  confirmReportedInstallmentPayment,
  installmentDisplayState,
  prepareAccountingDraft,
  reportInstallmentPayment,
} from "./payment-actions";
import { FISCAL_NOTIFICATION_INPUT_LIMITS } from "./input-contract";
import type {
  FiscalNotificationsWorkspace,
  MoneyComponent,
} from "./types";
import { validateFiscalNotificationsWorkspaceIntegrity } from "./workspace-integrity";

const OWNER = "guest:synthetic";
const BASE_NOW = "2026-07-01T10:00:00.000Z";
const PAID_AT = "2026-07-05T09:00:00.000Z";
const REPORT_NOW = "2026-08-01T10:00:00.000Z";
const CONFIRM_NOW = "2026-08-01T10:01:00.000Z";
const DRAFT_NOW = "2026-08-01T10:02:00.000Z";

function ids() {
  let value = 0;
  return () => `generated-payment-action-${++value}`;
}

function paymentComponents(): MoneyComponent[] {
  return [
    {
      type: "PRINCIPAL",
      amountCents: 10_000,
      assertionType: "EXPLICIT_IN_DOCUMENT",
      evidenceIds: [],
    },
    {
      type: "INTEREST",
      amountCents: 500,
      assertionType: "EXPLICIT_IN_DOCUMENT",
      evidenceIds: [],
    },
  ];
}

function workspace(): FiscalNotificationsWorkspace {
  const components = paymentComponents();
  return {
    schemaVersion: 1,
    workspaceId: "workspace-payment-actions",
    ownerScope: OWNER,
    revision: 0,
    createdAt: BASE_NOW,
    updatedAt: BASE_NOW,
    packages: [
      {
        id: "package-payment-actions",
        ownerScope: OWNER,
        fileIds: ["file-payment-actions"],
        sourceChannel: "MANUAL_UPLOAD",
        processingStatus: "CONFIRMED",
        securityScanStatus: "PASSED",
        uploadedAt: BASE_NOW,
      },
    ],
    files: [
      {
        id: "file-payment-actions",
        packageId: "package-payment-actions",
        ownerScope: OWNER,
        role: "PRIMARY",
        originalFilename: "synthetic-payment-plan.pdf",
        mimeType: "application/pdf",
        fileSize: 1,
        pageCount: 1,
        sha256: "a".repeat(64),
        contentFingerprint: "b".repeat(64),
        storageReference: "memory:synthetic-payment-plan",
        uploadedAt: BASE_NOW,
        isImmutableOriginal: true,
      },
    ],
    documents: [
      {
        id: "document-payment-actions",
        packageId: "package-payment-actions",
        fileId: "file-payment-actions",
        ownerScope: OWNER,
        documentType: "AEAT_INSTALLMENT_OR_DEFERRAL_GRANT",
        titleRaw: "Documento de pago sintético",
        titleNormalized: "DOCUMENTO DE PAGO SINTETICO",
        authorityId: "authority-payment-actions",
        notificationDates: {},
        status: "ACTIVE",
        urgency: "UPCOMING",
        extractionVersion: "synthetic-v1",
        analysisStatus: "CONFIRMED",
        humanReviewStatus: "CONFIRMED",
        authenticityStatus: "NOT_CHECKED",
        partIds: [],
        referenceIds: [],
        debtIds: ["debt-payment-actions"],
        caseIds: ["case-payment-actions"],
        analysisSnapshotIds: [],
        createdAt: BASE_NOW,
        updatedAt: BASE_NOW,
      },
    ],
    parts: [],
    authorities: [
      {
        id: "authority-payment-actions",
        ownerScope: OWNER,
        administrationType: "AEAT",
        nameRaw: "Organismo público sintético",
        nameNormalized: "ORGANISMO PUBLICO SINTETICO",
      },
    ],
    references: [],
    evidence: [],
    debts: [
      {
        id: "debt-payment-actions",
        ownerScope: OWNER,
        authorityId: "authority-payment-actions",
        collectionStage: "DEFERRAL",
        currentStatus: "IN_PAYMENT_PLAN",
        referenceIds: [],
        documentIds: ["document-payment-actions"],
      },
    ],
    debtObservations: [],
    cases: [
      {
        id: "case-payment-actions",
        ownerScope: OWNER,
        authorityId: "authority-payment-actions",
        caseType: "SYNTHETIC_PAYMENT_PLAN",
        title: "Expediente de pago sintético",
        status: "OPEN",
        openedAt: BASE_NOW,
        referenceIds: [],
        documentIds: ["document-payment-actions"],
        debtIds: ["debt-payment-actions"],
        obligationIds: ["obligation-payment-actions"],
        paymentPlanIds: ["plan-payment-actions"],
        timelineEventIds: [],
        notes: [],
      },
    ],
    relations: [],
    analysisSnapshots: [],
    paymentOptions: [],
    paymentPlans: [
      {
        id: "plan-payment-actions",
        ownerScope: OWNER,
        sourceDocumentId: "document-payment-actions",
        caseId: "case-payment-actions",
        authorityId: "authority-payment-actions",
        grantStatus: "CONFIRMED",
        status: "ACTIVE",
        debtIds: ["debt-payment-actions"],
        installmentIds: ["installment-payment-actions"],
      },
    ],
    installments: [
      {
        id: "installment-payment-actions",
        ownerScope: OWNER,
        paymentPlanId: "plan-payment-actions",
        sequence: 1,
        dueDate: "2026-07-05",
        components,
        totalCents: 10_500,
        status: "PENDING",
        evidenceIds: [],
        userConfirmed: false,
      },
    ],
    interestCalculations: [],
    deadlineRules: [],
    obligations: [
      {
        id: "obligation-payment-actions",
        ownerScope: OWNER,
        sourceDocumentId: "document-payment-actions",
        caseId: "case-payment-actions",
        debtId: "debt-payment-actions",
        paymentPlanId: "plan-payment-actions",
        installmentId: "installment-payment-actions",
        type: "PAY",
        title: "Pago sintético",
        description: "Obligación sintética para pruebas",
        amountCents: 10_500,
        components: structuredClone(components),
        dueDate: "2026-07-05",
        dueDateStatus: "CONFIRMED",
        status: "PENDING",
        evidenceIds: [],
        userConfirmed: false,
      },
    ],
    timeline: [],
    accountingDrafts: [],
    auditEvents: [],
  };
}

function expectValid(candidate: FiscalNotificationsWorkspace): void {
  expect(
    validateFiscalNotificationsWorkspaceIntegrity(candidate, OWNER),
  ).toEqual({ valid: true, issues: [] });
}

function report(
  candidate: FiscalNotificationsWorkspace,
  nextId: () => string,
  now = REPORT_NOW,
): FiscalNotificationsWorkspace {
  return reportInstallmentPayment({
    ownerScope: OWNER,
    workspace: candidate,
    installmentId: "installment-payment-actions",
    paidAt: PAID_AT,
    now,
    nextId,
    actorScope: "LOCAL_USER",
  });
}

function confirm(
  candidate: FiscalNotificationsWorkspace,
  nextId: () => string,
  now = CONFIRM_NOW,
): FiscalNotificationsWorkspace {
  return confirmReportedInstallmentPayment({
    ownerScope: OWNER,
    workspace: candidate,
    installmentId: "installment-payment-actions",
    paidAt: PAID_AT,
    now,
    nextId,
    actorScope: "LOCAL_USER",
  });
}

describe("fiscal notification payment actions", () => {
  it("derives overdue display state without persisting debt or mutating input", () => {
    const candidate = workspace();
    const before = structuredClone(candidate);
    expectValid(candidate);

    expect(
      installmentDisplayState(
        candidate.installments[0]!,
        "2026-08-01T00:00:00.000Z",
      ),
    ).toEqual({
      status: "OVERDUE_NO_PAYMENT_RECORDED",
      label: "Vencida; no consta pago en el programa",
      isDerived: true,
    });
    expect(candidate.installments[0]?.status).toBe("PENDING");
    expect(candidate.debts[0]?.currentStatus).toBe("IN_PAYMENT_PLAN");
    expect(candidate).toEqual(before);
  });

  it("keeps reported, human-confirmed and reconciled payment states separate", () => {
    const candidate = workspace();
    const before = structuredClone(candidate);
    const nextId = ids();

    const reported = report(candidate, nextId);
    expect(candidate).toEqual(before);
    expect(reported.installments[0]).toMatchObject({
      status: "PAID_UNCONFIRMED",
      paidAt: PAID_AT,
      userConfirmed: true,
    });
    expect(reported.obligations[0]).toMatchObject({
      status: "PAID_UNCONFIRMED",
      userConfirmed: true,
    });
    expect(reported.paymentPlans[0]?.status).toBe("ACTIVE");
    expect(reported.debts[0]?.currentStatus).toBe("IN_PAYMENT_PLAN");
    expect(reported.auditEvents.map((event) => event.eventType)).toEqual([
      "PAYMENT_REPORTED",
    ]);
    expect(reported.timeline).toMatchObject([
      { eventType: "PAYMENT_REPORTED", occurredAt: REPORT_NOW },
    ]);
    expectValid(reported);

    const retry = report(reported, () => {
      throw new Error("nextId must not run for an idempotent retry");
    }, CONFIRM_NOW);
    expect(retry).toEqual(reported);
    expect(retry).not.toBe(reported);

    const confirmed = confirm(reported, nextId);
    expect(confirmed.installments[0]?.status).toBe("PAID");
    expect(confirmed.installments[0]?.status).not.toBe("RECONCILED");
    expect(confirmed.obligations[0]?.status).toBe("PAID");
    expect(confirmed.paymentPlans[0]?.status).toBe("ACTIVE");
    expect(confirmed.debts[0]?.currentStatus).toBe("IN_PAYMENT_PLAN");
    expect(confirmed.auditEvents.map((event) => event.eventType)).toEqual([
      "PAYMENT_REPORTED",
      "PAYMENT_CONFIRMED",
    ]);
    expect(confirmed.timeline.map((event) => event.eventType)).toEqual([
      "PAYMENT_REPORTED",
      "PAYMENT_CONFIRMED",
    ]);
    expect(confirmed.timeline.map((event) => event.occurredAt)).toEqual([
      REPORT_NOW,
      CONFIRM_NOW,
    ]);
    expect(new Set(confirmed.auditEvents.map((event) => event.id)).size).toBe(2);
    expect(new Set(confirmed.timeline.map((event) => event.id)).size).toBe(2);
    expectValid(confirmed);

    const confirmedRetry = confirm(confirmed, () => {
      throw new Error("nextId must not run for an idempotent retry");
    }, DRAFT_NOW);
    expect(confirmedRetry).toEqual(confirmed);
    expect(confirmedRetry).not.toBe(confirmed);

    const lateReportRetry = report(confirmed, () => {
      throw new Error("nextId must not run for a late idempotent retry");
    }, DRAFT_NOW);
    expect(lateReportRetry).toEqual(confirmed);

    const reconciled = structuredClone(confirmed);
    reconciled.installments[0]!.status = "RECONCILED";
    reconciled.obligations[0]!.status = "RECONCILED";
    expectValid(reconciled);
    expect(() =>
      report(reconciled, () => {
        throw new Error("nextId must not run after reconciliation");
      }, DRAFT_NOW),
    ).toThrow("FISCAL_NOTIFICATIONS_PAYMENT_HISTORY_REQUIRED");
    expect(() =>
      confirm(reconciled, () => {
        throw new Error("nextId must not run after reconciliation");
      }, DRAFT_NOW),
    ).toThrow("FISCAL_NOTIFICATIONS_PAYMENT_HISTORY_REQUIRED");
  });

  it("does not let confirmation rewrite the originally reported payment date", () => {
    const nextId = ids();
    const reported = report(workspace(), nextId);
    const before = structuredClone(reported);

    expect(() =>
      confirmReportedInstallmentPayment({
        ownerScope: OWNER,
        workspace: reported,
        installmentId: "installment-payment-actions",
        paidAt: "2026-07-20T09:00:00.000Z",
        now: CONFIRM_NOW,
        nextId,
        actorScope: "LOCAL_USER",
      }),
    ).toThrow("FISCAL_NOTIFICATIONS_PAYMENT_DATE_MISMATCH");
    expect(reported).toEqual(before);
  });

  it.each([
    "2026-07-05",
    "2026-02-30T09:00:00.000Z",
    "2026-07-05T09:00:00Z",
    "2026-07-05T25:00:00.000Z",
  ])("rejects non-canonical payment timestamps before mutation: %s", (paidAt) => {
    const candidate = workspace();
    const before = structuredClone(candidate);
    expect(() =>
      reportInstallmentPayment({
        ownerScope: OWNER,
        workspace: candidate,
        installmentId: "installment-payment-actions",
        paidAt,
        now: REPORT_NOW,
        nextId: ids(),
        actorScope: "LOCAL_USER",
      }),
    ).toThrow("FISCAL_NOTIFICATIONS_INVALID_PAID_AT");
    expect(candidate).toEqual(before);
  });

  it("rejects future and non-monotonic action times", () => {
    const candidate = workspace();
    expect(() =>
      reportInstallmentPayment({
        ownerScope: OWNER,
        workspace: candidate,
        installmentId: "installment-payment-actions",
        paidAt: "2026-08-02T10:00:00.000Z",
        now: REPORT_NOW,
        nextId: ids(),
        actorScope: "LOCAL_USER",
      }),
    ).toThrow("FISCAL_NOTIFICATIONS_PAID_AT_IN_FUTURE");

    expect(() =>
      reportInstallmentPayment({
        ownerScope: OWNER,
        workspace: candidate,
        installmentId: "installment-payment-actions",
        paidAt: "2026-06-29T10:00:00.000Z",
        now: "2026-06-30T10:00:00.000Z",
        nextId: ids(),
        actorScope: "LOCAL_USER",
      }),
    ).toThrow("FISCAL_NOTIFICATIONS_NON_MONOTONIC_UPDATE");
    expect(() =>
      installmentDisplayState(
        candidate.installments[0]!,
        "2026-02-30",
      ),
    ).toThrow("FISCAL_NOTIFICATIONS_INVALID_REFERENCE_DATE");
  });

  it("rejects materialized overdue state and ambiguous obligations", () => {
    const materialized = workspace();
    materialized.installments[0]!.status = "OVERDUE_NO_PAYMENT_RECORDED";
    expectValid(materialized);
    expect(() => report(materialized, ids())).toThrow(
      "FISCAL_NOTIFICATIONS_INVALID_PAYMENT_TRANSITION",
    );

    const ambiguous = workspace();
    ambiguous.obligations.push({
      ...structuredClone(ambiguous.obligations[0]!),
      id: "obligation-payment-actions-duplicate",
    });
    ambiguous.cases[0]!.obligationIds.push(
      "obligation-payment-actions-duplicate",
    );
    expectValid(ambiguous);
    expect(() => report(ambiguous, ids())).toThrow(
      "FISCAL_NOTIFICATIONS_AMBIGUOUS_PAYMENT_OBLIGATION",
    );

    const wrongType = workspace();
    wrongType.obligations[0]!.type = "RESPOND";
    expectValid(wrongType);
    expect(() => report(wrongType, ids())).toThrow(
      "FISCAL_NOTIFICATIONS_PAYMENT_OBLIGATION_TYPE_MISMATCH",
    );
  });

  it("rejects contradictory amounts before marking a payment", () => {
    const totalMismatch = workspace();
    totalMismatch.installments[0]!.totalCents = 10_499;
    expectValid(totalMismatch);
    expect(() => report(totalMismatch, ids())).toThrow(
      "FISCAL_NOTIFICATIONS_PAYMENT_AMOUNT_MISMATCH",
    );

    const obligationMismatch = workspace();
    obligationMismatch.obligations[0]!.amountCents = 10_499;
    expectValid(obligationMismatch);
    expect(() => report(obligationMismatch, ids())).toThrow(
      "FISCAL_NOTIFICATIONS_PAYMENT_AMOUNT_MISMATCH",
    );

    const componentMismatch = workspace();
    componentMismatch.obligations[0]!.components[1]!.amountCents = 499;
    expectValid(componentMismatch);
    expect(() => report(componentMismatch, ids())).toThrow(
      "FISCAL_NOTIFICATIONS_PAYMENT_AMOUNT_MISMATCH",
    );

    const partialClassifications = workspace();
    partialClassifications.installments[0]!.components = [
      {
        type: "PRINCIPAL",
        amountCents: 10_500,
        assertionType: "EXPLICIT_IN_DOCUMENT",
        evidenceIds: [],
      },
    ];
    partialClassifications.obligations[0]!.components = [
      {
        type: "INTEREST",
        amountCents: 10_500,
        assertionType: "EXPLICIT_IN_DOCUMENT",
        evidenceIds: [],
      },
    ];
    expectValid(partialClassifications);
    expect(report(partialClassifications, ids()).installments[0]?.status).toBe(
      "PAID_UNCONFIRMED",
    );

    const crossRepresentationMismatch = workspace();
    crossRepresentationMismatch.installments[0]!.components = [];
    crossRepresentationMismatch.obligations[0]!.amountCents = undefined;
    crossRepresentationMismatch.obligations[0]!.components[1]!.amountCents =
      499;
    expectValid(crossRepresentationMismatch);
    expect(
      report(crossRepresentationMismatch, ids()).installments[0]?.status,
    ).toBe("PAID_UNCONFIRMED");

    const partialBreakdowns = workspace();
    partialBreakdowns.installments[0]!.totalCents = undefined;
    partialBreakdowns.obligations[0]!.amountCents = undefined;
    partialBreakdowns.obligations[0]!.components.push({
      type: "COSTS",
      amountCents: 200,
      assertionType: "EXPLICIT_IN_DOCUMENT",
      evidenceIds: [],
    });
    expectValid(partialBreakdowns);
    expect(report(partialBreakdowns, ids()).installments[0]?.status).toBe(
      "PAID_UNCONFIRMED",
    );

    const incomplete = workspace();
    incomplete.installments[0]!.totalCents = undefined;
    incomplete.obligations[0]!.amountCents = undefined;
    expectValid(incomplete);
    expect(report(incomplete, ids()).installments[0]?.status).toBe(
      "PAID_UNCONFIRMED",
    );

    const aggregateComponents = workspace();
    aggregateComponents.installments[0]!.components.push({
      type: "TOTAL_DEBT",
      amountCents: 10_500,
      assertionType: "EXPLICIT_IN_DOCUMENT",
      evidenceIds: [],
    });
    aggregateComponents.obligations[0]!.components = structuredClone(
      aggregateComponents.installments[0]!.components,
    ).reverse();
    expectValid(aggregateComponents);
    expect(report(aggregateComponents, ids()).installments[0]?.status).toBe(
      "PAID_UNCONFIRMED",
    );

    const distinctAggregates = workspace();
    distinctAggregates.installments[0]!.components = [
      {
        type: "TOTAL_DEBT",
        amountCents: 100_000,
        assertionType: "EXPLICIT_IN_DOCUMENT",
        evidenceIds: [],
      },
    ];
    distinctAggregates.obligations[0]!.components = [
      {
        type: "AMOUNT_TO_PAY",
        amountCents: 10_000,
        assertionType: "EXPLICIT_IN_DOCUMENT",
        evidenceIds: [],
      },
    ];
    expectValid(distinctAggregates);
    expect(report(distinctAggregates, ids()).installments[0]?.status).toBe(
      "PAID_UNCONFIRMED",
    );

    const crossRepresentationMatch = workspace();
    crossRepresentationMatch.installments[0]!.components = [];
    crossRepresentationMatch.obligations[0]!.amountCents = undefined;
    expectValid(crossRepresentationMatch);
    expect(report(crossRepresentationMatch, ids()).installments[0]?.status).toBe(
      "PAID_UNCONFIRMED",
    );
  });

  it("requires canonical report history and aligned obligation states", () => {
    const missingReport = workspace();
    missingReport.installments[0]!.status = "PAID_UNCONFIRMED";
    missingReport.installments[0]!.paidAt = PAID_AT;
    missingReport.installments[0]!.userConfirmed = true;
    missingReport.obligations[0]!.status = "PAID_UNCONFIRMED";
    missingReport.obligations[0]!.userConfirmed = true;
    expectValid(missingReport);
    expect(() => confirm(missingReport, ids())).toThrow(
      "FISCAL_NOTIFICATIONS_PAYMENT_HISTORY_REQUIRED",
    );

    const obligationBehind = report(workspace(), ids());
    obligationBehind.obligations[0]!.status = "PENDING";
    obligationBehind.obligations[0]!.userConfirmed = false;
    expectValid(obligationBehind);
    expect(() => confirm(obligationBehind, ids())).toThrow(
      "FISCAL_NOTIFICATIONS_INCONSISTENT_PAYMENT_STATE",
    );

    const obligationAhead = workspace();
    obligationAhead.obligations[0]!.status = "PAID_UNCONFIRMED";
    obligationAhead.obligations[0]!.userConfirmed = true;
    expectValid(obligationAhead);
    expect(() => report(obligationAhead, ids())).toThrow(
      "FISCAL_NOTIFICATIONS_INCONSISTENT_PAYMENT_STATE",
    );

    const retryIds = ids();
    const misalignedRetry = confirm(
      report(workspace(), retryIds),
      retryIds,
    );
    misalignedRetry.obligations[0]!.status = "RECONCILED";
    expectValid(misalignedRetry);
    expect(() => confirm(misalignedRetry, ids(), DRAFT_NOW)).toThrow(
      "FISCAL_NOTIFICATIONS_PAYMENT_HISTORY_REQUIRED",
    );
  });

  it("accepts canonical timestamp due dates and rejects display accessors", () => {
    const candidate = workspace();
    candidate.installments[0]!.dueDate = "2026-07-05T00:00:00.000Z";
    expectValid(candidate);
    expect(
      installmentDisplayState(candidate.installments[0]!, "2026-08-01"),
    ).toMatchObject({
      status: "OVERDUE_NO_PAYMENT_RECORDED",
      isDerived: true,
    });

    let getterCalls = 0;
    const hostile: Record<string, unknown> = { dueDate: "2026-07-05" };
    Object.defineProperty(hostile, "status", {
      enumerable: true,
      get() {
        getterCalls += 1;
        return "PENDING";
      },
    });
    expect(() =>
      installmentDisplayState(
        hostile as unknown as FiscalNotificationsWorkspace["installments"][number],
        "2026-08-01",
      ),
    ).toThrow("FISCAL_NOTIFICATIONS_INVALID_INSTALLMENT_DISPLAY_INPUT");
    expect(getterCalls).toBe(0);
  });

  it("fails closed for foreign related entities and unsafe generated ids", () => {
    const foreign = workspace();
    foreign.obligations[0]!.ownerScope = "guest:foreign";
    const foreignBefore = structuredClone(foreign);
    expect(() => report(foreign, ids())).toThrow(
      "FISCAL_NOTIFICATIONS_OWNER_SCOPE_MISMATCH",
    );
    expect(foreign).toEqual(foreignBefore);

    const duplicateId = workspace();
    const duplicateBefore = structuredClone(duplicateId);
    expect(() => report(duplicateId, () => "package-payment-actions")).toThrow(
      "FISCAL_NOTIFICATIONS_DUPLICATE_GENERATED_ID",
    );
    expect(duplicateId).toEqual(duplicateBefore);

    const unsafeId = workspace();
    const unsafeBefore = structuredClone(unsafeId);
    expect(() => report(unsafeId, () => "nif-generated-payment-action")).toThrow(
      "FISCAL_NOTIFICATIONS_UNSAFE_GENERATED_ID",
    );
    expect(unsafeId).toEqual(unsafeBefore);
  });

  it("revalidates the exact clone before returning or consuming ids", () => {
    const descriptorLoss = workspace();
    Object.defineProperty(descriptorLoss.installments[0]!, "dueDate", {
      value: "2026-07-05",
      enumerable: false,
      configurable: true,
      writable: true,
    });
    expectValid(descriptorLoss);
    let idCalls = 0;
    expect(() =>
      report(descriptorLoss, () => {
        idCalls += 1;
        return `generated-${idCalls}`;
      }),
    ).toThrow("FISCAL_NOTIFICATIONS_INVALID_WORKSPACE");
    expect(idCalls).toBe(0);
  });

  it("cannot exhaust preflight using the former bounded id namespace", () => {
    const candidate = workspace();
    candidate.authorities.push(
      ...Array.from({ length: 1_000 }, (_, attempt) => {
        const prefix = `preflight-payment-action-0-${attempt}-`;
        return {
          id: `${prefix}${"x".repeat(160 - prefix.length)}`,
          ownerScope: OWNER,
          administrationType: "OTHER" as const,
          nameRaw: "Organismo sintético reservado",
          nameNormalized: "ORGANISMO SINTETICO RESERVADO",
        };
      }),
    );
    expectValid(candidate);

    const result = report(candidate, ids());

    expect(result.installments[0]?.status).toBe("PAID_UNCONFIRMED");
    expectValid(result);
  });

  it("preflights collection limits before consuming generated ids", () => {
    const fullTimeline = workspace();
    fullTimeline.timeline = Array.from(
      { length: FISCAL_NOTIFICATION_INPUT_LIMITS.maxCollectionItems },
      (_, index) => ({
        id: `timeline-preflight-${index}`,
        ownerScope: OWNER,
        caseId: "case-payment-actions",
        occurredAt: BASE_NOW,
        eventType: "INSTALLMENT_DUE" as const,
        documentId: "document-payment-actions",
        installmentId: "installment-payment-actions",
        summary: "Evento sintético",
        evidenceIds: [],
      }),
    );
    fullTimeline.cases[0]!.timelineEventIds = fullTimeline.timeline.map(
      (event) => event.id,
    );
    expectValid(fullTimeline);
    let idCalls = 0;
    expect(() =>
      report(fullTimeline, () => {
        idCalls += 1;
        return `generated-${idCalls}`;
      }),
    ).toThrow("FISCAL_NOTIFICATIONS_INVALID_ACTION_OUTPUT");
    expect(idCalls).toBe(0);
  });

  it("rejects unknown keys and accessors without evaluating them", () => {
    const extra = {
      ownerScope: OWNER,
      workspace: workspace(),
      installmentId: "installment-payment-actions",
      paidAt: PAID_AT,
      now: REPORT_NOW,
      nextId: ids(),
      actorScope: "LOCAL_USER" as const,
      nif: "synthetic-marker",
    };
    expect(() => reportInstallmentPayment(extra)).toThrow(
      "FISCAL_NOTIFICATIONS_INVALID_ACTION_INPUT",
    );

    let getterCalls = 0;
    const accessor: Record<string, unknown> = {
      ownerScope: OWNER,
      workspace: workspace(),
      installmentId: "installment-payment-actions",
      paidAt: PAID_AT,
      now: REPORT_NOW,
      actorScope: "LOCAL_USER",
    };
    Object.defineProperty(accessor, "nextId", {
      enumerable: true,
      get() {
        getterCalls += 1;
        return ids();
      },
    });
    expect(() =>
      reportInstallmentPayment(
        accessor as unknown as Parameters<
          typeof reportInstallmentPayment
        >[0],
      ),
    ).toThrow("FISCAL_NOTIFICATIONS_INVALID_ACTION_INPUT");
    expect(getterCalls).toBe(0);
  });

  it("creates only an isolated pending accounting proposal", () => {
    const nextId = ids();
    const reported = report(workspace(), nextId);
    expect(() =>
      prepareAccountingDraft({
        ownerScope: OWNER,
        workspace: reported,
        installmentId: "installment-payment-actions",
        now: CONFIRM_NOW,
        nextId,
        actorScope: "LOCAL_USER",
      }),
    ).toThrow("FISCAL_NOTIFICATIONS_PAYMENT_NOT_CONFIRMED");

    const confirmed = confirm(reported, nextId);
    const before = structuredClone(confirmed);
    const result = prepareAccountingDraft({
      ownerScope: OWNER,
      workspace: confirmed,
      installmentId: "installment-payment-actions",
      now: DRAFT_NOW,
      nextId,
      actorScope: "LOCAL_USER",
    });
    expect(confirmed).toEqual(before);
    expect(result.draft).toMatchObject({
      status: "PENDING_CLASSIFICATION",
      createsExpense: false,
      createsJournalEntry: false,
      requiresUserConfirmation: true,
      totalCents: 10_500,
    });
    expect(result.draft.components).toHaveLength(2);
    expect(
      result.draft.components.every(
        (item) =>
          item.proposedAccountCode === undefined &&
          item.treatmentStatus === "PENDING_EXISTING_ENGINE",
      ),
    ).toBe(true);
    expect(result.workspace.paymentPlans[0]?.status).toBe("ACTIVE");
    expect(result.workspace.debts[0]?.currentStatus).toBe("IN_PAYMENT_PLAN");
    expectValid(result.workspace);

    const duplicateAttempt = prepareAccountingDraft({
      ownerScope: OWNER,
      workspace: result.workspace,
      installmentId: "installment-payment-actions",
      now: "2026-08-01T10:03:00.000Z",
      nextId: () => {
        throw new Error("nextId must not run for an idempotent retry");
      },
      actorScope: "LOCAL_USER",
    });
    expect(duplicateAttempt.workspace).toEqual(result.workspace);
    expect(duplicateAttempt.workspace).not.toBe(result.workspace);
    expect(duplicateAttempt.draft.id).toBe(result.draft.id);
    duplicateAttempt.draft.status = "REJECTED";
    expect(result.draft.status).toBe("PENDING_CLASSIFICATION");
  });

  it("requires coherent human payment history before drafting", () => {
    const unconfirmed = workspace();
    unconfirmed.installments[0]!.status = "PAID";
    unconfirmed.installments[0]!.paidAt = PAID_AT;
    unconfirmed.obligations[0]!.status = "PAID";
    expectValid(unconfirmed);
    expect(() =>
      prepareAccountingDraft({
        ownerScope: OWNER,
        workspace: unconfirmed,
        installmentId: "installment-payment-actions",
        now: REPORT_NOW,
        nextId: ids(),
        actorScope: "LOCAL_USER",
      }),
    ).toThrow("FISCAL_NOTIFICATIONS_PAYMENT_NOT_CONFIRMED");

    const missingHistory = structuredClone(unconfirmed);
    missingHistory.installments[0]!.userConfirmed = true;
    missingHistory.obligations[0]!.userConfirmed = true;
    expectValid(missingHistory);
    expect(() =>
      prepareAccountingDraft({
        ownerScope: OWNER,
        workspace: missingHistory,
        installmentId: "installment-payment-actions",
        now: REPORT_NOW,
        nextId: ids(),
        actorScope: "LOCAL_USER",
      }),
    ).toThrow("FISCAL_NOTIFICATIONS_PAYMENT_HISTORY_REQUIRED");
  });

  it("rejects system, duplicate, future and inverted payment histories", () => {
    const nextId = ids();
    const confirmed = confirm(report(workspace(), nextId), nextId);

    const systemHistory = structuredClone(confirmed);
    systemHistory.auditEvents.find(
      (event) => event.eventType === "PAYMENT_REPORTED",
    )!.actorScope = "SYSTEM";
    expectValid(systemHistory);
    expect(() =>
      prepareAccountingDraft({
        ownerScope: OWNER,
        workspace: systemHistory,
        installmentId: "installment-payment-actions",
        now: DRAFT_NOW,
        nextId: ids(),
        actorScope: "LOCAL_USER",
      }),
    ).toThrow("FISCAL_NOTIFICATIONS_PAYMENT_HISTORY_REQUIRED");

    const systemRetry = report(workspace(), ids());
    systemRetry.auditEvents[0]!.actorScope = "SYSTEM";
    expectValid(systemRetry);
    expect(() => report(systemRetry, ids(), CONFIRM_NOW)).toThrow(
      "FISCAL_NOTIFICATIONS_PAYMENT_HISTORY_REQUIRED",
    );

    const duplicateHistory = structuredClone(confirmed);
    duplicateHistory.auditEvents.push({
      ...structuredClone(duplicateHistory.auditEvents[0]!),
      id: "duplicate-payment-history",
    });
    expectValid(duplicateHistory);
    expect(() =>
      prepareAccountingDraft({
        ownerScope: OWNER,
        workspace: duplicateHistory,
        installmentId: "installment-payment-actions",
        now: DRAFT_NOW,
        nextId: ids(),
        actorScope: "LOCAL_USER",
      }),
    ).toThrow("FISCAL_NOTIFICATIONS_PAYMENT_HISTORY_REQUIRED");

    const futureHistory = structuredClone(confirmed);
    futureHistory.auditEvents.find(
      (event) => event.eventType === "PAYMENT_CONFIRMED",
    )!.occurredAt = "2026-08-01T10:03:00.000Z";
    futureHistory.timeline.find(
      (event) => event.eventType === "PAYMENT_CONFIRMED",
    )!.occurredAt = "2026-08-01T10:03:00.000Z";
    expectValid(futureHistory);
    expect(() =>
      prepareAccountingDraft({
        ownerScope: OWNER,
        workspace: futureHistory,
        installmentId: "installment-payment-actions",
        now: DRAFT_NOW,
        nextId: ids(),
        actorScope: "LOCAL_USER",
      }),
    ).toThrow("FISCAL_NOTIFICATIONS_PAYMENT_HISTORY_REQUIRED");

    const invertedHistory = structuredClone(confirmed);
    invertedHistory.auditEvents.find(
      (event) => event.eventType === "PAYMENT_REPORTED",
    )!.occurredAt = CONFIRM_NOW;
    invertedHistory.timeline.find(
      (event) => event.eventType === "PAYMENT_REPORTED",
    )!.occurredAt = CONFIRM_NOW;
    invertedHistory.auditEvents.find(
      (event) => event.eventType === "PAYMENT_CONFIRMED",
    )!.occurredAt = REPORT_NOW;
    invertedHistory.timeline.find(
      (event) => event.eventType === "PAYMENT_CONFIRMED",
    )!.occurredAt = REPORT_NOW;
    expectValid(invertedHistory);
    expect(() =>
      prepareAccountingDraft({
        ownerScope: OWNER,
        workspace: invertedHistory,
        installmentId: "installment-payment-actions",
        now: DRAFT_NOW,
        nextId: ids(),
        actorScope: "LOCAL_USER",
      }),
    ).toThrow("FISCAL_NOTIFICATIONS_PAYMENT_HISTORY_REQUIRED");
  });

  it("rejects payment artifacts that are ahead of the current state", () => {
    const nextId = ids();
    const ghostPending = report(workspace(), nextId);
    ghostPending.installments[0]!.status = "PENDING";
    ghostPending.installments[0]!.paidAt = undefined;
    ghostPending.installments[0]!.userConfirmed = false;
    ghostPending.obligations[0]!.status = "PENDING";
    ghostPending.obligations[0]!.userConfirmed = false;
    expectValid(ghostPending);
    expect(() => report(ghostPending, ids(), CONFIRM_NOW)).toThrow(
      "FISCAL_NOTIFICATIONS_PAYMENT_HISTORY_REQUIRED",
    );

    const reported = report(workspace(), ids());
    reported.auditEvents.push({
      id: "future-confirm-audit",
      ownerScope: OWNER,
      eventType: "PAYMENT_CONFIRMED",
      entityType: "INSTALLMENT",
      entityId: "installment-payment-actions",
      actorScope: "LOCAL_USER",
      occurredAt: CONFIRM_NOW,
    });
    reported.timeline.push({
      id: "future-confirm-timeline",
      ownerScope: OWNER,
      caseId: "case-payment-actions",
      occurredAt: CONFIRM_NOW,
      eventType: "PAYMENT_CONFIRMED",
      documentId: "document-payment-actions",
      installmentId: "installment-payment-actions",
      summary: "Confirmación sintética adelantada",
      evidenceIds: [],
    });
    reported.cases[0]!.timelineEventIds.push("future-confirm-timeline");
    expectValid(reported);
    expect(() => confirm(reported, ids(), DRAFT_NOW)).toThrow(
      "FISCAL_NOTIFICATIONS_PAYMENT_HISTORY_REQUIRED",
    );

    const confirmedIds = ids();
    const confirmed = confirm(
      report(workspace(), confirmedIds),
      confirmedIds,
    );
    confirmed.auditEvents.push({
      id: "future-reconcile-audit",
      ownerScope: OWNER,
      eventType: "PAYMENT_RECONCILED",
      entityType: "INSTALLMENT",
      entityId: "installment-payment-actions",
      actorScope: "SYSTEM",
      occurredAt: DRAFT_NOW,
    });
    confirmed.timeline.push({
      id: "future-reconcile-timeline",
      ownerScope: OWNER,
      caseId: "case-payment-actions",
      occurredAt: DRAFT_NOW,
      eventType: "PAYMENT_RECONCILED",
      documentId: "document-payment-actions",
      installmentId: "installment-payment-actions",
      summary: "Conciliación sintética adelantada",
      evidenceIds: [],
    });
    confirmed.cases[0]!.timelineEventIds.push("future-reconcile-timeline");
    expectValid(confirmed);
    expect(() =>
      confirm(confirmed, ids(), "2026-08-01T10:04:00.000Z"),
    ).toThrow("FISCAL_NOTIFICATIONS_PAYMENT_HISTORY_REQUIRED");
  });

  it("rejects negative, overflowing and inconsistent accounting amounts", () => {
    const contradictoryIds = ids();
    const contradictory = confirm(
      report(workspace(), contradictoryIds),
      contradictoryIds,
    );
    contradictory.obligations[0]!.amountCents = 10_499;
    expectValid(contradictory);
    expect(() =>
      prepareAccountingDraft({
        ownerScope: OWNER,
        workspace: contradictory,
        installmentId: "installment-payment-actions",
        now: DRAFT_NOW,
        nextId: ids(),
        actorScope: "LOCAL_USER",
      }),
    ).toThrow("FISCAL_NOTIFICATIONS_PAYMENT_AMOUNT_MISMATCH");

    const negativeIds = ids();
    const negative = confirm(report(workspace(), negativeIds), negativeIds);
    negative.installments[0]!.components[0]!.amountCents = -1;
    negative.installments[0]!.totalCents = -1;
    expect(() =>
      prepareAccountingDraft({
        ownerScope: OWNER,
        workspace: negative,
        installmentId: "installment-payment-actions",
        now: DRAFT_NOW,
        nextId: ids(),
        actorScope: "LOCAL_USER",
      }),
    ).toThrow("FISCAL_NOTIFICATIONS_INVALID_WORKSPACE");

    const overflowIds = ids();
    const overflow = confirm(report(workspace(), overflowIds), overflowIds);
    overflow.installments[0]!.components = [
      {
        type: "PRINCIPAL",
        amountCents: Number.MAX_SAFE_INTEGER,
        assertionType: "USER_CONFIRMED",
        evidenceIds: [],
      },
      {
        type: "INTEREST",
        amountCents: 1,
        assertionType: "USER_CONFIRMED",
        evidenceIds: [],
      },
    ];
    overflow.installments[0]!.totalCents = Number.MAX_SAFE_INTEGER;
    expectValid(overflow);
    expect(() =>
      prepareAccountingDraft({
        ownerScope: OWNER,
        workspace: overflow,
        installmentId: "installment-payment-actions",
        now: DRAFT_NOW,
        nextId: ids(),
        actorScope: "LOCAL_USER",
      }),
    ).toThrow("FISCAL_NOTIFICATIONS_ACCOUNTING_AMOUNT_OVERFLOW");

    const mismatchIds = ids();
    const mismatch = confirm(report(workspace(), mismatchIds), mismatchIds);
    mismatch.installments[0]!.totalCents = 10_499;
    expectValid(mismatch);
    expect(() =>
      prepareAccountingDraft({
        ownerScope: OWNER,
        workspace: mismatch,
        installmentId: "installment-payment-actions",
        now: DRAFT_NOW,
        nextId: ids(),
        actorScope: "LOCAL_USER",
      }),
    ).toThrow("FISCAL_NOTIFICATIONS_ACCOUNTING_COMPONENT_MISMATCH");
  });

  it("requires explicit match and evidence for pre-existing reconciled state", () => {
    const nextId = ids();
    const reconciled = confirm(report(workspace(), nextId), nextId);
    reconciled.installments[0]!.status = "RECONCILED";
    reconciled.obligations[0]!.status = "RECONCILED";
    expectValid(reconciled);

    expect(() =>
      prepareAccountingDraft({
        ownerScope: OWNER,
        workspace: reconciled,
        installmentId: "installment-payment-actions",
        now: DRAFT_NOW,
        nextId: ids(),
        actorScope: "LOCAL_USER",
      }),
    ).toThrow("FISCAL_NOTIFICATIONS_RECONCILIATION_EVIDENCE_REQUIRED");
  });

  it("rejects a stale existing draft instead of silently reusing it", () => {
    const nextId = ids();
    const confirmed = confirm(report(workspace(), nextId), nextId);
    const first = prepareAccountingDraft({
      ownerScope: OWNER,
      workspace: confirmed,
      installmentId: "installment-payment-actions",
      now: DRAFT_NOW,
      nextId,
      actorScope: "LOCAL_USER",
    });
    const stale = structuredClone(first.workspace);
    stale.accountingDrafts[0]!.totalCents = 10_499;
    expectValid(stale);

    expect(() =>
      prepareAccountingDraft({
        ownerScope: OWNER,
        workspace: stale,
        installmentId: "installment-payment-actions",
        now: "2026-08-01T10:03:00.000Z",
        nextId,
        actorScope: "LOCAL_USER",
      }),
    ).toThrow("FISCAL_NOTIFICATIONS_STALE_ACCOUNTING_DRAFT");
  });
});
