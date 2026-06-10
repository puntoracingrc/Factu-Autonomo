"use client";

import Link from "next/link";
import { Download } from "lucide-react";
import { DocumentShareActions } from "@/components/documents/DocumentShareActions";
import { downloadDocumentPdf } from "@/lib/pdf";
import type { BusinessProfile, Document, DocumentType } from "@/lib/types";

const TYPE_LABELS: Record<DocumentType, string> = {
  factura: "factura",
  presupuesto: "presupuesto",
  recibo: "recibo",
};

interface DocumentReadOnlyActionsProps {
  doc: Document;
  profile: BusinessProfile;
  listHref: string;
}

export function DocumentReadOnlyActions({
  doc,
  profile,
  listHref,
}: DocumentReadOnlyActionsProps) {
  const missingContact = !doc.client.email && !doc.client.phone;
  const typeLabel = TYPE_LABELS[doc.type];

  return (
    <div className="mt-6 space-y-4">
      <p className="text-sm font-semibold text-slate-800">
        Enviar {typeLabel} al cliente
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => downloadDocumentPdf(doc, profile)}
          className="flex min-h-11 items-center gap-2 rounded-xl bg-blue-50 px-4 text-sm font-semibold text-blue-700"
        >
          <Download className="h-5 w-5" />
          Descargar PDF
        </button>
        <DocumentShareActions doc={doc} profile={profile} />
      </div>

      {missingContact && (
        <p className="text-sm text-slate-500">
          Para enviar por email o WhatsApp, añade el contacto del cliente en{" "}
          <Link href="/clientes" className="font-semibold text-blue-600 underline">
            Clientes
          </Link>{" "}
          o edítalo en el documento antes de emitirlo.
        </p>
      )}

      <Link
        href={listHref}
        className="inline-block text-sm font-semibold text-blue-600 underline"
      >
        Volver al listado
      </Link>
    </div>
  );
}
