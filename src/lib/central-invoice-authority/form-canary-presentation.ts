import type {
  CentralInvoiceAuthorityFormIssuePolicyDecision,
  CentralInvoiceAuthorityFormIssuePolicyReason,
} from "./form-canary-client";

export const CENTRAL_INVOICE_AUTHORITY_FORM_POLICY_NOTICE =
  "CENTRAL_INVOICE_AUTHORITY_FORM_POLICY_NOTICE_V1";

export type CentralInvoiceAuthorityFormPolicyNoticeTone =
  | "info"
  | "success"
  | "warning"
  | "error";

export interface CentralInvoiceAuthorityFormPolicyNotice {
  schema: typeof CENTRAL_INVOICE_AUTHORITY_FORM_POLICY_NOTICE;
  visible: boolean;
  tone: CentralInvoiceAuthorityFormPolicyNoticeTone;
  title: string;
  message: string;
}

interface DescribeCentralInvoiceAuthorityFormPolicyInput {
  policy: CentralInvoiceAuthorityFormIssuePolicyDecision | null;
  checking?: boolean;
  publicFormCanaryEnabled?: boolean;
  documentLabel?: string;
}

const REASON_LABELS: Record<CentralInvoiceAuthorityFormIssuePolicyReason, string> = {
  public_form_canary: "canario publico preparado",
  public_form_required: "modo central obligatorio por build",
  server_required: "modo central obligatorio por servidor",
  server_fiscal_writes_possible: "servidor central listo",
  last_known_central_authority: "autoridad central recordada",
  central_not_requested: "autoridad central no solicitada",
  public_canary_not_ready: "canario publico en espera",
  server_canary_not_ready: "canario servidor en espera",
  status_unavailable: "estado central no disponible",
};

export function centralInvoiceAuthorityFormPolicyReasonLabel(
  reason: CentralInvoiceAuthorityFormIssuePolicyReason,
): string {
  return REASON_LABELS[reason];
}

export function describeCentralInvoiceAuthorityFormPolicyNotice({
  policy,
  checking = false,
  publicFormCanaryEnabled = false,
  documentLabel = "factura",
}: DescribeCentralInvoiceAuthorityFormPolicyInput): CentralInvoiceAuthorityFormPolicyNotice {
  if (checking && publicFormCanaryEnabled) {
    return {
      schema: CENTRAL_INVOICE_AUTHORITY_FORM_POLICY_NOTICE,
      visible: false,
      tone: "info",
      title: "",
      message: "",
    };
  }

  if (!policy) {
    return {
      schema: CENTRAL_INVOICE_AUTHORITY_FORM_POLICY_NOTICE,
      visible: false,
      tone: "info",
      title: "",
      message: "",
    };
  }

  if (policy.shouldUseCentralAuthority) {
    const correctionMessage =
      documentLabel === "factura"
        ? " Si necesitas corregirla, deberás emitir una factura rectificativa."
        : " Revisa la vista previa antes de continuar.";
    return {
      schema: CENTRAL_INVOICE_AUTHORITY_FORM_POLICY_NOTICE,
      visible: true,
      tone: "info",
      title: "Emisión definitiva",
      message:
        `Al emitir, Factu comprobará y asignará el número definitivo. Cuando termine, esta ${documentLabel} quedará registrada y ya no podrás cambiar sus datos fiscales ni borrarla.${correctionMessage}`,
    };
  }

  return {
    schema: CENTRAL_INVOICE_AUTHORITY_FORM_POLICY_NOTICE,
    visible: false,
    tone: "info",
    title: "",
    message: "",
  };
}
