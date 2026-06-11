import Link from "next/link";
import { BookOpen, ChevronRight } from "lucide-react";
import { Card, PageHeader } from "@/components/ui/Card";
import { manualSections } from "@/lib/manual/sections";

export default function AyudaPage() {
  return (
    <div>
      <PageHeader
        title="Manual de usuario"
        subtitle="Guía paso a paso de Factura Autónomo, sección por sección"
      />

      <Card className="mb-6 border-violet-200 bg-violet-50/60">
        <div className="flex gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
            <BookOpen className="h-5 w-5" />
          </div>
          <div className="text-sm text-violet-950">
            <p className="font-semibold">Cómo usar este manual</p>
            <p className="mt-1 leading-relaxed text-violet-900/90">
              Empieza por <strong>Primeros pasos</strong> si es tu primera vez.
              Cada sección tiene pasos numerados y espacio para capturas de
              pantalla. Si una imagen aún no está, verás un recuadro «Captura
              pendiente» con la ruta del archivo.
            </p>
          </div>
        </div>
      </Card>

      <div className="space-y-3">
        {manualSections.map((section) => (
          <Link key={section.slug} href={`/ayuda/${section.slug}`}>
            <Card className="flex items-center justify-between gap-4 transition-colors hover:bg-slate-50">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-500">
                  Sección {section.order}
                </p>
                <p className="font-bold text-slate-900">{section.title}</p>
                <p className="mt-1 text-sm text-slate-600">{section.summary}</p>
                <p className="mt-2 text-xs text-slate-400">
                  {section.steps.length} paso
                  {section.steps.length === 1 ? "" : "s"}
                </p>
              </div>
              <ChevronRight className="h-5 w-5 shrink-0 text-slate-400" />
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
