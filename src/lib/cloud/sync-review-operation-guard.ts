export interface CloudSyncReviewGeneration {
  readonly userId: string | null;
  readonly generation: number;
}

export interface CloudSyncReviewOperationToken {
  readonly userId: string;
  readonly generation: number;
}

export function advanceCloudSyncReviewGeneration(
  current: CloudSyncReviewGeneration,
  userId: string | null,
): CloudSyncReviewGeneration {
  return {
    userId,
    generation: current.generation + 1,
  };
}

export function captureCloudSyncReviewOperation(
  current: CloudSyncReviewGeneration,
): CloudSyncReviewOperationToken | null {
  if (!current.userId) return null;
  return {
    userId: current.userId,
    generation: current.generation,
  };
}

export function isCloudSyncReviewOperationCurrent(
  current: CloudSyncReviewGeneration,
  operation: CloudSyncReviewOperationToken,
): boolean {
  return (
    current.userId === operation.userId &&
    current.generation === operation.generation
  );
}

export function runCloudSyncReviewMutation(
  current: CloudSyncReviewGeneration,
  operation: CloudSyncReviewOperationToken,
  mutation: () => void,
): boolean {
  if (!isCloudSyncReviewOperationCurrent(current, operation)) return false;
  mutation();
  return true;
}
