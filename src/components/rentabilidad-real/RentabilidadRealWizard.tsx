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
  subtitle?: string;
  multiple?: boolean;
  exclusiveValues?: readonly string[];
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
    id: "chargeModels",
    title: "¿Cómo sueles cobrar o presupuestar tus trabajos?",
    subtitle: "Puedes elegir varias opciones.",
    multiple: true,
    options: [
      { value: "hours", label: "Por horas" },
      { value: "closed_jobs", label: "Precio cerrado por trabajo/obra" },
      { value: "closed_projects", label: "Precio cerrado por proyecto" },
      { value: "visits_services", label: "Por visitas o servicios" },
      { value: "monthly_retainer", label: "Iguala o mantenimiento mensual" },
      {
        value: "installation_materials",
        label: "Instalación con materiales/productos",
      },
      { value: "labor_only", label: "Solo mano de obra" },
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
    id: "materialStockModes",
    title: "¿Trabajas con materiales, productos o stock?",
    subtitle: "Elegir materiales para un trabajo no significa tener inventario.",
    multiple: true,
    exclusiveValues: ["none"],
    options: [
      { value: "none", label: "No uso materiales/productos" },
      { value: "job_materials", label: "Compro materiales para cada trabajo" },
      {
        value: "customer_products",
        label: "Instalo productos que compra el cliente",
      },
      {
        value: "install_products_for_job",
        label: "Compro productos para instalarlos en ese trabajo",
      },
      {
        value: "habitual_material_no_inventory",
        label: "Tengo algo de material habitual, pero no inventario formal",
      },
      { value: "stock_inventory", label: "Tengo stock/inventario propio" },
      { value: "physical_store", label: "Tengo tienda física" },
      { value: "ecommerce", label: "Tengo e-commerce" },
    ],
  },
  {
    id: "workVehicleTypes",
    title: "¿Qué vehículos usas para trabajar?",
    subtitle:
      "Puedes elegir varios. El vehículo puede afectar a tu rentabilidad interna; su tratamiento fiscal puede depender del uso y conviene validarlo con tu gestor.",
    multiple: true,
    exclusiveValues: ["none"],
    options: [
      { value: "none", label: "Sin vehículo" },
      { value: "dedicated_van", label: "Furgoneta dedicada" },
      { value: "private_car", label: "Coche particular" },
      { value: "private_motorbike", label: "Moto particular" },
      { value: "renting_leasing", label: "Renting/leasing" },
      { value: "industrial_truck", label: "Camión o vehículo industrial" },
      { value: "taxi_vtc_transport", label: "Taxi/VTC/transporte" },
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
    id: "analysisInterests",
    title: "¿Qué te interesa analizar en Rentabilidad Real?",
    subtitle:
      "Puedes elegir varias vistas. Luego podrás usar la calculadora que necesites en cada caso.",
    multiple: true,
    options: [
      { value: "jobs", label: "Trabajos u obras" },
      { value: "real_hours", label: "Horas reales trabajadas" },
      { value: "projects", label: "Proyectos" },
      { value: "clients", label: "Clientes" },
      {
        value: "documents",
        label: "Facturas o presupuestos concretos",
      },
      { value: "services_visits", label: "Servicios o visitas" },
      {
        value: "minimum_price",
        label: "Precio mínimo que debería cobrar",
      },
    ],
  },
];

function selectedValues(
  form: RentabilidadRealWizardFormState,
  id: QuestionId,
): string[] {
  const value = form[id];
  if (Array.isArray(value)) return value.filter((item) => typeof item === "string");
  return typeof value === "string" ? [value] : [];
}

export function RentabilidadRealWizard() {
  const [form, setForm] = useState<RentabilidadRealWizardFormState>({});
  const [result, setResult] = useState<{
    answers: RentabilidadRealWizardAnswers;
    scoringResult: RentabilidadRealScoringResult;
  } | null>(null);

  const answeredCount = useMemo(
    () =>
      QUESTIONS.filter((question) => selectedValues(form, question.id).length > 0)
        .length,
    [form],
  );

  function answerQuestion(question: Question, value: string) {
    setForm((current) => {
      if (!question.multiple) {
        return { ...current, [question.id]: value };
      }

      const exclusiveValues = question.exclusiveValues ?? [];
      const currentValues = selectedValues(current, question.id);
      if (exclusiveValues.includes(value)) {
        return { ...current, [question.id]: [value] };
      }

      const withoutExclusive = currentValues.filter(
        (item) => !exclusiveValues.includes(item),
      );
      const nextValues = withoutExclusive.includes(value)
        ? withoutExclusive.filter((item) => item !== value)
        : [...withoutExclusive, value];
      return { ...current, [question.id]: nextValues };
    });
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
              {question.subtitle ? (
                <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
                  {question.subtitle}
                </p>
              ) : null}
              <div className="mt-4 flex flex-wrap gap-2">
                {question.options.map((option) => {
                  const selected =
                    selectedValues(form, question.id).includes(option.value);
                  return (
                    <button
                      key={option.value}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => answerQuestion(question, option.value)}
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
