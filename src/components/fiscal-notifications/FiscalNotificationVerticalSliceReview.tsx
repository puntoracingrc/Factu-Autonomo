"use client";

import { createElement, useMemo, useState } from "react";
import { FiscalNotificationDocumentReport } from "@/components/fiscal-notifications/FiscalNotificationDocumentDetail";
import { projectFiscalNotificationScanReviewDocumentDetailV1 } from "@/lib/fiscal-notifications/scan-review-document-detail.v1";
import type { FiscalNotificationVerticalSliceReviewV1 } from "@/lib/fiscal-notifications/vertical-slice-review.v1";

export interface FiscalNotificationVerticalSliceReviewProps {
  readonly review: FiscalNotificationVerticalSliceReviewV1;
}

export function FiscalNotificationVerticalSliceReview({
  review,
}: FiscalNotificationVerticalSliceReviewProps) {
  const reports = useMemo(
    () =>
      review.status === "REVIEW_REQUIRED"
        ? review.documents.map((document) =>
            projectFiscalNotificationScanReviewDocumentDetailV1({
              document,
              allDocuments: review.documents,
            }),
          )
        : [],
    [review],
  );
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(
    null,
  );
  const selected =
    reports.find((report) => report.documentId === selectedDocumentId) ??
    reports[0];

  if (!selected) return null;

  return createElement(
    "section",
    {
      className: "min-w-0",
      "aria-label": "Revisión del documento antes de guardar",
    },
    createElement(
      "div",
      {
        className:
          "mb-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between",
      },
      createElement(
        "div",
        null,
        createElement(
          "p",
          { className: "text-xs font-bold uppercase text-blue-700" },
          "Revisión antes de guardar",
        ),
        createElement(
          "p",
          { className: "mt-1 text-sm leading-6 text-slate-600" },
          "Comprueba los datos impresos y su procedencia. Guardar creará solo la ficha estructurada que ves aquí.",
        ),
      ),
      reports.length > 1
        ? createElement(
            "p",
            { className: "text-xs font-semibold text-slate-500" },
            `${reports.length} actos separados en este PDF`,
          )
        : null,
    ),
    createElement(FiscalNotificationDocumentReport, {
      detail: selected,
      mode: "review",
      onNavigateAct: setSelectedDocumentId,
    }),
    createElement(
      "p",
      {
        className:
          "rounded-md border border-blue-100 bg-blue-50 px-4 py-3 text-sm leading-6 text-blue-950",
      },
      "La explicación oficial está separada de los valores impresos. Esta revisión no crea una deuda, un pago, un plazo, un gasto ni un asiento.",
    ),
  );
}
