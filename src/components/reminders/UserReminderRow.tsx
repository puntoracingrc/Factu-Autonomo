"use client";

import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { Card } from "@/components/ui/Card";
import {
  isReminderOverdue,
  reminderDueLabel,
} from "@/lib/user-reminders";
import type { UserReminder } from "@/lib/types";

interface UserReminderRowProps {
  reminder: UserReminder;
  href?: string;
  onComplete: () => void;
  compact?: boolean;
}

export function UserReminderRow({
  reminder,
  href,
  onComplete,
  compact = false,
}: UserReminderRowProps) {
  const overdue = isReminderOverdue(reminder);
  const dueLabel = reminderDueLabel(reminder);

  return (
    <Card
      className={`${compact ? "p-3" : "p-4"} ${
        overdue ? "border-amber-300 bg-amber-50" : "border-violet-200 bg-violet-50/50"
      }`}
    >
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={onComplete}
          className={`${compact ? "h-6 w-6" : "h-7 w-7"} mt-0.5 flex shrink-0 items-center justify-center rounded-lg border-2 border-violet-400 bg-white text-violet-700 transition hover:bg-violet-100`}
          title="Marcar como hecho"
          aria-label="Marcar recordatorio como hecho"
        >
          <Check className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />
        </button>
        <div className="min-w-0 flex-1">
          <p className={`font-semibold text-slate-900 ${compact ? "text-sm" : ""}`}>
            {reminder.text}
          </p>
          {dueLabel ? (
            <p
              className={`mt-0.5 ${compact ? "text-xs" : "text-sm"} ${overdue ? "font-medium text-amber-800" : "text-slate-600"}`}
            >
              {overdue ? "Vencido · " : "Para · "}
              {dueLabel}
            </p>
          ) : null}
        </div>
        {href ? (
          <Link
            href={href}
            className={`inline-flex shrink-0 items-center gap-1 rounded-xl bg-white font-semibold text-slate-900 ring-1 ring-slate-200 ${
              compact ? "px-2.5 py-1.5 text-xs" : "px-3 py-2 text-sm"
            }`}
          >
            Ir
            <ArrowRight className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />
          </Link>
        ) : null}
      </div>
    </Card>
  );
}
