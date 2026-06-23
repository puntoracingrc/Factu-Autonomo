"use client";

import { Suspense } from "react";
import Link from "next/link";
import { Building2, Crown, LogIn } from "lucide-react";
import { usePathname } from "next/navigation";
import {
  CloudSyncHeaderIndicator,
  CloudSyncNavBadge,
  CloudSyncPendingBanner,
} from "@/components/cloud/CloudSyncIndicator";
import { ReferralCapture } from "@/components/referrals/ReferralCapture";
import { ReferralRedeemOnLogin } from "@/components/referrals/ReferralRedeemOnLogin";
import { useBilling } from "@/context/BillingContext";
import { useCloudSync } from "@/context/CloudSyncContext";
import { useAppStore } from "@/context/AppStore";
import { FactuOccasionalHost } from "@/components/factu/FactuOccasionalHost";
import { FactuWidget } from "@/components/factu/FactuWidget";
import { FactuHelpButton } from "@/components/manual/FactuHelpButton";
import { shouldShowFactuWidget } from "@/lib/factu/occasional";
import {
  FileText,
  Home,
  Landmark,
  Receipt,
  Settings,
  ShoppingCart,
  Truck,
  Users,
  Wallet,
} from "lucide-react";

const navItems = [
  { href: "/", label: "Inicio", shortLabel: "Inicio", icon: Home },
  { href: "/clientes", label: "Clientes", shortLabel: "Clientes", icon: Users },
  { href: "/facturas", label: "Facturas", shortLabel: "Facturas", icon: FileText },
  {
    href: "/presupuestos",
    label: "Presupuestos",
    shortLabel: "Presup.",
    icon: Wallet,
  },
  { href: "/recibos", label: "Recibos", shortLabel: "Recibos", icon: Receipt },
  { href: "/gastos", label: "Gastos", shortLabel: "Gastos", icon: ShoppingCart },
  {
    href: "/impuestos",
    label: "Impuestos",
    shortLabel: "Impuestos",
    icon: Landmark,
  },
  {
    href: "/proveedores",
    label: "Proveedores",
    shortLabel: "Prov.",
    icon: Truck,
  },
  { href: "/configuracion", label: "Ajustes", shortLabel: "Ajustes", icon: Settings },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data, ready } = useAppStore();
  const { user } = useCloudSync();
  const { isPro, billingEnabled } = useBilling();
  const showFactu = shouldShowFactuWidget(pathname);
  const accountLabel = data.profile.name.trim() || user?.email || "Cuenta";

  return (
    <div className="flex min-h-screen flex-col bg-slate-100">
      <Suspense fallback={null}>
        <ReferralCapture />
      </Suspense>
      <ReferralRedeemOnLogin />
      <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white shadow-sm">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
          <Link
            href="/"
            aria-label="Ir al inicio"
            className="flex min-w-0 items-center gap-3 rounded-xl transition-colors hover:bg-slate-50 active:bg-slate-100"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-sm font-bold text-white">
              FA
            </div>
            <div className="min-w-0">
              <p className="truncate text-base font-bold text-slate-900">
                Factura Autónomo
              </p>
              <p className="truncate text-xs text-slate-500">
                Tu negocio, simple y claro
              </p>
            </div>
          </Link>
          <div className="flex shrink-0 items-center gap-2">
            <FactuHelpButton />
            {user ? (
              <Link
                href="/cuenta"
                className="flex max-w-[9rem] items-center gap-1 rounded-xl bg-emerald-50 px-2.5 py-1.5 text-xs font-bold text-emerald-800 hover:bg-emerald-100 sm:max-w-[13rem]"
                title={accountLabel}
              >
                <Building2 className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{accountLabel}</span>
              </Link>
            ) : (
              <Link
                href="/cuenta"
                className="flex items-center gap-1 rounded-xl bg-blue-600 px-2.5 py-1.5 text-xs font-bold text-white hover:bg-blue-700"
              >
                <LogIn className="h-3.5 w-3.5" />
                Iniciar sesión
              </Link>
            )}
            {billingEnabled && !isPro && (
              <Link
                href="/precios"
                className="flex items-center gap-1 rounded-xl bg-violet-100 px-2.5 py-1.5 text-xs font-bold text-violet-800"
              >
                <Crown className="h-3.5 w-3.5" />
                Pro
              </Link>
            )}
            <CloudSyncHeaderIndicator />
          </div>
        </div>
        <CloudSyncPendingBanner />
      </header>

      <FactuOccasionalHost />

      <main
        className={`mx-auto w-full max-w-3xl flex-1 scroll-pb-32 px-4 py-5 ${
          showFactu
            ? "pb-[calc(11rem+env(safe-area-inset-bottom))]"
            : "pb-[calc(8rem+env(safe-area-inset-bottom))]"
        }`}
      >
        {!ready ? (
          <p className="py-16 text-center text-slate-500">Cargando tus datos…</p>
        ) : (
          children
        )}
      </main>

      {showFactu ? <FactuWidget /> : null}

      <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-slate-200 bg-white/95 shadow-[0_-8px_30px_rgba(15,23,42,0.08)] backdrop-blur-md nav-safe-bottom">
        <div className="nav-scroll mx-auto max-w-3xl overflow-x-auto px-2 py-2">
          <div className="flex w-max min-w-full items-stretch justify-start gap-1 sm:justify-center">
            {navItems.map(({ href, label, shortLabel, icon: Icon }) => {
              const active =
                href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={`relative flex h-[3.75rem] w-[4.25rem] shrink-0 flex-col items-center justify-center gap-1 rounded-2xl px-1.5 transition-colors sm:h-16 sm:w-20 ${
                    active
                      ? "bg-blue-600 text-white shadow-md shadow-blue-600/25"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <Icon className="h-5 w-5" strokeWidth={active ? 2.5 : 2} />
                  {href === "/configuracion" && <CloudSyncNavBadge />}
                  <span
                    className="w-full truncate text-center text-[10px] font-semibold leading-tight sm:text-[11px]"
                    title={label}
                  >
                    {shortLabel}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </nav>
    </div>
  );
}
