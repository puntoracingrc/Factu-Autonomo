import { jsPDF } from "jspdf";
import { describe, expect, it } from "vitest";
import {
  MAX_CENSUS_DOCUMENT_BYTES,
  readCensusDocumentText,
} from "./census-document-file";

describe("local census PDF reader", () => {
  it("extracts selectable PDF text without a server request", async () => {
    const pdf = new jsPDF();
    pdf.text("CERTIFICADO DE SITUACION CENSAL", 15, 20);
    pdf.text("NIF: 12345678Z", 15, 30);
    const file = new File([pdf.output("arraybuffer")], "censo.pdf", {
      type: "application/pdf",
    });

    await expect(readCensusDocumentText(file)).resolves.toContain("12345678Z");
  });

  it("rejects a renamed non-PDF by its magic bytes", async () => {
    const file = new File(["not a pdf"], "censo.pdf", {
      type: "application/pdf",
    });
    await expect(readCensusDocumentText(file)).rejects.toMatchObject({
      code: "INVALID_PDF",
    });
  });

  it("rejects oversized files before parsing", async () => {
    const file = new File(
      [new Uint8Array(MAX_CENSUS_DOCUMENT_BYTES + 1)],
      "censo.pdf",
      { type: "application/pdf" },
    );
    await expect(readCensusDocumentText(file)).rejects.toMatchObject({
      code: "FILE_TOO_LARGE",
    });
  });

  it("identifies image-only or blank PDFs as requiring manual completion", async () => {
    const pdf = new jsPDF();
    const file = new File([pdf.output("arraybuffer")], "vacio.pdf", {
      type: "application/pdf",
    });

    await expect(readCensusDocumentText(file)).rejects.toEqual(
      expect.objectContaining({ code: "NO_READABLE_TEXT" }),
    );
  });
});
