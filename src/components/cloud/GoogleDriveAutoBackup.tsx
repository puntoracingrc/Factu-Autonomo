"use client";

import { useEffect, useRef, useState } from "react";
import { useAppStore } from "@/context/AppStore";
import { useCloudSync } from "@/context/CloudSyncContext";
import {
  DEFAULT_DRIVE_BACKUP_SETTINGS,
  DRIVE_BACKUP_SETTINGS_EVENT,
  DRIVE_BACKUP_SETTINGS_KEY,
  buildDriveBackupSignature,
  hasUsableDriveToken,
  loadDriveBackupSettings,
  restoreDriveAccessToken,
  saveDriveBackupSettings,
  shouldRunAutomaticDriveBackup,
  uploadAppBackupToGoogleDrive,
  type DriveBackupSettings,
} from "@/lib/google-drive/backup";
import {
  getGoogleDriveClientId,
  isGoogleDriveBackupEnabled,
} from "@/lib/google-drive/config";
import { runExclusiveDriveBackup } from "@/lib/google-drive/operation";

const AUTO_BACKUP_RETRY_MS = 30_000;

export function GoogleDriveAutoBackup() {
  const { data, ready } = useAppStore();
  const { user, emailConfirmed } = useCloudSync();
  const clientId = getGoogleDriveClientId();
  const driveConfigured = isGoogleDriveBackupEnabled();
  const driveAccountReady = Boolean(user && emailConfirmed);
  const [hydrated, setHydrated] = useState(false);
  const [settings, setSettings] = useState<DriveBackupSettings>(
    DEFAULT_DRIVE_BACKUP_SETTINGS,
  );
  const runningRef = useRef(false);
  const restoreAttemptedRef = useRef(false);
  const scheduledSignatureRef = useRef<string | null>(null);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [retryRevision, setRetryRevision] = useState(0);
  const [tokenRevision, refreshTokenState] = useState(0);

  useEffect(() => {
    function syncSettings() {
      setSettings(loadDriveBackupSettings());
      setHydrated(true);
    }

    function syncSettingsFromStorage(event: StorageEvent) {
      if (event.key === DRIVE_BACKUP_SETTINGS_KEY) syncSettings();
    }

    syncSettings();
    window.addEventListener(DRIVE_BACKUP_SETTINGS_EVENT, syncSettings);
    window.addEventListener("storage", syncSettingsFromStorage);

    return () => {
      window.removeEventListener(DRIVE_BACKUP_SETTINGS_EVENT, syncSettings);
      window.removeEventListener("storage", syncSettingsFromStorage);
    };
  }, []);

  useEffect(
    () => () => {
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    },
    [],
  );

  useEffect(() => {
    if (!ready || !hydrated || !driveConfigured || !driveAccountReady) return;
    if (!settings.enabled || restoreAttemptedRef.current) return;
    if (hasUsableDriveToken()) return;

    restoreAttemptedRef.current = true;
    let cancelled = false;

    void restoreDriveAccessToken(clientId).then((result) => {
      if (!cancelled && result.ok) refreshTokenState((value) => value + 1);
    });

    return () => {
      cancelled = true;
    };
  }, [
    clientId,
    driveAccountReady,
    driveConfigured,
    hydrated,
    ready,
    settings.enabled,
  ]);

  useEffect(() => {
    if (!ready || !hydrated || !driveConfigured || !driveAccountReady) return;
    if (runningRef.current) return;

    const decision = shouldRunAutomaticDriveBackup(settings, data);
    if (!decision.due) return;
    if (!hasUsableDriveToken()) return;
    if (scheduledSignatureRef.current === decision.signature) return;

    scheduledSignatureRef.current = decision.signature;

    const timer = window.setTimeout(async () => {
      const currentSettings = loadDriveBackupSettings();
      const currentDecision = shouldRunAutomaticDriveBackup(
        currentSettings,
        data,
      );

      if (!currentDecision.due || !hasUsableDriveToken()) {
        scheduledSignatureRef.current = null;
        return;
      }

      runningRef.current = true;
      const execution = await runExclusiveDriveBackup(() =>
        uploadAppBackupToGoogleDrive(data, {
          clientId,
          prompt: "",
        }),
      );
      runningRef.current = false;
      scheduledSignatureRef.current = null;

      if (!execution.started || !execution.value.ok) {
        if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
        retryTimerRef.current = setTimeout(() => {
          retryTimerRef.current = null;
          setRetryRevision((value) => value + 1);
        }, AUTO_BACKUP_RETRY_MS);
        return;
      }

      const result = execution.value;
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }

      const signature =
        currentDecision.signature ||
        buildDriveBackupSignature(data, currentSettings.frequency) ||
        result.exportedAt;

      saveDriveBackupSettings({
        ...currentSettings,
        enabled: true,
        lastBackupAt: result.exportedAt,
        lastFileId: result.fileId,
        lastFileName: result.fileName,
        lastWebViewLink: result.webViewLink,
        lastFolderWebViewLink: result.folderWebViewLink,
        lastAutoSignature: signature,
      });
    }, 5000);

    return () => {
      window.clearTimeout(timer);
      if (scheduledSignatureRef.current === decision.signature) {
        scheduledSignatureRef.current = null;
      }
    };
  }, [
    data,
    driveAccountReady,
    driveConfigured,
    hydrated,
    ready,
    settings,
    clientId,
    tokenRevision,
    retryRevision,
  ]);

  return null;
}
