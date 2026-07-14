import { createElement } from "react";
import type { PartyFactsReviewViewModelV1 } from "@/lib/fiscal-notifications/party-facts-review-view-model.v1";

export interface FiscalNotificationPartyFactsReviewProps {
  readonly viewModel: PartyFactsReviewViewModelV1;
}

const h = createElement;

export function FiscalNotificationPartyFactsReview({
  viewModel,
}: FiscalNotificationPartyFactsReviewProps) {
  if (viewModel.state !== "FACTS" || viewModel.subject === null) {
    return h(
      "section",
      {
        className: "mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4",
        "aria-labelledby": "notification-party-facts-heading",
      },
      h(
        "div",
        { className: "flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between" },
        h(
          "h3",
          { id: "notification-party-facts-heading", className: "font-bold text-amber-950" },
          "Persona o entidad identificada",
        ),
        h(
          "span",
          { className: "inline-flex w-fit rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-900" },
          viewModel.stateLabel,
        ),
      ),
      h("p", { className: "mt-2 text-sm leading-6 text-amber-900" }, viewModel.summary),
    );
  }

  const subject = viewModel.subject;
  return h(
    "section",
    {
      className: "mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4",
      "aria-labelledby": "notification-party-facts-heading",
    },
    h(
      "div",
      { className: "flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between" },
      h(
        "div",
        null,
        h(
          "h3",
          { id: "notification-party-facts-heading", className: "font-bold text-emerald-950" },
          "Persona o entidad identificada",
        ),
        h("p", { className: "mt-1 text-sm leading-6 text-emerald-900" }, viewModel.summary),
      ),
      h(
        "span",
        { className: "inline-flex w-fit rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-950" },
        viewModel.stateLabel,
      ),
    ),
    h(
      "div",
      { className: "mt-4 rounded-xl border border-emerald-100 bg-white p-4" },
      h(
        "p",
        { className: "text-xs font-bold uppercase tracking-wide text-emerald-700" },
        subject.roleLabel,
      ),
      h(
        "dl",
        { className: "mt-3 grid gap-3 sm:grid-cols-2" },
        h(
          "div",
          null,
          h("dt", { className: "text-xs font-bold uppercase tracking-wide text-slate-500" }, subject.nameLabel),
          h("dd", { className: "mt-1 break-words text-lg font-bold text-slate-950" }, subject.printedName),
        ),
        h(
          "div",
          null,
          h("dt", { className: "text-xs font-bold uppercase tracking-wide text-slate-500" }, subject.taxIdLabel),
          h("dd", { className: "mt-1 break-words text-lg font-bold text-slate-950" }, subject.printedTaxId),
        ),
      ),
      h(
        "p",
        { className: "mt-3 text-xs font-semibold text-slate-500" },
        `${occurrenceLabel(subject.occurrenceCount)} · ${pagesLabel(subject.pageNumbers)}`,
      ),
    ),
    h(
      "div",
      { className: "mt-4 rounded-xl border border-emerald-100 bg-white p-4" },
      h("h4", { className: "font-bold text-slate-950" }, "Qué significa esta identificación"),
      h(
        "ul",
        { className: "mt-2 list-disc space-y-1 pl-5 text-sm leading-6 text-slate-700" },
        viewModel.warnings.map((warning) => h("li", { key: warning }, warning)),
      ),
    ),
    h("p", { className: "mt-3 text-xs leading-5 text-emerald-900" }, viewModel.ephemeralNotice),
  );
}

function occurrenceLabel(value: number): string {
  return `${value} ${value === 1 ? "aparición" : "apariciones"}`;
}

function pagesLabel(values: readonly number[]): string {
  return `${values.length === 1 ? "Página" : "Páginas"} ${values.join(", ")}`;
}
