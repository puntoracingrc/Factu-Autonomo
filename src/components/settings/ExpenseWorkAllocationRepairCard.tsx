"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, RotateCcw, ShieldAlert, Wrench } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useAppStore } from "@/context/AppStore";
import { formatMoney } from "@/lib/calculations";
import {
  applyExpenseWorkAllocationCostRepair,
  buildExpenseWorkAllocationRepairPreview,
  buildExpenseWorkAllocationRollbackPreview,
  rollbackExpenseWorkAllocationCostRepair,
} from "@/lib/expense-work-allocation-cost-repair";

type Feedback = { tone: "success" | "error"; message: string } | null;

export function ExpenseWorkAllocationRepairCard() {
  const { data, replaceDataIfCurrent } = useAppStore();
  const preview = useMemo(
    () => buildExpenseWorkAllocationRepairPreview(data),
    [data],
  );
  const rollbackPreview = useMemo(
    () => buildExpenseWorkAllocationRollbackPreview(data),
    [data],
  );
  const [confirmedApply, setConfirmedApply] = useState(false);
  const [confirmedRollback, setConfirmedRollback] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const feedbackRef = useRef<HTMLParagraphElement>(null);
  const previewKey = JSON.stringify({
    apply: preview.candidates.map((candidate) => [
      candidate.expenseId,
      candidate.beforeFingerprint,
      candidate.afterFingerprint,
    ]),
    rollback: rollbackPreview.candidates.map((candidate) => [
      candidate.expenseId,
      candidate.afterFingerprint,
    ]),
  });

  useEffect(() => {
    setConfirmedApply(false);
    setConfirmedRollback(false);
  }, [previewKey]);

  useEffect(() => {
    if (feedback) feedbackRef.current?.focus();
  }, [feedback]);

  const visible =
    preview.affectedCount > 0 ||
    preview.manualReview.length > 0 ||
    preview.alreadyAppliedExpenseIds.length > 0 ||
    rollbackPreview.affectedCount > 0 ||
    rollbackPreview.blockedExpenseIds.length > 0;
  if (!visible) return null;

  function handleApply() {
    if (!confirmedApply || preview.affectedCount === 0) return;
    const expected = data;
    const result = applyExpenseWorkAllocationCostRepair(
      expected,
      preview,
      new Date().toISOString(),
    );
    if (result.appliedExpenseIds.length === 0) {
      setFeedback({
        tone: "error",
        message:
          "La vista previa ya no coincide con los datos actuales. Revísala de nuevo antes de aplicar.",
      });
      return;
    }
    if (!replaceDataIfCurrent(result.data, expected)) {
      setFeedback({
        tone: "error",
        message:
          "Los datos cambiaron mientras confirmabas. No se aplicó ninguna reparación.",
      });
      return;
    }
    setFeedback({
      tone: "success",
      message: `Repartos actualizados en esta sesión: ${result.appliedExpenseIds.length}. Puedes deshacer mientras no cambies el gasto, sus líneas o sus repartos; exporta una copia si quieres conservar una evidencia adicional.`,
    });
  }

  function handleRollback() {
    if (!confirmedRollback || rollbackPreview.affectedCount === 0) return;
    const expected = data;
    const result = rollbackExpenseWorkAllocationCostRepair(
      expected,
      rollbackPreview,
      new Date().toISOString(),
    );
    if (result.rolledBackExpenseIds.length === 0) {
      setFeedback({
        tone: "error",
        message:
          "No se puede deshacer porque los repartos ya no coinciden con el estado reparado.",
      });
      return;
    }
    if (!replaceDataIfCurrent(result.data, expected)) {
      setFeedback({
        tone: "error",
        message:
          "Los datos cambiaron mientras confirmabas. No se deshizo ninguna reparación.",
      });
      return;
    }
    setFeedback({
      tone: "success",
      message: `Repartos restaurados: ${result.rolledBackExpenseIds.length}. La auditoría del cambio se conserva.`,
    });
  }

  return (
    <Card className="mb-6 space-y-4 border-amber-200 bg-amber-50/70">
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-white p-2 text-amber-700 shadow-sm">
          <Wrench className="h-5 w-5" aria-hidden="true" />
        </div>
        <div>
          <h3 className="font-bold text-slate-950">
            Revisión de repartos antiguos de gastos
          </h3>
          <p className="mt-1 text-sm leading-6 text-slate-700">
            Comprueba repartos completos creados antes de conservar el recargo de
            equivalencia. Nunca cambia la factura, las líneas ni los campos
            fiscales del gasto: solo ajusta sus allocations operativas y guarda
            una auditoría reversible.
          </p>
        </div>
      </div>

      {preview.affectedCount > 0 && (
        <div className="space-y-3 rounded-2xl border border-amber-200 bg-white p-4">
          <div>
            <p className="font-semibold text-slate-900">
              {preview.affectedCount} {preview.affectedCount === 1 ? "gasto seguro" : "gastos seguros"} para actualizar
            </p>
            <p className="mt-1 text-sm text-slate-600">
              La selección de líneas cubre el gasto completo, reproduce el canon
              antiguo y no contiene importes manuales ni parciales.
            </p>
          </div>

          <ul className="space-y-2">
            {preview.candidates.map((candidate) => (
              <li
                key={candidate.expenseId}
                className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm"
              >
                <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                  <span className="font-semibold text-slate-900">
                    {candidate.supplierName || candidate.description || "Gasto"}
                  </span>
                  <span className="whitespace-nowrap font-bold text-amber-800">
                    {formatMoney(candidate.legacyOperatingCost)} →{" "}
                    {formatMoney(candidate.canonicalOperatingCost)}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  {candidate.workDocumentIds.length} {candidate.workDocumentIds.length === 1 ? "trabajo" : "trabajos"} · ID interno{" "}
                  <code className="break-all">{candidate.expenseId}</code>
                </p>
              </li>
            ))}
          </ul>

          <p className="text-sm text-slate-700">
            Se recomienda descargar antes una copia JSON. La propia reparación
            guarda un antes/después reversible.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <ButtonLink href="#datos-privacidad" variant="secondary">
              Ir a copia de seguridad
            </ButtonLink>
          </div>
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-slate-800">
            <input
              type="checkbox"
              className="mt-1 h-5 w-5 shrink-0 accent-amber-600"
              checked={confirmedApply}
              onChange={(event) => setConfirmedApply(event.target.checked)}
            />
            <span>
              He revisado la vista previa y entiendo que solo se modificarán los
              importes de estos repartos operativos.
            </span>
          </label>
          <Button
            type="button"
            onClick={handleApply}
            disabled={!confirmedApply}
          >
            <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
            Aplicar a {preview.affectedCount}
          </Button>
        </div>
      )}

      {preview.manualReview.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex items-start gap-2">
            <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-slate-600" aria-hidden="true" />
            <div>
              <p className="font-semibold text-slate-900">
                {preview.manualReview.length} {preview.manualReview.length === 1 ? "gasto excluido" : "gastos excluidos"}
              </p>
              <p className="mt-1 text-sm text-slate-600">
                Hay datos parciales, ambiguos o modificados. No se cambiarán
                automáticamente.
              </p>
              <p className="mt-2 break-all text-xs text-slate-500">
                IDs internos: {preview.manualReview.map((item) => item.expenseId).join(", ")}
              </p>
            </div>
          </div>
        </div>
      )}

      {rollbackPreview.affectedCount > 0 && (
        <div className="space-y-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <p className="font-semibold text-emerald-950">
            Reparación aplicada a {rollbackPreview.affectedCount}. El estado
            anterior sigue disponible.
          </p>
          <ul className="space-y-2">
            {rollbackPreview.candidates.map((candidate) => (
              <li
                key={candidate.expenseId}
                className="rounded-xl border border-emerald-200 bg-white p-3 text-sm"
              >
                <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                  <span className="font-semibold text-slate-900">
                    {candidate.supplierName || candidate.description || "Gasto"}
                  </span>
                  <span className="whitespace-nowrap font-bold text-emerald-800">
                    {formatMoney(candidate.canonicalOperatingCost)} →{" "}
                    {formatMoney(candidate.legacyOperatingCost)}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  ID interno <code className="break-all">{candidate.expenseId}</code>
                </p>
              </li>
            ))}
          </ul>
          <label className="flex cursor-pointer items-start gap-3 text-sm text-emerald-950">
            <input
              type="checkbox"
              className="mt-1 h-5 w-5 shrink-0 accent-emerald-700"
              checked={confirmedRollback}
              onChange={(event) => setConfirmedRollback(event.target.checked)}
            />
            <span>Quiero restaurar exactamente los repartos anteriores.</span>
          </label>
          <Button
            type="button"
            variant="secondary"
            onClick={handleRollback}
            disabled={!confirmedRollback}
          >
            <RotateCcw className="h-5 w-5" aria-hidden="true" />
            Deshacer reparación
          </Button>
          <ButtonLink href="#datos-privacidad" variant="secondary">
            Exportar copia del estado reparado
          </ButtonLink>
        </div>
      )}

      {rollbackPreview.blockedExpenseIds.length > 0 && (
        <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          No se puede deshacer automáticamente {rollbackPreview.blockedExpenseIds.length}{" "}
          {rollbackPreview.blockedExpenseIds.length === 1 ? "reparto" : "repartos"}
          porque hubo cambios posteriores. No se ha sobrescrito nada.
        </p>
      )}

      {feedback && (
        <p
          ref={feedbackRef}
          role={feedback.tone === "error" ? "alert" : "status"}
          aria-live={feedback.tone === "error" ? "assertive" : "polite"}
          tabIndex={-1}
          className={`text-sm font-semibold ${
            feedback.tone === "success" ? "text-emerald-800" : "text-red-700"
          }`}
        >
          {feedback.message}
        </p>
      )}
    </Card>
  );
}
