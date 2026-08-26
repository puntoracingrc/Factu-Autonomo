export const SUPPORT_RECOVERY_TOOL_IDS = [
  "local_backup_restore",
  "expense_allocation_repair",
  "legacy_import_repair",
  "issued_document_recovery",
] as const;

export type SupportRecoveryToolId = (typeof SUPPORT_RECOVERY_TOOL_IDS)[number];

export interface SupportRecoveryToolDefinition {
  id: SupportRecoveryToolId;
  label: string;
  description: string;
}

export const SUPPORT_RECOVERY_TOOLS: readonly SupportRecoveryToolDefinition[] =
  [
    {
      id: "local_backup_restore",
      label: "Restaurar una copia local",
      description:
        "Revisa y reemplaza los datos de este navegador desde una copia JSON.",
    },
    {
      id: "expense_allocation_repair",
      label: "Reparar repartos antiguos de gastos",
      description:
        "Corrige repartos operativos creados antes del modelo fiscal actual.",
    },
    {
      id: "legacy_import_repair",
      label: "Aceptar documentos históricos importados",
      description:
        "Revisa históricos antiguos y sus relaciones antes de incorporarlos a cálculos.",
    },
    {
      id: "issued_document_recovery",
      label: "Recuperar documentos emitidos antiguos",
      description:
        "Repara documentos emitidos por Factu antes del sellado y autoridad actuales.",
    },
  ];

export const BLOCKED_RECOVERY_TOOL = {
  id: "discarded_document_retirement",
  label: "Archivar documentos descartados",
  description:
    "No se puede activar hasta disponer de un comando central atómico con restauración verificada.",
} as const;

export const SUPPORT_RECOVERY_DURATION_OPTIONS = [15, 30, 60, 120] as const;
export type SupportRecoveryDurationMinutes =
  (typeof SUPPORT_RECOVERY_DURATION_OPTIONS)[number];

export interface SupportRecoveryGrantRow {
  id: string;
  user_id: string;
  tool_id: string;
  granted_by: string | null;
  granted_at: string;
  expires_at: string;
  reason: string;
  revoked_at: string | null;
  revoked_by: string | null;
  revocation_reason: string | null;
}

export interface SupportRecoveryAccess {
  id: string;
  toolId: SupportRecoveryToolId;
  grantedAt: string;
  expiresAt: string;
}

export interface SupportRecoveryGrant extends SupportRecoveryAccess {
  userId: string;
  grantedBy: string | null;
  reason: string;
  revokedAt: string | null;
  revokedBy: string | null;
  revocationReason: string | null;
}

export function isSupportRecoveryToolId(
  value: unknown,
): value is SupportRecoveryToolId {
  return (
    typeof value === "string" &&
    SUPPORT_RECOVERY_TOOL_IDS.includes(value as SupportRecoveryToolId)
  );
}

export function isSupportRecoveryDurationMinutes(
  value: unknown,
): value is SupportRecoveryDurationMinutes {
  return (
    typeof value === "number" &&
    SUPPORT_RECOVERY_DURATION_OPTIONS.includes(
      value as SupportRecoveryDurationMinutes,
    )
  );
}

export function normalizeSupportRecoveryGrant(
  row: SupportRecoveryGrantRow,
): SupportRecoveryGrant | null {
  if (!isSupportRecoveryToolId(row.tool_id)) return null;
  return {
    id: row.id,
    userId: row.user_id,
    toolId: row.tool_id,
    grantedBy: row.granted_by,
    grantedAt: row.granted_at,
    expiresAt: row.expires_at,
    reason: row.reason,
    revokedAt: row.revoked_at,
    revokedBy: row.revoked_by,
    revocationReason: row.revocation_reason,
  };
}

export function activeSupportRecoveryGrants(
  grants: readonly SupportRecoveryGrant[],
  now = Date.now(),
): SupportRecoveryGrant[] {
  const newestByTool = new Map<SupportRecoveryToolId, SupportRecoveryGrant>();
  grants.forEach((grant) => {
    if (grant.revokedAt || Date.parse(grant.expiresAt) <= now) return;
    const current = newestByTool.get(grant.toolId);
    if (
      !current ||
      Date.parse(grant.grantedAt) > Date.parse(current.grantedAt)
    ) {
      newestByTool.set(grant.toolId, grant);
    }
  });
  return SUPPORT_RECOVERY_TOOL_IDS.flatMap((toolId) => {
    const grant = newestByTool.get(toolId);
    return grant ? [grant] : [];
  });
}

export function activeSupportRecoveryAccesses<T extends SupportRecoveryAccess>(
  accesses: readonly T[],
  now = Date.now(),
): T[] {
  const newestByTool = new Map<SupportRecoveryToolId, T>();
  accesses.forEach((access) => {
    if (Date.parse(access.expiresAt) <= now) return;
    const current = newestByTool.get(access.toolId);
    if (
      !current ||
      Date.parse(access.grantedAt) > Date.parse(current.grantedAt)
    ) {
      newestByTool.set(access.toolId, access);
    }
  });
  return SUPPORT_RECOVERY_TOOL_IDS.flatMap((toolId) => {
    const access = newestByTool.get(toolId);
    return access ? [access] : [];
  });
}
