import { Button } from "@/components/ui/Button";
import { Input, Select, Textarea } from "@/components/ui/Field";
import type {
  AnswerValue,
  ConditionalQuestion,
  ExpenseAnswers,
} from "@/lib/tax-engine";

function booleanValue(value: AnswerValue | undefined): string {
  return value === true ? "true" : value === false ? "false" : "";
}

export function ConditionalQuestions({
  questions,
  answers,
  drafts,
  loading,
  onImmediateAnswer,
  onDraftChange,
  onSubmitDrafts,
  onBack,
}: {
  questions: readonly ConditionalQuestion[];
  answers: ExpenseAnswers;
  drafts: Readonly<Record<string, string>>;
  loading: boolean;
  onImmediateAnswer: (id: string, value: AnswerValue) => void;
  onDraftChange: (id: string, value: string) => void;
  onSubmitDrafts: () => void;
  onBack: () => void;
}) {
  return (
    <section
      aria-labelledby="preguntas-condicionales"
      aria-busy={loading}
      className="rounded-2xl border border-blue-200 bg-blue-50/60 p-5 dark:border-blue-900 dark:bg-blue-950/25"
    >
      <h2 id="preguntas-condicionales" className="text-xl font-bold text-slate-950">
        Completa el análisis
      </h2>
      <p className="mt-1 text-sm text-slate-600">
        Tus respuestas se conservan. Puedes cambiar cualquiera y volver a
        ejecutar el motor sin perder los datos del gasto.
      </p>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        {questions.map((question) => {
          const value = answers[question.id];
          if (question.type === "BOOLEAN") {
            return (
              <fieldset key={question.id} className="rounded-xl border border-blue-100 bg-white p-4">
                <legend className="px-1 text-sm font-semibold text-slate-800">
                  {question.prompt}
                </legend>
                <div className="mt-3 flex flex-wrap gap-4">
                  {[
                    { label: "Sí", value: "true" },
                    { label: "No", value: "false" },
                  ].map((option) => (
                    <label key={option.value} className="flex min-h-11 items-center gap-2 rounded-xl px-2 text-sm font-semibold text-slate-700">
                      <input
                        type="radio"
                        name={question.id}
                        value={option.value}
                        checked={booleanValue(value) === option.value}
                        disabled={loading}
                        onChange={() =>
                          onImmediateAnswer(question.id, option.value === "true")
                        }
                        className="h-5 w-5 accent-blue-600"
                      />
                      {option.label}
                    </label>
                  ))}
                </div>
                {question.helpText ? (
                  <p className="mt-2 text-xs text-slate-500">{question.helpText}</p>
                ) : null}
              </fieldset>
            );
          }

          if (question.type === "SINGLE_CHOICE") {
            return (
              <label key={question.id} className="flex flex-col gap-2">
                <span className="text-sm font-semibold text-slate-800">
                  {question.prompt}
                </span>
                <Select
                  value={typeof value === "string" ? value : ""}
                  disabled={loading}
                  onChange={(event) =>
                    onImmediateAnswer(question.id, event.target.value)
                  }
                >
                  <option value="">Selecciona una opción</option>
                  {question.options?.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
                {question.helpText ? (
                  <span className="text-xs text-slate-500">{question.helpText}</span>
                ) : null}
              </label>
            );
          }

          const draft =
            drafts[question.id] ??
            (typeof value === "number" || typeof value === "string"
              ? String(value)
              : "");
          return (
            <label key={question.id} className="flex flex-col gap-2">
              <span className="text-sm font-semibold text-slate-800">
                {question.prompt}
              </span>
              {question.type === "TEXT" ? (
                <Textarea
                  value={draft}
                  disabled={loading}
                  onChange={(event) =>
                    onDraftChange(question.id, event.target.value)
                  }
                  maxLength={1_000}
                />
              ) : (
                <Input
                  type="text"
                  inputMode={question.type === "PERCENTAGE" ? "numeric" : "decimal"}
                  placeholder={question.type === "PERCENTAGE" ? "0–100" : "0,00"}
                  value={draft}
                  disabled={loading}
                  maxLength={question.type === "PERCENTAGE" ? 3 : 16}
                  onChange={(event) =>
                    onDraftChange(question.id, event.target.value)
                  }
                />
              )}
              {question.helpText ? (
                <span className="text-xs text-slate-500">{question.helpText}</span>
              ) : null}
            </label>
          );
        })}
      </div>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <Button type="button" onClick={onSubmitDrafts} disabled={loading}>
          {loading ? "Actualizando…" : "Actualizar análisis"}
        </Button>
        <Button type="button" variant="secondary" onClick={onBack}>
          Volver a los datos del gasto
        </Button>
      </div>
    </section>
  );
}
