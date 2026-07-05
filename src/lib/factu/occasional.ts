import {
  FACTU_MILESTONE_MESSAGES,
  pickDailyGreeting,
  type FactuMilestoneId,
} from "./copy";

const DAILY_GREETING_KEY = "factu-daily-greeting";
const MILESTONE_PREFIX = "factu-milestone-";
const WIDGET_DISMISSED_KEY = "factu-widget-dismissed-session";
export const FACTU_TOAST_EVENT = "factu-toast";

export function shouldShowFactuWidget(pathname: string): boolean {
  if (isFactuWidgetDismissed()) return false;
  if (pathname.startsWith("/cuenta")) return false;
  if (pathname.startsWith("/legal")) return false;
  if (pathname.includes("/nuevo")) return false;
  if (pathname.includes("/rectificar")) return false;
  if (/^\/(facturas|presupuestos|recibos)\/[^/]+$/.test(pathname)) {
    return false;
  }
  return true;
}

export function isFactuWidgetDismissed(): boolean {
  if (typeof window === "undefined" || typeof sessionStorage === "undefined") {
    return false;
  }
  return sessionStorage.getItem(WIDGET_DISMISSED_KEY) === "1";
}

export function dismissFactuWidget(): void {
  if (typeof window === "undefined" || typeof sessionStorage === "undefined") {
    return;
  }
  sessionStorage.setItem(WIDGET_DISMISSED_KEY, "1");
  window.dispatchEvent(new Event("factu-widget-dismissed"));
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

export function tryConsumeDailyGreeting(): string | null {
  if (typeof window === "undefined") return null;
  const key = todayKey();
  if (localStorage.getItem(DAILY_GREETING_KEY) === key) return null;
  localStorage.setItem(DAILY_GREETING_KEY, key);
  return pickDailyGreeting();
}

export function celebrateFactuMilestone(id: FactuMilestoneId): void {
  if (typeof window === "undefined") return;
  const storageKey = `${MILESTONE_PREFIX}${id}`;
  if (localStorage.getItem(storageKey)) return;
  localStorage.setItem(storageKey, new Date().toISOString());
  showFactuToast(FACTU_MILESTONE_MESSAGES[id]);
}

export function showFactuToast(message: string, durationMs = 3500): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(FACTU_TOAST_EVENT, {
      detail: { message, durationMs },
    }),
  );
}

/** Solo para tests: reinicia estado ocasional en localStorage. */
export function resetFactuOccasionalState(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(DAILY_GREETING_KEY);
  if (typeof sessionStorage !== "undefined") {
    sessionStorage.removeItem(WIDGET_DISMISSED_KEY);
  }
  for (const id of Object.keys(FACTU_MILESTONE_MESSAGES) as FactuMilestoneId[]) {
    localStorage.removeItem(`${MILESTONE_PREFIX}${id}`);
  }
}
