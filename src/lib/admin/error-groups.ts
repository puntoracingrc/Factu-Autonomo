export type AdminErrorSeverity = "info" | "warning" | "error";

export interface AdminErrorActor {
  key: string;
  kind: "user" | "system";
  email: string | null;
}

export interface AdminErrorRow {
  id: string;
  actor: AdminErrorActor;
  severity: AdminErrorSeverity;
  area: string;
  code: string | null;
  message: string;
  route: string | null;
  created_at: string;
  resolved_at: string | null;
}

export interface AdminErrorGroup {
  key: string;
  label: string;
  latestAt: string;
  unresolvedCount: number;
  severity: AdminErrorSeverity;
  errors: AdminErrorRow[];
}

const SEVERITY_RANK: Record<AdminErrorSeverity, number> = {
  info: 0,
  warning: 1,
  error: 2,
};

function actorLabel(actor: AdminErrorActor): string {
  if (actor.kind === "system") return "Eventos del sistema";
  return actor.email ?? "Cuenta no disponible";
}

export function groupAdminErrorsByActor(
  errors: AdminErrorRow[],
): AdminErrorGroup[] {
  const groups = new Map<string, AdminErrorGroup>();

  for (const item of errors) {
    const existing = groups.get(item.actor.key);
    if (!existing) {
      groups.set(item.actor.key, {
        key: item.actor.key,
        label: actorLabel(item.actor),
        latestAt: item.created_at,
        unresolvedCount: item.resolved_at ? 0 : 1,
        severity: item.severity,
        errors: [item],
      });
      continue;
    }

    existing.errors.push(item);
    if (!item.resolved_at) existing.unresolvedCount += 1;
    if (item.created_at > existing.latestAt) existing.latestAt = item.created_at;
    if (SEVERITY_RANK[item.severity] > SEVERITY_RANK[existing.severity]) {
      existing.severity = item.severity;
    }
  }

  return Array.from(groups.values())
    .map((group) => ({
      ...group,
      errors: [...group.errors].sort((left, right) =>
        right.created_at.localeCompare(left.created_at),
      ),
    }))
    .sort((left, right) => right.latestAt.localeCompare(left.latestAt));
}
