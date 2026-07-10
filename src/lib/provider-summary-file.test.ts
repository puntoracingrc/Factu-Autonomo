import { describe, expect, it } from "vitest";
import { jsPDF } from "jspdf";
import { parseProviderSummaryFile } from "./provider-summary-file";

const SUMMARY_TEXT = `
Listado de Facturas Emitidas
Metalúrgica Arandes SL
Factura
Fecha
Cliente
Vto.
Base Imp.
%Iva
IVA
Total
FD/222386
01/04/2026
CLIENTE DE PRUEBA
01/04/2026
12,54
21
2,63
15,17
`;

describe("provider summary files", () => {
  it("parses text summaries locally without a server request", async () => {
    const file = new File([SUMMARY_TEXT], "resumen.txt", {
      type: "text/plain",
    });

    const parsed = await parseProviderSummaryFile(file);

    expect(parsed.fileName).toBe("resumen.txt");
    expect(parsed.providerName).toBe("Metalúrgica Arandes SL");
    expect(parsed.rows).toHaveLength(1);
    expect(parsed.rows[0].invoiceNumber).toBe("FD/222386");
  });

  it("rejects unsupported binary files", async () => {
    const file = new File(["binary"], "resumen.exe", {
      type: "application/octet-stream",
    });

    await expect(parseProviderSummaryFile(file)).rejects.toThrow(
      "PDF, TXT o CSV",
    );
  });

  it("extracts and parses PDF text in the browser-compatible path", async () => {
    const pdf = new jsPDF();
    SUMMARY_TEXT.trim()
      .split("\n")
      .forEach((line, index) => pdf.text(line, 15, 15 + index * 6));
    const file = new File([pdf.output("arraybuffer")], "resumen.pdf", {
      type: "application/pdf",
    });

    const parsed = await parseProviderSummaryFile(file);

    expect(parsed.rows).toHaveLength(1);
    expect(parsed.rows[0].invoiceNumber).toBe("FD/222386");
  });
});
