"use client";

import { useState } from "react";
import { Download, HardDrive, Shield } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useCloudSync } from "@/context/CloudSyncContext";
import { useAppStore } from "@/context/AppStore";
import { downloadBackup } from "@/lib/backup";

export function DataOwnershipCard() {
  const { data } = useAppStore();
  const { user, cloudEnabled } = useCloudSync();
  const hasCloudSession = Boolean(user);
  const [backupFeedback, setBackupFeedback] = useState<{
    tone: "success" | "error";
    message: string;
  } | null>(null);

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
    </Card>
  );
}
