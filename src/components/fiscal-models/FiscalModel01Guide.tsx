import Link from "next/link";
import {
  BadgeCheck,
  BookOpenCheck,
  CheckCircle2,
  Clock3,
  Download,
  ExternalLink,
  FileCheck2,
  FileText,
  HelpCircle,
  Info,
  Landmark,
  Laptop,
  LibraryBig,
  MapPin,
  Scale,
  ShieldCheck,
  TriangleAlert,
  UserCheck,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import type {
  PublicAeatOfficialContentSourceV1,
  PublicAeatOfficialModelContentV1,
} from "@/lib/fiscal-models/model-pages/official-content";
import { MODEL_01_GUIDE_V1 } from "./model-01-guide.v1";

const focusRing =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500";

function sourceById(
  content: PublicAeatOfficialModelContentV1,
  sourceId: string,
): PublicAeatOfficialContentSourceV1 {
  const source = content.sources.find((candidate) => candidate.id === sourceId);
  if (!source) throw new Error(`Missing Model 01 official source: ${sourceId}`);
  return source;
}

function ExternalOfficialLink({
  href,
  children,
  prominent = false,
}: {
  href: string;
  children: React.ReactNode;
  prominent?: boolean;
}) {
  const classes = prominent
    ? "inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 py-3 text-center font-bold text-white shadow-sm transition hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500"
    : "inline-flex min-h-11 items-center gap-2 rounded-xl px-2 font-semibold text-blue-800 hover:bg-blue-50 dark:text-blue-200 dark:hover:bg-blue-950";

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`${classes} ${focusRing}`}
    >
      {children}
      <span className="sr-only"> (web oficial externa, nueva pestaña)</span>
      <ExternalLink className="h-4 w-4 shrink-0" aria-hidden="true" />
    </a>
  );
}

function SectionHeading({
  id,
  icon,
  children,
}: {
  id: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-blue-700 dark:text-blue-300" aria-hidden="true">
        {icon}
      </span>
      <h2
        id={id}
        className="text-xl font-bold text-slate-950 dark:text-slate-100"
      >
        {children}
      </h2>
    </div>
  );
}

function BulletList({ items }: { items: readonly string[] }) {
  return (
    <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-700 dark:text-slate-300">
      {items.map((item) => (
        <li key={item} className="flex gap-2">
          <CheckCircle2
            className="mt-1 h-4 w-4 shrink-0 text-blue-700 dark:text-blue-300"
            aria-hidden="true"
          />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export function FiscalModel01Guide({
  content,
}: {
  content: PublicAeatOfficialModelContentV1;
}) {
  const guide = MODEL_01_GUIDE_V1;
  const procedureSource = sourceById(
    content,
    guide.actions.procedure.sourceId,
  );
  const formSource = sourceById(content, guide.actions.form.sourceId);
  const instructionsSource = sourceById(
    content,
    guide.actions.instructions.sourceId,
  );
  const csvSource = sourceById(content, guide.csv.sourceId);

  return (
    <div className="space-y-8">
      <section aria-labelledby="model-01-introduction" className="space-y-4">
        <h2 id="model-01-introduction" className="sr-only">
          Introducción al Modelo 01
        </h2>
        <p className="text-base leading-7 text-slate-700 dark:text-slate-300">
          {guide.intro}
        </p>
        <Card
          role="note"
          className="border-blue-200 bg-blue-50/80 dark:border-blue-800 dark:bg-blue-950/40"
        >
          <div className="flex items-start gap-3">
            <Info
              className="mt-0.5 h-5 w-5 shrink-0 text-blue-700 dark:text-blue-300"
              aria-hidden="true"
            />
            <div>
              <h3 className="font-bold text-blue-950 dark:text-blue-100">
                Importante
              </h3>
              <p className="mt-1 text-sm leading-6 text-blue-950 dark:text-blue-100">
                {guide.importantNotice}
              </p>
            </div>
          </div>
        </Card>

        <div className="grid gap-3 lg:grid-cols-3">
          <ExternalOfficialLink href={procedureSource.canonicalUrl} prominent>
            <Landmark className="h-5 w-5" aria-hidden="true" />
            {guide.actions.procedure.label}
          </ExternalOfficialLink>
          <ExternalOfficialLink href={formSource.canonicalUrl} prominent>
            <Download className="h-5 w-5" aria-hidden="true" />
            {guide.actions.form.label}
          </ExternalOfficialLink>
          <ExternalOfficialLink href={instructionsSource.canonicalUrl} prominent>
            <BookOpenCheck className="h-5 w-5" aria-hidden="true" />
            {guide.actions.instructions.label}
          </ExternalOfficialLink>
        </div>
        <p className="text-center text-xs leading-5 text-slate-500 dark:text-slate-400">
          Los tres botones abren recursos oficiales de la AEAT. Factu no inicia
          el trámite ni envía información al abrirlos.
        </p>

        <Card
          role="note"
          className="border-amber-200 bg-amber-50/80 dark:border-amber-800 dark:bg-amber-950/40"
        >
          <div className="flex items-start gap-3">
            <TriangleAlert
              className="mt-0.5 h-5 w-5 shrink-0 text-amber-700 dark:text-amber-300"
              aria-hidden="true"
            />
            <div>
              <h3 className="font-bold text-amber-950 dark:text-amber-100">
                {guide.pdfNotice.title}
              </h3>
              {guide.pdfNotice.paragraphs.map((paragraph) => (
                <p
                  key={paragraph}
                  className="mt-2 text-sm leading-6 text-amber-950 dark:text-amber-100"
                >
                  {paragraph}
                </p>
              ))}
            </div>
          </div>
        </Card>
      </section>

      <section aria-labelledby="model-01-quick-summary" className="space-y-3">
        <SectionHeading
          id="model-01-quick-summary"
          icon={<FileCheck2 className="h-5 w-5" />}
        >
          El Modelo 01 en pocas palabras
        </SectionHeading>
        <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {guide.quickFacts.map((fact) => (
            <Card
              key={fact.label}
              className="dark:border-slate-700 dark:bg-slate-900"
            >
              <dt className="font-bold text-slate-950 dark:text-slate-100">
                {fact.label}
              </dt>
              <dd className="mt-2 text-sm leading-6 text-slate-700 dark:text-slate-300">
                {fact.value}
              </dd>
            </Card>
          ))}
        </dl>
      </section>

      <section aria-labelledby="model-01-purpose" className="space-y-3">
        <SectionHeading
          id="model-01-purpose"
          icon={<HelpCircle className="h-5 w-5" />}
        >
          Para qué sirve
        </SectionHeading>
        <Card className="dark:border-slate-700 dark:bg-slate-900">
          <p className="text-sm leading-6 text-slate-700 dark:text-slate-300">
            {guide.purpose.body}
          </p>
          <p className="mt-3 rounded-xl bg-slate-100 p-3 text-sm font-semibold leading-6 text-slate-800 dark:bg-slate-800 dark:text-slate-100">
            {guide.purpose.clarification}
          </p>
        </Card>
      </section>

      <section aria-labelledby="model-01-certificates" className="space-y-3">
        <SectionHeading
          id="model-01-certificates"
          icon={<LibraryBig className="h-5 w-5" />}
        >
          Certificados que puedes solicitar
        </SectionHeading>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {guide.certificateTypes.map((certificate) => (
            <Card
              key={certificate.title}
              className="dark:border-slate-700 dark:bg-slate-900"
            >
              <h3 className="font-bold text-slate-950 dark:text-slate-100">
                {certificate.title}
              </h3>
              <p className="mt-2 text-sm leading-6 text-slate-700 dark:text-slate-300">
                {certificate.description}
              </p>
              {"examples" in certificate && certificate.examples ? (
                <BulletList items={certificate.examples} />
              ) : null}
            </Card>
          ))}
        </div>
      </section>

      <section aria-labelledby="model-01-fill" className="space-y-3">
        <SectionHeading
          id="model-01-fill"
          icon={<FileText className="h-5 w-5" />}
        >
          Cómo rellenar el Modelo 01
        </SectionHeading>
        <ol className="grid gap-4 md:grid-cols-2">
          {guide.fillingSteps.map((step) => (
            <li key={step.title}>
              <Card className="h-full dark:border-slate-700 dark:bg-slate-900">
                <h3 className="font-bold text-slate-950 dark:text-slate-100">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-700 dark:text-slate-300">
                  {step.description}
                </p>
                {"example" in step && step.example ? (
                  <p className="mt-3 rounded-xl bg-blue-50 p-3 text-sm leading-6 text-blue-950 dark:bg-blue-950/40 dark:text-blue-100">
                    {step.example}
                  </p>
                ) : null}
              </Card>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="model-01-request" className="space-y-3">
        <SectionHeading
          id="model-01-request"
          icon={<Laptop className="h-5 w-5" />}
        >
          Cómo solicitarlo
        </SectionHeading>
        <div className="grid gap-4 md:grid-cols-2">
          {guide.channels.map((channel, index) => (
            <Card
              key={channel.title}
              className="dark:border-slate-700 dark:bg-slate-900"
            >
              <div className="flex items-center gap-2">
                {index === 0 ? (
                  <Laptop
                    className="h-5 w-5 text-blue-700 dark:text-blue-300"
                    aria-hidden="true"
                  />
                ) : (
                  <MapPin
                    className="h-5 w-5 text-blue-700 dark:text-blue-300"
                    aria-hidden="true"
                  />
                )}
                <h3 className="font-bold text-slate-950 dark:text-slate-100">
                  {channel.title}
                </h3>
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-700 dark:text-slate-300">
                {channel.description}
              </p>
              <BulletList items={channel.bullets} />
            </Card>
          ))}
        </div>
        <Card className="border-violet-200 bg-violet-50/70 dark:border-violet-800 dark:bg-violet-950/30">
          <div className="flex items-start gap-3">
            <Info
              className="mt-0.5 h-5 w-5 shrink-0 text-violet-700 dark:text-violet-300"
              aria-hidden="true"
            />
            <div>
              <h3 className="font-bold text-violet-950 dark:text-violet-100">
                Modelo 01 y Modelo 01C
              </h3>
              <div className="mt-2 grid gap-2 text-sm leading-6 text-violet-950 sm:grid-cols-2 dark:text-violet-100">
                <p>
                  <strong>Modelo 01:</strong> {guide.comparison.model01}
                </p>
                <p>
                  <strong>Modelo 01C:</strong> {guide.comparison.model01c}
                </p>
              </div>
              <p className="mt-2 text-sm font-semibold leading-6 text-violet-950 dark:text-violet-100">
                {guide.comparison.warning}
              </p>
              <Link
                href={guide.comparison.model01cHref}
                className={`mt-2 inline-flex min-h-11 items-center gap-2 rounded-xl px-2 font-bold text-blue-800 hover:bg-blue-50 dark:text-blue-200 dark:hover:bg-blue-950 ${focusRing}`}
              >
                Ver la ficha del Modelo 01C
              </Link>
            </div>
          </div>
        </Card>
      </section>

      <section aria-labelledby="model-01-current-result" className="space-y-3">
        <SectionHeading
          id="model-01-current-result"
          icon={<BadgeCheck className="h-5 w-5" />}
        >
          Resultado del certificado de estar al corriente
        </SectionHeading>
        <p className="text-sm leading-6 text-slate-700 dark:text-slate-300">
          Este apartado se refiere solo al certificado de estar al corriente,
          no al resto de certificados que permite solicitar el Modelo 01.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          {guide.currentStatusResults.map((result) => (
            <Card
              key={result.title}
              className="dark:border-slate-700 dark:bg-slate-900"
            >
              <h3 className="font-bold text-slate-950 dark:text-slate-100">
                {result.title}
              </h3>
              <p className="mt-2 text-sm leading-6 text-slate-700 dark:text-slate-300">
                {result.description}
              </p>
            </Card>
          ))}
        </div>
        <p className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm font-semibold leading-6 text-blue-950 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-100">
          Un resultado negativo no significa siempre que exista una deuda:
          también puede deberse a una declaración pendiente de presentar.
        </p>
      </section>

      <section aria-labelledby="model-01-after-request" className="space-y-3">
        <SectionHeading
          id="model-01-after-request"
          icon={<Clock3 className="h-5 w-5" />}
        >
          Qué ocurre después de solicitarlo
        </SectionHeading>
        <div className="grid gap-4 lg:grid-cols-3">
          {guide.afterRequest.map((item) => (
            <Card
              key={item.title}
              className="dark:border-slate-700 dark:bg-slate-900"
            >
              <h3 className="font-bold text-slate-950 dark:text-slate-100">
                {item.title}
              </h3>
              {item.paragraphs.map((paragraph) => (
                <p
                  key={paragraph}
                  className="mt-2 text-sm leading-6 text-slate-700 dark:text-slate-300"
                >
                  {paragraph}
                </p>
              ))}
            </Card>
          ))}
        </div>
      </section>

      <section aria-labelledby="model-01-corrections" className="space-y-3">
        <SectionHeading
          id="model-01-corrections"
          icon={<UserCheck className="h-5 w-5" />}
        >
          {guide.correction.title}
        </SectionHeading>
        <Card className="dark:border-slate-700 dark:bg-slate-900">
          <p className="text-sm leading-6 text-slate-700 dark:text-slate-300">
            {guide.correction.description}
          </p>
          <BulletList items={guide.correction.bullets} />
          <p className="mt-3 rounded-xl bg-blue-50 p-3 text-sm leading-6 text-blue-950 dark:bg-blue-950/40 dark:text-blue-100">
            {guide.correction.example}
          </p>
        </Card>
      </section>

      <section aria-labelledby="model-01-authenticity" className="space-y-3">
        <SectionHeading
          id="model-01-authenticity"
          icon={<ShieldCheck className="h-5 w-5" />}
        >
          {guide.csv.title}
        </SectionHeading>
        <Card className="dark:border-slate-700 dark:bg-slate-900">
          <p className="text-sm leading-6 text-slate-700 dark:text-slate-300">
            {guide.csv.description}
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-700 dark:text-slate-300">
            {guide.csv.note}
          </p>
          <div className="mt-3">
            <ExternalOfficialLink href={csvSource.canonicalUrl}>
              <ShieldCheck className="h-4 w-4" aria-hidden="true" />
              Comprobar un documento con CSV en la AEAT
            </ExternalOfficialLink>
          </div>
        </Card>
      </section>

      <section aria-labelledby="model-01-faq" className="space-y-3">
        <SectionHeading
          id="model-01-faq"
          icon={<HelpCircle className="h-5 w-5" />}
        >
          Preguntas frecuentes
        </SectionHeading>
        <div className="space-y-3">
          {guide.faq.map((item) => (
            <details
              key={item.question}
              className="group rounded-2xl border border-slate-200 bg-white p-4 open:border-blue-300 open:bg-blue-50/40 dark:border-slate-700 dark:bg-slate-900 dark:open:border-blue-800 dark:open:bg-blue-950/20"
            >
              <summary
                className={`cursor-pointer list-none rounded font-bold text-slate-950 dark:text-slate-100 ${focusRing}`}
              >
                {item.question}
              </summary>
              <p className="mt-3 text-sm leading-6 text-slate-700 dark:text-slate-300">
                {item.answer}
              </p>
            </details>
          ))}
        </div>
      </section>

      <section aria-labelledby="model-01-official-links" className="space-y-3">
        <SectionHeading
          id="model-01-official-links"
          icon={<LibraryBig className="h-5 w-5" />}
        >
          Documentos y enlaces oficiales
        </SectionHeading>
        <Card className="dark:border-slate-700 dark:bg-slate-900">
          <ul className="grid gap-2 md:grid-cols-2">
            {content.documents.map((document) => {
              const source = sourceById(content, document.sourceId);
              return (
                <li key={document.id}>
                  <ExternalOfficialLink href={source.canonicalUrl}>
                    <Download className="h-4 w-4" aria-hidden="true" />
                    {document.title}
                  </ExternalOfficialLink>
                </li>
              );
            })}
            {content.links.map((link) => {
              const source = sourceById(content, link.sourceId);
              return (
                <li key={link.id}>
                  <ExternalOfficialLink href={source.canonicalUrl}>
                    {link.category === "LEGAL" ? (
                      <Scale className="h-4 w-4" aria-hidden="true" />
                    ) : (
                      <ExternalLink className="h-4 w-4" aria-hidden="true" />
                    )}
                    {link.label}
                  </ExternalOfficialLink>
                </li>
              );
            })}
          </ul>
        </Card>
      </section>

      <details className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm dark:border-slate-700 dark:bg-slate-900">
        <summary
          className={`cursor-pointer font-semibold text-slate-800 dark:text-slate-200 ${focusRing}`}
        >
          Fuentes y trazabilidad
        </summary>
        <dl className="mt-4 grid gap-3 text-xs text-slate-600 sm:grid-cols-2 dark:text-slate-300">
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
