import Image from "next/image";
import { Globe2, Landmark, Monitor, MousePointer2 } from "lucide-react";
import type { PublicAeatOfficialModelContentV1 } from "@/lib/fiscal-models/model-pages/official-content";
import { resolveFiscalModelOfficialVisualMode } from "./fiscal-model-official-visual";

export function FiscalModelOfficialVisual({
  content,
  variant,
}: {
  content: PublicAeatOfficialModelContentV1;
  variant: "catalog" | "detail";
}) {
  const mode = resolveFiscalModelOfficialVisualMode(content);
  const compact = variant === "catalog";
  const frameClassName = compact
    ? "w-full overflow-hidden rounded-xl border border-slate-200 bg-white p-1 dark:border-slate-700 dark:bg-slate-950"
    : "w-24 shrink-0 overflow-hidden rounded-2xl border border-slate-200 bg-white p-1 shadow-sm sm:w-40 dark:border-slate-700 dark:bg-slate-950";

  if (mode === "OFFICIAL_DOCUMENT_PREVIEW" && content.thumbnail) {
    return (
      <div className={frameClassName}>
        <Image
          src={content.thumbnail.publicHref}
          alt={compact ? "" : content.thumbnail.alt}
          width={content.thumbnail.width}
          height={content.thumbnail.height}
          className="aspect-square h-auto w-full object-cover object-top"
          priority={!compact}
          sizes={compact ? "88px" : "(min-width: 640px) 160px, 96px"}
        />
      </div>
    );
  }

  const electronicOffice = mode === "AEAT_ELECTRONIC_OFFICE";
  const accessibleLabel = electronicOffice
    ? "Información del procedimiento en la sede electrónica de la AEAT"
    : "Información oficial de la AEAT";

  return (
    <div className={frameClassName}>
      <div
        role="img"
        aria-label={accessibleLabel}
        className="relative flex aspect-square w-full flex-col overflow-hidden rounded-[0.6rem] bg-gradient-to-br from-blue-50 via-white to-sky-100 text-blue-950 dark:from-blue-950 dark:via-slate-900 dark:to-sky-950 dark:text-blue-100"
      >
        <div
          className={`flex items-center gap-1 border-b border-blue-200/80 bg-white/80 dark:border-blue-800 dark:bg-slate-950/70 ${compact ? "h-4 px-1.5" : "h-4 px-1.5 sm:h-7 sm:px-2.5"}`}
          aria-hidden="true"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
          <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
        </div>
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center text-center">
          <div className="relative" aria-hidden="true">
            {electronicOffice ? (
              <>
                <Monitor
                  className={compact ? "h-7 w-7" : "h-7 w-7 sm:h-12 sm:w-12"}
                />
                <MousePointer2
                  className={`absolute -bottom-1 -right-2 fill-white text-blue-700 dark:fill-slate-900 dark:text-blue-200 ${compact ? "h-3.5 w-3.5" : "h-3.5 w-3.5 sm:h-5 sm:w-5"}`}
                />
              </>
            ) : (
              <div className="relative">
                <Landmark
                  className={compact ? "h-7 w-7" : "h-7 w-7 sm:h-12 sm:w-12"}
                />
                <Globe2
                  className={`absolute -bottom-1 -right-2 rounded-full bg-white text-blue-700 dark:bg-slate-900 dark:text-blue-200 ${compact ? "h-3.5 w-3.5" : "h-3.5 w-3.5 sm:h-5 sm:w-5"}`}
                />
              </div>
            )}
          </div>
          <span
            aria-hidden="true"
            className={`font-black uppercase tracking-wide ${compact ? "mt-2 px-1 text-[0.56rem] leading-3" : "mt-2 px-1 text-[0.56rem] leading-3 sm:mt-3 sm:px-3 sm:text-xs sm:leading-4"}`}
          >
            {electronicOffice ? "Procedimiento AEAT" : "Información AEAT"}
          </span>
        </div>
      </div>
    </div>
  );
}
