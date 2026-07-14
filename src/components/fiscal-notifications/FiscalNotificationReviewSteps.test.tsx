import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type {
  FiscalNotificationReviewGuidanceV1,
  FiscalNotificationReviewStepIdV1,
  FiscalNotificationReviewStepStateV1,
} from "@/lib/fiscal-notifications/review-guidance.v1";
import { FiscalNotificationReviewSteps } from "./FiscalNotificationReviewSteps";

const ALL_STEP_IDS: readonly FiscalNotificationReviewStepIdV1[] = [
  "VERIFY_DOCUMENT_RECIPIENT_AND_AUTHORITY",
  "REVIEW_CANDIDATE_CLASSIFICATION",
  "COMPARE_EPHEMERAL_PRINTED_AMOUNTS",
  "VERIFY_DATES_AND_RESPONSE_CHANNELS_EXTERNALLY",
  "CONSULT_OFFICIAL_PROCEDURE_CONTEXT",
  "SEEK_HUMAN_FISCAL_REVIEW",
];

function createGuidance({
  officialContext = false,
  stepIds = ALL_STEP_IDS,
  stepStates = {},
}: {
  readonly officialContext?: boolean;
  readonly stepIds?: readonly FiscalNotificationReviewStepIdV1[];
  readonly stepStates?: Readonly<
    Partial<
      Record<
        FiscalNotificationReviewStepIdV1,
        FiscalNotificationReviewStepStateV1
      >
    >
  >;
} = {}): FiscalNotificationReviewGuidanceV1 {
  return {
    steps: stepIds.map((id) => ({
      id,
      state: stepStates[id] ?? "MANUAL_REVIEW_REQUIRED",
    })),
    officialProcedureContexts: officialContext
      ? [
          {
            sourceId: "aeat.procedure.collection.enforcement.ra19",
            title: "Procedimiento de recaudación en vía ejecutiva",
            canonicalUrl:
              "https://sede.agenciatributaria.gob.es/Sede/procedimientos/RA19.shtml",
          },
        ]
      : [],
  } as unknown as FiscalNotificationReviewGuidanceV1;
}

describe("FiscalNotificationReviewSteps", () => {
  it("presenta las comprobaciones como una lista ordenada sin controles ni progreso", () => {
    const html = renderToStaticMarkup(
      createElement(FiscalNotificationReviewSteps, {
        guidance: createGuidance(),
      }),
    );

    expect(html).toContain("<ol");
    expect(html.match(/<li\b/g)).toHaveLength(6);
    expect(html).toContain("Antes de actuar");
    expect(html).toContain("Comprueba el destinatario y el organismo");
    expect(html).toContain("Revisa la clasificación propuesta");
    expect(html).toContain("Compara los importes impresos");
    expect(html).toContain("Verifica fechas y vías de respuesta");
    expect(html).toContain("Consulta el contexto oficial del procedimiento");
    expect(html).toContain("Solicita revisión fiscal humana");
    expect(html.match(/Estado: Revisión humana obligatoria/g)).toHaveLength(6);
    expect(html).toContain(
      "No la des por confirmada: déjala pendiente de revisión fiscal humana.",
    );
    expect(html).toContain(
      "Esta guía no determina qué actuación procede.",
    );
    expect(html).toContain("no ejecuta acciones ni registra su cumplimiento");
    expect(html).not.toMatch(/<(?:form|input|button|progress|select|textarea)\b/);
    expect(html).not.toMatch(/type="checkbox"/);
  });

  it("distingue información pendiente y lectura bloqueada sin simular progreso", () => {
    const html = renderToStaticMarkup(
      createElement(FiscalNotificationReviewSteps, {
        guidance: createGuidance({
          stepIds: [
            "REVIEW_CANDIDATE_CLASSIFICATION",
            "COMPARE_EPHEMERAL_PRINTED_AMOUNTS",
          ],
          stepStates: {
            REVIEW_CANDIDATE_CLASSIFICATION: "BLOCKED_BY_ANALYSIS",
            COMPARE_EPHEMERAL_PRINTED_AMOUNTS: "INFORMATION_PENDING",
          },
        }),
      }),
    );

    expect(html).toContain("Estado: Lectura bloqueada");
    expect(html).toContain("Estado: Información pendiente");
    expect(html).not.toContain("completado");
    expect(html).not.toContain("<progress");
  });

  it("aísla el enlace oficial y explica que es información general", () => {
    const html = renderToStaticMarkup(
      createElement(FiscalNotificationReviewSteps, {
        guidance: createGuidance({ officialContext: true }),
      }),
    );

    expect(html).toContain(
      'href="https://sede.agenciatributaria.gob.es/Sede/procedimientos/RA19.shtml"',
    );
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).toContain('referrerPolicy="no-referrer"');
    expect(html).toContain("Información general de la AEAT");
    expect(html).toContain("No valida el PDF ni calcula plazos");
    expect(html).toContain("Se abre en una pestaña nueva");
  });

  it("mantiene definitivo el tipo reconocido y limita la revisión a datos y efectos", () => {
    const html = renderToStaticMarkup(
      createElement(FiscalNotificationReviewSteps, {
        guidance: createGuidance({ officialContext: true }),
        documentTypeRecognized: true,
      }),
    );

    expect(html).toContain("Comprueba los datos del documento reconocido");
    expect(html).toContain(
      "esa comprobación no vuelve a convertir el tipo en posible",
    );
    expect(html).toContain(
      "El tipo documental ya está identificado por su firma estructural",
    );
    expect(html).not.toContain("La familia mostrada es solo una candidata técnica");
    expect(html).not.toContain("no confirma su clasificación");
  });

  it("no inventa enlaces cuando la guía no aporta contexto oficial", () => {
    const html = renderToStaticMarkup(
      createElement(FiscalNotificationReviewSteps, {
        guidance: createGuidance({
          stepIds: [
            "VERIFY_DOCUMENT_RECIPIENT_AND_AUTHORITY",
            "SEEK_HUMAN_FISCAL_REVIEW",
          ],
        }),
      }),
    );

    expect(html.match(/<li\b/g)).toHaveLength(2);
    expect(html).not.toContain("<a");
    expect(html).not.toContain("agenciatributaria.gob.es");
  });

  it("permanece presentacional y sin dependencias de estado, red o persistencia", () => {
    const source = readFileSync(
      new URL("./FiscalNotificationReviewSteps.tsx", import.meta.url),
      "utf8",
    );

    expect(source).not.toContain('"use client"');
    expect(source).not.toMatch(/\b(?:useState|useEffect|useReducer)\b/);
    expect(source).not.toMatch(/\bfetch\s*\(/);
    expect(source).not.toMatch(/localStorage|sessionStorage|indexedDB/);
    expect(source).not.toMatch(/on(?:Click|Change|Submit)=/);
  });
});
