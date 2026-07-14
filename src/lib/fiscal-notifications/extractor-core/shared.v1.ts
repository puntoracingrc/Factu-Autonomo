import {
  FISCAL_NOTIFICATION_INPUT_LIMITS,
  FiscalNotificationInputError,
  assertBoundedId,
} from "../input-contract";

export const FISCAL_NOTIFICATION_EXTRACTOR_CORE_VERSION_V1 = "1.0.0" as const;
export const FISCAL_NOTIFICATION_EXTRACTOR_CORE_RELEASE_V1 =
  "fiscal-notification-extractor-core.2026-07-14.v1" as const;

export interface SourceCoordinatesV1 {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface SourceLocationV1 {
  readonly sourceDocumentId: string;
  readonly sourcePage: number;
  readonly sourceLabel: string | null;
  readonly sourceCoordinates: SourceCoordinatesV1 | null;
}

export function assertConfidenceV1(value: unknown, path: string): asserts value is number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 1) {
    throw new FiscalNotificationInputError("INVALID_INPUT", path);
  }
}

export function assertPageNumberV1(value: unknown, path: string): asserts value is number {
  if (
    !Number.isSafeInteger(value) ||
    Number(value) < 1 ||
    Number(value) > FISCAL_NOTIFICATION_INPUT_LIMITS.maxPages
  ) {
    throw new FiscalNotificationInputError("INVALID_INPUT", path);
  }
}

export function assertBoundedLiteralV1(
  value: unknown,
  path: string,
  options: Readonly<{ maxChars: number; nullable?: boolean }> ,
): asserts value is string | null {
  if (options.nullable && value === null) return;
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length > options.maxChars ||
    value.trim() !== value ||
    /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f]/u.test(value)
  ) {
    throw new FiscalNotificationInputError("INVALID_INPUT", path);
  }
}

export function assertBoundedRawTextV1(
  value: unknown,
  path: string,
  maxChars: number,
): asserts value is string {
  if (
    typeof value !== "string" ||
    value.trim().length === 0 ||
    value.length > maxChars ||
    /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f]/u.test(value)
  ) {
    throw new FiscalNotificationInputError("INVALID_INPUT", path);
  }
}

export function assertExactDataRecordV1(
  value: unknown,
  path: string,
  keys: readonly string[],
): asserts value is Record<string, unknown> {
  if (!isPlainRecordV1(value) || !hasExactKeysV1(value, keys)) {
    throw new FiscalNotificationInputError("INVALID_INPUT", `${path}.$shape`);
  }
  const descriptors = Object.getOwnPropertyDescriptors(value);
  if (
    keys.some((key) => {
      const descriptor = descriptors[key];
      return descriptor === undefined || !("value" in descriptor) || descriptor.enumerable !== true;
    })
  ) {
    throw new FiscalNotificationInputError("INVALID_INPUT", `${path}.$shape`);
  }
}

export function assertSourceCoordinatesV1(
  value: unknown,
  path: string,
): asserts value is SourceCoordinatesV1 | null {
  if (value === null) return;
  if (!isPlainRecordV1(value) || !hasExactKeysV1(value, ["x", "y", "width", "height"])) {
    throw new FiscalNotificationInputError("INVALID_INPUT", path);
  }
  for (const key of ["x", "y", "width", "height"] as const) {
    const coordinate = value[key];
    if (typeof coordinate !== "number" || !Number.isFinite(coordinate) || coordinate < 0 || coordinate > 1) {
      throw new FiscalNotificationInputError("INVALID_INPUT", `${path}.${key}`);
    }
  }
  const coordinates = value as unknown as SourceCoordinatesV1;
  if (
    coordinates.x + coordinates.width > 1 ||
    coordinates.y + coordinates.height > 1
  ) {
    throw new FiscalNotificationInputError("INVALID_INPUT", path);
  }
}

export function assertSourceLocationV1(
  value: Readonly<SourceLocationV1>,
  path: string,
): void {
  assertBoundedId(value.sourceDocumentId, `${path}.sourceDocumentId`);
  assertPageNumberV1(value.sourcePage, `${path}.sourcePage`);
  assertBoundedLiteralV1(value.sourceLabel, `${path}.sourceLabel`, {
    maxChars: 240,
    nullable: true,
  });
  assertSourceCoordinatesV1(value.sourceCoordinates, `${path}.sourceCoordinates`);
}

export function freezeCoordinatesV1(
  value: SourceCoordinatesV1 | null,
): SourceCoordinatesV1 | null {
  return value === null ? null : Object.freeze({ ...value });
}

export function freezeUniqueIdsV1(
  value: readonly string[],
  path: string,
  max = 256,
): readonly string[] {
  if (!Array.isArray(value) || value.length > max) {
    throw new FiscalNotificationInputError("COLLECTION_LIMIT_EXCEEDED", path);
  }
  const ownKeys = Reflect.ownKeys(value);
  if (
    ownKeys.some((key) => typeof key !== "string" || (key !== "length" && !/^(?:0|[1-9]\d*)$/u.test(key))) ||
    ownKeys.length !== value.length + 1
  ) {
    throw new FiscalNotificationInputError("INVALID_INPUT", path);
  }
  const seen = new Set<string>();
  const output: string[] = [];
  for (let index = 0; index < value.length; index += 1) {
    const id = value[index];
    assertBoundedId(id, `${path}[${index}]`);
    if (seen.has(id)) {
      throw new FiscalNotificationInputError("INVALID_ID", `${path}[${index}]`);
    }
    seen.add(id);
    output.push(id);
  }
  return Object.freeze(output);
}

export function isPlainRecordV1(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

export function hasExactKeysV1(
  value: Record<string, unknown>,
  keys: readonly string[],
): boolean {
  const ownKeys = Reflect.ownKeys(value);
  if (ownKeys.some((key) => typeof key !== "string") || ownKeys.length !== keys.length) return false;
  const expected = new Set(keys);
  return ownKeys.every((key) => typeof key === "string" && expected.has(key));
}
