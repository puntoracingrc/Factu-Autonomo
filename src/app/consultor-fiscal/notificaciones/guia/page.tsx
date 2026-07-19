import type { Metadata } from "next";
import { FiscalNotificationGuideView } from "@/components/fiscal-notifications/FiscalNotificationGuideView";
import { resolveFiscalNotificationGuideSelectionV1 } from "@/lib/fiscal-notifications/guide/catalog.v1";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Guía de notificaciones y expedientes",
  description:
    "Guía local de tipos de notificaciones administrativas que puede explicar el lector documental.",
  robots: { index: false, follow: false, noarchive: true },
};

interface FiscalNotificationGuidePageProps {
  readonly searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function FiscalNotificationGuidePage({
  searchParams,
}: FiscalNotificationGuidePageProps) {
  const resolvedSearchParams = await searchParams;
  const requestedGuideFamily = resolvedSearchParams.guia;
  const guideSelection =
    resolveFiscalNotificationGuideSelectionV1(requestedGuideFamily);

  return (
    <section id="guia-notificaciones" aria-label="Guía de notificaciones">
      <FiscalNotificationGuideView selection={guideSelection} />
    </section>
  );
}
