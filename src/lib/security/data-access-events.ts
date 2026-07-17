import type { AppData } from "@/lib/types";

export const DATA_ACCESS_EVENT_NAME = "factu:data-access";

export type DataAccessEventType =
  | "backup_local"
  | "backup_drive"
  | "cloud_pull";

export interface DataAccessEventDetail {
  type: DataAccessEventType;
  itemCount: number;
  byteLength?: number;
  automatic?: boolean;
}

function safeInteger(value: number | undefined, maximum: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(maximum, Math.floor(value ?? 0)));
}

export function appDataRecordCount(data: AppData): number {
  return [
    data.customers,
    data.documents,
    data.expenses,
    data.recurringExpenses,
    data.userReminders,
    data.suppliers,
    data.products,
    data.testDocumentRetirementBatches,
    data.workspaceIntegrityQuarantine,
  ].reduce(
    (total, collection) =>
      total + (Array.isArray(collection) ? collection.length : 0),
    0,
  );
}

export function dispatchDataAccessEvent(detail: DataAccessEventDetail): void {
  if (
    typeof window === "undefined" ||
    typeof window.dispatchEvent !== "function" ||
    typeof CustomEvent === "undefined"
  ) {
    return;
  }

  window.dispatchEvent(
    new CustomEvent<DataAccessEventDetail>(DATA_ACCESS_EVENT_NAME, {
      detail: {
        type: detail.type,
        itemCount: safeInteger(detail.itemCount, 1_000_000),
        byteLength: safeInteger(detail.byteLength, 100 * 1024 * 1024),
        automatic: detail.automatic === true,
      },
    }),
  );
}
