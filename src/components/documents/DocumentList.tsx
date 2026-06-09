"use client";

import Link from "next/link";
import { Download, Pencil, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { ButtonLink } from "@/components/ui/Button";
import { useAppStore } from "@/context/AppStore";
import {
  documentTotals,
  formatMoney,
  formatShortDate,
} from "@/lib/calculations";
import { downloadDocumentPdf } from "@/lib/pdf";
import type { Document, DocumentType } from "@/lib/types";

const STATUS_LABELS: Record<Document["status"], string> = {
  borrador: "Borrador",
  enviado: "Enviado",
  pagado: "Pagado",
  vencido: "Vencido",
};

const STATUS_COLORS: Record<Document["status"], string> = {
  borrador: "bg-slate-100 text-slate-600",
  enviado: "bg-amber-100 text-amber-700",
  pagado: "bg-green-100 text-green-700",
  vencido: "bg-red-100 text-red-700",
};

interface DocumentListProps {
  type: DocumentType;
  basePath: string;
  emptyMessage: string;
}

export function DocumentList({
  type,
  basePath,
  emptyMessage,
}: DocumentListProps) {
  const { data, getDocumentsByType, deleteDocument } = useAppStore();
  const documents = getDocumentsByType(type).sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );

  if (documents.length === 0) {
    return (
      <Card className="text-center">
        <p className="text-slate-500">{emptyMessage}</p>
        <ButtonLink href={`${basePath}/nuevo`} className="mt-4">
          Crear el primero
        </ButtonLink>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {documents.map((doc) => {
        const total = documentTotals(doc).total;
        return (
          <Card key={doc.id} className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-bold text-slate-900">{doc.number}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_COLORS[doc.status]}`}
                >
                  {STATUS_LABELS[doc.status]}
                </span>
              </div>
              <p className="mt-1 text-slate-700">{doc.client.name}</p>
              <p className="text-sm text-slate-500">
                {formatShortDate(doc.date)} · {formatMoney(total)}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => downloadDocumentPdf(doc, data.profile)}
                className="flex min-h-11 min-w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-700"
                title="Descargar PDF"
              >
                <Download className="h-5 w-5" />
              </button>
              <Link
                href={`${basePath}/${doc.id}`}
                className="flex min-h-11 min-w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-700"
                title="Editar"
              >
                <Pencil className="h-5 w-5" />
              </Link>
              <button
                onClick={() => {
                  if (confirm("¿Borrar este documento?")) deleteDocument(doc.id);
                }}
                className="flex min-h-11 min-w-11 items-center justify-center rounded-xl bg-red-50 text-red-600"
                title="Borrar"
              >
                <Trash2 className="h-5 w-5" />
              </button>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
