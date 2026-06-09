import { migrateCustomer } from "./customers";
import { countersFromDocuments } from "./documents";
import type { AppData, DocumentType } from "./types";
import { EMPTY_DATA } from "./types";

const STORAGE_KEY = "factura-autonomo-data";

function normalizeLoadedData(parsed: Partial<AppData>): AppData {
  const documents = parsed.documents ?? [];
  return {
    ...EMPTY_DATA,
    ...parsed,
    customers: (parsed.customers ?? []).map((customer) =>
      migrateCustomer(customer as AppData["customers"][number]),
    ),
    documents,
    counters: {
      ...EMPTY_DATA.counters,
      ...parsed.counters,
      ...countersFromDocuments(documents),
    },
  };
}

export function loadData(): AppData {
  if (typeof window === "undefined") return EMPTY_DATA;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY_DATA;
    return normalizeLoadedData(JSON.parse(raw));
  } catch {
    return EMPTY_DATA;
  }
}

export function saveData(data: AppData): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

/** @deprecated Usar assignNextDocumentNumber desde documents.ts */
export function nextDocumentNumber(
  type: DocumentType,
  counters: AppData["counters"],
  year = new Date().getFullYear(),
): { number: string; counters: AppData["counters"] } {
  const next = counters[type] + 1;
  const prefix =
    type === "factura" ? "F" : type === "presupuesto" ? "P" : "R";
  return {
    number: `${prefix}-${year}-${String(next).padStart(4, "0")}`,
    counters: { ...counters, [type]: next },
  };
}
