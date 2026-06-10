"use client";

import Link from "next/link";
import { CalendarClock } from "lucide-react";
import { useBilling } from "@/context/BillingContext";
import {
  shouldShowDeadlineReminder,
  upcomingIvaDeadline,
} from "@/lib/billing/tax-deadlines";

export function TaxDeadlineBanner() {
  const { limits } = useBilling();
  const upcoming = upcomingIvaDeadline();

  if (!upcoming || !shouldShowDeadlineReminder(upcoming.daysLeft)) {
    return null;
  }

  const urgent = upcoming.daysLeft <= 7;
  const dueText = upcoming.dueDate.toLocaleDateString("es-ES", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div
      className={`mb-4 flex items-start gap-3 rounded-xl border px-4 py-3 text-sm ${
        urgent
          ? "border-amber-300 bg-amber-50 text-amber-950"
          : "border-sky-200 bg-sky-50 text-sky-950"
      }`}
    >
      <CalendarClock className="mt-0.5 h-5 w-5 shrink-0" />
      <div>
        <p className="font-semibold">
          Plazo IVA trimestral ({upcoming.label})
        </p>
        <p className="mt-0.5">
          Presentación orientativa hasta el <strong>{dueText}</strong> — te
          quedan <strong>{upcoming.daysLeft} día(s)</strong>.
        </p>
        {!limits.quarterlyExport && (
          <p className="mt-1">
            Con Pro puedes exportar el trimestre en CSV para tu gestor.{" "}
            <Link href="/precios" className="font-semibold underline">
              Ver planes
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
