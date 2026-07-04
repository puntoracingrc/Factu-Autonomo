"use client";

import Link from "next/link";
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  Circle,
  FileText,
  MailCheck,
  ShoppingCart,
  Upload,
  type LucideIcon,
} from "lucide-react";
import { ButtonLink } from "@/components/ui/Button";
import { useAppStore } from "@/context/AppStore";
import { useCloudSync } from "@/context/CloudSyncContext";
import { useDemoWorkspaceMode } from "@/hooks/useDemoWorkspaceMode";
import {
  buildFirstUseOnboardingState,
  type FirstUseStepId,
} from "@/lib/first-use-onboarding";

const STEP_ICONS: Record<FirstUseStepId, LucideIcon> = {
  email: MailCheck,
  profile: Building2,
  document: FileText,
};

export function FirstUseOnboardingPanel() {
  const { data } = useAppStore();
  const { user, emailConfirmed, requiresEmailConfirmation } = useCloudSync();
  const demoMode = useDemoWorkspaceMode();
  const state = buildFirstUseOnboardingState({
    data,
    demoMode,
    emailConfirmed,
    hasUser: Boolean(user),
  });

  if (!state.visible) return null;

  const nextStep = state.steps.find((step) => !step.done);

  return (
    <section
      className="mb-6 rounded-2xl border border-blue-200 bg-blue-50 p-5 shadow-sm"
      aria-label="Primeros pasos de la cuenta"
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-3xl">
          <p className="text-sm font-black uppercase tracking-wide text-blue-700">
            Primeros pasos
          </p>
          <h2 className="mt-1 text-2xl font-black text-slate-950">
            {requiresEmailConfirmation
              ? "Activa la cuenta y deja todo listo"
              : "Prepara tu primera factura real"}
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-700">
            Una guía breve para pasar de cuenta recién creada a trabajo real:
            datos del negocio, primera factura y opciones para importar o
            registrar gastos.
          </p>
        </div>

        <div className="rounded-xl border border-blue-200 bg-white px-4 py-3 text-sm font-bold text-blue-900">
          {state.completedCount}/{state.totalCount} listo
        </div>
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-3">
        {state.steps.map((step) => {
          const Icon = STEP_ICONS[step.id];
          return (
            <Link
              key={step.id}
              href={step.href}
              className={`group flex min-h-36 flex-col justify-between rounded-2xl border bg-white p-4 shadow-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 ${
                step.current
                  ? "border-blue-300 ring-2 ring-blue-100 hover:bg-blue-50"
                  : "border-slate-200 hover:border-blue-200 hover:bg-slate-50"
              }`}
            >
              <span className="flex items-start justify-between gap-3">
                <span
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                    step.done
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-blue-100 text-blue-700"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                </span>
                {step.done ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                ) : (
                  <Circle className="h-5 w-5 text-blue-500" />
                )}
              </span>
              <span>
                <span className="block text-sm font-black text-slate-950">
                  {step.title}
                </span>
                <span className="mt-1 block text-xs font-medium leading-5 text-slate-600">
                  {step.description}
                </span>
                <span className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-blue-700">
                  {step.actionLabel}
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </span>
              </span>
            </Link>
          );
        })}
      </div>

      <div className="mt-4 flex flex-col gap-3 rounded-xl border border-blue-100 bg-white/80 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-black text-slate-900">
            {nextStep?.id === "document"
              ? "Puedes facturar sin crear cliente antes"
              : "También puedes empezar trayendo datos"}
          </p>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            Importa datos si vienes de otro programa, o registra gastos cuando
            empieces a trabajar con compras reales.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
          <ButtonLink href="/importar" variant="secondary">
            <Upload className="h-4 w-4" />
            Importar datos
          </ButtonLink>
          <ButtonLink href="/gastos/nuevo" variant="secondary">
            <ShoppingCart className="h-4 w-4" />
            Registrar gasto
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}
