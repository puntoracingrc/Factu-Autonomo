"use client";

import {
  Bell,
  FileText,
  PackagePlus,
  Plus,
  Receipt,
  ShoppingCart,
  Settings,
  Users,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { FactuDailyGreeting } from "@/components/factu/FactuDailyGreeting";
import { HomeBusinessSummary } from "@/components/dashboard/HomeBusinessSummary";
import { DemoSandboxPanel } from "@/components/demo/DemoSandboxPanel";
import { HomeUserReminders } from "@/components/reminders/HomeUserReminders";
import { HomeFactuTip } from "@/components/recommendations/HomeFactuTip";
import { InstallAppCard } from "@/components/pwa/InstallAppCard";
import { PublicLanding } from "@/components/marketing/PublicLanding";
import { useCloudSync } from "@/context/CloudSyncContext";
import { useDemoWorkspaceMode } from "@/hooks/useDemoWorkspaceMode";
import { useAppRecommendations } from "@/hooks/useAppRecommendations";
import { useAppStore } from "@/context/AppStore";
import { hasWorkspaceContent } from "@/lib/workspace-state";

const quickActions = [
  {
    href: "/avisos#nuevo-recordatorio",
    label: "Crear recordatorio",
    icon: Plus,
    color: "bg-amber-500 text-white",
  },
  {
    href: "/avisos",
    label: "Avisos",
    icon: Bell,
    color: "bg-orange-500 text-white",
    showBadge: true,
  },
  {
    href: "/clientes?new=1",
    label: "Nuevo cliente",
    icon: Users,
    color: "bg-sky-600 text-white",
  },
  {
    href: "/facturas/nuevo",
    label: "Nueva factura",
    icon: FileText,
    color: "bg-blue-600 text-white",
  },
  {
    href: "/presupuestos/nuevo",
    label: "Nuevo presupuesto",
    icon: Wallet,
    color: "bg-indigo-500 text-white",
  },
  {
    href: "/recibos/nuevo",
    label: "Nuevo recibo",
    icon: Receipt,
    color: "bg-violet-500 text-white",
  },
  {
    href: "/gastos",
    label: "Gastos",
    icon: ShoppingCart,
    color: "bg-emerald-600 text-white",
  },
  {
    href: "/productos/nuevo",
    label: "Nuevo producto",
    icon: PackagePlus,
    color: "bg-cyan-700 text-white",
  },
  {
    href: "/configuracion",
    label: "Configuración",
    icon: Settings,
    color: "bg-slate-700 text-white",
  },
];

export default function HomePage() {
  const { data, ready } = useAppStore();
  const { authReady, user } = useCloudSync();
  const demoMode = useDemoWorkspaceMode();
  const { badgeCount: alertCount } = useAppRecommendations();

  if (!ready || !authReady) {
    return <p className="text-center text-slate-500">Cargando...</p>;
  }

  if (!demoMode && !user && !hasWorkspaceContent(data)) {
    return <PublicLanding />;
  }

  return (
    <div>
      <FactuDailyGreeting enabled={ready} />

      <DemoSandboxPanel />

      <HomeUserReminders />

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6 2xl:grid-cols-9">
        {quickActions.map(({ href, label, icon: Icon, color, showBadge }) => (
          <Link
            key={`${href}-${label}`}
            href={href}
            className={`relative flex min-h-[5.25rem] flex-col items-center justify-center gap-2 rounded-2xl p-4 text-center font-semibold shadow-md transition-transform focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 active:scale-[0.98] ${color}`}
          >
            {showBadge && alertCount > 0 && (
              <span className="absolute right-2 top-2 flex h-6 min-w-6 items-center justify-center rounded-full bg-white px-1.5 text-xs font-bold text-amber-700 shadow">
                {alertCount > 9 ? "9+" : alertCount}
              </span>
            )}
            <Icon className="h-6 w-6" />
            <span className="text-sm leading-tight">{label}</span>
          </Link>
        ))}
      </div>

      <HomeBusinessSummary data={data} />

      <HomeFactuTip />

      <InstallAppCard />
    </div>
  );
}
