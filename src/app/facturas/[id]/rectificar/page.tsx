"use client";

import { use } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/ui/Card";
import { RectificativaForm } from "@/components/forms/RectificativaForm";
import { useAppStore } from "@/context/AppStore";
import { canRectifyInvoice } from "@/lib/rectificativas";

export default function RectificarFacturaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data } = useAppStore();
  const original = data.documents.find((d) => d.id === id);

  if (!original || original.type !== "factura") {
    return <p className="text-slate-500">Factura no encontrada.</p>;
  }

  if (!canRectifyInvoice(original)) {
    return (
      <CardMessage
        title="No se puede rectificar"
        message={
          original.rectifiedById
            ? "Esta factura ya tiene una rectificativa asociada."
            : original.rectification
              ? "Este documento ya es una factura rectificativa."
              : "Solo puedes rectificar facturas enviadas, pagadas o vencidas. Los borradores se pueden editar o borrar."
        }
        href="/facturas"
      />
    );
  }

  return (
    <div>
      <PageHeader
        title="Factura rectificativa"
        subtitle={`Rectifica la factura ${original.number}`}
      />
      <RectificativaForm original={original} />
    </div>
  );
}

function CardMessage({
  title,
  message,
  href,
}: {
  title: string;
  message: string;
  href: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6">
      <h1 className="text-xl font-bold text-slate-900">{title}</h1>
      <p className="mt-2 text-slate-600">{message}</p>
      <Link href={href} className="mt-4 inline-block font-semibold text-blue-600">
        Volver a facturas
      </Link>
    </div>
  );
}
