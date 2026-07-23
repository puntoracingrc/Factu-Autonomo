import { createElement } from "react";
import type { CloudRepairCountComparison } from "@/lib/cloud/device-repair-preview";

export function CloudRepairPreviewModalTable(props: {
  counts: readonly CloudRepairCountComparison[];
}) {
  return createElement(
    "div",
    { className: "mt-4" },
    createElement(
      "div",
      { className: "space-y-2 md:hidden" },
      props.counts.map((entry) =>
        createElement(
          "div",
          {
            key: entry.key,
            className: `rounded-lg border px-3 py-2.5 ${
              entry.reduction
                ? "border-red-200 bg-red-50 text-red-950"
                : "border-slate-200 bg-white text-slate-700"
            }`,
          },
          createElement(
            "div",
            { className: "flex min-w-0 items-start justify-between gap-3" },
            createElement(
              "div",
              { className: "min-w-0" },
              createElement(
                "p",
                { className: "break-words font-semibold" },
                entry.label,
              ),
              entry.delta !== 0
                ? createElement(
                    "p",
                    { className: "mt-0.5 text-xs leading-5" },
                    entry.delta < 0
                      ? `${Math.abs(entry.delta)} menos en la nube`
                      : `${entry.delta} más en la nube`,
                  )
                : null,
            ),
            createElement(
              "div",
              {
                className:
                  "grid shrink-0 grid-cols-2 gap-x-3 text-right tabular-nums",
              },
              createElement(
                "span",
                {
                  className:
                    "text-[0.68rem] font-semibold uppercase leading-4 text-slate-500",
                },
                "Disp.",
              ),
              createElement(
                "span",
                {
                  className:
                    "text-[0.68rem] font-semibold uppercase leading-4 text-slate-500",
                },
                "Nube",
              ),
              createElement("span", { className: "text-sm" }, entry.local),
              createElement(
                "span",
                { className: "text-sm font-semibold" },
                entry.cloud,
              ),
            ),
          ),
        ),
      ),
    ),
    createElement(
      "div",
      { className: "hidden overflow-x-auto md:block" },
      createElement(
        "table",
        { className: "w-full table-fixed border-collapse text-sm" },
        createElement(
          "caption",
          { className: "sr-only" },
          "Comparación de cantidades",
        ),
        createElement(
          "colgroup",
          null,
          createElement("col"),
          createElement("col", { className: "w-[4.5rem]" }),
          createElement("col", { className: "w-[4.5rem]" }),
        ),
        createElement(
          "thead",
          null,
          createElement(
            "tr",
            {
              className:
                "border-b border-slate-200 text-xs font-semibold text-slate-500",
            },
            createElement(
              "th",
              { scope: "col", className: "px-2 pb-2 text-left" },
              "Contenido",
            ),
            createElement(
              "th",
              { scope: "col", className: "px-2 pb-2 text-right" },
              "Dispositivo",
            ),
            createElement(
              "th",
              { scope: "col", className: "px-2 pb-2 text-right" },
              "Nube",
            ),
          ),
        ),
        createElement(
          "tbody",
          { className: "divide-y divide-slate-100" },
          props.counts.map((entry) =>
            createElement(
              "tr",
              {
                key: entry.key,
                className: entry.reduction
                  ? "bg-red-50 text-red-950"
                  : "text-slate-700",
              },
              createElement(
                "th",
                {
                  scope: "row",
                  className: "min-w-0 px-2 py-2.5 text-left",
                },
                createElement(
                  "span",
                  { className: "font-medium" },
                  entry.label,
                ),
                entry.delta !== 0
                  ? createElement(
                      "span",
                      { className: "block text-xs font-normal" },
                      entry.delta < 0
                        ? `${Math.abs(entry.delta)} menos en la nube`
                        : `${entry.delta} más en la nube`,
                    )
                  : null,
              ),
              createElement(
                "td",
                { className: "px-2 py-2.5 text-right tabular-nums" },
                entry.local,
              ),
              createElement(
                "td",
                {
                  className:
                    "px-2 py-2.5 text-right font-semibold tabular-nums",
                },
                entry.cloud,
              ),
            ),
          ),
        ),
      ),
    ),
  );
}
