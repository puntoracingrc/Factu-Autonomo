export const NAVIGATION_SLOW_DELAY_MS = 1_500;
export const NAVIGATION_STALLED_DELAY_MS = 8_000;

export type PendingAppNavigation = {
  href: string;
  label: string;
};

export type NavigationFeedbackPhase = "pending" | "slow" | "stalled";

export function navigationFeedbackMessage(
  label: string,
  phase: NavigationFeedbackPhase,
): string {
  if (phase === "slow") {
    return `La carga está tardando más de lo habitual. Seguimos abriendo ${label}…`;
  }

  if (phase === "stalled") {
    return `No hemos podido abrir ${label} todavía.`;
  }

  return `Abriendo ${label}…`;
}
