import { billingMonthWindow } from "./quotas";

/** Calendar month used by server-side billing ledgers (Europe/Madrid). */
export function currentMonthKey(reference = new Date()): string {
  return billingMonthWindow(reference).monthKey;
}
