"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, HardDrive, Loader2 } from "lucide-react";
import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useAppStore } from "@/context/AppStore";
import {
  buildDriveBackupSignature,
  cacheDriveAccessToken,
  clearPendingDriveBackupRequest,
  DRIVE_BACKUP_CALLBACK_PATH,
  loadDriveBackupSettings,
  loadPendingDriveBackupRequest,
  saveDriveBackupSettings,
  uploadAppBackupToGoogleDriveWithAccessToken,
} from "@/lib/google-drive/backup";

type CallbackStatus =
  | { state: "working"; message: string }
  | {
      state: "success";
      message: string;
      fileName: string;
      webViewLink?: string;
      folderWebViewLink?: string;
    }
  | { state: "error"; message: string };

interface TokenExchangeResponse {
  accessToken?: string;
  expiresIn?: number;
  error?: string;
}

function googleErrorMessage(error: string): string {
  if (error === "access_denied") {
    return "Google ha rechazado el permiso. Vuelve a conectar Drive si quieres guardar la copia extra.";
  }

  return "Google no ha devuelto el permiso de Drive. Vuelve a intentarlo desde Cuenta.";
}

async function exchangeCodeForAccessToken(input: {
  code: string;
  redirectUri: string;
}): Promise<{ accessToken: string; expiresIn: number }> {
  const response = await fetch("/api/google-drive/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const payload = (await response.json()) as TokenExchangeResponse;

  if (!response.ok || !payload.accessToken) {
    throw new Error(
      payload.error || "No se pudo completar el permiso de Google Drive.",
    );
  }

  return {
    accessToken: payload.accessToken,
    expiresIn: payload.expiresIn ?? 3600,
  };
}

export default function GoogleDriveCallbackPage() {
  const { data, ready } = useAppStore();
  const handledRef = useRef(false);
  const [status, setStatus] = useState<CallbackStatus>({
    state: "working",
    message: "Terminando la conexión con Google Drive…",
  });

  useEffect(() => {
    if (!ready || handledRef.current) return;
    handledRef.current = true;

    async function completeDriveBackup() {
      try {
        const params = new URLSearchParams(window.location.search);
        const googleError = params.get("error")?.trim();
        if (googleError) {
          clearPendingDriveBackupRequest();
          setStatus({
            state: "error",
            message: googleErrorMessage(googleError),
          });
          return;
        }

        const code = params.get("code")?.trim() ?? "";
        const state = params.get("state")?.trim() ?? "";
        const pending = loadPendingDriveBackupRequest(state);

        if (!code || !pending) {
          setStatus({
            state: "error",
            message:
              "No hemos podido validar la vuelta de Google. Vuelve a conectar Drive desde Cuenta.",
          });
          return;
        }

        window.history.replaceState(null, "", DRIVE_BACKUP_CALLBACK_PATH);
        setStatus({
          state: "working",
          message: "Permiso recibido. Guardando la copia en tu Drive…",
        });

        const redirectUri = `${window.location.origin}${DRIVE_BACKUP_CALLBACK_PATH}`;
        const token = await exchangeCodeForAccessToken({ code, redirectUri });
        cacheDriveAccessToken(token.accessToken, token.expiresIn);

        const result = await uploadAppBackupToGoogleDriveWithAccessToken(
          data,
          token.accessToken,
        );

        if (!result.ok) {
          throw new Error(result.error);
        }

        const currentSettings = loadDriveBackupSettings();
        const signature =
          buildDriveBackupSignature(data, pending.frequency) || result.exportedAt;

        saveDriveBackupSettings({
          ...currentSettings,
          enabled: true,
          frequency: pending.frequency,
          lastBackupAt: result.exportedAt,
          lastFileId: result.fileId,
          lastFileName: result.fileName,
          lastWebViewLink: result.webViewLink,
          lastAutoSignature: signature,
        });
        clearPendingDriveBackupRequest();

        setStatus({
          state: "success",
          message: "Copia guardada en Google Drive.",
          fileName: result.fileName,
          webViewLink: result.webViewLink,
          folderWebViewLink: result.folderWebViewLink,
        });
      } catch (error) {
        clearPendingDriveBackupRequest();
        setStatus({
          state: "error",
          message:
            error instanceof Error
              ? error.message
              : "No se pudo guardar la copia en Drive.",
        });
      }
    }

    void completeDriveBackup();
  }, [data, ready]);

  const icon =
    status.state === "success" ? (
      <CheckCircle2 className="h-6 w-6 text-emerald-700" />
    ) : status.state === "error" ? (
      <AlertTriangle className="h-6 w-6 text-red-600" />
    ) : (
      <Loader2 className="h-6 w-6 animate-spin text-blue-700" />
    );

  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-3xl items-center px-4 py-10">
      <Card className="w-full space-y-5 border-blue-100 bg-white">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50">
            {icon}
          </div>
          <div>
            <p className="flex items-center gap-2 text-sm font-semibold text-blue-700">
              <HardDrive className="h-4 w-4" />
              Google Drive
            </p>
            <h1 className="mt-2 text-2xl font-bold text-slate-900">
              {status.state === "success"
                ? "Copia extra lista"
                : status.state === "error"
                  ? "No se pudo completar Drive"
                  : "Conectando Drive"}
            </h1>
            <p className="mt-2 text-slate-600">{status.message}</p>
          </div>
        </div>

        {status.state === "success" ? (
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
            <p className="font-semibold">{status.fileName}</p>
            <p className="mt-1">
              Se ha guardado en la carpeta “Factu - copias de seguridad”.
            </p>
            {status.folderWebViewLink ? (
              <a
                href={status.folderWebViewLink}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex font-semibold text-emerald-800 underline"
              >
                Abrir carpeta en Drive
              </a>
            ) : null}
            {status.webViewLink ? (
              <a
                href={status.webViewLink}
                target="_blank"
                rel="noreferrer"
                className="ml-4 mt-3 inline-flex font-semibold text-emerald-800 underline"
              >
                Ver archivo JSON
              </a>
            ) : null}
          </div>
        ) : null}

        <div className="flex flex-col gap-3 sm:flex-row">
          <ButtonLink href="/cuenta#drive-backup">
            Volver a Cuenta
          </ButtonLink>
          {status.state === "error" ? (
            <ButtonLink href="/cuenta#drive-backup" variant="secondary">
              Reintentar desde Cuenta
            </ButtonLink>
          ) : null}
        </div>
      </Card>
    </main>
  );
}
