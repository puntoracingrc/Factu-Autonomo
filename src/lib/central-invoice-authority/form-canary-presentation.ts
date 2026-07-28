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

function sentence(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  return trimmed.endsWith(".") ? trimmed : `${trimmed}.`;
}

function blockerMessage(
  policy: CentralInvoiceAuthorityFormIssuePolicyDecision,
): string {
  if (policy.status?.readiness.blockers[0]) {
    return ` Bloqueo actual: ${sentence(policy.status.readiness.blockers[0])}`;
  }
  if (!policy.shouldUseCentralAuthority && policy.statusError?.message) {
    return ` Detalle: ${sentence(policy.statusError.message)}`;
  }
  return "";
}

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
      visible: true,
      tone: "info",
      title: "Comprobando autoridad central",
      message:
        `Factu esta verificando si esta ${documentLabel} puede entrar en canario central antes de emitir.`,
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
    const remembered =
      policy.reason === "last_known_central_authority"
        ? " Este navegador ya vio autoridad central para el formulario; hasta recuperar el estado no se permite volver a numeracion local."
        : "";
    return {
      schema: CENTRAL_INVOICE_AUTHORITY_FORM_POLICY_NOTICE,
      visible: true,
      tone:
        policy.reason === "last_known_central_authority" ? "error" : "success",
      title: "Canario central activo",
      message:
        `Al emitir, el numero definitivo de esta ${documentLabel} lo asignara el servidor central. Si el preflight final falla, no se creara una emision local alternativa.${remembered}`,
    };
  }

  if (
    policy.reason === "public_canary_not_ready" ||
    policy.reason === "server_canary_not_ready"
  ) {
    const source =
      policy.reason === "server_canary_not_ready"
        ? "Tu cuenta esta incluida en el canario central"
        : "El canario del formulario esta solicitado";
    return {
      schema: CENTRAL_INVOICE_AUTHORITY_FORM_POLICY_NOTICE,
      visible: true,
      tone: "warning",
      title: "Canario central en espera",
      message:
        `${source}, pero el servidor aun no confirma todos los gates. Esta ${documentLabel} seguira usando el flujo local actual.${blockerMessage(policy)}`,
    };
  }

  if (policy.reason === "status_unavailable" && publicFormCanaryEnabled) {
    return {
      schema: CENTRAL_INVOICE_AUTHORITY_FORM_POLICY_NOTICE,
      visible: true,
      tone: "warning",
      title: "Canario central sin comprobacion",
      message:
        `No se pudo comprobar el estado central. Mientras no sea obligatorio, esta ${documentLabel} conserva el flujo local actual.${blockerMessage(policy)}`,
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
