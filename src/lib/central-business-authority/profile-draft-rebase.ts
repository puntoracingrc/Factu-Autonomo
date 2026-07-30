import type { BusinessProfile } from "@/lib/types";

function profileValueEquals(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

export function rebaseBusinessProfileDraft(input: {
  latest: BusinessProfile;
  baseline: BusinessProfile;
  draft: BusinessProfile;
}): BusinessProfile {
  const rebased = { ...input.latest };
  const writable = rebased as unknown as Record<string, unknown>;

  for (const key of Object.keys(input.draft) as Array<keyof BusinessProfile>) {
    if (
      !profileValueEquals(input.draft[key], input.baseline[key])
    ) {
      writable[key] = input.draft[key];
    }
  }

  return rebased;
}
