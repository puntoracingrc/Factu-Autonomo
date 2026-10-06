export interface CloudSyncFlight<T> {
  ownerScope: string;
  promise: Promise<T>;
}

export type CloudSyncFlightState<T> = CloudSyncFlight<T> | null;

interface CloudSyncFlightRef<T> {
  current: CloudSyncFlightState<T>;
}

export async function runCloudSyncSingleFlight<T>(
  state: CloudSyncFlightRef<T>,
  ownerScope: string,
  operation: () => Promise<T>,
): Promise<T> {
  for (;;) {
    const active = state.current;
    if (!active) break;

    if (active.ownerScope === ownerScope) {
      return active.promise;
    }

    try {
      await active.promise;
    } catch {
      // A company switch still waits until the previous exclusive operation
      // has released the client. Its result belongs only to that old company.
    }
  }

  const flight = {} as CloudSyncFlight<T>;
  const promise = Promise.resolve()
    .then(operation)
    .finally(() => {
      if (state.current === flight) state.current = null;
    });
  flight.ownerScope = ownerScope;
  flight.promise = promise;
  state.current = flight;
  return promise;
}
