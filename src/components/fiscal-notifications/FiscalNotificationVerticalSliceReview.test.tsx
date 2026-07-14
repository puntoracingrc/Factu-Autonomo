import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { analyzeFiscalNotificationVerticalSliceV1 } from "@/lib/fiscal-notifications/extractor-core/vertical-slice-orchestrator.v1";
import type { BoundedDocumentInput } from "@/lib/fiscal-notifications/input-contract";
import {
  createEmptyFiscalNotificationVerticalSliceReviewV1,
  projectFiscalNotificationVerticalSliceReviewV1,
} from "@/lib/fiscal-notifications/vertical-slice-review.v1";
import { FiscalNotificationVerticalSliceReview } from "./FiscalNotificationVerticalSliceReview";

const RAW_ACCOUNT = "ES12 3456 7890 1234 5678 9012";
const PAYMENT = [
  "Agencia Tributaria",
  "sede.agenciatributaria.gob.es",
  "JUSTIFICANTE DE PAGO",
  "Número de justificante: REC-SYN-UI-001",
  "NRC: ABCDEF1234567890GHIJKL",
  "Fecha del pago: 14/07/2026",
  "N.I.F.: 12345678Z",
  "Modelo: 303",
  "Ejercicio: 2026",
  "Periodo: 2T",
  "Clave de deuda: DEBT-SYN-UI-001",
  "Importe pagado: 600,00 euros",
  "Resultado del pago: Pago parcial",
  "Tipo de pago: Parcial",
  `Cuenta de cargo: ${RAW_ACCOUNT}`,
].join("\n");

const NOTIFICATION = [
  "Dirección Electrónica Habilitada Única",
  "dehu.redsara.es",
  "ACUSE DE RECIBO",
  "Estado de la notificación: Expirada",
  "Identificador de la notificación: NOT-SYN-UI-001",
  "Asunto: Acto sintético notificado",
  "Fecha de puesta a disposición: 01/07/2026 10:00",
  "Fecha de expiración: 11/07/2026 10:00",
].join("\n");

function document(text: string): BoundedDocumentInput {
  return Object.freeze({
    ownerScope: "user:synthetic-ui",
    documentId: "document:synthetic-ui",
    pages: Object.freeze([
      Object.freeze({ pageNumber: 1, text, isBlank: false }),
    ]),
  });
}

describe("FiscalNotificationVerticalSliceReview", () => {
  it("shows an exact expired notification and its printed dates", async () => {
    const review = projectFiscalNotificationVerticalSliceReviewV1(
      await analyzeFiscalNotificationVerticalSliceV1(document(NOTIFICATION)),
    );
    const html = renderToStaticMarkup(
      createElement(FiscalNotificationVerticalSliceReview, { review }),
    );

    expect(html).toContain("Sobre o acuse de notificación electrónica");
    expect(html).toContain("Notificación expirada");
    expect(html).toContain("NOT-SYN-UI-001");
    expect(html).toContain("Acto sintético notificado");
    expect(html).toContain("01/07/2026 10:00");
    expect(html).toContain("11/07/2026 10:00");
    expect(html).toContain("Documento reconocido");
    expect(html).not.toMatch(/posible familia/iu);
  });

  it("shows the exact type and extracted fields without possible-family copy", async () => {
    const review = projectFiscalNotificationVerticalSliceReviewV1(
      await analyzeFiscalNotificationVerticalSliceV1(document(PAYMENT)),
    );
    const html = renderToStaticMarkup(
      createElement(FiscalNotificationVerticalSliceReview, { review }),
    );

    expect(html).toContain("Justificante de pago");
    expect(html).toContain("Documento reconocido");
    expect(html).toContain("Pago parcial confirmado en el justificante");
    expect(html).toContain("DEBT-SYN-UI-001");
    expect(html).toContain("600,00 €");
    expect(html).toContain("****9012");
    expect(html).toContain("Página 1");
    expect(html).not.toContain("Posible familia");
    expect(html).not.toContain(RAW_ACCOUNT);
  });

  it("renders no empty card for information-pending content", () => {
    expect(
      renderToStaticMarkup(
        createElement(FiscalNotificationVerticalSliceReview, {
          review: createEmptyFiscalNotificationVerticalSliceReviewV1(),
        }),
      ),
    ).toBe("");
  });

  it("escapes extracted values and remains presentational", async () => {
    const review = structuredClone(
      projectFiscalNotificationVerticalSliceReviewV1(
        await analyzeFiscalNotificationVerticalSliceV1(document(PAYMENT)),
      ),
    );
    (
      review.documents[0]!.fields[0] as unknown as { displayValue: string }
    ).displayValue = '<img src=x onerror="alert(1)">';
    const html = renderToStaticMarkup(
      createElement(FiscalNotificationVerticalSliceReview, { review }),
    );

    expect(html).toContain("&lt;img src=x onerror=&quot;alert(1)&quot;&gt;");
    expect(html).not.toContain("<img");
    expect(html).not.toMatch(/<(?:form|input|button|a|select|textarea)\b/u);
    expect(html).not.toMatch(/(?:aria-live|role="(?:status|alert)")/u);
  });
});
