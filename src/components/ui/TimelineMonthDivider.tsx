interface TimelineMonthDividerProps {
  label: string;
}

export function TimelineMonthDivider({ label }: TimelineMonthDividerProps) {
  return (
    <div
      className="sticky top-2 z-10 flex min-w-0 items-center gap-3 py-2 sm:gap-4 sm:py-3"
      role="separator"
      aria-label={`Inicio del grupo: ${label}`}
    >
      <span
        className="min-w-0 max-w-full truncate rounded-xl border border-blue-300 bg-blue-100/95 px-4 py-1.5 text-sm font-black uppercase tracking-wide text-blue-900 shadow-sm backdrop-blur dark:border-blue-700 dark:bg-blue-950/95 dark:text-blue-100"
        title={label}
      >
        {label}
      </span>
      <span
        className="h-0.5 min-w-6 flex-1 rounded-full bg-blue-300 dark:bg-blue-700"
        aria-hidden
      />
    </div>
  );
}
