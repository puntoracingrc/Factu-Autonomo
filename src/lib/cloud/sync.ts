import { getDataTimestamp } from "../storage";
import type { AppData } from "../types";

export function pickNewerAppData(
  local: AppData,
  cloud: AppData,
  cloudUpdatedAt: string,
): { data: AppData; source: "local" | "cloud" } {
  const localTime = getDataTimestamp(local);
  const cloudTime = cloudUpdatedAt || getDataTimestamp(cloud);

  if (localTime >= cloudTime) {
    return { data: local, source: "local" };
  }

  return {
    data: {
      ...cloud,
      meta: {
        ...cloud.meta,
        lastModified: cloudTime,
        lastSyncedAt: cloudUpdatedAt,
      },
    },
    source: "cloud",
  };
}

export function markSynced(data: AppData, syncedAt: string): AppData {
  return {
    ...data,
    meta: {
      ...data.meta,
      lastModified: getDataTimestamp(data),
      lastSyncedAt: syncedAt,
    },
  };
}
