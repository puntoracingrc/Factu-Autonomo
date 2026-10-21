import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildDocumentPdf } from "./pdf";
import { DEFAULT_DOCUMENT_TEMPLATE } from "./document-templates";
import { quickIssuedDocument } from "./quick-invoicing/render";
import { quickPaymentTerms } from "./quick-invoicing/model";
import { syntheticIntent, syntheticProfile } from "./quick-invoicing/test-fixtures";
import type { Document } from "./types";

const IBAN = syntheticProfile.iban;
const profile = { ...syntheticProfile,
  documentTemplate: { ...DEFAULT_DOCUMENT_TEMPLATE, showPaymentBox: true },
};
const invoice: Document = {
  id: "synthetic-iban-invoice", type: "factura", number: "F-2026-0042",
  date: "2026-10-21", status: "borrador", client: syntheticIntent().client,
  items: syntheticIntent().items, createdAt: "2026-10-21T10:00:00Z", updatedAt: "2026-10-21T10:00:00Z",
};

function standaloneCount(output: string) {
  return output.split("(IBAN: ").length - 1;
}

describe("document PDF IBAN presentation", () => {
  it.each([false, true])("prints a quick transfer account once (paid=%s)", (paid) => {
    const doc = quickIssuedDocument({ ...invoice, status: paid ? "pagado" : "enviado",
      salesTerms: quickPaymentTerms("transferencia", paid, IBAN),
    }, profile);
    const before = JSON.stringify(doc);
    const pdf = buildDocumentPdf(doc, profile);
    expect(pdf.output().split(IBAN).length - 1).toBe(1);
    expect(standaloneCount(pdf.output())).toBe(0);
    expect(JSON.stringify(doc)).toBe(before);
  });

  it.each(["clasico", "editorial", "futuro"] as const)("keeps one standalone account when terms do not contain it (%s)", (style) => {
    const pdf = buildDocumentPdf({ ...invoice, salesTerms: "Pago por transferencia" }, {
      ...profile, documentTemplate: { ...profile.documentTemplate, style },
    });
    expect(standaloneCount(pdf.output())).toBe(1);
  });

  it("recognizes case and grouping spaces without changing the stored conditions", () => {
    const grouped = IBAN.toLowerCase().match(/.{1,4}/gu)!.join("\u00a0");
    const doc = { ...invoice, salesTerms: `Transferencia: ${grouped}. Gracias.` };
    expect(standaloneCount(buildDocumentPdf(doc, profile).output())).toBe(0);
    expect(doc.salesTerms).toContain(grouped);
  });

  it.each(["ES1100000000000000000000", `${IBAN}9`])("does not hide a different or longer account: %s", (account) => {
    expect(standaloneCount(buildDocumentPdf({ ...invoice, salesTerms: `Otra cuenta: ${account}` }, profile).output())).toBe(1);
  });

  it("only suppresses an account in the payment box if that box is actually printed", () => {
    const doc = { ...invoice, paymentTerms: `Transferencia - IBAN: ${IBAN}` };
    expect(standaloneCount(buildDocumentPdf(doc, profile).output())).toBe(0);
    const hidden = { ...profile, documentTemplate: { ...profile.documentTemplate, showPaymentBox: false } };
    expect(standaloneCount(buildDocumentPdf(doc, hidden).output())).toBe(1);
  });

  it("uses the frozen issuer account, not a later company account", () => {
    const doc = quickIssuedDocument({ ...invoice, status: "enviado",
      salesTerms: quickPaymentTerms("transferencia", false, IBAN),
    }, profile);
    const pdf = buildDocumentPdf(doc, { ...profile, iban: "ES1100000000000000000000" });
    expect(pdf.output().split(IBAN).length - 1).toBe(1);
    expect(pdf.output()).not.toContain("ES1100000000000000000000");
  });

  it.skipIf(!process.env.PDF_IBAN_OUTPUT_DIR)("renders a synthetic quick invoice for visual review", () => {
    const doc = quickIssuedDocument({ ...invoice, status: "enviado",
      salesTerms: quickPaymentTerms("transferencia", false, IBAN),
    }, profile);
    const pdf = buildDocumentPdf(doc, profile);
    mkdirSync(process.env.PDF_IBAN_OUTPUT_DIR!, { recursive: true });
    writeFileSync(join(process.env.PDF_IBAN_OUTPUT_DIR!, "factura-iban-unico.pdf"), Buffer.from(pdf.output("arraybuffer")));
  });
});
