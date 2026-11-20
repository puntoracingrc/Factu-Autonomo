import { buildDocumentPdfBlob, documentPdfFilename } from "@/lib/pdf";
import type { QuickReceipt } from "@/lib/quick-invoicing/model";
export async function quickPdf(receipt: QuickReceipt) {
  const blob = await buildDocumentPdfBlob(receipt.document, receipt.profile);
  const file = new File([blob], documentPdfFilename(receipt.document), { type: "application/pdf" });
  return { file, url: URL.createObjectURL(file) };
}
