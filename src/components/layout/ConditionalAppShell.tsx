"use client";

import { usePathname } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";

/** Rutas de auth sin menú ni providers pesados en pantalla (confirmación email). */
export function ConditionalAppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthRoute = pathname.startsWith("/auth/");

  if (isAuthRoute) {
    return (
      <div className="min-h-screen bg-slate-100 px-4 py-8">{children}</div>
    );
  }

  return <AppShell>{children}</AppShell>;
}
