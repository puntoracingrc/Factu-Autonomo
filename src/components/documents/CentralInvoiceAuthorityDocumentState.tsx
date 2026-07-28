import type {
  CentralInvoiceAuthorityOperationState,
  CentralInvoiceAuthorityOperationStateTone,
} from "@/lib/central-invoice-authority/operation-state";

interface CentralInvoiceAuthorityDocumentStateProps {
  state: CentralInvoiceAuthorityOperationState | null;
}

function toneClasses(tone: CentralInvoiceAuthorityOperationStateTone): {
  badge: string;
  notice: string;
  text: string;
} {
  if (tone === "warning") {
    return {
      badge: "bg-amber-100 text-amber-800",
      notice: "border-amber-200 bg-amber-50",
      text: "text-amber-900",
    };
  }

  return {
    badge: "bg-blue-100 text-blue-800",
    notice: "border-blue-200 bg-blue-50",
    text: "text-blue-900",
  };
}

export function CentralInvoiceAuthorityBadge({
  state,
}: CentralInvoiceAuthorityDocumentStateProps) {
  if (!state?.badgeLabel) return null;

  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
        toneClasses(state.tone).badge
      }`}
      title={state.statusHint ?? undefined}
    >
      {state.badgeLabel}
    </span>
  );
}

export function CentralInvoiceAuthorityNotice({
  state,
}: CentralInvoiceAuthorityDocumentStateProps) {
  if (!state?.badgeLabel || !state.statusHint) return null;

  const classes = toneClasses(state.tone);

  return (
    <div
      role={state.requiresReview ? "alert" : "status"}
      className={`rounded-lg border px-3 py-2 text-sm ${classes.notice} ${classes.text}`}
    >
      <span className="block font-bold">{state.badgeLabel}</span>
      <span className="mt-1 block">{state.statusHint}</span>
    </div>
  );
}
