import {
  FISCAL_WORKSPACE_DIVERGED_SYNC_ISSUE,
  FISCAL_WORKSPACE_DIVERGED_SYNC_ISSUE_CODE,
  type CloudSyncReviewIssue,
} from "./sync-errors";
import { hasPendingSyncChanges } from "./incremental";
import { hasUnsyncedChanges } from "./sync-queue";
import type { AppData } from "../types";

const CLOUD_SYNC_REVIEW_PREFIX = "factura-autonomo-cloud-sync-review";

export function cloudSyncReviewKey(userId: string): string {
  return `${CLOUD_SYNC_REVIEW_PREFIX}:${userId}`;
}

export function parseCloudSyncReviewIssue(
  value: string | null,
): CloudSyncReviewIssue | null {
  return value === FISCAL_WORKSPACE_DIVERGED_SYNC_ISSUE_CODE
    ? FISCAL_WORKSPACE_DIVERGED_SYNC_ISSUE
    : null;
}

export function readCloudSyncReviewIssue(
  userId: string,
): CloudSyncReviewIssue | null {
  if (typeof localStorage === "undefined") return null;
  return parseCloudSyncReviewIssue(
    localStorage.getItem(cloudSyncReviewKey(userId)),
  );
}

export function rememberCloudSyncReviewIssue(
  userId: string,
  issue: CloudSyncReviewIssue,
): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(cloudSyncReviewKey(userId), issue.code);
}

export function clearCloudSyncReviewIssue(userId: string): void {
  if (typeof localStorage === "undefined") return;
  localStorage.removeItem(cloudSyncReviewKey(userId));
}

export function subscribeCloudSyncReviewIssue(
  userId: string,
  listener: (issue: CloudSyncReviewIssue | null) => void,
): () => void {
  if (typeof window === "undefined") return () => undefined;
  const expectedKey = cloudSyncReviewKey(userId);
  const handleStorage = (event: StorageEvent) => {
    if (event.key !== expectedKey) return;
    listener(parseCloudSyncReviewIssue(event.newValue));
  };
  window.addEventListener("storage", handleStorage);
  return () => window.removeEventListener("storage", handleStorage);
}

export function canAdoptResolvedCloudSnapshot(
  data: AppData,
  hasPendingFlag: boolean,
): boolean {
  return (
    !hasPendingFlag &&
    !hasPendingSyncChanges(data) &&
    !hasUnsyncedChanges(data)
  );
}

export function resolveCloudSyncReviewFromPersistedSnapshot(input: {
  snapshot: AppData | null;
  hasPendingFlag: boolean;
  adopt: (snapshot: AppData) => boolean;
  commitResolution: () => void;
}): boolean {
  if (
    !input.snapshot ||
    !canAdoptResolvedCloudSnapshot(input.snapshot, input.hasPendingFlag) ||
    !input.adopt(input.snapshot)
  ) {
    return false;
  }
  input.commitResolution();
  return true;
}
