"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { HardDrive, RefreshCw, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field, Select } from "@/components/ui/Field";
import { useAppStore } from "@/context/AppStore";
import {
  DEFAULT_DRIVE_BACKUP_SETTINGS,
  buildDriveBackupSignature,
  hasUsableDriveToken,
  loadDriveBackupSettings,
  saveDriveBackupSettings,
  shouldRunAutomaticDriveBackup,
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

export function GoogleDriveBackupCard() {
  const { data } = useAppStore();
  const clientId = getGoogleDriveClientId();
  const driveConfigured = isGoogleDriveBackupEnabled();
  const [settings, setSettings] = useState<DriveBackupSettings>(
    DEFAULT_DRIVE_BACKUP_SETTINGS,
  );
  const [hydrated, setHydrated] = useState(false);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{
    tone: FeedbackTone;
    message: string;
  } | null>(null);
  const autoNoticeSignatureRef = useRef<string | null>(null);

  useEffect(() => {
    setSettings(loadDriveBackupSettings());
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
          : "Abriendo Google Drive…",
      });

      const result = await uploadAppBackupToGoogleDrive(data, {
        clientId,
        prompt: settings.enabled ? "" : "consent",
      });

      setBusy(false);

      if (!result.ok) {
        setFeedback({ tone: "error", message: result.error });
        return;
      }

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
        lastAutoSignature: signature,
      }));

      setFeedback({
        tone: "success",
        message: options.automatic
          ? `Copia automática guardada en Drive: ${result.fileName}`
          : `Copia guardada en Drive: ${result.fileName}`,
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

  useEffect(() => {
    if (!hydrated || !driveConfigured || busy) return;

    const decision = shouldRunAutomaticDriveBackup(settings, data);
    if (!decision.due) return;

    if (!hasUsableDriveToken()) {
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
    persistSettings((current) => ({
      ...current,
      enabled: false,
      frequency: "manual",
      lastAutoSignature: undefined,
    }));
    setFeedback({
      tone: "info",
      message: "Copia extra en Drive desactivada en este navegador.",
    });
  }

  return (
    <Card className="mb-6 space-y-4 border-blue-100 bg-white">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
          <HardDrive className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-900">
            Copia extra en Google Drive
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Opcional: además de la nube de Factu, guarda un archivo JSON en tu
            Drive. Google solo da permiso para archivos creados por esta app.
          </p>
        </div>
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
            onClick={() => void runDriveBackup()}
            disabled={!driveConfigured || busy}
          >
            {busy ? (
              <RefreshCw className="h-5 w-5 animate-spin" />
            ) : (
              <ShieldCheck className="h-5 w-5" />
            )}
            {settings.enabled ? "Guardar en Drive ahora" : "Conectar Drive"}
          </Button>
          {settings.enabled ? (
            <Button type="button" variant="ghost" onClick={disableDriveBackups}>
              Desactivar
            </Button>
          ) : null}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
        <p>
          Estado:{" "}
          <strong className="text-slate-900">
            {settings.enabled ? "Drive activado" : "Drive no activado"}
          </strong>
        </p>
        <p className="mt-1">Última copia: {formatLastBackup(settings.lastBackupAt)}</p>
        {settings.lastWebViewLink ? (
          <a
            href={settings.lastWebViewLink}
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-flex font-semibold text-blue-700 underline"
          >
            Ver última copia en Drive
          </a>
        ) : null}
      </div>

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
  );
}
