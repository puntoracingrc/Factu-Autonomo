"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { UserReminderRow } from "@/components/reminders/UserReminderRow";
import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
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
        {pending.length > 0 ? (
          <Link
            href="/avisos"
            className="text-sm font-semibold text-violet-700 underline"
          >
            Gestionar
          </Link>
        ) : null}
      </div>

      {officePending.length > 0 ? (
        <p className="mb-2 text-sm text-slate-600">
          {officePending.length} tarea(s) enviada(s) desde otro dispositivo
        </p>
      ) : null}

      {pending.length === 0 ? (
        <Card className="border-violet-100 bg-violet-50/40 p-4">
          <p className="text-sm text-slate-700">
            Apunta instrucciones para la oficina o para ti: facturas, llamadas,
            rectificaciones…
          </p>
          <ButtonLink href="/avisos" variant="secondary" className="mt-3 min-h-10 text-sm">
            <Plus className="h-4 w-4" />
            Crear recordatorio
          </ButtonLink>
        </Card>
      ) : (
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
      )}

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
