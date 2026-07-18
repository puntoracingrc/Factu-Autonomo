import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  new URL("./DocumentList.tsx", import.meta.url),
  "utf8",
);

function actionBarSource(): string {
  const start = source.indexOf('className="action-scroll');
  const end = source.indexOf(
    '{type === "factura" &&\n                  expandedRelationshipDocumentId',
    start,
  );

  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  return source.slice(start, end);
}

describe("orden de acciones en los listados de documentos", () => {
  it("mantiene una secuencia comun y omite solo las acciones no aplicables", () => {
    const actions = actionBarSource();
    const tokens = [
      "MarkAsAcceptedButton",
      "MarkAsPaidButton",
      "ConvertQuoteToInvoiceButton",
      "GenerateReceiptButton",
      "DuplicateDocumentButton",
      "DocumentLinkManagerButton",
      "DocumentPdfShareActions",
      "PaymentReminderButton",
      "{rectifiable &&",
      "{editable &&",
      "DeleteDocumentButton",
    ];

    const positions = tokens.map((token) => actions.indexOf(token));
    expect(positions.every((position) => position >= 0)).toBe(true);
    expect(positions).toEqual(
      [...positions].sort((left, right) => left - right),
    );
  });

  it("mantiene la vista PDF en el mismo bloque para borradores y emitidos", () => {
    const actions = actionBarSource();

    expect(actions).toContain("<DocumentPdfShareActions");
    expect(actions).not.toContain("showPreview={editable}");
    expect(source).not.toContain("previewingDocumentId");
    expect(source).not.toContain("handlePdfPreview");
  });
});
