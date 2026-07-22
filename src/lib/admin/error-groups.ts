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
  resolvedCount: number;
  unresolvedCount: number;
  resolutionStatus: "pending" | "partial" | "resolved";
  severity: AdminErrorSeverity;
  errors: AdminErrorRow[];
}

export interface AdminErrorResolutionReceipt {
  id: string;
  resolved_at: string;
}

export interface AdminErrorArchiveState {
  errors: AdminErrorRow[];
  archivedErrors: AdminErrorRow[];
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

export function applyAdminErrorArchive(
  errors: AdminErrorRow[],
  archivedErrors: AdminErrorRow[],
  expectedEventIds: string[],
  resolved: AdminErrorResolutionReceipt[],
): AdminErrorArchiveState | null {
  const expectedIds = new Set(expectedEventIds);
  if (expectedIds.size === 0 || expectedIds.size !== expectedEventIds.length) {
    return null;
  }

  const resolvedAtById = new Map<string, string>();
  for (const item of resolved) {
    if (typeof item.id !== "string" || typeof item.resolved_at !== "string") {
      return null;
    }
    const parsed = Date.parse(item.resolved_at);
    if (
      !expectedIds.has(item.id) ||
      item.resolved_at.length > 64 ||
      !Number.isFinite(parsed) ||
      resolvedAtById.has(item.id)
    ) {
      return null;
    }
    resolvedAtById.set(item.id, new Date(parsed).toISOString());
  }
  if (resolvedAtById.size !== expectedIds.size) return null;

  const movedErrors = errors
    .filter((item) => expectedIds.has(item.id))
    .map((item) => ({
      ...item,
      resolved_at: resolvedAtById.get(item.id) ?? null,
    }));
  if (
    movedErrors.length !== expectedIds.size ||
    movedErrors.some((item) => item.resolved_at === null)
  ) {
    return null;
  }

  const nextErrors = errors.filter((item) => !expectedIds.has(item.id));
  const nextArchivedErrors = [...movedErrors, ...archivedErrors]
    .filter(
      (item, index, items) =>
        items.findIndex((candidate) => candidate.id === item.id) === index,
    )
    .sort((left, right) => right.created_at.localeCompare(left.created_at));

  return {
    errors: nextErrors,
    archivedErrors: nextArchivedErrors,
  };
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
        resolvedCount: item.resolved_at ? 1 : 0,
        unresolvedCount: item.resolved_at ? 0 : 1,
        resolutionStatus: item.resolved_at ? "resolved" : "pending",
        severity: item.severity,
        errors: [item],
      });
      continue;
    }

    existing.errors.push(item);
    if (item.resolved_at) {
      existing.resolvedCount += 1;
    } else {
      existing.unresolvedCount += 1;
    }
    if (item.created_at > existing.latestAt)
      existing.latestAt = item.created_at;
    if (SEVERITY_RANK[item.severity] > SEVERITY_RANK[existing.severity]) {
      existing.severity = item.severity;
    }
  }

  return Array.from(groups.values())
    .map((group) => ({
      ...group,
      resolutionStatus:
        group.unresolvedCount === 0
          ? ("resolved" as const)
          : group.resolvedCount > 0
            ? ("partial" as const)
            : ("pending" as const),
      errors: [...group.errors].sort((left, right) =>
        right.created_at.localeCompare(left.created_at),
      ),
    }))
    .sort((left, right) => right.latestAt.localeCompare(left.latestAt));
}
