"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import { UserReminderRow } from "@/components/reminders/UserReminderRow";
import { useAppStore } from "@/context/AppStore";
import {
  countUnseenOfficeReminders,
  markRemindersSeen,
} from "@/lib/reminder-team";
import {
  pendingOfficeReminders,
  pendingUserReminders,
  resolveReminderHref,
} from "@/lib/user-reminders";

const HOME_REMINDER_LIMIT = 5;

export function HomeUserReminders() {
  const { data, completeUserReminder } = useAppStore();

  const pending = useMemo(
    () => pendingUserReminders(data.userReminders),
    [data.userReminders],
  );
  const officePending = useMemo(
    () => pendingOfficeReminders(data.userReminders),
    [data.userReminders],
  );
  const unseenOffice = useMemo(
    () => countUnseenOfficeReminders(data.userReminders),
    [data.userReminders],
  );

  const visible = pending.slice(0, HOME_REMINDER_LIMIT);
  const hiddenCount = pending.length - visible.length;

  useEffect(() => {
    if (unseenOffice === 0) return;
    const timer = window.setTimeout(() => markRemindersSeen(), 8000);
    return () => window.clearTimeout(timer);
  }, [unseenOffice]);

  if (pending.length === 0) return null;

  return (
    <section className="mb-6" aria-labelledby="home-reminders-heading">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h2 id="home-reminders-heading" className="text-lg font-bold text-slate-900">
            Recordatorios del equipo
          </h2>
          {unseenOffice > 0 ? (
            <p className="text-sm font-medium text-sky-700">
              {unseenOffice} nuevo(s) para oficina
            </p>
          ) : null}
        </div>
        <Link
          href="/avisos"
          className="text-sm font-semibold text-violet-700 underline"
        >
          Gestionar
        </Link>
      </div>

      {officePending.length > 0 ? (
        <p className="mb-2 text-sm text-slate-600">
          {officePending.length} tarea(s) enviada(s) desde otro dispositivo
        </p>
      ) : null}

      <ul className="space-y-2">
        {visible.map((item) => (
          <li key={item.id}>
            <UserReminderRow
              reminder={item}
              href={resolveReminderHref(data, item.link)}
              onComplete={() => {
                completeUserReminder(item.id);
                markRemindersSeen();
              }}
              compact
            />
          </li>
        ))}
      </ul>

      {hiddenCount > 0 ? (
        <Link
          href="/avisos"
          className="mt-2 inline-block text-sm font-semibold text-violet-700 underline"
        >
          Ver {hiddenCount} más en Avisos
        </Link>
      ) : null}
    </section>
  );
}
