import { normalizeDocumentUnitId } from "./document-units";

export function isAreaDocumentUnit(unitId?: string | null): boolean {
  return normalizeDocumentUnitId(unitId) === "m2";
}

export function areaQuantityFromDimensions(input: {
  width: number;
  height: number;
  roundingDecimals?: number;
}): number {
  if (
    !Number.isFinite(input.width) ||
    !Number.isFinite(input.height) ||
    input.width <= 0 ||
    input.height <= 0
  ) {
    return 0;
  }

  const decimals =
    typeof input.roundingDecimals === "number" &&
    Number.isFinite(input.roundingDecimals)
      ? Math.min(Math.max(Math.trunc(input.roundingDecimals), 0), 4)
      : 2;
  const factor = 10 ** decimals;
  return Math.round(input.width * input.height * factor) / factor;
}
