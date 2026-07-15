"use client";

import { List, UserCheck } from "lucide-react";

export type AdvisoryScope = "MINE" | "ALL";

const focusRing =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500";

export function AdvisoryScopeToggle({
  value,
  onChange,
  groupLabel,
  mineLabel,
  mineCount,
  allCount,
  mineDisabled = false,
}: {
  value: AdvisoryScope;
  onChange: (value: AdvisoryScope) => void;
  groupLabel: string;
  mineLabel: string;
  mineCount: number;
  allCount: number;
  mineDisabled?: boolean;
}) {
  return (
    <div
      className="grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800"
      role="group"
      aria-label={groupLabel}
    >
      <button
        type="button"
        aria-pressed={value === "MINE"}
        aria-disabled={mineDisabled}
        disabled={mineDisabled}
        onClick={() => onChange("MINE")}
        className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-3 text-sm font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-55 ${
          value === "MINE"
            ? "bg-white text-blue-800 shadow-sm dark:bg-slate-950 dark:text-blue-200"
            : "text-slate-600 hover:bg-white/70 dark:text-slate-300 dark:hover:bg-slate-900"
        } ${focusRing}`}
      >
        <UserCheck className="h-4 w-4" aria-hidden="true" />
        <span>{mineLabel}</span>
        <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-900 dark:bg-blue-950 dark:text-blue-100">
          {mineCount}
        </span>
      </button>
      <button
        type="button"
        aria-pressed={value === "ALL"}
        onClick={() => onChange("ALL")}
        className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-3 text-sm font-bold transition-colors ${
          value === "ALL"
            ? "bg-white text-blue-800 shadow-sm dark:bg-slate-950 dark:text-blue-200"
            : "text-slate-600 hover:bg-white/70 dark:text-slate-300 dark:hover:bg-slate-900"
        } ${focusRing}`}
      >
        <List className="h-4 w-4" aria-hidden="true" />
        <span>Todos</span>
        <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs text-slate-800 dark:bg-slate-700 dark:text-slate-100">
          {allCount}
        </span>
      </button>
    </div>
  );
}
