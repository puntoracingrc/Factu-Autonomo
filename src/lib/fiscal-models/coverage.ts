import type {
  FiscalModelCoverageInput,
  FiscalModelCoverageSnapshot,
  FiscalModelCoverageStatus,
  FiscalModelManualReviewReason,
  FiscalModelReadResult,
  FiscalModelSourceVerificationStatus,
} from "./contracts";

const ISO_TIMESTAMP_WITH_ZONE =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,3})?(?:Z|([+-])(\d{2}):(\d{2}))$/;

const SOURCE_VERIFICATION_STATUSES = new Set<
  FiscalModelSourceVerificationStatus
>(["HASH_PENDING", "VERIFIED", "CHANGED", "UNAVAILABLE", "REPLACED"]);
const MAX_COVERAGE_UNITS = 10_000;
const MAX_SOURCE_STATUS_COUNT = 10_000;
const MAX_FRESHNESS_THRESHOLD_MS = 366 * 24 * 60 * 60 * 1_000;

type CoverageMessageInput = Omit<FiscalModelCoverageSnapshot, "displayMessage">;

function isNonNegativeInteger(value: unknown): value is number {
  return (
    typeof value === "number" && Number.isSafeInteger(value) && value >= 0
  );
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

function isIsoTimestamp(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const match = ISO_TIMESTAMP_WITH_ZONE.exec(value);
  if (!match) return false;

  const [, yearText, monthText, dayText, hourText, minuteText, secondText] =
    match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const hour = Number(hourText);
  const minute = Number(minuteText);
  const second = Number(secondText);
  const offsetHour = match[8] === undefined ? 0 : Number(match[8]);
  const offsetMinute = match[9] === undefined ? 0 : Number(match[9]);
  const leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const daysInMonth = [
    31,
    leapYear ? 29 : 28,
    31,
    30,
    31,
    30,
    31,
    31,
    30,
    31,
    30,
    31,
  ];

  return (
    month >= 1 &&
    month <= 12 &&
    day >= 1 &&
    day <= daysInMonth[month - 1] &&
    hour <= 23 &&
    minute <= 59 &&
    second <= 59 &&
    offsetHour <= 14 &&
    offsetMinute <= 59 &&
    (offsetHour < 14 || offsetMinute === 0) &&
    Number.isFinite(Date.parse(value))
  );
}

function isNullableIsoTimestamp(value: unknown): value is string | null {
  return value === null || isIsoTimestamp(value);
}

function isSourceVerificationStatusArray(
  value: unknown,
): value is readonly FiscalModelSourceVerificationStatus[] {
  if (
    !Array.isArray(value) ||
    value.length === 0 ||
    value.length > MAX_SOURCE_STATUS_COUNT
  ) {
    return false;
  }

  try {
    const ownKeys = Reflect.ownKeys(value);
    if (ownKeys.length !== value.length + 1) return false;
    for (let index = 0; index < value.length; index += 1) {
      const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
      if (!descriptor || !("value" in descriptor)) return false;
      const status = descriptor.value;
      if (
        typeof status !== "string" ||
        !SOURCE_VERIFICATION_STATUSES.has(
          status as FiscalModelSourceVerificationStatus,
        )
      ) {
        return false;
      }
    }
    return ownKeys.every(
      (key) =>
        key === "length" ||
        (typeof key === "string" &&
          /^0$|^[1-9]\d*$/.test(key) &&
          Number(key) < value.length),
    );
  } catch {
    return false;
  }
}

function uniqueFrozenReasons(
  reasons: readonly FiscalModelManualReviewReason[],
): readonly FiscalModelManualReviewReason[] {
  return Object.freeze([...new Set(reasons)]);
}

export function formatFiscalModelCoverageMessage(
  snapshot: CoverageMessageInput,
): string {
  switch (snapshot.status) {
    case "CURRENT":
      return `Cobertura ${snapshot.taxYear} validada: ${snapshot.validatedUnits} de ${snapshot.targetUnits} unidades. Revisión fiscal: ${snapshot.lastFiscalReviewAt}.`;
    case "PARTIAL":
      return `Cobertura ${snapshot.taxYear} parcial: ${snapshot.validatedUnits} de ${snapshot.targetUnits} unidades validadas.`;
    case "CHANGES_PENDING":
      return `Cambio oficial pendiente de revisión para ${snapshot.taxYear}. No se publican conclusiones afectadas.`;
    case "DEGRADED":
      return `Cobertura ${snapshot.taxYear} degradada. No se puede confirmar la vigencia de las fuentes.`;
    case "NO_COVERAGE":
      return `Sin cobertura fiscal validada para ${snapshot.taxYear}: ${snapshot.validatedUnits} de ${snapshot.targetUnits} unidades.`;
  }
}

export function calculateFiscalModelCoverage(
  input: FiscalModelCoverageInput,
): FiscalModelReadResult<FiscalModelCoverageSnapshot> {
  if (input.taxYear !== 2026) {
    return Object.freeze({
      status: "BLOCKED",
      reason:
        typeof input.taxYear === "number" && Number.isSafeInteger(input.taxYear)
          ? "UNSUPPORTED_TAX_YEAR"
          : "INVALID_INPUT",
    });
  }

  if (
    !isPositiveInteger(input.targetUnits) ||
    !isNonNegativeInteger(input.validatedUnits) ||
    !isNonNegativeInteger(input.pendingCriticalDiffs) ||
    !isNonNegativeInteger(input.degradedUnits) ||
    !isPositiveInteger(input.freshnessThresholdMs) ||
    !isIsoTimestamp(input.calculatedAt) ||
    !isNullableIsoTimestamp(input.lastSuccessfulSyncAt) ||
    !isNullableIsoTimestamp(input.lastFiscalReviewAt) ||
    !isSourceVerificationStatusArray(input.sourceVerificationStatuses) ||
    input.validatedUnits > input.targetUnits ||
    input.degradedUnits > input.targetUnits ||
    input.pendingCriticalDiffs > input.targetUnits ||
    input.targetUnits > MAX_COVERAGE_UNITS ||
    input.freshnessThresholdMs > MAX_FRESHNESS_THRESHOLD_MS
  ) {
    return Object.freeze({ status: "BLOCKED", reason: "INVALID_INPUT" });
  }

  const calculatedAtMs = Date.parse(input.calculatedAt);
  const lastSuccessfulSyncAtMs =
    input.lastSuccessfulSyncAt === null
      ? null
      : Date.parse(input.lastSuccessfulSyncAt);
  const lastFiscalReviewAtMs =
    input.lastFiscalReviewAt === null
      ? null
      : Date.parse(input.lastFiscalReviewAt);

  if (
    (lastSuccessfulSyncAtMs !== null &&
      lastSuccessfulSyncAtMs > calculatedAtMs) ||
    (lastFiscalReviewAtMs !== null && lastFiscalReviewAtMs > calculatedAtMs)
  ) {
    return Object.freeze({
      status: "BLOCKED",
      reason: "INCONSISTENT_VERSION",
    });
  }

  const reasons: FiscalModelManualReviewReason[] = [];
  const sourceStatuses = input.sourceVerificationStatuses;
  const hasChangedSource =
    sourceStatuses.includes("CHANGED") || sourceStatuses.includes("REPLACED");
  const hasUnavailableSource = sourceStatuses.includes("UNAVAILABLE");
  if (
    hasChangedSource !== (input.pendingCriticalDiffs > 0) ||
    hasUnavailableSource !== (input.degradedUnits > 0)
  ) {
    return Object.freeze({
      status: "BLOCKED",
      reason: "INCONSISTENT_VERSION",
    });
  }

  if (sourceStatuses.includes("HASH_PENDING")) {
    reasons.push("SOURCE_HASH_PENDING");
  }
  if (sourceStatuses.includes("UNAVAILABLE")) {
    reasons.push("SOURCE_UNAVAILABLE");
  }
  if (hasChangedSource) {
    reasons.push("SOURCE_CHANGED");
  }
  if (input.lastFiscalReviewAt === null) {
    reasons.push("FISCAL_REVIEW_MISSING");
  }
  const fiscalReviewIsStale =
    lastSuccessfulSyncAtMs !== null &&
    lastFiscalReviewAtMs !== null &&
    lastFiscalReviewAtMs < lastSuccessfulSyncAtMs;
  if (fiscalReviewIsStale) {
    reasons.push("FISCAL_REVIEW_STALE");
  }

  let status: FiscalModelCoverageStatus;
  if (input.pendingCriticalDiffs > 0) {
    status = "CHANGES_PENDING";
  } else if (input.degradedUnits > 0) {
    status = "DEGRADED";
    reasons.push("SOURCE_UNAVAILABLE");
  } else if (input.validatedUnits === 0) {
    status = "NO_COVERAGE";
    reasons.push("COVERAGE_INCOMPLETE");
  } else if (input.validatedUnits < input.targetUnits) {
    status = "PARTIAL";
    reasons.push("COVERAGE_INCOMPLETE");
  } else if (sourceStatuses.some((sourceStatus) => sourceStatus !== "VERIFIED")) {
    status = "PARTIAL";
  } else if (input.lastFiscalReviewAt === null || fiscalReviewIsStale) {
    status = "PARTIAL";
  } else if (lastSuccessfulSyncAtMs === null) {
    status = "DEGRADED";
    reasons.push("SOURCE_SYNC_MISSING");
  } else if (
    calculatedAtMs - lastSuccessfulSyncAtMs >
    input.freshnessThresholdMs
  ) {
    status = "DEGRADED";
    reasons.push("SOURCE_SYNC_STALE");
  } else {
    status = "CURRENT";
  }

  const baseSnapshot: CoverageMessageInput = Object.freeze({
    taxYear: input.taxYear,
    status,
    targetUnits: input.targetUnits,
    validatedUnits: input.validatedUnits,
    pendingUnits: input.targetUnits - input.validatedUnits,
    pendingCriticalDiffs: input.pendingCriticalDiffs,
    degradedUnits: input.degradedUnits,
    lastSuccessfulSyncAt: input.lastSuccessfulSyncAt,
    lastFiscalReviewAt: input.lastFiscalReviewAt,
    calculatedAt: input.calculatedAt,
  });
  const snapshot: FiscalModelCoverageSnapshot = Object.freeze({
    ...baseSnapshot,
    displayMessage: formatFiscalModelCoverageMessage(baseSnapshot),
  });

  if (status === "CURRENT") {
    return Object.freeze({ status: "OK", data: snapshot });
  }

  return Object.freeze({
    status: "MANUAL_REVIEW",
    data: snapshot,
    reasons: uniqueFrozenReasons(reasons),
  });
}
