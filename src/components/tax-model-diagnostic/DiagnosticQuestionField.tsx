import type {
  DiagnosticQuestion,
  TaxpayerProfile,
} from "@/lib/tax-model-diagnostic/contracts";
import { Input } from "@/components/ui/Field";

type QuestionValue = TaxpayerProfile[keyof TaxpayerProfile];

export function DiagnosticQuestionField({
  question,
  profile,
  completed,
  onAnswer,
}: {
  question: DiagnosticQuestion;
  profile: TaxpayerProfile;
  completed: boolean;
  onAnswer: (value: QuestionValue) => void;
}) {
  const value = profile[question.field];

  return (
    <fieldset className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:p-5">
      <legend className="px-1 text-base font-bold text-slate-950 dark:text-white">
        {question.label}
      </legend>
      <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
        {question.explanation}
      </p>

      {question.kind === "CHOICE" && (
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {question.options?.map((option) => {
            const optionValue =
              question.field === "fiscalYear"
                ? Number(option.value)
                : option.value;
            const checked = value === optionValue;
            return (
              <label
                key={option.value}
                className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-sm font-semibold transition-colors focus-within:ring-2 focus-within:ring-blue-500 ${
                  checked
                    ? "border-blue-500 bg-blue-50 text-blue-950 dark:bg-blue-950/40 dark:text-blue-100"
                    : "border-slate-200 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                }`}
              >
                <input
                  type="radio"
                  name={question.questionId}
                  value={option.value}
                  checked={checked}
                  onChange={() => onAnswer(optionValue as QuestionValue)}
                  className="h-4 w-4 accent-blue-600"
                />
                {option.label}
              </label>
            );
          })}
        </div>
      )}

      {question.kind === "FOUR_WAY" && (
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {question.options?.map((option) => {
            const checked = value === option.value;
            return (
              <label
                key={option.value}
                className={`flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-xl border px-3 py-2 text-center text-sm font-bold focus-within:ring-2 focus-within:ring-blue-500 ${
                  checked
                    ? "border-blue-500 bg-blue-600 text-white"
                    : "border-slate-200 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                }`}
              >
                <input
                  type="radio"
                  name={question.questionId}
                  value={option.value}
                  checked={checked}
                  onChange={() => onAnswer(option.value as QuestionValue)}
                  className="sr-only"
                />
                {option.label}
              </label>
            );
          })}
        </div>
      )}

      {question.kind === "MULTI_CHOICE" && (
        <div className="mt-4">
          <div className="grid gap-2 sm:grid-cols-2">
            {question.options?.map((option) => {
            const selected = Array.isArray(value) && value.includes(option.value as never);
            return (
              <label
                key={option.value}
                className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-sm font-semibold focus-within:ring-2 focus-within:ring-blue-500 ${
                  selected
                    ? "border-blue-500 bg-blue-50 text-blue-950 dark:bg-blue-950/40 dark:text-blue-100"
                    : "border-slate-200 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                }`}
              >
                <input
                  type="checkbox"
                  checked={selected}
                  onChange={(event) => {
                    const current = Array.isArray(value)
                      ? value.map((item) => String(item))
                      : [];
                    onAnswer(
                      (event.target.checked
                        ? [...new Set([...current, option.value])]
                        : current.filter((item) => item !== option.value)) as QuestionValue,
                    );
                  }}
                  className="h-4 w-4 rounded accent-blue-600"
                />
                {option.label}
              </label>
            );
            })}
          </div>
          {question.field === "censusObligations" && (
            <button
              type="button"
              onClick={() => onAnswer([])}
              className="mt-3 min-h-11 rounded-xl border border-slate-300 px-4 text-sm font-bold text-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 dark:border-slate-600 dark:text-slate-200"
            >
              Confirmo que no figura ninguna de estas obligaciones
            </button>
          )}
        </div>
      )}

      {question.kind === "DATE" && (
        <div className="mt-4 max-w-sm">
          <Input
            type="date"
            value={typeof value === "string" ? value : ""}
            onChange={(event) => onAnswer(event.target.value || null)}
            aria-label={question.label}
          />
        </div>
      )}

      {question.kind === "PERCENTAGE" && (
        <div className="mt-4 max-w-sm">
          <div className="relative">
            <Input
              type="number"
              inputMode="decimal"
              min={0}
              max={100}
              step="0.01"
              value={typeof value === "number" ? value : ""}
              onChange={(event) =>
                onAnswer(
                  event.target.value === ""
                    ? null
                    : Math.min(100, Math.max(0, Number(event.target.value))),
                )
              }
              aria-label={question.label}
              className="pr-10"
            />
            <span className="pointer-events-none absolute right-4 top-3 text-slate-500">
              %
            </span>
          </div>
        </div>
      )}

      <details className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-sm dark:bg-slate-800">
        <summary className="cursor-pointer font-semibold text-blue-700 dark:text-blue-300">
          Por qué lo preguntamos y qué documento ayuda
        </summary>
        <div className="mt-3 space-y-2 leading-6 text-slate-600 dark:text-slate-300">
          <p><strong>Por qué:</strong> {question.why}</p>
          <p><strong>Ejemplo:</strong> {question.example}</p>
          <p><strong>Documento útil:</strong> {question.supportingDocument}</p>
          <p><strong>Modelos relacionados:</strong> {question.affectedModels.join(", ")}</p>
          {question.applicability && <p><strong>Cuándo aplica:</strong> {question.applicability}</p>}
        </div>
      </details>

      <p className="mt-3 text-xs font-semibold text-slate-500" aria-live="polite">
        {completed ? "Respuesta guardada" : "Pendiente de responder"}
      </p>
    </fieldset>
  );
}
