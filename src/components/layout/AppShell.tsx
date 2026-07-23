"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  Building2,
  Check,
  Crown,
  LoaderCircle,
  LogIn,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import {
  CloudSyncHeaderIndicator,
  CloudSyncNavBadge,
  CloudSyncPendingBanner,
} from "@/components/cloud/CloudSyncIndicator";
import { GoogleDriveAutoBackup } from "@/components/cloud/GoogleDriveAutoBackup";
import { DataAccessEventReporter } from "@/components/security/DataAccessEventReporter";
import { GuestLocalDataBanner } from "@/components/cloud/GuestLocalDataBanner";
import { DemoModeBanner } from "@/components/demo/DemoModeBanner";
import { QuickToolsLauncher } from "@/components/documents/QuickToolsLauncher";
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
import { APP_BRAND_NAME, APP_BRAND_TAGLINE } from "@/lib/brand";
import {
  appStartPageHref,
  normalizeAppPreferences,
} from "@/lib/app-preferences";
import { useDemoWorkspaceMode } from "@/hooks/useDemoWorkspaceMode";
import {
  APP_NAV_ITEMS,
  isAppNavItemActive,
} from "@/components/layout/app-navigation";
import { AppNavigationFeedback } from "@/components/layout/AppNavigationFeedback";
import type { PendingAppNavigation } from "@/components/layout/app-navigation-feedback";
import {
  applyResolvedAppTheme,
  cacheAppThemePreference,
} from "@/lib/app-theme-bootstrap";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { data, ready } = useAppStore();
  const { authReady, user } = useCloudSync();
  const { isPro, billingEnabled, plan } = useBilling();
  const demoMode = useDemoWorkspaceMode();
  const [factuDismissed, setFactuDismissed] = useState(false);
  const [pendingNavigation, setPendingNavigation] =
    useState<PendingAppNavigation | null>(null);
  const mobileNavRef = useRef<HTMLDivElement>(null);
  const previousPathnameRef = useRef(pathname);
  const [systemTheme, setSystemTheme] = useState<"light" | "dark">("light");
  const appNavItems = APP_NAV_ITEMS;
  const selectedPathname = pendingNavigation?.href ?? pathname;
  const appPreferences = normalizeAppPreferences(data.profile.appPreferences);
  const resolvedTheme =
    appPreferences.theme === "system" ? systemTheme : appPreferences.theme;
  const showFactu =
    !demoMode && !factuDismissed && shouldShowFactuWidget(pathname);
  const workspaceLoading = !ready || !authReady;
  const accountLabel = workspaceLoading
    ? "Comprobando sesión"
    : data.profile.name.trim() || user?.email || "Cuenta";
  const hasAppSessionContext = Boolean(user) || workspaceLoading;
  const brandHref = hasAppSessionContext
    ? appStartPageHref(appPreferences.startPage)
    : "/inicio";
  const brandAriaLabel = hasAppSessionContext
    ? "Ir a la pantalla inicial"
    : "Ir al inicio";

  function startNavigation(href: string, label: string) {
    if (pathname === href) {
      setPendingNavigation(null);
      return;
    }
    setPendingNavigation({ href, label });
  }

  function retryNavigation() {
    if (!pendingNavigation) return;
    setPendingNavigation({ ...pendingNavigation });
    router.push(pendingNavigation.href);
  }

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    function syncSystemTheme() {
      setSystemTheme(media.matches ? "dark" : "light");
    }

    syncSystemTheme();
    media.addEventListener("change", syncSystemTheme);
    return () => media.removeEventListener("change", syncSystemTheme);
  }, []);

  useEffect(() => {
    if (!ready) return;

    const root = document.documentElement;
    cacheAppThemePreference(appPreferences.theme);
    root.dataset.appTheme = resolvedTheme;
    applyResolvedAppTheme(resolvedTheme);
    root.dataset.appDensity = appPreferences.density;
    root.dataset.reduceMotion = appPreferences.reduceMotion ? "true" : "false";
  }, [
    appPreferences.density,
    appPreferences.reduceMotion,
    appPreferences.theme,
    ready,
    resolvedTheme,
  ]);

  useEffect(
    () => () => {
      const root = document.documentElement;
      delete root.dataset.appDensity;
      delete root.dataset.reduceMotion;
    },
    [],
  );

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
    if (previousPathnameRef.current === pathname) return;
    previousPathnameRef.current = pathname;
    setPendingNavigation(null);
  }, [pathname]);

  useEffect(() => {
    const nav = mobileNavRef.current;
    const activeLink = nav?.querySelector<HTMLElement>(
      '[data-navigation-selected="true"]',
    );
    if (!nav || !activeLink) return;

    const frame = window.requestAnimationFrame(() => {
      const targetLeft =
        activeLink.offsetLeft - (nav.clientWidth - activeLink.offsetWidth) / 2;
      nav.scrollTo({
        left: Math.max(0, targetLeft),
        behavior: appPreferences.reduceMotion ? "auto" : "smooth",
      });
    });

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [appPreferences.reduceMotion, selectedPathname]);

  return (
    <div
      className={`app-shell min-h-screen bg-slate-100 lg:flex app-theme-${resolvedTheme} app-density-${appPreferences.density}`}
    >
      <Suspense fallback={null}>
        <ReferralCapture />
      </Suspense>
      <ReferralRedeemOnLogin />
      <GoogleDriveAutoBackup />
      <DataAccessEventReporter />
      <AppNavigationFeedback
        navigation={pendingNavigation}
        onRetry={retryNavigation}
      />

      <aside className="app-sidebar hidden lg:sticky lg:top-0 lg:flex lg:h-screen lg:w-72 lg:shrink-0 lg:flex-col lg:border-r lg:border-slate-200 lg:bg-white">
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
                {APP_BRAND_NAME}
              </p>
              <p className="text-xs leading-tight text-slate-500">
                {APP_BRAND_TAGLINE}
              </p>
            </div>
          </Link>
        </div>

        <div className="border-b border-slate-100 px-4 py-3">
          {hasAppSessionContext ? (
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
          className="app-side-nav flex-1 overflow-y-auto px-3 py-4"
          aria-label="Navegación principal"
        >
          <div className="space-y-1">
            {appNavItems.map(({ href, activeBase, label, icon: Icon }) => {
              const active = isAppNavItemActive(pathname, href, activeBase);
              const selected = isAppNavItemActive(
                selectedPathname,
                href,
                activeBase,
              );
              const pending = pendingNavigation?.href === href;
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? "page" : undefined}
                  aria-busy={pending || undefined}
                  data-navigation-selected={selected ? "true" : undefined}
                  onNavigate={() => startNavigation(href, label)}
                  className={`relative flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-bold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 ${
                    selected
                      ? "bg-blue-600 text-white shadow-sm shadow-blue-600/20"
                      : "text-slate-700 hover:bg-slate-100 hover:text-slate-950"
                  }`}
                >
                  <Icon className="h-5 w-5" strokeWidth={selected ? 2.5 : 2} />
                  <span className="truncate">{label}</span>
                  {pending ? (
                    <LoaderCircle
                      className="ml-auto h-4 w-4 shrink-0 motion-safe:animate-spin"
                      aria-hidden="true"
                    />
                  ) : selected ? (
                    <Check
                      className="ml-auto h-4 w-4 shrink-0"
                      aria-hidden="true"
                    />
                  ) : null}
                  {href === "/configuracion" && <CloudSyncNavBadge />}
                </Link>
              );
            })}
          </div>
        </nav>

        <div className="space-y-3 border-t border-slate-200 px-4 py-4">
          <QuickToolsLauncher />
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
        <header className="app-mobile-header sticky top-0 z-20 border-b border-slate-200/80 bg-white shadow-sm lg:hidden">
          <div className="flex items-center justify-between gap-2 px-4 py-3">
            <Link
              href={brandHref}
              aria-label={brandAriaLabel}
              className="flex min-w-0 flex-1 items-center gap-2 rounded-xl transition-colors hover:bg-slate-50 active:bg-slate-100 sm:gap-3"
            >
              <Image
                src="/brand/app-icon.png"
                alt=""
                width={40}
                height={40}
                className="h-10 w-10 shrink-0 object-contain drop-shadow-sm"
                priority
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-slate-900 sm:text-base">
                  {APP_BRAND_NAME}
                </p>
                <p className="hidden text-xs leading-tight text-slate-500 min-[430px]:block">
                  {APP_BRAND_TAGLINE}
                </p>
              </div>
            </Link>
            <div className="flex shrink-0 items-center gap-2">
              <FactuHelpButton />
              {!hasAppSessionContext ? (
                <Link
                  href="/inicio"
                  className="hidden min-h-11 items-center gap-1 rounded-xl border border-slate-200 px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 sm:flex"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Inicio
                </Link>
              ) : null}
              {hasAppSessionContext ? (
                <Link
                  href="/cuenta"
                  className="flex min-h-11 min-w-11 items-center justify-center gap-1 rounded-xl bg-emerald-50 px-0 text-xs font-bold text-emerald-800 hover:bg-emerald-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 min-[430px]:w-auto min-[430px]:max-w-[9rem] min-[430px]:justify-start min-[430px]:px-2.5 min-[430px]:py-1.5 sm:max-w-[13rem]"
                  title={accountLabel}
                >
                  <Building2 className="h-3.5 w-3.5 shrink-0" />
                  <span className="hidden truncate min-[430px]:inline">
                    {accountLabel}
                  </span>
                </Link>
              ) : (
                <Link
                  href="/cuenta#inicio-sesion"
                  className="flex min-h-11 items-center gap-1 rounded-xl bg-blue-600 px-2.5 py-1.5 text-xs font-bold text-white hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
                >
                  <LogIn className="h-3.5 w-3.5" />
                  <span className="sm:hidden">Entrar</span>
                  <span className="hidden sm:inline">Iniciar sesión</span>
                </Link>
              )}
              {billingEnabled && isPro && (
                <Link
                  href="/precios"
                  title={plan === "trial" ? "Prueba Pro" : "Miembro Pro"}
                  className={`flex min-h-11 min-w-11 items-center justify-center gap-1 rounded-xl px-2.5 py-1.5 text-xs font-bold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 ${
                    plan === "trial"
                      ? "bg-violet-100 text-violet-800"
                      : "bg-amber-100 text-amber-800"
                  }`}
                >
                  <Crown className="h-3.5 w-3.5" />
                  <span className="hidden min-[430px]:inline">
                    {plan === "trial" ? "Prueba Pro" : "Miembro Pro"}
                  </span>
                </Link>
              )}
              {billingEnabled && !isPro && (
                <Link
                  href="/precios"
                  title="Hazte Pro"
                  className="flex min-h-11 min-w-11 items-center justify-center gap-1 rounded-xl bg-violet-100 px-2.5 py-1.5 text-xs font-bold text-violet-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
                >
                  <Crown className="h-3.5 w-3.5" />
                  <span className="hidden min-[430px]:inline">Hazte Pro</span>
                </Link>
              )}
              <CloudSyncHeaderIndicator />
            </div>
          </div>
          <div className="border-t border-slate-100 px-4 py-1.5">
            <QuickToolsLauncher compact />
          </div>
          <CloudSyncPendingBanner />
        </header>

        <header className="app-topbar sticky top-0 z-20 hidden border-b border-slate-200/80 bg-white/95 shadow-sm backdrop-blur lg:block">
          <div className="flex min-h-16 items-center justify-end gap-3 px-6 py-3 xl:px-8 2xl:px-10">
            {!hasAppSessionContext ? (
              <Link
                href="/inicio"
                className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
              >
                <ArrowLeft className="h-4 w-4" />
                Volver al inicio
              </Link>
            ) : null}
            {hasAppSessionContext ? (
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

        {!demoMode ? <FactuOccasionalHost /> : null}

        <main
          className={`app-main w-full flex-1 scroll-pb-32 px-4 py-5 sm:px-6 lg:scroll-pb-8 lg:px-8 lg:py-6 xl:px-10 2xl:px-12 ${
            showFactu
              ? "pb-[calc(11rem+env(safe-area-inset-bottom))] lg:pb-8"
              : "pb-[calc(8rem+env(safe-area-inset-bottom))] lg:pb-8"
          }`}
        >
          {workspaceLoading ? (
            <div
              role="status"
              aria-live="polite"
              className="mb-4 flex items-center gap-2 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-800 shadow-sm"
            >
              <LoaderCircle
                className="h-4 w-4 shrink-0 motion-safe:animate-spin"
                aria-hidden="true"
              />
              Preparando tus datos. Puedes seguir navegando.
            </div>
          ) : null}
          {workspaceLoading ? (
            <AppStartupMainContent pathname={pathname} />
          ) : (
            children
          )}
        </main>

        {showFactu ? (
          <FactuWidget onDismiss={() => setFactuDismissed(true)} />
        ) : null}
      </div>

      <nav
        className="app-mobile-nav fixed bottom-0 left-0 right-0 z-30 border-t border-slate-200 bg-white/95 shadow-[0_-8px_30px_rgba(15,23,42,0.08)] backdrop-blur-md nav-safe-bottom lg:hidden"
        aria-label="Navegación principal móvil"
      >
        <div className="relative mx-auto max-w-3xl">
          <div
            ref={mobileNavRef}
            className="nav-scroll overflow-x-auto overscroll-x-contain px-2 py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            <div className="flex w-max min-w-full items-stretch gap-1">
              {appNavItems.map(
                ({ href, activeBase, label, shortLabel, icon: Icon }) => {
                  const active = isAppNavItemActive(
                    pathname,
                    href,
                    activeBase,
                  );
                  const selected = isAppNavItemActive(
                    selectedPathname,
                    href,
                    activeBase,
                  );
                  const pending = pendingNavigation?.href === href;
                  return (
                    <Link
                      key={href}
                      href={href}
                      aria-current={active ? "page" : undefined}
                      aria-busy={pending || undefined}
                      data-navigation-selected={selected ? "true" : undefined}
                      onNavigate={() => startNavigation(href, label)}
                      className={`relative flex h-16 w-[4.75rem] shrink-0 flex-col items-center justify-center gap-1 rounded-2xl px-1.5 py-2 text-center transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 ${
                        selected
                          ? "bg-blue-600 text-white shadow-md shadow-blue-600/25"
                          : "text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      <Icon
                        className="h-5 w-5 shrink-0"
                        strokeWidth={selected ? 2.5 : 2}
                        aria-hidden="true"
                      />
                      {pending ? (
                        <LoaderCircle
                          className="absolute right-1 top-1 h-3.5 w-3.5 motion-safe:animate-spin"
                          aria-hidden="true"
                        />
                      ) : selected ? (
                        <Check
                          className="absolute right-1 top-1 h-3.5 w-3.5"
                          aria-hidden="true"
                        />
                      ) : null}
                      <span className="w-full truncate text-center text-[10px] font-semibold leading-tight sm:text-[11px]">
                        {shortLabel}
                      </span>
                    </Link>
                  );
                },
              )}
            </div>
          </div>
        </div>
      </nav>
    </div>
  );
}

function AppStartupMainContent({ pathname }: { pathname: string }) {
  const currentSection =
    APP_NAV_ITEMS.find(({ href, activeBase }) =>
      isAppNavItemActive(pathname, href, activeBase),
    ) ??
    (pathname === "/"
      ? { label: "Panel principal" }
      : { label: "Esta sección" });
  const isHome = pathname === "/";

  return (
    <div aria-busy="true" className="space-y-4">
      <section
        className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
        aria-labelledby="startup-section-title"
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1
              id="startup-section-title"
              className="text-lg font-bold text-slate-900"
            >
              {currentSection.label}
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Estamos preparando esta vista con los datos guardados.
            </p>
          </div>
          <div
            role="status"
            aria-live="polite"
            className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700"
          >
            <span className="h-2 w-2 rounded-full bg-blue-500 motion-safe:animate-pulse" />
            Actualizando
          </div>
        </div>
      </section>

      {isHome ? <HomeStartupSummaryPlaceholder /> : <SectionStartupPlaceholder />}
    </div>
  );
}

function HomeStartupSummaryPlaceholder() {
  return (
    <section className="space-y-4" aria-labelledby="startup-summary-title">
      <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex min-w-0 items-start gap-3">
          <span className="h-11 w-11 shrink-0 rounded-2xl bg-slate-100" />
          <div className="min-w-0 flex-1">
            <h2
              id="startup-summary-title"
              className="text-lg font-bold text-slate-900"
            >
              Resumen del negocio
            </h2>
            <div className="mt-3 h-3 w-36 rounded-full bg-slate-100 motion-safe:animate-pulse" />
          </div>
        </div>
      </div>

      <div className="grid min-w-0 gap-4 lg:grid-cols-3">
        {["Últimos documentos", "Últimos gastos", "Pendiente de cobro"].map(
          (title) => (
            <StartupPlaceholderCard key={title} title={title} />
          ),
        )}
      </div>
    </section>
  );
}

function SectionStartupPlaceholder() {
  return (
    <div className="grid min-w-0 gap-4 lg:grid-cols-3">
      {["Datos principales", "Actividad reciente", "Estado de la sección"].map(
        (title) => (
          <StartupPlaceholderCard key={title} title={title} />
        ),
      )}
    </div>
  );
}

function StartupPlaceholderCard({ title }: { title: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-sm font-bold text-slate-900">{title}</p>
      <div className="mt-4 space-y-3">
        <div className="h-3 rounded-full bg-slate-100 motion-safe:animate-pulse" />
        <div className="h-3 w-4/5 rounded-full bg-slate-100 motion-safe:animate-pulse" />
        <div className="h-3 w-2/3 rounded-full bg-slate-100 motion-safe:animate-pulse" />
      </div>
    </div>
  );
}
