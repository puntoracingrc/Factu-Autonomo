"use client";

import { useEffect, useState } from "react";
import { HardDrive, ShieldCheck } from "lucide-react";
import { GoogleDriveBackupCard } from "@/components/cloud/GoogleDriveBackupCard";
import { Button } from "@/components/ui/Button";
import {
  DEFAULT_DRIVE_BACKUP_SETTINGS,
  DRIVE_BACKUP_SETTINGS_EVENT,
  DRIVE_BACKUP_SETTINGS_KEY,
  loadDriveBackupSettings,
  saveDriveBackupSettings,
  type DriveBackupSettings,
} from "@/lib/google-drive/backup";
import { isGoogleDriveBackupEnabled } from "@/lib/google-drive/config";
import {
  firstUseDriveDismissedStorageKey,
  shouldShowFirstUseDriveBackup,
} from "@/lib/first-use-onboarding";

export function FirstUseDriveBackupPanel({ userId }: { userId: string }) {
  const driveConfigured = isGoogleDriveBackupEnabled();
  const dismissedStorageKey = firstUseDriveDismissedStorageKey(userId);
  const [settings, setSettings] = useState<DriveBackupSettings>(
    DEFAULT_DRIVE_BACKUP_SETTINGS,
  );
  const [dismissed, setDismissed] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    function syncDriveState() {
      setSettings(loadDriveBackupSettings());
      try {
        setDismissed(
          window.localStorage.getItem(dismissedStorageKey) === "1",
        );
      } catch {
        setDismissed(false);
      }
      setHydrated(true);
    }

    function syncDriveStateFromStorage(event: StorageEvent) {
      if (
        event.key === DRIVE_BACKUP_SETTINGS_KEY ||
        event.key === dismissedStorageKey
      ) {
        syncDriveState();
      }
    }

    syncDriveState();
    window.addEventListener(DRIVE_BACKUP_SETTINGS_EVENT, syncDriveState);
    window.addEventListener("storage", syncDriveStateFromStorage);

    return () => {
      window.removeEventListener(DRIVE_BACKUP_SETTINGS_EVENT, syncDriveState);
      window.removeEventListener("storage", syncDriveStateFromStorage);
    };
  }, [dismissedStorageKey]);

  function dismissDriveSuggestion() {
    setDismissed(true);
    try {
      window.localStorage.setItem(dismissedStorageKey, "1");
    } catch {
      // The suggestion is already closed for the current session.
    }
  }

  function openDriveConfiguration() {
    if (settings.frequency === "manual") {
      const nextSettings = { ...settings, frequency: "daily" as const };
      saveDriveBackupSettings(nextSettings);
      setSettings(nextSettings);
    }
    setExpanded(true);
  }

  if (
    !shouldShowFirstUseDriveBackup({
      dismissed,
      driveConfigured,
      driveEnabled: settings.enabled,
      hydrated,
    })
  ) {
    return null;
  }

  if (expanded) {
    return (
      <GoogleDriveBackupCard
        variant="onboarding"
        returnPath="/"
        onDismiss={dismissDriveSuggestion}
      />
    );
  }

  return (
    <section
      className="mb-6 rounded-2xl border border-blue-200 bg-blue-50 p-5 shadow-sm"
      aria-label="Copia de seguridad adicional"
    >
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-blue-700 shadow-sm">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div className="max-w-3xl">
            <p className="text-sm font-black uppercase tracking-wide text-blue-700">
              Protege tus datos
            </p>
            <h2 className="mt-1 text-xl font-black text-slate-950">
              Añade una copia automática en Google Drive
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-700">
              Tus datos ya se sincronizan en la nube de Factu. Si quieres una
              copia de seguridad automática adicional bajo tu control, puedes
              guardarla cifrada en tu Google Drive.
            </p>
          </div>
        </div>

        <div className="flex shrink-0 flex-col gap-2 sm:flex-row lg:flex-col xl:flex-row">
          <Button type="button" onClick={openDriveConfiguration}>
            <HardDrive className="h-5 w-5" />
            Conectar con Drive
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={dismissDriveSuggestion}
          >
            Omitir por ahora
          </Button>
        </div>
      </div>
    </section>
  );
}
