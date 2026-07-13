import Image from "next/image";
import {
  ArrowRightLeft,
  CalendarClock,
  Code2,
  FileUp,
  Globe2,
  History,
  Landmark,
  Monitor,
  MousePointer2,
} from "lucide-react";
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

  const visualCopy = (() => {
    switch (mode) {
      case "AEAT_BROWSER_FORM":
        return {
          accessibleLabel: "Formulario web descrito por la AEAT",
          label: "Formulario web",
        };
      case "AEAT_FILE_UPLOAD":
        return {
          accessibleLabel: "Carga de fichero descrita por la AEAT",
          label: "Carga de fichero",
        };
      case "AEAT_WEB_SERVICE":
        return {
          accessibleLabel: "Servicio web descrito por la AEAT",
          label: "Servicio web",
        };
      case "AEAT_ADMINISTRATIVE_TRANSFER":
        return {
          accessibleLabel: "Transferencia administrativa descrita por la AEAT",
          label: "Transferencia administrativa",
        };
      case "AEAT_FORM_AND_FILE":
        return {
          accessibleLabel:
            "Formulario web y carga de fichero descritos por la AEAT",
          label: "Web y fichero",
        };
      case "AEAT_FILE_AND_WEB_SERVICE":
        return {
          accessibleLabel:
            "Carga de fichero y servicio web descritos por la AEAT",
          label: "Fichero y servicio",
        };
      case "AEAT_FORM_AND_WEB_SERVICE":
        return {
          accessibleLabel:
            "Formulario web y servicio web descritos por la AEAT",
          label: "Web y servicio",
        };
      case "AEAT_FORM_FILE_AND_WEB_SERVICE":
        return {
          accessibleLabel:
            "Formulario web, carga de fichero y servicio web descritos por la AEAT",
          label: "Web, fichero y servicio",
        };
      case "AEAT_FUTURE_CHANNEL":
        return {
          accessibleLabel: "Canal futuro descrito por la AEAT",
          label: "Canal previsto",
        };
      case "AEAT_HISTORICAL_PROCEDURE":
        return {
          accessibleLabel: "Procedimiento histórico de la AEAT",
          label: "Histórico AEAT",
        };
      case "AEAT_ELECTRONIC_OFFICE":
        return {
          accessibleLabel:
            "Información del procedimiento en la sede electrónica de la AEAT",
          label: "Procedimiento AEAT",
        };
      default:
        return {
          accessibleLabel: "Información oficial de la AEAT",
          label: "Información AEAT",
        };
    }
  })();

  const iconClassName = compact ? "h-7 w-7" : "h-7 w-7 sm:h-12 sm:w-12";
  const accentIconClassName = `absolute -bottom-1 -right-2 fill-white text-blue-700 dark:fill-slate-900 dark:text-blue-200 ${compact ? "h-3.5 w-3.5" : "h-3.5 w-3.5 sm:h-5 sm:w-5"}`;
  const secondaryAccentIconClassName = `absolute -bottom-1 -left-2 fill-white text-blue-700 dark:fill-slate-900 dark:text-blue-200 ${compact ? "h-3.5 w-3.5" : "h-3.5 w-3.5 sm:h-5 sm:w-5"}`;
  const surfaceClassName =
    mode === "AEAT_HISTORICAL_PROCEDURE"
      ? "from-slate-100 via-white to-slate-200 text-slate-800 dark:from-slate-900 dark:via-slate-950 dark:to-slate-800 dark:text-slate-100"
      : mode === "AEAT_FUTURE_CHANNEL"
        ? "from-amber-50 via-white to-orange-100 text-amber-950 dark:from-amber-950 dark:via-slate-950 dark:to-orange-950 dark:text-amber-100"
        : "from-blue-50 via-white to-sky-100 text-blue-950 dark:from-blue-950 dark:via-slate-900 dark:to-sky-950 dark:text-blue-100";

  return (
    <div className={frameClassName}>
      <div
        role="img"
        aria-label={visualCopy.accessibleLabel}
        className={`relative flex aspect-square w-full flex-col overflow-hidden rounded-[0.6rem] bg-gradient-to-br ${surfaceClassName}`}
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
            {mode === "AEAT_BROWSER_FORM" ||
            mode === "AEAT_ELECTRONIC_OFFICE" ? (
              <>
                <Monitor className={iconClassName} />
                <MousePointer2 className={accentIconClassName} />
              </>
            ) : mode === "AEAT_FILE_UPLOAD" ? (
              <FileUp className={iconClassName} />
            ) : mode === "AEAT_WEB_SERVICE" ? (
              <Code2 className={iconClassName} />
            ) : mode === "AEAT_ADMINISTRATIVE_TRANSFER" ? (
              <>
                <Landmark className={iconClassName} />
                <ArrowRightLeft className={accentIconClassName} />
              </>
            ) : mode === "AEAT_FORM_AND_FILE" ? (
              <>
                <Monitor className={iconClassName} />
                <FileUp className={accentIconClassName} />
              </>
            ) : mode === "AEAT_FILE_AND_WEB_SERVICE" ? (
              <>
                <FileUp className={iconClassName} />
                <Code2 className={accentIconClassName} />
              </>
            ) : mode === "AEAT_FORM_AND_WEB_SERVICE" ? (
              <>
                <Monitor className={iconClassName} />
                <Code2 className={accentIconClassName} />
              </>
            ) : mode === "AEAT_FORM_FILE_AND_WEB_SERVICE" ? (
              <>
                <Monitor className={iconClassName} />
                <FileUp className={secondaryAccentIconClassName} />
                <Code2 className={accentIconClassName} />
              </>
            ) : mode === "AEAT_FUTURE_CHANNEL" ? (
              <CalendarClock className={iconClassName} />
            ) : mode === "AEAT_HISTORICAL_PROCEDURE" ? (
              <History className={iconClassName} />
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
            {visualCopy.label}
          </span>
        </div>
      </div>
    </div>
  );
}
