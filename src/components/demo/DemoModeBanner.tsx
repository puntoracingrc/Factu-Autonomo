"use client";

import { LogIn, MonitorPlay, RotateCcw, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/context/AppStore";
import { useDemoWorkspaceMode } from "@/hooks/useDemoWorkspaceMode";
import {
  createDemoWorkspaceData,
  resetDemoWorkspaceData,
  setDemoWorkspaceMode,
} from "@/lib/demo-workspace";
import { loadData } from "@/lib/storage";

export function DemoModeBanner() {
  const router = useRouter();
  const demoMode = useDemoWorkspaceMode();
  const { replaceData } = useAppStore();

  if (!demoMode) return null;

  function leaveDemo(nextPath = "/") {
    setDemoWorkspaceMode(false);
    replaceData(loadData(), { fromRemote: true });
    router.push(nextPath);
  }

  function resetDemo() {
    const nextData = createDemoWorkspaceData();
    resetDemoWorkspaceData();
    replaceData(nextData, { fromRemote: true });
    router.push("/");
  }

  return (
    <div className="demo-mode-banner border-b px-4 py-3 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="demo-mode-icon mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl">
            <ShieldCheck className="h-4 w-4" />
          </span>
          <div className="min-w-0 max-w-4xl">
            <p className="text-sm font-black">Modo demo con datos ficticios</p>
            <p className="demo-mode-copy mt-0.5 text-xs font-medium leading-5">
              Sandbox separado: puedes crear y tocar cosas de prueba. No se
              sincronizan con la nube ni sustituyen tus datos reales.
            </p>
          </div>
        </div>
        <div className="grid shrink-0 grid-cols-2 gap-2 sm:grid-cols-4">
          <button
            type="button"
            onClick={() => router.push("/")}
            className="demo-mode-button demo-mode-button-secondary inline-flex min-h-9 items-center justify-center gap-2 rounded-xl px-3 text-sm font-bold whitespace-nowrap focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
          >
            <MonitorPlay className="h-4 w-4" />
            Volver al tour
          </button>
          <button
            type="button"
            onClick={resetDemo}
            className="demo-mode-button demo-mode-button-secondary inline-flex min-h-9 items-center justify-center gap-2 rounded-xl px-3 text-sm font-bold whitespace-nowrap focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
          >
            <RotateCcw className="h-4 w-4" />
            Reiniciar demo
          </button>
          <button
            type="button"
            onClick={() => leaveDemo("/cuenta?modo=crear#inicio-sesion")}
            className="demo-mode-button demo-mode-button-primary inline-flex min-h-9 items-center justify-center gap-2 rounded-xl px-3 text-sm font-bold whitespace-nowrap shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
          >
            <LogIn className="h-4 w-4" />
            Crear cuenta real
          </button>
          <button
            type="button"
            onClick={() => leaveDemo("/")}
            className="demo-mode-button demo-mode-button-secondary inline-flex min-h-9 items-center justify-center gap-2 rounded-xl px-3 text-sm font-bold whitespace-nowrap focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
          >
            Salir de demo
          </button>
        </div>
      </div>
    </div>
  );
}
