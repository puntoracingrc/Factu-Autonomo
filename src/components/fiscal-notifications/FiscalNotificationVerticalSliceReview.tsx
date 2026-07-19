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
import { AEAT_DOCUMENT_PROFILE_IDS_V1 } from "@/lib/fiscal-notifications/knowledge/aeat-document-knowledge.v1";
import { projectProfileDrivenExplanationInputV2 } from "@/lib/fiscal-notifications/profile-driven-explanation-input.v2";
import { isAeatOfficialCatalogProfileIdV9 } from "@/lib/fiscal-notifications/knowledge/official-catalog-expansion.v9";
import { explainAeatOfficialCatalogDocumentV9 } from "@/lib/fiscal-notifications/official-catalog-explanation.v9";
import { isAeatP0DeepProfileIdV10 } from "@/lib/fiscal-notifications/knowledge/p0-deep-contracts.v10";
import { explainAeatP0DeepDocumentV10 } from "@/lib/fiscal-notifications/p0-deep-explanation.v10";
import { shouldExposeFiscalNotificationField } from "@/lib/fiscal-notifications/document-fact-observation.v1";

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
            className: "border-b border-emerald-100 bg-emerald-50 p-4 sm:p-5",
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
                  className: "mt-1 text-sm font-semibold text-emerald-900",
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
        h(ExtractedFields, { fields: document.fields }),
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
    (source): source is typeof source & { readonly canonicalUrl: string } =>
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
  if (isAeatP0DeepProfileIdV10(document.familyId)) {
    return explainAeatP0DeepDocumentV10(document.familyId);
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
      : humanDisplayValue(field);

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
        className: "text-xs font-bold uppercase tracking-wide text-slate-500",
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

function ExtractedFields({
  fields,
}: {
  readonly fields: readonly FiscalNotificationVerticalSliceReviewFieldV1[];
}) {
  const sourceFields = fields.filter(shouldExposeFiscalNotificationField);
  const installments = sourceFields.flatMap(projectInstallmentRow);
  const visible = deduplicateFields(
    sourceFields.filter((field) => !isInstallmentField(field)),
  );
  return h(
    "div",
    { className: "space-y-4 p-4 sm:p-5" },
    visible.length > 0
      ? h(
          "dl",
          { className: "grid gap-3 sm:grid-cols-2 lg:grid-cols-3" },
          visible.map((field) =>
            h(ExtractedField, { key: field.fieldId, field }),
          ),
        )
      : null,
    installments.length > 0
      ? h(
          "div",
          { className: "overflow-x-auto rounded-xl border border-slate-200" },
          h(
            "table",
            { className: "min-w-full divide-y divide-slate-200 text-sm" },
            h(
              "caption",
              {
                className:
                  "bg-slate-50 px-4 py-3 text-left font-bold text-slate-950",
              },
              "Calendario de cuotas",
            ),
            h(
              "thead",
              { className: "bg-slate-50 text-left text-xs text-slate-600" },
              h(
                "tr",
                null,
                ...["Cuota", "Vence", "Principal", "Intereses", "Total"].map(
                  (label) =>
                    h("th", { key: label, className: "px-4 py-2" }, label),
                ),
              ),
            ),
            h(
              "tbody",
              { className: "divide-y divide-slate-100 bg-white" },
              installments.map((item) =>
                h(
                  "tr",
                  { key: `${item.sequence}:${item.dueDate}` },
                  h(
                    "td",
                    { className: "px-4 py-3 font-semibold" },
                    item.sequence,
                  ),
                  h(
                    "td",
                    { className: "px-4 py-3" },
                    formatIsoDate(item.dueDate),
                  ),
                  h(
                    "td",
                    { className: "px-4 py-3" },
                    formatEuro(item.principalCents),
                  ),
                  h(
                    "td",
                    { className: "px-4 py-3" },
                    formatEuro(item.interestCents),
                  ),
                  h(
                    "td",
                    { className: "px-4 py-3 font-bold" },
                    formatEuro(item.totalCents),
                  ),
                ),
              ),
            ),
          ),
        )
      : null,
  );
}

interface InstallmentRow {
  readonly sequence: string;
  readonly dueDate: string;
  readonly principalCents: number;
  readonly interestCents: number;
  readonly totalCents: number;
}

function isInstallmentField(
  field: FiscalNotificationVerticalSliceReviewFieldV1,
): boolean {
  return /^V6:INSTALLMENT:/u.test(field.normalizedValue ?? "");
}

function projectInstallmentRow(
  field: FiscalNotificationVerticalSliceReviewFieldV1,
): readonly InstallmentRow[] {
  const match =
    /^V6:INSTALLMENT:([1-9]\d*):((?:19|20)\d{2}-\d{2}-\d{2}):(\d+):(\d+):(\d+)$/u.exec(
      field.normalizedValue ?? "",
    );
  if (!match) return [];
  return [
    {
      sequence: match[1]!,
      dueDate: match[2]!,
      principalCents: Number(match[3]),
      interestCents: Number(match[4]),
      totalCents: Number(match[5]),
    },
  ];
}

function deduplicateFields(
  fields: readonly FiscalNotificationVerticalSliceReviewFieldV1[],
): readonly FiscalNotificationVerticalSliceReviewFieldV1[] {
  const identities = new Set<string>();
  return fields.filter((field) => {
    const identity = JSON.stringify([
      field.semantic,
      field.canonicalType,
      field.normalizedValue ?? field.displayValue,
      field.sourcePageNumbers,
    ]);
    if (identities.has(identity)) return false;
    identities.add(identity);
    return true;
  });
}

const HUMAN_DISPLAY_VALUES: Readonly<Record<string, string>> = Object.freeze({
  DIRECT_DEBIT: "Domiciliación bancaria",
  NO_GUARANTEE: "Sin garantía",
  PRIMARY_DEBTOR: "Obligado al pago",
  TAXPAYER: "Obligado tributario",
  PAYMENT_FORM_ONLY: "Carta de pago adjunta",
  PAYMENT_FORM_FOR: "Carta de pago del documento",
  ANNEX_ONLY: "Anexo del documento",
  DELIVERY_ATTEMPT_FOR: "Intento de entrega del documento",
});

function humanDisplayValue(
  field: FiscalNotificationVerticalSliceReviewFieldV1,
): string {
  if (field.semantic === "REFERENCE" || field.semantic === "MONEY") {
    return field.displayValue;
  }
  return HUMAN_DISPLAY_VALUES[field.displayValue] ?? field.displayValue;
}

function formatIsoDate(value: string): string {
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

function formatEuro(amountCents: number): string {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  })
    .format(amountCents / 100)
    .replace(/\s?€/u, "\u00a0€");
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
