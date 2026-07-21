export interface CloudAuthIdentity {
  readonly userId: string | null;
  readonly generation: number;
}

export interface CloudAuthOperationToken {
  readonly userId: string;
  readonly generation: number;
}

export function advanceCloudAuthIdentity(
  current: CloudAuthIdentity,
  userId: string | null,
): CloudAuthIdentity {
  return {
    userId,
    generation: current.generation + 1,
  };
}

export function captureCloudAuthOperation(
  identity: CloudAuthIdentity,
): CloudAuthOperationToken | null {
  if (!identity.userId) return null;
  return {
    userId: identity.userId,
    generation: identity.generation,
  };
}

export function isCloudAuthOperationCurrent(
  identity: CloudAuthIdentity,
  operation: CloudAuthOperationToken,
): boolean {
  return (
    identity.userId === operation.userId &&
    identity.generation === operation.generation
  );
}
