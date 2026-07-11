import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Estado de la declaración responsable",
  description: "Estado de publicación de la declaración responsable del SIF.",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
    },
  },
};

export default function DeclaracionResponsablePage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link href="/configuracion" className="text-sm font-medium text-blue-600">
        ← Volver a configuración
      </Link>

      <p className="mt-6 inline-flex rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-bold uppercase tracking-wide text-amber-900">
        Borrador técnico
      </p>
      <h1 className="mt-4 text-2xl font-bold text-slate-900">
        Declaración responsable no publicada
      </h1>

      <div
        role="status"
        className="mt-6 rounded-2xl border border-amber-300 bg-amber-50 p-5 text-sm leading-relaxed text-amber-950"
      >
        <p className="font-bold">
          No constituye una declaración responsable válida.
        </p>
        <p className="mt-2">
          La versión actual mantiene este contenido únicamente como estado
          informativo mientras continúa su revisión técnica y jurídica.
        </p>
      </div>

      <p className="mt-6 text-sm leading-relaxed text-slate-700">
        Consulta qué funciones están disponibles ahora y sus límites en la
        página de información VeriFactu.
      </p>
      <Link
        href="/legal/verifactu"
        className="mt-3 inline-flex text-sm font-semibold text-blue-600 hover:underline"
      >
        Ver información VeriFactu →
      </Link>
    </div>
  );
}
