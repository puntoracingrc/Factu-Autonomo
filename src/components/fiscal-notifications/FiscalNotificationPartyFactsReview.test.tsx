import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { extractAeatEnforcementPartyFactsV1 } from "@/lib/fiscal-notifications/aeat-enforcement-party-facts.v1";
import type { BoundedDocumentInput } from "@/lib/fiscal-notifications/input-contract";
import { projectPartyFactsReviewViewModelV1 } from "@/lib/fiscal-notifications/party-facts-review-view-model.v1";
import { FiscalNotificationPartyFactsReview } from "./FiscalNotificationPartyFactsReview";

const PRIVATE_NAME = "PERSONA SINTETICA";
const PRIVATE_TAX_ID = "12345678Z";
const HEADER = [
  "AGENCIA TRIBUTARIA",
  "sede.agenciatributaria.gob.es",
  "PROVIDENCIA DE APREMIO",
  "IDENTIFICACION DEL DOCUMENTO",
  "IMPORTE DE LA DEUDA",
];

function documentWith(lines: readonly string[]): BoundedDocumentInput {
  return Object.freeze({
    ownerScope: "user:synthetic-party-component",
    documentId: "document:synthetic-party-component",
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
  return projectPartyFactsReviewViewModelV1(
    extractAeatEnforcementPartyFactsV1(documentWith(lines)),
  );
}

function render(lines: readonly string[]): string {
  return renderToStaticMarkup(
    createElement(FiscalNotificationPartyFactsReview, {
      viewModel: viewModel(lines),
    }),
  );
}

describe("FiscalNotificationPartyFactsReview", () => {
  it("shows exact identity and the explicit role without tentative wording", () => {
    const html = render([
      "IDENTIFICACION DEL OBLIGADO AL PAGO",
      `NOMBRE / RAZON SOCIAL: ${PRIVATE_NAME}`,
      `NIF: ${PRIVATE_TAX_ID}`,
    ]);

    expect(html).toContain('aria-labelledby="notification-party-facts-heading"');
    expect(html).toContain('id="notification-party-facts-heading"');
    expect(html).toContain("Persona o entidad identificada");
    expect(html).toContain("Identificación leída");
    expect(html).toContain("Obligado al pago");
    expect(html).toContain("Nombre o razón social");
    expect(html).toContain(PRIVATE_NAME);
    expect(html).toContain(PRIVATE_TAX_ID);
    expect(html).not.toMatch(/posible|podr[ií]a ser/iu);
    expect(html).toContain("no crea ni confirma una deuda");
    expect(html).toContain("no se guardan en la ficha técnica");
  });

  it("does not show partial values for pending or blocked states", () => {
    const pending = render([]);
    const blocked = render([
      "IDENTIFICACION DEL OBLIGADO AL PAGO",
      "NOMBRE / RAZON SOCIAL: <script>",
      `NIF: ${PRIVATE_TAX_ID}`,
    ]);

    expect(pending).toContain("Identificación pendiente");
    expect(blocked).toContain("Identificación bloqueada");
    expect(`${pending}${blocked}`).not.toContain(PRIVATE_TAX_ID);
    expect(`${pending}${blocked}`).not.toContain("<dl");
  });

  it("escapes text and remains presentational with no links or actions", () => {
    const safe = viewModel([
      "IDENTIFICACION DEL OBLIGADO AL PAGO",
      `NOMBRE / RAZON SOCIAL: ${PRIVATE_NAME}`,
      `NIF: ${PRIVATE_TAX_ID}`,
    ]);
    const hostile = {
      ...safe,
      subject: safe.subject
        ? { ...safe.subject, printedName: '<img src=x onerror="alert(1)">' }
        : null,
    };
    const html = renderToStaticMarkup(
      createElement(FiscalNotificationPartyFactsReview, { viewModel: hostile }),
    );
    const source = readFileSync(
      new URL("./FiscalNotificationPartyFactsReview.tsx", import.meta.url),
      "utf8",
    );

    expect(html).toContain("&lt;img src=x onerror=&quot;alert(1)&quot;&gt;");
    expect(html).not.toContain("<img");
    expect(html).not.toMatch(/<(?:a|button|input|form|select|textarea)\b/);
    expect(source).not.toContain('"use client"');
    expect(source).not.toMatch(/dangerouslySetInnerHTML|navigator\.clipboard/);
    expect(source).not.toMatch(/\bfetch\s*\(|localStorage|sessionStorage|indexedDB/);
  });
});
