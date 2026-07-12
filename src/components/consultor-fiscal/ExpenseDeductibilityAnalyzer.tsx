"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { BadgeEuro, Loader2, ShieldCheck } from "lucide-react";
import { ConditionalQuestions } from "./ConditionalQuestions";
import { EvaluationResultPanel } from "./EvaluationResultPanel";
import { FiscalProfileSetupCard } from "./FiscalProfileSetupCard";
import {
  AiProcessingConsentNotice,
  useAiProcessingConsent,
} from "@/components/legal/AiProcessingConsentNotice";
import { Button } from "@/components/ui/Button";
import { Card, PageHeader } from "@/components/ui/Card";
import { Field, Input, Select } from "@/components/ui/Field";
import { useAppStore } from "@/context/AppStore";
import { AI_PROCESSING_CONSENT_VERSION } from "@/lib/ai-consent";
import {
  adaptExistingExpenseForEvaluation,
  parseEuroInputToCents,
} from "@/lib/expense-deductibility";
import { buildTaxContextFromBusinessProfile } from "@/lib/fiscal-profile";
import type { BusinessProfile } from "@/lib/types";
import {
  assertEvaluationResult,
  type AnswerValue,
  type ConditionalQuestion,
  type EvaluationResult,
  type ExpenseAnswers,
  type ExpenseInput,
} from "@/lib/tax-engine";
import {
  EMPTY_EXPENSE_FORM,
  projectExistingExpenseToForm,
} from "./existing-expense-form";

interface FormState {
  concept: string;
  expenseDate: string;
  supplierName: string;
  netAmount: string;
  vatAmount: string;
  totalAmount: string;
  paymentMethod: ExpenseInput["paymentMethod"];
  invoiceType: ExpenseInput["invoiceType"];
}

const INITIAL_FORM: FormState = {
  concept: "",
  expenseDate: "",
  supplierName: "",
  netAmount: "",
  vatAmount: "",
  totalAmount: "",
  paymentMethod: "UNKNOWN",
  invoiceType: "UNKNOWN",
};

const IRPF_PRIVATE_USE_EXCEPTION_TYPES = new Set([
  "MIXED_GOODS",
  "PAID_PASSENGER_TRANSPORT",
  "DRIVING_SCHOOL",
  "SALES_REP",
]);

function isQuestionVisible(
  question: ConditionalQuestion,
  answers: ExpenseAnswers,
): boolean {
  const manualCategory = answers["expense.manualCategory"];
  if (question.id === "expense.manualCategory") return true;
  if (question.id === "meal.purpose") {
    return manualCategory !== "VEHICLE_RUNNING_COSTS";
  }
  if (question.id.startsWith("client.")) {
    return (
      manualCategory !== "VEHICLE_RUNNING_COSTS" &&
      answers["meal.purpose"] === "CLIENT_OR_SUPPLIER"
    );
  }
  if (question.id.startsWith("meal.")) {
    return (
      manualCategory !== "VEHICLE_RUNNING_COSTS" &&
      answers["meal.purpose"] === "SELF_MAINTENANCE"
    );
  }
  if (
    question.id.startsWith("vehicle.") &&
    manualCategory === "MEALS_AND_HOSPITALITY"
  ) {
    return false;
  }
  if (question.id === "vehicle.provenVatPercentage") {
    return answers["vehicle.higherVatUseProven"] === true;
  }
  if (question.id === "vehicle.privateUseAccessory") {
    return (
      answers["vehicle.privateUse"] === true &&
      typeof answers["vehicle.type"] === "string" &&
      IRPF_PRIVATE_USE_EXCEPTION_TYPES.has(answers["vehicle.type"])
    );
  }
  if (question.id.startsWith("document.")) {
    const purpose = answers["meal.purpose"];
    if (manualCategory === "VEHICLE_RUNNING_COSTS") return true;
    if (manualCategory === "MEALS_AND_HOSPITALITY") {
      return (
        purpose === "SELF_MAINTENANCE" ||
        purpose === "CLIENT_OR_SUPPLIER"
      );
    }
    return (
      purpose === "SELF_MAINTENANCE" ||
      purpose === "CLIENT_OR_SUPPLIER" ||
      typeof answers["vehicle.type"] === "string"
    );
  }
  return true;
}

function buildPayload(
  form: FormState,
  previousAnswers: ExpenseAnswers,
  options: {
    existingInput?: ExpenseInput;
    businessProfile: BusinessProfile;
    selectedActivityIndex?: number;
    calculateAmounts: boolean;
  },
) {
  let input = options.existingInput;
  if (!input) {
    if (!form.concept.trim()) throw new Error("Indica el concepto del gasto.");
    if (!form.expenseDate) throw new Error("Indica la fecha del gasto.");
    let net = 0;
    let vat = 0;
    let total = 0;
    if (options.calculateAmounts) {
      const fields = [
        ["Base imponible", form.netAmount],
        ["IVA", form.vatAmount],
        ["Total", form.totalAmount],
      ] as const;
      const parsed = fields.map(([label, value]) => ({
        label,
        result: parseEuroInputToCents(value),
      }));
      const invalid = parsed.find((item) => !item.result.ok);
      if (invalid && !invalid.result.ok) {
        throw new Error(`${invalid.label}: ${invalid.result.error}`);
      }
      [net, vat, total] = parsed.map((item) =>
        item.result.ok ? item.result.cents : 0,
      );
    }
    input = {
      concept: form.concept,
      supplierName: form.supplierName || undefined,
      expenseDate: form.expenseDate,
      ...(!options.calculateAmounts ? { amountsKnown: false } : {}),
      netAmountCents: net,
      vatAmountCents: vat,
      totalAmountCents: total,
      currency: "EUR",
      paymentMethod: form.paymentMethod,
      invoiceType: form.invoiceType,
    };
  }
  const context = buildTaxContextFromBusinessProfile(
    options.businessProfile,
    Number(input.expenseDate.slice(0, 4)),
    options.selectedActivityIndex,
  ).context;
  return { input, context, previousAnswers };
}

export function ExpenseDeductibilityAnalyzer({
  aiFallbackEnabled = false,
}: {
  aiFallbackEnabled?: boolean;
}) {
  const { data, ready, updateProfile } = useAppStore();
  const aiConsent = useAiProcessingConsent();
  const profileVatExempt = data.profile.vatExempt ?? false;
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [selectedExpenseId, setSelectedExpenseId] = useState("");
  const [selectedActivityIndex, setSelectedActivityIndex] = useState(0);
  const [calculateAmounts, setCalculateAmounts] = useState(false);
  const [answers, setAnswers] = useState<ExpenseAnswers>({});
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [questionCatalog, setQuestionCatalog] = useState<ConditionalQuestion[]>([]);
  const [result, setResult] = useState<EvaluationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestSequence = useRef(0);
  const activeRequest = useRef<AbortController | null>(null);
  const existingExpenses = useMemo(
    () => [...data.expenses].sort((left, right) => right.date.localeCompare(left.date)),
    [data.expenses],
  );
  const selectedExpense = useMemo(
    () => data.expenses.find((expense) => expense.id === selectedExpenseId),
    [data.expenses, selectedExpenseId],
  );
  const existingExpenseAdaptation = useMemo(
    () =>
      selectedExpense
        ? adaptExistingExpenseForEvaluation(selectedExpense, {
            vatExempt: profileVatExempt,
          })
        : null,
    [profileVatExempt, selectedExpense],
  );
  const usingExistingExpense = selectedExpenseId.length > 0;
  const selectedExpenseBlocked =
    usingExistingExpense && existingExpenseAdaptation?.status !== "READY";
  const previousProfileVatExempt = useRef(profileVatExempt);
  const previousFiscalProfile = useRef(data.profile.fiscalProfile);
  const fiscalContextPreview = useMemo(
    () =>
      buildTaxContextFromBusinessProfile(
        data.profile,
        form.expenseDate ? Number(form.expenseDate.slice(0, 4)) : new Date().getFullYear(),
        selectedActivityIndex,
      ),
    [data.profile, form.expenseDate, selectedActivityIndex],
  );
  const visibleQuestionCatalog = questionCatalog.filter((question) =>
    isQuestionVisible(question, answers),
  );

  useEffect(
    () => () => {
      activeRequest.current?.abort();
    },
    [],
  );

  useEffect(() => {
    if (!ready || !selectedExpenseId) return;
    activeRequest.current?.abort();
    requestSequence.current += 1;
    setAnswers({});
    setDrafts({});
    setQuestionCatalog([]);
    setResult(null);
    setLoading(false);

    if (!selectedExpense || !existingExpenseAdaptation) {
      setError("El gasto seleccionado ya no está disponible.");
      setForm((current) => ({ ...current, ...EMPTY_EXPENSE_FORM }));
      return;
    }
    setError(null);
    setForm((current) => ({
      ...current,
      ...projectExistingExpenseToForm(
        selectedExpense,
        existingExpenseAdaptation,
      ),
    }));
  }, [
    existingExpenseAdaptation,
    ready,
    selectedExpense,
    selectedExpenseId,
  ]);

  useEffect(() => {
    if (!ready) {
      previousProfileVatExempt.current = profileVatExempt;
      return;
    }
    if (previousProfileVatExempt.current === profileVatExempt) return;
    previousProfileVatExempt.current = profileVatExempt;
    activeRequest.current?.abort();
    requestSequence.current += 1;
    setAnswers({});
    setDrafts({});
    setQuestionCatalog([]);
    setResult(null);
    setError(null);
    setLoading(false);
  }, [profileVatExempt, ready]);

  useEffect(() => {
    if (!ready) {
      previousFiscalProfile.current = data.profile.fiscalProfile;
      return;
    }
    if (previousFiscalProfile.current === data.profile.fiscalProfile) return;
    previousFiscalProfile.current = data.profile.fiscalProfile;
    setSelectedActivityIndex(
      Math.max(
        0,
        data.profile.fiscalProfile?.activities.findIndex(
          (activity) => activity.isPrimary,
        ) ?? 0,
      ),
    );
    activeRequest.current?.abort();
    requestSequence.current += 1;
    setAnswers({});
    setDrafts({});
    setQuestionCatalog([]);
    setResult(null);
    setError(null);
    setLoading(false);
  }, [data.profile.fiscalProfile, ready]);

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    activeRequest.current?.abort();
    requestSequence.current += 1;
    setForm((current) => ({ ...current, [key]: value }));
    setAnswers({});
    setDrafts({});
    setQuestionCatalog([]);
    setResult(null);
    setError(null);
    setLoading(false);
  }

  function selectActivity(index: number) {
    activeRequest.current?.abort();
    requestSequence.current += 1;
    setSelectedActivityIndex(index);
    setAnswers({});
    setDrafts({});
    setQuestionCatalog([]);
    setResult(null);
    setError(null);
    setLoading(false);
  }

  function toggleAmountCalculation(enabled: boolean) {
    activeRequest.current?.abort();
    requestSequence.current += 1;
    setCalculateAmounts(enabled);
    setAnswers({});
    setDrafts({});
    setQuestionCatalog([]);
    setResult(null);
    setError(null);
    setLoading(false);
  }

  function selectExpense(expenseId: string) {
    activeRequest.current?.abort();
    requestSequence.current += 1;
    setSelectedExpenseId(expenseId);
    setAnswers({});
    setDrafts({});
    setQuestionCatalog([]);
    setResult(null);
    setError(null);
    setLoading(false);

    if (!expenseId) {
      setCalculateAmounts(false);
      setForm((current) => ({
        ...current,
        ...EMPTY_EXPENSE_FORM,
      }));
      return;
    }

    const expense = data.expenses.find((candidate) => candidate.id === expenseId);
    if (!expense) {
      setError("El gasto seleccionado ya no está disponible.");
      return;
    }
    const adaptation = adaptExistingExpenseForEvaluation(expense, {
      vatExempt: profileVatExempt,
    });
    setCalculateAmounts(true);
    setForm((current) => ({
      ...current,
      ...projectExistingExpenseToForm(expense, adaptation),
    }));
  }

  async function analyze(nextAnswers: ExpenseAnswers, resetQuestions = false) {
    activeRequest.current?.abort();
    const controller = new AbortController();
    activeRequest.current = controller;
    const sequence = requestSequence.current + 1;
    requestSequence.current = sequence;
    setError(null);
    setResult(null);
    setLoading(true);
    try {
      if (!ready) {
        throw new Error("Espera a que terminen de cargar los gastos.");
      }
      if (usingExistingExpense && !existingExpenseAdaptation) {
        throw new Error("El gasto seleccionado ya no está disponible.");
      }
      if (
        existingExpenseAdaptation &&
        existingExpenseAdaptation.status !== "READY"
      ) {
        throw new Error(existingExpenseAdaptation.missingInformation.join(" "));
      }
      const payload = buildPayload(form, nextAnswers, {
        ...(existingExpenseAdaptation?.status === "READY"
          ? { existingInput: existingExpenseAdaptation.input }
          : {}),
        businessProfile: data.profile,
        selectedActivityIndex,
        calculateAmounts: usingExistingExpense || calculateAmounts,
      });
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      let allowAiFallback = false;
      if (
        aiFallbackEnabled &&
        aiConsent.accepted
      ) {
        try {
          const { getSupabaseClientAsync } = await import(
            "@/lib/supabase/client"
          );
          const supabase = await getSupabaseClientAsync();
          const { data: sessionData } = (await supabase?.auth.getSession()) ?? {
            data: { session: null },
          };
          const token = sessionData.session?.access_token;
          headers["X-AI-Consent-Version"] = AI_PROCESSING_CONSENT_VERSION;
          if (token) headers.Authorization = `Bearer ${token}`;
          allowAiFallback = true;
        } catch {
          // La autenticación del fallback nunca debe impedir el motor local.
          allowAiFallback = false;
        }
      }
      if (controller.signal.aborted) return;
      const response = await fetch("/api/expense-deductibility/evaluate", {
        method: "POST",
        headers,
        body: JSON.stringify({ ...payload, allowAiFallback }),
        signal: controller.signal,
      });
      const body = (await response.json()) as {
        data?: EvaluationResult;
        error?: string;
        issues?: { message: string }[];
      };
      if (!response.ok || !body.data) {
        throw new Error(
          body.issues?.[0]?.message ??
            body.error ??
            "No se pudo completar el análisis.",
        );
      }
      const validated = assertEvaluationResult(body.data, payload.input);
      if (sequence !== requestSequence.current) return;
      setResult(validated);
      setQuestionCatalog((current) => {
        const byId = new Map(
          (resetQuestions ? [] : current).map((question) => [question.id, question]),
        );
        for (const question of validated.requiredQuestions) {
          byId.set(question.id, question);
        }
        return [...byId.values()];
      });
    } catch (caught) {
      if (sequence !== requestSequence.current) return;
      if (caught instanceof DOMException && caught.name === "AbortError") return;
      setError(
        caught instanceof Error
          ? caught.message
          : "No se pudo completar el análisis.",
      );
    } finally {
      if (activeRequest.current === controller) activeRequest.current = null;
      if (sequence === requestSequence.current) setLoading(false);
    }
  }

  function handleInitialAnalyze() {
    setAnswers({});
    setDrafts({});
    setQuestionCatalog([]);
    setResult(null);
    void analyze({}, true);
  }

  function immediateAnswer(id: string, value: AnswerValue) {
    const next = { ...answers, [id]: value };
    setAnswers(next);
    void analyze(next);
  }

  function changeDraft(id: string, value: string) {
    activeRequest.current?.abort();
    requestSequence.current += 1;
    setDrafts((current) => ({ ...current, [id]: value }));
    setResult(null);
    setError(null);
    setLoading(false);
  }

  function submitDraftAnswers() {
    const next: Record<string, AnswerValue> = { ...answers };
    for (const question of visibleQuestionCatalog) {
      if (
        question.type === "SINGLE_CHOICE" ||
        question.type === "BOOLEAN"
      ) {
        continue;
      }
      const draft = drafts[question.id];
      if (draft === undefined) continue;
      if (question.type === "TEXT") {
        next[question.id] = draft.trim();
      } else if (question.type === "MONEY_CENTS") {
        const parsed = parseEuroInputToCents(draft);
        if (!parsed.ok) {
          setError(`${question.prompt}: ${parsed.error}`);
          return;
        }
        next[question.id] = parsed.cents;
      } else {
        if (!/^\d{1,3}$/.test(draft)) {
          setError(`${question.prompt}: indica un porcentaje entero entre 0 y 100.`);
          return;
        }
        const percentage = Number(draft);
        if (percentage > 100) {
          setError(`${question.prompt}: el porcentaje no puede superar 100.`);
          return;
        }
        next[question.id] = percentage;
      }
    }
    setAnswers(next);
    void analyze(next);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analizador de gastos deducibles"
        subtitle="Evalúa de forma orientativa gastos de autónomos en IRPF e IVA con reglas locales, versionadas y auditables."
        action={
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-3 py-1 text-sm font-extrabold text-blue-800">
            <ShieldCheck className="h-4 w-4" aria-hidden="true" />
            Beta
          </span>
        }
      />

      <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm leading-6 text-blue-950">
        <p className="font-bold">Alcance actual</p>
        <p>
          España, territorio común, autónomo persona física en estimación directa:
          manutención, atenciones a clientes/proveedores y combustible,
          reparaciones, aparcamiento o peajes. El motor local se ejecuta siempre
          primero y nunca crea asientos.
        </p>
      </div>

      {aiFallbackEnabled ? (
        <Card>
          <h2 className="text-lg font-bold text-slate-950">
            Fallback opcional de IA
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-700">
            Solo se intenta si no existe coincidencia local. La propuesta no es
            una resolución fiscal, usa únicamente fuentes verificadas
            suministradas por la aplicación y queda pendiente de revisión.
          </p>
          <div className="mt-4">
            <AiProcessingConsentNotice
              accepted={aiConsent.accepted}
              onAccepted={aiConsent.accept}
              compact
              contextNote="En el Consultor fiscal se ejecutan primero las reglas locales y, si no hay coincidencia, solo se envían hechos mínimos redactados y las fuentes verificadas que puede citar el modelo."
            />
          </div>
        </Card>
      ) : null}

      <FiscalProfileSetupCard
        businessProfile={data.profile}
        onSave={(fiscalProfile) =>
          updateProfile({ ...data.profile, fiscalProfile })
        }
      />

      {fiscalContextPreview.warnings.length > 0 ? (
        <div
          role="alert"
          className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm leading-6 text-amber-950"
        >
          <p className="font-bold">Revisa el contexto fiscal</p>
          {fiscalContextPreview.warnings.map((warning) => (
            <p key={warning}>{warning}</p>
          ))}
        </div>
      ) : null}

      <Card>
        <form
          id="gasto-a-analizar"
          className="space-y-6"
          onSubmit={(event) => {
            event.preventDefault();
            handleInitialAnalyze();
          }}
        >
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
              <BadgeEuro className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-xl font-bold text-slate-950">Datos del gasto</h2>
              <p className="text-sm text-slate-500">Los importes se calculan en céntimos enteros.</p>
            </div>
          </div>

          <Field
            label="Gasto registrado"
            hint="Opcional. Selecciona un gasto existente o usa la entrada manual."
          >
            <Select
              value={selectedExpenseId}
              onChange={(event) => selectExpense(event.target.value)}
              disabled={!ready}
            >
              <option value="">Entrada manual</option>
              {existingExpenses.map((expense) => (
                <option key={expense.id} value={expense.id}>
                  {expense.date} · {expense.supplierName || expense.description || "Sin concepto"}
                </option>
              ))}
            </Select>
          </Field>

          {existingExpenseAdaptation?.status !== "READY" &&
          existingExpenseAdaptation ? (
            <div
              role="alert"
              className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950"
            >
              <p className="font-bold">Este gasto todavía no puede analizarse</p>
              {existingExpenseAdaptation.missingInformation.map((item) => (
                <p key={item}>{item}</p>
              ))}
              {existingExpenseAdaptation.warnings.map((warning) => (
                <p key={warning}>{warning}</p>
              ))}
            </div>
          ) : null}

          {existingExpenseAdaptation?.status === "READY" &&
          existingExpenseAdaptation.warnings.length > 0 ? (
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-950">
              {existingExpenseAdaptation.warnings.map((warning) => (
                <p key={warning}>{warning}</p>
              ))}
            </div>
          ) : null}

          {data.profile.fiscalProfile?.setupStatus === "CONFIGURED" &&
          data.profile.fiscalProfile.activities.length > 1 ? (
            <Field
              label="Actividad relacionada con este gasto"
              hint="Elige una de las actividades guardadas en el perfil fiscal."
            >
              <Select
                value={selectedActivityIndex}
                onChange={(event) => selectActivity(Number(event.target.value))}
              >
                {data.profile.fiscalProfile.activities.map((activity, index) => (
                  <option key={`${activity.code ?? "activity"}-${index}`} value={index}>
                    {activity.code ? `${activity.code} · ` : ""}
                    {activity.description || `Actividad ${index + 1}`}
                  </option>
                ))}
              </Select>
            </Field>
          ) : null}

          <div className="grid gap-5 md:grid-cols-2">
            <Field label="Concepto del gasto">
              <Input
                value={form.concept}
                onChange={(event) => setField("concept", event.target.value)}
                placeholder="Ej.: comida cliente, gasolina, peaje…"
                maxLength={240}
                required
                disabled={usingExistingExpense}
              />
            </Field>
            <Field label="Fecha">
              <Input
                type="date"
                value={form.expenseDate}
                onChange={(event) => setField("expenseDate", event.target.value)}
                required
                disabled={usingExistingExpense}
              />
            </Field>
            <Field label="Proveedor" hint="Opcional">
              <Input
                value={form.supplierName}
                onChange={(event) => setField("supplierName", event.target.value)}
                maxLength={160}
                disabled={usingExistingExpense}
              />
            </Field>
            <Field label="Medio de pago">
              <Select
                value={form.paymentMethod}
                disabled={usingExistingExpense}
                onChange={(event) =>
                  setField(
                    "paymentMethod",
                    event.target.value as FormState["paymentMethod"],
                  )
                }
              >
                <option value="UNKNOWN">Desconocido</option>
                <option value="CARD">Tarjeta</option>
                <option value="BANK_TRANSFER">Transferencia bancaria</option>
                <option value="DIRECT_DEBIT">Domiciliación</option>
                <option value="CASH">Efectivo</option>
                <option value="OTHER">Otro</option>
              </Select>
            </Field>
            <Field label="Tipo de justificante">
              <Select
                value={form.invoiceType}
                disabled={usingExistingExpense}
                onChange={(event) =>
                  setField(
                    "invoiceType",
                    event.target.value as FormState["invoiceType"],
                  )
                }
              >
                <option value="UNKNOWN">Desconocido</option>
                <option value="FULL_INVOICE">Factura completa</option>
                <option value="SIMPLIFIED_INVOICE">Factura simplificada</option>
                <option value="RECEIPT">Recibo o ticket</option>
                <option value="NO_DOCUMENT">Sin documento</option>
              </Select>
            </Field>
          </div>

          {!usingExistingExpense ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={calculateAmounts}
                  onChange={(event) => toggleAmountCalculation(event.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-slate-300"
                />
                <span>
                  <span className="block font-semibold text-slate-900">
                    También quiero calcular cuánto podría deducirme
                  </span>
                  <span className="mt-1 block text-xs leading-5 text-slate-500">
                    Si solo quieres una orientación inicial, no necesitas indicar
                    base, IVA ni total ahora.
                  </span>
                </span>
              </label>
            </div>
          ) : null}

          {usingExistingExpense || calculateAmounts ? (
            <div className="grid gap-5 md:grid-cols-3">
              <Field label="Base imponible">
                <Input
                  type="text"
                  inputMode="decimal"
                  value={form.netAmount}
                  onChange={(event) => setField("netAmount", event.target.value)}
                  placeholder="0,00"
                  maxLength={16}
                  required
                  disabled={usingExistingExpense}
                />
              </Field>
              <Field label="IVA">
                <Input
                  type="text"
                  inputMode="decimal"
                  value={form.vatAmount}
                  onChange={(event) => setField("vatAmount", event.target.value)}
                  placeholder="0,00"
                  maxLength={16}
                  required
                  disabled={usingExistingExpense}
                />
              </Field>
              <Field label="Total">
                <Input
                  type="text"
                  inputMode="decimal"
                  value={form.totalAmount}
                  onChange={(event) => setField("totalAmount", event.target.value)}
                  placeholder="0,00"
                  maxLength={16}
                  required
                  disabled={usingExistingExpense}
                />
              </Field>
            </div>
          ) : null}

          {error ? (
            <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-800">
              {error}
            </div>
          ) : null}

          <Button
            type="submit"
            disabled={loading || !ready || selectedExpenseBlocked}
          >
            {loading ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> : null}
            {loading ? "Analizando…" : "Analizar gasto"}
          </Button>
        </form>
      </Card>

      {visibleQuestionCatalog.length > 0 ? (
        <ConditionalQuestions
          questions={visibleQuestionCatalog}
          answers={answers}
          drafts={drafts}
          loading={loading}
          onImmediateAnswer={immediateAnswer}
          onDraftChange={changeDraft}
          onSubmitDrafts={submitDraftAnswers}
          onBack={() =>
            document
              .getElementById("gasto-a-analizar")
              ?.scrollIntoView({ behavior: "smooth", block: "start" })
          }
        />
      ) : null}

      {result ? <EvaluationResultPanel result={result} /> : null}
    </div>
  );
}
