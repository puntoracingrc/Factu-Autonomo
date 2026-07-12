import {
  BookOpenCheck,
  Building2,
  Download,
  ExternalLink,
  FileText,
  Globe2,
  Landmark,
  LibraryBig,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import type {
  PublicAeatModel01ContentV1,
  PublicAeatModelContentSourceV1,
} from "@/lib/fiscal-models/model-pages/model-01-content.v1";

const focusRing =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500";

function ExternalOfficialLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex min-h-11 items-center gap-2 rounded-xl px-2 font-semibold text-blue-800 hover:bg-blue-50 dark:text-blue-200 dark:hover:bg-blue-950 ${focusRing}`}
    >
      {children}
      <span className="sr-only"> (se abre en una pestaña nueva)</span>
      <ExternalLink className="h-4 w-4 shrink-0" aria-hidden="true" />
    </a>
  );
}

function sourceById(
  content: PublicAeatModel01ContentV1,
  sourceId: PublicAeatModelContentSourceV1["id"],
) {
  return content.sources.find((source) => source.id === sourceId)!;
}

export function FiscalModelReviewedContentView({
  content,
}: {
  content: PublicAeatModel01ContentV1;
}) {
  const whatItCertifies = content.facts.filter(
    (fact) =>
      fact.category === "CERTIFICATE_SCOPE" ||
      fact.category === "POSSIBLE_OUTCOMES",
  );
  const accessChannels = content.facts.filter(
    (fact) => fact.category === "ACCESS_CHANNELS",
  );
  const whatSource = sourceById(
    content,
    "aeat.model-01.what-certifies.2025-11-21",
  );
  const whereSource = sourceById(
    content,
    "aeat.model-01.where-obtained.2025-11-21",
  );
  const faqSource = sourceById(content, "aeat.model-01.faq.2025-03-03");
  const downloadSource = sourceById(
    content,
    "aeat.model-01.downloads.2026-06-04",
  );
  const procedureHome = sourceById(
    content,
    "aeat.model-01.procedure-home.2025-11-21",
  );
  const procedureRecord = sourceById(
    content,
    "aeat.model-01.procedure-record.2025-11-21",
  );
  const legislation = content.legalReferences[0];

  return (
    <div className="space-y-6">
      <Card className="dark:border-slate-700 dark:bg-slate-900">
        <h2 className="text-xl font-bold text-slate-950 dark:text-slate-100">
          Para qué sirve
        </h2>
        <p className="mt-2 break-words text-base leading-7 text-slate-700 dark:text-slate-300">
          {content.purpose}
        </p>
        <p className="mt-3 text-sm leading-6 text-slate-500 dark:text-slate-400">
          Información oficial consultada el {content.verifiedOn}. La ficha es
          informativa y no determina si este procedimiento corresponde a una
          situación concreta.
        </p>
      </Card>

      <section aria-labelledby="modelo-01-que-certifica" className="space-y-3">
        <div className="flex items-center gap-2">
          <BookOpenCheck
            className="h-5 w-5 text-blue-700 dark:text-blue-300"
            aria-hidden="true"
          />
          <h2
            id="modelo-01-que-certifica"
            className="text-xl font-bold text-slate-950 dark:text-slate-100"
          >
            Qué certifica
          </h2>
        </div>
        <div className="grid min-w-0 gap-4 md:grid-cols-2">
          {whatItCertifies.map((fact) => (
            <Card
              key={fact.id}
              className="dark:border-slate-700 dark:bg-slate-900"
            >
              <h3 className="font-bold text-slate-950 dark:text-slate-100">
                {fact.heading}
              </h3>
              <p className="mt-2 break-words text-sm leading-6 text-slate-700 dark:text-slate-300">
                {fact.text}
              </p>
            </Card>
          ))}
        </div>
      </section>

      <section aria-labelledby="modelo-01-como-se-obtiene" className="space-y-3">
        <div className="flex items-center gap-2">
          <Globe2
            className="h-5 w-5 text-blue-700 dark:text-blue-300"
            aria-hidden="true"
          />
          <h2
            id="modelo-01-como-se-obtiene"
            className="text-xl font-bold text-slate-950 dark:text-slate-100"
          >
            Cómo se obtiene
          </h2>
        </div>
        <div className="grid min-w-0 gap-4 md:grid-cols-2">
          {accessChannels.map((fact, index) => (
            <Card
              key={fact.id}
              className="dark:border-slate-700 dark:bg-slate-900"
            >
              <div className="flex items-center gap-2">
                {index === 0 ? (
                  <Globe2
                    className="h-5 w-5 text-blue-700 dark:text-blue-300"
                    aria-hidden="true"
                  />
                ) : (
                  <Building2
                    className="h-5 w-5 text-blue-700 dark:text-blue-300"
                    aria-hidden="true"
                  />
                )}
                <h3 className="font-bold text-slate-950 dark:text-slate-100">
                  {fact.heading}
                </h3>
              </div>
              <p className="mt-2 break-words text-sm leading-6 text-slate-700 dark:text-slate-300">
                {fact.text}
              </p>
            </Card>
          ))}
        </div>
      </section>

      <section aria-labelledby="modelo-01-documentos" className="space-y-3">
        <div className="flex items-center gap-2">
          <FileText
            className="h-5 w-5 text-blue-700 dark:text-blue-300"
            aria-hidden="true"
          />
          <h2
            id="modelo-01-documentos"
            className="text-xl font-bold text-slate-950 dark:text-slate-100"
          >
            Documentos oficiales
          </h2>
        </div>
        <div className="grid min-w-0 gap-4 md:grid-cols-2">
          {content.documents.map((document) => (
            <Card
              key={document.id}
              className="flex min-w-0 flex-col dark:border-slate-700 dark:bg-slate-900"
            >
              <h3 className="break-words font-bold text-slate-950 dark:text-slate-100">
                {document.title}
              </h3>
              <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                PDF · {document.pageCount} {document.pageCount === 1 ? "página" : "páginas"}
              </p>
              <div className="mt-auto pt-3">
                <ExternalOfficialLink href={document.officialUrl}>
                  <Download className="h-4 w-4" aria-hidden="true" />
                  Descargar desde la AEAT
                </ExternalOfficialLink>
              </div>
            </Card>
          ))}
        </div>
        <p className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm leading-6 text-blue-950 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-100">
          Los documentos se abren en la sede de la AEAT. El formulario oficial
          contiene funciones propias de PDF y no se ejecuta ni se incrusta en
          esta web. Consulta también la{" "}
          <a
            href={downloadSource.canonicalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`rounded font-semibold underline decoration-2 underline-offset-2 ${focusRing}`}
          >
            página oficial de descarga
            <span className="sr-only"> (se abre en una pestaña nueva)</span>
          </a>
          .
        </p>
      </section>

      <section aria-labelledby="modelo-01-informacion" className="space-y-3">
        <div className="flex items-center gap-2">
          <LibraryBig
            className="h-5 w-5 text-blue-700 dark:text-blue-300"
            aria-hidden="true"
          />
          <h2
            id="modelo-01-informacion"
            className="text-xl font-bold text-slate-950 dark:text-slate-100"
          >
            Información y ayuda
          </h2>
        </div>
        <Card className="dark:border-slate-700 dark:bg-slate-900">
          <ul className="grid min-w-0 gap-2 md:grid-cols-3">
            {[whatSource, whereSource, faqSource].map((source) => (
              <li key={source.id} className="min-w-0">
                <ExternalOfficialLink href={source.canonicalUrl}>
                  {source.title}
                </ExternalOfficialLink>
              </li>
            ))}
          </ul>
        </Card>
      </section>

      <section className="grid min-w-0 gap-4 lg:grid-cols-2">
        <Card className="dark:border-slate-700 dark:bg-slate-900">
          <div className="flex items-center gap-2">
            <Landmark
              className="h-5 w-5 text-blue-700 dark:text-blue-300"
              aria-hidden="true"
            />
            <h2 className="text-lg font-bold text-slate-950 dark:text-slate-100">
              Normativa
            </h2>
          </div>
          <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
            Referencia normativa enlazada por la AEAT. El texto consolidado del
            BOE se ofrece con carácter informativo.
          </p>
          <div className="mt-3">
            <ExternalOfficialLink href={legislation.canonicalUrl}>
              {legislation.title}
            </ExternalOfficialLink>
          </div>
        </Card>

        <Card className="dark:border-slate-700 dark:bg-slate-900">
          <h2 className="text-lg font-bold text-slate-950 dark:text-slate-100">
            Procedimiento oficial
          </h2>
          <ul className="mt-3 space-y-2">
            <li>
              <ExternalOfficialLink href={procedureHome.canonicalUrl}>
                Consultar gestiones e información
              </ExternalOfficialLink>
            </li>
            <li>
              <ExternalOfficialLink href={procedureRecord.canonicalUrl}>
                Abrir la ficha del procedimiento G304
              </ExternalOfficialLink>
            </li>
          </ul>
        </Card>
      </section>

      <Card className="border-blue-200 bg-blue-50/70 dark:border-blue-800 dark:bg-blue-950/30">
        <h2 className="text-lg font-bold text-slate-950 dark:text-slate-100">
          Acceso externo a la AEAT
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-700 dark:text-slate-300">
          Este enlace abre el área personal general de la AEAT. Factu no inicia
          el trámite ni envía datos personales o fiscales al abrirlo.
        </p>
        <div className="mt-3">
          <ExternalOfficialLink href={content.externalNavigation.href}>
            Abrir Mi área personal de la AEAT
          </ExternalOfficialLink>
        </div>
      </Card>

      <details className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm dark:border-slate-700 dark:bg-slate-900">
        <summary className={`cursor-pointer font-semibold text-slate-800 dark:text-slate-200 ${focusRing}`}>
          Fuentes y trazabilidad
        </summary>
        <dl className="mt-4 grid min-w-0 gap-3 text-xs text-slate-600 sm:grid-cols-2 dark:text-slate-300">
          <div>
            <dt className="font-semibold">Release de contenido</dt>
            <dd className="mt-1 break-all">{content.releaseId}</dd>
          </div>
          <div>
            <dt className="font-semibold">Verificado el</dt>
            <dd className="mt-1">{content.verifiedOn}</dd>
          </div>
          <div>
            <dt className="font-semibold">Fuentes oficiales registradas</dt>
            <dd className="mt-1">{content.sources.length}</dd>
          </div>
          <div>
            <dt className="font-semibold">Estado fiscal</dt>
            <dd className="mt-1">Pendiente de revisión</dd>
          </div>
        </dl>
      </details>
    </div>
  );
}
