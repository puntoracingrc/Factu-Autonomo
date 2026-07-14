import { createElement } from "react";
import type {
  FiscalNotificationReviewGuidanceV1,
  FiscalNotificationReviewStepIdV1,
  FiscalNotificationReviewStepStateV1,
} from "@/lib/fiscal-notifications/review-guidance.v1";

interface ReviewStepCopy {
  readonly title: string;
  readonly detail: string;
}

const REVIEW_STEP_COPY: Readonly<
  Record<FiscalNotificationReviewStepIdV1, ReviewStepCopy>
> = {
  VERIFY_DOCUMENT_RECIPIENT_AND_AUTHORITY: {
    title: "Comprueba el destinatario y el organismo",
    detail:
      "Revisa en el documento original que la comunicación corresponde a la persona o entidad adecuada y que el organismo emisor es el esperado.",
  },
  REVIEW_CANDIDATE_CLASSIFICATION: {
    title: "Revisa la clasificación propuesta",
    detail:
      "La familia mostrada es solo una candidata técnica. No la des por confirmada: déjala pendiente de revisión fiscal humana.",
  },
  COMPARE_EPHEMERAL_PRINTED_AMOUNTS: {
    title: "Compara los importes impresos",
    detail:
      "Contrasta con el PDF original cualquier importe mostrado durante esta revisión. No se guarda ni se interpreta como una deuda.",
  },
  VERIFY_DATES_AND_RESPONSE_CHANNELS_EXTERNALLY: {
    title: "Verifica fechas y vías de respuesta",
    detail:
      "Consulta el documento original y el canal oficial antes de actuar. Esta guía no calcula plazos ni confirma que sigan abiertos.",
  },
  CONSULT_OFFICIAL_PROCEDURE_CONTEXT: {
    title: "Consulta el contexto oficial del procedimiento",
    detail:
      "La información oficial sirve como contexto general: no valida el PDF, no confirma su clasificación y no activa una regla jurídica.",
  },
  SEEK_HUMAN_FISCAL_REVIEW: {
    title: "Solicita revisión fiscal humana",
    detail:
      "Antes de cualquier pago, recurso, aplazamiento o registro contable, somete la comunicación a revisión fiscal humana. Esta guía no determina qué actuación procede.",
  },
};

const REVIEW_STEP_STATE_LABELS: Readonly<
  Record<FiscalNotificationReviewStepStateV1, string>
> = {
  MANUAL_REVIEW_REQUIRED: "Revisión humana obligatoria",
  INFORMATION_PENDING: "Información pendiente",
  BLOCKED_BY_ANALYSIS: "Lectura bloqueada",
};

const h = createElement;

export function FiscalNotificationReviewSteps({
  guidance,
  documentTypeRecognized = false,
}: {
  readonly guidance: FiscalNotificationReviewGuidanceV1;
  readonly documentTypeRecognized?: boolean;
}) {
  return h(
    "section",
    {
      "aria-labelledby": "fiscal-notification-review-steps-title",
      className: "rounded-2xl border border-amber-200 bg-amber-50 p-5",
    },
    h(
      "h2",
      {
        id: "fiscal-notification-review-steps-title",
        className: "text-lg font-bold text-amber-950",
      },
      "Antes de actuar",
    ),
    h(
      "p",
      { className: "mt-1 text-sm leading-6 text-amber-900" },
      "Sigue estas comprobaciones fuera de la aplicación. La guía no ejecuta acciones ni registra su cumplimiento.",
    ),
    h(
      "ol",
      { className: "mt-4 space-y-4 pl-5 text-sm text-slate-700" },
      guidance.steps.map((step) => {
        const copy =
          step.id === "REVIEW_CANDIDATE_CLASSIFICATION" &&
          documentTypeRecognized
            ? {
                title: "Comprueba los datos del documento reconocido",
                detail:
                  "El título y la estructura determinan el tipo mostrado. Revisa el organismo, la autenticidad, los importes, las referencias, las fechas y los efectos antes de actuar; esa comprobación no vuelve a convertir el tipo en posible.",
              }
            : step.id === "CONSULT_OFFICIAL_PROCEDURE_CONTEXT" &&
                documentTypeRecognized
              ? {
                  title: "Consulta el contexto oficial del procedimiento",
                  detail:
                    "El contexto oficial no confirma el organismo emisor, la autenticidad, la vigencia ni los efectos jurídicos del PDF. El tipo documental ya está identificado por su firma estructural.",
                }
            : REVIEW_STEP_COPY[step.id];
        const officialContext =
          step.id === "CONSULT_OFFICIAL_PROCEDURE_CONTEXT"
            ? guidance.officialProcedureContexts
            : [];

        return h(
          "li",
          { key: step.id, className: "list-decimal pl-1 leading-6" },
          h(
            "h3",
            { className: "font-semibold text-slate-900" },
            copy.title,
          ),
          h(
            "p",
            {
              className:
                "text-xs font-semibold uppercase tracking-wide text-amber-800",
            },
            `Estado: ${REVIEW_STEP_STATE_LABELS[step.state]}`,
          ),
          h("p", null, copy.detail),
          officialContext.map((source) =>
            h(
              "p",
              { key: source.sourceId, className: "mt-2" },
              h(
                "a",
                {
                  href: source.canonicalUrl,
                  target: "_blank",
                  rel: "noopener noreferrer",
                  referrerPolicy: "no-referrer",
                  className:
                    "font-semibold text-primary-700 underline decoration-primary-300 underline-offset-2 hover:text-primary-900",
                },
                `Información general de la AEAT: ${source.title}. No valida el PDF ni calcula plazos. Se abre en una pestaña nueva.`,
              ),
            ),
          ),
        );
      }),
    ),
  );
}
