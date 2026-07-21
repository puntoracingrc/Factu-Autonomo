"use client";

import { Fragment, useEffect, useId, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowDown,
  ArrowRight,
  CalendarRange,
  CheckCircle2,
  ChevronDown,
  ClipboardCopy,
  FilePlus2,
  FileText,
  Filter,
  FolderKanban,
  Search,
  Trash2,
  TriangleAlert,
  X,
} from "lucide-react";
import { FiscalNotificationDeleteConfirmationModal } from "@/components/fiscal-notifications/FiscalNotificationDeleteConfirmationModal";
import { FiscalNotificationDeleteAllConfirmationModal } from "@/components/fiscal-notifications/FiscalNotificationDeleteAllConfirmationModal";
import { FiscalNotificationLibraryAiAudit } from "@/components/fiscal-notifications/FiscalNotificationLibraryAiAudit";
import {
  FiscalNotificationAuthorityLabel,
  FiscalNotificationDateLabel,
  FiscalNotificationFamilyLabel,
  FiscalNotificationOriginalStatus,
  FiscalNotificationRelationStatus,
  FiscalNotificationReviewStatus,
} from "@/components/fiscal-notifications/FiscalNotificationDocumentVisuals";
import { useFiscalNotificationDocumentDeletion } from "@/components/fiscal-notifications/useFiscalNotificationDocumentDeletion";
import { useFiscalNotificationLibraryClear } from "@/components/fiscal-notifications/useFiscalNotificationLibraryClear";
import { Field, Input, Select } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import {
  EMPTY_FISCAL_NOTIFICATION_DOCUMENT_LIBRARY_FILTERS_V1,
  filterAndSortFiscalNotificationDocumentLibraryGroupsV1,
  relationAtFiscalNotificationDocumentBoundaryV1,
  type FiscalNotificationDocumentLibraryFiltersV1,
  type FiscalNotificationDocumentLibraryGroupV1,
  type FiscalNotificationDocumentLibraryLinkV1,
  type FiscalNotificationDocumentLibraryOrderV1,
  type FiscalNotificationDocumentLibrarySummaryV1,
  type FiscalNotificationDocumentLibraryViewModelV1,
} from "@/lib/fiscal-notifications/structured-review-document-library.v1";

const RECENTLY_SAVED_HIGHLIGHT_MS = 6_000;

export interface FiscalNotificationSessionFileInventoryItem {
  readonly key: string;
  readonly fileName: string;
  readonly documentCount: number;
  readonly documentIds: readonly string[];
}

export function FiscalNotificationDocumentLibrary({
  viewModel,
  ownerScope,
  focusDocumentId,
  sessionFileInventory = [],
  onLibraryCleared,
}: {
  viewModel: FiscalNotificationDocumentLibraryViewModelV1;
  ownerScope: string;
  focusDocumentId?: string | null;
  sessionFileInventory?: readonly FiscalNotificationSessionFileInventoryItem[];
  onLibraryCleared?: () => void;
}) {
  const [filters, setFilters] =
    useState<FiscalNotificationDocumentLibraryFiltersV1>(
      EMPTY_FISCAL_NOTIFICATION_DOCUMENT_LIBRARY_FILTERS_V1,
    );
  const [order, setOrder] =
    useState<FiscalNotificationDocumentLibraryOrderV1>("FIRST_DOCUMENT");
  const [highlightedDocumentId, setHighlightedDocumentId] = useState<
    string | null
  >(null);
  const [relationDetail, setRelationDetail] =
    useState<FiscalNotificationDocumentLibraryLinkV1 | null>(null);
  const today = useMemo(() => localCalendarDate(new Date()), []);
  const focusDocumentExists =
    focusDocumentId !== null &&
    focusDocumentId !== undefined &&
    viewModel.documents.some((document) => document.key === focusDocumentId);
  const deletion = useFiscalNotificationDocumentDeletion({
    ownerScope,
    documents: viewModel.documents,
    onDeleted: (deletedDocumentId) => {
      setRelationDetail(null);
      setHighlightedDocumentId((current) =>
        current === deletedDocumentId ? null : current,
      );
    },
  });
  const clearLibrary = useFiscalNotificationLibraryClear({
    ownerScope,
    documentCount: viewModel.documents.length,
    onCleared: () => {
      setRelationDetail(null);
      setHighlightedDocumentId(null);
      onLibraryCleared?.();
    },
  });
  const sessionFileNamesByDocumentId = useMemo(() => {
    const result = new Map<string, string[]>();
    for (const item of sessionFileInventory) {
      for (const documentId of item.documentIds) {
        result.set(documentId, [
          ...new Set([...(result.get(documentId) ?? []), item.fileName]),
        ]);
      }
    }
    return result;
  }, [sessionFileInventory]);

  const groups = useMemo(() => {
    if (viewModel.status === "BLOCKED") return [];
    return filterAndSortFiscalNotificationDocumentLibraryGroupsV1({
      groups: viewModel.groups,
      filters,
      order,
      today,
    });
  }, [filters, order, today, viewModel]);

  const activeFilterCount = useMemo(
    () =>
      Object.entries(filters).filter(
        ([key, value]) => key !== "query" && value !== "ALL" && value !== "",
      ).length,
    [filters],
  );

  useEffect(() => {
    if (!focusDocumentId) {
      return;
    }
    if (!focusDocumentExists) {
      setHighlightedDocumentId(null);
      return;
    }
    setFilters(EMPTY_FISCAL_NOTIFICATION_DOCUMENT_LIBRARY_FILTERS_V1);
    setHighlightedDocumentId(focusDocumentId);
    const frame = window.requestAnimationFrame(() => {
      document
        .getElementById(documentCardDomId(focusDocumentId))
        ?.scrollIntoView({
          behavior: "smooth",
          block: "center",
          inline: "center",
        });
    });
    const timeout = window.setTimeout(
      () => setHighlightedDocumentId(null),
      RECENTLY_SAVED_HIGHLIGHT_MS,
    );
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timeout);
    };
  }, [focusDocumentExists, focusDocumentId]);

  if (viewModel.status === "BLOCKED") return <BlockedLibrary />;

  return (
    <section className="mt-6" aria-labelledby="notification-library-heading">
      <header className="border-y border-slate-200 bg-white px-4 py-5 sm:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase text-blue-700">
              Documentos y expedientes
            </p>
            <h2
              id="notification-library-heading"
              className="mt-1 text-xl font-bold text-slate-950"
            >
              Tus documentos
            </h2>
          </div>
          <p className="text-xs font-semibold text-slate-500">
            {viewModel.documents.length}{" "}
            {viewModel.documents.length === 1 ? "documento" : "documentos"}
            <span aria-hidden="true"> · </span>
            {viewModel.groups.length}{" "}
            {viewModel.groups.length === 1 ? "expediente" : "expedientes"}
          </p>
        </div>

        {viewModel.documents.length > 0 ? (
          <>
            <LibraryControls
              filters={filters}
              order={order}
              filterOptions={viewModel.filterOptions}
              activeFilterCount={activeFilterCount}
              onFiltersChange={setFilters}
              onOrderChange={setOrder}
            />
            <div className="mt-4 flex justify-end border-t border-slate-200 pt-4">
              <button
                type="button"
                onClick={clearLibrary.request}
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-red-200 bg-white px-3 text-sm font-bold text-red-700 transition hover:bg-red-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
              >
                <Trash2 aria-hidden="true" className="h-4 w-4" />
                Borrar todas las fichas
              </button>
            </div>
            <SessionFileInventory items={sessionFileInventory} />
            <FiscalNotificationLibraryAiAudit
              viewModel={viewModel}
              sessionFileInventory={sessionFileInventory}
            />
          </>
        ) : null}
      </header>

      {highlightedDocumentId ? (
        <p role="status" aria-live="polite" className="sr-only">
          El último documento guardado está destacado en el listado.
        </p>
      ) : null}

      {viewModel.documents.length === 0 ? (
        <EmptyLibrary />
      ) : groups.length === 0 ? (
        <EmptyFilteredLibrary
          onReset={() =>
            setFilters(EMPTY_FISCAL_NOTIFICATION_DOCUMENT_LIBRARY_FILTERS_V1)
          }
        />
      ) : (
        <DocumentGroupList
          groups={groups}
          highlightedDocumentId={highlightedDocumentId}
          sessionFileNamesByDocumentId={sessionFileNamesByDocumentId}
          onDelete={deletion.request}
          onOpenRelation={setRelationDetail}
        />
      )}

      <RelationDetailModal
        relation={relationDetail}
        onClose={() => setRelationDetail(null)}
      />
      <FiscalNotificationDeleteConfirmationModal
        open={deletion.candidate !== null}
        hasDriveOriginal={deletion.hasDriveOriginal}
        busy={deletion.busy}
        error={deletion.error}
        onClose={deletion.close}
        onConfirmLocalOnly={() => void deletion.confirm(false)}
        onConfirmIncludingDrive={() => void deletion.confirm(true)}
      />
      <FiscalNotificationDeleteAllConfirmationModal
        open={clearLibrary.open}
        documentCount={viewModel.documents.length}
        busy={clearLibrary.busy}
        error={clearLibrary.error}
        onClose={clearLibrary.close}
        onConfirm={clearLibrary.confirm}
      />
    </section>
  );
}

function SessionFileInventory({
  items,
}: {
  readonly items: readonly FiscalNotificationSessionFileInventoryItem[];
}) {
  const [copied, setCopied] = useState(false);

  async function copyNames(): Promise<void> {
    if (items.length === 0 || !navigator.clipboard) return;
    await navigator.clipboard.writeText(
      items.map((item) => item.fileName).join("\n"),
    );
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2_000);
  }

  return (
    <section
      className="mt-5 border-t border-slate-200 pt-4"
      aria-labelledby="fiscal-notification-session-files-heading"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3
            id="fiscal-notification-session-files-heading"
            className="text-sm font-bold text-slate-950"
          >
            Archivos guardados en esta sesión
          </h3>
          <p className="mt-1 text-xs font-semibold text-slate-500">
            {items.length}{" "}
            {items.length === 1
              ? "archivo identificado"
              : "archivos identificados"}
          </p>
        </div>
        <button
          type="button"
          disabled={items.length === 0}
          onClick={() => void copyNames()}
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 hover:border-blue-300 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <ClipboardCopy aria-hidden="true" className="h-4 w-4" />
          {copied ? "Lista copiada" : "Copiar nombres"}
        </button>
      </div>
      {items.length > 0 ? (
        <ul className="mt-3 max-h-44 divide-y divide-slate-200 overflow-y-auto border-y border-slate-200">
          {items.map((item, index) => (
            <li
              key={item.key}
              className="grid gap-1 py-2 text-sm sm:grid-cols-[3rem_minmax(0,1fr)_auto] sm:items-center sm:gap-3"
            >
              <span className="text-xs font-bold text-slate-400">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className="min-w-0 break-all font-semibold text-slate-800">
                {item.fileName}
              </span>
              <span className="text-xs font-semibold text-slate-500">
                {item.documentCount}{" "}
                {item.documentCount === 1 ? "ficha" : "fichas"}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 border-l-4 border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          Los nombres anteriores no se conservaron. Aquí aparecerán los archivos
          que guardes sin recargar esta pantalla.
        </p>
      )}
    </section>
  );
}

function LibraryControls({
  filters,
  order,
  filterOptions,
  activeFilterCount,
  onFiltersChange,
  onOrderChange,
}: {
  readonly filters: FiscalNotificationDocumentLibraryFiltersV1;
  readonly order: FiscalNotificationDocumentLibraryOrderV1;
  readonly filterOptions: Extract<
    FiscalNotificationDocumentLibraryViewModelV1,
    { status: "READY" }
  >["filterOptions"];
  readonly activeFilterCount: number;
  readonly onFiltersChange: (
    filters: FiscalNotificationDocumentLibraryFiltersV1,
  ) => void;
  readonly onOrderChange: (
    order: FiscalNotificationDocumentLibraryOrderV1,
  ) => void;
}) {
  function patchFilters(
    patch: Partial<FiscalNotificationDocumentLibraryFiltersV1>,
  ) {
    onFiltersChange(Object.freeze({ ...filters, ...patch }));
  }

  return (
    <div className="mt-5">
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_17rem_auto] lg:items-end">
        <Field label="Buscar">
          <div className="relative">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-3 h-5 w-5 text-slate-400"
            />
            <Input
              value={filters.query}
              onChange={(event) => patchFilters({ query: event.target.value })}
              placeholder="Título, organismo, expediente, modelo o periodo"
              className="pl-10"
            />
          </div>
        </Field>
        <Field label="Ordenar expedientes">
          <Select
            value={order}
            onChange={(event) =>
              onOrderChange(
                event.target.value as FiscalNotificationDocumentLibraryOrderV1,
              )
            }
          >
            <option value="FIRST_DOCUMENT">Por primer documento</option>
            <option value="LAST_DOCUMENT">Por último documento</option>
            <option value="NEWEST">Más reciente</option>
            <option value="OLDEST">Más antiguo</option>
            <option value="NEXT_DEADLINE">Próximo vencimiento</option>
            <option value="PENDING_REVIEW">Pendiente de revisión</option>
          </Select>
        </Field>
        <details className="group relative">
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 marker:hidden hover:border-blue-300 hover:bg-blue-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500">
            <Filter aria-hidden="true" className="h-4 w-4" />
            Filtros
            {activeFilterCount > 0 ? (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-700 px-1.5 text-[10px] font-bold text-white">
                {activeFilterCount}
              </span>
            ) : null}
            <ChevronDown
              aria-hidden="true"
              className="h-4 w-4 transition group-open:rotate-180"
            />
          </summary>
          <div className="mt-3 border-t border-slate-200 pt-4 lg:absolute lg:right-0 lg:z-30 lg:w-[46rem] lg:rounded-md lg:border lg:bg-white lg:p-4 lg:shadow-xl">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <FilterSelect
                label="Familia"
                value={filters.family}
                options={filterOptions.families}
                onChange={(value) => patchFilters({ family: value })}
              />
              <FilterSelect
                label="Organismo"
                value={filters.authority}
                options={filterOptions.authorities}
                onChange={(value) => patchFilters({ authority: value })}
              />
              <FilterSelect
                label="Año"
                value={filters.year}
                options={filterOptions.years}
                onChange={(value) => patchFilters({ year: value })}
              />
              <FilterSelect
                label="Periodo"
                value={filters.period}
                options={filterOptions.periods}
                onChange={(value) => patchFilters({ period: value })}
              />
              <FilterSelect
                label="Revisión"
                value={filters.reviewStatus}
                options={[
                  { value: "PENDING", label: "Pendiente", count: 0 },
                  { value: "REVIEWED", label: "Revisado", count: 0 },
                ]}
                onChange={(value) =>
                  patchFilters({
                    reviewStatus:
                      value as FiscalNotificationDocumentLibraryFiltersV1["reviewStatus"],
                  })
                }
              />
              <FilterSelect
                label="Relaciones"
                value={filters.relation}
                options={[
                  {
                    value: "WITH_RELATIONS",
                    label: "Con relaciones",
                    count: 0,
                  },
                  {
                    value: "WITHOUT_RELATIONS",
                    label: "Sin relaciones",
                    count: 0,
                  },
                  { value: "CONFIRMED", label: "Confirmada", count: 0 },
                  { value: "SUGGESTED", label: "Sugerida", count: 0 },
                ]}
                onChange={(value) =>
                  patchFilters({
                    relation:
                      value as FiscalNotificationDocumentLibraryFiltersV1["relation"],
                  })
                }
              />
              <FilterSelect
                label="Original"
                value={filters.original}
                options={[
                  { value: "DRIVE", label: "En Drive", count: 0 },
                  { value: "UNAVAILABLE", label: "Sin original", count: 0 },
                ]}
                onChange={(value) =>
                  patchFilters({
                    original:
                      value as FiscalNotificationDocumentLibraryFiltersV1["original"],
                  })
                }
              />
              <FilterSelect
                label="Vencimiento"
                value={filters.deadline}
                options={[
                  { value: "UPCOMING", label: "Próximo vencimiento", count: 0 },
                ]}
                onChange={(value) =>
                  patchFilters({
                    deadline:
                      value as FiscalNotificationDocumentLibraryFiltersV1["deadline"],
                  })
                }
              />
            </div>
            {activeFilterCount > 0 ? (
              <button
                type="button"
                onClick={() =>
                  onFiltersChange(
                    EMPTY_FISCAL_NOTIFICATION_DOCUMENT_LIBRARY_FILTERS_V1,
                  )
                }
                className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-md px-3 text-sm font-semibold text-blue-700 hover:bg-blue-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
              >
                <X aria-hidden="true" className="h-4 w-4" />
                Quitar filtros
              </button>
            ) : null}
          </div>
        </details>
      </div>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  readonly label: string;
  readonly value: string;
  readonly options: readonly {
    readonly value: string;
    readonly label: string;
    readonly count: number;
  }[];
  readonly onChange: (value: string) => void;
}) {
  return (
    <Field label={label}>
      <Select value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="ALL">Todos</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
            {option.count > 0 ? ` (${option.count})` : ""}
          </option>
        ))}
      </Select>
    </Field>
  );
}

function DocumentGroupList({
  groups,
  highlightedDocumentId,
  sessionFileNamesByDocumentId,
  onDelete,
  onOpenRelation,
}: {
  readonly groups: readonly FiscalNotificationDocumentLibraryGroupV1[];
  readonly highlightedDocumentId: string | null;
  readonly sessionFileNamesByDocumentId: ReadonlyMap<string, readonly string[]>;
  readonly onDelete: (documentId: string) => void;
  readonly onOpenRelation: (
    relation: FiscalNotificationDocumentLibraryLinkV1,
  ) => void;
}) {
  return (
    <ol className="divide-y divide-slate-200 border-b border-slate-200">
      {groups.map((group) => (
        <li key={group.key} className="bg-slate-50/50 px-4 py-5 sm:px-6">
          <DocumentGroupHeader group={group} />
          <DocumentFlow
            group={group}
            highlightedDocumentId={highlightedDocumentId}
            sessionFileNamesByDocumentId={sessionFileNamesByDocumentId}
            onDelete={onDelete}
            onOpenRelation={onOpenRelation}
          />
        </li>
      ))}
    </ol>
  );
}

function DocumentGroupHeader({
  group,
}: {
  readonly group: FiscalNotificationDocumentLibraryGroupV1;
}) {
  return (
    <header className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <p className="flex items-center gap-2 text-sm font-bold uppercase text-slate-900">
          <CalendarRange aria-hidden="true" className="h-4 w-4 text-blue-600" />
          {group.dateRangeLabel}
        </p>
        {group.primaryReference ? (
          <p className="mt-1 truncate text-xs text-slate-600">
            <span className="font-semibold">
              {group.primaryReference.label}:
            </span>{" "}
            {group.primaryReference.value}
          </p>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
        <span className="inline-flex items-center gap-1.5 font-semibold">
          <FolderKanban aria-hidden="true" className="h-4 w-4 text-slate-500" />
          {group.documents.length}{" "}
          {group.documents.length === 1 ? "documento" : "documentos"}
        </span>
        <FiscalNotificationReviewStatus
          status={group.reviewStatus}
          label={group.reviewStatus === "REVIEWED" ? "Revisado" : "Pendiente"}
          compact
        />
      </div>
    </header>
  );
}

function DocumentFlow({
  group,
  highlightedDocumentId,
  sessionFileNamesByDocumentId,
  onDelete,
  onOpenRelation,
}: {
  readonly group: FiscalNotificationDocumentLibraryGroupV1;
  readonly highlightedDocumentId: string | null;
  readonly sessionFileNamesByDocumentId: ReadonlyMap<string, readonly string[]>;
  readonly onDelete: (documentId: string) => void;
  readonly onOpenRelation: (
    relation: FiscalNotificationDocumentLibraryLinkV1,
  ) => void;
}) {
  return (
    <div
      className="min-w-0 sm:overflow-x-auto sm:pb-2"
      aria-label="Cadena documental ordenada por fecha del documento"
    >
      <ol className="flex min-w-0 flex-col items-stretch sm:min-w-max sm:flex-row">
        {group.summaries.map((summary, index) => {
          const next = group.summaries[index + 1];
          const connector = next
            ? relationAtFiscalNotificationDocumentBoundaryV1(group, index)
            : null;
          return (
            <Fragment key={summary.key}>
              <li className="flex min-w-0 sm:w-[18rem] sm:min-w-[18rem]">
                <DocumentCard
                  summary={summary}
                  highlighted={summary.key === highlightedDocumentId}
                  sourceFileNames={
                    sessionFileNamesByDocumentId.get(summary.key) ?? []
                  }
                  onDelete={onDelete}
                />
              </li>
              {next && connector ? (
                <li className="flex h-20 w-full shrink-0 items-center justify-center sm:h-[21rem] sm:w-28">
                  <RelationConnector
                    relation={connector}
                    onOpen={() => onOpenRelation(connector)}
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
  summary,
  highlighted,
  sourceFileNames,
  onDelete,
}: {
  readonly summary: FiscalNotificationDocumentLibrarySummaryV1;
  readonly highlighted: boolean;
  readonly sourceFileNames: readonly string[];
  readonly onDelete: (documentId: string) => void;
}) {
  return (
    <div
      id={documentCardDomId(summary.key)}
      className="relative h-[21rem] w-full min-w-0 scroll-m-6"
    >
      <Link
        href={documentDetailHref(summary.key)}
        className={`flex h-full min-w-0 flex-col overflow-hidden rounded-lg border bg-white p-4 pr-12 text-left shadow-sm transition hover:border-blue-300 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 ${
          highlighted
            ? "border-emerald-500 bg-emerald-50/40 ring-2 ring-emerald-200"
            : "border-slate-200"
        }`}
        aria-describedby={
          highlighted ? `${documentCardDomId(summary.key)}-saved` : undefined
        }
      >
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-blue-50 text-blue-700">
            <FileText aria-hidden="true" className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <FiscalNotificationFamilyLabel>
              {summary.eyebrowLabel}
            </FiscalNotificationFamilyLabel>
          </div>
        </div>

        <h3 className="mt-3 line-clamp-3 min-h-[4.5rem] break-words text-base font-bold leading-6 text-slate-950">
          {summary.title}
        </h3>

        <div className="mt-2 grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
          <FiscalNotificationAuthorityLabel compact>
            {summary.authorityAbbreviation}
          </FiscalNotificationAuthorityLabel>
          <FiscalNotificationDateLabel
            pending={summary.documentDate === null}
            compact
          >
            {summary.documentDateLabel}
          </FiscalNotificationDateLabel>
        </div>

        {summary.primaryReference ? (
          <p className="mt-2 truncate text-[11px] text-slate-600">
            <span className="font-semibold">
              {summary.primaryReference.label}:
            </span>{" "}
            {summary.primaryReference.value}
          </p>
        ) : null}

        {sourceFileNames.length > 0 ? (
          <p
            className="mt-2 line-clamp-2 break-all text-[11px] text-slate-600"
            title={sourceFileNames.join(" · ")}
          >
            <span className="font-semibold">Archivo:</span>{" "}
            {sourceFileNames.join(" · ")}
          </p>
        ) : null}

        <div className="mt-auto border-t border-slate-100 pt-3">
          <DocumentAmounts summary={summary} />
          <div className="mt-2 flex min-w-0 items-center justify-between gap-2">
            <FiscalNotificationReviewStatus
              status={summary.reviewStatus}
              label={summary.reviewLabel}
              compact
            />
            {summary.originalStatus === "DRIVE" ? (
              <FiscalNotificationOriginalStatus
                status="DRIVE"
                label="En Drive"
                compact
              />
            ) : null}
          </div>
          <p
            id={
              highlighted
                ? `${documentCardDomId(summary.key)}-saved`
                : undefined
            }
            className={`mt-2 inline-flex items-center gap-1.5 text-xs font-bold ${
              highlighted ? "text-emerald-700" : "text-blue-700"
            }`}
          >
            {highlighted ? (
              <CheckCircle2 aria-hidden="true" className="h-3.5 w-3.5" />
            ) : null}
            {highlighted ? "Guardado ahora · Abrir ficha" : "Abrir ficha"}
          </p>
        </div>
      </Link>

      <button
        type="button"
        aria-label={`Eliminar de Factu la ficha ${summary.title}`}
        title="Eliminar ficha de Factu"
        className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:border-red-200 hover:bg-red-50 hover:text-red-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
        onClick={() => onDelete(summary.key)}
      >
        <Trash2 aria-hidden="true" className="h-4 w-4" />
      </button>
    </div>
  );
}

function DocumentAmounts({
  summary,
}: {
  readonly summary: FiscalNotificationDocumentLibrarySummaryV1;
}) {
  if (summary.amounts.length === 0) return null;
  return (
    <dl className="space-y-1">
      {summary.amounts.map((amount) => (
        <div
          key={amount.key}
          className="flex min-w-0 items-baseline justify-between gap-3 text-[11px]"
        >
          <dt className="truncate text-slate-500">{amount.label}</dt>
          <dd className="shrink-0 font-bold text-slate-900">{amount.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function RelationConnector({
  relation,
  onOpen,
}: {
  readonly relation: FiscalNotificationDocumentLibraryLinkV1;
  readonly onOpen: () => void;
}) {
  const confirmed = relation.visualStatus === "CONFIRMED";
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`Consultar relación: ${relation.label}`}
      className="group flex h-full w-full flex-col items-center justify-center gap-2 rounded-md px-2 text-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
    >
      <span
        className={`line-clamp-2 rounded bg-slate-50 px-2 py-1 text-[10px] font-bold leading-4 transition group-hover:bg-blue-50 ${
          confirmed ? "text-emerald-800" : "text-amber-900"
        }`}
      >
        {relation.visualStatus === "SUGGESTED"
          ? "Relación sugerida"
          : relation.label}
      </span>
      <span
        aria-hidden="true"
        className={`relative h-8 border-l-2 sm:h-auto sm:w-full sm:border-l-0 sm:border-t-2 ${
          confirmed ? "border-emerald-500" : "border-dashed border-amber-400"
        }`}
      >
        <ArrowDown className="absolute -bottom-2.5 -left-[0.68rem] h-5 w-5 bg-slate-50 text-slate-500 sm:hidden" />
        <ArrowRight className="absolute -right-2.5 -top-[0.68rem] hidden h-5 w-5 bg-slate-50 text-slate-500 sm:block" />
      </span>
    </button>
  );
}

function RelationDetailModal({
  relation,
  onClose,
}: {
  readonly relation: FiscalNotificationDocumentLibraryLinkV1 | null;
  readonly onClose: () => void;
}) {
  const titleId = useId();
  const descriptionId = useId();
  return (
    <Modal
      open={relation !== null}
      onClose={onClose}
      titleId={titleId}
      descriptionId={descriptionId}
      panelClassName="max-h-[88dvh] w-full max-w-lg overflow-y-auto rounded-lg bg-white shadow-xl"
    >
      {relation ? (
        <div className="p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <FiscalNotificationRelationStatus
                status={relation.visualStatus}
                label={relation.visualStatusLabel}
              />
              <h2
                id={titleId}
                className="mt-3 text-xl font-bold text-slate-950"
              >
                {relation.label}
              </h2>
              <p
                id={descriptionId}
                className="mt-2 text-sm leading-6 text-slate-600"
              >
                {relation.explanation}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar relación"
              title="Cerrar"
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
            >
              <X aria-hidden="true" className="h-5 w-5" />
            </button>
          </div>

          <dl className="mt-5 divide-y divide-slate-200 border-y border-slate-200">
            <RelationDetailRow
              label="Documento origen"
              value={relation.fromDocumentTitle}
            />
            <RelationDetailRow
              label="Documento destino"
              value={relation.toDocumentTitle}
            />
            <RelationDetailRow
              label="Estado"
              value={relation.visualStatusLabel}
            />
          </dl>

          {relation.matches.length > 0 ? (
            <div className="mt-5">
              <h3 className="text-sm font-bold text-slate-950">
                Identificador coincidente
              </h3>
              <dl className="mt-2 divide-y divide-slate-200 border-y border-slate-200">
                {relation.matches.map((match) => (
                  <div key={`${match.label}:${match.value}`} className="py-3">
                    <dt className="text-xs font-semibold text-slate-500">
                      {match.label}
                    </dt>
                    <dd className="mt-1 break-words text-sm font-bold text-slate-900">
                      {match.value}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          ) : null}
        </div>
      ) : null}
    </Modal>
  );
}

function RelationDetailRow({
  label,
  value,
}: {
  readonly label: string;
  readonly value: string;
}) {
  return (
    <div className="grid gap-1 py-3 sm:grid-cols-[9rem_minmax(0,1fr)] sm:gap-4">
      <dt className="text-xs font-semibold text-slate-500">{label}</dt>
      <dd className="break-words text-sm font-bold text-slate-900">{value}</dd>
    </div>
  );
}

function EmptyLibrary() {
  return (
    <div className="flex flex-col items-center border-b border-slate-200 bg-slate-50 px-5 py-12 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-md bg-blue-50 text-blue-700">
        <FilePlus2 aria-hidden="true" className="h-6 w-6" />
      </span>
      <h3 className="mt-4 text-base font-bold text-slate-950">
        Todavía no hay documentos guardados
      </h3>
    </div>
  );
}

function EmptyFilteredLibrary({ onReset }: { readonly onReset: () => void }) {
  return (
    <div className="flex flex-col items-center border-b border-slate-200 bg-slate-50 px-5 py-10 text-center">
      <Search aria-hidden="true" className="h-7 w-7 text-slate-400" />
      <p className="mt-3 text-sm font-semibold text-slate-700">
        No hay expedientes que coincidan con la búsqueda y los filtros.
      </p>
      <button
        type="button"
        onClick={onReset}
        className="mt-3 min-h-10 rounded-md px-3 text-sm font-bold text-blue-700 hover:bg-blue-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
      >
        Quitar filtros
      </button>
    </div>
  );
}

function BlockedLibrary() {
  return (
    <section
      className="mt-6 border-y border-amber-200 bg-amber-50 px-5 py-5"
      role="alert"
    >
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
    </section>
  );
}

function documentCardDomId(documentId: string): string {
  return `fiscal-notification-document-${encodeURIComponent(documentId)}`;
}

function documentDetailHref(documentId: string): string {
  return `/consultor-fiscal/notificaciones?documento=${encodeURIComponent(documentId)}`;
}

function localCalendarDate(date: Date): string {
  return [
    String(date.getFullYear()).padStart(4, "0"),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}
