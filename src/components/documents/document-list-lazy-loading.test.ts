import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  new URL("./DocumentList.tsx", import.meta.url),
  "utf8",
);
const pdfActionsSource = readFileSync(
  new URL("./DocumentPdfShareActions.tsx", import.meta.url),
  "utf8",
);
const shareActionsSource = readFileSync(
  new URL("./DocumentShareActions.tsx", import.meta.url),
  "utf8",
);
const shareSource = readFileSync(
  new URL("../../lib/share.ts", import.meta.url),
  "utf8",
);
const pdfSource = readFileSync(
  new URL("../../lib/pdf.ts", import.meta.url),
  "utf8",
);

describe("carga diferida del listado de documentos", () => {
  it("descarga el workspace de relaciones solo cuando se abre", () => {
    expect(source).toContain('import dynamic from "next/dynamic";');
    expect(source).not.toContain(
      'import { InvoiceRelationshipWorkspace } from "@/components/documents/InvoiceRelationshipWorkspace";',
    );
    expect(source).toContain(
      'import("@/components/documents/InvoiceRelationshipWorkspace").then(',
    );
    expect(source).toContain(
      "(module) => module.InvoiceRelationshipWorkspace,",
    );
    expect(source).toContain(
      'expandedRelationshipDocumentId === doc.id ? (',
    );
  });

  it("responde inmediatamente mientras llega el chunk", () => {
    expect(source).toContain('role="status"');
    expect(source).toContain('aria-live="polite"');
    expect(source).toContain("Abriendo relaciones...");
    expect(source).toContain("animate-spin");
  });

  it("carga el generador ZIP solo después de activar el estado ocupado", () => {
    expect(source).toContain(
      'import type {\n  InvoicePdfDocumentSelection,\n} from "@/lib/billing/export-invoice-pdf-archive";',
    );
    expect(source).toContain(
      'from "@/lib/billing/invoice-pdf-export-period";',
    );
    expect(source).not.toContain(
      "import {\n  downloadInvoicePdfPeriodArchive,",
    );

    const busyState = source.indexOf(
      'setInvoicePdfExportBusy(emailTarget ?? "download");',
    );
    const archiveImport = source.indexOf(
      'await import(\n        "@/lib/billing/export-invoice-pdf-archive"',
    );

    expect(busyState).toBeGreaterThan(-1);
    expect(archiveImport).toBeGreaterThan(busyState);
    expect(source).toContain(
      "invoicePdfArchive.downloadInvoicePdfSelectionArchive(",
    );
    expect(source).toContain(
      "invoicePdfArchive.downloadInvoicePdfPeriodArchive(",
    );
    expect(source).toContain(
      "error instanceof invoicePdfArchive.InvoicePdfPeriodExportError",
    );
  });

  it("mantiene las acciones visibles y carga el motor PDF tras el clic", () => {
    expect(pdfActionsSource).not.toContain(
      'from "@/lib/pdf";\nimport { canShareDocumentFromList',
    );
    expect(pdfActionsSource).toContain(
      'const { openDocumentPdfPreview } = await import("@/lib/pdf");',
    );
    expect(pdfActionsSource).toContain(
      'const { downloadDocumentPdf } = await import("@/lib/pdf");',
    );
    expect(pdfActionsSource).toContain(
      'const { printDocumentPdf } = await import("@/lib/pdf");',
    );
    const previewReservation = pdfActionsSource.indexOf(
      "opened = reservePdfActionWindow(`Vista previa ${doc.number}`);",
    );
    const previewImport = pdfActionsSource.indexOf(
      'const { openDocumentPdfPreview } = await import("@/lib/pdf");',
    );
    expect(previewReservation).toBeGreaterThan(-1);
    expect(previewImport).toBeGreaterThan(previewReservation);
    expect(pdfActionsSource).toContain(
      "openDocumentPdfPreview(doc, profile, pdfOptions, opened)",
    );
    expect(pdfActionsSource).toContain(
      "printDocumentPdf(doc, profile, pdfOptions, opened)",
    );
    expect(pdfActionsSource).toContain("setDownloadLoading(true);");
    expect(pdfActionsSource).toContain("Preparando PDF");
    expect(pdfActionsSource).toContain("animate-spin");

    expect(shareActionsSource).not.toContain(
      'import { downloadDocumentPdf } from "@/lib/pdf";',
    );
    expect(shareActionsSource).toContain(
      'const { downloadDocumentPdf } = await import("@/lib/pdf");',
    );
    expect(shareSource).not.toContain(
      'import { buildDocumentPdfBlob, downloadDocumentPdf } from "./pdf";',
    );
    expect(shareSource).toContain(
      'const { buildDocumentPdfBlob } = await import("./pdf");',
    );
    expect(shareSource).toContain(
      'const { downloadDocumentPdf } = await import("./pdf");',
    );
    expect(pdfSource).toContain("reservedWindow?: Window,");
    expect(pdfSource).toContain(
      "const opened = reservedWindow ?? openPdfWindow(filename);",
    );
    expect(pdfSource).toContain(
      "reservedWindow ?? openPdfWindow(`Imprimir ${documentPdfFilename(doc)}`);",
    );
  });
});
