import type { TaxModelDiagnosticSession } from "@/lib/tax-model-diagnostic/contracts";
import {
  buildTaxModelRecommendationsV1,
  normalizeTaxObligationModelCode,
  selectStoredTaxObligationsAssessment,
  type TaxModelRecommendationItemV1,
  type TaxObligationModelCode,
} from "@/lib/tax-obligations";

import { extractFiscalCalendarModelCodes } from "./model-reference-links";
import type { FiscalCalendarEvent } from "./types";

export const MAX_RENDERED_FISCAL_CALENDAR_DESCRIPTION_LINES = 100;

export type FiscalCalendarDescriptionScope = "ALL" | "MINE";
export type FiscalCalendarObligationViewStatus =
  | "ALL_ONLY"
  | "ORIENTATIVE"
  | "PERSONALIZED";

interface FiscalCalendarLineRecommendation {
  engineRecommendationStatus: TaxModelRecommendationItemV1["engineRecommendationStatus"];
  manuallySelected: boolean;
}

export interface FiscalCalendarDescriptionFilterContext {
  enabled: boolean;
  fiscalYear: number | null;
  recommendations: ReadonlyMap<
    TaxObligationModelCode,
    FiscalCalendarLineRecommendation
  >;
}

export interface FiscalCalendarDescriptionLine {
  sourceIndex: number;
  text: string;
  modelCode: TaxObligationModelCode | null;
}

export interface FiscalCalendarDescriptionView {
  mode: "FULL" | "GROUPED";
  allLines: readonly FiscalCalendarDescriptionLine[];
  directLines: readonly FiscalCalendarDescriptionLine[];
  otherModelLines: readonly FiscalCalendarDescriptionLine[];
  otherModelCount: number;
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

function normalizedManualModelCodes(
  manualModelCodes: readonly string[],
): readonly TaxObligationModelCode[] {
  return [
    ...new Set(
      manualModelCodes.flatMap((code) => {
        const normalized = normalizeTaxObligationModelCode(code);
        return normalized ? [normalized] : [];
      }),
    ),
  ];
}

function disabledContext(): FiscalCalendarDescriptionFilterContext {
  return Object.freeze({
    enabled: false,
    fiscalYear: null,
    recommendations: new Map<
      TaxObligationModelCode,
      FiscalCalendarLineRecommendation
    >(),
  });
}

/**
 * Builds read-only context for grouping description lines. It never authorizes
 * fiscal exclusion and remains disabled for fallbacks or incomplete profiles.
 */
export function buildFiscalCalendarDescriptionFilterContext({
  session,
  manualModelCodes = [],
  obligationViewStatus,
}: {
  session: TaxModelDiagnosticSession | null | undefined;
  manualModelCodes?: readonly string[];
  obligationViewStatus: FiscalCalendarObligationViewStatus;
}): FiscalCalendarDescriptionFilterContext {
  if (obligationViewStatus === "ALL_ONLY") return disabledContext();

  const assessment = selectStoredTaxObligationsAssessment(session);
  if (
    !assessment ||
    assessment.territory !== "ES_COMMON" ||
    assessment.resolutionState === "BLOCKED" ||
    assessment.profile.state !== "COMPLETE" ||
    assessment.profile.missingInformation.length > 0 ||
    assessment.profile.conflicts.length > 0
  ) {
    return disabledContext();
  }

  const snapshot = buildTaxModelRecommendationsV1({
    assessment,
    manualModelCodes: normalizedManualModelCodes(manualModelCodes),
  });
  const recommendations = new Map<
    TaxObligationModelCode,
    FiscalCalendarLineRecommendation
  >(
    snapshot.recommendations.map((recommendation) => [
      recommendation.modelCode,
      Object.freeze({
        engineRecommendationStatus:
          recommendation.engineRecommendationStatus,
        manuallySelected: recommendation.manuallySelected,
      }),
    ]),
  );

  return Object.freeze({
    enabled: true,
    fiscalYear: assessment.fiscalYear,
    recommendations,
  });
}

function descriptionLines(
  description: string,
): readonly FiscalCalendarDescriptionLine[] {
  return Object.freeze(
    description
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .slice(0, MAX_RENDERED_FISCAL_CALENDAR_DESCRIPTION_LINES)
      .map((text, sourceIndex) =>
        Object.freeze({ sourceIndex, text, modelCode: null }),
      ),
  );
}

function fullDescriptionView(
  allLines: readonly FiscalCalendarDescriptionLine[],
): FiscalCalendarDescriptionView {
  return Object.freeze({
    mode: "FULL",
    allLines,
    directLines: allLines,
    otherModelLines: Object.freeze([]),
    otherModelCount: 0,
  });
}

/**
 * Groups only an explicit, single, known model whose underlying engine result
 * is UNLIKELY_REQUIRED and which the user has not selected manually. Grouping
 * is reversible presentation: every source line remains in `allLines` and
 * either `directLines` or `otherModelLines`.
 */
export function buildFiscalCalendarDescriptionView({
  event,
  scope,
  context,
}: {
  event: FiscalCalendarEvent;
  scope: FiscalCalendarDescriptionScope;
  context: FiscalCalendarDescriptionFilterContext;
}): FiscalCalendarDescriptionView {
  const allLines = descriptionLines(event.description);
  if (
    scope !== "MINE" ||
    !context.enabled ||
    context.fiscalYear === null ||
    eventYearInMadrid(event) !== context.fiscalYear
  ) {
    return fullDescriptionView(allLines);
  }

  const directLines: FiscalCalendarDescriptionLine[] = [];
  const otherModelLines: FiscalCalendarDescriptionLine[] = [];

  for (const line of allLines) {
    const candidates = extractFiscalCalendarModelCodes(line.text);
    if (candidates.length !== 1) {
      directLines.push(line);
      continue;
    }

    const modelCode = normalizeTaxObligationModelCode(candidates[0]);
    if (!modelCode) {
      directLines.push(line);
      continue;
    }

    const recommendation = context.recommendations.get(modelCode);
    const identifiedLine = Object.freeze({ ...line, modelCode });
    if (
      recommendation?.engineRecommendationStatus === "UNLIKELY_REQUIRED" &&
      !recommendation.manuallySelected
    ) {
      otherModelLines.push(identifiedLine);
    } else {
      directLines.push(identifiedLine);
    }
  }

  if (otherModelLines.length === 0) return fullDescriptionView(allLines);

  return Object.freeze({
    mode: "GROUPED",
    allLines,
    directLines: Object.freeze(directLines),
    otherModelLines: Object.freeze(otherModelLines),
    otherModelCount: new Set(
      otherModelLines.flatMap((line) =>
        line.modelCode ? [line.modelCode] : [],
      ),
    ).size,
  });
}
