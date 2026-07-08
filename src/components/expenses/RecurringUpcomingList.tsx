"use client";

import { CalendarDays } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { formatMoney, formatShortDate, todayISO } from "@/lib/calculations";
import {
  collectRecurringOccurrencePreviews,
  dueSoonLabel,
  RECURRING_PREVIEW_HORIZON_DAYS,
  recurringExpenseTotals,
} from "@/lib/recurring-expenses";
import type { AppData } from "@/lib/types";
import { isVatExempt } from "@/lib/vat-regime";

interface RecurringUpcomingListProps {
  data: AppData;
  limit?: number;
}

export function RecurringUpcomingList({
  data,
  limit = 12,
}: RecurringUpcomingListProps) {
  const vatExempt = isVatExempt(data.profile);
  const previews = collectRecurringOccurrencePreviews(
    data,
    todayISO(),
    RECURRING_PREVIEW_HORIZON_DAYS,
  ).filter((item) => !item.generated);

  if (previews.length === 0) return null;

  return (
    <Card className="mb-6 space-y-3 border-violet-200 bg-violet-50/50">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
          <CalendarDays className="h-5 w-5" />
        </div>
        <div>
          <h2 className="font-bold text-slate-900">Próximos cargos</h2>
          <p className="mt-0.5 text-sm text-slate-600">
            Previstos en los próximos {RECURRING_PREVIEW_HORIZON_DAYS} días. Se
            registrarán solos en Gastos en la fecha indicada.
          </p>
        </div>
      </div>

      <ul className="divide-y divide-violet-100 rounded-xl border border-violet-100 bg-white">
        {previews.slice(0, limit).map((item) => {
          const totals = recurringExpenseTotals(item, vatExempt);
          const hasIva = totals.ivaPercent > 0;
          return (
            <li
              key={`${item.templateId}-${item.date}`}
              className="flex items-start justify-between gap-3 px-4 py-3"
            >
              <div className="min-w-0">
                <p className="font-semibold text-slate-900">
                  {item.description}
                </p>
                <p className="text-sm text-slate-500">{item.supplierName}</p>
                <p className="mt-1 text-xs font-medium text-violet-700">
                  {formatShortDate(item.date)} · {dueSoonLabel(item.daysUntil)}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="font-bold text-red-700">
                  {formatMoney(totals.total)}
                </p>
                {hasIva && (
                  <p className="text-xs font-medium text-slate-500">
                    IVA incl.
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {previews.length > limit && (
        <p className="text-center text-xs text-slate-500">
          +{previews.length - limit} cargos más en el calendario
        </p>
      )}
    </Card>
  );
}
