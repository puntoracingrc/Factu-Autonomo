import type {
  CentralInvoiceAuthorityStatusMode,
  CentralInvoiceAuthorityStatusResult,
} from "@/lib/central-invoice-authority/status-client";

export type CentralAuthorityStatusNotice = {
  tone: "success" | "warning" | "error";
  title: string;
  message: string;
};

export const CENTRAL_AUTHORITY_STATUS_MODE_LABELS: Record<
  CentralInvoiceAuthorityStatusMode,
  string
> = {
  off: "apagado",
  shadow: "sombra",
  canary: "canario",
  required: "obligatorio",
};

const BLOCKER_LABELS: Record<string, string> = {
  missing_admin_client: "cliente servidor no disponible",
  central_invoice_table_unavailable: "tablas centrales no disponibles",
  central_invoice_issue_rpc_unavailable: "RPC de emision no disponible",
  central_invoice_events_rpc_unavailable: "RPC de eventos no disponible",
};

export function centralAuthorityStatusBlockerLabel(value: string): string {
  return BLOCKER_LABELS[value] ?? value;
}

function blockerSummary(blockers: readonly string[]): string {
  if (blockers.length === 0) return "sin bloqueos del esquema central";
  return blockers.map(centralAuthorityStatusBlockerLabel).join(", ");
}

export function describeCentralInvoiceAuthorityStatusResult(
  result: CentralInvoiceAuthorityStatusResult,
): CentralAuthorityStatusNotice {
  if (!result.ok) {
    if (result.status === 401 || result.status === 403) {
      return {
        tone: "warning",
        title: "Cuenta o dispositivo pendiente",
        message: result.message,
      };
    }
    return {
      tone: "error",
      title: "No se pudo comprobar",
      message: result.message,
    };
  }

  if (result.summary.fiscalWritesPossible) {
    return {
      tone: "success",
      title: "Autoridad central lista",
      message:
        "El servidor central esta listo para escrituras fiscales cuando el canario de emision se active.",
    };
  }

  if (result.summary.serverSchemaReady && !result.summary.modeAllowsWrites) {
    return {
      tone: "warning",
      title: "Servidor comprobado, escritura apagada",
      message: `Modo ${CENTRAL_AUTHORITY_STATUS_MODE_LABELS[result.activation.effectiveMode]}; la emision sigue sin usar autoridad central.`,
    };
  }

  return {
    tone: "warning",
    title: "Autoridad central bloqueada",
    message: `Falta preparar ${blockerSummary(result.readiness.blockers)}.`,
  };
}
