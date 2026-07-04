"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { HardDrive, LogIn, UserPlus, X } from "lucide-react";
import { useAppStore } from "@/context/AppStore";
import { useCloudSync } from "@/context/CloudSyncContext";
import { useDemoWorkspaceMode } from "@/hooks/useDemoWorkspaceMode";
import { hasWorkspaceContent } from "@/lib/workspace-state";

const DISMISS_KEY = "factura-autonomo-guest-local-banner-dismissed";

function isDismissed(): boolean {
  if (typeof sessionStorage === "undefined") return false;
  return sessionStorage.getItem(DISMISS_KEY) === "1";
}

export function GuestLocalDataBanner() {
  const { data, ready } = useAppStore();
  const { authReady, user } = useCloudSync();
  const demoMode = useDemoWorkspaceMode();
  const [dismissed, setDismissed] = useState(() => isDismissed());
  const hasLocalWork = hasWorkspaceContent(data);

  useEffect(() => {
    setDismissed(isDismissed());
  }, []);

  if (!ready || !authReady || user || demoMode || dismissed) return null;

  function dismiss() {
    if (typeof sessionStorage !== "undefined") {
      sessionStorage.setItem(DISMISS_KEY, "1");
    }
    setDismissed(true);
  }

  return (
    <div className="border-b border-sky-200 bg-sky-50 px-4 py-3 text-sky-950 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-sky-700 shadow-sm">
            <HardDrive className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-black">
              {hasLocalWork
                ? "Tienes datos guardados solo en este navegador"
                : "Estás probando sin cuenta"}
            </p>
            <p className="mt-0.5 text-xs font-medium leading-5 text-sky-900 sm:text-sm">
              {hasLocalWork
                ? "Puedes crear, editar y borrar aquí, pero otros dispositivos no lo verán. Al iniciar sesión no borramos estos datos; te preguntaremos si quieres guardarlos en tu cuenta."
                : "Puedes crear clientes, productos, facturas y gastos de prueba. Hasta que inicies sesión, todo queda en este navegador."}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Link
            href="/cuenta?modo=crear#inicio-sesion"
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-blue-600 px-3 text-sm font-bold text-white shadow-sm hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
          >
            <UserPlus className="h-4 w-4" />
            Crear cuenta gratis
          </Link>
          <Link
            href="/cuenta#inicio-sesion"
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-sky-200 bg-white px-3 text-sm font-bold text-sky-900 hover:bg-sky-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
          >
            <LogIn className="h-4 w-4" />
            Iniciar sesión
          </Link>
          <button
            type="button"
            onClick={dismiss}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl px-3 text-sm font-bold text-sky-800 hover:bg-sky-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
          >
            <X className="h-4 w-4" />
            Seguir probando
          </button>
        </div>
      </div>
    </div>
  );
}
