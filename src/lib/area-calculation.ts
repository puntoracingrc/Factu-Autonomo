import { normalizeDocumentUnitId } from "./document-units";

export interface LineMeasurementDraft {
  pieces?: number;
  width?: number;
  height?: number;
  length?: number;
}

export function isAreaDocumentUnit(unitId?: string | null): boolean {
  return normalizeDocumentUnitId(unitId) === "m2";
}

export function isLinearDocumentUnit(unitId?: string | null): boolean {
  const normalized = normalizeDocumentUnitId(unitId);
  return normalized === "ml" || normalized === "m";
}

function positiveFinite(value: number | undefined): number {
  return Number.isFinite(value) && (value ?? 0) > 0 ? value ?? 0 : 0;
}

function roundedQuantity(value: number, roundingDecimals?: number): number {
  const decimals =
    typeof roundingDecimals === "number" &&
    Number.isFinite(roundingDecimals)
      ? Math.min(Math.max(Math.trunc(roundingDecimals), 0), 4)
      : 2;
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

export function areaQuantityFromDimensions(input: {
  pieces?: number;
  width: number;
  height: number;
  roundingDecimals?: number;
}): number {
  const pieces = positiveFinite(input.pieces) || 1;
  if (
    pieces <= 0 ||
    positiveFinite(input.width) <= 0 ||
    positiveFinite(input.height) <= 0
  ) {
    return 0;
  }

  return roundedQuantity(
    pieces * positiveFinite(input.width) * positiveFinite(input.height),
    input.roundingDecimals,
  );
}

export function linearQuantityFromMeasurement(input: {
  pieces?: number;
  length: number;
  roundingDecimals?: number;
}): number {
  const pieces = positiveFinite(input.pieces) || 1;
  if (pieces <= 0 || positiveFinite(input.length) <= 0) return 0;
  return roundedQuantity(
    pieces * positiveFinite(input.length),
    input.roundingDecimals,
  );
}

export function measurementQuantityForUnit(
  unitId: string | undefined,
  draft?: LineMeasurementDraft,
): number {
  if (!draft) return 0;
  if (isAreaDocumentUnit(unitId)) {
    return areaQuantityFromDimensions({
      pieces: draft.pieces,
      width: draft.width ?? 0,
      height: draft.height ?? 0,
      roundingDecimals: 2,
    });
  }
  if (isLinearDocumentUnit(unitId)) {
    return linearQuantityFromMeasurement({
      pieces: draft.pieces,
      length: draft.length ?? 0,
      roundingDecimals: 2,
    });
  }
  return 0;
}

function formatMeasurementNumber(value: number): string {
  if (!Number.isFinite(value)) return "0";
  return value
    .toFixed(2)
    .replace(/(\.\d*[1-9])0+$/, "$1")
    .replace(/\.00$/, "")
    .replace(".", ",");
}

function piecesLabel(pieces: number): string {
  const formatted = formatMeasurementNumber(pieces);
  return `${formatted} ${pieces === 1 ? "ud" : "uds"}`;
}

export function lineMeasurementDescriptionSuffix(
  unitId: string | undefined,
  draft?: LineMeasurementDraft,
): string | null {
  if (!draft) return null;
  const pieces = positiveFinite(draft.pieces) || 1;

  if (isAreaDocumentUnit(unitId)) {
    const width = positiveFinite(draft.width);
    const height = positiveFinite(draft.height);
    const quantity = measurementQuantityForUnit(unitId, draft);
    if (width <= 0 || height <= 0 || quantity <= 0) return null;
    return `${piecesLabel(pieces)} x ${formatMeasurementNumber(
      width,
    )} x ${formatMeasurementNumber(height)} m = ${formatMeasurementNumber(
      quantity,
    )} m²`;
  }

  if (isLinearDocumentUnit(unitId)) {
    const length = positiveFinite(draft.length);
    const quantity = measurementQuantityForUnit(unitId, draft);
    if (length <= 0 || quantity <= 0) return null;
    const outputUnit = normalizeDocumentUnitId(unitId) === "ml" ? "ml" : "m";
    return `${piecesLabel(pieces)} x ${formatMeasurementNumber(
      length,
    )} m = ${formatMeasurementNumber(quantity)} ${outputUnit}`;
  }

  return null;
}
