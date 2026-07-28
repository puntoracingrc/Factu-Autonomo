"use client";

import { useMemo, useState } from "react";
import {
  CheckCircle2,
  Database,
  ShieldAlert,
  TriangleAlert,
} from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useAppStore } from "@/context/AppStore";
import { useCloudSync } from "@/context/CloudSyncContext";
import { buildCentralInvoiceAuthorityAccountSeriesInventory } from "@/lib/central-invoice-authority/account-series-inventory";
import {
  reconcileCentralInvoiceAuthorityAccountSeriesFromBrowser,
} from "@/lib/central-invoice-authority/account-series-reconciliation-client";
import { runCentralInvoiceAuthorityClientOperation } from "@/lib/central-invoice-authority/client-operation-lock";
import {
  describeCentralInvoiceAuthorityAccountReconciliation,
  type CentralInvoiceAuthorityAccountReconciliationNotice,
} from "./central-authority-account-reconciliation-presentation";

export function CentralInvoiceAuthorityAccountReconciliationCard() {
  const { data, ready } = useAppStore();
  const { cloudEnabled, user, requiresEmailConfirmation } = useCloudSync();
  const [confirmed, setConfirmed] = useState(false);
  const [reconciling, setReconciling] = useState(false);
  const [notice, setNotice] =
    useState<CentralInvoiceAuthorityAccountReconciliationNotice | null>(null);
  const inventory = useMemo(
    () =>
      ready
        ? buildCentralInvoiceAuthorityAccountSeriesInventory(data)
        : null,
    [data, ready],
  );
  const hasConflicts = Boolean(inventory?.conflicts.length);
  const unavailableReason = !cloudEnabled
    ? "La conciliacion central no esta disponible ahora mismo."
    : !user
      ? "Inicia sesion para revisar la numeracion central."
      : requiresEmailConfirmation
        ? "Confirma el email antes de revisar la numeracion central."
        : !ready
          ? "Cargando datos locales."
          : null;
  const canReconcile =
    !reconciling &&
    confirmed &&
    !unavailableReason &&
    !hasConflicts &&
    Boolean(inventory?.summaries.length);

  async function handleReconcile() {
    if (!inventory || !canReconcile) return;
    setReconciling(true);
    setNotice(null);
    try {
      const result = await runCentralInvoiceAuthorityClientOperation(() =>
        reconcileCentralInvoiceAuthorityAccountSeriesFromBrowser(
          inventory.summaries,
        ),
      );
      setNotice(describeCentralInvoiceAuthorityAccountReconciliation(result));
      if (result.ok) setConfirmed(false);
    } finally {
      setReconciling(false);
    }
  }

  return (
    <Card className="mb-6 space-y-4 border-cyan-100 bg-cyan-50/60">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-cyan-700">
          <Database className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <h3 className="text-base font-bold text-slate-900">
            Preparar series fiscales
          </h3>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            Revisa el ultimo numero local antes de permitir que el servidor
            asigne nuevas facturas. Solo se envia el maximo y un resumen
            criptografico.
          </p>
        </div>
      </div>

      {inventory ? (
        <div className="overflow-hidden rounded-lg border border-cyan-100 bg-white">
          <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] gap-3 border-b border-cyan-100 px-4 py-2 text-xs font-bold uppercase text-slate-500">
            <span>Serie</span>
            <span>Documentos</span>
            <span>Ultimo</span>
          </div>
          {inventory.summaries.map((summary) => (
            <div
              key={`${summary.environment}:${summary.issuerNif}:${summary.seriesCode}:${summary.fiscalYear}`}
              className="grid grid-cols-[minmax(0,1fr)_auto_auto] gap-3 border-b border-cyan-50 px-4 py-3 text-sm last:border-b-0"
            >
              <span className="min-w-0 font-bold text-slate-900">
                {summary.seriesCode}
                <span className="ml-2 font-normal text-slate-500">
                  {summary.environment === "test" ? "Pruebas" : "Produccion"}
                </span>
              </span>
              <span className="text-right text-slate-600">
                {summary.sourceDocumentCount}
              </span>
              <span className="text-right font-bold text-slate-900">
                {summary.observedMaxSequence}
              </span>
            </div>
          ))}
        </div>
      ) : null}

      {inventory?.ignoredDocuments ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-950">
          <TriangleAlert className="mr-2 inline h-4 w-4 align-text-bottom" />
          {inventory.ignoredDocuments} documentos usan otra numeracion historica
          y no pertenecen a las series configuradas ahora.
        </p>
      ) : null}

      {hasConflicts ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-950">
          <p className="font-bold">
            <ShieldAlert className="mr-2 inline h-4 w-4 align-text-bottom" />
            No se puede conciliar: hay numeros duplicados.
          </p>
          <ul className="mt-1 list-disc pl-5">
            {inventory?.conflicts.map((conflict) => (
              <li
                key={`${conflict.seriesCode}:${conflict.fiscalYear}:${conflict.sequence}`}
              >
                {conflict.seriesCode}: secuencia {conflict.sequence} (
                {conflict.documentNumbers.join(", ")})
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <label className="flex items-start gap-3 rounded-lg border border-cyan-100 bg-white px-4 py-3 text-sm leading-6 text-slate-700">
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(event) => setConfirmed(event.target.checked)}
          disabled={reconciling || Boolean(unavailableReason) || hasConflicts}
          className="mt-1 h-4 w-4 shrink-0 accent-cyan-700"
        />
        <span>
          He revisado las series y autorizo elevar el contador del servidor
          hasta estos maximos. El servidor nunca reducira un contador existente.
        </span>
      </label>

      {notice ? (
        <p
          className={`rounded-lg border px-4 py-3 text-sm leading-6 ${
            notice.tone === "success"
              ? "border-emerald-200 bg-white text-emerald-900"
              : notice.tone === "warning"
                ? "border-amber-200 bg-amber-50 text-amber-950"
                : "border-red-200 bg-red-50 text-red-950"
          }`}
        >
          {notice.tone === "success" ? (
            <CheckCircle2 className="mr-2 inline h-4 w-4 align-text-bottom" />
          ) : (
            <TriangleAlert className="mr-2 inline h-4 w-4 align-text-bottom" />
          )}
          {notice.message}
        </p>
      ) : null}

      {unavailableReason ? (
        <p className="text-sm text-slate-500">{unavailableReason}</p>
      ) : null}

      <Button
        variant="secondary"
        onClick={() => void handleReconcile()}
        disabled={!canReconcile}
        aria-busy={reconciling}
      >
        <Database className="h-4 w-4" />
        {reconciling ? "Conciliando…" : "Conciliar series con el servidor"}
      </Button>
    </Card>
  );
}
