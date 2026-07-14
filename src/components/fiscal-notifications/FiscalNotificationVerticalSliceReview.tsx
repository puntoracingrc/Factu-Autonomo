import { createElement } from "react";
import type {
  FiscalNotificationVerticalSliceReviewFieldV1,
  FiscalNotificationVerticalSliceReviewV1,
} from "@/lib/fiscal-notifications/vertical-slice-review.v1";

export interface FiscalNotificationVerticalSliceReviewProps {
  readonly review: FiscalNotificationVerticalSliceReviewV1;
}

const h = createElement;

export function FiscalNotificationVerticalSliceReview({
  review,
}: FiscalNotificationVerticalSliceReviewProps) {
  if (review.status !== "REVIEW_REQUIRED" || review.documents.length === 0) {
    return null;
  }

  return h(
    "section",
    {
      className: "mt-5 space-y-4",
      "aria-labelledby": "notification-extracted-documents-heading",
    },
    h(
      "div",
      null,
      h(
        "h3",
        {
          id: "notification-extracted-documents-heading",
          className: "text-lg font-bold text-slate-950",
        },
        "Datos leídos del documento",
      ),
      h(
        "p",
        { className: "mt-1 text-sm leading-6 text-slate-600" },
        review.documents.length === 1
          ? "El tipo y los campos siguientes coinciden con una estructura documental cubierta."
          : `El PDF contiene ${review.documents.length} actos diferenciados; se muestran por separado.`,
      ),
    ),
    review.documents.map((document) =>
      h(
        "article",
        {
          key: document.reviewDocumentId,
          className:
            "overflow-hidden rounded-2xl border border-emerald-200 bg-white",
          "aria-labelledby": `notification-${document.extractorId}-heading`,
        },
        h(
          "header",
          {
            className:
              "border-b border-emerald-100 bg-emerald-50 p-4 sm:p-5",
          },
          h(
            "div",
            {
              className:
                "flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between",
            },
            h(
              "div",
              null,
              h(
                "p",
                {
                  className:
                    "text-xs font-bold uppercase tracking-wide text-emerald-800",
                },
                "Tipo de documento",
              ),
              h(
                "h4",
                {
                  id: `notification-${document.extractorId}-heading`,
                  className: "mt-1 text-xl font-bold text-emerald-950",
                },
                document.title,
              ),
              h(
                "p",
                {
                  className:
                    "mt-1 text-sm font-semibold text-emerald-900",
                },
                document.subtitle,
              ),
            ),
            h(
              "span",
              {
                className:
                  "inline-flex w-fit rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-950",
              },
              "Documento reconocido",
            ),
          ),
          h(
            "p",
            {
              className: "mt-3 text-xs font-semibold text-emerald-900",
            },
            pageRangeLabel(document.pageFrom, document.pageTo),
          ),
        ),
        h(
          "dl",
          {
            className:
              "grid gap-3 p-4 sm:grid-cols-2 sm:p-5 lg:grid-cols-3",
          },
          document.fields.map((field) =>
            h(ExtractedField, { key: field.fieldId, field }),
          ),
        ),
      ),
    ),
    h(
      "p",
      {
        className:
          "rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm leading-6 text-blue-950",
      },
      "Se muestran los valores impresos que el lector ha localizado y la página de la que proceden. Revisa los datos antes de utilizarlos: verlos no crea una deuda, un pago, un plazo, un gasto ni un asiento.",
    ),
  );
}

function ExtractedField({
  field,
}: {
  readonly field: FiscalNotificationVerticalSliceReviewFieldV1;
}) {
  const emphasized =
    field.semantic === "MONEY" ||
    field.semantic === "STATUS" ||
    field.semantic === "REFERENCE";
  const value =
    field.semantic === "DATE" &&
    field.normalizedValue &&
    /^\d{4}-\d{2}-\d{2}$/u.test(field.normalizedValue)
      ? h("time", { dateTime: field.normalizedValue }, field.displayValue)
      : field.displayValue;

  return h(
    "div",
    {
      className: `rounded-xl border p-4 ${
        emphasized
          ? "border-blue-100 bg-blue-50"
          : "border-slate-200 bg-slate-50"
      }`,
    },
    h(
      "dt",
      {
        className:
          "text-xs font-bold uppercase tracking-wide text-slate-500",
      },
      field.label,
    ),
    h(
      "dd",
      {
        className: `mt-1 break-words text-slate-950 ${
          field.semantic === "MONEY" ? "text-lg font-bold" : "font-semibold"
        }`,
      },
      value,
    ),
    h(
      "dd",
      { className: "mt-2 text-xs font-semibold text-slate-500" },
      `${pagesLabel(field.sourcePageNumbers)} · según el documento`,
    ),
  );
}

function pageRangeLabel(pageFrom: number, pageTo: number): string {
  return pageFrom === pageTo
    ? `Página ${pageFrom}`
    : `Páginas ${pageFrom}–${pageTo}`;
}

function pagesLabel(pageNumbers: readonly number[]): string {
  return `${pageNumbers.length === 1 ? "Página" : "Páginas"} ${pageNumbers.join(
    ", ",
  )}`;
}
