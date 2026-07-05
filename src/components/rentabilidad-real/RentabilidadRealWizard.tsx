"use client";

import { useMemo, useState } from "react";
import { ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import {
  buildRentabilidadRealWizardAnswersFromForm,
  scoreRentabilidadRealWizardForm,
  type RentabilidadRealWizardFormState,
} from "@/lib/rentabilidad-real/wizard-flow";
import {
  setStoredRentabilidadRealLastScoringResult,
  setStoredRentabilidadRealWizardAnswers,
} from "@/lib/rentabilidad-real/wizard-storage";
import type {
  RentabilidadRealScoringResult,
  RentabilidadRealWizardAnswers,
} from "@/lib/rentabilidad-real/types";
import { RentabilidadRealWizardResult } from "./RentabilidadRealWizardResult";

type QuestionId = keyof RentabilidadRealWizardFormState;

interface Option {
  value: string;
  label: string;
}

interface Question {
  id: QuestionId;
  title: string;
  options: readonly Option[];
}

const QUESTIONS: readonly Question[] = [
  {
    id: "legalForm",
    title: "¿Qué eres?",
    options: [
      { value: "individual", label: "Autónomo persona física" },
      { value: "sl", label: "S.L. / S.L.U." },
      { value: "community", label: "Comunidad de bienes" },
      { value: "civil_company", label: "Sociedad civil" },
      { value: "unknown", label: "No lo sé" },
    ],
  },
  {
    id: "chargeModel",
    title: "¿Cómo cobras principalmente?",
    options: [
      { value: "hours", label: "Por horas" },
      { value: "projects", label: "Por proyectos" },
      { value: "closed_jobs", label: "Por obras o trabajos cerrados" },
      { value: "visits_services", label: "Por visitas o servicios" },
      { value: "job_materials", label: "Materiales por trabajo" },
      { value: "customer_products", label: "Producto aportado por cliente" },
      { value: "stock_commerce", label: "Stock, tienda o e-commerce" },
      { value: "mixed", label: "Mixto" },
    ],
  },
  {
    id: "hasPayrollEmployees",
    title: "¿Tienes empleados en nómina?",
    options: [
      { value: "yes", label: "Sí" },
      { value: "no", label: "No" },
      { value: "unknown", label: "No lo sé" },
    ],
  },
  {
    id: "hasPremises",
    title: "¿Tienes local, oficina o taller?",
    options: [
      { value: "yes", label: "Sí" },
      { value: "no", label: "No" },
    ],
  },
  {
    id: "workVehicleType",
    title: "¿Qué vehículo usas para trabajar?",
    options: [
      { value: "none", label: "Sin vehículo" },
      { value: "dedicated_van", label: "Vehículo dedicado" },
      { value: "private_car", label: "Coche particular" },
      { value: "private_motorbike", label: "Moto particular" },
      { value: "renting_leasing", label: "Renting/leasing" },
    ],
  },
  {
    id: "hasRelevantToolsOrEquipment",
    title: "¿Tienes herramientas, maquinaria ligera o equipos relevantes?",
    options: [
      { value: "yes", label: "Sí" },
      { value: "no", label: "No" },
    ],
  },
  {
    id: "hasStockOrCommerce",
    title: "¿Tienes stock, inventario, tienda o e-commerce?",
    options: [
      { value: "yes", label: "Sí" },
      { value: "no", label: "No" },
    ],
  },
  {
    id: "isInModulesRegime",
    title: "¿Estás en módulos?",
    options: [
      { value: "yes", label: "Sí" },
      { value: "no", label: "No" },
      { value: "unknown", label: "No lo sé" },
    ],
  },
  {
    id: "appliesNormalVat",
    title: "¿Aplicas IVA normal?",
    options: [
      { value: "yes", label: "Sí" },
      { value: "no", label: "No" },
      { value: "unknown", label: "No lo sé" },
    ],
  },
  {
    id: "hasProfessionalWithholding",
    title: "¿Aplicas retención en tus facturas?",
    options: [
      { value: "yes", label: "Sí" },
      { value: "no", label: "No" },
      { value: "unknown", label: "No lo sé" },
    ],
  },
  {
    id: "profitUnit",
    title: "¿Quieres calcular beneficio principalmente por qué unidad?",
    options: [
      { value: "job", label: "Trabajo/obra" },
      { value: "hour", label: "Hora" },
      { value: "project", label: "Proyecto" },
      { value: "client", label: "Cliente" },
      { value: "invoice", label: "Factura" },
      { value: "service", label: "Servicio" },
    ],
  },
];

function optionValue(
  form: RentabilidadRealWizardFormState,
  id: QuestionId,
): string | undefined {
  const value = form[id];
  return typeof value === "string" ? value : undefined;
}

export function RentabilidadRealWizard() {
  const [form, setForm] = useState<RentabilidadRealWizardFormState>({});
  const [result, setResult] = useState<{
    answers: RentabilidadRealWizardAnswers;
    scoringResult: RentabilidadRealScoringResult;
  } | null>(null);

  const answeredCount = useMemo(
    () =>
      QUESTIONS.filter((question) => optionValue(form, question.id)).length,
    [form],
  );

  function answerQuestion(id: QuestionId, value: string) {
    setForm((current) => ({ ...current, [id]: value }));
  }

  function submitWizard() {
    const answers = buildRentabilidadRealWizardAnswersFromForm(form);
    const scoringResult = scoreRentabilidadRealWizardForm(form);
    setStoredRentabilidadRealWizardAnswers(answers);
    setStoredRentabilidadRealLastScoringResult(scoringResult);
    setResult({ answers, scoringResult });
  }

  return (
    <div className="space-y-6">
      <Card className="border-blue-100 bg-blue-50/80 dark:border-blue-900/60 dark:bg-blue-950/30">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-sm font-bold text-blue-700 shadow-sm dark:bg-slate-900 dark:text-blue-200">
              <ClipboardList className="h-4 w-4" />
              Test guiado
            </div>
            <h1 className="mt-4 text-2xl font-black text-slate-950 sm:text-3xl dark:text-slate-50">
              Detecta tus modos de Rentabilidad Real
            </h1>
            <p className="mt-2 text-sm leading-6 text-slate-700 dark:text-slate-200">
              Responde las preguntas clave para recomendar módulos de niveles 1
              a 4 o detectar si tu caso queda para una fase futura.
            </p>
          </div>
          <p className="rounded-full bg-white px-3 py-1 text-sm font-bold text-slate-600 dark:bg-slate-900 dark:text-slate-200">
            {answeredCount}/{QUESTIONS.length}
          </p>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {QUESTIONS.map((question) => (
          <Card
            key={question.id}
            className="border-slate-200/80 bg-white dark:border-slate-700 dark:bg-slate-900"
          >
            <fieldset>
              <legend className="text-base font-black text-slate-950 dark:text-slate-50">
                {question.title}
              </legend>
              <div className="mt-4 flex flex-wrap gap-2">
                {question.options.map((option) => {
                  const selected =
                    optionValue(form, question.id) === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => answerQuestion(question.id, option.value)}
                      className={`min-h-10 rounded-full border px-3 text-sm font-bold transition-colors ${
                        selected
                          ? "border-blue-600 bg-blue-600 text-white"
                          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                      }`}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          </Card>
        ))}
      </div>

      <div className="flex justify-end">
        <Button onClick={submitWizard}>Ver resultado</Button>
      </div>

      {result ? (
        <RentabilidadRealWizardResult
          answers={result.answers}
          scoringResult={result.scoringResult}
        />
      ) : null}
    </div>
  );
}
