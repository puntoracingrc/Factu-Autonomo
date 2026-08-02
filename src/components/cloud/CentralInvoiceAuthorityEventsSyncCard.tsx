"use client";

import { useMemo, useState } from "react";
import { RefreshCw, ShieldCheck, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useAppStore } from "@/context/AppStore";
import { useCloudSync } from "@/context/CloudSyncContext";
import type { AppDataDurabilityResult } from "@/lib/app-data-durability";
import type { CentralInvoiceAuthorityEventsAppDataSyncValue } from "@/lib/central-invoice-authority/events-app-data-sync";
import type { CentralInvoiceAuthorityEventsSyncStateV1 } from "@/lib/types";

const CENTRAL_AUTHORITY_EVENTS_MANUAL_LIMIT = 50;

type ManualNotice = {
  tone: "success" | "warning" | "error";
  message: string;
};

function formatCentralAuthorityDate(value: string | undefined): string {
  if (!value) return "Sin comprobaciones registradas";
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

function plural(value: number, singular: string, pluralText: string): string {
  return value === 1 ? `${value} ${singular}` : `${value} ${pluralText}`;
}

export function describeCentralAuthorityEventsSyncState(
  state: CentralInvoiceAuthorityEventsSyncStateV1 | undefined,
): string {
  const last = state?.lastResult;
  if (!last) return "Sin comprobaciones registradas.";
  const checkedAt = formatCentralAuthorityDate(last.checkedAt);
  if (last.status === "ok") {
    return `Correcta: ${plural(last.pulledEvents, "evento recibido", "eventos recibidos")}, ${plural(last.appliedEvents, "aplicado", "aplicados")}. ${checkedAt}.`;
  }
  if (last.status === "conflict") {
    return `Revisión necesaria: ${plural(last.conflictEvents, "evento en conflicto", "eventos en conflicto")}. No se avanzó el cursor. ${checkedAt}.`;
  }
  return `No se pudo comprobar: ${last.message ?? last.code ?? "error central"}. ${checkedAt}.`;
}

function describeBlockedResult(reason: string): string {
  if (reason === "stale_precondition") {
    return "Los datos cambiaron durante la comprobación. No se guardó nada; vuelve a comprobar.";
  }
  return `No se pudo guardar el resultado local (${reason}).`;
}

export function describeCentralAuthorityEventsManualResult(
  result: AppDataDurabilityResult<CentralInvoiceAuthorityEventsAppDataSyncValue>,
): ManualNotice {
  if (result.status === "blocked") {
    return {
      tone: "warning",
      message: describeBlockedResult(result.reason),
    };
  }
  if (result.status === "indeterminate") {
    return {
      tone: "error",
      message:
        "No se pudo confirmar el guardado local. La lista no se da por actualizada.",
    };
  }

  const sync = result.value.localSync;
  if (!sync.ok) {
    if (sync.conflicts.length > 0) {
      return {
        tone: "warning",
        message:
          "La autoridad central encontró facturas que requieren revisión. No se ha cambiado la lista local ni avanzado el cursor.",
      };
    }
    return {
      tone: "error",
      message: sync.message,
    };
  }

  return {
    tone: "success",
    message: `Comprobación terminada: ${plural(sync.pulledEvents, "evento recibido", "eventos recibidos")}, ${plural(sync.applied.length, "aplicado", "aplicados")}.`,
  };
}

export function CentralInvoiceAuthorityEventsSyncCard() {
  const { data, ready, syncCentralInvoiceAuthorityEvents } = useAppStore();
  const { cloudEnabled, user, requiresEmailConfirmation } = useCloudSync();
  const [checking, setChecking] = useState(false);
  const [notice, setNotice] = useState<ManualNotice | null>(null);

  const state = data.centralInvoiceAuthorityEventsSync;
  const summary = useMemo(
    () => describeCentralAuthorityEventsSyncState(state),
    [state],
  );
  const lastChecked = formatCentralAuthorityDate(state?.lastCheckedAt);
  const cursorText = state?.cursor
    ? `Cursor ${state.cursor.afterEventId} · ${formatCentralAuthorityDate(state.cursor.afterCreatedAt)}`
    : "Sin cursor confirmado todavía";
  const unavailableReason = !cloudEnabled
    ? "La comprobación central no está disponible ahora mismo."
    : !user
      ? "Inicia sesión para comprobar la numeración central."
      : requiresEmailConfirmation
        ? "Confirma el email antes de comprobar la numeración central."
        : !ready
          ? "Cargando datos locales."
          : null;
  const canCheck = !checking && !unavailableReason;

  async function handleCheckCentralEvents() {
    setChecking(true);
    setNotice(null);
    try {
      const result = await syncCentralInvoiceAuthorityEvents(data, {
        limit: CENTRAL_AUTHORITY_EVENTS_MANUAL_LIMIT,
      });
      setNotice(describeCentralAuthorityEventsManualResult(result));
    } finally {
      setChecking(false);
    }
  }

  return (
    <Card className="mb-6 space-y-4 border-emerald-100 bg-emerald-50/60">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-emerald-700">
          <ShieldCheck className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <h3 className="text-base font-bold text-slate-900">
            Numeración central de facturas
          </h3>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            Comprueba si el servidor tiene facturas emitidas que este navegador
            todavía no ha recibido.
          </p>
        </div>
      </div>

      <div className="grid gap-3 rounded-xl border border-emerald-100 bg-white px-4 py-3 text-sm text-slate-600 sm:grid-cols-2">
        <p>
          <span className="font-bold text-slate-800">Estado:</span> {summary}
        </p>
        <p>
          <span className="font-bold text-slate-800">Última comprobación:</span>{" "}
          {lastChecked}
        </p>
        <p className="sm:col-span-2">
          <span className="font-bold text-slate-800">Cursor:</span>{" "}
          {cursorText}
        </p>
      </div>

      {notice ? (
        <p
          className={`rounded-xl px-4 py-3 text-sm leading-6 ${
            notice.tone === "success"
              ? "border border-emerald-200 bg-white text-emerald-900"
              : notice.tone === "warning"
                ? "border border-amber-200 bg-amber-50 text-amber-950"
                : "border border-red-200 bg-red-50 text-red-950"
          }`}
        >
          {notice.tone !== "success" ? (
            <TriangleAlert className="mr-2 inline h-4 w-4 align-text-bottom" />
          ) : null}
          {notice.message}
        </p>
      ) : null}

      {unavailableReason ? (
        <p className="text-sm text-slate-500">{unavailableReason}</p>
      ) : null}

      <Button
        variant="secondary"
        onClick={() => void handleCheckCentralEvents()}
        disabled={!canCheck}
        aria-busy={checking}
      >
        <RefreshCw className={`h-4 w-4 ${checking ? "animate-spin" : ""}`} />
        {checking ? "Comprobando…" : "Comprobar facturas centrales"}
      </Button>
    </Card>
  );
}
