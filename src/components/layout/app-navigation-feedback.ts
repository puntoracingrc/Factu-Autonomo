export const NAVIGATION_NOTICE_DELAY_MS = 400;
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
  options: { constrainedConnection?: boolean } = {},
): string {
  if (phase === "slow") {
    if (options.constrainedConnection) {
      return `Conexión lenta. Seguimos abriendo ${label}…`;
    }

    return `La carga está tardando más de lo habitual. Seguimos abriendo ${label}…`;
  }

  if (phase === "stalled") {
    return `No hemos podido abrir ${label} todavía.`;
  }

  return `Abriendo ${label}…`;
}
