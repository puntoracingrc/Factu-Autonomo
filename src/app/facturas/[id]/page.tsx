"use client";

import { use } from "react";
import { PageHeader } from "@/components/ui/Card";
import { DocumentForm } from "@/components/forms/DocumentForm";
import { useAppStore } from "@/context/AppStore";

export default function EditarFacturaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data } = useAppStore();
  const doc = data.documents.find((d) => d.id === id);

  if (!doc) {
    return <p className="text-slate-500">Factura no encontrada.</p>;
  }

  return (
    <div>
      <PageHeader title={`Editar ${doc.number}`} subtitle={doc.client.name} />
      <DocumentForm type="factura" existing={doc} />
    </div>
  );
}
