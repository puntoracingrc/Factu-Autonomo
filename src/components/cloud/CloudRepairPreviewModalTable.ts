import { createElement } from "react";
import type { CloudRepairCountComparison } from "@/lib/cloud/device-repair-preview";

export function CloudRepairPreviewModalTable(props: {
  counts: readonly CloudRepairCountComparison[];
}) {
  return createElement(
    "div",
    { className: "mt-4 overflow-x-auto" },
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
              createElement("span", { className: "font-medium" }, entry.label),
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
                className: "px-2 py-2.5 text-right font-semibold tabular-nums",
              },
              entry.cloud,
            ),
          ),
        ),
      ),
    ),
  );
}
