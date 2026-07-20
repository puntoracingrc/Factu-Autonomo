"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  FileText,
  Search,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import { FiscalNotificationDeleteConfirmationModal } from "@/components/fiscal-notifications/FiscalNotificationDeleteConfirmationModal";
import { useFiscalNotificationDocumentDeletion } from "@/components/fiscal-notifications/useFiscalNotificationDocumentDeletion";
import { Card } from "@/components/ui/Card";
import { Field, Input, Select } from "@/components/ui/Field";
import { TimelineMonthDivider } from "@/components/ui/TimelineMonthDivider";
import {
  type FiscalNotificationDocumentLibraryGroupV1,
  type FiscalNotificationDocumentLibraryLinkV1,
  type FiscalNotificationDocumentLibraryViewModelV1,
} from "@/lib/fiscal-notifications/structured-review-document-library.v1";
import type { FiscalNotificationStructuredHistoryEntryV1 } from "@/lib/fiscal-notifications/structured-review-history-view-model.v1";

type DocumentGroupOrderV1 = "FIRST_DOCUMENT" | "LATEST_DOCUMENT";

export function FiscalNotificationDocumentLibrary({
  viewModel,
  ownerScope,
  focusDocumentId,
}: {
  viewModel: FiscalNotificationDocumentLibraryViewModelV1;
  ownerScope: string;
  focusDocumentId?: string | null;
}) {
  const [query, setQuery] = useState("");
  const [order, setOrder] = useState<DocumentGroupOrderV1>("FIRST_DOCUMENT");
  const deletion = useFiscalNotificationDocumentDeletion({
    ownerScope,
    documents: viewModel.documents,
    onDeleted: () => setQuery(""),
  });

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

  useEffect(() => {
    if (
      !focusDocumentId ||
      !viewModel.documents.some((document) => document.key === focusDocumentId)
    ) {
      return;
    }
    if (query !== "") {
      setQuery("");
      return;
    }
    const frame = window.requestAnimationFrame(() => {
      document
        .getElementById(documentCardDomId(focusDocumentId))
        ?.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [focusDocumentId, query, viewModel.documents]);
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
              Tus documentos
            </h2>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
              Los documentos relacionados aparecen juntos y ordenados por su
              fecha.
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
                  placeholder="Título, organismo, referencia o importe..."
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
          Aún no has guardado ningún documento.
        </Card>
      ) : groups.length === 0 ? (
        <Card className="mt-3 text-sm text-slate-600">
          No hay documentos que coincidan con la búsqueda.
        </Card>
      ) : (
        <DocumentGroupList
          groups={groups}
          recentlySavedDocumentId={focusDocumentId}
          onDelete={deletion.request}
        />
      )}
      <FiscalNotificationDeleteConfirmationModal
        open={deletion.candidate !== null}
        hasDriveOriginal={deletion.hasDriveOriginal}
        busy={deletion.busy}
        error={deletion.error}
        onClose={deletion.close}
        onConfirmLocalOnly={() => void deletion.confirm(false)}
        onConfirmIncludingDrive={() => void deletion.confirm(true)}
      />
    </section>
  );
}

function DocumentGroupList({
  groups,
  recentlySavedDocumentId,
  onDelete,
}: {
  groups: readonly FiscalNotificationDocumentLibraryGroupV1[];
  recentlySavedDocumentId?: string | null;
  onDelete: (documentId: string) => void;
}) {
  return (
    <ol className="mt-3 space-y-3">
      {groups.map((group) => {
        return (
          <Fragment key={group.key}>
            <TimelineMonthDivider label={formatGroupMonthSequence(group)} />
            <li>
              <Card className="overflow-hidden p-4 sm:p-5">
                {group.documents.length > 1 ? (
                  <div className="mb-3 flex justify-end">
                    <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-bold text-indigo-800">
                      {group.links.length}{" "}
                      {group.links.length === 1
                        ? "vínculo exacto"
                        : "vínculos exactos"}
                    </span>
                  </div>
                ) : null}
                <DocumentFlow
                  group={group}
                  recentlySavedDocumentId={recentlySavedDocumentId}
                  onDelete={onDelete}
                />
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
  recentlySavedDocumentId,
  onDelete,
}: {
  group: FiscalNotificationDocumentLibraryGroupV1;
  selectedDocumentId?: string;
  recentlySavedDocumentId?: string | null;
  onDelete?: (documentId: string) => void;
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
                  recentlySaved={document.key === recentlySavedDocumentId}
                  onDelete={onDelete}
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
  recentlySaved,
  onDelete,
}: {
  document: FiscalNotificationStructuredHistoryEntryV1;
  selected: boolean;
  recentlySaved: boolean;
  onDelete?: (documentId: string) => void;
}) {
  return (
    <div
      id={documentCardDomId(document.key)}
      className="relative h-[16rem] w-[18rem] min-w-[18rem] scroll-m-6"
    >
      <Link
        href={documentDetailHref(document.key)}
        aria-current={selected ? "page" : undefined}
        className={`flex h-full w-full flex-col overflow-hidden rounded-2xl border bg-white p-4 pr-12 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 ${
          recentlySaved
            ? "border-emerald-500 ring-2 ring-emerald-200"
            : selected
              ? "border-blue-500 ring-2 ring-blue-200"
              : "border-slate-200"
        }`}
      >
        <div className="flex flex-wrap items-start gap-2">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
            <FileText aria-hidden="true" className="h-5 w-5" />
          </span>
          <span className="rounded-full bg-blue-100 px-2.5 py-1 text-[10px] font-bold text-blue-900">
            {abbreviateAuthority(document.authority)}
          </span>
          {recentlySaved ? (
            <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-bold text-emerald-900">
              Guardado ahora
            </span>
          ) : null}
        </div>
        <h4 className="mt-4 line-clamp-4 text-lg font-bold leading-6 text-slate-950">
          {document.title}
        </h4>
        {document.documentDate ? (
          <p className="mt-2 flex items-center gap-1.5 text-xs font-bold text-slate-600">
            <CalendarDays
              aria-hidden="true"
              className="h-4 w-4 text-blue-600"
            />
            {formatDocumentDate(document.documentDate)}
          </p>
        ) : null}
        <div className="mt-auto pt-4">
          <DocumentAmounts document={document} />
          <p className="mt-3 text-xs font-bold text-blue-700">
            Abrir ficha completa →
          </p>
        </div>
      </Link>
      {onDelete ? (
        <button
          type="button"
          aria-label={`Eliminar de Factu la ficha ${document.title}`}
          title="Eliminar ficha de Factu"
          className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:border-red-200 hover:bg-red-50 hover:text-red-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
          onClick={() => onDelete(document.key)}
        >
          <Trash2 aria-hidden="true" className="h-4 w-4" />
        </button>
      ) : null}
    </div>
  );
}

function documentCardDomId(documentId: string): string {
  return `fiscal-notification-document-${encodeURIComponent(documentId)}`;
}

function DocumentAmounts({
  document,
}: {
  document: FiscalNotificationStructuredHistoryEntryV1;
}) {
  if (document.money.length === 0) return null;
  const facts = document.money.slice(0, 2);
  return (
    <dl className="space-y-1.5">
      {facts.map((fact) => (
        <div
          key={fact.key}
          className="flex items-baseline justify-between gap-3 text-xs"
        >
          <dt className="truncate text-slate-500">
            {fact.label}
          </dt>
          <dd className="shrink-0 font-bold text-slate-900">
            {formatMoney(fact.amountCents, fact.currency)}
          </dd>
        </div>
      ))}
      {document.money.length > 2 ? (
        <div className="text-xs font-semibold text-slate-500">
          +{document.money.length - 2} importes en la ficha
        </div>
      ) : null}
    </dl>
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
  if (!match) return "Fecha pendiente";
  const label = new Intl.DateTimeFormat("es-ES", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00.000Z`));
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function formatGroupMonthSequence(
  group: FiscalNotificationDocumentLibraryGroupV1,
): string {
  const labels = group.documents.map((document) =>
    document.documentDate
      ? formatMonthDivider(`${document.documentDate}T00:00:00.000Z`)
      : "Fecha pendiente",
  );
  return labels
    .filter((label, index) => labels[index - 1] !== label)
    .join(" → ");
}

function abbreviateAuthority(value: string): string {
  const normalized = normalizeSearch(value);
  if (
    normalized.includes("agencia estatal de administracion tributaria") ||
    normalized === "agencia tributaria" ||
    normalized === "aeat"
  ) {
    return "AEAT";
  }
  if (
    normalized.includes("boletin oficial del estado") ||
    normalized === "boe"
  ) {
    return "BOE";
  }
  if (normalized.includes("tesoreria general de la seguridad social")) {
    return "TGSS";
  }
  const initials = value
    .split(/\s+/u)
    .filter((word) => !/^(?:de|del|la|las|el|los|y|e)$/iu.test(word))
    .map((word) => word[0]?.toLocaleUpperCase("es-ES") ?? "")
    .join("")
    .slice(0, 8);
  return initials || "Organismo";
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
