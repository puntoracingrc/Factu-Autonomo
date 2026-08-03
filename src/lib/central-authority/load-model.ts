import {
  CENTRAL_AUTHORITY_DEGRADED_POLL_MS,
  CENTRAL_AUTHORITY_POLL_JITTER_MS,
  CENTRAL_AUTHORITY_REALTIME_SAFETY_POLL_MS,
} from "./sync-schedule";

export const CENTRAL_SYNC_SYNTHETIC_LOAD_MODEL =
  "CENTRAL_SYNC_SYNTHETIC_LOAD_MODEL_V1";

export interface CentralSyncSyntheticLoadInput {
  devices: number;
  durationSeconds?: number;
  rampUpSeconds?: number;
  devicesPerAccount?: number;
  changesPerDevicePerMinute?: number;
  realtimeHealthy: boolean;
  seed?: number;
}

export interface CentralSyncSyntheticLoadResult {
  schema: typeof CENTRAL_SYNC_SYNTHETIC_LOAD_MODEL;
  devices: number;
  accounts: number;
  durationSeconds: number;
  realtimeHealthy: boolean;
  totalPulls: number;
  averagePullsPerSecond: number;
  p95PullsPerSecond: number;
  peakPullsPerSecond: number;
  realtimeWakeDeliveries: number;
  maxRequestsPerAccount: number;
}

function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1_664_525) + 1_013_904_223) >>> 0;
    return state / 0x1_0000_0000;
  };
}

function percentile(values: number[], fraction: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.min(sorted.length - 1, Math.floor(fraction * sorted.length))] ?? 0;
}

export function simulateCentralSyncLoad(
  input: CentralSyncSyntheticLoadInput,
): CentralSyncSyntheticLoadResult {
  const devices = Math.max(0, Math.trunc(input.devices));
  const durationSeconds = Math.max(1, Math.trunc(input.durationSeconds ?? 600));
  const rampUpSeconds = Math.min(
    durationSeconds,
    Math.max(1, Math.trunc(input.rampUpSeconds ?? 120)),
  );
  const devicesPerAccount = Math.min(
    5,
    Math.max(1, Math.trunc(input.devicesPerAccount ?? 5)),
  );
  const changesPerDevicePerMinute = Math.max(
    0,
    input.changesPerDevicePerMinute ?? 0.1,
  );
  const random = seededRandom(input.seed ?? 20_260_803);
  const pullsBySecond = Array.from(
    { length: durationSeconds },
    () => new Set<number>(),
  );
  const requestsByAccount = new Map<number, number>();
  const basePollMs = input.realtimeHealthy
    ? CENTRAL_AUTHORITY_REALTIME_SAFETY_POLL_MS
    : CENTRAL_AUTHORITY_DEGRADED_POLL_MS;
  let realtimeWakeDeliveries = 0;

  function addPull(second: number, deviceId: number) {
    if (second < 0 || second >= durationSeconds) return;
    pullsBySecond[second]?.add(deviceId);
  }

  for (let deviceId = 0; deviceId < devices; deviceId += 1) {
    const openedAt = Math.floor(random() * rampUpSeconds);
    addPull(openedAt, deviceId);

    let nextPollMs = openedAt * 1_000 + basePollMs;
    while (nextPollMs < durationSeconds * 1_000) {
      addPull(Math.floor(nextPollMs / 1_000), deviceId);
      nextPollMs +=
        basePollMs + Math.floor(random() * CENTRAL_AUTHORITY_POLL_JITTER_MS);
    }
  }

  if (input.realtimeHealthy && changesPerDevicePerMinute > 0) {
    const changeIntervalSeconds = 60 / changesPerDevicePerMinute;
    for (let sourceDevice = 0; sourceDevice < devices; sourceDevice += 1) {
      let changedAt = rampUpSeconds + random() * changeIntervalSeconds;
      while (changedAt < durationSeconds) {
        const account = Math.floor(sourceDevice / devicesPerAccount);
        const firstDevice = account * devicesPerAccount;
        const lastDevice = Math.min(devices, firstDevice + devicesPerAccount);
        for (let deviceId = firstDevice; deviceId < lastDevice; deviceId += 1) {
          addPull(Math.floor(changedAt), deviceId);
          realtimeWakeDeliveries += 1;
        }
        changedAt += changeIntervalSeconds;
      }
    }
  }

  let totalPulls = 0;
  for (const devicesInSecond of pullsBySecond) {
    totalPulls += devicesInSecond.size;
    for (const deviceId of devicesInSecond) {
      const account = Math.floor(deviceId / devicesPerAccount);
      requestsByAccount.set(account, (requestsByAccount.get(account) ?? 0) + 1);
    }
  }
  const perSecond = pullsBySecond.map((bucket) => bucket.size);

  return {
    schema: CENTRAL_SYNC_SYNTHETIC_LOAD_MODEL,
    devices,
    accounts: Math.ceil(devices / devicesPerAccount),
    durationSeconds,
    realtimeHealthy: input.realtimeHealthy,
    totalPulls,
    averagePullsPerSecond: totalPulls / durationSeconds,
    p95PullsPerSecond: percentile(perSecond, 0.95),
    peakPullsPerSecond: Math.max(...perSecond),
    realtimeWakeDeliveries,
    maxRequestsPerAccount: Math.max(0, ...requestsByAccount.values()),
  };
}
