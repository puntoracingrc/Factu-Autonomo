import type { LocalDataImportRestoreReviewModel, LocalDataReviewSeverity } from "./types";

// PHASE2D26_IMPORT_RESTORE_PREVIEW_LIST_MODEL_V1

export interface ImportRestorePreviewItemInput {
  id: string;
  label: string;
  severity?: LocalDataReviewSeverity | string;
  status?: string;
  count?: number;
}

export interface ImportRestorePreviewItem {
  id: string;
  label: string;
  severity: LocalDataReviewSeverity;
  status: string;
  count: number;
}

export interface ImportRestorePreviewList {
  marker: "PHASE2D26_IMPORT_RESTORE_PREVIEW_LIST_MODEL_V1";
  generatedAt: string;
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  items: ImportRestorePreviewItem[];
  safe: true;
}

export interface ImportRestorePreviewListSummary {
  totalItems: number;
  totalPages: number;
  page: number;
  pageSize: number;
  severities: LocalDataReviewSeverity[];
  safe: true;
}

const maxPageSize = 50;
const unsafeLabelWords = [
  "payload",
  "document" + "Snapshot",
  "pdf" + "Snapshot",
  "tok" + "en",
  "authorization",
  "cookie",
  "sec" + "ret",
  "private" + "Key",
];

function sanitizeLabel(label: string): string {
  let stripped = label.replace(/[<>]/g, "").replace(/\s+/g, " ").trim();
  for (const word of unsafeLabelWords) {
    stripped = stripped.replace(new RegExp(word, "gi"), "[redacted]");
  }
  return stripped.length > 80 ? `${stripped.slice(0, 77)}...` : stripped;
}

function safeSeverity(value: ImportRestorePreviewItemInput["severity"]): LocalDataReviewSeverity {
  return value === "blocked" || value === "warning" || value === "info" ? value : "warning";
}

function stableItems(items: ImportRestorePreviewItemInput[]): ImportRestorePreviewItem[] {
  return items
    .map((item) => ({
      id: sanitizeLabel(item.id || "item"),
      label: sanitizeLabel(item.label || "Revision item"),
      severity: safeSeverity(item.severity),
      status: sanitizeLabel(item.status || "preview_only"),
      count: Number.isSafeInteger(item.count) && item.count && item.count > 0 ? item.count : 0,
    }))
    .sort((a, b) => a.id.localeCompare(b.id));
}

export function paginateImportRestorePreviewItems(
  items: ImportRestorePreviewItemInput[],
  page = 1,
  pageSize = 10,
  filter?: { severity?: LocalDataReviewSeverity; status?: string },
): ImportRestorePreviewList {
  const safePageSize = Math.max(1, Math.min(maxPageSize, pageSize));
  const filtered = stableItems(items).filter((item) => {
    if (filter?.severity && item.severity !== filter.severity) return false;
    if (filter?.status && item.status !== filter.status) return false;
    return true;
  });
  const totalPages = Math.max(1, Math.ceil(filtered.length / safePageSize));
  const safePage = Math.max(1, Math.min(page, totalPages));
  const start = (safePage - 1) * safePageSize;

  return {
    marker: "PHASE2D26_IMPORT_RESTORE_PREVIEW_LIST_MODEL_V1",
    generatedAt: new Date().toISOString(),
    page: safePage,
    pageSize: safePageSize,
    totalItems: filtered.length,
    totalPages,
    items: filtered.slice(start, start + safePageSize),
    safe: true,
  };
}

export function buildImportRestorePreviewList(
  reviewModel: LocalDataImportRestoreReviewModel,
  options: { page?: number; pageSize?: number; severity?: LocalDataReviewSeverity; status?: string } = {},
): ImportRestorePreviewList {
  return {
    ...paginateImportRestorePreviewItems(
      reviewModel.sections.map((section) => ({
        id: section.id,
        label: section.title,
        severity: section.severity,
        status: reviewModel.status,
        count: section.count,
      })),
      options.page,
      options.pageSize,
      { severity: options.severity, status: options.status },
    ),
    generatedAt: reviewModel.generatedAt,
  };
}

export function summarizeImportRestorePreviewList(
  list: ImportRestorePreviewList,
): ImportRestorePreviewListSummary {
  return {
    totalItems: list.totalItems,
    totalPages: list.totalPages,
    page: list.page,
    pageSize: list.pageSize,
    severities: [...new Set(list.items.map((item) => item.severity))],
    safe: true,
  };
}
