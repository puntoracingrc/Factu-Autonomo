import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FiscalNotificationIntakeView } from "@/components/fiscal-notifications/FiscalNotificationIntakeView";
import { isConsultorFiscalEnabled } from "@/lib/expense-deductibility/config";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Notificaciones y expedientes",
  description:
    "Revisión local y privada de notificaciones administrativas dentro de Asesoría fiscal.",
  robots: { index: false, follow: false, noarchive: true },
};

export default function FiscalNotificationsPage() {
  if (!isConsultorFiscalEnabled()) notFound();
  return <FiscalNotificationIntakeView />;
}
