import { buildDocumentPdfBlob, documentPdfFilename } from "@/lib/pdf";
import type { QuickReceipt } from "@/lib/quick-invoicing/model";
export async function quickPdf(receipt: QuickReceipt) {
  const blob = await buildDocumentPdfBlob(receipt.document, receipt.profile);
  return { blob, name: documentPdfFilename(receipt.document), url: URL.createObjectURL(blob) };
}
