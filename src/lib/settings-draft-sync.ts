export function resolveSettingsDraftAfterProfileSync<T>(input: {
  currentDraft: T;
  incomingProfile: T;
  hasLocalChanges: boolean;
}): T {
  return input.hasLocalChanges ? input.currentDraft : input.incomingProfile;
}
