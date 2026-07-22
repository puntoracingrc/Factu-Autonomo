import { normalizeDocumentUnitId } from "./document-units";
import type { ProductCalculationKind } from "./types";

export interface LineMeasurementDraft {
  /** Ausente en borradores antiguos: se infiere de la unidad por compatibilidad. */
  kind?: ProductCalculationKind;
  pieces?: number;
  width?: number;
  height?: number;
  length?: number;
  roundingDecimals?: number;
}

export function isAreaDocumentUnit(unitId?: string | null): boolean {
  return normalizeDocumentUnitId(unitId) === "m2";
}

export function isLinearDocumentUnit(unitId?: string | null): boolean {
  const normalized = normalizeDocumentUnitId(unitId);
  return normalized === "ml" || normalized === "m";
}

export function isVolumeDocumentUnit(unitId?: string | null): boolean {
  return normalizeDocumentUnitId(unitId) === "m3";
}

export function inferredMeasurementKindForUnit(
  unitId?: string | null,
): ProductCalculationKind {
  if (isAreaDocumentUnit(unitId)) return "area";
  if (isLinearDocumentUnit(unitId)) return "linear";
  if (isVolumeDocumentUnit(unitId)) return "volume";
  return "none";
}

export function resolveLineMeasurementKind(
  unitId?: string | null,
  draft?: LineMeasurementDraft,
): ProductCalculationKind {
  if (
    draft?.kind === "none" ||
    draft?.kind === "linear" ||
    draft?.kind === "area" ||
    draft?.kind === "volume"
  ) {
    return draft.kind;
  }
  return inferredMeasurementKindForUnit(unitId);
}

export function isMeasuredCalculationKind(
  kind: ProductCalculationKind,
): boolean {
  return kind !== "none";
}

function positiveFinite(value: number | undefined): number {
  return Number.isFinite(value) && (value ?? 0) > 0 ? (value ?? 0) : 0;
}

function roundedQuantity(value: number, roundingDecimals?: number): number {
  const decimals =
    typeof roundingDecimals === "number" && Number.isFinite(roundingDecimals)
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
  if (positiveFinite(input.width) <= 0 || positiveFinite(input.height) <= 0) {
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
  if (positiveFinite(input.length) <= 0) return 0;
  return roundedQuantity(
    pieces * positiveFinite(input.length),
    input.roundingDecimals,
  );
}

export function volumeQuantityFromDimensions(input: {
  pieces?: number;
  length: number;
  width: number;
  height: number;
  roundingDecimals?: number;
}): number {
  const pieces = positiveFinite(input.pieces) || 1;
  if (
    positiveFinite(input.length) <= 0 ||
    positiveFinite(input.width) <= 0 ||
    positiveFinite(input.height) <= 0
  ) {
    return 0;
  }
  return roundedQuantity(
    pieces *
      positiveFinite(input.length) *
      positiveFinite(input.width) *
      positiveFinite(input.height),
    input.roundingDecimals,
  );
}

export function measurementQuantityForUnit(
  unitId: string | undefined,
  draft?: LineMeasurementDraft,
): number {
  if (!draft) return 0;
  const kind = resolveLineMeasurementKind(unitId, draft);
  if (kind === "area") {
    return areaQuantityFromDimensions({
      pieces: draft.pieces,
      width: draft.width ?? 0,
      height: draft.height ?? 0,
      roundingDecimals: draft.roundingDecimals,
    });
  }
  if (kind === "linear") {
    return linearQuantityFromMeasurement({
      pieces: draft.pieces,
      length: draft.length ?? 0,
      roundingDecimals: draft.roundingDecimals,
    });
  }
  if (kind === "volume") {
    return volumeQuantityFromDimensions({
      pieces: draft.pieces,
      length: draft.length ?? 0,
      width: draft.width ?? 0,
      height: draft.height ?? 0,
      roundingDecimals: draft.roundingDecimals,
    });
  }
  return 0;
}

function formatMeasurementNumber(value: number, roundingDecimals = 4): string {
  if (!Number.isFinite(value)) return "0";
  const decimals = Math.min(Math.max(Math.trunc(roundingDecimals), 0), 4);
  return value
    .toFixed(decimals)
    .replace(/(\.\d*[1-9])0+$/, "$1")
    .replace(/\.0+$/, "")
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
  const kind = resolveLineMeasurementKind(unitId, draft);
  const decimals = draft.roundingDecimals ?? 2;

  if (kind === "area") {
    const width = positiveFinite(draft.width);
    const height = positiveFinite(draft.height);
    const quantity = measurementQuantityForUnit(unitId, draft);
    if (width <= 0 || height <= 0 || quantity <= 0) return null;
    return `${piecesLabel(pieces)} x ${formatMeasurementNumber(
      width,
    )} x ${formatMeasurementNumber(height)} m ≈ ${formatMeasurementNumber(
      quantity,
      decimals,
    )} m²`;
  }

  if (kind === "linear") {
    const length = positiveFinite(draft.length);
    const quantity = measurementQuantityForUnit(unitId, draft);
    if (length <= 0 || quantity <= 0) return null;
    const outputUnit = normalizeDocumentUnitId(unitId) === "ml" ? "ml" : "m";
    return `${piecesLabel(pieces)} x ${formatMeasurementNumber(
      length,
    )} m ≈ ${formatMeasurementNumber(quantity, decimals)} ${outputUnit}`;
  }

  if (kind === "volume") {
    const length = positiveFinite(draft.length);
    const width = positiveFinite(draft.width);
    const height = positiveFinite(draft.height);
    const quantity = measurementQuantityForUnit(unitId, draft);
    if (length <= 0 || width <= 0 || height <= 0 || quantity <= 0) return null;
    return `${piecesLabel(pieces)} x ${formatMeasurementNumber(
      length,
    )} x ${formatMeasurementNumber(width)} x ${formatMeasurementNumber(
      height,
    )} m ≈ ${formatMeasurementNumber(quantity, decimals)} m³`;
  }

  return null;
}
