"use client";

import Link from "next/link";
import { Bell } from "lucide-react";
import { formatMoney, formatShortDate } from "@/lib/calculations";
import {
  dueSoonLabel,
  getDueSoonRecurringAlerts,
} from "@/lib/recurring-expenses";
import type { AppData } from "@/lib/types";

interface RecurringDueBannerProps {
  data: AppData;
  referenceDate?: string;
}

export function RecurringDueBanner({
  data,
  referenceDate,
}: RecurringDueBannerProps) {
  const alerts = getDueSoonRecurringAlerts(data, referenceDate ?? today());
  if (alerts.length === 0) return null;

  const urgent = alerts.some((item) => item.daysUntil <= 1);

  return (
    <div
      className={`mb-4 rounded-xl border px-4 py-3 text-sm ${
        urgent
          ? "border-amber-300 bg-amber-50 text-amber-950"
          : "border-violet-200 bg-violet-50 text-violet-950"
      }`}
    >
      <div className="flex items-start gap-3">
        <Bell className="mt-0.5 h-5 w-5 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="font-semibold">Gastos fijos próximos</p>
          <ul className="mt-2 space-y-1.5">
            {alerts.slice(0, 4).map((item) => (
              <li key={`${item.templateId}-${item.date}`}>
                <strong>{item.description}</strong> ({item.supplierName}) —{" "}
                {formatMoney(item.amount)} · {formatShortDate(item.date)} ·{" "}
                {dueSoonLabel(item.daysUntil)}
              </li>
            ))}
          </ul>
          {alerts.length > 4 && (
            <p className="mt-1 text-xs opacity-80">
              y {alerts.length - 4} más en los próximos días
            </p>
          )}
          <Link
            href="/gastos/fijos"
            className="mt-2 inline-block font-semibold underline"
          >
            Ver gastos fijos y calendario
          </Link>
        </div>
      </div>
    </div>
  );
}

function today(): string {
  return new Date().toISOString().split("T")[0];
}
