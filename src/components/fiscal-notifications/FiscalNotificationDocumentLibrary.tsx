"use client";

import { Fragment, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Cloud,
  ExternalLink,
  FileText,
  Search,
  TriangleAlert,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Field, Input, Select } from "@/components/ui/Field";
import { TimelineMonthDivider } from "@/components/ui/TimelineMonthDivider";
import { useAppStore } from "@/context/AppStore";
import {
  projectFiscalNotificationDocumentLibraryV1,
  type FiscalNotificationDocumentLibraryGroupV1,
  type FiscalNotificationDocumentLibraryLinkV1,
  type FiscalNotificationDocumentLibraryViewModelV1,
} from "@/lib/fiscal-notifications/structured-review-document-library.v1";
import { fiscalNotificationDriveFileHrefV1 } from "@/lib/fiscal-notifications/drive-original-archive.v1";
import type { FiscalNotificationStructuredHistoryEntryV1 } from "@/lib/fiscal-notifications/structured-review-history-view-model.v1";

type DocumentGroupOrderV1 = "FIRST_DOCUMENT" | "LATEST_DOCUMENT";

export function FiscalNotificationDocumentLibrary({
  viewModel,
}: {
  viewModel: FiscalNotificationDocumentLibraryViewModelV1;
}) {
  const [query, setQuery] = useState("");
  const [order, setOrder] = useState<DocumentGroupOrderV1>("FIRST_DOCUMENT");

  const groups = useMemo(() => {
    if (viewModel.status === "BLOCKED") return [];
    const normalizedQuery = normalizeSearch(query);
    return viewModel.groups
      .filter(
        (group) =>
          !normalizedQuery ||
          group.documents.some((document) =>
            documentSearchText(document).includes(normalizedQuery),
          ),
      )
      .toSorted((left, right) => {
        const leftKey =
          order === "FIRST_DOCUMENT"
            ? left.firstDocumentChronologyKey
            : left.latestDocumentChronologyKey;
        const rightKey =
          order === "FIRST_DOCUMENT"
            ? right.firstDocumentChronologyKey
            : right.latestDocumentChronologyKey;
        return (
          rightKey.localeCompare(leftKey) || left.key.localeCompare(right.key)
        );
      });
  }, [order, query, viewModel]);

  if (viewModel.status === "BLOCKED") {
    return <BlockedLibrary />;
  }

  return (
    <section className="mt-6" aria-labelledby="notification-library-heading">
      <Card>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2
              id="notification-library-heading"
              className="text-lg font-bold text-slate-950"
            >
              Documentos escaneados y expedientes
            </h2>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
              Cada fila conserva juntos sus documentos relacionados. Dentro de
              la fila se muestran de izquierda a derecha por la fecha que figura
              en el documento, nunca por la fecha de escaneo.
            </p>
          </div>
          <span className="text-xs font-semibold text-slate-500">
            {viewModel.documents.length}{" "}
            {viewModel.documents.length === 1 ? "documento" : "documentos"} ·{" "}
            {viewModel.groups.length}{" "}
            {viewModel.groups.length === 1 ? "fila" : "filas"}
          </span>
        </div>

        {viewModel.documents.length > 0 ? (
          <div className="mt-5 grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(16rem,0.45fr)]">
            <Field label="Buscar documentos">
              <div className="relative">
                <Search
                  aria-hidden="true"
                  className="pointer-events-none absolute left-3 top-3.5 h-5 w-5 text-slate-400"
                />
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Título, organismo, referencia, NIF o importe..."
                  className="pl-10"
                />
              </div>
            </Field>
            <Field label="Ordenar filas por">
              <Select
                value={order}
                onChange={(event) =>
                  setOrder(event.target.value as DocumentGroupOrderV1)
                }
              >
                <option value="FIRST_DOCUMENT">
                  Fecha del primer documento
                </option>
                <option value="LATEST_DOCUMENT">
                  Fecha del último documento
                </option>
              </Select>
            </Field>
          </div>
        ) : null}
      </Card>

      {viewModel.documents.length === 0 ? (
        <Card className="mt-3 text-sm text-slate-600">
          Aún no has guardado ningún documento estructurado en esta cuenta.
        </Card>
      ) : groups.length === 0 ? (
        <Card className="mt-3 text-sm text-slate-600">
          No hay documentos que coincidan con la búsqueda.
        </Card>
      ) : (
        <DocumentGroupList groups={groups} order={order} />
      )}
    </section>
  );
}

export function FiscalNotificationDocumentDetail({
  ownerScope,
  documentId,
}: {
  ownerScope: string;
  documentId: string;
}) {
  const { data, ready } = useAppStore();
  const viewModel = useMemo(
    () =>
      projectFiscalNotificationDocumentLibraryV1(
        data.fiscalNotificationsWorkspace,
        ownerScope,
      ),
    [data.fiscalNotificationsWorkspace, ownerScope],
  );

  if (!ready) {
    return <Card role="status">Cargando la ficha de tu cuenta…</Card>;
  }
  if (viewModel.status === "BLOCKED") return <BlockedLibrary />;

  const document = viewModel.documents.find((item) => item.key === documentId);
  const group = viewModel.groups.find((item) =>
    item.documents.some((candidate) => candidate.key === documentId),
  );
  if (!document || !group) {
    return (
      <Card>
        <h2 className="text-lg font-bold text-slate-950">
          Documento no encontrado
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          No existe una ficha con ese identificador dentro de esta cuenta.
        </p>
        <BackToLibraryLink />
      </Card>
    );
  }

  const links = group.links.filter(
    (link) =>
      link.fromDocumentId === documentId || link.toDocumentId === documentId,
  );

  return (
    <div className="space-y-4">
      <BackToLibraryLink />

      <Card>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wide text-blue-700">
              {document.documentDate
                ? `Fecha del documento · ${formatDocumentDate(document.documentDate)}`
                : "Fecha del documento no disponible"}
            </p>
            <h2 className="mt-1 text-2xl font-bold text-slate-950">
              {document.title}
            </h2>
            <p className="mt-1 font-semibold text-slate-600">
              {document.authority}
            </p>
          </div>
          <span className="inline-flex w-fit rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-900">
            Ficha estructurada guardada
          </span>
        </div>

        <OriginalArchiveStatus document={document} expanded />

        {document.subjectName || document.subjectTaxId ? (
          <dl className="mt-5 grid gap-3 rounded-xl bg-slate-50 p-4 sm:grid-cols-2">
            {document.subjectName ? (
              <Fact label="Obligado al pago" value={document.subjectName} />
            ) : null}
            {document.subjectTaxId ? (
              <Fact label="NIF impreso" value={document.subjectTaxId} />
            ) : null}
          </dl>
        ) : null}

        <DocumentAmounts document={document} expanded />

        {document.installments.length > 0 ? (
          <section className="mt-5" aria-label="Cuotas y vencimientos impresos">
            <h3 className="font-bold text-slate-950">Cuotas y vencimientos</h3>
            <ol className="mt-3 grid gap-3 lg:grid-cols-2">
              {document.installments.map((installment) => (
                <li
                  key={installment.key}
                  className="rounded-xl border border-blue-100 bg-blue-50 p-4"
                >
                  <p className="text-xs font-bold uppercase tracking-wide text-blue-800">
                    {installment.label}
                  </p>
                  <p className="mt-1 text-lg font-bold text-blue-950">
                    {installment.amountCents === null
                      ? "Importe no impreso"
                      : formatMoney(installment.amountCents, "EUR")}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-blue-900">
                    {installment.dueDate
                      ? `Vence ${formatDocumentDate(installment.dueDate)}`
                      : "Vencimiento no impreso"}
                  </p>
                  {installment.components.length > 1 ? (
                    <dl className="mt-3 grid grid-cols-2 gap-2 border-t border-blue-100 pt-3">
                      {installment.components.map((component) => (
                        <Fact
                          key={`${component.label}:${component.amountCents}`}
                          label={component.label}
                          value={formatMoney(component.amountCents, "EUR")}
                        />
                      ))}
                    </dl>
                  ) : null}
                </li>
              ))}
            </ol>
            <p className="mt-3 text-xs leading-5 text-slate-500">
              Son datos impresos guardados para consulta. Ninguna cuota se marca
              como pagada y no se crea automáticamente un gasto o asiento.
            </p>
          </section>
        ) : null}

        {document.references.length > 0 || document.printedDates.length > 0 ? (
          <dl className="mt-5 grid gap-x-6 gap-y-3 border-t border-slate-200 pt-5 sm:grid-cols-2">
            {[...document.references, ...document.printedDates].map((fact) => (
              <Fact
                key={`${fact.label}:${fact.value}`}
                label={fact.label}
                value={fact.value}
              />
            ))}
          </dl>
        ) : null}

        <p className="mt-5 text-xs font-semibold text-slate-500">
          {document.pageCount} páginas · {formatBytes(document.byteLength)} ·
          {document.originalArchive
            ? "original custodiado en tu Google Drive"
            : "original no archivado"}
          {" · "}ficha guardada{" "}
          {formatSavedTimestamp(document.createdAt)}
        </p>
      </Card>

      {group.documents.length > 1 ? (
        <Card aria-labelledby="related-document-flow-heading">
          <h2
            id="related-document-flow-heading"
            className="text-lg font-bold text-slate-950"
          >
            Documentos del mismo expediente
          </h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            La cadena mantiene la misma escala para todos los documentos y se
            ordena de antiguo a nuevo por las fechas del propio expediente.
          </p>
          <div className="mt-4">
            <DocumentFlow group={group} selectedDocumentId={documentId} />
          </div>
        </Card>
      ) : null}

      {links.length > 0 ? (
        <Card aria-labelledby="document-relationship-explanations">
          <h2
            id="document-relationship-explanations"
            className="text-lg font-bold text-slate-950"
          >
            Cómo se relaciona con los demás
          </h2>
          <ul className="mt-4 space-y-3">
            {links.map((link) => (
              <RelationshipExplanation
                key={link.key}
                link={link}
                group={group}
                selectedDocumentId={documentId}
              />
            ))}
          </ul>
        </Card>
      ) : null}
    </div>
  );
}

function DocumentGroupList({
  groups,
  order,
}: {
  groups: readonly FiscalNotificationDocumentLibraryGroupV1[];
  order: DocumentGroupOrderV1;
}) {
  let previousDivider = "";
  return (
    <ol className="mt-3 space-y-3">
      {groups.map((group) => {
        const sortingKey =
          order === "FIRST_DOCUMENT"
            ? group.firstDocumentChronologyKey
            : group.latestDocumentChronologyKey;
        const divider = formatMonthDivider(sortingKey);
        const showDivider = divider !== previousDivider;
        previousDivider = divider;
        return (
          <Fragment key={group.key}>
            {showDivider ? <TimelineMonthDivider label={divider} /> : null}
            <li>
              <Card className="overflow-hidden p-4 sm:p-5">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-slate-950">
                      {group.documents.length > 1
                        ? `Expediente relacionado · ${group.documents.length} documentos`
                        : "Documento independiente"}
                    </h3>
                    <p className="mt-1 text-xs text-slate-500">
                      De izquierda a derecha: documento más antiguo → documento
                      más reciente
                    </p>
                  </div>
                  {group.documents.length > 1 ? (
                    <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-bold text-indigo-800">
                      {group.links.length}{" "}
                      {group.links.length === 1
                        ? "vínculo exacto"
                        : "vínculos exactos"}
                    </span>
                  ) : null}
                </div>
                <DocumentFlow group={group} />
              </Card>
            </li>
          </Fragment>
        );
      })}
    </ol>
  );
}

function DocumentFlow({
  group,
  selectedDocumentId,
}: {
  group: FiscalNotificationDocumentLibraryGroupV1;
  selectedDocumentId?: string;
}) {
  return (
    <div
      className="overflow-x-auto pb-2"
      aria-label="Documentos relacionados ordenados cronológicamente"
    >
      <ol className="flex min-w-max items-stretch gap-3">
        {group.documents.map((document, index) => {
          const next = group.documents[index + 1];
          const connector = next
            ? relationBetween(group.links, document.key, next.key)
            : null;
          return (
            <Fragment key={document.key}>
              <li className="flex">
                <DocumentCard
                  document={document}
                  selected={document.key === selectedDocumentId}
                />
              </li>
              {next ? (
                <li
                  aria-label={
                    connector?.label ?? "Documento posterior relacionado"
                  }
                  className="flex w-28 shrink-0 flex-col items-center justify-center gap-1 text-center"
                >
                  <span className="line-clamp-2 text-[10px] font-bold leading-4 text-indigo-700">
                    {connector?.label ?? "Relacionado"}
                  </span>
                  <ArrowRight
                    aria-hidden="true"
                    className="h-5 w-5 text-indigo-400"
                  />
                </li>
              ) : null}
            </Fragment>
          );
        })}
      </ol>
    </div>
  );
}

function DocumentCard({
  document,
  selected,
}: {
  document: FiscalNotificationStructuredHistoryEntryV1;
  selected: boolean;
}) {
  return (
    <Link
      href={documentDetailHref(document.key)}
      aria-current={selected ? "page" : undefined}
      className={`flex h-[16rem] w-[18rem] min-w-[18rem] flex-col overflow-hidden rounded-2xl border bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 ${
        selected ? "border-blue-500 ring-2 ring-blue-200" : "border-slate-200"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
          <FileText aria-hidden="true" className="h-5 w-5" />
        </span>
        {document.originalArchive ? (
          <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-bold text-emerald-900">
            Original en Drive
          </span>
        ) : (
          <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-bold text-amber-900">
            Solo ficha
          </span>
        )}
      </div>
      <p className="mt-4 text-xs font-bold uppercase tracking-wide text-blue-700">
        {document.documentDate
          ? formatDocumentDate(document.documentDate)
          : "Sin fecha impresa"}
      </p>
      <h4 className="mt-1 line-clamp-3 text-base font-bold leading-5 text-slate-950">
        {document.title}
      </h4>
      <p className="mt-2 line-clamp-2 text-xs font-semibold leading-5 text-slate-500">
        {document.authority}
      </p>
      <div className="mt-auto pt-4">
        <DocumentAmounts document={document} />
        <p className="mt-3 text-xs font-bold text-blue-700">
          Abrir ficha completa →
        </p>
      </div>
    </Link>
  );
}

function OriginalArchiveStatus({
  document,
  expanded = false,
}: {
  document: FiscalNotificationStructuredHistoryEntryV1;
  expanded?: boolean;
}) {
  const href = document.originalArchive
    ? fiscalNotificationDriveFileHrefV1(document.originalArchive.driveFileId)
    : null;
  if (!document.originalArchive) {
    return expanded ? (
      <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4">
        <p className="font-bold text-amber-950">Original no archivado</p>
        <p className="mt-1 text-sm leading-6 text-amber-900">
          Factu conserva esta ficha, pero no el PDF. Vuelve a seleccionar el
          documento en el escáner para poder archivarlo voluntariamente en tu
          Google Drive.
        </p>
      </div>
    ) : null;
  }
  return expanded ? (
    <div className="mt-5 flex flex-col gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="flex items-center gap-2 font-bold text-emerald-950">
          <Cloud aria-hidden="true" className="h-5 w-5" />
          Original archivado en tu Google Drive
        </p>
        <p className="mt-1 text-sm leading-6 text-emerald-900">
          Factu solo conserva el identificador, la huella y la verificación del
          archivo. El original permanece bajo tu custodia.
        </p>
      </div>
      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 text-sm font-bold text-white transition hover:bg-emerald-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
        >
          Abrir o descargar
          <ExternalLink aria-hidden="true" className="h-4 w-4" />
        </a>
      ) : null}
    </div>
  ) : null;
}

function DocumentAmounts({
  document,
  expanded = false,
}: {
  document: FiscalNotificationStructuredHistoryEntryV1;
  expanded?: boolean;
}) {
  if (document.money.length === 0) {
    return expanded ? (
      <p className="mt-5 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
        Este documento no contiene importes estructurados guardados.
      </p>
    ) : (
      <p className="text-xs text-slate-500">Sin importes impresos guardados</p>
    );
  }
  const facts = expanded ? document.money : document.money.slice(0, 2);
  return (
    <dl
      className={`${expanded ? "mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3" : "space-y-1.5"}`}
    >
      {facts.map((fact) => (
        <div
          key={fact.key}
          className={
            expanded
              ? "rounded-xl border border-blue-100 bg-blue-50 p-4"
              : "flex items-baseline justify-between gap-3 text-xs"
          }
        >
          <dt
            className={
              expanded ? "font-bold text-blue-800" : "truncate text-slate-500"
            }
          >
            {fact.label}
          </dt>
          <dd
            className={
              expanded
                ? "mt-1 text-lg font-bold text-blue-950"
                : "shrink-0 font-bold text-slate-900"
            }
          >
            {formatMoney(fact.amountCents, fact.currency)}
          </dd>
          {expanded && fact.sourceReference ? (
            <dd className="mt-1 break-all text-xs font-semibold text-blue-800">
              Referencia: {fact.sourceReference}
            </dd>
          ) : null}
        </div>
      ))}
      {!expanded && document.money.length > 2 ? (
        <div className="text-xs font-semibold text-slate-500">
          +{document.money.length - 2} importes en la ficha
        </div>
      ) : null}
    </dl>
  );
}

function RelationshipExplanation({
  link,
  group,
  selectedDocumentId,
}: {
  link: FiscalNotificationDocumentLibraryLinkV1;
  group: FiscalNotificationDocumentLibraryGroupV1;
  selectedDocumentId: string;
}) {
  const from = group.documents.find((item) => item.key === link.fromDocumentId);
  const to = group.documents.find((item) => item.key === link.toDocumentId);
  if (!from || !to) return null;
  const direction =
    link.fromDocumentId === selectedDocumentId
      ? "Documento siguiente"
      : "Documento anterior";
  const related = link.fromDocumentId === selectedDocumentId ? to : from;
  return (
    <li className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-bold uppercase tracking-wide text-indigo-800">
          {direction} · {link.label}
        </p>
        <Link
          href={documentDetailHref(related.key)}
          className="text-xs font-bold text-blue-700 hover:underline"
        >
          Abrir {related.title}
        </Link>
      </div>
      <p className="mt-2 font-bold text-slate-950">
        {from.title} → {to.title}
      </p>
      <p className="mt-2 text-sm leading-6 text-slate-700">
        {link.explanation}
      </p>
      {link.matches.length > 0 ? (
        <dl className="mt-3 grid gap-2 sm:grid-cols-2">
          {link.matches.map((match) => (
            <Fact
              key={`${match.label}:${match.value}`}
              label={match.label}
              value={match.value}
            />
          ))}
        </dl>
      ) : null}
    </li>
  );
}

function BlockedLibrary() {
  return (
    <Card className="mt-6 border-amber-200 bg-amber-50" role="alert">
      <div className="flex items-start gap-3">
        <TriangleAlert
          aria-hidden="true"
          className="mt-0.5 h-5 w-5 shrink-0 text-amber-700"
        />
        <div>
          <h2 className="font-bold text-amber-950">
            Expediente estructurado no disponible
          </h2>
          <p className="mt-1 text-sm leading-6 text-amber-900">
            Los datos guardados no superan la validación de integridad de esta
            cuenta. No se muestran relaciones parciales ni se modifica ninguna
            ficha.
          </p>
        </div>
      </div>
    </Card>
  );
}

function BackToLibraryLink() {
  return (
    <Link
      href="/consultor-fiscal/notificaciones#documentos-guardados"
      className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
    >
      <ArrowLeft aria-hidden="true" className="h-4 w-4" />
      Volver a documentos escaneados
    </Link>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-bold uppercase tracking-wide text-slate-500">
        {label}
      </dt>
      <dd className="mt-1 break-words font-semibold text-slate-900">{value}</dd>
    </div>
  );
}

function relationBetween(
  links: readonly FiscalNotificationDocumentLibraryLinkV1[],
  leftId: string,
  rightId: string,
): FiscalNotificationDocumentLibraryLinkV1 | null {
  return (
    links.find(
      (link) =>
        (link.fromDocumentId === leftId && link.toDocumentId === rightId) ||
        (link.fromDocumentId === rightId && link.toDocumentId === leftId),
    ) ?? null
  );
}

function documentDetailHref(documentId: string): string {
  return `/consultor-fiscal/notificaciones?documento=${encodeURIComponent(documentId)}`;
}

function documentSearchText(
  document: FiscalNotificationStructuredHistoryEntryV1,
): string {
  return normalizeSearch(
    [
      document.title,
      document.authority,
      document.documentDate ?? "",
      document.subjectName ?? "",
      document.subjectTaxId ?? "",
      ...document.references.flatMap((item) => [item.label, item.value]),
      ...document.money.flatMap((item) => [
        item.label,
        String(item.amountCents),
        formatMoney(item.amountCents, item.currency),
      ]),
    ].join(" "),
  );
}

function normalizeSearch(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es-ES")
    .trim();
}

function formatDocumentDate(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : value;
}

function formatMonthDivider(value: string): string {
  const date = value.slice(0, 10);
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) return "Sin fecha del documento";
  const label = new Intl.DateTimeFormat("es-ES", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00.000Z`));
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function formatMoney(amountCents: number, currency: "EUR" | "UNKNOWN"): string {
  if (currency === "UNKNOWN") {
    return `${(amountCents / 100).toLocaleString("es-ES", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} · moneda no indicada`;
  }
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
  }).format(amountCents / 100);
}

function formatSavedTimestamp(value: string): string {
  return new Intl.DateTimeFormat("es-ES", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatBytes(value: number): string {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`;
  return `${(value / (1024 * 1024)).toLocaleString("es-ES", {
    maximumFractionDigits: 1,
  })} MB`;
}
