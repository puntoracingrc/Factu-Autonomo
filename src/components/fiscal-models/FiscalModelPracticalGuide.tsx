import Link from "next/link";
import {
  AlertTriangle,
  BookOpenCheck,
  CheckCircle2,
  Clock3,
  Download,
  ExternalLink,
  FileCheck2,
  FileText,
  HelpCircle,
  Landmark,
  ListChecks,
  Scale,
  ShieldCheck,
  Users,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import type {
  PublicAeatOfficialContentSourceV1,
  PublicAeatOfficialModelContentV1,
} from "@/lib/fiscal-models/model-pages/official-content";
import type { FiscalModelPracticalGuideV1 } from "./fiscal-model-practical-guide.types";

const focusRing =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500";

const OFFICIAL_HOSTS = new Set([
  "sede.agenciatributaria.gob.es",
  "www1.agenciatributaria.gob.es",
  "www2.agenciatributaria.gob.es",
  "www.boe.es",
]);

function sourceById(
  content: PublicAeatOfficialModelContentV1,
  sourceId: string,
): PublicAeatOfficialContentSourceV1 {
  const source = content.sources.find((candidate) => candidate.id === sourceId);
  if (!source) {
    throw new Error(
      `Missing official source for Model ${content.code}: ${sourceId}`,
    );
  }
  return source;
}

function resolveOfficialHref(
  content: PublicAeatOfficialModelContentV1,
  item: { readonly sourceId?: string; readonly href?: string },
): string {
  const href = item.sourceId
    ? sourceById(content, item.sourceId).canonicalUrl
    : item.href;
  if (!href) throw new Error(`Missing official link for Model ${content.code}`);
  const url = new URL(href);
  if (url.protocol !== "https:" || !OFFICIAL_HOSTS.has(url.hostname)) {
    throw new Error(`Non-official link rejected for Model ${content.code}`);
  }
  return url.toString();
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

function InternalModelLink({
  href,
  children,
  prominent = false,
}: {
  href: NonNullable<
    FiscalModelPracticalGuideV1["actions"][number]["internalHref"]
  >;
  children: React.ReactNode;
  prominent?: boolean;
}) {
  const classes = prominent
    ? "inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 py-3 text-center font-bold text-white shadow-sm transition hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500"
    : "inline-flex min-h-11 items-center gap-2 rounded-xl px-2 font-semibold text-blue-800 hover:bg-blue-50 dark:text-blue-200 dark:hover:bg-blue-950";
  return (
    <Link href={href} className={`${classes} ${focusRing}`}>
      {children}
    </Link>
  );
}

function SectionHeading({
  id,
  children,
  icon,
}: {
  id: string;
  children: React.ReactNode;
  icon: React.ReactNode;
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

export function FiscalModelPracticalGuide({
  content,
  guide,
}: {
  content: PublicAeatOfficialModelContentV1;
  guide: FiscalModelPracticalGuideV1;
}) {
  if (content.code !== guide.code) {
    throw new Error(`Guide ${guide.code} cannot render Model ${content.code}`);
  }

  const documentSourceIds = new Set(
    guide.documents.map((document) => document.sourceId),
  );
  const supplementalLinks = [...guide.actions.slice(3), ...guide.officialLinks]
    .filter((item) => !("internalHref" in item && item.internalHref))
    .filter((item) => !item.sourceId || !documentSourceIds.has(item.sourceId))
    .filter((item, index, items) => {
      const key = item.sourceId ?? item.href;
      return (
        items.findIndex(
          (candidate) => (candidate.sourceId ?? candidate.href) === key,
        ) === index
      );
    });

  return (
    <div className="space-y-8">
      <section
        aria-labelledby={`model-${guide.code}-introduction`}
        className="space-y-4"
      >
        <h2 id={`model-${guide.code}-introduction`} className="sr-only">
          Introducción al Modelo {guide.code}
        </h2>
        {guide.intro.map((paragraph) => (
          <p
            key={paragraph}
            className="text-base leading-7 text-slate-700 dark:text-slate-300"
          >
            {paragraph}
          </p>
        ))}
        {guide.notices.map((notice) => (
          <Card
            key={notice.title}
            role="note"
            className="border-amber-200 bg-amber-50/80 dark:border-amber-800 dark:bg-amber-950/40"
          >
            <div className="flex items-start gap-3">
              <AlertTriangle
                className="mt-0.5 h-5 w-5 shrink-0 text-amber-700 dark:text-amber-300"
                aria-hidden="true"
              />
              <div>
                <h3 className="font-bold text-amber-950 dark:text-amber-100">
                  {notice.title}
                </h3>
                {notice.paragraphs.map((paragraph) => (
                  <p
                    key={paragraph}
                    className="mt-1 text-sm leading-6 text-amber-950 dark:text-amber-100"
                  >
                    {paragraph}
                  </p>
                ))}
              </div>
            </div>
          </Card>
        ))}
        <div className="grid gap-3 lg:grid-cols-3">
          {guide.actions.slice(0, 3).map((action) =>
            action.internalHref ? (
              <InternalModelLink
                key={action.label}
                href={action.internalHref}
                prominent={action.primary}
              >
                <Landmark className="h-5 w-5" aria-hidden="true" />
                {action.label}
              </InternalModelLink>
            ) : (
              <ExternalOfficialLink
                key={action.label}
                href={resolveOfficialHref(content, action)}
                prominent={action.primary}
              >
                <Landmark className="h-5 w-5" aria-hidden="true" />
                {action.label}
              </ExternalOfficialLink>
            ),
          )}
        </div>
        <p className="text-center text-xs leading-5 text-slate-500 dark:text-slate-400">
          Los trámites y documentos se abren en la sede oficial que los publica.
          Factu no presenta solicitudes, no firma formularios y no envía datos a
          la Agencia Tributaria.
        </p>
      </section>

      <section
        aria-labelledby={`model-${guide.code}-quick-summary`}
        className="space-y-3"
      >
        <SectionHeading
          id={`model-${guide.code}-quick-summary`}
          icon={<FileCheck2 className="h-5 w-5" />}
        >
          {guide.quickSummaryTitle}
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

      {guide.sections.map((section, index) => (
        <section
          key={section.id}
          aria-labelledby={section.id}
          className="space-y-3"
        >
          <SectionHeading
            id={section.id}
            icon={
              index % 3 === 0 ? (
                <HelpCircle className="h-5 w-5" />
              ) : index % 3 === 1 ? (
                <Users className="h-5 w-5" />
              ) : (
                <ShieldCheck className="h-5 w-5" />
              )
            }
          >
            {section.title}
          </SectionHeading>
          {section.intro?.map((paragraph) => (
            <p
              key={paragraph}
              className="text-sm leading-6 text-slate-700 dark:text-slate-300"
            >
              {paragraph}
            </p>
          ))}
          {section.cards && (
            <div className="grid gap-4 md:grid-cols-2">
              {section.cards.map((card) => (
                <Card
                  key={card.title}
                  className="dark:border-slate-700 dark:bg-slate-900"
                >
                  <h3 className="font-bold text-slate-950 dark:text-slate-100">
                    {card.title}
                  </h3>
                  {card.paragraphs?.map((paragraph) => (
                    <p
                      key={paragraph}
                      className="mt-2 text-sm leading-6 text-slate-700 dark:text-slate-300"
                    >
                      {paragraph}
                    </p>
                  ))}
                  {card.bullets ? <BulletList items={card.bullets} /> : null}
                  {card.links?.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={`mt-3 inline-flex min-h-11 items-center rounded-xl px-2 font-semibold text-blue-800 hover:bg-blue-50 dark:text-blue-200 dark:hover:bg-blue-950 ${focusRing}`}
                    >
                      {link.label}
                    </Link>
                  ))}
                </Card>
              ))}
            </div>
          )}
          {section.note && (
            <p className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm font-semibold leading-6 text-blue-950 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-100">
              {section.note}
            </p>
          )}
          {section.accordions?.map((item) => (
            <details
              key={item.question}
              className="group rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900"
            >
              <summary
                className={`cursor-pointer font-bold text-slate-950 marker:text-blue-700 dark:text-slate-100 ${focusRing}`}
              >
                {item.question}
              </summary>
              {item.paragraphs.map((paragraph) => (
                <p
                  key={paragraph}
                  className="mt-3 text-sm leading-6 text-slate-700 dark:text-slate-300"
                >
                  {paragraph}
                </p>
              ))}
              {item.bullets ? <BulletList items={item.bullets} /> : null}
            </details>
          ))}
        </section>
      ))}

      <section
        aria-labelledby={`model-${guide.code}-fill`}
        className="space-y-3"
      >
        <SectionHeading
          id={`model-${guide.code}-fill`}
          icon={<ListChecks className="h-5 w-5" />}
        >
          {guide.fillingTitle}
        </SectionHeading>
        <ol className="grid gap-4 md:grid-cols-2">
          {guide.fillingSteps.map((step) => (
            <li key={step.title}>
              <Card className="h-full dark:border-slate-700 dark:bg-slate-900">
                <h3 className="font-bold text-slate-950 dark:text-slate-100">
                  {step.title}
                </h3>
                {step.paragraphs.map((paragraph) => (
                  <p
                    key={paragraph}
                    className="mt-2 text-sm leading-6 text-slate-700 dark:text-slate-300"
                  >
                    {paragraph}
                  </p>
                ))}
                {step.bullets ? <BulletList items={step.bullets} /> : null}
              </Card>
            </li>
          ))}
        </ol>
      </section>

      <section
        aria-labelledby={`model-${guide.code}-after`}
        className="space-y-3"
      >
        <SectionHeading
          id={`model-${guide.code}-after`}
          icon={<Clock3 className="h-5 w-5" />}
        >
          {guide.afterTitle}
        </SectionHeading>
        <ol className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {guide.afterSteps.map((step) => (
            <li key={step.title}>
              <Card className="h-full dark:border-slate-700 dark:bg-slate-900">
                <h3 className="font-bold text-slate-950 dark:text-slate-100">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-700 dark:text-slate-300">
                  {step.description}
                </p>
              </Card>
            </li>
          ))}
        </ol>
      </section>

      <section
        aria-labelledby={`model-${guide.code}-comparison`}
        className="space-y-3"
      >
        <SectionHeading
          id={`model-${guide.code}-comparison`}
          icon={<Scale className="h-5 w-5" />}
        >
          {guide.comparison.title}
        </SectionHeading>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card className="dark:border-slate-700 dark:bg-slate-900">
            <h3 className="font-bold text-slate-950 dark:text-slate-100">
              {guide.comparison.current.title}
            </h3>
            <p className="mt-2 text-sm leading-6 text-slate-700 dark:text-slate-300">
              {guide.comparison.current.description}
            </p>
          </Card>
          <Card className="dark:border-slate-700 dark:bg-slate-900">
            <h3 className="font-bold text-slate-950 dark:text-slate-100">
              {guide.comparison.related.title}
            </h3>
            <p className="mt-2 text-sm leading-6 text-slate-700 dark:text-slate-300">
              {guide.comparison.related.description}
            </p>
            <Link
              href={guide.comparison.related.href}
              className={`mt-3 inline-flex min-h-11 items-center rounded-xl px-2 font-semibold text-blue-800 hover:bg-blue-50 dark:text-blue-200 dark:hover:bg-blue-950 ${focusRing}`}
            >
              {guide.comparison.related.label}
            </Link>
          </Card>
          {guide.comparison.additional?.map((item) => (
            <Card
              key={item.href}
              className="dark:border-slate-700 dark:bg-slate-900"
            >
              <h3 className="font-bold text-slate-950 dark:text-slate-100">
                {item.title}
              </h3>
              <p className="mt-2 text-sm leading-6 text-slate-700 dark:text-slate-300">
                {item.description}
              </p>
              <Link
                href={item.href}
                className={`mt-3 inline-flex min-h-11 items-center rounded-xl px-2 font-semibold text-blue-800 hover:bg-blue-50 dark:text-blue-200 dark:hover:bg-blue-950 ${focusRing}`}
              >
                {item.label}
              </Link>
            </Card>
          ))}
        </div>
        <p className="rounded-xl bg-slate-100 p-4 text-sm font-semibold leading-6 text-slate-800 dark:bg-slate-800 dark:text-slate-100">
          {guide.comparison.conclusion}
        </p>
      </section>

      <section
        aria-labelledby={`model-${guide.code}-documents`}
        className="space-y-3"
      >
        <SectionHeading
          id={`model-${guide.code}-documents`}
          icon={<FileText className="h-5 w-5" />}
        >
          Documentos y accesos oficiales
        </SectionHeading>
        <Card
          role="note"
          className="border-amber-200 bg-amber-50/80 dark:border-amber-800 dark:bg-amber-950/40"
        >
          <h3 className="font-bold text-amber-950 dark:text-amber-100">
            {guide.documents.length > 0
              ? "Antes de abrir el PDF"
              : "Antes de utilizar los servicios oficiales"}
          </h3>
          {guide.pdfNotice.map((paragraph) => (
            <p
              key={paragraph}
              className="mt-2 text-sm leading-6 text-amber-950 dark:text-amber-100"
            >
              {paragraph}
            </p>
          ))}
        </Card>
        <div className="grid gap-4 md:grid-cols-2">
          {guide.documents.map((document) => (
            <Card
              key={document.label}
              className="dark:border-slate-700 dark:bg-slate-900"
            >
              <ExternalOfficialLink
                href={resolveOfficialHref(content, document)}
              >
                <Download className="h-4 w-4" aria-hidden="true" />
                {document.label}
              </ExternalOfficialLink>
            </Card>
          ))}
        </div>
        <Card className="dark:border-slate-700 dark:bg-slate-900">
          <h3 className="font-bold text-slate-950 dark:text-slate-100">
            Trámites e información de la AEAT
          </h3>
          <ul className="mt-3 grid gap-2 md:grid-cols-2">
            {supplementalLinks.map((link) => (
              <li key={link.label}>
                <ExternalOfficialLink href={resolveOfficialHref(content, link)}>
                  {link.label}
                </ExternalOfficialLink>
              </li>
            ))}
          </ul>
        </Card>
        {guide.actionGroups?.map((group) => (
          <Card
            key={group.title}
            className="dark:border-slate-700 dark:bg-slate-900"
          >
            <h3 className="font-bold text-slate-950 dark:text-slate-100">
              {group.title}
            </h3>
            {group.description ? (
              <p className="mt-2 text-sm leading-6 text-slate-700 dark:text-slate-300">
                {group.description}
              </p>
            ) : null}
            <ul className="mt-3 grid gap-2 md:grid-cols-2">
              {group.links.map((link) => (
                <li key={link.label}>
                  <ExternalOfficialLink
                    href={resolveOfficialHref(content, link)}
                  >
                    {link.label}
                  </ExternalOfficialLink>
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </section>

      <section
        aria-labelledby={`model-${guide.code}-law`}
        className="space-y-3"
      >
        <SectionHeading
          id={`model-${guide.code}-law`}
          icon={<Landmark className="h-5 w-5" />}
        >
          Normativa
        </SectionHeading>
        <Card className="dark:border-slate-700 dark:bg-slate-900">
          <ul className="grid gap-2 md:grid-cols-2">
            {guide.legalLinks.map((link) => (
              <li key={link.label}>
                <ExternalOfficialLink href={resolveOfficialHref(content, link)}>
                  {link.label}
                </ExternalOfficialLink>
              </li>
            ))}
          </ul>
        </Card>
      </section>

      <section
        aria-labelledby={`model-${guide.code}-faq`}
        className="space-y-3"
      >
        <SectionHeading
          id={`model-${guide.code}-faq`}
          icon={<BookOpenCheck className="h-5 w-5" />}
        >
          Preguntas frecuentes
        </SectionHeading>
        <div className="space-y-3">
          {guide.faq.map((item) => (
            <details
              key={item.question}
              className="group rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900"
            >
              <summary
                className={`cursor-pointer font-bold text-slate-950 marker:text-blue-700 dark:text-slate-100 ${focusRing}`}
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

      <p className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm leading-6 text-blue-950 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-100">
        Información general basada en fuentes oficiales. No determina si el
        modelo corresponde a un caso concreto ni sustituye la información de la
        AEAT o del BOE.
        {guide.lastVerifiedAt ? (
          <>
            {" "}Última comprobación: {guide.lastVerifiedAt}.
            {guide.requiresAnnualReview && guide.effectiveYear
              ? ` Las reglas marcadas para ${guide.effectiveYear} requieren revisión en el ejercicio siguiente.`
              : ""}
          </>
        ) : null}
      </p>
    </div>
  );
}
