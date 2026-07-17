import { createElement } from "react";
import type {
  FiscalNotificationVerticalSliceReviewDocumentV1,
  FiscalNotificationVerticalSliceReviewFieldV1,
  FiscalNotificationVerticalSliceReviewV1,
} from "@/lib/fiscal-notifications/vertical-slice-review.v1";
import {
  explainFiscalNotificationDocumentV2,
  type FiscalNotificationDocumentExplanationV2,
  type FiscalNotificationExplanationSectionIdV2,
} from "@/lib/fiscal-notifications/structured-document-explanation.v2";
import {
  AEAT_DOCUMENT_PROFILE_IDS_V1,
} from "@/lib/fiscal-notifications/knowledge/aeat-document-knowledge.v1";
import { projectProfileDrivenExplanationInputV2 } from "@/lib/fiscal-notifications/profile-driven-explanation-input.v2";
import { isAeatOfficialCatalogProfileIdV9 } from "@/lib/fiscal-notifications/knowledge/official-catalog-expansion.v9";
import { explainAeatOfficialCatalogDocumentV9 } from "@/lib/fiscal-notifications/official-catalog-explanation.v9";

export interface FiscalNotificationVerticalSliceReviewProps {
  readonly review: FiscalNotificationVerticalSliceReviewV1;
}

const h = createElement;
const PROFILE_IDS = new Set<string>(AEAT_DOCUMENT_PROFILE_IDS_V1);

const GUIDANCE_SECTIONS = Object.freeze([
  Object.freeze({ id: "WHAT_DOCUMENT_SAYS", label: "Qué es" }),
  Object.freeze({ id: "WHY_RECEIVED", label: "Por qué te llega" }),
  Object.freeze({
    id: "RESULT",
    label: "Qué ha ocurrido o qué resultado refleja",
  }),
  Object.freeze({ id: "KEY_DATA", label: "Datos clave detectados" }),
  Object.freeze({ id: "NEXT_STEP", label: "Qué revisar o hacer" }),
  Object.freeze({ id: "DEADLINE", label: "Cómo identificar el plazo" }),
  Object.freeze({ id: "CONSEQUENCE", label: "Qué puede pasar después" }),
  Object.freeze({ id: "NOT_PROVEN", label: "Qué no demuestra" }),
  Object.freeze({
    id: "RELATIONSHIPS",
    label: "Cómo encaja con otros documentos",
  }),
] as const satisfies readonly Readonly<{
  id: FiscalNotificationExplanationSectionIdV2;
  label: string;
}>[]);

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
        h(FamilyGuidance, { document }),
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
      "Se muestran los valores que el lector ha localizado y la página de la que proceden. Revisa los datos antes de utilizarlos: verlos no crea una deuda, un pago, un plazo, un gasto ni un asiento.",
    ),
  );
}

function FamilyGuidance({
  document,
}: {
  readonly document: FiscalNotificationVerticalSliceReviewDocumentV1;
}) {
  const explanation = resolveFamilyExplanation(document);
  if (!explanation) return null;

  const officialSources = explanation.officialSources.filter(
    (
      source,
    ): source is typeof source & { readonly canonicalUrl: string } =>
      source.canonicalUrl !== null &&
      source.authority !== "DOCUMENT" &&
      isOfficialHttpsUrl(source.canonicalUrl),
  );

  return h(
    "div",
    {
      className: "space-y-4 border-b border-slate-200 p-4 sm:p-5",
    },
    h(
      "div",
      null,
      h(
        "h5",
        { className: "text-base font-bold text-slate-950" },
        "Qué significa este documento",
      ),
      h(
        "p",
        { className: "mt-1 text-sm leading-6 text-slate-600" },
        "La explicación combina lo que identifica el documento con el conocimiento oficial que el motor ya tiene incorporado. Revisa siempre las fechas, importes e instrucciones de tu documento.",
      ),
    ),
    h(
      "dl",
      { className: "grid gap-3 md:grid-cols-2" },
      GUIDANCE_SECTIONS.map(({ id, label }) => {
        const section = explanation.sections.find(
          (candidate) => candidate.id === id,
        );
        if (!section) return null;
        return h(
          "div",
          {
            key: id,
            className: "rounded-xl border border-slate-200 bg-slate-50 p-4",
          },
          h(
            "dt",
            {
              className:
                "text-xs font-bold uppercase tracking-wide text-slate-500",
            },
            label,
          ),
          h(
            "dd",
            { className: "mt-2 space-y-2 text-sm leading-6 text-slate-800" },
            section.assertions.map((assertion) =>
              h("p", { key: assertion.code }, assertion.text),
            ),
          ),
        );
      }),
    ),
    officialSources.length > 0
      ? h(
          "div",
          {
            className:
              "rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm",
          },
          h(
            "h5",
            { className: "font-bold text-blue-950" },
            "Fuentes oficiales en las que se basa nuestro escáner",
          ),
          h(
            "ul",
            { className: "mt-2 space-y-2" },
            officialSources.map((source) =>
              h(
                "li",
                { key: source.id },
                h(
                  "a",
                  {
                    href: source.canonicalUrl,
                    target: "_blank",
                    rel: "noreferrer",
                    className:
                      "font-semibold text-blue-700 underline decoration-blue-300 underline-offset-2 hover:text-blue-900",
                  },
                  `${source.authority} · ${source.title}`,
                ),
              ),
            ),
          ),
          h(
            "p",
            { className: "mt-3 text-xs leading-5 text-blue-900" },
            "Estas fuentes ya forman parte del conocimiento local del motor. No se consulta internet durante el escaneo.",
          ),
        )
      : null,
  );
}

function resolveFamilyExplanation(
  document: FiscalNotificationVerticalSliceReviewDocumentV1,
): FiscalNotificationDocumentExplanationV2 | null {
  if (PROFILE_IDS.has(document.familyId)) {
    const input = projectProfileDrivenExplanationInputV2(document);
    return input ? explainFiscalNotificationDocumentV2(input) : null;
  }
  return isAeatOfficialCatalogProfileIdV9(document.familyId)
    ? explainAeatOfficialCatalogDocumentV9(document.familyId)
    : null;
}

function isOfficialHttpsUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      (url.hostname === "www.boe.es" ||
        url.hostname === "boe.es" ||
        url.hostname === "sede.agenciatributaria.gob.es" ||
        url.hostname === "agenciatributaria.gob.es" ||
        url.hostname === "www.agenciatributaria.es" ||
        url.hostname === "agenciatributaria.es" ||
        url.hostname === "clave.gob.es" ||
        url.hostname.endsWith(".gob.es"))
    );
  } catch {
    return false;
  }
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
