import type { AppData } from "../types";

/**
 * Ordinary imports may update address-book data only. Backup restoration and
 * admin recovery use separate commands and do not pass through this boundary.
 */
export function buildContactOnlyImportData(
  current: AppData,
  analyzed: AppData,
): AppData {
  return {
    ...current,
    customers: analyzed.customers,
    suppliers: analyzed.suppliers,
  };
}
