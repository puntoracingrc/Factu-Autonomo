"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ClipboardCheck,
  RotateCcw,
  Save,
} from "lucide-react";
import { useAppStore } from "@/context/AppStore";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import type {
  Evidence,
  EvidenceValue,
  TaxModelDiagnosticSession,
  TaxpayerProfile,
} from "@/lib/tax-model-diagnostic/contracts";
import { evaluateTaxModelDiagnostic } from "@/lib/tax-model-diagnostic/engine";
import { buildTaxObligationsAssessment } from "@/lib/tax-obligations";
import {
  createTaxModelDiagnosticSession,
  normalizeTaxModelDiagnosticSession,
} from "@/lib/tax-model-diagnostic/profile";
import {
  DIAGNOSTIC_QUESTIONS,
  isQuestionApplicable,
  QUESTION_SECTIONS,
  questionsForSection,
} from "@/lib/tax-model-diagnostic/questions";
import { DiagnosticHaciendaReview } from "./DiagnosticHaciendaReview";
import { DiagnosticQuestionField } from "./DiagnosticQuestionField";
import { DiagnosticResults } from "./DiagnosticResults";

type QuestionValue = TaxpayerProfile[keyof TaxpayerProfile];

function evidenceValue(value: QuestionValue): EvidenceValue {
  if (Array.isArray(value)) {
    return value.map((item) => String(item));
  }
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean" ||
    value === null
  ) {
    return value;
  }
  return null;
}

function profileSummary(profile: TaxpayerProfile) {
  const territoryLabels: Record<TaxpayerProfile["territory"], string> = {
    UNKNOWN: "Sin indicar",
    ES_COMMON: "Territorio común AEAT",
    ES_CANARY: "Canarias",
    ES_NAVARRA: "Navarra",
    ES_BASQUE_ALAVA: "País Vasco · Álava",
    ES_BASQUE_BIZKAIA: "País Vasco · Bizkaia",
    ES_BASQUE_GIPUZKOA: "País Vasco · Gipuzkoa",
    ES_CEUTA: "Ceuta",
    ES_MELILLA: "Melilla",
    NON_RESIDENT: "No residente",
    UNCERTAIN: "Por concretar",
  };
  const subjectLabels: Record<TaxpayerProfile["invoicingSubject"], string> = {
    UNKNOWN: "Sin indicar",
    NATURAL_PERSON: "Persona física",
    COMPANY: "Sociedad",
    COMMUNITY_OF_PROPERTY: "Comunidad de bienes",
    CIVIL_PARTNERSHIP: "Sociedad civil",
    OTHER_ENTITY: "Otra entidad",
  };
  const roleLabels: Record<TaxpayerProfile["taxpayerRole"], string> = {
    UNKNOWN: "Sin indicar",
    INDIVIDUAL_SELF_EMPLOYED: "Autónomo individual",
    CORPORATE_SELF_EMPLOYED: "Autónomo societario",
    COLLABORATING_SELF_EMPLOYED: "Autónomo colaborador",
    PARTNER_OR_COMMUNITY_MEMBER: "Socio o comunero",
    DIRECTOR: "Administrador",
    SEVERAL: "Varias relaciones",
  };
  const activityLabels = {
    PROFESSIONAL: "Profesional",
    BUSINESS: "Empresarial",
    AGRICULTURE: "Agrícola",
    LIVESTOCK: "Ganadera",
    FORESTRY: "Forestal",
    OTHER: "Otra",
  } as const;
  const incomeTaxLabels: Record<TaxpayerProfile["incomeTaxRegime"], string> = {
    UNKNOWN: "Sin indicar",
    DIRECT_NORMAL: "Estimación directa normal",
    DIRECT_SIMPLIFIED: "Estimación directa simplificada",
    OBJECTIVE_ESTIMATION: "Estimación objetiva · módulos",
    ENTITY_ATTRIBUTION: "Atribución de rentas",
    NOT_APPLICABLE: "No aplicable",
  };
  const vatLabels = {
    GENERAL: "Régimen general",
    SIMPLIFIED: "Régimen simplificado",
    EQUIVALENCE_SURCHARGE: "Recargo de equivalencia",
    AGRICULTURE_LIVESTOCK_FISHING: "Agricultura, ganadería y pesca",
    CASH_ACCOUNTING: "Criterio de caja",
    EXEMPT: "Actividad exenta",
    NOT_SUBJECT: "Actividad no sujeta",
    OTHER_SPECIAL: "Otro régimen especial",
  } as const;
  return [
    ["Ejercicio", String(profile.fiscalYear)],
    ["Territorio", territoryLabels[profile.territory]],
    ["Quién factura", subjectLabels[profile.invoicingSubject]],
    ["Relación", roleLabels[profile.taxpayerRole]],
    [
      "Actividades",
      profile.activityKinds.map((kind) => activityLabels[kind]).join(", ") ||
        "Sin indicar",
    ],
    ["IRPF", incomeTaxLabels[profile.incomeTaxRegime]],
    [
      "IVA",
      profile.vatRegimes.map((regime) => vatLabels[regime]).join(", ") ||
        "Sin indicar",
    ],
  ] as const;
}

export function TaxModelDiagnosticWizard() {
  const { data, ready, updateProfile } = useAppStore();
  const firstQuestionRef = useRef<HTMLDivElement>(null);
  const [session, setSession] = useState<TaxModelDiagnosticSession | null>(
    null,
  );
  const [showReview, setShowReview] = useState(false);
  const [confirmedTruth, setConfirmedTruth] = useState(false);
  const [result, setResult] = useState<ReturnType<
    typeof evaluateTaxModelDiagnostic
  > | null>(null);

  useEffect(() => {
    if (!ready || session) return;
    const storedSession =
      normalizeTaxModelDiagnosticSession(data.profile.taxModelDiagnostic) ??
      createTaxModelDiagnosticSession(new Date().toISOString());
    setSession(storedSession);
    setResult(storedSession.lastResult ?? null);
  }, [data.profile.taxModelDiagnostic, ready, session]);

  const applicableQuestions = useMemo(
    () =>
      session
        ? DIAGNOSTIC_QUESTIONS.filter((question) =>
            isQuestionApplicable(question, session.profile),
          )
        : [],
    [session],
  );
  const completedCount = session
    ? applicableQuestions.filter((question) =>
        session.completedQuestionIds.includes(question.questionId),
      ).length
    : 0;
  const progress = applicableQuestions.length
    ? Math.round((completedCount / applicableQuestions.length) * 100)
    : 0;

  if (!ready || !session) {
    return (
      <Card
        role="status"
        className="animate-pulse text-slate-600 dark:bg-slate-900 dark:text-slate-300"
      >
        Cargando tu configuración fiscal…
      </Card>
    );
  }

  const activeSession = session;

  const sectionIndex = Math.max(
    0,
    QUESTION_SECTIONS.findIndex(
      (section) => section.sectionId === activeSession.currentSection,
    ),
  );
  const section = QUESTION_SECTIONS[sectionIndex];
  const sectionQuestions = questionsForSection(section.sectionId).filter(
    (question) => isQuestionApplicable(question, activeSession.profile),
  );

  function persist(next: TaxModelDiagnosticSession) {
    setSession(next);
    updateProfile({ ...data.profile, taxModelDiagnostic: next });
  }

  function updateAnswer(
    questionId: string,
    field: keyof TaxpayerProfile,
    value: QuestionValue,
  ) {
    const now = new Date().toISOString();
    const clearsEndDate =
      field === "activityStillActive" && value === "YES";
    const nextProfile = {
      ...activeSession.profile,
      [field]: value,
      ...(clearsEndDate ? { activityEndDate: null } : {}),
    } as TaxpayerProfile;
    const nextEvidence: Evidence = {
      evidenceId: `question:${questionId}`,
      type: "USER_ANSWER",
      field,
      value: evidenceValue(value),
      confidence: 1,
      extractionMethod: "MANUAL",
      userConfirmed: true,
      sourcePriority: 10,
    };
    persist({
      ...activeSession,
      profile: nextProfile,
      evidence: [
        ...activeSession.evidence.filter(
          (item) =>
            item.field !== field &&
            (!clearsEndDate || item.field !== "activityEndDate"),
        ),
        nextEvidence,
      ],
      completedQuestionIds: [
        ...new Set([
          ...activeSession.completedQuestionIds.filter(
            (completedQuestionId) =>
              !clearsEndDate || completedQuestionId !== "B_END_DATE",
          ),
          questionId,
        ]),
      ],
      updatedAt: now,
    });
    setResult(null);
    setConfirmedTruth(false);
  }

  function applyDocument(
    patch: Partial<TaxpayerProfile>,
    evidence: Evidence[],
    completedQuestionIds: string[],
  ) {
    const patchedFields = new Set(Object.keys(patch));
    persist({
      ...activeSession,
      profile: { ...activeSession.profile, ...patch },
      evidence: [
        ...activeSession.evidence.filter(
          (item) => !patchedFields.has(item.field),
        ),
        ...evidence,
      ],
      completedQuestionIds: [
        ...new Set([
          ...activeSession.completedQuestionIds,
          ...completedQuestionIds,
        ]),
      ],
      updatedAt: new Date().toISOString(),
    });
    setResult(null);
    setConfirmedTruth(false);
  }

  function goToSection(nextIndex: number) {
    const nextSection = QUESTION_SECTIONS[nextIndex];
    if (!nextSection) return;
    persist({
      ...activeSession,
      currentSection: nextSection.sectionId,
      updatedAt: new Date().toISOString(),
    });
    setShowReview(false);
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        firstQuestionRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
        firstQuestionRef.current?.focus({ preventScroll: true });
      });
    });
  }

  function generateResult() {
    if (!confirmedTruth) return;
    const generatedAt = new Date().toISOString();
    const nextResult = evaluateTaxModelDiagnostic(
      activeSession.profile,
      generatedAt,
    );
    const publishedAssessment = buildTaxObligationsAssessment(nextResult);
    setResult(nextResult);
    persist({
      ...activeSession,
      lastResult: nextResult,
      publishedAssessment,
      updatedAt: generatedAt,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function reset() {
    if (
      !window.confirm(
        "¿Borrar las respuestas del configurador y empezar de nuevo?",
      )
    ) {
      return;
    }
    const next = createTaxModelDiagnosticSession(new Date().toISOString());
    persist(next);
    setResult(null);
    setShowReview(false);
    setConfirmedTruth(false);
  }

  if (result) {
    return (
      <DiagnosticResults
        result={result}
        onEdit={() => {
          setResult(null);
          setShowReview(true);
          setConfirmedTruth(false);
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <header className="rounded-3xl bg-gradient-to-br from-blue-700 via-blue-600 to-cyan-600 p-6 text-white shadow-lg sm:p-8">
        <div className="flex items-start gap-4">
          <span className="rounded-2xl bg-white/15 p-3">
            <ClipboardCheck className="h-7 w-7" aria-hidden="true" />
          </span>
          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-blue-100">
              Primera opción de Asesoría Fiscal
            </p>
            <h1 className="mt-1 text-2xl font-extrabold sm:text-4xl">
              Configura tu tipo de autónomo y tus modelos
            </h1>
            <p className="mt-3 max-w-3xl leading-7 text-blue-50">
              Responde por bloques. «No lo sé» es una respuesta válida: el motor
              conservará la duda y te dirá qué falta, sin inventar una
              exclusión.
            </p>
          </div>
        </div>
        <div className="mt-6" aria-label={`Progreso: ${progress}%`}>
          <div className="flex justify-between text-sm font-semibold">
            <span>
              {completedCount} de {applicableQuestions.length} preguntas
              respondidas
            </span>
            <span>{progress}%</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/25">
            <div
              className="h-full rounded-full bg-white transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </header>

      <div className="flex justify-end print:hidden">
        <Button type="button" variant="ghost" onClick={reset}>
          <RotateCcw className="h-4 w-4" aria-hidden="true" /> Empezar de nuevo
        </Button>
      </div>

      <DiagnosticHaciendaReview
        currentProfile={activeSession.profile}
        onConfirm={applyDocument}
      />

      <nav
        aria-label="Secciones del configurador"
        className="overflow-x-auto rounded-2xl border border-slate-200 bg-white p-2 dark:border-slate-700 dark:bg-slate-900"
      >
        <div className="flex min-w-max gap-2">
          {QUESTION_SECTIONS.map((item, index) => {
            const active = !showReview && index === sectionIndex;
            const questions = questionsForSection(item.sectionId).filter(
              (question) =>
                isQuestionApplicable(question, activeSession.profile),
            );
            const done =
              questions.length > 0 &&
              questions.every((question) =>
                activeSession.completedQuestionIds.includes(
                  question.questionId,
                ),
              );
            return (
              <button
                key={item.sectionId}
                type="button"
                onClick={() => goToSection(index)}
                aria-current={active ? "step" : undefined}
                className={`inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-bold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 ${active ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"}`}
              >
                {done ? (
                  <Check className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <span>{item.sectionId}</span>
                )}
                {item.shortLabel}
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => setShowReview(true)}
            aria-current={showReview ? "step" : undefined}
            className={`inline-flex min-h-11 items-center rounded-xl px-3 text-sm font-bold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 ${showReview ? "bg-slate-950 text-white dark:bg-white dark:text-slate-950" : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"}`}
          >
            Revisar
          </button>
        </div>
      </nav>

      {!showReview ? (
        <section
          aria-labelledby={`section-${section.sectionId}`}
          className="space-y-4"
        >
          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-blue-700 dark:text-blue-300">
              Bloque {section.sectionId} de {QUESTION_SECTIONS.length}
            </p>
            <h2
              id={`section-${section.sectionId}`}
              className="mt-1 text-2xl font-bold text-slate-950 dark:text-white"
            >
              {section.title}
            </h2>
            <p className="mt-2 text-slate-600 dark:text-slate-300">
              {section.description}
            </p>
          </div>
          {sectionQuestions.map((question, questionIndex) => (
            <div
              key={question.questionId}
              ref={questionIndex === 0 ? firstQuestionRef : undefined}
              tabIndex={questionIndex === 0 ? -1 : undefined}
              className={questionIndex === 0 ? "scroll-mt-24 outline-none" : undefined}
            >
              <DiagnosticQuestionField
                question={question}
                profile={activeSession.profile}
                completed={activeSession.completedQuestionIds.includes(
                  question.questionId,
                )}
                documentValidated={activeSession.evidence.some(
                  (item) =>
                    item.field === question.field &&
                    item.userConfirmed &&
                    item.type !== "USER_ANSWER",
                )}
                onAnswer={(value) =>
                  updateAnswer(question.questionId, question.field, value)
                }
              />
            </div>
          ))}
          {sectionQuestions.length === 0 && (
            <Card className="dark:bg-slate-900 dark:text-slate-200">
              Este bloque no aplica según tus respuestas anteriores.
            </Card>
          )}
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
            <Button
              type="button"
              variant="secondary"
              disabled={sectionIndex === 0}
              onClick={() => goToSection(sectionIndex - 1)}
            >
              <ArrowLeft className="h-5 w-5" aria-hidden="true" /> Anterior
            </Button>
            {sectionIndex < QUESTION_SECTIONS.length - 1 ? (
              <Button
                type="button"
                onClick={() => goToSection(sectionIndex + 1)}
              >
                Guardar y continuar{" "}
                <ArrowRight className="h-5 w-5" aria-hidden="true" />
              </Button>
            ) : (
              <Button type="button" onClick={() => setShowReview(true)}>
                Revisar respuestas{" "}
                <ArrowRight className="h-5 w-5" aria-hidden="true" />
              </Button>
            )}
          </div>
        </section>
      ) : (
        <section aria-labelledby="revision-final" className="space-y-5">
          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-blue-700 dark:text-blue-300">
              Confirmación humana
            </p>
            <h2
              id="revision-final"
              className="mt-1 text-2xl font-bold text-slate-950 dark:text-white"
            >
              Revisa antes de generar el resultado
            </h2>
            <p className="mt-2 text-slate-600 dark:text-slate-300">
              Puedes generar con dudas pendientes; se mostrarán como información
              faltante o revisión, nunca como una exclusión automática.
            </p>
          </div>
          <Card className="dark:border-slate-700 dark:bg-slate-900">
            <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {profileSummary(activeSession.profile).map(([label, value]) => (
                <div key={label}>
                  <dt className="text-xs font-bold uppercase tracking-wide text-slate-500">
                    {label}
                  </dt>
                  <dd className="mt-1 font-semibold text-slate-950 dark:text-white">
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
          </Card>
          <div className="rounded-2xl border border-amber-300 bg-amber-50 p-5 dark:border-amber-900 dark:bg-amber-950/20">
            <label className="flex items-start gap-3 font-semibold text-amber-950 dark:text-amber-100">
              <input
                type="checkbox"
                checked={confirmedTruth}
                onChange={(event) => setConfirmedTruth(event.target.checked)}
                className="mt-1 h-5 w-5 accent-blue-600"
              />
              Confirmo que he revisado las respuestas y que reflejan mi
              situación del ejercicio elegido, incluidas las respuestas «No lo
              sé».
            </label>
            <p className="mt-3 text-sm leading-6 text-amber-900 dark:text-amber-200">
              El resultado es orientativo, no presenta declaraciones ni modifica
              tu censo. Las reglas siguen pendientes de revisión fiscal formal.
            </p>
          </div>
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowReview(false)}
            >
              <ArrowLeft className="h-5 w-5" aria-hidden="true" /> Volver al
              cuestionario
            </Button>
            <Button
              type="button"
              disabled={!confirmedTruth}
              onClick={generateResult}
            >
              <Save className="h-5 w-5" aria-hidden="true" /> Generar mis
              modelos
            </Button>
          </div>
        </section>
      )}
    </div>
  );
}
