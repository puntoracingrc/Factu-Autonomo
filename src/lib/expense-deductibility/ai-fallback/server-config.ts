const DEFAULT_MODEL = "gpt-4o-mini";
const DEFAULT_TIMEOUT_MS = 15_000;

export const FISCAL_AI_FALLBACK_FLAG =
  "CONSULTOR_FISCAL_AI_FALLBACK_ENABLED" as const;
export const FISCAL_AI_PROMPT_VERSION =
  "fiscal-expense-fallback-2026-07-12.v1" as const;

export function resolveFiscalAiFallbackFlag(value: string | undefined): boolean {
  return value === "true";
}

export function isFiscalAiFallbackEnabled(): boolean {
  return resolveFiscalAiFallbackFlag(
    process.env.CONSULTOR_FISCAL_AI_FALLBACK_ENABLED,
  );
}

export function getFiscalAiModel(): string {
  const configured = process.env.OPENAI_FISCAL_FALLBACK_MODEL?.trim();
  return configured && /^[a-z0-9._:-]{1,120}$/i.test(configured)
    ? configured
    : DEFAULT_MODEL;
}

export function getFiscalAiTimeoutMs(): number {
  const raw = process.env.OPENAI_FISCAL_FALLBACK_TIMEOUT_MS?.trim();
  if (!raw) return DEFAULT_TIMEOUT_MS;
  const configured = Number(raw);
  if (!Number.isFinite(configured)) return DEFAULT_TIMEOUT_MS;
  return Math.max(1_000, Math.min(30_000, Math.floor(configured)));
}

export function getFiscalAiMaxAttempts(): number {
  return 2;
}
