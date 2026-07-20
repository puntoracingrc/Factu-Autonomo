import type { ReactNode } from "react";
import {
  CalendarDays,
  CheckCircle2,
  Cloud,
  Clock3,
  FileSearch,
  Landmark,
  Link2,
} from "lucide-react";

export function FiscalNotificationFamilyLabel({
  children,
}: {
  readonly children: ReactNode;
}) {
  return (
    <span className="inline-flex min-h-6 items-center rounded bg-blue-50 px-2 py-1 text-[11px] font-bold uppercase text-blue-700">
      {children}
    </span>
  );
}

export function FiscalNotificationAuthorityLabel({
  children,
  compact = false,
}: {
  readonly children: ReactNode;
  readonly compact?: boolean;
}) {
  return (
    <span
      className={`inline-flex min-w-0 items-center gap-1.5 font-semibold text-slate-700 ${compact ? "text-xs" : "text-sm"}`}
    >
      <Landmark
        aria-hidden="true"
        className={`shrink-0 text-slate-500 ${compact ? "h-3.5 w-3.5" : "h-4 w-4"}`}
      />
      <span className="truncate">{children}</span>
    </span>
  );
}

export function FiscalNotificationDateLabel({
  children,
  pending = false,
  compact = false,
}: {
  readonly children: ReactNode;
  readonly pending?: boolean;
  readonly compact?: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 font-bold ${
        pending ? "text-slate-500" : "text-slate-700"
      } ${compact ? "text-xs" : "text-sm"}`}
    >
      <CalendarDays
        aria-hidden="true"
        className={`shrink-0 ${pending ? "text-slate-400" : "text-blue-600"} ${compact ? "h-3.5 w-3.5" : "h-4 w-4"}`}
      />
      {children}
    </span>
  );
}

export function FiscalNotificationReviewStatus({
  status,
  label,
  compact = false,
}: {
  readonly status: "PENDING" | "REVIEWED";
  readonly label: ReactNode;
  readonly compact?: boolean;
}) {
  const reviewed = status === "REVIEWED";
  const Icon = reviewed ? CheckCircle2 : Clock3;
  return (
    <span
      className={`inline-flex items-center gap-1.5 font-semibold ${
        reviewed ? "text-emerald-700" : "text-amber-800"
      } ${compact ? "text-[11px]" : "text-xs"}`}
    >
      <Icon aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
      {label}
    </span>
  );
}

export function FiscalNotificationOriginalStatus({
  status,
  label,
  compact = false,
}: {
  readonly status: "DRIVE" | "UNAVAILABLE";
  readonly label: ReactNode;
  readonly compact?: boolean;
}) {
  const available = status === "DRIVE";
  const Icon = available ? Cloud : FileSearch;
  return (
    <span
      className={`inline-flex items-center gap-1.5 font-semibold ${
        available ? "text-emerald-700" : "text-slate-500"
      } ${compact ? "text-[11px]" : "text-xs"}`}
    >
      <Icon aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
      {label}
    </span>
  );
}

export function FiscalNotificationRelationStatus({
  status,
  label,
  compact = false,
}: {
  readonly status: "CONFIRMED" | "SUGGESTED";
  readonly label: ReactNode;
  readonly compact?: boolean;
}) {
  const confirmed = status === "CONFIRMED";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded px-2 py-1 font-bold ${
        confirmed
          ? "bg-emerald-50 text-emerald-800"
          : "border border-dashed border-amber-300 bg-amber-50 text-amber-900"
      } ${compact ? "text-[10px]" : "text-xs"}`}
    >
      <Link2 aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
      {label}
    </span>
  );
}
