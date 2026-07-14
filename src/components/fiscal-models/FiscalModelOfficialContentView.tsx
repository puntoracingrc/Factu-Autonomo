import {
  BookOpenCheck,
  Download,
  ExternalLink,
  FileText,
  Globe2,
  Landmark,
  LibraryBig,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import type {
  PublicAeatOfficialContentSourceV1,
  PublicAeatOfficialModelContentV1,
} from "@/lib/fiscal-models/model-pages/official-content";
import { FiscalModel01Guide } from "./FiscalModel01Guide";
import { FiscalModelPracticalGuide } from "./FiscalModelPracticalGuide";
import { MODEL_01C_GUIDE_V1 } from "./model-01c-guide.v1";
import { MODEL_030_GUIDE_V1 } from "./model-030-guide.v1";
import { MODEL_035_GUIDE_V1 } from "./model-035-guide.v1";
import { MODEL_036_GUIDE_V1 } from "./model-036-guide.v1";
import { MODEL_037_GUIDE_V1 } from "./model-037-guide.v1";
import { MODEL_04_GUIDE_V1 } from "./model-04-guide.v1";
import { MODEL_05_GUIDE_V1 } from "./model-05-guide.v1";
import { MODEL_06_GUIDE_V1 } from "./model-06-guide.v1";
import { MODEL_100_GUIDE_V1 } from "./model-100-guide.v1";
import { MODEL_111_GUIDE_V1 } from "./model-111-guide.v1";
import { MODEL_115_GUIDE_V1 } from "./model-115-guide.v1";
import { MODEL_130_GUIDE_V1 } from "./model-130-guide.v1";
import { MODEL_131_GUIDE_V1 } from "./model-131-guide.v1";
import { MODEL_180_GUIDE_V1 } from "./model-180-guide.v1";
import { MODEL_184_GUIDE_V1 } from "./model-184-guide.v1";
import { MODEL_190_GUIDE_V1 } from "./model-190-guide.v1";
import { MODEL_303_GUIDE_V1 } from "./model-303-guide.v1";
import { MODEL_309_GUIDE_V1 } from "./model-309-guide.v1";
import { MODEL_347_GUIDE_V1 } from "./model-347-guide.v1";
import { MODEL_349_GUIDE_V1 } from "./model-349-guide.v1";
import { MODEL_369_GUIDE_V1 } from "./model-369-guide.v1";
import { MODEL_390_GUIDE_V1 } from "./model-390-guide.v1";
import { MODEL_840_GUIDE_V1 } from "./model-840-guide.v1";

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
  content: PublicAeatOfficialModelContentV1,
  sourceId: string,
): PublicAeatOfficialContentSourceV1 {
  const source = content.sources.find((candidate) => candidate.id === sourceId);
  if (!source) throw new Error(`Missing official source: ${sourceId}`);
  return source;
}

export function FiscalModelOfficialContentView({
  content,
}: {
  content: PublicAeatOfficialModelContentV1;
}) {
  if (content.code === "01") {
    return <FiscalModel01Guide content={content} />;
  }

  if (content.code === "01C") {
    return (
      <FiscalModelPracticalGuide content={content} guide={MODEL_01C_GUIDE_V1} />
    );
  }

  if (content.code === "030") {
    return (
      <FiscalModelPracticalGuide content={content} guide={MODEL_030_GUIDE_V1} />
    );
  }

  if (content.code === "035") {
    return (
      <FiscalModelPracticalGuide content={content} guide={MODEL_035_GUIDE_V1} />
    );
  }

  if (content.code === "036") {
    return (
      <FiscalModelPracticalGuide content={content} guide={MODEL_036_GUIDE_V1} />
    );
  }

  if (content.code === "037") {
    return (
      <FiscalModelPracticalGuide content={content} guide={MODEL_037_GUIDE_V1} />
    );
  }

  if (content.code === "04") {
    return (
      <FiscalModelPracticalGuide content={content} guide={MODEL_04_GUIDE_V1} />
    );
  }

  if (content.code === "05") {
    return (
      <FiscalModelPracticalGuide content={content} guide={MODEL_05_GUIDE_V1} />
    );
  }

  if (content.code === "06") {
    return (
      <FiscalModelPracticalGuide content={content} guide={MODEL_06_GUIDE_V1} />
    );
  }

  if (content.code === "100") {
    return (
      <FiscalModelPracticalGuide content={content} guide={MODEL_100_GUIDE_V1} />
    );
  }

  if (content.code === "111") {
    return (
      <FiscalModelPracticalGuide content={content} guide={MODEL_111_GUIDE_V1} />
    );
  }

  if (content.code === "115") {
    return (
      <FiscalModelPracticalGuide content={content} guide={MODEL_115_GUIDE_V1} />
    );
  }

  if (content.code === "130") {
    return (
      <FiscalModelPracticalGuide content={content} guide={MODEL_130_GUIDE_V1} />
    );
  }

  if (content.code === "131") {
    return (
      <FiscalModelPracticalGuide content={content} guide={MODEL_131_GUIDE_V1} />
    );
  }

  if (content.code === "180") {
    return (
      <FiscalModelPracticalGuide content={content} guide={MODEL_180_GUIDE_V1} />
    );
  }

  if (content.code === "184") {
    return (
      <FiscalModelPracticalGuide content={content} guide={MODEL_184_GUIDE_V1} />
    );
  }

  if (content.code === "190") {
    return (
      <FiscalModelPracticalGuide content={content} guide={MODEL_190_GUIDE_V1} />
    );
  }

  if (content.code === "303") {
    return (
      <FiscalModelPracticalGuide content={content} guide={MODEL_303_GUIDE_V1} />
    );
  }

  if (content.code === "309") {
    return (
      <FiscalModelPracticalGuide content={content} guide={MODEL_309_GUIDE_V1} />
    );
  }

  if (content.code === "347") {
    return (
      <FiscalModelPracticalGuide content={content} guide={MODEL_347_GUIDE_V1} />
    );
  }

  if (content.code === "349") {
    return (
      <FiscalModelPracticalGuide content={content} guide={MODEL_349_GUIDE_V1} />
    );
  }

  if (content.code === "369") {
    return (
      <FiscalModelPracticalGuide content={content} guide={MODEL_369_GUIDE_V1} />
    );
  }

  if (content.code === "390") {
    return (
      <FiscalModelPracticalGuide content={content} guide={MODEL_390_GUIDE_V1} />
    );
  }

  if (content.code === "840") {
    return (
      <FiscalModelPracticalGuide content={content} guide={MODEL_840_GUIDE_V1} />
    );
  }

  const procedureLinks = content.links.filter(
    (link) => link.category === "PROCEDURE",
  );
  const informationLinks = content.links.filter(
    (link) => link.category === "INFORMATION",
  );
  const legalLinks = content.links.filter((link) => link.category === "LEGAL");

  return (
    <div className="space-y-6">
      {content.sections.map((section, sectionIndex) => (
        <section
          key={section.id}
          aria-labelledby={`official-section-${content.code}-${section.id}`}
          className="space-y-3"
        >
          <div className="flex items-center gap-2">
            {sectionIndex === 0 ? (
              <BookOpenCheck
                className="h-5 w-5 text-blue-700 dark:text-blue-300"
                aria-hidden="true"
              />
            ) : (
              <Globe2
                className="h-5 w-5 text-blue-700 dark:text-blue-300"
                aria-hidden="true"
              />
            )}
            <h2
              id={`official-section-${content.code}-${section.id}`}
              className="text-xl font-bold text-slate-950 dark:text-slate-100"
            >
              {section.title}
            </h2>
          </div>
          <div className="grid min-w-0 gap-4 md:grid-cols-2">
            {section.items.map((item) => (
              <Card
                key={item.id}
                className="dark:border-slate-700 dark:bg-slate-900"
              >
                <h3 className="font-bold text-slate-950 dark:text-slate-100">
                  {item.heading}
                </h3>
                <p className="mt-2 break-words text-sm leading-6 text-slate-700 dark:text-slate-300">
                  {item.text}
                </p>
              </Card>
            ))}
          </div>
        </section>
      ))}

      {content.documents.length > 0 && (
        <section
          aria-labelledby={`official-documents-${content.code}`}
          className="space-y-3"
        >
          <div className="flex items-center gap-2">
            <FileText
              className="h-5 w-5 text-blue-700 dark:text-blue-300"
              aria-hidden="true"
            />
            <h2
              id={`official-documents-${content.code}`}
              className="text-xl font-bold text-slate-950 dark:text-slate-100"
            >
              Documentos oficiales
            </h2>
          </div>
          <div className="grid min-w-0 gap-4 md:grid-cols-2">
            {content.documents.map((document) => {
              const source = sourceById(content, document.sourceId);
              return (
                <Card
                  key={document.id}
                  className="flex min-w-0 flex-col dark:border-slate-700 dark:bg-slate-900"
                >
                  <h3 className="break-words font-bold text-slate-950 dark:text-slate-100">
                    {document.title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                    PDF · {document.pageCount}{" "}
                    {document.pageCount === 1 ? "página" : "páginas"}
                  </p>
                  <div className="mt-auto pt-3">
                    <ExternalOfficialLink href={source.canonicalUrl}>
                      <Download className="h-4 w-4" aria-hidden="true" />
                      Descargar documento oficial
                    </ExternalOfficialLink>
                  </div>
                </Card>
              );
            })}
          </div>
          <p className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm leading-6 text-blue-950 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-100">
            Los documentos se abren en la sede oficial que los publica. No se
            ejecutan ni se incrustan en esta web.
          </p>
        </section>
      )}

      {(informationLinks.length > 0 || procedureLinks.length > 0) && (
        <section
          aria-labelledby={`official-information-${content.code}`}
          className="space-y-3"
        >
          <div className="flex items-center gap-2">
            <LibraryBig
              className="h-5 w-5 text-blue-700 dark:text-blue-300"
              aria-hidden="true"
            />
            <h2
              id={`official-information-${content.code}`}
              className="text-xl font-bold text-slate-950 dark:text-slate-100"
            >
              Información, ayuda y procedimiento
            </h2>
          </div>
          <Card className="dark:border-slate-700 dark:bg-slate-900">
            <ul className="grid min-w-0 gap-2 md:grid-cols-2">
              {[...informationLinks, ...procedureLinks].map((link) => {
                const source = sourceById(content, link.sourceId);
                return (
                  <li key={link.id} className="min-w-0">
                    <ExternalOfficialLink href={source.canonicalUrl}>
                      {link.label}
                    </ExternalOfficialLink>
                  </li>
                );
              })}
            </ul>
          </Card>
        </section>
      )}

      {legalLinks.length > 0 && (
        <section
          aria-labelledby={`official-law-${content.code}`}
          className="space-y-3"
        >
          <div className="flex items-center gap-2">
            <Landmark
              className="h-5 w-5 text-blue-700 dark:text-blue-300"
              aria-hidden="true"
            />
            <h2
              id={`official-law-${content.code}`}
              className="text-xl font-bold text-slate-950 dark:text-slate-100"
            >
              Normativa
            </h2>
          </div>
          <Card className="dark:border-slate-700 dark:bg-slate-900">
            <ul className="grid min-w-0 gap-2 md:grid-cols-2">
              {legalLinks.map((link) => {
                const source = sourceById(content, link.sourceId);
                return (
                  <li key={link.id} className="min-w-0">
                    <ExternalOfficialLink href={source.canonicalUrl}>
                      {link.label}
                    </ExternalOfficialLink>
                  </li>
                );
              })}
            </ul>
          </Card>
        </section>
      )}

      <section
        aria-labelledby={`official-faq-${content.code}`}
        className="space-y-3"
      >
        <div className="flex items-center gap-2">
          <BookOpenCheck
            className="h-5 w-5 text-blue-700 dark:text-blue-300"
            aria-hidden="true"
          />
          <h2
            id={`official-faq-${content.code}`}
            className="text-xl font-bold text-slate-950 dark:text-slate-100"
          >
            Preguntas frecuentes
          </h2>
        </div>
        <div className="space-y-3">
          {content.faq.map((item) => (
            <details
              key={item.id}
              className="group rounded-2xl border border-slate-200 bg-white p-4 open:border-blue-300 open:bg-blue-50/40 dark:border-slate-700 dark:bg-slate-900 dark:open:border-blue-800 dark:open:bg-blue-950/20"
            >
              <summary
                className={`cursor-pointer list-none rounded font-bold text-slate-950 dark:text-slate-100 ${focusRing}`}
              >
                {item.question}
              </summary>
              <p className="mt-3 break-words text-sm leading-6 text-slate-700 dark:text-slate-300">
                {item.answer}
              </p>
            </details>
          ))}
        </div>
      </section>

      {content.externalNavigation && (
        <Card className="border-blue-200 bg-blue-50/70 dark:border-blue-800 dark:bg-blue-950/30">
          <h2 className="text-lg font-bold text-slate-950 dark:text-slate-100">
            Acceso externo a la AEAT
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-700 dark:text-slate-300">
            Este enlace abre el área personal general de la AEAT. Factu no
            inicia ningún trámite ni envía datos al abrirlo.
          </p>
          <div className="mt-3">
            <ExternalOfficialLink
              href={
                sourceById(content, content.externalNavigation.sourceId)
                  .canonicalUrl
              }
            >
              <Globe2 className="h-4 w-4" aria-hidden="true" />
              Abrir Mi área personal de la AEAT
            </ExternalOfficialLink>
          </div>
        </Card>
      )}

      <details className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm dark:border-slate-700 dark:bg-slate-900">
        <summary
          className={`cursor-pointer font-semibold text-slate-800 dark:text-slate-200 ${focusRing}`}
        >
          Fuentes y trazabilidad
        </summary>
        <dl className="mt-4 grid min-w-0 gap-3 text-xs text-slate-600 sm:grid-cols-2 dark:text-slate-300">
          <div>
            <dt className="font-semibold">Release de contenido</dt>
            <dd className="mt-1 break-all">{content.releaseId}</dd>
          </div>
          <div>
            <dt className="font-semibold">Fuentes contrastadas el</dt>
            <dd className="mt-1">{content.reviewedOn}</dd>
          </div>
          <div>
            <dt className="font-semibold">Fuentes oficiales registradas</dt>
            <dd className="mt-1">{content.sources.length}</dd>
          </div>
          <div>
            <dt className="font-semibold">Aplicación a un caso concreto</dt>
            <dd className="mt-1">No evaluada</dd>
          </div>
        </dl>
        <p className="mt-4 text-xs leading-5 text-slate-500 dark:text-slate-400">
          {content.limitations}
        </p>
      </details>
    </div>
  );
}
