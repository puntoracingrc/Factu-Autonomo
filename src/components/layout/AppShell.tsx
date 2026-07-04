"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  Building2,
  ChevronLeft,
  ChevronRight,
  Crown,
  LogIn,
} from "lucide-react";
import { usePathname } from "next/navigation";
import {
  CloudSyncHeaderIndicator,
  CloudSyncNavBadge,
  CloudSyncPendingBanner,
} from "@/components/cloud/CloudSyncIndicator";
import { GuestLocalDataBanner } from "@/components/cloud/GuestLocalDataBanner";
import { DemoModeBanner } from "@/components/demo/DemoModeBanner";
import { ReferralCapture } from "@/components/referrals/ReferralCapture";
import { ReferralRedeemOnLogin } from "@/components/referrals/ReferralRedeemOnLogin";
import { useBilling } from "@/context/BillingContext";
import { useCloudSync } from "@/context/CloudSyncContext";
import { useAppStore } from "@/context/AppStore";
import { FactuOccasionalHost } from "@/components/factu/FactuOccasionalHost";
import { FactuWidget } from "@/components/factu/FactuWidget";
import { FactuHelpButton } from "@/components/manual/FactuHelpButton";
import {
  isFactuWidgetDismissed,
  shouldShowFactuWidget,
} from "@/lib/factu/occasional";
import {
  FileText,
  Home,
  Landmark,
  PackageSearch,
  Receipt,
  Settings,
  ShoppingCart,
  Truck,
  Users,
  Wallet,
} from "lucide-react";

const navItems = [
  { href: "/", label: "Panel", shortLabel: "Panel", icon: Home },
  { href: "/clientes", label: "Clientes", shortLabel: "Clientes", icon: Users },
  {
    href: "/presupuestos",
    label: "Presupuestos",
    shortLabel: "Presup.",
    icon: Wallet,
  },
  {
    href: "/facturas",
    label: "Facturas",
    shortLabel: "Factura",
    icon: FileText,
  },
  { href: "/recibos", label: "Recibos", shortLabel: "Recibos", icon: Receipt },
  {
    href: "/gastos",
    label: "Gastos",
    shortLabel: "Gastos",
    icon: ShoppingCart,
  },
  {
    href: "/productos",
    label: "Productos",
    shortLabel: "Productos",
    icon: PackageSearch,
  },
  {
    href: "/proveedores",
    label: "Proveedores",
    shortLabel: "Proveedor",
    icon: Truck,
  },
  {
    href: "/impuestos",
    label: "Impuestos",
    shortLabel: "Impuestos",
    icon: Landmark,
  },
  {
    href: "/configuracion",
    label: "Ajustes",
    shortLabel: "Ajustes",
    icon: Settings,
  },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data, ready } = useAppStore();
  const { user } = useCloudSync();
  const { isPro, billingEnabled, plan } = useBilling();
  const [factuDismissed, setFactuDismissed] = useState(false);
  const mobileNavRef = useRef<HTMLDivElement>(null);
  const [navScrollState, setNavScrollState] = useState({
    canScrollLeft: false,
    canScrollRight: false,
  });
  const showFactu = !factuDismissed && shouldShowFactuWidget(pathname);
  const accountLabel = data.profile.name.trim() || user?.email || "Cuenta";
  const brandHref = user ? "/" : "/inicio";
  const brandAriaLabel = user ? "Ir al panel" : "Ir al inicio";

  const updateNavScrollState = useCallback(() => {
    const node = mobileNavRef.current;
    if (!node) return;
    const maxScrollLeft = node.scrollWidth - node.clientWidth;
    setNavScrollState({
      canScrollLeft: node.scrollLeft > 2,
      canScrollRight: node.scrollLeft < maxScrollLeft - 2,
    });
  }, []);

  const scrollMobileNav = useCallback((direction: "left" | "right") => {
    const node = mobileNavRef.current;
    if (!node) return;
    node.scrollBy({
      left: direction === "left" ? -180 : 180,
      behavior: "smooth",
    });
  }, []);

  useEffect(() => {
    setFactuDismissed(isFactuWidgetDismissed());
    function handleDismissed() {
      setFactuDismissed(true);
    }

    window.addEventListener("factu-widget-dismissed", handleDismissed);
    return () =>
      window.removeEventListener("factu-widget-dismissed", handleDismissed);
  }, []);

  useEffect(() => {
    const node = mobileNavRef.current;
    if (!node) return;

    updateNavScrollState();
    const frame = window.requestAnimationFrame(updateNavScrollState);
    const timeout = window.setTimeout(updateNavScrollState, 150);
    const resizeObserver = new ResizeObserver(updateNavScrollState);
    resizeObserver.observe(node);
    if (node.firstElementChild) {
      resizeObserver.observe(node.firstElementChild);
    }
    node.addEventListener("scroll", updateNavScrollState, { passive: true });
    window.addEventListener("resize", updateNavScrollState);

    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timeout);
      resizeObserver.disconnect();
      node.removeEventListener("scroll", updateNavScrollState);
      window.removeEventListener("resize", updateNavScrollState);
    };
  }, [pathname, updateNavScrollState]);

  return (
    <div className="min-h-screen bg-slate-100 lg:flex">
      <Suspense fallback={null}>
        <ReferralCapture />
      </Suspense>
      <ReferralRedeemOnLogin />

      <aside className="hidden lg:sticky lg:top-0 lg:flex lg:h-screen lg:w-72 lg:shrink-0 lg:flex-col lg:border-r lg:border-slate-200 lg:bg-white">
        <div className="border-b border-slate-200 px-5 py-4">
          <Link
            href={brandHref}
            aria-label={brandAriaLabel}
            className="flex min-w-0 items-center gap-3 rounded-xl transition-colors hover:bg-slate-50 active:bg-slate-100"
          >
            <Image
              src="/brand/app-icon.png"
              alt=""
              width={40}
              height={40}
              className="h-10 w-10 shrink-0 object-contain drop-shadow-sm"
              priority
            />
            <div className="min-w-0">
              <p className="truncate text-base font-bold text-slate-900">
                Factura Autónomo
              </p>
              <p className="truncate text-xs text-slate-500">
                Tu negocio, simple y claro
              </p>
            </div>
          </Link>
        </div>

        <div className="border-b border-slate-100 px-4 py-3">
          {user ? (
            <Link
              href="/cuenta"
              className="flex min-w-0 items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-800 hover:bg-emerald-100"
              title={accountLabel}
            >
              <Building2 className="h-4 w-4 shrink-0" />
              <span className="truncate">{accountLabel}</span>
            </Link>
          ) : (
            <div className="grid gap-2">
              <Link
                href="/inicio"
                className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
              >
                <ArrowLeft className="h-4 w-4" />
                Volver al inicio
              </Link>
              <Link
                href="/cuenta#inicio-sesion"
                className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-3 py-2 text-sm font-bold text-white hover:bg-blue-700"
              >
                <LogIn className="h-4 w-4" />
                Iniciar sesión
              </Link>
            </div>
          )}
        </div>

        <nav
          className="flex-1 overflow-y-auto px-3 py-4"
          aria-label="Navegación principal"
        >
          <div className="space-y-1">
            {navItems.map(({ href, label, icon: Icon }) => {
              const active =
                href === "/" ? pathname === "/" : pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={`relative flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-bold transition-colors ${
                    active
                      ? "bg-blue-600 text-white shadow-sm shadow-blue-600/20"
                      : "text-slate-700 hover:bg-slate-100 hover:text-slate-950"
                  }`}
                >
                  <Icon className="h-5 w-5" strokeWidth={active ? 2.5 : 2} />
                  <span className="truncate">{label}</span>
                  {href === "/configuracion" && <CloudSyncNavBadge />}
                </Link>
              );
            })}
          </div>
        </nav>

        <div className="space-y-3 border-t border-slate-200 px-4 py-4">
          <div className="flex items-center justify-between gap-2">
            <FactuHelpButton />
            <CloudSyncHeaderIndicator />
          </div>
          {billingEnabled ? (
            <Link
              href="/precios"
              className={`flex min-h-10 items-center justify-center gap-2 rounded-xl px-3 text-sm font-bold ${
                isPro
                  ? plan === "trial"
                    ? "bg-violet-100 text-violet-800"
                    : "bg-amber-100 text-amber-800"
                  : "bg-violet-100 text-violet-800"
              }`}
            >
              <Crown className="h-4 w-4" />
              {isPro
                ? plan === "trial"
                  ? "Prueba Pro"
                  : "Miembro Pro"
                : "Hazte Pro"}
            </Link>
          ) : null}
        </div>
      </aside>

      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white shadow-sm lg:hidden">
          <div className="flex items-center justify-between gap-3 px-4 py-3">
            <Link
              href={brandHref}
              aria-label={brandAriaLabel}
              className="flex min-w-0 items-center gap-3 rounded-xl transition-colors hover:bg-slate-50 active:bg-slate-100"
            >
              <Image
                src="/brand/app-icon.png"
                alt=""
                width={40}
                height={40}
                className="h-10 w-10 shrink-0 object-contain drop-shadow-sm"
                priority
              />
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
              {!user ? (
                <Link
                  href="/inicio"
                  className="hidden items-center gap-1 rounded-xl border border-slate-200 px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 sm:flex"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Inicio
                </Link>
              ) : null}
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
                  href="/cuenta#inicio-sesion"
                  className="flex items-center gap-1 rounded-xl bg-blue-600 px-2.5 py-1.5 text-xs font-bold text-white hover:bg-blue-700"
                >
                  <LogIn className="h-3.5 w-3.5" />
                  Iniciar sesión
                </Link>
              )}
              {billingEnabled && isPro && (
                <Link
                  href="/precios"
                  className={`flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-xs font-bold ${
                    plan === "trial"
                      ? "bg-violet-100 text-violet-800"
                      : "bg-amber-100 text-amber-800"
                  }`}
                >
                  <Crown className="h-3.5 w-3.5" />
                  {plan === "trial" ? "Prueba Pro" : "Miembro Pro"}
                </Link>
              )}
              {billingEnabled && !isPro && (
                <Link
                  href="/precios"
                  className="flex items-center gap-1 rounded-xl bg-violet-100 px-2.5 py-1.5 text-xs font-bold text-violet-800"
                >
                  <Crown className="h-3.5 w-3.5" />
                  Hazte Pro
                </Link>
              )}
              <CloudSyncHeaderIndicator />
            </div>
          </div>
          <CloudSyncPendingBanner />
        </header>

        <header className="sticky top-0 z-20 hidden border-b border-slate-200/80 bg-white/95 shadow-sm backdrop-blur lg:block">
          <div className="flex min-h-16 items-center justify-end gap-3 px-6 py-3 xl:px-8 2xl:px-10">
            {!user ? (
              <Link
                href="/inicio"
                className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
              >
                <ArrowLeft className="h-4 w-4" />
                Volver al inicio
              </Link>
            ) : null}
            {user ? (
              <Link
                href="/cuenta"
                className="flex max-w-xs items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-800 hover:bg-emerald-100"
                title={accountLabel}
              >
                <Building2 className="h-4 w-4 shrink-0" />
                <span className="truncate">{accountLabel}</span>
              </Link>
            ) : (
              <Link
                href="/cuenta#inicio-sesion"
                className="flex items-center gap-2 rounded-xl bg-blue-600 px-3 py-2 text-sm font-bold text-white hover:bg-blue-700"
              >
                <LogIn className="h-4 w-4" />
                Iniciar sesión
              </Link>
            )}
            {billingEnabled && isPro && (
              <Link
                href="/precios"
                className={`flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-xs font-bold ${
                  plan === "trial"
                    ? "bg-violet-100 text-violet-800"
                    : plan === "pro_plus"
                      ? "bg-emerald-100 text-emerald-800"
                    : "bg-amber-100 text-amber-800"
                }`}
              >
                <Crown className="h-3.5 w-3.5" />
                {plan === "trial"
                  ? "Prueba Pro"
                  : plan === "pro_plus"
                    ? "Miembro Pro+"
                    : "Miembro Pro"}
              </Link>
            )}
            {billingEnabled && !isPro && (
              <Link
                href="/precios"
                className="flex items-center gap-1 rounded-xl bg-violet-100 px-2.5 py-1.5 text-xs font-bold text-violet-800"
              >
                <Crown className="h-3.5 w-3.5" />
                Hazte Pro
              </Link>
            )}
            <CloudSyncHeaderIndicator />
          </div>
          <CloudSyncPendingBanner />
        </header>

        <DemoModeBanner />
        <GuestLocalDataBanner />

        <FactuOccasionalHost />

        <main
          className={`w-full flex-1 scroll-pb-32 px-4 py-5 sm:px-6 lg:scroll-pb-8 lg:px-8 lg:py-6 xl:px-10 2xl:px-12 ${
            showFactu
              ? "pb-[calc(11rem+env(safe-area-inset-bottom))] lg:pb-8"
              : "pb-[calc(8rem+env(safe-area-inset-bottom))] lg:pb-8"
          }`}
        >
          {!ready ? (
            <p className="py-16 text-center text-slate-500">
              Cargando tus datos…
            </p>
          ) : (
            children
          )}
        </main>

        {showFactu ? (
          <FactuWidget onDismiss={() => setFactuDismissed(true)} />
        ) : null}
      </div>

      <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-slate-200 bg-white/95 shadow-[0_-8px_30px_rgba(15,23,42,0.08)] backdrop-blur-md nav-safe-bottom lg:hidden">
        <div className="relative mx-auto max-w-3xl">
          {navScrollState.canScrollLeft && (
            <div className="absolute inset-y-2 left-0 z-10 flex w-12 items-center justify-start bg-gradient-to-r from-white via-white/95 to-transparent pl-1 sm:hidden">
              <button
                type="button"
                onClick={() => scrollMobileNav("left")}
                className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white/95 text-slate-500 shadow-sm transition-colors hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
                aria-label="Ver opciones anteriores del menú"
                title="Ver opciones anteriores"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            </div>
          )}
          {navScrollState.canScrollRight && (
            <div className="absolute inset-y-2 right-0 z-10 flex w-12 items-center justify-end bg-gradient-to-l from-white via-white/95 to-transparent pr-1 sm:hidden">
              <button
                type="button"
                onClick={() => scrollMobileNav("right")}
                className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white/95 text-slate-500 shadow-sm transition-colors hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
                aria-label="Ver más opciones del menú"
                title="Ver más opciones"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
          <div
            ref={mobileNavRef}
            className={`nav-scroll mx-auto overflow-x-auto px-2 py-2 sm:px-2 ${
              navScrollState.canScrollLeft ? "pl-10" : ""
            } ${navScrollState.canScrollRight ? "pr-10" : ""}`}
            aria-label="Navegación principal"
          >
            <div className="flex w-max min-w-full items-stretch justify-start gap-1 sm:justify-center">
              {navItems.map(({ href, label, shortLabel, icon: Icon }) => {
                const active =
                  href === "/" ? pathname === "/" : pathname.startsWith(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    aria-current={active ? "page" : undefined}
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
        </div>
      </nav>
    </div>
  );
}
