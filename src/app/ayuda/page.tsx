import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { FactuManualLogo } from "@/components/manual/FactuManualLogo";
import { ManualPageHeader } from "@/components/manual/ManualPageHeader";
import { ManualReturnBar } from "@/components/manual/ManualReturnBar";
import { Card } from "@/components/ui/Card";
import { manualSections } from "@/lib/manual/sections";
import { buildManualHref, sanitizeReturnPath } from "@/lib/manual/return-url";

interface AyudaPageProps {
  searchParams: Promise<{ from?: string }>;
}

export default async function AyudaPage({ searchParams }: AyudaPageProps) {
  const returnTo = sanitizeReturnPath((await searchParams).from);

  return (
    <div>
      {returnTo && <ManualReturnBar returnTo={returnTo} showManualIndexLink={false} />}

      <ManualPageHeader
        title="Manual de usuario"
        subtitle="Guía paso a paso de Factura Autónomo, sección por sección"
      />

      <Card className="mb-6 border-violet-200 bg-violet-50/60">
        <div className="flex gap-3">
          <FactuManualLogo size="sm" />
          <div className="text-sm text-violet-950">
            <p className="font-semibold">Cómo usar este manual</p>
            <p className="mt-1 leading-relaxed text-violet-900/90">
              Empieza por <strong>Primeros pasos</strong> si es tu primera vez.
              Cada sección tiene pasos numerados y capturas de pantalla.
            </p>
          </div>
        </div>
      </Card>

      <div className="space-y-3">
        {manualSections.map((section) => (
          <Link
            key={section.slug}
            href={buildManualHref(`/ayuda/${section.slug}`, returnTo)}
          >
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
