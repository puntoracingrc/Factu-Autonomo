import { showFactuToast } from "@/lib/factu/occasional";
import { DRAFT_INVOICE_NUMBER } from "@/lib/documents";
import { downloadDocumentPdf } from "@/lib/pdf";
import type { BusinessProfile, Document, DocumentType } from "@/lib/types";
import type { useRouter } from "next/navigation";

type AppRouter = ReturnType<typeof useRouter>;

const SAVED_LABELS: Record<DocumentType, string> = {
  factura: "Factura",
  presupuesto: "Presupuesto",
  recibo: "Recibo",
};

const SAVED_PARTICIPLE: Record<DocumentType, string> = {
  factura: "guardada",
  presupuesto: "guardado",
  recibo: "guardado",
};

const LIST_PATHS: Record<DocumentType, string> = {
  factura: "/facturas",
  presupuesto: "/presupuestos",
  recibo: "/recibos",
};

export function toastDocumentSaved(type: DocumentType, number: string): void {
  if (type === "factura" && number.trim().toUpperCase() === DRAFT_INVOICE_NUMBER) {
    showFactuToast("Borrador de factura guardado correctamente", 4000);
    return;
  }

  showFactuToast(
    `${SAVED_LABELS[type]} ${number} ${SAVED_PARTICIPLE[type]} correctamente`,
    4000,
  );
}

export async function finishDocumentSave(input: {
  type: DocumentType;
  number: string;
  router: AppRouter;
  download?: { doc: Document; profile: BusinessProfile };
}): Promise<void> {
  toastDocumentSaved(input.type, input.number);

  if (input.download) {
    try {
      await downloadDocumentPdf(input.download.doc, input.download.profile);
    } catch {
      showFactuToast(
        "No se pudo descargar el PDF. Puedes hacerlo desde el listado.",
      );
    }
  }

  input.router.replace(LIST_PATHS[input.type]);
  input.router.refresh();
}
