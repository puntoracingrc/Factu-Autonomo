import type { Metadata } from "next";
import { FiscalNotificationIntakeView } from "@/components/fiscal-notifications/FiscalNotificationIntakeView";
import { FiscalNotificationGuideView } from "@/components/fiscal-notifications/FiscalNotificationGuideView";
import { resolveFiscalNotificationGuideSelectionV1 } from "@/lib/fiscal-notifications/guide/catalog.v1";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Notificaciones y expedientes",
  description:
    "Revisión local y privada de notificaciones administrativas dentro de Asesoría fiscal.",
  robots: { index: false, follow: false, noarchive: true },
};

interface FiscalNotificationsPageProps {
  readonly searchParams: Promise<
    Record<string, string | string[] | undefined>
  >;
}

function FiscalNotificationAnalyzerSection() {
  return <FiscalNotificationIntakeView />;
}

export default async function FiscalNotificationsPage({
  searchParams,
}: FiscalNotificationsPageProps) {
  const requestedGuideFamily = (await searchParams).guia;
  const guideSelection = resolveFiscalNotificationGuideSelectionV1(
    requestedGuideFamily,
  );

  return (
    <>
      <nav
        aria-label="Herramientas de Notificaciones y expedientes"
        className="mx-auto mb-2 grid w-full max-w-6xl gap-3 px-4 sm:grid-cols-2 sm:px-6"
      >
        <a
          href="#analizar-documento"
          className="inline-flex min-h-12 items-center justify-center rounded-2xl border-2 border-blue-200 bg-white px-4 text-center font-semibold text-blue-800 transition-colors hover:bg-blue-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
        >
          Analizar documento
        </a>
        <a
          href="#guia-notificaciones"
          className="inline-flex min-h-12 items-center justify-center rounded-2xl border-2 border-blue-200 bg-white px-4 text-center font-semibold text-blue-800 transition-colors hover:bg-blue-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
        >
          Guía de notificaciones
        </a>
      </nav>

      <section id="analizar-documento" className="scroll-mt-6" aria-label="Analizar documento">
        <FiscalNotificationAnalyzerSection />
      </section>

      <section id="guia-notificaciones" className="scroll-mt-6" aria-label="Guía de notificaciones">
        <FiscalNotificationGuideView selection={guideSelection} />
      </section>
    </>
  );
}
