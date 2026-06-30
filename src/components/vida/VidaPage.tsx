import Link from "next/link";
import { getVidaJsonLd, type VidaPageContent, vidaPages } from "@/lib/vida/content";
import { renderMarkdownToHtml } from "@/lib/vida/markdown";

export function VidaPage({ page }: { page: VidaPageContent }) {
  const html = renderMarkdownToHtml(page.body);
  const jsonLd = getVidaJsonLd(page);

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <Link
            href="/"
            className="flex w-fit items-center gap-3 rounded-xl transition-colors hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-sm font-bold text-white">
              FA
            </span>
            <span>
              <span className="block text-base font-bold text-slate-950">
                Factura Autónomo
              </span>
              <span className="block text-xs font-medium text-slate-500">
                Centro ViDA
              </span>
            </span>
          </Link>
          <Link
            href="/vida-factura-electronica/preguntas-frecuentes"
            className="w-fit rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600"
          >
            Preguntas
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl px-4 py-6 pb-16">
        <nav
          aria-label="Migas de pan"
          className="mb-4 flex flex-wrap items-center gap-2 text-sm text-slate-500"
        >
          <Link
            href="/"
            className="font-medium text-slate-600 underline-offset-4 hover:text-blue-700 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600"
          >
            Inicio
          </Link>
          <span aria-hidden="true">/</span>
          <Link
            href="/vida-factura-electronica"
            className="font-medium text-slate-600 underline-offset-4 hover:text-blue-700 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600"
          >
            ViDA y factura electrónica
          </Link>
          {page.id !== "index" && (
            <>
              <span aria-hidden="true">/</span>
              <span aria-current="page">{page.label}</span>
            </>
          )}
        </nav>

        <nav
          aria-label="Páginas del Centro ViDA"
          className="nav-scroll mb-5 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-sm"
        >
          <div className="flex w-max min-w-full items-center gap-2">
            {vidaPages.map((item) => (
              <Link
                key={item.route}
                href={item.route}
                aria-current={item.id === page.id ? "page" : undefined}
                className={`flex min-h-11 shrink-0 items-center rounded-xl px-3 py-2 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${
                  item.id === page.id
                    ? "bg-blue-600 text-white shadow-sm shadow-blue-600/20"
                    : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </nav>

        <article
          className="vida-content rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-5xl px-4 py-6 text-sm text-slate-500">
          Contenido informativo. No constituye asesoramiento fiscal individual.
        </div>
      </footer>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </div>
  );
}
