import { createElement } from "react";
import type { ExplicitFieldsReviewViewModelV2 } from "@/lib/fiscal-notifications/explicit-fields-review-view-model.v2";

export interface FiscalNotificationExplicitFieldsReviewProps {
  readonly viewModel: ExplicitFieldsReviewViewModelV2;
}

const h = createElement;

export function FiscalNotificationExplicitFieldsReview({
  viewModel,
}: FiscalNotificationExplicitFieldsReviewProps) {
  if (viewModel.state !== "FACTS") {
    return h(
      "section",
      {
        className:
          "mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4",
        "aria-labelledby": "notification-explicit-fields-heading",
      },
      h(
        "div",
        {
          className:
            "flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between",
        },
        h(
          "h3",
          {
            id: "notification-explicit-fields-heading",
            className: "font-bold text-amber-950",
          },
          "Referencias y fechas",
        ),
        h(
          "span",
          {
            className:
              "inline-flex w-fit rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-900",
          },
          viewModel.stateLabel,
        ),
      ),
      h(
        "p",
        { className: "mt-2 text-sm leading-6 text-amber-900" },
        viewModel.summary,
      ),
    );
  }

  return h(
    "section",
    {
      className: "mt-5 rounded-xl border border-blue-200 bg-blue-50 p-4",
      "aria-labelledby": "notification-explicit-fields-heading",
    },
    h(
      "div",
      {
        className:
          "flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between",
      },
      h(
        "div",
        null,
        h(
          "h3",
          {
            id: "notification-explicit-fields-heading",
            className: "font-bold text-blue-950",
          },
          "Referencias y fechas",
        ),
        h(
          "p",
          { className: "mt-1 text-sm leading-6 text-blue-900" },
          viewModel.summary,
        ),
      ),
      h(
        "span",
        {
          className:
            "inline-flex w-fit rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-950",
        },
        viewModel.stateLabel,
      ),
    ),
    viewModel.categories.length > 0
      ? h(
          "div",
          { className: "mt-4" },
          h(
            "h4",
            { className: "font-bold text-blue-950" },
            "Referencias detectadas",
          ),
          h(
            "p",
            { className: "mt-1 text-sm leading-6 text-blue-900" },
            "Mostramos el valor tal como se ha leído en el PDF. Es efímero, no se guarda y debe revisarse antes de confirmarlo.",
          ),
          h(
            "dl",
            { className: "mt-3 grid gap-3 sm:grid-cols-2" },
            viewModel.categories.map((category) =>
              h(
                "div",
                {
                  key: category.kind,
                  className:
                    "rounded-xl border border-blue-100 bg-white p-4",
                },
                h(
                  "dt",
                  {
                    className:
                      "text-xs font-bold uppercase tracking-wide text-slate-500",
                  },
                  category.label,
                ),
                h(
                  "dd",
                  {
                    className:
                      "mt-1 break-words font-bold text-slate-950",
                  },
                  category.printedValue,
                ),
                h(
                  "dd",
                  {
                    className:
                      "mt-1 text-xs font-semibold text-slate-500",
                  },
                  `${category.meaningLabel} · ${occurrenceLabel(category.occurrenceCount)} · ${pagesLabel(category.pageNumbers)}`,
                ),
              ),
            ),
          ),
        )
      : null,
    viewModel.dates.length > 0
      ? h(
          "div",
          { className: "mt-5" },
          h(
            "h4",
            { className: "font-bold text-blue-950" },
            "Fechas detectadas",
          ),
          h(
            "dl",
            { className: "mt-3 grid gap-3 sm:grid-cols-2" },
            viewModel.dates.map((date) =>
              h(
                "div",
                {
                  key: date.kind,
                  className:
                    "rounded-xl border border-blue-100 bg-white p-4",
                },
                h(
                  "dt",
                  {
                    className:
                      "text-xs font-bold uppercase tracking-wide text-slate-500",
                  },
                  date.label,
                ),
                h(
                  "dd",
                  {
                    className:
                      "mt-1 break-words text-lg font-bold text-slate-950",
                  },
                  h("time", { dateTime: date.dateTime }, date.printedValue),
                ),
                h(
                  "dd",
                  {
                    className:
                      "mt-1 text-xs font-semibold text-slate-500",
                  },
                  `${date.meaningLabel} · ${occurrenceLabel(date.occurrenceCount)} · ${pagesLabel(date.pageNumbers)}`,
                ),
              ),
            ),
          ),
        )
      : null,
    h(
      "div",
      { className: "mt-5 rounded-xl border border-blue-100 bg-white p-4" },
      h(
        "h4",
        { className: "font-bold text-slate-950" },
        "Límites de interpretación",
      ),
      h(
        "ul",
        {
          className:
            "mt-2 list-disc space-y-1 pl-5 text-sm leading-6 text-slate-700",
        },
        viewModel.warnings.map((warning) =>
          h("li", { key: warning }, warning),
        ),
      ),
    ),
    h(
      "p",
      { className: "mt-3 text-xs leading-5 text-blue-900" },
      viewModel.ephemeralNotice,
    ),
  );
}

function occurrenceLabel(value: number): string {
  return `${value} ${value === 1 ? "aparición" : "apariciones"}`;
}

function pagesLabel(values: readonly number[]): string {
  return `${values.length === 1 ? "Página" : "Páginas"} ${values.join(", ")}`;
}
