"use client";

import { useRef, useState } from "react";
import { Cloud, Download, RefreshCw, Upload } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field, Input } from "@/components/ui/Field";
import { useBilling } from "@/context/BillingContext";
import { useCloudSync } from "@/context/CloudSyncContext";

const STATUS_LABELS = {
  disabled: "Nube no configurada en el servidor",
  offline: "Sin conexión — en cola",
  idle: "Listo",
  pending: "Pendiente de subir",
  syncing: "Sincronizando…",
  synced: "Sincronizado",
  error: "Error — reintentando",
} as const;

export function CloudAccountCard() {
  const {
    cloudEnabled,
    user,
    email,
    setEmail,
    signUp,
    signIn,
    signOut,
    syncNow,
    exportBackup,
    importBackup,
    syncStatus,
    syncMessage,
    pendingUpload,
    pendingChangeCount,
  } = useCloudSync();
  const { billingEnabled, limits } = useBilling();

  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function runAuth(action: "signup" | "signin") {
    setAuthError(null);
    setBusy(true);
    const error =
      action === "signup" ? await signUp(password) : await signIn(password);
    setBusy(false);
    if (error) setAuthError(error);
    else setPassword("");
  }

  async function handleImport(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    const error = await importBackup(file);
    setBusy(false);
    if (error) setAuthError(error);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  return (
    <Card className="mb-6 space-y-4">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sky-700">
          <Cloud className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-900">
            Copia de seguridad y cuenta
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Sincroniza móvil y PC con la misma cuenta, o exporta un archivo JSON
            por si cambias de teléfono.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <Button variant="secondary" onClick={exportBackup}>
          <Download className="h-4 w-4" />
          Exportar copia
        </Button>
        <Button variant="secondary" onClick={() => fileInputRef.current?.click()}>
          <Upload className="h-4 w-4" />
          Importar copia
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => void handleImport(e.target.files?.[0])}
        />
      </div>

      {billingEnabled && !limits.cloudSync && (
        <p className="rounded-xl bg-violet-50 px-4 py-3 text-sm text-violet-900">
          La sincronización automática en la nube es una función <strong>Pro</strong>.
          Puedes crear cuenta y usar exportar/importar copia en el plan Gratis.
        </p>
      )}

      {!cloudEnabled ? (
        <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
          La sincronización automática requiere configurar Supabase en el
          servidor (variables en .env.local). Mientras tanto puedes usar
          exportar/importar copia manualmente.
        </p>
      ) : user ? (
        <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm text-slate-700">
            Sesión: <strong>{user.email}</strong>
          </p>
          <p className="text-sm text-slate-500">
            Estado: {STATUS_LABELS[syncStatus]}
            {syncMessage ? ` — ${syncMessage}` : ""}
          </p>
          {pendingUpload && syncStatus !== "syncing" && (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
              {pendingChangeCount > 0
                ? `${pendingChangeCount} cambio(s) pendiente(s) de subir (solo lo modificado, no toda la base).`
                : "Hay cambios guardados en este dispositivo que aún no están en la nube."}{" "}
              Se subirán solos al recuperar internet.
            </p>
          )}
          <div className="flex flex-wrap gap-3">
            <Button variant="secondary" onClick={() => void syncNow()} disabled={busy}>
              <RefreshCw className="h-4 w-4" />
              Sincronizar ahora
            </Button>
            <Button variant="ghost" onClick={() => void signOut()}>
              Cerrar sesión
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <Field label="Email">
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@email.com"
            />
          </Field>
          <Field label="Contraseña" hint="Mínimo 6 caracteres">
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
            />
          </Field>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button fullWidth onClick={() => void runAuth("signin")} disabled={busy}>
              Iniciar sesión
            </Button>
            <Button
              variant="secondary"
              fullWidth
              onClick={() => void runAuth("signup")}
              disabled={busy}
            >
              Crear cuenta
            </Button>
          </div>
        </div>
      )}

      {authError && (
        <p className="text-sm font-medium text-red-600">{authError}</p>
      )}
    </Card>
  );
}
