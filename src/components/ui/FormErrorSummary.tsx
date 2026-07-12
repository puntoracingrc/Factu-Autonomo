"use client";

import { forwardRef, useId } from "react";

export interface FormErrorItem {
  fieldId: string;
  message: string;
}

interface FormErrorSummaryProps {
  errors: FormErrorItem[];
  title?: string;
}

export const FormErrorSummary = forwardRef<
  HTMLDivElement,
  FormErrorSummaryProps
>(function FormErrorSummary(
  { errors, title = "Revisa estos datos antes de continuar" },
  ref,
) {
  const titleId = useId();

  if (errors.length === 0) return null;

  return (
    <div
      ref={ref}
      tabIndex={-1}
      role="alert"
      aria-labelledby={titleId}
      className="rounded-2xl border border-red-300 bg-red-50 p-4 text-sm text-red-950 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 dark:border-red-900/70 dark:bg-red-950/45 dark:text-red-100"
    >
      <p id={titleId} className="font-black">
        {title}
      </p>
      <ul className="mt-2 list-disc space-y-1 pl-5">
        {errors.map((error) => (
          <li key={`${error.fieldId}:${error.message}`}>
            <button
              type="button"
              className="text-left font-semibold underline decoration-red-400 underline-offset-2"
              onClick={() => document.getElementById(error.fieldId)?.focus()}
            >
              {error.message}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
});

export function FieldError({ id, error }: { id: string; error?: string }) {
  if (!error) return null;

  return (
    <span id={id} className="text-sm font-semibold text-red-700 dark:text-red-300">
      {error}
    </span>
  );
}
