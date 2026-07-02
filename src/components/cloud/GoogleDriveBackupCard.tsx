"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  FileJson,
  FolderOpen,
  HardDrive,
  RefreshCw,
  ShieldCheck,
  Unplug,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field, Select } from "@/components/ui/Field";
import { useAppStore } from "@/context/AppStore";
import {
  DEFAULT_DRIVE_BACKUP_SETTINGS,
  buildDriveBackupSignature,
  clearDriveAccessToken,
  hasUsableDriveToken,
  loadDriveBackupSettings,
  saveDriveBackupSettings,
  shouldRunAutomaticDriveBackup,
  startGoogleDriveBackupRedirect,
  uploadAppBackupToGoogleDrive,
  type DriveBackupSettings,
} from "@/lib/google-drive/backup";
import {
  getGoogleDriveClientId,
  isGoogleDriveBackupEnabled,
} from "@/lib/google-drive/config";

type FeedbackTone = "success" | "error" | "info";

const FREQUENCY_LABELS: Record<DriveBackupSettings["frequency"], string> = {
  manual: "Solo cuando pulse guardar",
  daily: "Una vez al día",
  important: "Al guardar documentos o gastos",
  every_change: "Cada cambio guardado",
};

function formatLastBackup(value?: string): string {
  if (!value) return "Sin copias en Drive desde este navegador";
  return new Intl.DateTimeFormat("es-ES", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function driveStatusCopy(input: {
  enabled: boolean;
  tokenReady: boolean;
}): { label: string; className: string; icon: "ok" | "warn" | "off" } {
  if (!input.enabled) {
    return {
      label: "Drive no conectado",
      className: "bg-slate-100 text-slate-700",
      icon: "off",
    };
  }

  if (!input.tokenReady) {
    return {
      label: "Drive necesita reconectar",
      className: "bg-amber-50 text-amber-800",
      icon: "warn",
    };
  }

  return {
    label: "Drive conectado",
    className: "bg-emerald-50 text-emerald-800",
    icon: "ok",
  };
}

export function GoogleDriveBackupCard() {
  const { data } = useAppStore();
  const clientId = getGoogleDriveClientId();
  const driveConfigured = isGoogleDriveBackupEnabled();
  const [settings, setSettings] = useState<DriveBackupSettings>(
    DEFAULT_DRIVE_BACKUP_SETTINGS,
  );
  const [hydrated, setHydrated] = useState(false);
  const [busy, setBusy] = useState(false);
  const [tokenReady, setTokenReady] = useState(false);
  const [feedback, setFeedback] = useState<{
    tone: FeedbackTone;
    message: string;
  } | null>(null);
  const autoNoticeSignatureRef = useRef<string | null>(null);

  useEffect(() => {
    setSettings(loadDriveBackupSettings());
    setTokenReady(hasUsableDriveToken());
    setHydrated(true);
  }, []);

  const persistSettings = useCallback(
    (
      updater:
        | DriveBackupSettings
        | ((current: DriveBackupSettings) => DriveBackupSettings),
    ) => {
      setSettings((current) => {
        const next = typeof updater === "function" ? updater(current) : updater;
        saveDriveBackupSettings(next);
        return next;
      });
    },
    [],
  );

  const runDriveBackup = useCallback(
    async (options: { automatic?: boolean; signature?: string } = {}) => {
      if (!driveConfigured) {
        setFeedback({
          tone: "error",
          message: "La copia extra en Google Drive aún no está disponible aquí.",
        });
        return;
      }

      setBusy(true);
      setFeedback({
        tone: "info",
        message: options.automatic
          ? "Guardando copia automática en Drive…"
          : "Guardando copia en Drive…",
      });

      const result = await uploadAppBackupToGoogleDrive(data, {
        clientId,
        prompt: settings.enabled ? "" : "consent",
      });

      setBusy(false);

      if (!result.ok) {
        setTokenReady(hasUsableDriveToken());
        setFeedback({ tone: "error", message: result.error });
        return;
      }

      setTokenReady(true);

      const signature =
        options.signature ||
        buildDriveBackupSignature(data, settings.frequency) ||
        result.exportedAt;

      persistSettings((current) => ({
        ...current,
        enabled: true,
        lastBackupAt: result.exportedAt,
        lastFileId: result.fileId,
        lastFileName: result.fileName,
        lastWebViewLink: result.webViewLink,
        lastFolderWebViewLink: result.folderWebViewLink,
        lastAutoSignature: signature,
      }));

      setFeedback({
        tone: "success",
        message: options.automatic
          ? `Copia automática guardada en Drive: ${result.fileName}`
          : `Copia guardada en la carpeta de Drive: ${result.fileName}`,
      });
    },
    [
      clientId,
      data,
      driveConfigured,
      persistSettings,
      settings.enabled,
      settings.frequency,
    ],
  );

  const startDriveConnection = useCallback(() => {
    if (!driveConfigured) {
      setFeedback({
        tone: "error",
        message: "La copia extra en Google Drive aún no está disponible aquí.",
      });
      return;
    }

    if (settings.enabled && hasUsableDriveToken()) {
      setTokenReady(true);
      void runDriveBackup();
      return;
    }

    setTokenReady(false);

    setBusy(true);
    setFeedback({
      tone: "info",
      message: "Te llevamos a Google para dar permiso y volver a Factu.",
    });

    const result = startGoogleDriveBackupRedirect({
      clientId,
      frequency: settings.frequency,
    });

    if (!result.ok) {
      setBusy(false);
      setFeedback({ tone: "error", message: result.error });
    }
  }, [
    clientId,
    driveConfigured,
    runDriveBackup,
    settings.enabled,
    settings.frequency,
  ]);

  useEffect(() => {
    if (!hydrated || !driveConfigured || busy) return;

    const decision = shouldRunAutomaticDriveBackup(settings, data);
    if (!decision.due) return;

    if (!hasUsableDriveToken()) {
      setTokenReady(false);
      if (autoNoticeSignatureRef.current !== decision.signature) {
        autoNoticeSignatureRef.current = decision.signature;
        setFeedback({
          tone: "info",
          message:
            "Drive está activado, pero Google necesita renovar el permiso. Pulsa Guardar en Drive ahora cuando quieras.",
        });
      }
      return;
    }

    setTokenReady(true);

    const timer = window.setTimeout(() => {
      void runDriveBackup({
        automatic: true,
        signature: decision.signature,
      });
    }, 5000);

    return () => window.clearTimeout(timer);
  }, [busy, data, driveConfigured, hydrated, runDriveBackup, settings]);

  function updateFrequency(value: DriveBackupSettings["frequency"]) {
    persistSettings((current) => ({ ...current, frequency: value }));
  }

  function disableDriveBackups() {
    clearDriveAccessToken();
    setTokenReady(false);
    persistSettings((current) => ({
      ...current,
      enabled: false,
      frequency: "manual",
      lastAutoSignature: undefined,
    }));
    setFeedback({
      tone: "info",
      message:
        "Drive desconectado en este navegador. Las copias ya guardadas siguen en tu Google Drive.",
    });
  }

  const statusCopy = driveStatusCopy({ enabled: settings.enabled, tokenReady });
  const StatusIcon =
    statusCopy.icon === "ok"
      ? CheckCircle2
      : statusCopy.icon === "warn"
        ? AlertTriangle
        : Unplug;
  const actionLabel = settings.enabled
    ? tokenReady
      ? "Guardar en Drive ahora"
      : "Reconectar Drive"
    : "Conectar Drive";
  const folderLink = settings.lastFolderWebViewLink;
  const fileLink = settings.lastWebViewLink;

  return (
    <section id="drive-backup">
      <Card className="mb-6 space-y-4 border-blue-100 bg-white">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
              <HardDrive className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Copia extra en Google Drive
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Drive no sirve para iniciar sesión. Solo guarda una copia extra
                si lo conectas aquí, además de la nube de Factu.
              </p>
            </div>
          </div>

          <span
            className={`inline-flex w-fit items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold ${statusCopy.className}`}
          >
            <StatusIcon className="h-4 w-4" />
            {statusCopy.label}
          </span>
        </div>

        <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-900">
          Google pedirá el permiso limitado a los archivos que use esta app. No
          pedimos leer todo tu Drive ni gestionar carpetas ajenas.
        </div>

        {!driveConfigured ? (
          <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
            La copia extra en Google Drive aún no está disponible aquí. Puedes
            seguir usando la copia manual y la nube de Factu.
          </p>
        ) : null}

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <Field
            label="Frecuencia"
            hint="Los automatismos de Drive funcionan cuando la app está abierta y Google mantiene el permiso activo."
          >
            <Select
              value={settings.frequency}
              disabled={!driveConfigured || busy}
              onChange={(event) =>
                updateFrequency(
                  event.target.value as DriveBackupSettings["frequency"],
                )
              }
            >
              {Object.entries(FREQUENCY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </Field>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              onClick={startDriveConnection}
              disabled={!driveConfigured || busy}
            >
              {busy ? (
                <RefreshCw className="h-5 w-5 animate-spin" />
              ) : (
                <ShieldCheck className="h-5 w-5" />
              )}
              {actionLabel}
            </Button>
            {settings.enabled ? (
              <Button
                type="button"
                variant="ghost"
                onClick={disableDriveBackups}
              >
                <Unplug className="h-5 w-5" />
                Desconectar Drive
              </Button>
            ) : null}
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl bg-slate-50 px-4 py-3">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Última copia
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-900">
              {formatLastBackup(settings.lastBackupAt)}
            </p>
          </div>
          <div className="rounded-2xl bg-slate-50 px-4 py-3">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Frecuencia
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-900">
              {FREQUENCY_LABELS[settings.frequency]}
            </p>
          </div>
          <div className="rounded-2xl bg-slate-50 px-4 py-3">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Archivo
            </p>
            <p className="mt-1 truncate text-sm font-semibold text-slate-900">
              {settings.lastFileName || "Aún no hay copia guardada"}
            </p>
          </div>
        </div>

        {settings.enabled && !tokenReady ? (
          <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Google puede pedirte permiso de nuevo antes de guardar la próxima
            copia.
          </p>
        ) : null}

        {folderLink || fileLink ? (
          <div className="flex flex-col gap-2 sm:flex-row">
            {folderLink ? (
              <a
                href={folderLink}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border-2 border-blue-200 bg-white px-5 text-base font-semibold text-blue-700 transition-colors hover:bg-blue-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
              >
                <FolderOpen className="h-5 w-5" />
                Abrir carpeta de copias
                <ExternalLink className="h-4 w-4" />
              </a>
            ) : null}
            {fileLink ? (
              <a
                href={fileLink}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-slate-100 px-5 text-base font-semibold text-slate-700 transition-colors hover:bg-slate-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
              >
                <FileJson className="h-5 w-5" />
                Ver último JSON
                <ExternalLink className="h-4 w-4" />
              </a>
            ) : null}
          </div>
        ) : null}

        {feedback ? (
          <p
            aria-live="polite"
            className={`text-sm font-medium ${
              feedback.tone === "success"
                ? "text-emerald-700"
                : feedback.tone === "error"
                  ? "text-red-600"
                  : "text-slate-600"
            }`}
          >
            {feedback.message}
          </p>
        ) : null}
      </Card>
    </section>
  );
}
