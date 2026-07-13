import type { Metadata } from "next";
import { FiscalNotificationIntakeView } from "@/components/fiscal-notifications/FiscalNotificationIntakeView";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Notificaciones y expedientes",
  description:
    "Revisión local y privada de notificaciones administrativas dentro de Asesoría fiscal.",
  robots: { index: false, follow: false, noarchive: true },
};

export default function FiscalNotificationsPage() {
  return <FiscalNotificationIntakeView />;
}
