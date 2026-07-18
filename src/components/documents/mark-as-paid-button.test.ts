import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const buttonSource = readFileSync(
  new URL("./MarkAsPaidButton.tsx", import.meta.url),
  "utf8",
);
const storeSource = readFileSync(
  new URL("../../context/AppStore.tsx", import.meta.url),
  "utf8",
);
const listSource = readFileSync(
  new URL("./DocumentList.tsx", import.meta.url),
  "utf8",
);
const detailSource = readFileSync(
  new URL("./DocumentReadOnlyActions.tsx", import.meta.url),
  "utf8",
);

describe("collection toggle wiring", () => {
  it("mantiene visible la acción cuando una factura cobrada puede desmarcarse", () => {
    expect(buttonSource).toContain("canToggleCollectionStatus(doc)");
    expect(buttonSource).toContain("unmarkAsCollected(doc.id)");
    expect(buttonSource).toContain("markAsCollected(doc.id)");
    expect(listSource).toContain('<MarkAsPaidButton doc={doc} />');
    expect(detailSource).toContain('<MarkAsPaidButton doc={doc} />');
    expect(listSource).toContain(
      '!(type === "factura" && isCollectedDocument(doc))',
    );
    expect(listSource).not.toContain(
      '!(type === "factura" && doc.status === "pagado")',
    );
  });

  it("usa el overlay histórico sin reescribir los campos fiscales atestados", () => {
    expect(storeSource).toContain(
      'withHistoricalCollectionStatus(doc, "pending", now)',
    );
    expect(storeSource).toContain('doc,\n          "collected",\n          now');
    expect(storeSource).not.toMatch(
      /historical[\s\S]{0,260}status:\s*newStatus/,
    );
  });
});
