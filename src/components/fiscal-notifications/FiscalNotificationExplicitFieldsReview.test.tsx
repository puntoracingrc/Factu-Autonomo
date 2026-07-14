import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { extractAeatEnforcementExplicitFieldsV2 } from "@/lib/fiscal-notifications/aeat-enforcement-explicit-fields.v2";
import { projectExplicitFieldsReviewViewModelV2 } from "@/lib/fiscal-notifications/explicit-fields-review-view-model.v2";
import type { BoundedDocumentInput } from "@/lib/fiscal-notifications/input-contract";
import { FiscalNotificationExplicitFieldsReview } from "./FiscalNotificationExplicitFieldsReview";

const PRIVATE_REFERENCE = "PRIVATE_NIF_CSV_REFERENCE_SENTINEL";
const HEADER = [
  "AGENCIA TRIBUTARIA",
  "sede.agenciatributaria.gob.es",
  "PROVIDENCIA DE APREMIO",
  "IDENTIFICACION DEL DOCUMENTO",
  "IMPORTE DE LA DEUDA",
];

function documentWith(lines: readonly string[]): BoundedDocumentInput {
  return Object.freeze({
    ownerScope: "user:synthetic-component",
    documentId: "document:synthetic-component",
    pages: Object.freeze([
      Object.freeze({
        pageNumber: 1,
        text: [...HEADER, ...lines].join("\n"),
        isBlank: false,
      }),
    ]),
  });
}

function viewModel(lines: readonly string[]) {
  return projectExplicitFieldsReviewViewModelV2(
    extractAeatEnforcementExplicitFieldsV2(documentWith(lines)),
  );
}

function render(lines: readonly string[]): string {
  return renderToStaticMarkup(
    createElement(FiscalNotificationExplicitFieldsReview, {
      viewModel: viewModel(lines),
    }),
  );
}

describe("FiscalNotificationExplicitFieldsReview", () => {
  it("shows five exact reference values and three dates accessibly", () => {
    const html = render([
      `Clave de liquidación: ${PRIVATE_REFERENCE}`,
      "Referencia del documento: DOC-SYNTH-002",
      "Justificante de pago: JUST-SYNTH-003",
      "CSV: CSV-SYNTH-004",
      "Vto.: VTO-SYNTH-005",
      "Fecha de emisión: 05/07/2026",
      "Fecha de firma: 06-07-2026",
      "Fin del período voluntario: 07/07/2026",
    ]);

    expect(html).toContain(
      'aria-labelledby="notification-explicit-fields-heading"',
    );
    expect(html).toContain('id="notification-explicit-fields-heading"');
    expect(html).toContain("Referencias y fechas impresas");
    expect(html).toContain("Clave de liquidación");
    expect(html).toContain("Referencia del documento");
    expect(html).toContain("Justificante de pago");
    expect(html).toContain("Código seguro de verificación (CSV)");
    expect(html).toContain("Vto. (identificador impreso)");
    expect(html).toContain(PRIVATE_REFERENCE);
    expect(html).toContain("DOC-SYNTH-002");
    expect(html).toContain("JUST-SYNTH-003");
    expect(html).toContain("CSV-SYNTH-004");
    expect(html).toContain("VTO-SYNTH-005");
    expect(html).toContain("Valor impreso · revisión obligatoria");
    expect(html).toContain("Fecha de emisión impresa");
    expect(html).toContain("Fecha de firma impresa");
    expect(html).toContain("Fin del período voluntario impreso");
    expect(html).toContain('<time dateTime="2026-07-05">05/07/2026</time>');
    expect(html).toContain('<time dateTime="2026-07-06">06-07-2026</time>');
    expect(html).toContain('<time dateTime="2026-07-07">07/07/2026</time>');
    expect(html).toContain("sin efecto jurídico determinado");
    expect(html).toContain("no confirman la fecha de notificación");
    expect(html).toContain("no como una fecha ni una cuota");
    expect(html).toContain("no se guardan");
    expect(html).toContain("no se incluyen en la ficha técnica");
  });

  it("does not create empty sections or inferred zeroes for sparse facts", () => {
    const onlyReference = render(["CSV: CSV-SYNTH-004"]);
    const onlyDate = render(["Fecha de firma: 06/07/2026"]);

    expect(onlyReference).toContain("Referencias detectadas");
    expect(onlyReference).not.toContain("Fechas impresas detectadas");
    expect(onlyDate).not.toContain("Referencias detectadas");
    expect(onlyDate).toContain("Fechas impresas detectadas");
    expect(`${onlyReference}${onlyDate}`).not.toMatch(/>0(?:,00)?</);
  });

  it.each([
    [[], "Información pendiente", "La ausencia no confirma"],
    [
      ["CSV: CSV-SYNTH-A", "CSV: CSV-SYNTH-B"],
      "Lectura ambigua",
      "No mostramos ningún valor",
    ],
    [
      ["Fecha de emisión: 31/02/2026"],
      "Lectura bloqueada",
      "No mostramos datos parciales",
    ],
  ] as const)(
    "renders %s without partial cards",
    (lines, stateLabel, summary) => {
      const html = render(lines);
      expect(html).toContain(stateLabel);
      expect(html).toContain(summary);
      expect(html).not.toContain("<dl");
      expect(html).not.toContain("<time");
      expect(html).not.toContain("Valor impreso · revisión obligatoria");
    },
  );

  it("ignores accidental fact arrays when a non-fact state is supplied", () => {
    const facts = viewModel([
      "CSV: CSV-SYNTH-004",
      "Fecha de firma: 06/07/2026",
    ]);
    const hostile = {
      ...facts,
      state: "PENDING" as const,
      stateLabel: "Información pendiente" as const,
      summary:
        "No se han encontrado campos bajo las etiquetas cubiertas. La ausencia no confirma que el documento no los contenga." as const,
    };
    const html = renderToStaticMarkup(
      createElement(FiscalNotificationExplicitFieldsReview, {
        viewModel: hostile,
      }),
    );

    expect(html).toContain("La ausencia no confirma");
    expect(html).not.toContain("<dl");
    expect(html).not.toContain("<time");
    expect(html).not.toContain("CSV-SYNTH");
  });

  it("is presentational, non-interactive and has no nested live region", () => {
    const html = render(["CSV: CSV-SYNTH-004"]);
    const source = readFileSync(
      new URL("./FiscalNotificationExplicitFieldsReview.tsx", import.meta.url),
      "utf8",
    );

    expect(html).not.toMatch(
      /<(?:form|input|button|a|select|textarea|progress)\b/,
    );
    expect(html).not.toMatch(/(?:aria-live|role="(?:status|alert)")/);
    expect(source).not.toContain('"use client"');
    expect(source).not.toMatch(/AeatEnforcementExplicitFieldsV[12]/);
    expect(source).not.toMatch(/\b(?:useState|useEffect|useReducer)\b/);
    expect(source).not.toMatch(/\bfetch\s*\(|localStorage|sessionStorage|indexedDB/);
    expect(source).not.toMatch(/on(?:Click|Change|Submit)=/);
    expect(source).not.toMatch(/dangerouslySetInnerHTML|navigator\.clipboard/);
  });

  it("escapes values as React text and does not create links or actions", () => {
    const safe = viewModel(["CSV: CSV-SYNTH-004"]);
    const hostile = {
      ...safe,
      categories: [
        {
          ...safe.categories[0]!,
          printedValue: '<img src=x onerror="alert(1)">',
        },
      ],
    };
    const html = renderToStaticMarkup(
      createElement(FiscalNotificationExplicitFieldsReview, {
        viewModel: hostile,
      }),
    );

    expect(html).toContain("&lt;img src=x onerror=&quot;alert(1)&quot;&gt;");
    expect(html).not.toContain("<img");
    expect(html).not.toMatch(/<(?:a|button|input|form)\b/);
  });
});
