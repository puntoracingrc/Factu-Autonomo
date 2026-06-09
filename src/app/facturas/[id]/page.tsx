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

  if (!doc || doc.type !== "factura") {
    return <p className="text-slate-500">Factura no encontrada.</p>;
  }

  if (
    doc.rectification ||
    doc.rectifiedById ||
    doc.status !== "borrador"
  ) {
    const message = doc.rectification
      ? "Las facturas rectificativas no se editan. Descárgala en PDF si la necesitas."
      : doc.rectifiedById
        ? "Esta factura ya fue rectificada o anulada y no se puede modificar."
        : "Las facturas emitidas no se editan. Usa «Rectificar» desde el listado.";
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <p className="text-slate-600">{message}</p>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title={`Editar ${doc.number}`} subtitle={doc.client.name} />
      <DocumentForm type="factura" existing={doc} />
    </div>
  );
}
