export interface PersistedSnapshotAdoptionInput<T> {
  candidate: T;
  expectedCurrent: T;
  getCurrent: () => T;
  currentMatchesDurableBaseline: () => boolean;
  persistedMatches: (candidate: T) => boolean;
  publishMemoryOnly: (candidate: T) => void;
}

export function adoptPersistedSnapshotIfCurrent<T>(
  input: PersistedSnapshotAdoptionInput<T>,
): boolean {
  if (input.getCurrent() !== input.expectedCurrent) return false;
  if (!input.currentMatchesDurableBaseline()) return false;
  if (!input.persistedMatches(input.candidate)) return false;
  if (input.getCurrent() !== input.expectedCurrent) return false;

  input.publishMemoryOnly(input.candidate);
  return input.getCurrent() === input.candidate;
}
