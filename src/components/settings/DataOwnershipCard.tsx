"use client";

import { useRef, useState } from "react";
import { Download, FileJson, HardDrive, Shield } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useCloudSync } from "@/context/CloudSyncContext";
import { useAppStore } from "@/context/AppStore";
import {
  buildBackupRestoreDraft,
  downloadBackup,
  getBackupRestoreBlocker,
} from "@/lib/backup";
import type { BackupRestoreDraft } from "@/lib/backup";

export function DataOwnershipCard() {
  const { data, replaceData } = useAppStore();
  const { user, cloudEnabled } = useCloudSync();
  const hasCloudSession = Boolean(user);
  const [backupFeedback, setBackupFeedback] = useState<{
    tone: "success" | "error";
    message: string;
  } | null>(null);
  const [selectedBackupFile, setSelectedBackupFile] = useState<File | null>(null);
  const [restoreDraft, setRestoreDraft] = useState<BackupRestoreDraft | null>(
    null,
  );
  const [importError, setImportError] = useState<string | null>(null);
  const [currentBackupReady, setCurrentBackupReady] = useState(false);
  const [confirmedReplacement, setConfirmedReplacement] = useState(false);
  const [confirmedCurrentBackup, setConfirmedCurrentBackup] = useState(false);
  const [restoreFeedback, setRestoreFeedback] = useState<{
    tone: "success" | "error";
    message: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const restoreBlocker = getBackupRestoreBlocker({
    draftReady: Boolean(restoreDraft),
    currentBackupReady,
    confirmedReplacement,
    confirmedCurrentBackup,
  });

  function handleBackupExport() {
    const result = downloadBackup(data);
    if (result.ok) {
      setBackupFeedback({
        tone: "success",
        message: `Copia descargada: ${result.filename}`,
      });
      return;
    }

    setBackupFeedback({
      tone: "error",
      message: `${result.error} Prueba de nuevo desde este navegador.`,
    });
  }

  function readSelectedBackupFile(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error("read_error"));
      reader.onload = () => {
        if (typeof reader.result === "string") {
          resolve(reader.result);
          return;
        }
        reject(new Error("read_error"));
      };
      reader.readAsText(file);
    });
  }

  function handleBackupFileChange(file: File | undefined) {
    setSelectedBackupFile(file ?? null);
    setRestoreDraft(null);
    setImportError(null);
    setCurrentBackupReady(false);
    setConfirmedReplacement(false);
    setConfirmedCurrentBackup(false);
    setRestoreFeedback(null);
  }

  async function handleReviewBackup() {
    if (!selectedBackupFile) {
      setImportError("Selecciona primero un archivo JSON de copia.");
      return;
    }

    setImportError(null);
    setRestoreDraft(null);
    setCurrentBackupReady(false);
    setConfirmedReplacement(false);
    setConfirmedCurrentBackup(false);
    setRestoreFeedback(null);

    try {
      const rawText = await readSelectedBackupFile(selectedBackupFile);
      const result = buildBackupRestoreDraft({
        fileName: selectedBackupFile.name,
        mimeType: selectedBackupFile.type,
        byteLength: selectedBackupFile.size,
        rawText,
      });

      if (!result.ok) {
        setImportError(result.error);
        return;
      }

      setRestoreDraft(result.draft);
    } catch {
      setImportError("No se pudo leer el archivo seleccionado.");
    }
  }

  function handlePrepareCurrentBackup() {
    setRestoreFeedback(null);
    const result = downloadBackup(data);
    if (!result.ok) {
      setCurrentBackupReady(false);
      setConfirmedCurrentBackup(false);
      setRestoreFeedback({
        tone: "error",
        message: `${result.error} No se puede restaurar sin una copia actual.`,
      });
      return;
    }

    setCurrentBackupReady(true);
    setRestoreFeedback({
      tone: "success",
      message: `Copia actual descargada: ${result.filename}`,
    });
  }

  function handleRestoreBackup() {
    const blocker = getBackupRestoreBlocker({
      draftReady: Boolean(restoreDraft),
      currentBackupReady,
      confirmedReplacement,
      confirmedCurrentBackup,
    });

    if (blocker || !restoreDraft) {
      setRestoreFeedback({
        tone: "error",
        message: blocker ?? "La copia no está lista para restaurar.",
      });
      return;
    }

    replaceData(restoreDraft.data, { fromRemote: true });
    setRestoreFeedback({
      tone: "success",
      message:
        "Copia restaurada. Los datos locales se han reemplazado en este navegador.",
    });
    setConfirmedReplacement(false);
    setConfirmedCurrentBackup(false);
    setCurrentBackupReady(false);
  }

  return (
    <Card className="mb-6 space-y-4 border-slate-200 bg-slate-50/80">
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-blue-100 p-2 text-blue-700">
          <Shield className="h-5 w-5" />
        </div>
        <div>
          <h2 className="font-bold text-slate-900">¿Dónde están mis datos?</h2>
          <p className="mt-1 text-sm text-slate-600">
            Tus facturas y gastos son tuyos. Esta app no los vende ni los usa para
            otra cosa.
          </p>
        </div>
      </div>

      <ul className="space-y-3 text-sm text-slate-700">
        <li className="flex gap-2">
          <HardDrive className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
          <span>
            <strong>En este dispositivo:</strong> todo se guarda en tu navegador
            (móvil u ordenador). Funciona sin cuenta. Si borras datos del sitio o
            cambias de navegador sin copia, puedes perder el histórico.
          </span>
        </li>
        {cloudEnabled && (
          <li className="flex gap-2">
            <Shield className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
            <span>
              <strong>En la nube (opcional):</strong> si creas cuenta, una copia
              se sincroniza en tu espacio privado.{" "}
              {hasCloudSession
                ? "Solo entra quien tenga tu email y contraseña de esa cuenta."
                : "Solo tú, con tu email y contraseña."}{" "}
              Otros usuarios de Factu no ven tus datos.
            </span>
          </li>
        )}
        <li className="flex gap-2">
          <Shield className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <span>
            <strong>Contraseña:</strong> si alguien obtiene tu email y contraseña
            de la cuenta en la nube, podría entrar desde otro dispositivo y ver tu
            copia sincronizada. Usa una contraseña fuerte y no la compartas. Sin
            cuenta en la nube, el riesgo es quien use tu móvil u ordenador
            desbloqueado.
          </span>
        </li>
      </ul>

      <div className="rounded-2xl border border-blue-100 bg-white p-4">
        <h3 className="text-base font-bold text-slate-900">Copia de seguridad</h3>
        <p className="mt-1 text-sm text-slate-600">
          Descarga una copia JSON de tus datos locales. Guárdala en un lugar
          seguro.
        </p>
        <p className="mt-2 text-xs text-slate-500">
          Esta copia puede contener datos personales y fiscales. No se sube a
          ningún servidor y no aplica datos automáticamente.
        </p>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <Button variant="secondary" onClick={handleBackupExport}>
            <Download className="h-5 w-5" />
            Exportar copia de seguridad
          </Button>
        </div>
        {backupFeedback && (
          <p
            aria-live="polite"
            className={`mt-3 text-sm font-medium ${
              backupFeedback.tone === "success"
                ? "text-emerald-700"
                : "text-red-600"
            }`}
          >
            {backupFeedback.message}
          </p>
        )}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <h3 className="text-base font-bold text-slate-900">
          Importar copia de seguridad
        </h3>
        <p className="mt-1 text-sm text-slate-600">
          Selecciona una copia JSON para revisarla antes de restaurar. No se
          aplicarán cambios.
        </p>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <Button
            type="button"
            variant="secondary"
            onClick={() => fileInputRef.current?.click()}
          >
            <FileJson className="h-5 w-5" />
            Seleccionar archivo de copia
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => void handleReviewBackup()}
            disabled={!selectedBackupFile}
          >
            Revisar copia
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(event) =>
              handleBackupFileChange(event.target.files?.[0])
            }
          />
        </div>
        {selectedBackupFile && (
          <p className="mt-3 text-xs text-slate-500">
            Archivo seleccionado: {selectedBackupFile.name}
          </p>
        )}
        {importError && (
          <p aria-live="polite" className="mt-3 text-sm font-medium text-red-600">
            {importError}
          </p>
        )}
        {restoreDraft && (
          <div
            aria-live="polite"
            className="mt-4 space-y-3 rounded-xl border border-emerald-100 bg-emerald-50 p-4 text-sm text-emerald-950"
          >
            <div>
              <p className="font-semibold">Resumen de la copia</p>
              <p className="mt-1 text-emerald-900">
                Exportada el {restoreDraft.preview.exportedAt.slice(0, 10)} ·
                versión {restoreDraft.preview.exportVersion} · origen{" "}
                {restoreDraft.preview.source}
              </p>
            </div>
            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div>
                <dt className="text-xs text-emerald-800">Clientes</dt>
                <dd className="font-bold">
                  {restoreDraft.preview.counts.customers}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-emerald-800">Documentos</dt>
                <dd className="font-bold">
                  {restoreDraft.preview.counts.documents}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-emerald-800">Presupuestos</dt>
                <dd className="font-bold">
                  {restoreDraft.preview.counts.quotes}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-emerald-800">Facturas</dt>
                <dd className="font-bold">
                  {restoreDraft.preview.counts.invoices}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-emerald-800">Emitidas</dt>
                <dd className="font-bold">
                  {restoreDraft.preview.counts.issuedInvoices}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-emerald-800">Cobradas</dt>
                <dd className="font-bold">
                  {restoreDraft.preview.counts.paidInvoices}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-emerald-800">Proveedores</dt>
                <dd className="font-bold">
                  {restoreDraft.preview.counts.suppliers}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-emerald-800">Gastos</dt>
                <dd className="font-bold">
                  {restoreDraft.preview.counts.expenses}
                </dd>
              </div>
            </dl>
            <p>
              Perfil emisor:{" "}
              <strong>
                {restoreDraft.preview.hasIssuerProfile ? "incluido" : "vacío"}
              </strong>
            </p>
            <ul className="space-y-1">
              {restoreDraft.preview.warnings.map((warning) => (
                <li key={warning}>· {warning}</li>
              ))}
            </ul>
            <div className="space-y-3 rounded-xl border border-amber-200 bg-white p-4 text-slate-700">
              <p className="font-semibold text-slate-900">
                Restaurar copia
              </p>
              <p>
                Antes de restaurar, descarga una copia actual. Después confirma
                que se reemplazarán los datos locales de este navegador.
              </p>
              <Button
                type="button"
                variant="secondary"
                onClick={handlePrepareCurrentBackup}
              >
                <Download className="h-5 w-5" />
                Descargar copia actual
              </Button>
              <label className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={confirmedReplacement}
                  onChange={(event) =>
                    setConfirmedReplacement(event.target.checked)
                  }
                  className="mt-1 h-4 w-4 rounded"
                />
                <span>
                  Entiendo que se reemplazarán los datos locales actuales.
                </span>
              </label>
              <label className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={confirmedCurrentBackup}
                  disabled={!currentBackupReady}
                  onChange={(event) =>
                    setConfirmedCurrentBackup(event.target.checked)
                  }
                  className="mt-1 h-4 w-4 rounded"
                />
                <span>He descargado una copia de seguridad actual.</span>
              </label>
              {restoreBlocker && (
                <p className="text-xs text-amber-700">{restoreBlocker}</p>
              )}
              <Button
                type="button"
                variant="danger"
                onClick={handleRestoreBackup}
                disabled={Boolean(restoreBlocker)}
              >
                Restaurar copia
              </Button>
            </div>
          </div>
        )}
        {restoreFeedback && (
          <p
            aria-live="polite"
            className={`mt-3 text-sm font-medium ${
              restoreFeedback.tone === "success"
                ? "text-emerald-700"
                : "text-red-600"
            }`}
          >
            {restoreFeedback.message}
          </p>
        )}
      </div>
    </Card>
  );
}
