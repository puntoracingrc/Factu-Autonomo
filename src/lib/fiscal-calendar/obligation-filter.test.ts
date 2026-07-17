import { describe, expect, it } from "vitest";
import type { TaxModelDiagnosticSession } from "@/lib/tax-model-diagnostic/contracts";
import type {
  TaxObligationAssessmentItemV1,
  TaxObligationsAssessmentV1,
} from "@/lib/tax-obligations";

import type { FiscalCalendarEvent } from "./types";
import { buildFiscalCalendarObligationView } from "./obligation-filter";

function event(
  id: string,
  title: string,
  overrides: Partial<FiscalCalendarEvent> = {},
): FiscalCalendarEvent {
  return {
    id,
    source: "AEAT",
    sourceProvider: "google-calendar",
    sourceCalendarKey: "iva",
    sourceCalendarId: "synthetic-calendar",
    externalEventId: `external-${id}`,
    iCalUID: `uid-${id}`,
    title,
    description: "",
    category: "iva",
    deadlineKind: "unclassified",
    reviewStatus: "review-with-advisor",
    startDate: "2026-07-20",
    endDateExclusive: "2026-07-21",
    allDay: true,
    status: "confirmed",
    sourceUpdatedAt: "2026-07-01T10:00:00.000Z",
    fetchedAt: "2026-07-15T10:00:00.000Z",
    ...overrides,
  };
}

function obligation(
  modelCode: TaxObligationAssessmentItemV1["modelCode"],
  status: TaxObligationAssessmentItemV1["status"],
  overrides: Partial<TaxObligationAssessmentItemV1> = {},
): TaxObligationAssessmentItemV1 {
  return {
    modelCode,
    status,
    decisionState: status === "REQUIRED" ? "CONFIRMED" : "PROVISIONAL",
    decisionBasis: "CONFIRMED_FACTS",
    evidenceSufficient: true,
    reason: "Fixture sintético",
    evidence: [{ kind: "QUESTIONNAIRE", summary: "Fixture sintético" }],
    missingInformation: [],
    conflicts: [],
    ...overrides,
  };
}

function assessment(
  obligations: TaxObligationsAssessmentV1["obligations"],
  overrides: Partial<TaxObligationsAssessmentV1> = {},
): TaxObligationsAssessmentV1 {
  return {
    contractVersion: "1.0.0",
    catalogVersion: "es-tax-models.2026-07.v1",
    ruleSetVersion: "synthetic-approved.v1",
    ruleReviewState: "APPROVED",
    resolutionState: "RESOLVED",
    traceability: {
      engineVersion: "synthetic-engine.v1",
      sourceSchemaVersion: 1,
    },
    generatedAt: "2026-07-15T09:00:00.000Z",
    fiscalYear: 2026,
    territory: "ES_COMMON",
    profile: { state: "COMPLETE", missingInformation: [], conflicts: [] },
    obligations,
    ...overrides,
  };
}

function session(
  publishedAssessment: TaxObligationsAssessmentV1 | undefined,
): TaxModelDiagnosticSession {
  return { publishedAssessment } as TaxModelDiagnosticSession;
}

describe("buildFiscalCalendarObligationView", () => {
  it.each([
    [undefined, "NO_PUBLISHED_ASSESSMENT"],
    [assessment([], { territory: "ES_CANARY" }), "UNSUPPORTED_TERRITORY"],
    [assessment([], { resolutionState: "BLOCKED" }), "ASSESSMENT_NOT_RESOLVED"],
  ] as const)("mantiene Todos con fallback %s", (stored, reason) => {
    const events = [event("a", "Modelo 303")];
    const result = buildFiscalCalendarObligationView({
      events,
      session: session(stored),
    });

    expect(result.status).toBe("ALL_ONLY");
    expect(result.fallbackReason).toBe(reason);
    expect([...result.visibleEventIds]).toEqual(["a"]);
    expect(result.excludedCount).toBe(0);
  });

  it.each([
    [
      assessment([], { ruleReviewState: "PENDING_FISCAL_REVIEW" }),
      "RULES_PENDING_REVIEW",
    ],
    [
      assessment([], { resolutionState: "MANUAL_REVIEW" }),
      "ASSESSMENT_NOT_RESOLVED",
    ],
    [
      assessment([obligation("303", "UNKNOWN")], {
        profile: {
          state: "INCOMPLETE",
          missingInformation: ["fixture"],
          conflicts: [],
        },
      }),
      "PROFILE_NOT_COMPLETE",
    ],
  ] as const)(
    "habilita la vista orientativa conservadora con %s",
    (stored, reason) => {
      const events = [event("a", "Modelo 303")];
      const result = buildFiscalCalendarObligationView({
        events,
        session: session(stored),
      });

      expect(result.status).toBe("ORIENTATIVE");
      expect(result.fallbackReason).toBe(reason);
      expect([...result.visibleEventIds]).toEqual(["a"]);
      expect([...result.reviewEventIds]).toEqual(["a"]);
      expect(result.excludedCount).toBe(0);
    },
  );

  it("mantiene todos los eventos por confirmar en la vista orientativa", () => {
    const events = [
      event("required", "Modelo 130"),
      event("not-applicable", "Modelo 303"),
      event("review", "Modelo 349"),
      event("unknown", "Modelo 347"),
      event("none", "Pago trimestral"),
      event("multiple", "Modelos 303 y 390"),
    ];
    const result = buildFiscalCalendarObligationView({
      events,
      session: session(
        assessment(
          [
            obligation("130", "REQUIRED"),
            obligation("303", "NOT_APPLICABLE"),
            obligation("349", "REVIEW_REQUIRED"),
            obligation("347", "UNKNOWN"),
          ],
          { ruleReviewState: "PENDING_FISCAL_REVIEW" },
        ),
      ),
    });

    expect(result.status).toBe("ORIENTATIVE");
    expect([...result.visibleEventIds]).toEqual(events.map(({ id }) => id));
    expect([...result.recommendedEventIds]).toEqual([
      "required",
      "review",
      "unknown",
      "none",
      "multiple",
    ]);
    expect([...result.reviewEventIds]).toEqual(events.map(({ id }) => id));
    expect(result.excludedCount).toBe(0);
    expect(result.decisions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          eventId: "required",
          modelCode: "130",
          reason: "REQUIRED",
          requiresConfirmation: true,
          visibleInMyObligations: true,
        }),
        expect.objectContaining({
          eventId: "not-applicable",
          modelCode: "303",
          reason: "NOT_APPLICABLE_UNCONFIRMED",
          requiresConfirmation: true,
          visibleInMyObligations: true,
        }),
      ]),
    );
  });

  it("mantiene recomendaciones con datos incompletos y limita el fallback al territorio", () => {
    const pending = assessment([obligation("303", "UNKNOWN")], {
      ruleReviewState: "PENDING_FISCAL_REVIEW",
      resolutionState: "MANUAL_REVIEW",
    });
    const incomplete = buildFiscalCalendarObligationView({
      events: [event("profile", "Modelo 303")],
      session: session({
        ...pending,
        profile: {
          state: "INCOMPLETE",
          missingInformation: ["fixture"],
          conflicts: [],
        },
      }),
    });
    const unsupported = buildFiscalCalendarObligationView({
      events: [event("territory", "Modelo 303")],
      session: session({ ...pending, territory: "ES_CANARY" }),
    });
    const conflicted = buildFiscalCalendarObligationView({
      events: [event("conflicted", "Modelo 303")],
      session: session({
        ...pending,
        profile: {
          state: "CONFLICTED",
          missingInformation: [],
          conflicts: ["fixture contradictorio"],
        },
      }),
    });

    expect(incomplete.status).toBe("ORIENTATIVE");
    expect(incomplete.fallbackReason).toBe("PROFILE_NOT_COMPLETE");
    expect(conflicted.status).toBe("ORIENTATIVE");
    expect(conflicted.fallbackReason).toBe("PROFILE_NOT_COMPLETE");
    expect(unsupported.status).toBe("ALL_ONLY");
    expect(unsupported.fallbackReason).toBe("UNSUPPORTED_TERRITORY");
  });

  it("no oculta NOT_APPLICABLE sin autorización fiscal individual", () => {
    const events = [
      event("required", "Modelo 130"),
      event("excluded", "Modelo 303"),
      event("unsafe", "Modelo 390"),
      event("review", "Modelo 349"),
      event("unknown", "Modelo 347"),
    ];
    const result = buildFiscalCalendarObligationView({
      events,
      session: session(
        assessment([
          obligation("130", "REQUIRED"),
          obligation("303", "NOT_APPLICABLE"),
          obligation("390", "NOT_APPLICABLE", { evidenceSufficient: false }),
          obligation("349", "REVIEW_REQUIRED"),
          obligation("347", "UNKNOWN"),
        ]),
      ),
    });

    expect(result.status).toBe("ORIENTATIVE");
    expect([...result.visibleEventIds]).toEqual(events.map(({ id }) => id));
    expect(result.excludedCount).toBe(0);
    expect([...result.reviewEventIds]).toEqual([
      "required",
      "excluded",
      "unsafe",
      "review",
      "unknown",
    ]);
  });

  it("no excluye NOT_APPLICABLE si conserva datos pendientes o conflictos", () => {
    const result = buildFiscalCalendarObligationView({
      events: [event("missing", "Modelo 303"), event("conflict", "Modelo 390")],
      session: session(
        assessment([
          obligation("303", "NOT_APPLICABLE", {
            missingInformation: ["fixture pendiente"],
          }),
          obligation("390", "NOT_APPLICABLE", {
            conflicts: ["fixture contradictorio"],
          }),
        ]),
      ),
    });

    expect([...result.visibleEventIds]).toEqual(["missing", "conflict"]);
    expect([...result.reviewEventIds]).toEqual(["missing", "conflict"]);
    expect(result.excludedCount).toBe(0);
  });

  it("rechaza una foto persistida con versión incompatible", () => {
    const incompatible = {
      ...assessment([]),
      contractVersion: "2.0.0",
    } as unknown as TaxObligationsAssessmentV1;
    const result = buildFiscalCalendarObligationView({
      events: [event("a", "Modelo 303")],
      session: session(incompatible),
    });

    expect(result.status).toBe("ALL_ONLY");
    expect(result.fallbackReason).toBe("NO_PUBLISHED_ASSESSMENT");
    expect([...result.visibleEventIds]).toEqual(["a"]);
  });

  it("conserva eventos sin código, multicode, desconocidos y sin decisión", () => {
    const events = [
      event("none", "Pago trimestral"),
      event("multiple", "Modelos 303 y 390"),
      event("outside", "Modelo 380"),
      event("missing", "Modelo 130"),
    ];
    const result = buildFiscalCalendarObligationView({
      events,
      session: session(assessment([obligation("303", "NOT_APPLICABLE")])),
    });

    expect([...result.visibleEventIds]).toEqual(events.map(({ id }) => id));
    expect([...result.reviewEventIds]).toEqual(events.map(({ id }) => id));
    expect(result.decisions.map(({ reason }) => reason)).toEqual([
      "NO_EXPLICIT_MODEL",
      "MULTIPLE_EXPLICIT_MODELS",
      "MODEL_OUTSIDE_ENGINE_CATALOG",
      "MODEL_MISSING_FROM_ASSESSMENT",
    ]);
  });

  it("filtra candidatos desconocidos antes de consultar un único código canónico", () => {
    const result = buildFiscalCalendarObligationView({
      events: [event("mixed", "Modelos 303 y 999")],
      session: session(assessment([obligation("303", "NOT_APPLICABLE")])),
    });

    expect(result.decisions[0]).toMatchObject({
      modelCode: "303",
      visibleInMyObligations: true,
      reason: "NOT_APPLICABLE_UNCONFIRMED",
    });
  });

  it("normaliza un único código 36 al modelo 036", () => {
    const result = buildFiscalCalendarObligationView({
      events: [event("normalized", "Modelo 36")],
      session: session(assessment([obligation("036", "NOT_APPLICABLE")])),
    });

    expect(result.decisions[0]).toMatchObject({
      modelCode: "036",
      visibleInMyObligations: true,
      reason: "NOT_APPLICABLE_UNCONFIRMED",
    });
  });

  it("mantiene una selección manual aunque el Motor confirme que no aplica", () => {
    const result = buildFiscalCalendarObligationView({
      events: [event("manual", "Modelo 303")],
      session: session(assessment([obligation("303", "NOT_APPLICABLE")])),
      manualModelCodes: ["303"],
    });

    expect(result.decisions[0]).toMatchObject({
      visibleInMyObligations: true,
      requiresConfirmation: true,
      manuallySelected: true,
    });
    expect([...result.manuallySelectedEventIds]).toEqual(["manual"]);
  });

  it("cuenta modelos únicos recomendados y manuales, no eventIds", () => {
    const events = Array.from({ length: 17 }, (_, index) =>
      event(`event-${index}`, index % 2 === 0 ? "Modelo 130" : "Modelo 303"),
    );
    const result = buildFiscalCalendarObligationView({
      events,
      session: session(
        assessment([
          obligation("130", "REQUIRED"),
          obligation("303", "REQUIRED"),
          obligation("349", "REVIEW_REQUIRED"),
          obligation("390", "UNKNOWN"),
          obligation("115", "REQUIRED"),
          obligation("180", "NOT_APPLICABLE"),
        ]),
      ),
      manualModelCodes: ["180", "380", "380"],
    });

    expect(result.decisions).toHaveLength(17);
    expect([...result.mineModelCodes]).toEqual([
      "180",
      "380",
      "130",
      "303",
      "349",
      "390",
      "115",
    ]);
    expect(result.mineModelCodes.size).toBe(7);
  });

  it("conserva la selección manual en un evento con varios modelos", () => {
    const result = buildFiscalCalendarObligationView({
      events: [event("multiple-manual", "Modelos 303 y 390")],
      session: session(
        assessment(
          [
            obligation("303", "NOT_APPLICABLE"),
            obligation("390", "REVIEW_REQUIRED"),
          ],
          { ruleReviewState: "PENDING_FISCAL_REVIEW" },
        ),
      ),
      manualModelCodes: ["303"],
    });

    expect(result.decisions[0]).toMatchObject({
      reason: "MULTIPLE_EXPLICIT_MODELS",
      manuallySelected: true,
      visibleInMyObligations: true,
      requiresConfirmation: true,
    });
    expect([...result.manuallySelectedEventIds]).toEqual(["multiple-manual"]);
  });

  it("no aplica una foto de otro ejercicio ni cruza mal el año de Madrid", () => {
    const events = [
      event("all-day-next-year", "Modelo 303", {
        startDate: "2027-01-01",
        endDateExclusive: "2027-01-02",
      }),
      event("timed-madrid-next-year", "Modelo 303", {
        allDay: false,
        startDate: "2026-12-31T23:30:00.000Z",
        endDateExclusive: "2027-01-01T00:30:00.000Z",
      }),
    ];
    const result = buildFiscalCalendarObligationView({
      events,
      session: session(assessment([obligation("303", "NOT_APPLICABLE")])),
    });

    expect([...result.visibleEventIds]).toEqual(events.map(({ id }) => id));
    expect(result.decisions.map(({ reason }) => reason)).toEqual([
      "FISCAL_YEAR_MISMATCH",
      "FISCAL_YEAR_MISMATCH",
    ]);
  });

  it("preserva orden e identidad de los eventos sin mutarlos", () => {
    const events = Object.freeze([
      Object.freeze(event("one", "Modelo 130")),
      Object.freeze(event("two", "Modelo 303")),
    ]);
    const result = buildFiscalCalendarObligationView({
      events,
      session: session(
        assessment([
          obligation("130", "REQUIRED"),
          obligation("303", "NOT_APPLICABLE"),
        ]),
      ),
    });

    expect(result.decisions.map(({ eventId }) => eventId)).toEqual([
      "one",
      "two",
    ]);
    expect(events.map(({ id }) => id)).toEqual(["one", "two"]);
  });
});
