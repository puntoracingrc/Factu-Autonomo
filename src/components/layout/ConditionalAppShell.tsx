"use client";

import { usePathname } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { useAppStore } from "@/context/AppStore";
import { useCloudSync } from "@/context/CloudSyncContext";
import { useDemoWorkspaceMode } from "@/hooks/useDemoWorkspaceMode";
import { hasWorkspaceContent } from "@/lib/workspace-state";

/** Rutas de auth sin menú ni providers pesados en pantalla (confirmación email). */
export function ConditionalAppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data, ready } = useAppStore();
  const { authReady, user } = useCloudSync();
  const demoMode = useDemoWorkspaceMode();
  const isAuthRoute = pathname.startsWith("/auth/");
  const isPublicHome =
    pathname === "/" &&
    !demoMode &&
    (!ready || !authReady || (!user && !hasWorkspaceContent(data)));

  if (isAuthRoute) {
    return (
      <div className="min-h-screen bg-slate-100 px-4 py-8">{children}</div>
    );
  }

  if (isPublicHome) {
    return <>{children}</>;
  }

  return <AppShell>{children}</AppShell>;
}
