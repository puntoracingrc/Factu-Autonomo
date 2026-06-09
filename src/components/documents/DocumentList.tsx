"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Download, FileWarning, Pencil, Search, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { ButtonLink } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { useAppStore } from "@/context/AppStore";
import {
  documentTotals,
  formatMoney,
  formatShortDate,
} from "@/lib/calculations";
import { filterDocumentsByQuery } from "@/lib/documents";
import { downloadDocumentPdf } from "@/lib/pdf";
import {
  canDeleteDocument,
  canRectifyInvoice,
  isRectificativa,
} from "@/lib/rectificativas";
import type { Document, DocumentType } from "@/lib/types";

const STATUS_LABELS: Record<Document["status"], string> = {
  borrador: "Borrador",
  enviado: "Enviado",
  pagado: "Pagado",
  vencido: "Vencido",
  rectificada: "Rectificada",
  anulada: "Anulada",
};

const STATUS_COLORS: Record<Document["status"], string> = {
  borrador: "bg-slate-100 text-slate-600",
  enviado: "bg-amber-100 text-amber-700",
  pagado: "bg-green-100 text-green-700",
  vencido: "bg-red-100 text-red-700",
  rectificada: "bg-orange-100 text-orange-700",
  anulada: "bg-red-100 text-red-800",
};

const SEARCH_LABELS: Record<DocumentType, string> = {
  factura: "factura",
  presupuesto: "presupuesto",
  recibo: "recibo",
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
  const [search, setSearch] = useState("");

  const documents = useMemo(() => {
    const sorted = getDocumentsByType(type).sort((a, b) => {
      const seqA = Number(a.number.split("-").pop() ?? 0);
      const seqB = Number(b.number.split("-").pop() ?? 0);
      return seqB - seqA;
    });
    return filterDocumentsByQuery(sorted, search);
  }, [getDocumentsByType, type, search]);

  const totalCount = getDocumentsByType(type).length;
  const label = SEARCH_LABELS[type];

  return (
    <div className="space-y-4">
      {totalCount > 0 && (
        <Card className="p-4">
          <label className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-slate-700">
              Buscar {label}
            </span>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={
                  type === "factura"
                    ? "Número (F- o FR-), cliente o factura original..."
                    : "Número o nombre de cliente..."
                }
                className="pl-10"
              />
            </div>
            <span className="text-xs text-slate-400">
              {documents.length} de {totalCount} resultados
            </span>
          </label>
        </Card>
      )}

      {totalCount === 0 ? (
        <Card className="text-center">
          <p className="text-slate-500">{emptyMessage}</p>
          <ButtonLink href={`${basePath}/nuevo`} className="mt-4">
            Crear el primero
          </ButtonLink>
        </Card>
      ) : documents.length === 0 ? (
        <Card className="text-center text-slate-500">
          No hay {label}s que coincidan con «{search}».
        </Card>
      ) : (
        <div className="space-y-3">
          {documents.map((doc) => {
            const total = documentTotals(doc).total;
            const rect = isRectificativa(doc);
            const deletable = canDeleteDocument(doc);
            const rectifiable = type === "factura" && canRectifyInvoice(doc);
            const editable =
              doc.status === "borrador" &&
              !doc.rectifiedById &&
              !rect;

            return (
              <Card
                key={doc.id}
                className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-slate-900">{doc.number}</span>
                    {rect && (
                      <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-semibold text-orange-800">
                        Rectificativa
                      </span>
                    )}
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
                  {doc.rectification && (
                    <p className="text-xs text-orange-700">
                      Rectifica: {doc.rectification.originalNumber}
                    </p>
                  )}
                  {doc.rectifiedById && (
                    <p className="text-xs text-slate-400">
                      Tiene factura rectificativa asociada
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => downloadDocumentPdf(doc, data.profile)}
                    className="flex min-h-11 min-w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-700"
                    title="Descargar PDF"
                  >
                    <Download className="h-5 w-5" />
                  </button>
                  {rectifiable && (
                    <Link
                      href={`${basePath}/${doc.id}/rectificar`}
                      className="flex min-h-11 min-w-11 items-center justify-center rounded-xl bg-orange-50 text-orange-700"
                      title="Rectificar factura"
                    >
                      <FileWarning className="h-5 w-5" />
                    </Link>
                  )}
                  {editable && (
                    <Link
                      href={`${basePath}/${doc.id}`}
                      className="flex min-h-11 min-w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-700"
                      title="Editar"
                    >
                      <Pencil className="h-5 w-5" />
                    </Link>
                  )}
                  {deletable && (
                    <button
                      onClick={() => {
                        if (
                          confirm(
                            type === "factura"
                              ? `¿Borrar borrador ${doc.number}?`
                              : `¿Borrar ${doc.number}? Los números posteriores se reordenarán.`,
                          )
                        ) {
                          const ok = deleteDocument(doc.id);
                          if (!ok) {
                            alert(
                              "No se puede borrar. Las facturas emitidas deben rectificarse.",
                            );
                          }
                        }
                      }}
                      className="flex min-h-11 min-w-11 items-center justify-center rounded-xl bg-red-50 text-red-600"
                      title="Borrar"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
