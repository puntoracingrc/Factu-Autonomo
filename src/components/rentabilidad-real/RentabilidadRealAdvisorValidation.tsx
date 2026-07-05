"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Clipboard, ClipboardCheck, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import {
  buildRentabilidadRealAdvisorValidationSummary,
  getStoredRentabilidadRealAdvisorValidationStatus,
  setStoredRentabilidadRealAdvisorValidationStatus,
  type RentabilidadRealAdvisorValidationStatus,
} from "@/lib/rentabilidad-real/advisor-validation";
import {
  getStoredRentabilidadRealLastScoringResult,
  getStoredRentabilidadRealWizardAnswers,
} from "@/lib/rentabilidad-real/wizard-storage";
import type {
  RentabilidadRealScoringResult,
  RentabilidadRealWizardAnswers,
} from "@/lib/rentabilidad-real/types";

const STATUS_LABELS: Record<RentabilidadRealAdvisorValidationStatus, string> = {
  not_started: "Sin validar",
  pending_review: "Pendiente de revisar",
  validated: "Configuración validada",
  corrected: "Corregido por mi gestor",
};

export function RentabilidadRealAdvisorValidation() {
  const [answers, setAnswers] = useState<RentabilidadRealWizardAnswers | null>(
    null,
  );
  const [scoringResult, setScoringResult] =
    useState<RentabilidadRealScoringResult | null>(null);
  const [status, setStatus] =
    useState<RentabilidadRealAdvisorValidationStatus>("not_started");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setAnswers(getStoredRentabilidadRealWizardAnswers());
    setScoringResult(getStoredRentabilidadRealLastScoringResult());
    setStatus(getStoredRentabilidadRealAdvisorValidationStatus());
  }, []);

  const summary = useMemo(
    () =>
      buildRentabilidadRealAdvisorValidationSummary({
        answers,
        scoringResult,
      }),
    [answers, scoringResult],
  );

  function updateStatus(nextStatus: RentabilidadRealAdvisorValidationStatus) {
    setStoredRentabilidadRealAdvisorValidationStatus(nextStatus);
    setStatus(nextStatus);
  }

  async function copySummary() {
    await navigator.clipboard.writeText(summary);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div className="space-y-6">
      <Card className="border-blue-100 bg-blue-50/80 dark:border-blue-900/60 dark:bg-blue-950/30">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-sm font-bold text-blue-700 shadow-sm dark:bg-slate-900 dark:text-blue-200">
              <ClipboardCheck className="h-4 w-4" />
              Validar configuración con mi gestor
            </div>
            <h1 className="mt-4 text-2xl font-black text-slate-950 sm:text-3xl dark:text-slate-50">
              Revisa el motor elegido antes de usarlo
            </h1>
            <p className="mt-2 text-sm leading-6 text-slate-700 dark:text-slate-200">
              Esta función no es un portal de gestoría. Sirve para compartir tu
              configuración con tu gestor y confirmar que el motor elegido
              encaja con tu caso.
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-700 dark:text-slate-200">
              La validación no presenta impuestos ni sustituye el asesoramiento
              profesional.
            </p>
          </div>
          <span className="inline-flex w-fit items-center gap-2 rounded-full bg-white px-3 py-2 text-sm font-bold text-slate-700 dark:bg-slate-900 dark:text-slate-100">
            <CheckCircle2 className="h-4 w-4" />
            {STATUS_LABELS[status]}
          </span>
        </div>
      </Card>

      {!scoringResult ? (
        <Card className="border-amber-200 bg-amber-50 dark:border-amber-900/60 dark:bg-amber-950/35">
          <p className="text-sm leading-6 text-amber-900 dark:text-amber-100">
            Todavía no hay un test guardado. Puedes hacer el test o copiar un
            resumen con datos pendientes.
          </p>
          <Link
            href="/rentabilidad-real/test"
            className="mt-3 inline-flex min-h-11 items-center justify-center rounded-2xl bg-blue-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
          >
            Hacer test guiado
          </Link>
        </Card>
      ) : null}

      <Card className="border-slate-200/80 bg-white dark:border-slate-700 dark:bg-slate-900">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-black text-slate-950 dark:text-slate-50">
            Resumen para compartir
          </h2>
          <Button onClick={() => void copySummary()} variant="secondary">
            <Clipboard className="h-4 w-4" />
            {copied ? "Resumen copiado" : "Copiar resumen para mi gestor"}
          </Button>
        </div>
        <pre className="mt-4 max-h-[30rem] overflow-auto whitespace-pre-wrap rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
          {summary}
        </pre>
      </Card>

      <Card className="border-slate-200/80 bg-white dark:border-slate-700 dark:bg-slate-900">
        <h2 className="text-lg font-black text-slate-950 dark:text-slate-50">
          Estado de revisión
        </h2>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <Button
            variant="secondary"
            onClick={() => updateStatus("pending_review")}
          >
            Marcar como pendiente de revisar
          </Button>
          <Button onClick={() => updateStatus("validated")}>
            Marcar como validado por mi gestor
          </Button>
          <Button
            variant="secondary"
            onClick={() => updateStatus("corrected")}
          >
            Marcar como corregido por mi gestor
          </Button>
          <Button
            variant="ghost"
            onClick={() => updateStatus("not_started")}
          >
            <RotateCcw className="h-4 w-4" />
            Reiniciar estado
          </Button>
        </div>
      </Card>
    </div>
  );
}
