import { showFactuToast } from "@/lib/factu/occasional";
import { downloadDocumentPdf } from "@/lib/pdf";
import type { BusinessProfile, Document, DocumentType } from "@/lib/types";
import type { useRouter } from "next/navigation";

type AppRouter = ReturnType<typeof useRouter>;

const SAVED_LABELS: Record<DocumentType, string> = {
  factura: "Factura",
  presupuesto: "Presupuesto",
  recibo: "Recibo",
};

const LIST_PATHS: Record<DocumentType, string> = {
  factura: "/facturas",
  presupuesto: "/presupuestos",
  recibo: "/recibos",
};

export function toastDocumentSaved(type: DocumentType, number: string): void {
  showFactuToast(
    `${SAVED_LABELS[type]} ${number} guardada correctamente`,
    4000,
  );
}

export function finishDocumentSave(input: {
  type: DocumentType;
  number: string;
  router: AppRouter;
  download?: { doc: Document; profile: BusinessProfile };
}): void {
  toastDocumentSaved(input.type, input.number);
  input.router.replace(LIST_PATHS[input.type]);
  input.router.refresh();

  if (input.download) {
    void downloadDocumentPdf(input.download.doc, input.download.profile).catch(
      () => {
        showFactuToast(
          "No se pudo descargar el PDF. Puedes hacerlo desde el listado.",
        );
      },
    );
  }
}
