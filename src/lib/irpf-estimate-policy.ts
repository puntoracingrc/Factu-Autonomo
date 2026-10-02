import type {
  BusinessProfile,
  Document,
  Expense,
  IrpfEstimatePolicyV1,
  IrpfEstimateRateChangeV1,
} from "./types";

const DEFAULT_IRPF_PERCENT = 20;
const MAX_IRPF_RATE_CHANGES = 256;

function normalizePercent(value: unknown, fallback = DEFAULT_IRPF_PERCENT): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.min(100, Math.max(0, value));
}

function validInstant(value: unknown): value is string {
  return typeof value === "string" && Number.isFinite(Date.parse(value));
}

function normalizeChanges(value: unknown): IrpfEstimateRateChangeV1[] | null {
  if (!Array.isArray(value) || value.length > MAX_IRPF_RATE_CHANGES) return null;
  const changes: IrpfEstimateRateChangeV1[] = [];
  for (const entry of value) {
    if (
      entry === null ||
      typeof entry !== "object" ||
      !validInstant((entry as { effectiveAt?: unknown }).effectiveAt) ||
      typeof (entry as { percent?: unknown }).percent !== "number" ||
      !Number.isFinite((entry as { percent: number }).percent)
    ) {
      return null;
    }
    changes.push({
      effectiveAt: new Date(
        (entry as { effectiveAt: string }).effectiveAt,
      ).toISOString(),
      percent: normalizePercent((entry as { percent: number }).percent),
    });
  }
  changes.sort((left, right) => left.effectiveAt.localeCompare(right.effectiveAt));

  const deduplicated: IrpfEstimateRateChangeV1[] = [];
  for (const change of changes) {
    const previous = deduplicated.at(-1);
    if (previous?.effectiveAt === change.effectiveAt) {
      deduplicated[deduplicated.length - 1] = change;
    } else if (previous?.percent !== change.percent) {
      deduplicated.push(change);
    }
  }
  return deduplicated;
}

export function normalizeIrpfEstimatePolicy(
  value: unknown,
): IrpfEstimatePolicyV1 | undefined {
  if (
    value === null ||
    typeof value !== "object" ||
    (value as { schemaVersion?: unknown }).schemaVersion !== 1 ||
    typeof (value as { baselinePercent?: unknown }).baselinePercent !== "number" ||
    !Number.isFinite((value as { baselinePercent: number }).baselinePercent)
  ) {
    return undefined;
  }
  const changes = normalizeChanges((value as { changes?: unknown }).changes);
  if (!changes) return undefined;
  return {
    schemaVersion: 1,
    baselinePercent: normalizePercent(
      (value as { baselinePercent: number }).baselinePercent,
    ),
    changes,
  };
}

function policyForProfile(profile: BusinessProfile): IrpfEstimatePolicyV1 {
  return (
    normalizeIrpfEstimatePolicy(profile.irpfEstimatePolicy) ?? {
      schemaVersion: 1,
      baselinePercent: normalizePercent(profile.irpfPercent),
      changes: [],
    }
  );
}

function nextEffectiveAt(
  requested: string,
  changes: readonly IrpfEstimateRateChangeV1[],
): string {
  const requestedMs = Date.parse(requested);
  if (!Number.isFinite(requestedMs)) {
    throw new Error("IRPF_ESTIMATE_CHANGE_REQUIRES_VALID_TIMESTAMP");
  }
  const lastMs = Date.parse(changes.at(-1)?.effectiveAt ?? "");
  return new Date(
    Number.isFinite(lastMs) && requestedMs <= lastMs ? lastMs + 1 : requestedMs,
  ).toISOString();
}

/**
 * Materializa el historial solo cuando cambia el porcentaje. La primera vez
 * conserva como baseline el porcentaje que ya tenía esta empresa.
 */
export function applyIrpfEstimatePercentChange(input: {
  current: BusinessProfile;
  next: BusinessProfile;
  effectiveAt: string;
}): BusinessProfile {
  const currentPercent = normalizePercent(input.current.irpfPercent);
  const nextPercent = normalizePercent(input.next.irpfPercent);
  if (currentPercent === nextPercent) {
    return {
      ...input.next,
      irpfPercent: nextPercent,
      irpfEstimatePolicy: normalizeIrpfEstimatePolicy(
        input.current.irpfEstimatePolicy,
      ),
    };
  }

  const policy = policyForProfile(input.current);
  const effectiveAt = nextEffectiveAt(input.effectiveAt, policy.changes);
  return {
    ...input.next,
    irpfPercent: nextPercent,
    irpfEstimatePolicy: {
      ...policy,
      changes: [...policy.changes, { effectiveAt, percent: nextPercent }],
    },
  };
}

export function resolveIrpfEstimatePercentAt(
  profile: BusinessProfile,
  instant: string | undefined,
  fallbackPercent = profile.irpfPercent,
): number {
  const fallback = normalizePercent(fallbackPercent);
  const policy = normalizeIrpfEstimatePolicy(profile.irpfEstimatePolicy);
  if (!policy) return fallback;
  if (!validInstant(instant)) return normalizePercent(profile.irpfPercent, fallback);
  const normalizedInstant = new Date(instant).toISOString();

  let resolved = policy.baselinePercent;
  for (const change of policy.changes) {
    if (change.effectiveAt > normalizedInstant) break;
    resolved = change.percent;
  }
  return resolved;
}

function dateOnlyInstant(value: string): string | undefined {
  return /^\d{4}-\d{2}-\d{2}$/u.test(value)
    ? `${value}T12:00:00.000Z`
    : undefined;
}

/** Momento interno de clasificación; nunca se copia al documento ni al PDF. */
export function documentIrpfEstimateAnchor(document: Document): string | undefined {
  if (document.legacyImportAttestation || document.legacyImportProvenance) {
    return dateOnlyInstant(document.date);
  }
  return (
    document.issuedAt ??
    (validInstant(document.createdAt) ? document.createdAt : undefined) ??
    dateOnlyInstant(document.date)
  );
}

/** Momento interno de clasificación; el gasto tampoco se modifica. */
export function expenseIrpfEstimateAnchor(expense: Expense): string | undefined {
  if (expense.origin === "import") return dateOnlyInstant(expense.date);
  return (
    (validInstant(expense.createdAt) ? expense.createdAt : undefined) ??
    dateOnlyInstant(expense.date)
  );
}

export function irpfEstimatePolicyDisplayEntries(
  profile: BusinessProfile,
): Array<{ effectiveAt: string | null; percent: number }> {
  const policy = normalizeIrpfEstimatePolicy(profile.irpfEstimatePolicy);
  if (!policy) {
    return [{ effectiveAt: null, percent: normalizePercent(profile.irpfPercent) }];
  }
  return [
    { effectiveAt: null, percent: policy.baselinePercent },
    ...policy.changes,
  ];
}
