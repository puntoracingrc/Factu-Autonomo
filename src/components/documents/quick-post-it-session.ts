export const QUICK_POST_IT_SESSION_KEY = "factu-quick-post-it-v1";
export const QUICK_POST_IT_MAX_LENGTH = 2_000;

export interface QuickPostItSession {
  open: boolean;
  text: string;
}

export function normalizeQuickPostItSession(
  input: unknown,
): QuickPostItSession | null {
  if (!input || typeof input !== "object") return null;

  const candidate = input as Partial<QuickPostItSession>;
  if (candidate.open !== true || typeof candidate.text !== "string") {
    return null;
  }

  return {
    open: true,
    text: candidate.text.slice(0, QUICK_POST_IT_MAX_LENGTH),
  };
}

export function parseQuickPostItSession(
  rawValue: string | null,
): QuickPostItSession | null {
  if (!rawValue) return null;

  try {
    return normalizeQuickPostItSession(JSON.parse(rawValue));
  } catch {
    return null;
  }
}
