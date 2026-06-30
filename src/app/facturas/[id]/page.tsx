"use client";

import { use } from "react";
import { DocumentDetailView } from "@/components/documents/DocumentDetailView";
import { useAppStore } from "@/context/AppStore";
import { decodeDocumentIdFromPath } from "@/lib/document-links";

export default function EditarFacturaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: pathId } = use(params);
  const id = decodeDocumentIdFromPath(pathId);
  const { data } = useAppStore();
  const doc = data.documents.find((d) => d.id === id);

  return (
    <DocumentDetailView
      doc={doc}
      type="factura"
      listHref="/facturas"
      notFoundMessage="Factura no encontrada."
    />
  );
}
