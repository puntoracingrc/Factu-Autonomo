interface TimelineMonthDividerProps {
  label: string;
}

export function TimelineMonthDivider({ label }: TimelineMonthDividerProps) {
  return (
    <div className="sticky top-2 z-10 flex items-center gap-3 py-1">
      <span className="rounded-full border border-slate-200 bg-white/95 px-3 py-1 text-xs font-bold uppercase tracking-wide text-slate-500 shadow-sm backdrop-blur">
        {label}
      </span>
      <span className="h-px flex-1 bg-slate-200" aria-hidden />
    </div>
  );
}
