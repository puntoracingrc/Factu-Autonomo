"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { UserReminderRow } from "@/components/reminders/UserReminderRow";
import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useAppStore } from "@/context/AppStore";
import {
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

  const visible = pending.slice(0, HOME_REMINDER_LIMIT);
  const hiddenCount = pending.length - visible.length;

  return (
    <section className="mb-6" aria-labelledby="home-reminders-heading">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 id="home-reminders-heading" className="text-lg font-bold text-slate-900">
          Mis recordatorios
        </h2>
        <Link
          href="/avisos"
          className="text-sm font-semibold text-violet-700 underline"
        >
          {pending.length > 0 ? "Gestionar" : "Añadir"}
        </Link>
      </div>

      {pending.length === 0 ? (
        <Card className="border-violet-100 bg-violet-50/40 p-4">
          <p className="text-sm text-slate-700">
            Apunta aquí lo que solo tú sabes: facturar a alguien, rectificar, llamar…
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
                onComplete={() => completeUserReminder(item.id)}
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
