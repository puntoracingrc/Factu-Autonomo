import type { TaxModelDiagnosticSession } from "@/lib/tax-model-diagnostic/contracts";
import { selectStoredTaxObligationsAssessment } from "@/lib/tax-obligations";

import { extractFiscalCalendarModelCodes } from "./model-reference-links";
import type { FiscalCalendarEvent } from "./types";

export const MAX_RENDERED_FISCAL_CALENDAR_DESCRIPTION_LINES = 100;

export type FiscalCalendarDescriptionScope = "ALL" | "MINE";
export type FiscalCalendarObligationViewStatus =
  "ALL_ONLY" | "ORIENTATIVE" | "PERSONALIZED";

export interface FiscalCalendarDescriptionFilterContext {
  enabled: boolean;
  fiscalYear: number | null;
  mineModelCodes: ReadonlySet<string>;
  resolvableModelCodes: ReadonlySet<string>;
}

export interface FiscalCalendarDescriptionLine {
  sourceIndex: number;
  text: string;
  modelCode: string | null;
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

function disabledContext(): FiscalCalendarDescriptionFilterContext {
  return Object.freeze({
    enabled: false,
    fiscalYear: null,
    mineModelCodes: new Set<string>(),
    resolvableModelCodes: new Set<string>(),
  });
}

/**
 * Builds read-only context for grouping description lines. It never authorizes
 * fiscal exclusion and remains disabled for fallbacks or incomplete profiles.
 */
export function buildFiscalCalendarDescriptionFilterContext({
  session,
  obligationViewStatus,
  mineModelCodes,
  resolvableModelCodes,
}: {
  session: TaxModelDiagnosticSession | null | undefined;
  obligationViewStatus: FiscalCalendarObligationViewStatus;
  mineModelCodes: ReadonlySet<string>;
  resolvableModelCodes: ReadonlySet<string>;
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

  return Object.freeze({
    enabled: true,
    fiscalYear: assessment.fiscalYear,
    mineModelCodes: new Set(mineModelCodes),
    resolvableModelCodes: new Set(resolvableModelCodes),
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
 * Groups only an explicit, single model resolved by Calendar's canonical
 * Model-page links and absent from the user's recommended/manual model set.
 * Grouping is reversible presentation: every source line remains in
 * `allLines` and either `directLines` or `otherModelLines`.
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

    const modelCode = candidates[0];
    if (!context.resolvableModelCodes.has(modelCode)) {
      directLines.push(line);
      continue;
    }

    const identifiedLine = Object.freeze({ ...line, modelCode });
    if (context.mineModelCodes.has(modelCode)) {
      directLines.push(identifiedLine);
    } else {
      otherModelLines.push(identifiedLine);
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
