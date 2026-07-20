"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useMemo, useState, type ReactNode } from "react";
import {
  ArrowLeft,
  BookOpen,
  CalendarDays,
  ChevronDown,
  Clock3,
  Cloud,
  ExternalLink,
  FileSearch,
  FileText,
  Link2,
  ListChecks,
  MoreVertical,
  Scale,
  Trash2,
  X,
} from "lucide-react";
import { FiscalNotificationDeleteConfirmationModal } from "@/components/fiscal-notifications/FiscalNotificationDeleteConfirmationModal";
import {
  FiscalNotificationAuthorityLabel,
  FiscalNotificationDateLabel,
  FiscalNotificationFamilyLabel,
  FiscalNotificationOriginalStatus,
  FiscalNotificationReviewStatus,
} from "@/components/fiscal-notifications/FiscalNotificationDocumentVisuals";
import { useFiscalNotificationDocumentDeletion } from "@/components/fiscal-notifications/useFiscalNotificationDocumentDeletion";
import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { useAppStore } from "@/context/AppStore";
import { fiscalNotificationDriveFileHrefV1 } from "@/lib/fiscal-notifications/drive-original-archive.v1";
import {
  projectFiscalNotificationDocumentDetailV1,
  type FiscalNotificationDetailEconomyV1,
  type FiscalNotificationDetailFactGroupV1,
  type FiscalNotificationDetailProvenanceV1,
  type FiscalNotificationDocumentDetailViewModelV1,
} from "@/lib/fiscal-notifications/structured-review-document-detail.v1";
import { projectFiscalNotificationDocumentLibraryV1 } from "@/lib/fiscal-notifications/structured-review-document-library.v1";

type ProvenanceSelection = Omit<
  FiscalNotificationDetailProvenanceV1,
  "pageNumber"
> & {
  readonly pageNumbers: readonly number[];
};

export function FiscalNotificationDocumentDetail({
  ownerScope,
  documentId,
}: {
  ownerScope: string;
  documentId: string;
}) {
  const router = useRouter();
  const { data, ready } = useAppStore();
  const library = useMemo(
    () =>
      projectFiscalNotificationDocumentLibraryV1(
        data.fiscalNotificationsWorkspace,
        ownerScope,
      ),
    [data.fiscalNotificationsWorkspace, ownerScope],
  );
  const documents = library.status === "READY" ? library.documents : [];
  const deletion = useFiscalNotificationDocumentDeletion({
    ownerScope,
    documents,
    onDeleted: () => {
      router.replace(
        "/consultor-fiscal/notificaciones#documentos-guardados",
      );
    },
  });

  if (!ready) {
    return <Card role="status">Cargando la ficha de tu cuenta…</Card>;
  }
  if (library.status === "BLOCKED") return <BlockedDetail />;

  const document = library.documents.find((item) => item.key === documentId);
  const group = library.groups.find((item) =>
    item.documents.some((candidate) => candidate.key === documentId),
  );
  if (!document || !group) {
    return <MissingDetail />;
  }
  const detail = projectFiscalNotificationDocumentDetailV1({
    document,
    group,
    allDocuments: library.documents,
  });

  return (
    <>
      <FiscalNotificationDocumentReport
        detail={detail}
        onDelete={() => deletion.request(documentId)}
        onNavigateAct={(nextDocumentId) =>
          router.push(documentDetailHref(nextDocumentId))
        }
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
    </>
  );
}

export function FiscalNotificationDocumentReport({
  detail,
  onDelete,
  onNavigateAct,
}: {
  readonly detail: FiscalNotificationDocumentDetailViewModelV1;
  readonly onDelete: () => void;
  readonly onNavigateAct: (documentId: string) => void;
}) {
  const [provenance, setProvenance] = useState<ProvenanceSelection | null>(null);
  const driveHref = detail.actions.driveFileId
    ? fiscalNotificationDriveFileHrefV1(detail.actions.driveFileId)
    : null;

  return (
    <div className="min-w-0 pb-8">
      <DocumentActionBar
        driveHref={driveHref}
        onDelete={onDelete}
      />

      <article className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <DocumentHeader
          detail={detail}
          driveHref={driveHref}
          onShowProvenance={(item) =>
            setProvenance({
              ...item,
              pageNumbers: [item.pageNumber],
            })
          }
          onNavigateAct={onNavigateAct}
        />

        {detail.factGroups.length > 0 ? (
          <ReportSection
            number="2"
            title="Lo que dice el documento"
            subtitle="Datos impresos, ordenados por su función dentro del acto."
            tone="blue"
          >
            <div className="divide-y divide-slate-200 border-y border-slate-200">
              {detail.factGroups.map((group) => (
                <FactGroup
                  key={group.id}
                  group={group}
                  onShowProvenance={(item) =>
                    setProvenance({
                      ...item,
                      pageNumbers: [item.pageNumber],
                    })
                  }
                />
              ))}
            </div>
          </ReportSection>
        ) : null}

        {detail.economy ? (
          <ReportSection
            number="3"
            title="Importes y tablas"
            subtitle="Cantidades que constan en el documento, sin crear saldos ni pagos."
            tone="emerald"
          >
            <EconomySection
              economy={detail.economy}
              onShowProvenance={setProvenance}
            />
          </ReportSection>
        ) : null}

        <ReportSection
          number="4"
          title="Qué significa y qué debes revisar"
          subtitle="El contenido impreso y la explicación de Factu se mantienen separados."
          tone="amber"
        >
          <ExplanationSection detail={detail} />
        </ReportSection>

        {detail.connections ? (
          <ReportSection
            number="5"
            title="Relaciones, cronología y fuentes"
            subtitle="Vínculos por identificadores fuertes y contexto oficial del motor local."
            tone="violet"
          >
            <ConnectionsSection detail={detail} />
          </ReportSection>
        ) : null}
      </article>

      <ProvenancePanel
        selection={provenance}
        driveHref={driveHref}
        onClose={() => setProvenance(null)}
      />
    </div>
  );
}

function DocumentActionBar({
  driveHref,
  onDelete,
}: {
  readonly driveHref: string | null;
  readonly onDelete: () => void;
}) {
  return (
    <nav
      aria-label="Acciones de la ficha"
      className="mb-3 flex min-h-11 items-center justify-between gap-3"
    >
      <Link
        href="/consultor-fiscal/notificaciones#documentos-guardados"
        className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-blue-700 hover:text-blue-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
      >
        <ArrowLeft aria-hidden="true" className="h-4 w-4" />
        Volver a documentos
      </Link>

      <div className="hidden items-center gap-2 sm:flex">
        {driveHref ? (
          <a
            href={driveHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-10 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
          >
            <Cloud aria-hidden="true" className="h-4 w-4" />
            Abrir original en Drive
          </a>
        ) : null}
        <button
          type="button"
          onClick={onDelete}
          className="inline-flex min-h-10 items-center gap-2 rounded-md border border-red-200 bg-white px-3 text-sm font-semibold text-red-700 shadow-sm hover:bg-red-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
        >
          <Trash2 aria-hidden="true" className="h-4 w-4" />
          Eliminar esta ficha
        </button>
      </div>

      <details className="group relative sm:hidden">
        <summary
          aria-label="Más acciones"
          title="Más acciones"
          className="flex h-10 w-10 cursor-pointer list-none items-center justify-center rounded-md border border-slate-200 bg-white text-slate-700 shadow-sm marker:hidden focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
        >
          <MoreVertical aria-hidden="true" className="h-5 w-5" />
        </summary>
        <div className="absolute right-0 z-20 mt-2 w-64 overflow-hidden rounded-md border border-slate-200 bg-white py-1 shadow-lg">
          {driveHref ? (
            <a
              href={driveHref}
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-h-11 items-center gap-3 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              <Cloud aria-hidden="true" className="h-4 w-4" />
              Abrir original en Drive
            </a>
          ) : null}
          <button
            type="button"
            onClick={onDelete}
            className="flex min-h-11 w-full items-center gap-3 px-4 text-left text-sm font-semibold text-red-700 hover:bg-red-50"
          >
            <Trash2 aria-hidden="true" className="h-4 w-4" />
            Eliminar esta ficha
          </button>
        </div>
      </details>
    </nav>
  );
}

function DocumentHeader({
  detail,
  driveHref,
  onShowProvenance,
  onNavigateAct,
}: {
  readonly detail: FiscalNotificationDocumentDetailViewModelV1;
  readonly driveHref: string | null;
  readonly onShowProvenance: (
    provenance: FiscalNotificationDetailProvenanceV1,
  ) => void;
  readonly onNavigateAct: (documentId: string) => void;
}) {
  const { header } = detail;
  return (
    <header className="relative px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_15rem] lg:items-start">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-xs font-bold uppercase text-blue-700">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-700 text-white">
              1
            </span>
            <span>{header.categoryLabel}</span>
            <span aria-hidden="true" className="text-slate-300">/</span>
            <FiscalNotificationFamilyLabel>
              {header.familyLabel}
            </FiscalNotificationFamilyLabel>
          </div>
          <div className="mt-4 flex items-start gap-3 sm:gap-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-blue-50 text-blue-700 sm:h-12 sm:w-12">
              <FileText aria-hidden="true" className="h-6 w-6" />
            </span>
            <div className="min-w-0">
              <h1 className="break-words text-2xl font-bold leading-tight text-slate-950 sm:text-3xl">
                {header.title}
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 sm:text-base">
                {header.description}
              </p>
              {header.literalTitle ? (
                <p className="mt-2 text-sm text-slate-500">
                  <span className="font-semibold text-slate-700">Título impreso:</span>{" "}
                  {header.literalTitle}
                </p>
              ) : null}
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-700">
            <FiscalNotificationAuthorityLabel>
              {header.authority}
            </FiscalNotificationAuthorityLabel>
            {header.issuingUnit ? (
              <span className="text-slate-600">{header.issuingUnit}</span>
            ) : null}
          </div>
        </div>

        <div className="border-t border-slate-200 pt-4 lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0">
          <FiscalNotificationDateLabel
            pending={header.primaryDateValue === "No identificada"}
            compact
          >
            {header.primaryDateLabel}
          </FiscalNotificationDateLabel>
          <div className="mt-1 flex items-start justify-between gap-2">
            <p className="text-2xl font-bold text-slate-950">
              {header.primaryDateValue}
            </p>
            {header.primaryDateProvenance ? (
              <ProvenanceButton
                label={header.primaryDateLabel}
                onClick={() =>
                  onShowProvenance(header.primaryDateProvenance!)
                }
              />
            ) : null}
          </div>
          <div className="mt-4 space-y-2 text-xs font-semibold">
            <p>
              <FiscalNotificationReviewStatus
                status={header.reviewStatus}
                label={header.reviewLabel}
              />
            </p>
            <p>
              <FiscalNotificationOriginalStatus
                status={driveHref ? "DRIVE" : "UNAVAILABLE"}
                label={header.originalLabel}
              />
            </p>
          </div>
        </div>
      </div>

      <dl className="mt-6 grid gap-px border-y border-slate-200 bg-slate-200 sm:grid-cols-2 lg:grid-cols-6">
        <div className="min-w-0 bg-white px-3 py-3 sm:pl-0">
          <dt className="text-xs font-semibold text-slate-500">Tipo</dt>
          <dd className="mt-1 break-words text-sm font-bold text-slate-900">
            {header.typeLabel}
          </dd>
        </div>
        {header.metadata.map((item, index) => (
          <div
            key={item.key}
            className={`min-w-0 bg-white px-3 py-3 ${index === header.metadata.length - 1 ? "sm:pr-0" : ""}`}
          >
            <dt className="text-xs font-semibold text-slate-500">{item.label}</dt>
            <dd className="mt-1 break-words text-sm font-bold text-slate-900">
              {item.value}
            </dd>
          </div>
        ))}
      </dl>

      {detail.siblingActs.length > 1 ? (
        <div className="mt-5 flex flex-col gap-2 border-l-2 border-indigo-300 pl-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-bold text-slate-900">Actos del mismo original</p>
            <p className="text-xs text-slate-500">
              {detail.siblingActs.length} fichas conservan sus páginas y datos separados.
            </p>
          </div>
          <select
            aria-label="Seleccionar acto del mismo original"
            value={detail.documentId}
            onChange={(event) => onNavigateAct(event.target.value)}
            className="min-h-11 min-w-0 rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 sm:max-w-sm"
          >
            {detail.siblingActs.map((act) => (
              <option key={act.documentId} value={act.documentId}>
                {act.title}
              </option>
            ))}
          </select>
        </div>
      ) : null}
    </header>
  );
}

function ReportSection({
  number,
  title,
  subtitle,
  tone,
  children,
}: {
  readonly number: string;
  readonly title: string;
  readonly subtitle: string;
  readonly tone: "blue" | "emerald" | "amber" | "violet";
  readonly children: ReactNode;
}) {
  const toneClasses = {
    blue: "bg-blue-700",
    emerald: "bg-emerald-600",
    amber: "bg-amber-500",
    violet: "bg-violet-600",
  }[tone];
  return (
    <details open className="group border-t border-slate-200">
      <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-4 marker:hidden focus-visible:outline focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-blue-500 sm:px-6 lg:px-8">
        <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ${toneClasses}`}>
          {number}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-base font-bold text-slate-950 sm:text-lg">{title}</span>
          <span className="mt-0.5 block text-xs leading-5 text-slate-500 sm:text-sm">{subtitle}</span>
        </span>
        <ChevronDown aria-hidden="true" className="h-5 w-5 shrink-0 text-slate-400 transition-transform group-open:rotate-180" />
      </summary>
      <div className="px-4 pb-6 sm:px-6 lg:px-8">{children}</div>
    </details>
  );
}

function FactGroup({
  group,
  onShowProvenance,
}: {
  readonly group: FiscalNotificationDetailFactGroupV1;
  readonly onShowProvenance: (
    provenance: FiscalNotificationDetailProvenanceV1,
  ) => void;
}) {
  const visible = group.fields.slice(0, group.previewLimit);
  const remaining = group.fields.slice(group.previewLimit);
  return (
    <section aria-labelledby={`fact-group-${group.id}`} className="py-5 first:pt-0 last:pb-0">
      <h3 id={`fact-group-${group.id}`} className="mb-2 text-sm font-bold text-slate-900">
        {group.title}
      </h3>
      <dl className="divide-y divide-slate-100">
        {visible.map((field) => (
          <FactRow key={field.key} field={field} onShowProvenance={onShowProvenance} />
        ))}
      </dl>
      {remaining.length > 0 ? (
        <details className="border-t border-slate-100">
          <summary className="min-h-11 cursor-pointer list-none py-3 text-sm font-semibold text-blue-700 marker:hidden">
            Ver {remaining.length} datos más
          </summary>
          <dl className="divide-y divide-slate-100 border-t border-slate-100">
            {remaining.map((field) => (
              <FactRow key={field.key} field={field} onShowProvenance={onShowProvenance} />
            ))}
          </dl>
        </details>
      ) : null}
    </section>
  );
}

function FactRow({
  field,
  onShowProvenance,
}: {
  readonly field: FiscalNotificationDetailFactGroupV1["fields"][number];
  readonly onShowProvenance: (
    provenance: FiscalNotificationDetailProvenanceV1,
  ) => void;
}) {
  return (
    <div className="grid min-w-0 gap-1 py-3 sm:grid-cols-[minmax(9rem,0.42fr)_minmax(0,1fr)_2.5rem] sm:items-start sm:gap-4">
      <dt className="text-xs font-semibold text-slate-500">{field.label}</dt>
      <dd className="min-w-0 break-words text-sm font-semibold leading-6 text-slate-900">
        {field.value}
      </dd>
      <dd className="justify-self-end sm:row-auto">
        <ProvenanceButton
          label={field.label}
          onClick={() => onShowProvenance(field.provenance)}
        />
      </dd>
    </div>
  );
}

function EconomySection({
  economy,
  onShowProvenance,
}: {
  readonly economy: FiscalNotificationDetailEconomyV1;
  readonly onShowProvenance: (selection: ProvenanceSelection) => void;
}) {
  const visible = economy.rows.slice(0, economy.previewLimit);
  const remaining = economy.rows.slice(economy.previewLimit);
  const rowGridClass = economy.showSourceReference
    ? "grid-cols-[minmax(12rem,1.4fr)_minmax(8rem,0.7fr)_minmax(9rem,0.8fr)_2.5rem]"
    : "grid-cols-[minmax(12rem,1.4fr)_minmax(8rem,0.7fr)_2.5rem]";
  return (
    <div>
      {economy.summary.length > 0 ? (
        <dl className="grid border-y border-slate-200 sm:grid-cols-2 lg:grid-cols-4">
          {economy.summary.map((item, index) => (
            <div
              key={`summary:${item.key}`}
              className={`px-3 py-4 ${index < economy.summary.length - 1 ? "border-b border-slate-200 sm:border-b-0 sm:border-r" : ""}`}
            >
              <dt className="text-xs font-semibold text-slate-500">{item.label}</dt>
              <dd className="mt-1 text-xl font-bold text-slate-950">{item.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}

      {economy.rows.length > 0 ? (
        <div className="mt-5 overflow-x-auto rounded-md border border-slate-200">
          <div role="table" aria-label="Importes del documento" className="min-w-[44rem] md:min-w-0">
            <div role="row" className={`grid ${rowGridClass} border-b border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-600`}>
              <span role="columnheader">Concepto</span>
              <span role="columnheader">Importe</span>
              {economy.showSourceReference ? (
                <span role="columnheader">Referencia</span>
              ) : null}
              <span role="columnheader" className="sr-only">Procedencia</span>
            </div>
            <div role="rowgroup" className="divide-y divide-slate-100">
              {visible.map((row) => (
                <AmountRow
                  key={row.key}
                  row={row}
                  rowGridClass={rowGridClass}
                  showSourceReference={economy.showSourceReference}
                  onShowProvenance={onShowProvenance}
                />
              ))}
            </div>
            {remaining.length > 0 ? (
              <details className="border-t border-slate-200">
                <summary className="min-h-11 cursor-pointer list-none px-3 py-3 text-sm font-semibold text-blue-700 marker:hidden">
                  Ver {remaining.length} importes más
                </summary>
                <div role="rowgroup" className="divide-y divide-slate-100 border-t border-slate-100">
                  {remaining.map((row) => (
                    <AmountRow
                      key={row.key}
                      row={row}
                      rowGridClass={rowGridClass}
                      showSourceReference={economy.showSourceReference}
                      onShowProvenance={onShowProvenance}
                    />
                  ))}
                </div>
              </details>
            ) : null}
          </div>
        </div>
      ) : null}

      {economy.installments.length > 0 ? (
        <section className="mt-6" aria-labelledby="installment-table-heading">
          <h3 id="installment-table-heading" className="text-sm font-bold text-slate-900">
            Cuotas y vencimientos
          </h3>
          <div className="mt-2 divide-y divide-slate-100 border-y border-slate-200">
            {economy.installments.map((installment) => (
              <div key={installment.key} className="grid gap-4 py-4 md:grid-cols-[minmax(14rem,1.2fr)_minmax(10rem,0.7fr)_minmax(10rem,0.7fr)] md:items-start">
                <div>
                  <p className="text-sm font-bold text-slate-900">{installment.label}</p>
                  {installment.components.length > 0 ? (
                    <ul className="mt-1 divide-y divide-slate-100 text-xs text-slate-500">
                      {installment.components.map((component) => (
                        <li key={`${component.label}:${component.value}`} className="flex min-h-9 items-center justify-between gap-2">
                          <span>{component.label}: {component.value}</span>
                          {component.pageNumbers.length > 0 ? (
                            <ProvenanceButton
                              label={`${installment.label}, ${component.label}`}
                              onClick={() =>
                                onShowProvenance({
                                  key: `installment-component:${installment.key}:${component.label}`,
                                  fieldLabel: `${installment.label} · ${component.label}`,
                                  value: component.value,
                                  pageNumbers: component.pageNumbers,
                                  basis: "PRINTED",
                                  sourceReference: null,
                                })
                              }
                            />
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
                <InstallmentDatum
                  installmentKey={installment.key}
                  label="Vencimiento"
                  value={installment.dueDate}
                  pageNumbers={installment.dueDatePageNumbers}
                  onShowProvenance={onShowProvenance}
                />
                <InstallmentDatum
                  installmentKey={installment.key}
                  label="Total"
                  value={installment.total}
                  pageNumbers={installment.totalPageNumbers}
                  onShowProvenance={onShowProvenance}
                />
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function InstallmentDatum({
  installmentKey,
  label,
  value,
  pageNumbers,
  onShowProvenance,
}: {
  readonly installmentKey: string;
  readonly label: string;
  readonly value: string | null;
  readonly pageNumbers: readonly number[];
  readonly onShowProvenance: (selection: ProvenanceSelection) => void;
}) {
  return (
    <div className="flex min-w-0 items-start justify-between gap-2">
      <LabeledValue label={label} value={value ?? "No consta"} />
      {value && pageNumbers.length > 0 ? (
        <ProvenanceButton
          label={`${label} de la cuota`}
          onClick={() =>
            onShowProvenance({
              key: `installment:${installmentKey}:${label}`,
              fieldLabel: label,
              value,
              pageNumbers,
              basis: "PRINTED",
              sourceReference: null,
            })
          }
        />
      ) : null}
    </div>
  );
}

function AmountRow({
  row,
  rowGridClass,
  showSourceReference,
  onShowProvenance,
}: {
  readonly row: FiscalNotificationDetailEconomyV1["rows"][number];
  readonly rowGridClass: string;
  readonly showSourceReference: boolean;
  readonly onShowProvenance: (selection: ProvenanceSelection) => void;
}) {
  return (
    <div role="row" className={`grid ${rowGridClass} items-center px-3 py-3 text-sm`}>
      <span role="cell" className="font-semibold text-slate-900">{row.label}</span>
      <span role="cell" className="font-bold text-slate-950">{row.value}</span>
      {showSourceReference ? (
        <span role="cell" className="break-words text-xs text-slate-500">
          {row.sourceReference}
        </span>
      ) : null}
      <span role="cell" className="justify-self-end">
        {row.pageNumbers.length > 0 ? (
          <ProvenanceButton
            label={row.label}
            onClick={() =>
              onShowProvenance({
                key: `amount:${row.key}`,
                fieldLabel: row.label,
                value: row.value,
                pageNumbers: row.pageNumbers,
                basis: "PRINTED",
                sourceReference: row.sourceReference,
              })
            }
          />
        ) : null}
      </span>
    </div>
  );
}

function ExplanationSection({
  detail,
}: {
  readonly detail: FiscalNotificationDocumentDetailViewModelV1;
}) {
  const explanation = detail.explanation;
  return (
    <div className="border-y border-slate-200">
      <div className="grid divide-y divide-slate-200 lg:grid-cols-2 lg:divide-x lg:divide-y-0">
        <ExplanationBlock
          icon={<FileText aria-hidden="true" className="h-5 w-5" />}
          eyebrow="Lo que afirma el documento"
          title="Resultado que consta"
          text={explanation.documentSays}
        />
        <ExplanationBlock
          icon={<BookOpen aria-hidden="true" className="h-5 w-5" />}
          eyebrow="Explicación de Factu"
          title="Qué significa"
          text={explanation.officialMeaning}
        />
      </div>
      <div className="grid divide-y divide-slate-200 border-t border-slate-200 lg:grid-cols-2 lg:divide-x lg:divide-y-0">
        <ExplanationBlock
          icon={<ListChecks aria-hidden="true" className="h-5 w-5" />}
          eyebrow="Qué debes revisar"
          title={explanation.reviewTitle}
          text={explanation.reviewDetail}
          emphasis="emerald"
        />
        <ExplanationBlock
          icon={<CalendarDays aria-hidden="true" className="h-5 w-5" />}
          eyebrow={explanation.deadlineBasis === "PRINTED" ? "Plazo indicado" : "Plazo por localizar"}
          title={explanation.deadlineTitle}
          text={explanation.deadlineDetail}
          emphasis="amber"
        />
      </div>
      {explanation.calculatedFacts.length > 0 ? (
        <div className="border-t border-blue-200 bg-blue-50 px-4 py-4 sm:px-5">
          <p className="text-xs font-bold text-blue-800">Calculado con valores impresos</p>
          <dl className="mt-2 grid gap-3 sm:grid-cols-2">
            {explanation.calculatedFacts.map((fact) => (
              <div key={fact.key}>
                <dt className="text-xs font-semibold text-blue-700">{fact.label}</dt>
                <dd className="mt-1 font-bold text-blue-950">{fact.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      ) : null}
    </div>
  );
}

function ExplanationBlock({
  icon,
  eyebrow,
  title,
  text,
  emphasis,
}: {
  readonly icon: ReactNode;
  readonly eyebrow: string;
  readonly title: string;
  readonly text: string;
  readonly emphasis?: "emerald" | "amber";
}) {
  const emphasisClass =
    emphasis === "emerald"
      ? "bg-emerald-50/70"
      : emphasis === "amber"
        ? "bg-amber-50/70"
        : "bg-white";
  return (
    <section className={`min-w-0 px-4 py-5 sm:px-5 ${emphasisClass}`}>
      <div className="flex items-center gap-2 text-slate-600">
        {icon}
        <p className="text-xs font-bold uppercase">{eyebrow}</p>
      </div>
      <h3 className="mt-3 text-base font-bold text-slate-950">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-700">{text}</p>
    </section>
  );
}

function ConnectionsSection({
  detail,
}: {
  readonly detail: FiscalNotificationDocumentDetailViewModelV1;
}) {
  const connections = detail.connections;
  if (!connections) return null;
  return (
    <div className="space-y-7">
      {connections.relations.length > 0 ? (
        <section aria-labelledby="related-documents-heading">
          <div className="flex items-center gap-2">
            <Link2 aria-hidden="true" className="h-5 w-5 text-violet-600" />
            <h3 id="related-documents-heading" className="text-sm font-bold text-slate-950">
              Documentos relacionados
            </h3>
          </div>
          <ul className="mt-3 divide-y divide-slate-200 border-y border-slate-200">
            {connections.relations.map((relation) => (
              <li key={relation.key} className="py-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`inline-flex rounded-full px-2 py-1 text-xs font-bold ${relation.status === "CONFIRMED" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-900"}`}>
                        {relation.statusLabel}
                      </span>
                      {relation.relatedDocumentDate ? (
                        <span className="text-xs font-semibold text-slate-500">{formatCalendarDate(relation.relatedDocumentDate)}</span>
                      ) : null}
                    </div>
                    <p className="mt-2 font-bold text-slate-950">{relation.title}</p>
                    <p className="mt-1 text-sm leading-6 text-slate-600">{relation.explanation}</p>
                  </div>
                  <Link
                    href={documentDetailHref(relation.relatedDocumentId)}
                    className="inline-flex min-h-10 shrink-0 items-center gap-2 self-start rounded-md border border-violet-200 px-3 text-sm font-semibold text-violet-800 hover:bg-violet-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600"
                  >
                    Abrir ficha
                    <ExternalLink aria-hidden="true" className="h-4 w-4" />
                  </Link>
                </div>
                {relation.matches.length > 0 ? (
                  <dl className="mt-3 divide-y divide-slate-100 rounded-md bg-slate-50 px-3">
                    {relation.matches.map((match) => (
                      <div key={`${match.label}:${match.value}`} className="grid gap-1 py-3 sm:grid-cols-[minmax(10rem,0.55fr)_minmax(0,1fr)] sm:gap-4">
                        <dt className="text-xs font-semibold text-slate-500">{match.label}</dt>
                        <dd className="min-w-0 break-words text-sm font-semibold text-slate-800">
                          {match.value}
                          <span className="mt-1 block text-xs font-normal text-slate-500">
                            Esta ficha: {formatPages(match.currentDocumentPages)} · Relacionada: {formatPages(match.relatedDocumentPages)}
                          </span>
                        </dd>
                      </div>
                    ))}
                  </dl>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {connections.timeline.length > 0 ? (
        <section aria-labelledby="document-timeline-heading">
          <div className="flex items-center gap-2">
            <Clock3 aria-hidden="true" className="h-5 w-5 text-blue-600" />
            <h3 id="document-timeline-heading" className="text-sm font-bold text-slate-950">
              Cronología del expediente
            </h3>
          </div>
          <ol className="mt-3 border-l-2 border-slate-200 pl-5">
            {connections.timeline.map((item) => (
              <li key={item.documentId} className="relative pb-5 last:pb-0">
                <span className={`absolute -left-[1.72rem] top-1 h-3 w-3 rounded-full border-2 border-white ${item.current ? "bg-blue-600" : "bg-slate-400"}`} />
                <p className="text-xs font-semibold text-slate-500">
                  {item.date
                    ? `${item.dateLabel} · ${formatCalendarDate(item.date)}`
                    : "Fecha no identificada"}
                  {item.datePageNumber
                    ? ` · Página ${item.datePageNumber}`
                    : ""}
                </p>
                {item.current ? (
                  <p className="mt-1 text-sm font-bold text-blue-800">{item.title}</p>
                ) : (
                  <Link href={documentDetailHref(item.documentId)} className="mt-1 inline-block text-sm font-semibold text-slate-800 hover:text-blue-700 hover:underline">
                    {item.title}
                  </Link>
                )}
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      {connections.sources.length > 0 ? (
        <details className="border-y border-slate-200 py-1">
          <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 py-3 font-bold text-slate-900 marker:hidden">
            <Scale aria-hidden="true" className="h-5 w-5 text-violet-600" />
            <span className="flex-1">Fuentes oficiales en las que se basa esta explicación</span>
            <ChevronDown aria-hidden="true" className="h-5 w-5 text-slate-400" />
          </summary>
          <ul className="space-y-3 pb-4 text-sm">
            {connections.sources.map((source) => (
              <li key={source.key}>
                <a href={source.href} target="_blank" rel="noopener noreferrer" className="font-semibold text-blue-700 hover:underline">
                  {source.authority} · {source.title}
                </a>
              </li>
            ))}
          </ul>
          <p className="border-t border-slate-100 py-3 text-xs leading-5 text-slate-500">
            Estas fuentes forman parte del conocimiento local del motor. Factu no consulta internet durante el escaneo y ninguna fuente sustituye el contenido del documento.
          </p>
        </details>
      ) : null}
    </div>
  );
}

function ProvenanceButton({
  label,
  onClick,
}: {
  readonly label: string;
  readonly onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Ver procedencia de ${label}`}
      title="Ver procedencia"
      className="inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-400 hover:bg-blue-50 hover:text-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
    >
      <FileSearch aria-hidden="true" className="h-4 w-4" />
    </button>
  );
}

function ProvenancePanel({
  selection,
  driveHref,
  onClose,
}: {
  readonly selection: ProvenanceSelection | null;
  readonly driveHref: string | null;
  readonly onClose: () => void;
}) {
  const titleId = useId();
  const descriptionId = useId();
  return (
    <Modal
      open={selection !== null}
      onClose={onClose}
      titleId={titleId}
      descriptionId={descriptionId}
      overlayClassName="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/30 sm:items-stretch sm:justify-end"
      panelClassName="max-h-[88dvh] w-full overflow-y-auto rounded-t-lg border border-slate-200 bg-white shadow-2xl sm:h-full sm:max-h-none sm:max-w-md sm:rounded-none sm:border-y-0 sm:border-r-0"
      testId="fiscal-notification-provenance"
    >
      {selection ? (
        <div>
          <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-5 py-4">
            <div>
              <p className="text-xs font-bold uppercase text-emerald-700">Procedencia del dato</p>
              <h2 id={titleId} className="mt-1 text-lg font-bold text-slate-950">{selection.fieldLabel}</h2>
            </div>
            <button type="button" onClick={onClose} aria-label="Cerrar procedencia" title="Cerrar" className="inline-flex h-10 w-10 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500">
              <X aria-hidden="true" className="h-5 w-5" />
            </button>
          </header>
          <div id={descriptionId} className="space-y-0 px-5 pb-6">
            <ProvenanceDatum label="Valor" value={selection.value} prominent />
            <ProvenanceDatum label="Dónde aparece" value={formatPages(selection.pageNumbers)} />
            <ProvenanceDatum label="Tipo de dato" value="Impreso en el documento" />
            {selection.sourceReference ? (
              <ProvenanceDatum label="Referencia asociada" value={selection.sourceReference} />
            ) : null}
            {driveHref ? (
              <a href={driveHref} target="_blank" rel="noopener noreferrer" className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md border border-blue-200 px-4 text-sm font-bold text-blue-700 hover:bg-blue-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500">
                Abrir original en Drive
                <ExternalLink aria-hidden="true" className="h-4 w-4" />
              </a>
            ) : null}
          </div>
        </div>
      ) : null}
    </Modal>
  );
}

function ProvenanceDatum({
  label,
  value,
  prominent = false,
}: {
  readonly label: string;
  readonly value: string;
  readonly prominent?: boolean;
}) {
  return (
    <div className="border-b border-slate-100 py-5">
      <p className="text-xs font-semibold text-slate-500">{label}</p>
      <p className={`mt-1 break-words text-slate-950 ${prominent ? "text-lg font-bold" : "text-sm font-semibold"}`}>{value}</p>
    </div>
  );
}

function LabeledValue({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-bold text-slate-900">{value}</p>
    </div>
  );
}

function MissingDetail() {
  return (
    <Card>
      <h1 className="text-lg font-bold text-slate-950">Documento no encontrado</h1>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        No existe una ficha con ese identificador dentro de esta cuenta.
      </p>
      <Link href="/consultor-fiscal/notificaciones#documentos-guardados" className="mt-4 inline-flex min-h-11 items-center gap-2 font-semibold text-blue-700 hover:underline">
        <ArrowLeft aria-hidden="true" className="h-4 w-4" />
        Volver a documentos
      </Link>
    </Card>
  );
}

function BlockedDetail() {
  return (
    <Card className="border-amber-200 bg-amber-50" role="alert">
      <h1 className="font-bold text-amber-950">Expediente estructurado no disponible</h1>
      <p className="mt-1 text-sm leading-6 text-amber-900">
        Los datos guardados no superan la validación de integridad de esta cuenta. No se muestra una ficha parcial ni se modifica ningún documento.
      </p>
    </Card>
  );
}

function formatPages(values: readonly number[]): string {
  if (values.length === 0) return "Página no disponible";
  const label = values.length === 1 ? "Página" : "Páginas";
  return `${label} ${values.join(", ")}`;
}

function formatCalendarDate(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/u.exec(value);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : value;
}

function documentDetailHref(documentId: string): string {
  return `/consultor-fiscal/notificaciones?documento=${encodeURIComponent(documentId)}`;
}
