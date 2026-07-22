"use client";

import {
  useId,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  ChevronRight,
  FolderInput,
  FolderPlus,
  FolderTree,
  GitMerge,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { Modal } from "@/components/ui/Modal";

export interface ProductCatalogStructureEntry {
  family: string;
  directCount: number;
  totalCount: number;
  subfamilies: Array<{ name: string; count: number }>;
}

type StructureAction =
  | { kind: "create_family" }
  | { kind: "create_subfamily"; family?: string }
  | { kind: "rename_family"; family: string }
  | { kind: "merge_family"; family: string }
  | { kind: "remove_family"; family: string; count: number }
  | { kind: "rename_subfamily"; family: string; subfamily: string }
  | { kind: "merge_subfamily"; family: string; subfamily: string }
  | {
      kind: "remove_subfamily";
      family: string;
      subfamily: string;
      count: number;
    };

interface ProductCatalogStructureManagerProps {
  open: boolean;
  entries: ProductCatalogStructureEntry[];
  uncategorizedFamily: string;
  notice: string | null;
  onClose: () => void;
  onFilter: (family: string, subfamily?: string) => void;
  onCreateFamily: (name: string) => boolean;
  onCreateSubfamily: (family: string, name: string) => boolean;
  onRenameFamily: (sourceFamily: string, targetFamily: string) => boolean;
  onMergeFamily: (sourceFamily: string, targetFamily: string) => boolean;
  onRemoveFamily: (family: string) => boolean;
  onRenameSubfamily: (
    family: string,
    sourceSubfamily: string,
    targetSubfamily: string,
  ) => boolean;
  onMergeSubfamily: (
    family: string,
    sourceSubfamily: string,
    targetSubfamily: string,
  ) => boolean;
  onRemoveSubfamily: (family: string, subfamily: string) => boolean;
}

function familyLabel(family: string, uncategorizedFamily: string): string {
  return family === uncategorizedFamily ? "Por clasificar" : family;
}

function normalizeSearch(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es")
    .trim();
}

function countLabel(count: number): string {
  return `${count} ${count === 1 ? "producto" : "productos"}`;
}

export function ProductCatalogStructureManager({
  open,
  entries,
  uncategorizedFamily,
  notice,
  onClose,
  onFilter,
  onCreateFamily,
  onCreateSubfamily,
  onRenameFamily,
  onMergeFamily,
  onRemoveFamily,
  onRenameSubfamily,
  onMergeSubfamily,
  onRemoveSubfamily,
}: ProductCatalogStructureManagerProps) {
  const titleId = useId();
  const descriptionId = useId();
  const [query, setQuery] = useState("");
  const [action, setAction] = useState<StructureAction | null>(null);
  const [nameDraft, setNameDraft] = useState("");
  const [familyDraft, setFamilyDraft] = useState("");

  const regularFamilies = useMemo(
    () =>
      entries
        .filter((entry) => entry.family !== uncategorizedFamily)
        .map((entry) => entry.family),
    [entries, uncategorizedFamily],
  );
  const filteredEntries = useMemo(() => {
    const normalizedQuery = normalizeSearch(query);
    if (!normalizedQuery) return entries;
    return entries.filter(
      (entry) =>
        normalizeSearch(entry.family).includes(normalizedQuery) ||
        entry.subfamilies.some((item) =>
          normalizeSearch(item.name).includes(normalizedQuery),
        ),
    );
  }, [entries, query]);
  const totalProducts = entries.reduce(
    (sum, entry) => sum + entry.totalCount,
    0,
  );
  const totalSubfamilies = entries.reduce(
    (sum, entry) => sum + entry.subfamilies.length,
    0,
  );
  const uncategorizedProducts =
    entries.find((entry) => entry.family === uncategorizedFamily)?.totalCount ??
    0;

  useEffect(() => {
    if (open) return;
    setQuery("");
    setAction(null);
    setNameDraft("");
    setFamilyDraft("");
  }, [open]);

  function openAction(nextAction: StructureAction) {
    setAction(nextAction);
    setNameDraft(
      nextAction.kind === "rename_family"
        ? nextAction.family
        : nextAction.kind === "rename_subfamily"
          ? nextAction.subfamily
          : "",
    );
    setFamilyDraft(
      nextAction.kind === "create_subfamily"
        ? nextAction.family ?? regularFamilies[0] ?? ""
        : "",
    );
  }

  function closeAction() {
    setAction(null);
    setNameDraft("");
    setFamilyDraft("");
  }

  function submitAction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!action) return;

    let completed = false;
    switch (action.kind) {
      case "create_family":
        completed = onCreateFamily(nameDraft);
        break;
      case "create_subfamily":
        completed = onCreateSubfamily(familyDraft, nameDraft);
        break;
      case "rename_family":
        completed = onRenameFamily(action.family, nameDraft);
        break;
      case "merge_family":
        completed = onMergeFamily(action.family, familyDraft);
        break;
      case "remove_family":
        completed = onRemoveFamily(action.family);
        break;
      case "rename_subfamily":
        completed = onRenameSubfamily(
          action.family,
          action.subfamily,
          nameDraft,
        );
        break;
      case "merge_subfamily":
        completed = onMergeSubfamily(
          action.family,
          action.subfamily,
          nameDraft,
        );
        break;
      case "remove_subfamily":
        completed = onRemoveSubfamily(action.family, action.subfamily);
        break;
    }
    if (completed) closeAction();
  }

  function actionTitle(current: StructureAction): string {
    switch (current.kind) {
      case "create_family":
        return "Nueva familia";
      case "create_subfamily":
        return "Nueva subfamilia";
      case "rename_family":
        return `Renombrar ${current.family}`;
      case "merge_family":
        return `Fusionar ${current.family}`;
      case "remove_family":
        return `Quitar ${current.family}`;
      case "rename_subfamily":
        return `Renombrar ${current.subfamily}`;
      case "merge_subfamily":
        return `Fusionar ${current.subfamily}`;
      case "remove_subfamily":
        return `Quitar ${current.subfamily}`;
    }
  }

  const currentFamilyEntry =
    action && "family" in action
      ? entries.find((entry) => entry.family === action.family)
      : undefined;

  return (
    <Modal
      open={open}
      onClose={onClose}
      titleId={titleId}
      descriptionId={descriptionId}
      initialFocusSelector="[data-catalog-structure-search]"
      panelClassName="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-2xl supports-[height:100dvh]:max-h-[92dvh]"
      testId="product-catalog-structure-manager"
    >
      <header className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-200 px-4 py-4 sm:px-6">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-slate-950">
            <FolderTree className="h-5 w-5 shrink-0 text-blue-600" />
            <h2 id={titleId} className="truncate text-lg font-bold">
              Organizar catálogo
            </h2>
          </div>
          <p id={descriptionId} className="mt-1 text-sm text-slate-500">
            {regularFamilies.length} familias · {countLabel(totalProducts)}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar organizador"
          title="Cerrar"
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
        >
          <X className="h-5 w-5" />
        </button>
      </header>

      <div className="grid min-h-0 min-w-0 flex-1 grid-rows-[minmax(0,1fr)_auto] lg:grid-cols-[minmax(0,1fr)_20rem] lg:grid-rows-1">
        <div className="flex min-h-0 min-w-0 flex-col">
          <div className="grid shrink-0 gap-2 border-b border-slate-200 p-4 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:px-6">
            <label className="relative block">
              <span className="sr-only">Buscar familia o subfamilia</span>
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                data-catalog-structure-search
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar familia o subfamilia"
                className="h-11 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm font-semibold text-slate-950 outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </label>
            <button
              type="button"
              onClick={() => openAction({ kind: "create_family" })}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-bold text-white transition-colors hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
            >
              <Plus className="h-4 w-4" />
              Familia
            </button>
            <button
              type="button"
              onClick={() => openAction({ kind: "create_subfamily" })}
              disabled={regularFamilies.length === 0}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
            >
              <FolderPlus className="h-4 w-4" />
              Subfamilia
            </button>
          </div>

          {notice ? (
            <p
              role="status"
              className="mx-4 mt-4 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-900 sm:mx-6"
            >
              {notice}
            </p>
          ) : null}

          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3 sm:px-6">
            {filteredEntries.length === 0 ? (
              <p className="py-12 text-center text-sm font-semibold text-slate-500">
                {entries.length === 0 && !query.trim()
                  ? "Aún no hay familias en el catálogo."
                  : `No hay resultados para “${query.trim()}”.`}
              </p>
            ) : (
              <div className="divide-y divide-slate-200 border-y border-slate-200">
                {filteredEntries.map((entry) => {
                  const isUncategorized =
                    entry.family === uncategorizedFamily;
                  return (
                    <section key={entry.family} className="py-3">
                      <div className="flex items-start gap-2">
                        <button
                          type="button"
                          onClick={() => onFilter(entry.family)}
                          className="min-w-0 flex-1 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
                        >
                          <span className="flex items-center gap-2">
                            <span className="truncate text-sm font-bold text-slate-950 sm:text-base">
                              {familyLabel(entry.family, uncategorizedFamily)}
                            </span>
                            <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
                          </span>
                          <span className="mt-0.5 block text-xs font-semibold text-slate-500">
                            {countLabel(entry.totalCount)} ·{" "}
                            {entry.subfamilies.length}{" "}
                            {entry.subfamilies.length === 1
                              ? "subfamilia"
                              : "subfamilias"}
                          </span>
                        </button>
                        {!isUncategorized ? (
                          <div className="flex shrink-0 items-center gap-1">
                            <StructureIconButton
                              label={`Nueva subfamilia en ${entry.family}`}
                              title="Nueva subfamilia"
                              onClick={() =>
                                openAction({
                                  kind: "create_subfamily",
                                  family: entry.family,
                                })
                              }
                            >
                              <FolderPlus className="h-4 w-4" />
                            </StructureIconButton>
                            <StructureIconButton
                              label={`Renombrar familia ${entry.family}`}
                              title="Renombrar familia"
                              onClick={() =>
                                openAction({
                                  kind: "rename_family",
                                  family: entry.family,
                                })
                              }
                            >
                              <Pencil className="h-4 w-4" />
                            </StructureIconButton>
                            {regularFamilies.length > 1 ? (
                              <StructureIconButton
                                label={`Fusionar familia ${entry.family}`}
                                title="Fusionar familia"
                                onClick={() =>
                                  openAction({
                                    kind: "merge_family",
                                    family: entry.family,
                                  })
                                }
                              >
                                <GitMerge className="h-4 w-4" />
                              </StructureIconButton>
                            ) : null}
                            <StructureIconButton
                              label={`Quitar familia ${entry.family}`}
                              title="Quitar familia"
                              danger
                              onClick={() =>
                                openAction({
                                  kind: "remove_family",
                                  family: entry.family,
                                  count: entry.totalCount,
                                })
                              }
                            >
                              <Trash2 className="h-4 w-4" />
                            </StructureIconButton>
                          </div>
                        ) : null}
                      </div>

                      {!isUncategorized &&
                      (entry.directCount > 0 || entry.subfamilies.length > 0) ? (
                        <div className="ml-2 mt-2 border-l border-slate-200 pl-3">
                          {entry.directCount > 0 ? (
                            <button
                              type="button"
                              onClick={() => onFilter(entry.family, "")}
                              className="flex min-h-9 w-full items-center justify-between gap-3 rounded-lg px-2 text-left text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
                            >
                              <span>Sin subfamilia</span>
                              <span className="text-xs text-slate-400">
                                {entry.directCount}
                              </span>
                            </button>
                          ) : null}
                          {entry.subfamilies.map((item) => (
                            <div
                              key={`${entry.family}-${item.name}`}
                              className="flex min-h-10 items-center gap-1"
                            >
                              <button
                                type="button"
                                onClick={() =>
                                  onFilter(entry.family, item.name)
                                }
                                className="min-w-0 flex-1 rounded-lg px-2 py-2 text-left text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
                              >
                                <span className="flex items-center justify-between gap-3">
                                  <span className="truncate">{item.name}</span>
                                  <span className="shrink-0 text-xs text-slate-400">
                                    {item.count}
                                  </span>
                                </span>
                              </button>
                              <StructureIconButton
                                label={`Renombrar subfamilia ${item.name}`}
                                title="Renombrar subfamilia"
                                onClick={() =>
                                  openAction({
                                    kind: "rename_subfamily",
                                    family: entry.family,
                                    subfamily: item.name,
                                  })
                                }
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </StructureIconButton>
                              {entry.subfamilies.length > 1 ? (
                                <StructureIconButton
                                  label={`Fusionar subfamilia ${item.name}`}
                                  title="Fusionar subfamilia"
                                  onClick={() =>
                                    openAction({
                                      kind: "merge_subfamily",
                                      family: entry.family,
                                      subfamily: item.name,
                                    })
                                  }
                                >
                                  <GitMerge className="h-3.5 w-3.5" />
                                </StructureIconButton>
                              ) : null}
                              <StructureIconButton
                                label={`Quitar subfamilia ${item.name}`}
                                title="Quitar subfamilia"
                                danger
                                onClick={() =>
                                  openAction({
                                    kind: "remove_subfamily",
                                    family: entry.family,
                                    subfamily: item.name,
                                    count: item.count,
                                  })
                                }
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </StructureIconButton>
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </section>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <aside
          className={`min-w-0 border-t border-slate-200 bg-slate-50 p-4 lg:min-h-0 lg:border-l lg:border-t-0 lg:p-5 ${
            action ? "min-h-[15rem]" : "hidden lg:block"
          }`}
        >
          {action ? (
            <form onSubmit={submitAction} className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase text-blue-600">
                    Estructura
                  </p>
                  <h3 className="mt-1 text-base font-bold text-slate-950">
                    {actionTitle(action)}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={closeAction}
                  aria-label="Cancelar acción"
                  title="Cancelar"
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-white hover:text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {action.kind === "create_subfamily" ? (
                <StructureSelect
                  label="Familia"
                  value={familyDraft}
                  onChange={setFamilyDraft}
                  options={regularFamilies}
                />
              ) : null}

              {action.kind === "merge_family" ? (
                <StructureSelect
                  label="Familia de destino"
                  value={familyDraft}
                  onChange={setFamilyDraft}
                  options={regularFamilies.filter(
                    (family) => family !== action.family,
                  )}
                  placeholder="Elige una familia"
                />
              ) : null}

              {action.kind === "merge_subfamily" ? (
                <StructureSelect
                  label="Subfamilia de destino"
                  value={nameDraft}
                  onChange={setNameDraft}
                  options={(currentFamilyEntry?.subfamilies ?? [])
                    .map((item) => item.name)
                    .filter((name) => name !== action.subfamily)}
                  placeholder="Elige una subfamilia"
                />
              ) : null}

              {action.kind === "create_family" ||
              action.kind === "create_subfamily" ||
              action.kind === "rename_family" ||
              action.kind === "rename_subfamily" ? (
                <label className="block space-y-1.5">
                  <span className="text-sm font-bold text-slate-800">
                    {action.kind.startsWith("rename")
                      ? "Nuevo nombre"
                      : "Nombre"}
                  </span>
                  <input
                    value={nameDraft}
                    onChange={(event) => setNameDraft(event.target.value)}
                    autoFocus
                    className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </label>
              ) : null}

              {action.kind === "merge_family" ? (
                <ImpactNotice>
                  {countLabel(currentFamilyEntry?.totalCount ?? 0)} pasarán a
                  la familia elegida. La familia de origen dejará de aparecer.
                </ImpactNotice>
              ) : null}
              {action.kind === "merge_subfamily" ? (
                <ImpactNotice>
                  Los productos de “{action.subfamily}” pasarán a la subfamilia
                  elegida dentro de “{action.family}”.
                </ImpactNotice>
              ) : null}
              {action.kind === "remove_family" ? (
                <ImpactNotice danger>
                  {countLabel(action.count)} pasarán a Por clasificar. Ningún
                  producto ni compra se borrará.
                </ImpactNotice>
              ) : null}
              {action.kind === "remove_subfamily" ? (
                <ImpactNotice danger>
                  {countLabel(action.count)} seguirán en “{action.family}”, sin
                  subfamilia. Ningún producto ni compra se borrará.
                </ImpactNotice>
              ) : null}

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={closeAction}
                  className="inline-flex h-11 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className={`inline-flex h-11 items-center justify-center gap-2 rounded-lg px-3 text-sm font-bold text-white transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${
                    action.kind === "remove_family" ||
                    action.kind === "remove_subfamily"
                      ? "bg-red-600 hover:bg-red-700 focus-visible:outline-red-500"
                      : "bg-blue-600 hover:bg-blue-700 focus-visible:outline-blue-500"
                  }`}
                >
                  {action.kind === "merge_family" ||
                  action.kind === "merge_subfamily" ? (
                    <GitMerge className="h-4 w-4" />
                  ) : action.kind === "remove_family" ||
                    action.kind === "remove_subfamily" ? (
                    <Trash2 className="h-4 w-4" />
                  ) : action.kind === "create_family" ||
                    action.kind === "create_subfamily" ? (
                    <Plus className="h-4 w-4" />
                  ) : (
                    <Pencil className="h-4 w-4" />
                  )}
                  {action.kind === "remove_family" ||
                  action.kind === "remove_subfamily"
                    ? "Quitar"
                    : action.kind === "merge_family" ||
                        action.kind === "merge_subfamily"
                      ? "Fusionar"
                      : action.kind === "create_family" ||
                          action.kind === "create_subfamily"
                        ? "Crear"
                        : "Guardar"}
                </button>
              </div>
            </form>
          ) : (
            <div className="flex h-full min-h-[12rem] flex-col justify-center">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-white text-slate-500 shadow-sm">
                <FolderInput className="h-5 w-5" />
              </div>
              <p className="mt-3 text-sm font-bold text-slate-800">Resumen</p>
              <dl className="mt-3 grid gap-2 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <dt className="font-semibold text-slate-500">Familias</dt>
                  <dd className="font-bold text-slate-950">
                    {regularFamilies.length}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="font-semibold text-slate-500">Subfamilias</dt>
                  <dd className="font-bold text-slate-950">
                    {totalSubfamilies}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="font-semibold text-slate-500">
                    Por clasificar
                  </dt>
                  <dd className="font-bold text-slate-950">
                    {uncategorizedProducts}
                  </dd>
                </div>
              </dl>
            </div>
          )}
        </aside>
      </div>
    </Modal>
  );
}

function StructureIconButton({
  label,
  title,
  danger = false,
  onClick,
  children,
}: {
  label: string;
  title: string;
  danger?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={title}
      className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${
        danger
          ? "text-slate-400 hover:bg-red-50 hover:text-red-600 focus-visible:outline-red-500"
          : "text-slate-400 hover:bg-slate-100 hover:text-slate-800 focus-visible:outline-blue-500"
      }`}
    >
      {children}
    </button>
  );
}

function StructureSelect({
  label,
  value,
  onChange,
  options,
  placeholder = "Elige una opción",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-bold text-slate-800">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function ImpactNotice({
  danger = false,
  children,
}: {
  danger?: boolean;
  children: ReactNode;
}) {
  return (
    <p
      className={`rounded-lg border px-3 py-3 text-sm font-semibold leading-relaxed ${
        danger
          ? "border-red-200 bg-red-50 text-red-900"
          : "border-amber-200 bg-amber-50 text-amber-900"
      }`}
    >
      {children}
    </p>
  );
}
