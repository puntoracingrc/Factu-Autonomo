"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { useAppStore } from "@/context/AppStore";
import { useAppRecommendations } from "@/hooks/useAppRecommendations";
import { formatShortDate } from "@/lib/calculations";
import { deriveDocumentLifecycle } from "@/lib/document-integrity";
import { sortDocumentsByNewest } from "@/lib/documents";
import {
  HOME_CREATE_ACTIONS,
  HOME_REVIEW_ACTIONS,
} from "@/lib/product-home-actions";
import type { Document } from "@/lib/types";

/** Un consejo de Factu en Inicio para descubrir funciones de la app. */
export function HomeFactuTip() {
  const { data } = useAppStore();
  const { factuTips } = useAppRecommendations();
  const tip = factuTips[0];
  const recentDocuments = sortDocumentsByNewest(data.documents).slice(0, 3);

  const metrics = [
    { label: "Clientes", value: data.customers.length },
    {
      label: "Presupuestos",
      value: data.documents.filter((doc) => doc.type === "presupuesto").length,
    },
    {
      label: "Facturas",
      value: data.documents.filter((doc) => doc.type === "factura").length,
    },
    {
      label: "Emitidas",
      value: data.documents.filter(
        (doc) =>
          doc.type === "factura" && deriveDocumentLifecycle(doc) === "issued",
      ).length,
    },
    {
      label: "Borradores",
      value: data.documents.filter(
        (doc) => deriveDocumentLifecycle(doc) === "draft",
      ).length,
    },
  ];

  return (
    <section className="mb-6 space-y-4" aria-label="Resumen de inicio">
      <Card className="space-y-4 p-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {metrics.map((item) => (
            <div key={item.label} className="rounded-xl bg-slate-50 p-3">
              <p className="text-2xl font-bold text-slate-900">{item.value}</p>
              <p className="text-xs font-semibold text-slate-500">
                {item.label}
              </p>
            </div>
          ))}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <p className="mb-2 text-sm font-bold text-slate-900">Crear</p>
            <div className="flex flex-wrap gap-2">
              {HOME_CREATE_ACTIONS.map((action) => (
                <Link
                  key={action.href}
                  href={action.href}
                  className="rounded-xl bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100"
                >
                  {action.label}
                </Link>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-2 text-sm font-bold text-slate-900">Revisar</p>
            <div className="flex flex-wrap gap-2">
              {HOME_REVIEW_ACTIONS.slice(0, 3).map((action) => (
                <Link
                  key={action.href}
                  href={action.href}
                  className="rounded-xl bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200"
                >
                  {action.label}
                </Link>
              ))}
            </div>
          </div>
        </div>

        {recentDocuments.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-bold text-slate-900">
              Últimos documentos
            </p>
            {recentDocuments.map((doc) => (
              <Link
                key={doc.id}
                href={documentHref(doc)}
                className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2 hover:bg-slate-100"
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-slate-900">
                    {doc.number}
                  </span>
                  <span className="block truncate text-xs text-slate-500">
                    {DOCUMENT_TYPE_LABELS[doc.type]} · {doc.client.name}
                  </span>
                </span>
                <span className="shrink-0 text-xs font-medium text-slate-500">
                  {formatShortDate(doc.date)}
                </span>
              </Link>
            ))}
          </div>
        )}
      </Card>

      {tip && (
        <Link
          href={tip.href ?? "/avisos"}
          className="block rounded-2xl border border-violet-200 bg-gradient-to-r from-violet-50 to-white p-4 transition hover:border-violet-300 hover:shadow-sm"
        >
          <div className="flex items-start gap-3">
            <span className="text-2xl" aria-hidden>
              🤖
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold uppercase tracking-wide text-violet-700">
                Factu te sugiere
              </p>
              <p className="mt-0.5 text-sm font-semibold text-slate-900">
                {tip.title}
              </p>
              <p className="mt-1 line-clamp-2 text-sm text-slate-600">
                {tip.message}
              </p>
            </div>
            <span className="inline-flex shrink-0 items-center gap-1 self-center text-sm font-semibold text-violet-700">
              Ver
              <ArrowRight className="h-4 w-4" />
            </span>
          </div>
        </Link>
      )}
    </section>
  );
}

const DOCUMENT_TYPE_LABELS: Record<Document["type"], string> = {
  factura: "Factura",
  presupuesto: "Presupuesto",
  recibo: "Recibo",
};

function documentHref(doc: Document): string {
  if (doc.type === "factura") return `/facturas/${doc.id}`;
  if (doc.type === "presupuesto") return `/presupuestos/${doc.id}`;
  return `/recibos/${doc.id}`;
}
