import type {
  CentralInvoiceAuthorityStatusCheck,
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

const CHECK_LABELS: Record<string, string> = {
  admin_client: "Cliente servidor",
  "table:central_invoice_series_state": "Tabla estado de series",
  "table:central_invoice_documents": "Tabla documentos centrales",
  "table:central_invoice_commands": "Tabla comandos idempotentes",
  "table:central_invoice_identities": "Tabla identidades fiscales",
  "table:central_invoice_outbox": "Tabla eventos de salida",
  "rpc:issue_central_invoice_v1:dry_invalid": "RPC de emision",
  "rpc:list_central_invoice_events_v1:dry_invalid": "RPC de eventos",
};

const CHECK_KIND_LABELS: Record<CentralInvoiceAuthorityStatusCheck["kind"], string> = {
  configuration: "Configuracion",
  table: "Supabase",
  rpc: "RPC",
};

const ACTIVATION_REASON_LABELS: Record<string, string> = {
  disabled: "modo apagado",
  invalid_mode: "modo no valido",
  shadow_only: "modo sombra, sin escritura fiscal",
  user_not_allowlisted: "usuario fuera del canario",
  schema_not_ready: "version de esquema pendiente",
  operational_sync_not_ready: "sincronizacion operativa pendiente",
  baseline_not_reconciled: "baseline de produccion pendiente",
  restorable_backup_missing: "copia restaurable pendiente",
  isolated_restore_drill_missing: "ensayo de restauracion pendiente",
  production_approval_missing: "aprobacion productiva pendiente",
  canary_enabled: "canario habilitado",
  required_enabled: "modo obligatorio habilitado",
};

export function centralAuthorityStatusBlockerLabel(value: string): string {
  return BLOCKER_LABELS[value] ?? value;
}

export function centralAuthorityStatusCheckLabel(
  check: Pick<CentralInvoiceAuthorityStatusCheck, "id">,
): string {
  return CHECK_LABELS[check.id] ?? check.id;
}

export function centralAuthorityStatusCheckKindLabel(
  check: Pick<CentralInvoiceAuthorityStatusCheck, "kind">,
): string {
  return CHECK_KIND_LABELS[check.kind] ?? check.kind;
}

export function centralAuthorityActivationReasonLabel(value: string): string {
  return ACTIVATION_REASON_LABELS[value] ?? value;
}

export function centralAuthorityStatusCheckAction(
  check: CentralInvoiceAuthorityStatusCheck,
): string {
  if (check.status === "ready") return "Listo para el canario.";
  if (check.blocker === "missing_admin_client") {
    return "Configura el cliente servidor antes de probar emisiones centrales.";
  }
  if (check.blocker === "central_invoice_table_unavailable") {
    return "Verifica o aplica las migraciones centrales en Supabase antes del canario.";
  }
  if (check.blocker === "central_invoice_issue_rpc_unavailable") {
    return "Verifica la RPC transaccional de emision antes de activar el formulario.";
  }
  if (check.blocker === "central_invoice_events_rpc_unavailable") {
    return "Verifica la RPC de eventos para que otros dispositivos puedan actualizarse.";
  }
  return "Revisa este gate antes de permitir escrituras fiscales.";
}

function blockerSummary(blockers: readonly string[]): string {
  if (blockers.length === 0) return "sin bloqueos del esquema central";
  return blockers.map(centralAuthorityStatusBlockerLabel).join(", ");
}

export function describeCentralInvoiceAuthorityNextStep(
  result: CentralInvoiceAuthorityStatusResult,
  flags: {
    publicFormCanaryRequested?: boolean;
    publicFormRequiredRequested?: boolean;
  } = {},
): CentralAuthorityStatusNotice {
  if (!result.ok) {
    return {
      tone: result.status === 401 || result.status === 403 ? "warning" : "error",
      title: "Comprobacion pendiente",
      message: result.message,
    };
  }

  if (flags.publicFormRequiredRequested && !result.summary.fiscalWritesPossible) {
    return {
      tone: "error",
      title: "Formulario obligatorio protegido",
      message:
        "El flag publico obligatorio pide servidor central, pero algun gate no esta listo; emitir quedara bloqueado antes de usar numeracion local.",
    };
  }

  if (result.summary.fiscalWritesPossible) {
    return {
      tone: "success",
      title: flags.publicFormCanaryRequested
        ? "Canario listo para probar"
        : "Servidor listo para canario",
      message: flags.publicFormCanaryRequested
        ? "El formulario puede pedir identidad fiscal al servidor para usuarios permitidos."
        : "Puedes activar el canario publico del formulario solo para el usuario de pruebas.",
    };
  }

  if (flags.publicFormCanaryRequested) {
    return {
      tone: "warning",
      title: "Canario pedido, retenido en local",
      message:
        "El flag publico esta activo, pero el formulario seguira por el flujo local hasta que status confirme todos los gates.",
    };
  }

  if (
    result.activation.effectiveMode === "shadow" &&
    result.activation.appliesToUser
  ) {
    return {
      tone: "warning",
      title: "Observacion activa",
      message:
        "Esta cuenta puede comprobar el servidor y revisar sus series, pero la emision central sigue bloqueada hasta una promocion explicita al canario.",
    };
  }

  if (result.summary.serverSchemaReady && !result.summary.modeAllowsWrites) {
    return {
      tone: "warning",
      title: "Siguiente paso",
      message:
        "El esquema central responde; falta activar modo canario, allowlist y gates operativos antes de escribir.",
    };
  }

  return {
    tone: "warning",
    title: "Siguiente paso",
    message: `Completa ${blockerSummary(result.readiness.blockers)} antes de probar el formulario central.`,
  };
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
      message: `Modo ${CENTRAL_AUTHORITY_STATUS_MODE_LABELS[result.activation.effectiveMode]} (${centralAuthorityActivationReasonLabel(result.activation.reason)}); la emision sigue sin usar autoridad central.`,
    };
  }

  return {
    tone: "warning",
    title: "Autoridad central bloqueada",
    message: `Falta preparar ${blockerSummary(result.readiness.blockers)}.`,
  };
}
