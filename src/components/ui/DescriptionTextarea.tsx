import { createElement, type TextareaHTMLAttributes } from "react";

/** Native content sizing, with a vertical resize handle in older browsers too. */
export function DescriptionTextarea({
  className = "",
  rows = 1,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return createElement("textarea", {
    rows,
    className:
      `min-h-12 min-w-0 w-full max-w-full resize-y rounded-xl border border-slate-200 bg-white px-4 py-3 text-base leading-6 text-slate-900 outline-none [field-sizing:content] [overflow-wrap:anywhere] focus:border-blue-500 focus:ring-2 focus:ring-blue-100 ${className}`.trim(),
    ...props,
  });
}
