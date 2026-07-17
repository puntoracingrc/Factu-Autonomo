import { describe, expect, it } from "vitest";
import type { TaxModelDiagnosticSession } from "@/lib/tax-model-diagnostic/contracts";
import type {
  TaxObligationAssessmentItemV1,
  TaxObligationsAssessmentV1,
} from "@/lib/tax-obligations";

import {
  buildFiscalCalendarDescriptionFilterContext,
  buildFiscalCalendarDescriptionView,
  MAX_RENDERED_FISCAL_CALENDAR_DESCRIPTION_LINES,
} from "./description-obligation-view";
import { buildFiscalCalendarObligationView } from "./obligation-filter";
import type { FiscalCalendarEvent } from "./types";

function event(
  description: string,
  overrides: Partial<FiscalCalendarEvent> = {},
): FiscalCalendarEvent {
  return {
    id: "synthetic-compound-event",
    source: "AEAT",
    sourceProvider: "google-calendar",
    sourceCalendarKey: "iva",
    sourceCalendarId: "synthetic-calendar",
    externalEventId: "synthetic-external-event",
    iCalUID: "synthetic-event@example.invalid",
    title: "IVA",
    description,
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
    ruleSetVersion: "synthetic-pending.v1",
    ruleReviewState: "PENDING_FISCAL_REVIEW",
    resolutionState: "MANUAL_REVIEW",
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
  publishedAssessment: TaxObligationsAssessmentV1,
): TaxModelDiagnosticSession {
  return { publishedAssessment } as TaxModelDiagnosticSession;
}

const compoundDescription = [
  "Junio 2026. Declaración recapitulativa de operaciones intracomunitarias: 349",
  "Segundo trimestre 2026. Autoliquidación: 303",
  "Segundo trimestre 2026. Declaración-liquidación no periódica: 309",
  "Segundo trimestre 2026. Operaciones asimiladas a las importaciones: 380",
  "Solicitud de devolución a viajeros: 308",
  "Solicitud de devolución por transporte: 308",
  "Reintegro de compensaciones en agricultura, ganadería y pesca: 341",
].join("\n");

const pendingAssessment = assessment([
  obligation("303", "REQUIRED"),
  obligation("349", "NOT_APPLICABLE"),
  obligation("309", "NOT_APPLICABLE"),
  obligation("308", "NOT_APPLICABLE"),
  obligation("341", "NOT_APPLICABLE"),
]);

const resolvableModelCodes = new Set([
  "130",
  "303",
  "308",
  "309",
  "341",
  "349",
  "380",
]);
const mineModelCodes = new Set(["303"]);

describe("vista de líneas del calendario por obligación", () => {
  it("agrupa reversiblemente otros modelos dentro de un evento compuesto", () => {
    const calendarEvent = event(compoundDescription);
    const storedSession = session(pendingAssessment);
    const obligationView = buildFiscalCalendarObligationView({
      events: [calendarEvent],
      session: storedSession,
    });
    const context = buildFiscalCalendarDescriptionFilterContext({
      session: storedSession,
      obligationViewStatus: obligationView.status,
      mineModelCodes: obligationView.mineModelCodes,
      resolvableModelCodes,
    });
    const result = buildFiscalCalendarDescriptionView({
      event: calendarEvent,
      scope: "MINE",
      context,
    });

    expect(obligationView.status).toBe("ORIENTATIVE");
    expect(obligationView.excludedCount).toBe(0);
    expect(result.mode).toBe("GROUPED");
    expect(result.directLines.map(({ text }) => text)).toEqual([
      "Segundo trimestre 2026. Autoliquidación: 303",
    ]);
    expect(result.otherModelLines.map(({ modelCode }) => modelCode)).toEqual([
      "349",
      "309",
      "380",
      "308",
      "308",
      "341",
    ]);
    expect(result.otherModelCount).toBe(5);
    expect(
      [...result.directLines, ...result.otherModelLines]
        .map(({ text }) => text)
        .sort(),
    ).toEqual(result.allLines.map(({ text }) => text).sort());
  });

  it("Todos conserva el texto completo, el orden y los duplicados", () => {
    const calendarEvent = event(compoundDescription);
    const context = buildFiscalCalendarDescriptionFilterContext({
      session: session(pendingAssessment),
      obligationViewStatus: "ORIENTATIVE",
      mineModelCodes,
      resolvableModelCodes,
    });
    const result = buildFiscalCalendarDescriptionView({
      event: calendarEvent,
      scope: "ALL",
      context,
    });

    expect(result.mode).toBe("FULL");
    expect(result.directLines.map(({ text }) => text)).toEqual(
      compoundDescription.split("\n"),
    );
    expect(result.otherModelLines).toEqual([]);
    expect(result.otherModelCount).toBe(0);
  });

  it("mantiene visible una selección manual aunque el motor diga UNLIKELY", () => {
    const calendarEvent = event("Modelo 349\nAutoliquidación: 303");
    const context = buildFiscalCalendarDescriptionFilterContext({
      session: session(pendingAssessment),
      obligationViewStatus: "ORIENTATIVE",
      mineModelCodes: new Set(["303", "349"]),
      resolvableModelCodes,
    });
    const result = buildFiscalCalendarDescriptionView({
      event: calendarEvent,
      scope: "MINE",
      context,
    });

    expect(result.mode).toBe("FULL");
    expect(result.directLines.map(({ text }) => text)).toEqual([
      "Modelo 349",
      "Autoliquidación: 303",
    ]);
  });

  it("trata como una sola referencia el mismo código repetido en una línea", () => {
    const calendarEvent = event("Modelo 349. Declaración recapitulativa: 349");
    const context = buildFiscalCalendarDescriptionFilterContext({
      session: session(pendingAssessment),
      obligationViewStatus: "ORIENTATIVE",
      mineModelCodes,
      resolvableModelCodes,
    });
    const result = buildFiscalCalendarDescriptionView({
      event: calendarEvent,
      scope: "MINE",
      context,
    });

    expect(result.directLines).toEqual([]);
    expect(result.otherModelLines).toEqual([
      expect.objectContaining({ modelCode: "349" }),
    ]);
    expect(result.otherModelCount).toBe(1);
  });

  it("deja directas las líneas ambiguas o no resolubles y pliega las demás", () => {
    const description = [
      "Información general sin modelo",
      "Modelos 303 y 349",
      "Modelos 303 y 999",
      "Modelo 999",
      "Modelo 130",
      "Autoliquidación: 303",
      "Modelo 349",
    ].join("\n");
    const calendarEvent = event(description);
    const context = buildFiscalCalendarDescriptionFilterContext({
      session: session(pendingAssessment),
      obligationViewStatus: "ORIENTATIVE",
      mineModelCodes,
      resolvableModelCodes,
    });
    const result = buildFiscalCalendarDescriptionView({
      event: calendarEvent,
      scope: "MINE",
      context,
    });

    expect(result.directLines.map(({ text }) => text)).toEqual([
      "Información general sin modelo",
      "Modelos 303 y 349",
      "Modelos 303 y 999",
      "Modelo 999",
      "Autoliquidación: 303",
    ]);
    expect(result.otherModelLines.map(({ text }) => text)).toEqual([
      "Modelo 130",
      "Modelo 349",
    ]);
  });

  it.each([
    ["ALL_ONLY" as const, pendingAssessment],
    [
      "ORIENTATIVE" as const,
      assessment(pendingAssessment.obligations, {
        resolutionState: "BLOCKED",
      }),
    ],
    [
      "ORIENTATIVE" as const,
      assessment(pendingAssessment.obligations, {
        profile: {
          state: "INCOMPLETE",
          missingInformation: ["fixture pendiente"],
          conflicts: [],
        },
      }),
    ],
  ])(
    "no segmenta con estado %s o perfil incompleto",
    (obligationViewStatus, storedAssessment) => {
      const calendarEvent = event(compoundDescription);
      const context = buildFiscalCalendarDescriptionFilterContext({
        session: session(storedAssessment),
        obligationViewStatus,
        mineModelCodes,
        resolvableModelCodes,
      });
      const result = buildFiscalCalendarDescriptionView({
        event: calendarEvent,
        scope: "MINE",
        context,
      });

      expect(context.enabled).toBe(false);
      expect(result.mode).toBe("FULL");
      expect(result.directLines).toEqual(result.allLines);
    },
  );

  it("no cruza una foto fiscal con un evento de otro año en Madrid", () => {
    const calendarEvent = event(compoundDescription, {
      allDay: false,
      startDate: "2026-12-31T23:30:00.000Z",
      endDateExclusive: "2027-01-01T00:30:00.000Z",
    });
    const context = buildFiscalCalendarDescriptionFilterContext({
      session: session(pendingAssessment),
      obligationViewStatus: "ORIENTATIVE",
      mineModelCodes,
      resolvableModelCodes,
    });
    const result = buildFiscalCalendarDescriptionView({
      event: calendarEvent,
      scope: "MINE",
      context,
    });

    expect(result.mode).toBe("FULL");
  });

  it("normaliza espacios y acota las líneas sin mutar la entrada", () => {
    const sourceLines = Array.from(
      { length: MAX_RENDERED_FISCAL_CALENDAR_DESCRIPTION_LINES + 5 },
      (_, index) => `  Línea ${index + 1}  `,
    );
    const description = sourceLines.join("\n");
    const calendarEvent = Object.freeze(event(description));
    const context = buildFiscalCalendarDescriptionFilterContext({
      session: session(pendingAssessment),
      obligationViewStatus: "ORIENTATIVE",
      mineModelCodes,
      resolvableModelCodes,
    });
    const result = buildFiscalCalendarDescriptionView({
      event: calendarEvent,
      scope: "MINE",
      context,
    });

    expect(result.allLines).toHaveLength(
      MAX_RENDERED_FISCAL_CALENDAR_DESCRIPTION_LINES,
    );
    expect(result.allLines[0].text).toBe("Línea 1");
    expect(result.allLines.at(-1)?.text).toBe("Línea 100");
    expect(calendarEvent.description).toBe(description);
  });
});
