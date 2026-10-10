"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { UserReminderRow } from "@/components/reminders/UserReminderRow";
import { useAppStore } from "@/context/AppStore";
import { useCentralUserReminders } from "@/hooks/useCentralUserReminders";
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
  const { data } = useAppStore();
  const { setReminderCompleted } = useCentralUserReminders();
  const busyRef = useRef(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function complete(id: string) {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusyId(id);
    setError(null);
    try {
      const result = await setReminderCompleted(id, true);
      if (result.ok) markRemindersSeen();
      else setError(result.error);
    } catch {
      setError("No se pudo confirmar el recordatorio. Vuelve a intentarlo.");
    } finally {
      busyRef.current = false;
      setBusyId(null);
    }
  }

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
          <h2
            id="home-reminders-heading"
            className="text-lg font-bold text-slate-900"
          >
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
                void complete(item.id);
              }}
              busy={busyId !== null}
              compact
            />
          </li>
        ))}
      </ul>
      {error && (
        <p role="alert" className="mt-2 text-sm text-red-700">
          {error}
        </p>
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
