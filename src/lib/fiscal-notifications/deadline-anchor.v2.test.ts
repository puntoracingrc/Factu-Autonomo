import { describe, expect, it } from "vitest";
import { AEAT_DOCUMENT_PROFILES_V1 } from "./knowledge/aeat-document-knowledge.v1";
import {
  FISCAL_NOTIFICATION_DEADLINE_ANCHOR_SCHEMA_VERSION_V2,
  FISCAL_NOTIFICATION_DEADLINE_ANCHOR_VERSION_V2,
  FiscalNotificationDeadlineAnchorValidationError,
  resolveFiscalNotificationDeadlineAnchorV2,
  type FiscalNotificationDeadlineAnchorInputV2,
  type FiscalNotificationDeadlineAnchorStatusV2,
  type FiscalNotificationDeadlineEvidenceV2,
  type FiscalNotificationDeadlinePurposeV2,
  type FiscalNotificationExplicitDeadlineDateTypeV2,
  type FiscalNotificationTypedDateV2,
} from "./deadline-anchor.v2";

const DEFAULT_DATE = "2026-07-16";

function evidence(
  evidenceId: string,
  sourceRole: FiscalNotificationDeadlineEvidenceV2["sourceRole"] = "THIS_DOCUMENT",
  confidence = 1,
): FiscalNotificationDeadlineEvidenceV2 {
  return {
    evidenceId,
    sourceRole,
    pageNumber: 1,
    extractionMethod: "RULE",
    confidence,
    assertionType: "EXPLICIT_IN_DOCUMENT",
    ruleId: "deadline-test-rule",
    ruleVersion: "1.0.0",
  };
}

function date(
  dateType: FiscalNotificationTypedDateV2["dateType"],
  evidenceId: string,
  dateIso = DEFAULT_DATE,
): FiscalNotificationTypedDateV2 {
  return { dateType, dateIso, evidenceId };
}

function deadline(
  dateType: FiscalNotificationExplicitDeadlineDateTypeV2,
  purpose: FiscalNotificationDeadlinePurposeV2,
  evidenceId: string,
  dateIso = "2026-07-31",
) {
  return { dateType, purpose, evidenceId, dateIso } as const;
}

function input(
  overrides: Partial<FiscalNotificationDeadlineAnchorInputV2> &
    Pick<FiscalNotificationDeadlineAnchorInputV2, "familyId">,
): FiscalNotificationDeadlineAnchorInputV2 {
  return {
    evidence: [],
    documentDates: [],
    deadlineCandidates: [],
    rawDeadlinePresent: false,
    ...overrides,
  };
}

function expectedStatus(
  trigger: (typeof AEAT_DOCUMENT_PROFILES_V1)[number]["plainLanguage"]["deadlineRule"]["trigger"],
): FiscalNotificationDeadlineAnchorStatusV2 {
  if (trigger === null) return "NO_DEADLINE_APPLICABLE";
  if (trigger === "FUTURE_EVENT") return "PENDING_REQUIRED_DATE";
  if (trigger === "EXPLICIT_DUE_DATE" || trigger === "INSTALLMENT_DUE_DATE") {
    return "EXPLICIT_DEADLINE_CAPTURED";
  }
  return "ANCHOR_IDENTIFIED_NO_CALCULATION";
}

function matrixInput(
  profile: (typeof AEAT_DOCUMENT_PROFILES_V1)[number],
): FiscalNotificationDeadlineAnchorInputV2 {
  const trigger = profile.plainLanguage.deadlineRule.trigger;
  if (trigger === "EXPLICIT_DUE_DATE") {
    const dateType = profile.mustExtract.dates.includes(
      "VOLUNTARY_PAYMENT_DEADLINE",
    )
      ? "VOLUNTARY_PAYMENT_DEADLINE"
      : "EXPIRATION_DATE";
    const purpose =
      dateType === "VOLUNTARY_PAYMENT_DEADLINE" ? "PAYMENT" : "EXPIRATION";
    return input({
      familyId: profile.id,
      evidence: [evidence("due")],
      deadlineCandidates: [deadline(dateType, purpose, "due")],
      rawDeadlinePresent: true,
    });
  }
  if (trigger === "INSTALLMENT_DUE_DATE") {
    return input({
      familyId: profile.id,
      evidence: [evidence("installment")],
      deadlineCandidates: [
        deadline("INSTALLMENT_DUE_DATE", "INSTALLMENT", "installment"),
      ],
      rawDeadlinePresent: true,
    });
  }
  if (
    trigger === "EFFECTIVE_NOTIFICATION_DATE" ||
    trigger === "EFFECTIVE_NOTIFICATION_DATE_OR_RECEIPT"
  ) {
    if (profile.mustExtract.dates.includes("EFFECTIVE_NOTIFICATION_DATE")) {
      return input({
        familyId: profile.id,
        evidence: [evidence("effective")],
        documentDates: [date("EFFECTIVE_NOTIFICATION_DATE", "effective")],
      });
    }
    return input({
      familyId: profile.id,
      evidence: [evidence("linked-effective", "LINKED_ACT")],
      linkedActDates: [date("EFFECTIVE_NOTIFICATION_DATE", "linked-effective")],
    });
  }
  return input({ familyId: profile.id });
}

describe.each(AEAT_DOCUMENT_PROFILES_V1)(
  "$id deadline profile matrix",
  (profile) => {
    it("uses only evidenced dates and never calculates a final date", () => {
      const result = resolveFiscalNotificationDeadlineAnchorV2(
        matrixInput(profile),
      );
      expect(result).toMatchObject({
        schemaVersion: FISCAL_NOTIFICATION_DEADLINE_ANCHOR_SCHEMA_VERSION_V2,
        anchorVersion: FISCAL_NOTIFICATION_DEADLINE_ANCHOR_VERSION_V2,
        familyId: profile.id,
        trigger: profile.plainLanguage.deadlineRule.trigger,
        status: expectedStatus(profile.plainLanguage.deadlineRule.trigger),
        profileText: {
          text: profile.plainLanguage.deadlineRule.text,
          fallback: profile.plainLanguage.deadlineRule.fallback,
        },
        calculatedDeadline: null,
        calculationPolicy: "PROHIBITED",
        permitsDeadlineMaterialization: false,
        requiresHumanReview: true,
      });
      expect(result).not.toHaveProperty("durationDays");
      expect(result).not.toHaveProperty("businessDays");
      expect(result).not.toHaveProperty("holidayCalendar");
      expect(result).not.toHaveProperty("explicitDueDate");
    });
  },
);

describe("fiscal notification deadline anchor v2 regressions", () => {
  it("uses publication only as effective notification of its linked act", () => {
    const issueOnly = resolveFiscalNotificationDeadlineAnchorV2(
      input({
        familyId: "notification.publication_or_appearance",
        evidence: [evidence("issue")],
        documentDates: [date("ISSUE_DATE", "issue")],
      }),
    );
    expect(issueOnly).toMatchObject({
      trigger: "EFFECTIVE_NOTIFICATION_DATE",
      anchorRole: "LINKED_ACT",
      anchorDate: null,
      anchorDateType: null,
      anchorEvidenceId: null,
      status: "PENDING_REQUIRED_DATE",
      assertionType: "NOT_PROVEN_BY_DOCUMENT",
    });

    const effective = resolveFiscalNotificationDeadlineAnchorV2(
      input({
        familyId: "notification.publication_or_appearance",
        evidence: [evidence("effective")],
        documentDates: [
          date("EFFECTIVE_NOTIFICATION_DATE", "effective", "2026-07-20"),
        ],
      }),
    );
    expect(effective).toMatchObject({
      anchorRole: "LINKED_ACT",
      anchorDate: "2026-07-20",
      anchorDateType: "EFFECTIVE_NOTIFICATION_DATE",
      anchorEvidenceId: "effective",
      status: "ANCHOR_IDENTIFIED_NO_CALCULATION",
      assertionType: "EXPLICIT_IN_DOCUMENT",
    });
  });

  it("accepts ACCESS_DATE only for the receipt-capable trigger", () => {
    const accessed = resolveFiscalNotificationDeadlineAnchorV2(
      input({
        familyId: "notification.dehu_envelope",
        evidence: [evidence("access")],
        documentDates: [date("ACCESS_DATE", "access", "2026-07-22")],
      }),
    );
    expect(accessed).toMatchObject({
      trigger: "EFFECTIVE_NOTIFICATION_DATE_OR_RECEIPT",
      anchorDate: "2026-07-22",
      anchorDateType: "ACCESS_DATE",
      anchorEvidenceId: "access",
    });

    expect(() =>
      resolveFiscalNotificationDeadlineAnchorV2(
        input({
          familyId: "notification.publication_or_appearance",
          evidence: [evidence("access")],
          documentDates: [date("ACCESS_DATE", "access")],
        }),
      ),
    ).toThrowError(FiscalNotificationDeadlineAnchorValidationError);

    expect(() =>
      resolveFiscalNotificationDeadlineAnchorV2(
        input({
          familyId: "notification.publication_or_appearance",
          evidence: [evidence("linked-access", "LINKED_ACT")],
          linkedActDates: [date("ACCESS_DATE", "linked-access")],
        }),
      ),
    ).toThrowError(FiscalNotificationDeadlineAnchorValidationError);
  });

  it("keeps issue and signing dates separate from effective notification", () => {
    const issueOnly = resolveFiscalNotificationDeadlineAnchorV2(
      input({
        familyId: "assessment.final_provisional_assessment",
        evidence: [evidence("issue"), evidence("signing")],
        documentDates: [
          date("ISSUE_DATE", "issue"),
          date("SIGNING_DATE", "signing"),
        ],
      }),
    );
    expect(issueOnly).toMatchObject({
      anchorRole: "THIS_DOCUMENT",
      anchorDate: null,
      status: "PENDING_REQUIRED_DATE",
    });

    const linkedNotification = resolveFiscalNotificationDeadlineAnchorV2(
      input({
        familyId: "assessment.final_provisional_assessment",
        evidence: [
          evidence("issue"),
          evidence("linked-effective", "LINKED_ACT"),
        ],
        documentDates: [date("ISSUE_DATE", "issue")],
        linkedActDates: [
          date("EFFECTIVE_NOTIFICATION_DATE", "linked-effective", "2026-07-21"),
        ],
      }),
    );
    expect(linkedNotification).toMatchObject({
      anchorRole: "LINKED_ACT",
      anchorDate: "2026-07-21",
      anchorDateType: "EFFECTIVE_NOTIFICATION_DATE",
      anchorEvidenceId: "linked-effective",
      status: "ANCHOR_IDENTIFIED_NO_CALCULATION",
    });
  });

  it("preserves a printed payment deadline with its purpose and evidence", () => {
    const result = resolveFiscalNotificationDeadlineAnchorV2(
      input({
        familyId: "payment.payment_form",
        evidence: [evidence("payment-deadline")],
        deadlineCandidates: [
          deadline(
            "VOLUNTARY_PAYMENT_DEADLINE",
            "PAYMENT",
            "payment-deadline",
            "2026-08-05",
          ),
        ],
        rawDeadlinePresent: true,
      }),
    );
    expect(result).toMatchObject({
      trigger: "EXPLICIT_DUE_DATE",
      anchorRole: "THIS_DOCUMENT",
      anchorDate: null,
      anchorDateType: null,
      anchorEvidenceId: null,
      deadlineCandidates: [
        {
          purpose: "PAYMENT",
          dateType: "VOLUNTARY_PAYMENT_DEADLINE",
          dateIso: "2026-08-05",
          evidenceId: "payment-deadline",
        },
      ],
      status: "EXPLICIT_DEADLINE_CAPTURED",
      calculatedDeadline: null,
    });
  });

  it("preserves every installment deadline instead of choosing one", () => {
    const result = resolveFiscalNotificationDeadlineAnchorV2(
      input({
        familyId: "collection.deferral_grant",
        evidence: [evidence("august"), evidence("september")],
        deadlineCandidates: [
          deadline(
            "INSTALLMENT_DUE_DATE",
            "INSTALLMENT",
            "august",
            "2026-08-20",
          ),
          deadline(
            "INSTALLMENT_DUE_DATE",
            "INSTALLMENT",
            "september",
            "2026-09-20",
          ),
        ],
        rawDeadlinePresent: true,
      }),
    );
    expect(result.status).toBe("EXPLICIT_DEADLINE_CAPTURED");
    expect(result.deadlineCandidates).toHaveLength(2);
    expect(result.anchorDate).toBeNull();
    expect(result.calculatedDeadline).toBeNull();
  });

  it("never treats raw deadline wording as no deadline", () => {
    const result = resolveFiscalNotificationDeadlineAnchorV2(
      input({
        familyId: "information.tax_data_report",
        rawDeadlinePresent: true,
      }),
    );
    expect(result).toMatchObject({
      trigger: null,
      status: "REVIEW_REQUIRED",
      assertionType: "NOT_PROVEN_BY_DOCUMENT",
    });

    const trulyAbsent = resolveFiscalNotificationDeadlineAnchorV2(
      input({ familyId: "information.tax_data_report" }),
    );
    expect(trulyAbsent.status).toBe("NO_DEADLINE_APPLICABLE");
  });

  it("requires review when raw wording was detected but no candidate was structured", () => {
    const result = resolveFiscalNotificationDeadlineAnchorV2(
      input({
        familyId: "payment.payment_form",
        rawDeadlinePresent: true,
      }),
    );
    expect(result).toMatchObject({
      status: "REVIEW_REQUIRED",
      deadlineCandidates: [],
      assertionType: "NOT_PROVEN_BY_DOCUMENT",
    });
  });

  it("leaves future-event triggers pending without inventing a date", () => {
    const result = resolveFiscalNotificationDeadlineAnchorV2(
      input({ familyId: "seizure.commercial_credits" }),
    );
    expect(result).toMatchObject({
      trigger: "FUTURE_EVENT",
      anchorRole: "FUTURE_EVENT",
      anchorDate: null,
      anchorDateType: null,
      anchorEvidenceId: null,
      status: "PENDING_REQUIRED_DATE",
      calculatedDeadline: null,
    });
  });

  it("rejects an unknown or wrong-role evidence reference", () => {
    expect(() =>
      resolveFiscalNotificationDeadlineAnchorV2(
        input({
          familyId: "payment.payment_form",
          deadlineCandidates: [
            deadline(
              "VOLUNTARY_PAYMENT_DEADLINE",
              "PAYMENT",
              "missing-evidence",
            ),
          ],
          rawDeadlinePresent: true,
        }),
      ),
    ).toThrowError(FiscalNotificationDeadlineAnchorValidationError);

    expect(() =>
      resolveFiscalNotificationDeadlineAnchorV2(
        input({
          familyId: "payment.payment_form",
          evidence: [evidence("linked", "LINKED_ACT")],
          deadlineCandidates: [
            deadline("VOLUNTARY_PAYMENT_DEADLINE", "PAYMENT", "linked"),
          ],
          rawDeadlinePresent: true,
        }),
      ),
    ).toThrowError(FiscalNotificationDeadlineAnchorValidationError);
  });

  it("rejects a purpose/date mismatch and dates outside the family contract", () => {
    expect(() =>
      resolveFiscalNotificationDeadlineAnchorV2(
        input({
          familyId: "payment.payment_form",
          evidence: [evidence("due")],
          deadlineCandidates: [
            deadline("VOLUNTARY_PAYMENT_DEADLINE", "APPEAL", "due"),
          ],
          rawDeadlinePresent: true,
        }),
      ),
    ).toThrowError(FiscalNotificationDeadlineAnchorValidationError);

    expect(() =>
      resolveFiscalNotificationDeadlineAnchorV2(
        input({
          familyId: "payment.payment_form",
          evidence: [evidence("response")],
          deadlineCandidates: [
            deadline("RESPONSE_DEADLINE", "RESPONSE", "response"),
          ],
          rawDeadlinePresent: true,
        }),
      ),
    ).toThrowError(FiscalNotificationDeadlineAnchorValidationError);
  });

  it("rejects a typed candidate that contradicts raw deadline presence", () => {
    expect(() =>
      resolveFiscalNotificationDeadlineAnchorV2(
        input({
          familyId: "payment.payment_form",
          evidence: [evidence("due")],
          deadlineCandidates: [
            deadline("VOLUNTARY_PAYMENT_DEADLINE", "PAYMENT", "due"),
          ],
          rawDeadlinePresent: false,
        }),
      ),
    ).toThrowError(FiscalNotificationDeadlineAnchorValidationError);
  });

  it("does not let confidence confirm or suppress a deadline", () => {
    const resolveAt = (confidence: number) =>
      resolveFiscalNotificationDeadlineAnchorV2(
        input({
          familyId: "payment.payment_form",
          evidence: [evidence("due", "THIS_DOCUMENT", confidence)],
          deadlineCandidates: [
            deadline("VOLUNTARY_PAYMENT_DEADLINE", "PAYMENT", "due"),
          ],
          rawDeadlinePresent: true,
        }),
      );
    expect(resolveAt(0).deadlineCandidates).toEqual(
      resolveAt(1).deadlineCandidates,
    );
  });

  it.each(["2026-02-31", "31-07-2026", "2026-7-16"])(
    "rejects impossible or non-ISO date %s",
    (dateIso) => {
      expect(() =>
        resolveFiscalNotificationDeadlineAnchorV2(
          input({
            familyId: "payment.payment_form",
            evidence: [evidence("issue")],
            documentDates: [date("ISSUE_DATE", "issue", dateIso)],
          }),
        ),
      ).toThrowError(FiscalNotificationDeadlineAnchorValidationError);
      expect(() =>
        resolveFiscalNotificationDeadlineAnchorV2(
          input({
            familyId: "payment.payment_form",
            evidence: [evidence("due")],
            deadlineCandidates: [
              deadline("VOLUNTARY_PAYMENT_DEADLINE", "PAYMENT", "due", dateIso),
            ],
            rawDeadlinePresent: true,
          }),
        ),
      ).toThrowError(FiscalNotificationDeadlineAnchorValidationError);
    },
  );

  it.each(["scannedAt", "uploadedAt", "createdAt", "explicitDueDate"])(
    "rejects forbidden or legacy metadata key %s at the boundary",
    (forbiddenKey) => {
      const value: Record<string, unknown> = {
        ...input({ familyId: "assessment.final_provisional_assessment" }),
        [forbiddenKey]: "2026-07-16",
      };
      expect(() =>
        resolveFiscalNotificationDeadlineAnchorV2(value),
      ).toThrowError(FiscalNotificationDeadlineAnchorValidationError);
    },
  );

  it("rejects accessors and overridden array behavior without invoking it", () => {
    let getterCalls = 0;
    const root = input({
      familyId: "payment.payment_form",
    }) as unknown as Record<string, unknown>;
    Object.defineProperty(root, "rawDeadlinePresent", {
      enumerable: true,
      get() {
        getterCalls += 1;
        return false;
      },
    });
    expect(() => resolveFiscalNotificationDeadlineAnchorV2(root)).toThrowError(
      FiscalNotificationDeadlineAnchorValidationError,
    );
    expect(getterCalls).toBe(0);

    const evidenceItems: unknown[] = [];
    Object.defineProperty(evidenceItems, "map", {
      enumerable: true,
      value() {
        throw new Error("must not run");
      },
    });
    expect(() =>
      resolveFiscalNotificationDeadlineAnchorV2({
        ...input({ familyId: "payment.payment_form" }),
        evidence: evidenceItems,
      }),
    ).toThrowError(FiscalNotificationDeadlineAnchorValidationError);

    const evidenceWithGetter = evidence("getter") as unknown as Record<
      string,
      unknown
    >;
    Object.defineProperty(evidenceWithGetter, "confidence", {
      enumerable: true,
      get() {
        getterCalls += 1;
        return 1;
      },
    });
    expect(() =>
      resolveFiscalNotificationDeadlineAnchorV2({
        ...input({ familyId: "payment.payment_form" }),
        evidence: [evidenceWithGetter],
      }),
    ).toThrowError(FiscalNotificationDeadlineAnchorValidationError);
    expect(getterCalls).toBe(0);
  });

  it("keeps validation messages path-only and never echoes rejected values", () => {
    const secret = "ES9121000418450200051332";
    let captured: unknown;
    try {
      resolveFiscalNotificationDeadlineAnchorV2(
        input({
          familyId: "payment.payment_form",
          evidence: [evidence(secret)],
          deadlineCandidates: [
            deadline("VOLUNTARY_PAYMENT_DEADLINE", "PAYMENT", "unknown"),
          ],
          rawDeadlinePresent: true,
        }),
      );
    } catch (error) {
      captured = error;
    }
    expect(captured).toBeInstanceOf(
      FiscalNotificationDeadlineAnchorValidationError,
    );
    expect(String(captured)).not.toContain(secret);
    expect(String(captured)).toContain("deadlineCandidates[0].evidenceId");
  });

  it("does not mutate input and returns defensive frozen candidates", () => {
    const value = input({
      familyId: "payment.payment_form",
      evidence: [evidence("due")],
      deadlineCandidates: [
        deadline("VOLUNTARY_PAYMENT_DEADLINE", "PAYMENT", "due"),
      ],
      rawDeadlinePresent: true,
    });
    const before = structuredClone(value);
    const result = resolveFiscalNotificationDeadlineAnchorV2(value);
    expect(value).toEqual(before);
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.profileText)).toBe(true);
    expect(Object.isFrozen(result.deadlineCandidates)).toBe(true);
    expect(Object.isFrozen(result.deadlineCandidates[0])).toBe(true);
  });
});
