import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FiscalCalendarView } from "@/components/fiscal-calendar/FiscalCalendarView";
import {
  AEAT_FISCAL_CALENDAR_OFFICIAL_SOURCE,
  fiscalCalendarCategoryOptions,
} from "@/lib/fiscal-calendar/catalog";
import { isFiscalCalendarEnabled } from "@/lib/fiscal-calendar/config";
import { defaultFiscalCalendarRange } from "@/lib/fiscal-calendar/dates";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Calendario fiscal",
  description:
    "Estructura informativa de próximos vencimientos generales de la Agencia Tributaria.",
  robots: { index: false, follow: false },
};

export default function FiscalCalendarPage() {
  if (!isFiscalCalendarEnabled()) notFound();

  const range = defaultFiscalCalendarRange();
  return (
    <FiscalCalendarView
      initialStartDate={range.startDate}
      initialEndDateInclusive={range.endDateInclusive}
      categoryOptions={fiscalCalendarCategoryOptions()}
      officialSource={AEAT_FISCAL_CALENDAR_OFFICIAL_SOURCE}
    />
  );
}
