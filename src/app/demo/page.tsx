"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { MonitorPlay } from "lucide-react";
import { useAppStore } from "@/context/AppStore";
import { useCloudSync } from "@/context/CloudSyncContext";
import {
  createDemoWorkspaceData,
  resetDemoWorkspaceData,
  setDemoWorkspaceMode,
} from "@/lib/demo-workspace";
import { loadData } from "@/lib/storage";

export default function DemoPage() {
  const router = useRouter();
  const { ready, replaceData } = useAppStore();
  const { authReady, user } = useCloudSync();

  useEffect(() => {
    if (!ready || !authReady) return;

    if (user) {
      setDemoWorkspaceMode(false);
      replaceData(loadData(), { fromRemote: true });
      router.replace("/");
      return;
    }

    setDemoWorkspaceMode(true);
    resetDemoWorkspaceData();
    replaceData(createDemoWorkspaceData(), { fromRemote: true });
    router.replace("/");
  }, [authReady, ready, replaceData, router, user]);

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md items-center justify-center px-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
          <MonitorPlay className="h-6 w-6" />
        </div>
        <h1 className="mt-4 text-xl font-black text-slate-950">
          Preparando demo guiada
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Cargando una empresa ficticia con facturas, gastos y clientes de
          ejemplo para que puedas pasearte sin tocar nada real.
        </p>
      </div>
    </div>
  );
}
