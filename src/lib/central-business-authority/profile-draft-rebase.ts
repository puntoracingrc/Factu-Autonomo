import type { BusinessProfile } from "@/lib/types";

function profileValueEquals(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value)
  );
}

function collectConflictPaths(
  latest: unknown,
  baseline: unknown,
  draft: unknown,
  path: string,
): string[] {
  const localChanged = !profileValueEquals(draft, baseline);
  const remoteChanged = !profileValueEquals(latest, baseline);
  if (
    !localChanged ||
    !remoteChanged ||
    profileValueEquals(draft, latest)
  ) {
    return [];
  }

  if (
    isPlainObject(latest) &&
    isPlainObject(baseline) &&
    isPlainObject(draft)
  ) {
    const keys = new Set([
      ...Object.keys(latest),
      ...Object.keys(baseline),
      ...Object.keys(draft),
    ]);
    return [...keys].flatMap((key) =>
      collectConflictPaths(
        latest[key],
        baseline[key],
        draft[key],
        path ? `${path}.${key}` : key,
      ),
    );
  }

  return [path];
}

function rebaseProfileValue(
  latest: unknown,
  baseline: unknown,
  draft: unknown,
): unknown {
  const localChanged = !profileValueEquals(draft, baseline);
  const remoteChanged = !profileValueEquals(latest, baseline);
  if (!localChanged) return latest;
  if (!remoteChanged || profileValueEquals(draft, latest)) return draft;

  if (
    isPlainObject(latest) &&
    isPlainObject(baseline) &&
    isPlainObject(draft)
  ) {
    const rebased: Record<string, unknown> = {};
    const keys = new Set([
      ...Object.keys(latest),
      ...Object.keys(baseline),
      ...Object.keys(draft),
    ]);
    for (const key of keys) {
      rebased[key] = rebaseProfileValue(
        latest[key],
        baseline[key],
        draft[key],
      );
    }
    return rebased;
  }

  // The caller surfaces this overlap before saving; keep the user's draft visible.
  return draft;
}

export function findBusinessProfileDraftConflictPaths(input: {
  latest: BusinessProfile;
  baseline: BusinessProfile;
  draft: BusinessProfile;
}): string[] {
  return collectConflictPaths(input.latest, input.baseline, input.draft, "");
}

export function rebaseBusinessProfileDraft(input: {
  latest: BusinessProfile;
  baseline: BusinessProfile;
  draft: BusinessProfile;
}): BusinessProfile {
  return rebaseProfileValue(
    input.latest,
    input.baseline,
    input.draft,
  ) as BusinessProfile;
}
