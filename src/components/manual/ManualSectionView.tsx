import Link from "next/link";
import { ChevronLeft, ChevronRight, Lightbulb } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { ManualRichText } from "@/components/manual/ManualRichText";
import { ManualScreenshot } from "@/components/manual/ManualScreenshot";
import { FactuManualLogo } from "@/components/manual/FactuManualLogo";
import { ManualReturnBar } from "@/components/manual/ManualReturnBar";
import { buildManualHref } from "@/lib/manual/return-url";
import type { ManualSection } from "@/lib/manual/types";

interface ManualSectionViewProps {
  section: ManualSection;
  previous?: ManualSection;
  next?: ManualSection;
  returnTo?: string | null;
}

export function ManualSectionView({
  section,
  previous,
  next,
  returnTo,
}: ManualSectionViewProps) {
  return (
    <div>
      {returnTo ? (
        <ManualReturnBar returnTo={returnTo} />
      ) : (
        <Link
          href="/ayuda"
          className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-blue-600 underline"
        >
          <FactuManualLogo size="sm" />
          <span className="inline-flex items-center gap-1">
            <ChevronLeft className="h-4 w-4" />
            Manual de usuario
          </span>
        </Link>
      )}

      <header className="mb-6 flex gap-4">
        <FactuManualLogo size="md" />
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-wide text-blue-600">
            Factu · Sección {section.order}
          </p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">{section.title}</h1>
          <p className="mt-2 text-slate-600">{section.summary}</p>
        </div>
      </header>

      {section.intro?.map((paragraph) => (
        <p key={paragraph} className="mb-4 text-slate-700 leading-relaxed">
          {paragraph}
        </p>
      ))}

      <div className="space-y-6">
        {section.steps.map((step) => (
          <Card key={step.title} className="overflow-hidden p-0">
            <div className="border-b border-slate-100 bg-slate-50 px-5 py-4">
              <h2 className="text-lg font-bold text-slate-900">{step.title}</h2>
            </div>
            <div className="space-y-3 px-5 py-5 text-sm leading-relaxed text-slate-700">
              {step.paragraphs.map((paragraph) => (
                <ManualRichText key={paragraph} text={paragraph} />
              ))}

              {step.screenshot && (
                <ManualScreenshot screenshot={step.screenshot} />
              )}

              {step.tip && (
                <div className="flex gap-3 rounded-xl bg-amber-50 px-4 py-3 text-amber-950">
                  <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                  <p className="text-sm">
                    <span className="font-semibold">Consejo: </span>
                    {step.tip}
                  </p>
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>

      <nav className="mt-8 grid gap-3 sm:grid-cols-2">
        {previous ? (
          <Link
            href={buildManualHref(`/ayuda/${previous.slug}`, returnTo)}
            className="rounded-2xl border border-slate-200 bg-white p-4 transition-colors hover:bg-slate-50"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Anterior
            </p>
            <p className="mt-1 flex items-center gap-1 font-semibold text-slate-900">
              <ChevronLeft className="h-4 w-4" />
              {previous.title}
            </p>
          </Link>
        ) : (
          <div />
        )}
        {next && (
          <Link
            href={buildManualHref(`/ayuda/${next.slug}`, returnTo)}
            className="rounded-2xl border border-slate-200 bg-white p-4 text-right transition-colors hover:bg-slate-50 sm:col-start-2"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Siguiente
            </p>
            <p className="mt-1 flex items-center justify-end gap-1 font-semibold text-slate-900">
              {next.title}
              <ChevronRight className="h-4 w-4" />
            </p>
          </Link>
        )}
      </nav>
    </div>
  );
}
