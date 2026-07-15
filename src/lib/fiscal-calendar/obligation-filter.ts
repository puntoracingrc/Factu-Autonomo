import type { TaxModelDiagnosticSession } from "@/lib/tax-model-diagnostic/contracts";
import {
  normalizeTaxObligationModelCode,
  selectStoredTaxObligationsAssessment,
  type TaxObligationModelCode,
} from "@/lib/tax-obligations";

import { extractFiscalCalendarModelCodes } from "./model-reference-links";
import type { FiscalCalendarEvent } from "./types";

export type FiscalCalendarObligationFallbackReason =
  | "NO_PUBLISHED_ASSESSMENT"
  | "RULES_PENDING_REVIEW"
  | "ASSESSMENT_NOT_RESOLVED"
  | "PROFILE_NOT_COMPLETE"
  | "UNSUPPORTED_TERRITORY";

export type FiscalCalendarEventObligationReason =
  | "FALLBACK_ALL"
  | "REQUIRED"
  | "REVIEW_REQUIRED"
  | "UNKNOWN"
  | "NOT_APPLICABLE_CONFIRMED"
  | "NOT_APPLICABLE_UNCONFIRMED"
  | "NO_EXPLICIT_MODEL"
  | "MULTIPLE_EXPLICIT_MODELS"
  | "MODEL_OUTSIDE_ENGINE_CATALOG"
  | "MODEL_MISSING_FROM_ASSESSMENT"
  | "FISCAL_YEAR_MISMATCH";

export interface FiscalCalendarEventObligationDecision {
  eventId: string;
  visibleInMyObligations: boolean;
  requiresConfirmation: boolean;
  manuallySelected: boolean;
  modelCode: TaxObligationModelCode | null;
  reason: FiscalCalendarEventObligationReason;
}

export interface FiscalCalendarObligationView {
  status: "ALL_ONLY" | "ORIENTATIVE" | "PERSONALIZED";
  fallbackReason: FiscalCalendarObligationFallbackReason | null;
  decisions: readonly FiscalCalendarEventObligationDecision[];
  visibleEventIds: ReadonlySet<string>;
  reviewEventIds: ReadonlySet<string>;
  manuallySelectedEventIds: ReadonlySet<string>;
  excludedCount: number;
}

const MADRID_YEAR = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/Madrid",
  year: "numeric",
});

function eventYearInMadrid(event: FiscalCalendarEvent): number | null {
  if (event.allDay) {
    const match = /^(\d{4})-\d{2}-\d{2}$/.exec(event.startDate);
    return match ? Number(match[1]) : null;
  }
  const date = new Date(event.startDate);
  if (!Number.isFinite(date.getTime())) return null;
  const year = Number(MADRID_YEAR.format(date));
  return Number.isInteger(year) ? year : null;
}

function allOnlyFallbackReason(
  session: TaxModelDiagnosticSession | null | undefined,
): FiscalCalendarObligationFallbackReason | null {
  const assessment = selectStoredTaxObligationsAssessment(session);
  if (!assessment) return "NO_PUBLISHED_ASSESSMENT";
  if (
    assessment.profile.state !== "COMPLETE" ||
    assessment.profile.missingInformation.length > 0 ||
    assessment.profile.conflicts.length > 0
  ) {
    return "PROFILE_NOT_COMPLETE";
  }
  if (assessment.territory !== "ES_COMMON") {
    return "UNSUPPORTED_TERRITORY";
  }
  if (assessment.resolutionState === "BLOCKED") {
    return "ASSESSMENT_NOT_RESOLVED";
  }
  return null;
}

function orientativeReason(
  assessment: NonNullable<
    ReturnType<typeof selectStoredTaxObligationsAssessment>
  >,
): FiscalCalendarObligationFallbackReason | null {
  if (assessment.ruleReviewState !== "APPROVED") {
    return "RULES_PENDING_REVIEW";
  }
  if (assessment.resolutionState !== "RESOLVED") {
    return "ASSESSMENT_NOT_RESOLVED";
  }
  return null;
}

function frozenSet(values: readonly string[]): ReadonlySet<string> {
  return new Set(values);
}

function fallbackView(
  events: readonly FiscalCalendarEvent[],
  reason: FiscalCalendarObligationFallbackReason,
): FiscalCalendarObligationView {
  const decisions = events.map<FiscalCalendarEventObligationDecision>(
    (event) => ({
      eventId: event.id,
      visibleInMyObligations: true,
      requiresConfirmation: false,
      manuallySelected: false,
      modelCode: null,
      reason: "FALLBACK_ALL",
    }),
  );
  return Object.freeze({
    status: "ALL_ONLY",
    fallbackReason: reason,
    decisions: Object.freeze(decisions),
    visibleEventIds: frozenSet(events.map((event) => event.id)),
    reviewEventIds: frozenSet([]),
    manuallySelectedEventIds: frozenSet([]),
    excludedCount: 0,
  });
}

function decisionForEvent({
  event,
  fiscalYear,
  obligations,
  manualModelCodes,
  allowSafeExclusion,
}: {
  event: FiscalCalendarEvent;
  fiscalYear: number;
  obligations: ReadonlyMap<
    TaxObligationModelCode,
    {
      status: "REQUIRED" | "NOT_APPLICABLE" | "REVIEW_REQUIRED" | "UNKNOWN";
      decisionState:
        | "CONFIRMED"
        | "PROVISIONAL"
        | "INSUFFICIENT_DATA"
        | "CONFLICTING_EVIDENCE";
      evidenceSufficient: boolean;
      missingInformation: readonly string[];
      conflicts: readonly string[];
    }
  >;
  manualModelCodes: ReadonlySet<string>;
  allowSafeExclusion: boolean;
}): FiscalCalendarEventObligationDecision {
  const base = {
    eventId: event.id,
    visibleInMyObligations: true,
    requiresConfirmation: true,
    manuallySelected: false,
    modelCode: null,
  };
  const candidates = extractFiscalCalendarModelCodes(
    `${event.title}\n${event.description}`,
  );
  if (candidates.length === 0) {
    return { ...base, reason: "NO_EXPLICIT_MODEL" };
  }
  const canonicalCodes = [
    ...new Set(
      candidates.flatMap((candidate) => {
        const normalized = normalizeTaxObligationModelCode(candidate);
        return normalized ? [normalized] : [];
      }),
    ),
  ];
  const manuallySelected = candidates.some((candidate) =>
    manualModelCodes.has(candidate),
  );
  if (canonicalCodes.length === 0) {
    return {
      ...base,
      manuallySelected,
      reason: "MODEL_OUTSIDE_ENGINE_CATALOG",
    };
  }
  if (canonicalCodes.length !== 1) {
    return {
      ...base,
      manuallySelected,
      reason: "MULTIPLE_EXPLICIT_MODELS",
    };
  }

  const modelCode = canonicalCodes[0];
  const selectedManually = manuallySelected || manualModelCodes.has(modelCode);
  const identified = {
    ...base,
    modelCode,
    manuallySelected: selectedManually,
  };
  if (eventYearInMadrid(event) !== fiscalYear) {
    return { ...identified, reason: "FISCAL_YEAR_MISMATCH" };
  }

  const obligation = obligations.get(modelCode);
  if (!obligation) {
    return { ...identified, reason: "MODEL_MISSING_FROM_ASSESSMENT" };
  }
  if (obligation.status === "REQUIRED") {
    return {
      ...identified,
      requiresConfirmation:
        !allowSafeExclusion ||
        obligation.decisionState !== "CONFIRMED" ||
        !obligation.evidenceSufficient ||
        obligation.missingInformation.length > 0 ||
        obligation.conflicts.length > 0,
      reason: "REQUIRED",
    };
  }
  if (obligation.status === "REVIEW_REQUIRED") {
    return { ...identified, reason: "REVIEW_REQUIRED" };
  }
  if (obligation.status === "UNKNOWN") {
    return { ...identified, reason: "UNKNOWN" };
  }

  const safeExclusion =
    obligation.evidenceSufficient &&
    obligation.missingInformation.length === 0 &&
    obligation.conflicts.length === 0;
  if (!safeExclusion) {
    return { ...identified, reason: "NOT_APPLICABLE_UNCONFIRMED" };
  }
  if (!allowSafeExclusion) {
    return { ...identified, reason: "NOT_APPLICABLE_UNCONFIRMED" };
  }
  return {
    ...identified,
    visibleInMyObligations: selectedManually,
    requiresConfirmation: selectedManually,
    reason: "NOT_APPLICABLE_CONFIRMED",
  };
}

/**
 * Builds a local, read-only Calendar view from the immutable assessment.
 * It never infers an obligation. The orientative mode never hides events; the
 * approved mode only hides a safely excluded single model.
 */
export function buildFiscalCalendarObligationView({
  events,
  session,
  manualModelCodes = [],
}: {
  events: readonly FiscalCalendarEvent[];
  session: TaxModelDiagnosticSession | null | undefined;
  manualModelCodes?: readonly string[];
}): FiscalCalendarObligationView {
  const reason = allOnlyFallbackReason(session);
  if (reason) return fallbackView(events, reason);

  const assessment = selectStoredTaxObligationsAssessment(session);
  if (!assessment) return fallbackView(events, "NO_PUBLISHED_ASSESSMENT");
  const pendingReason = orientativeReason(assessment);
  const isOrientative = pendingReason !== null;
  const obligations = new Map(
    assessment.obligations.map((obligation) => [
      obligation.modelCode,
      obligation,
    ]),
  );
  const manual = new Set(
    manualModelCodes.filter(
      (code): code is string =>
        typeof code === "string" &&
        /^(?:\d{2,3}|\d{2}[A-Z]|[A-Z]\d{2})$/.test(code),
    ),
  );
  const decisions = events.map((event) =>
    decisionForEvent({
      event,
      fiscalYear: assessment.fiscalYear,
      obligations,
      manualModelCodes: manual,
      allowSafeExclusion: !isOrientative,
    }),
  );
  const visible = decisions
    .filter((decision) => decision.visibleInMyObligations)
    .map((decision) => decision.eventId);
  const review = decisions
    .filter((decision) => decision.requiresConfirmation)
    .map((decision) => decision.eventId);
  const manuallySelected = decisions
    .filter((decision) => decision.manuallySelected)
    .map((decision) => decision.eventId);

  return Object.freeze({
    status: isOrientative ? "ORIENTATIVE" : "PERSONALIZED",
    fallbackReason: pendingReason,
    decisions: Object.freeze(decisions),
    visibleEventIds: frozenSet(visible),
    reviewEventIds: frozenSet(review),
    manuallySelectedEventIds: frozenSet(manuallySelected),
    excludedCount: decisions.length - visible.length,
  });
}
