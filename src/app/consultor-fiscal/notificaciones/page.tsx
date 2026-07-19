import type { Metadata } from "next";
import Link from "next/link";
import { FiscalNotificationIntakeView } from "@/components/fiscal-notifications/FiscalNotificationIntakeView";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Notificaciones y expedientes",
  description:
    "Revisión local y privada de notificaciones administrativas dentro de Asesoría fiscal.",
  robots: { index: false, follow: false, noarchive: true },
};

interface FiscalNotificationsPageProps {
  readonly searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function FiscalNotificationAnalyzerSection() {
  return <FiscalNotificationIntakeView />;
}

function FiscalNotificationGuideLinkSection() {
  return (
    <section
      aria-labelledby="fiscal-notification-guide-link-title"
      className="mx-auto mt-4 w-full max-w-6xl px-4 pb-12 sm:px-6"
    >
      <div className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm">
        <p className="text-sm font-bold uppercase tracking-wide text-blue-700">
          Qué tipos podemos leer hasta ahora
        </p>
        <h2
          id="fiscal-notification-guide-link-title"
          className="mt-1 text-xl font-bold text-slate-950"
        >
          Guía de notificaciones
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          Consulta las familias documentales que conoce el lector, qué
          significan y qué conviene revisar, sin mezclarlo con el escáner.
        </p>
        <Link
          href="/consultor-fiscal/notificaciones/guia"
          className="mt-4 inline-flex min-h-11 items-center rounded-xl border-2 border-blue-200 bg-white px-4 font-semibold text-blue-800 hover:bg-blue-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
        >
          Ver guía de notificaciones
        </Link>
      </div>
    </section>
  );
}

export default async function FiscalNotificationsPage({
  searchParams,
}: FiscalNotificationsPageProps) {
  const resolvedSearchParams = await searchParams;
  const requestedDocument = resolvedSearchParams.documento;
  const selectedDocumentId =
    typeof requestedDocument === "string" &&
    requestedDocument.length > 0 &&
    requestedDocument.length <= 160 &&
    !/[\u0000-\u001f\u007f]/.test(requestedDocument)
      ? requestedDocument
      : requestedDocument === undefined
        ? undefined
        : "invalid-document-id";
  if (selectedDocumentId !== undefined) {
    return (
      <FiscalNotificationIntakeView selectedDocumentId={selectedDocumentId} />
    );
  }

  return (
    <>
      <section
        id="analizar-documento"
        className="scroll-mt-6"
        aria-label="Analizar documento"
      >
        <FiscalNotificationAnalyzerSection />
      </section>
      <FiscalNotificationGuideLinkSection />
    </>
  );
}
