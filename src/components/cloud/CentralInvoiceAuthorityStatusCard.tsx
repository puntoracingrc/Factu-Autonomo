"use client";

import { useMemo, useState } from "react";
import {
  CheckCircle2,
  CircleAlert,
  RefreshCw,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useCloudSync } from "@/context/CloudSyncContext";
import {
  isCentralInvoiceAuthorityFormCanaryEnabled,
  isCentralInvoiceAuthorityFormRequiredEnabled,
} from "@/lib/central-invoice-authority/form-canary-client";
import {
  fetchCentralInvoiceAuthorityStatusFromBrowser,
  type CentralInvoiceAuthorityStatusCheck,
  type CentralInvoiceAuthorityStatusResult,
} from "@/lib/central-invoice-authority/status-client";
import {
  CENTRAL_AUTHORITY_STATUS_MODE_LABELS,
  centralAuthorityActivationReasonLabel,
  centralAuthorityStatusBlockerLabel,
  centralAuthorityStatusCheckAction,
  centralAuthorityStatusCheckKindLabel,
  centralAuthorityStatusCheckLabel,
  describeCentralInvoiceAuthorityNextStep,
  describeCentralInvoiceAuthorityStatusResult,
  type CentralAuthorityStatusNotice,
} from "@/components/cloud/central-authority-status-presentation";

function formatCentralAuthorityDate(value: string | undefined): string {
  if (!value) return "Sin comprobacion registrada";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function noticeClass(tone: CentralAuthorityStatusNotice["tone"]): string {
  if (tone === "success") {
    return "border border-emerald-200 bg-white text-emerald-900";
  }
  if (tone === "warning") {
    return "border border-amber-200 bg-amber-50 text-amber-950";
  }
  return "border border-red-200 bg-red-50 text-red-950";
}

function compactNoticeClass(tone: CentralAuthorityStatusNotice["tone"]): string {
  if (tone === "success") return "border-emerald-200 bg-emerald-50 text-emerald-950";
  if (tone === "warning") return "border-amber-200 bg-amber-50 text-amber-950";
  return "border-red-200 bg-red-50 text-red-950";
}

function checkRowClass(status: CentralInvoiceAuthorityStatusCheck["status"]): string {
  return status === "ready"
    ? "border-emerald-100 bg-emerald-50/60"
    : "border-amber-200 bg-amber-50";
}

export function CentralInvoiceAuthorityStatusCard() {
  const { cloudEnabled, user, requiresEmailConfirmation } = useCloudSync();
  const [checking, setChecking] = useState(false);
  const [status, setStatus] =
    useState<CentralInvoiceAuthorityStatusResult | null>(null);
  const publicFormCanaryRequested = isCentralInvoiceAuthorityFormCanaryEnabled();
  const publicFormRequiredRequested = isCentralInvoiceAuthorityFormRequiredEnabled();

  const successfulStatus = status?.ok ? status : null;
  const notice = useMemo(
    () => (status ? describeCentralInvoiceAuthorityStatusResult(status) : null),
    [status],
  );
  const nextStep = useMemo(
    () =>
      status
        ? describeCentralInvoiceAuthorityNextStep(status, {
            publicFormCanaryRequested,
            publicFormRequiredRequested,
          })
        : null,
    [publicFormCanaryRequested, publicFormRequiredRequested, status],
  );
  const unavailableReason = !cloudEnabled
    ? "La comprobacion central no esta disponible ahora mismo."
    : !user
      ? "Inicia sesion para comprobar la autoridad central."
      : requiresEmailConfirmation
        ? "Confirma el email antes de comprobar la autoridad central."
        : null;
  const canCheck = !checking && !unavailableReason;
  const checks = successfulStatus?.readiness.checks ?? [];
  const readyChecks = checks.filter((check) => check.status === "ready").length;
  const blockedChecks = checks.length - readyChecks;

  async function handleCheckStatus() {
    setChecking(true);
    try {
      setStatus(await fetchCentralInvoiceAuthorityStatusFromBrowser());
    } finally {
      setChecking(false);
    }
  }

  return (
    <Card className="mb-6 space-y-4 border-blue-100 bg-blue-50/60">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-blue-700">
          <ShieldCheck className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <h3 className="text-base font-bold text-slate-900">
            Estado de autoridad central
          </h3>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            Verifica si el servidor central, sus tablas y sus RPC estan listos
            antes de activar la emision fiscal centralizada.
          </p>
        </div>
      </div>

      <div className="grid gap-3 rounded-xl border border-blue-100 bg-white px-4 py-3 text-sm text-slate-600 sm:grid-cols-2">
        <p>
          <span className="font-bold text-slate-800">Modo:</span>{" "}
          {successfulStatus
            ? `${CENTRAL_AUTHORITY_STATUS_MODE_LABELS[successfulStatus.activation.effectiveMode]} (${centralAuthorityActivationReasonLabel(successfulStatus.activation.reason)})`
            : "Sin comprobar"}
        </p>
        <p>
          <span className="font-bold text-slate-800">Canario formulario:</span>{" "}
          {publicFormRequiredRequested
            ? "obligatorio"
            : publicFormCanaryRequested
              ? "solicitado"
              : "no solicitado"}
        </p>
        <p>
          <span className="font-bold text-slate-800">Escritura fiscal:</span>{" "}
          {successfulStatus?.summary.fiscalWritesPossible
            ? "posible"
            : "bloqueada"}
        </p>
        <p>
          <span className="font-bold text-slate-800">Servidor:</span>{" "}
          {successfulStatus?.summary.serverSchemaReady
            ? "preparado"
            : "pendiente"}
        </p>
        <p>
          <span className="font-bold text-slate-800">Comprobaciones:</span>{" "}
          {checks.length > 0
            ? `${readyChecks} listas, ${blockedChecks} bloqueadas`
            : "Sin comprobar"}
        </p>
        <p className="sm:col-span-2">
          <span className="font-bold text-slate-800">Última lectura:</span>{" "}
          {formatCentralAuthorityDate(successfulStatus?.readiness.checkedAt)}
        </p>
      </div>

      {nextStep ? (
        <div
          className={`rounded-xl border px-4 py-3 text-sm leading-6 ${compactNoticeClass(nextStep.tone)}`}
        >
          <p className="font-bold">{nextStep.title}</p>
          <p>{nextStep.message}</p>
        </div>
      ) : null}

      {checks.length ? (
        <div className="space-y-3 rounded-xl border border-blue-100 bg-white px-4 py-3">
          <div>
            <p className="text-sm font-bold text-slate-900">
              Checklist para activar canario
            </p>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              Lectura no destructiva: no emite, no sincroniza y no repara datos.
            </p>
          </div>
          <div className="grid gap-2">
            {checks.map((check) => (
              <div
                key={check.id}
                className={`rounded-xl border px-3 py-2 ${checkRowClass(check.status)}`}
              >
                <div className="flex items-start gap-2">
                  <span className="mt-0.5 shrink-0">
                    {check.status === "ready" ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-700" />
                    ) : (
                      <CircleAlert className="h-4 w-4 text-amber-700" />
                    )}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-900">
                      {centralAuthorityStatusCheckLabel(check)}
                      <span className="ml-2 rounded-full bg-white/80 px-2 py-0.5 text-xs font-bold text-slate-500">
                        {centralAuthorityStatusCheckKindLabel(check)}
                      </span>
                    </p>
                    <p className="mt-1 text-xs leading-5 text-slate-600">
                      {centralAuthorityStatusCheckAction(check)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {successfulStatus?.readiness.blockers.length ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-950">
          <p className="font-bold">Bloqueos detectados</p>
          <ul className="mt-1 list-disc pl-5">
            {successfulStatus.readiness.blockers.map((blocker) => (
              <li key={blocker}>{centralAuthorityStatusBlockerLabel(blocker)}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {notice ? (
        <p className={`rounded-xl px-4 py-3 text-sm leading-6 ${noticeClass(notice.tone)}`}>
          {notice.tone !== "success" ? (
            <TriangleAlert className="mr-2 inline h-4 w-4 align-text-bottom" />
          ) : null}
          <span className="font-bold">{notice.title}.</span> {notice.message}
        </p>
      ) : null}

      {unavailableReason ? (
        <p className="text-sm text-slate-500">{unavailableReason}</p>
      ) : null}

      <Button
        variant="secondary"
        onClick={() => void handleCheckStatus()}
        disabled={!canCheck}
        aria-busy={checking}
      >
        <RefreshCw className={`h-4 w-4 ${checking ? "animate-spin" : ""}`} />
        {checking ? "Comprobando…" : "Comprobar servidor central"}
      </Button>
    </Card>
  );
}
