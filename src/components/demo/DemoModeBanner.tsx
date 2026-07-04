"use client";

import { LogIn, RotateCcw, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/context/AppStore";
import { useDemoWorkspaceMode } from "@/hooks/useDemoWorkspaceMode";
import { setDemoWorkspaceMode } from "@/lib/demo-workspace";
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

  return (
    <div className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-amber-950 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-800">
            <ShieldCheck className="h-4 w-4" />
          </span>
          <div>
            <p className="text-sm font-black">Modo demo con datos ficticios</p>
            <p className="mt-0.5 text-xs font-medium leading-5 text-amber-900">
              Puedes crear y tocar cosas de prueba. No se sincronizan con la
              nube ni sustituyen tus datos reales.
            </p>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <button
            type="button"
            onClick={() => leaveDemo("/cuenta#inicio-sesion")}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-blue-600 px-3 text-sm font-bold text-white shadow-sm hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
          >
            <LogIn className="h-4 w-4" />
            Crear cuenta real
          </button>
          <button
            type="button"
            onClick={() => leaveDemo("/")}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-amber-300 bg-white px-3 text-sm font-bold text-amber-950 hover:bg-amber-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500"
          >
            <RotateCcw className="h-4 w-4" />
            Salir de demo
          </button>
        </div>
      </div>
    </div>
  );
}
