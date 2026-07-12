export const FISCAL_NOTIFICATION_INPUT_LIMITS = Object.freeze({
  maxOwnerScopeChars: 160,
  maxIdChars: 160,
  maxPages: 80,
  maxTextChars: 500_000,
  maxWorkspaceTextChars: 5_000_000,
  maxCollectionItems: 10_000,
  maxWorkspaceEntities: 50_000,
  maxEvidenceIds: 128,
  maxRelationKeys: 32,
  maxProjectionFacts: 1_000,
} as const);

export type FiscalNotificationInputErrorCode =
  | "INVALID_INPUT"
  | "OWNER_SCOPE_REQUIRED"
  | "OWNER_SCOPE_MISMATCH"
  | "INVALID_ID"
  | "INVALID_AMOUNT"
  | "TOO_MANY_PAGES"
  | "TEXT_TOO_LARGE"
  | "COLLECTION_LIMIT_EXCEEDED"
  | "TOO_MANY_EVIDENCE_IDS"
  | "ABORTED";

export class FiscalNotificationInputError extends Error {
  constructor(
    readonly code: FiscalNotificationInputErrorCode,
    readonly path: string,
  ) {
    super(`FISCAL_NOTIFICATION_INPUT_ERROR:${code}`);
    this.name = "FiscalNotificationInputError";
  }
}

export interface BoundedAdministrativePage {
  readonly pageNumber: number;
  readonly text: string;
  readonly isBlank: boolean;
}

export interface BoundedDocumentInput {
  readonly ownerScope: string;
  readonly documentId: string;
  readonly pages: readonly BoundedAdministrativePage[];
  readonly signal?: AbortSignal;
}

const CONTROL_CHARACTER_PATTERN = /[\u0000-\u001f\u007f-\u009f]/u;
const DOCUMENT_INPUT_KEYS = new Set([
  "ownerScope",
  "documentId",
  "pages",
  "signal",
]);
const PAGE_INPUT_KEYS = new Set(["pageNumber", "text", "isBlank"]);

export function assertBoundedOwnerScope(
  value: unknown,
  path: string,
): asserts value is string {
  assertStrictBoundedString(
    value,
    path,
    FISCAL_NOTIFICATION_INPUT_LIMITS.maxOwnerScopeChars,
    "OWNER_SCOPE_REQUIRED",
  );
}

export function assertBoundedId(
  value: unknown,
  path: string,
): asserts value is string {
  assertStrictBoundedString(
    value,
    path,
    FISCAL_NOTIFICATION_INPUT_LIMITS.maxIdChars,
    "INVALID_ID",
  );
}

export function assertBoundedIdList(
  value: unknown,
  path: string,
  max: number = FISCAL_NOTIFICATION_INPUT_LIMITS.maxCollectionItems,
): asserts value is readonly string[] {
  try {
  if (!Number.isSafeInteger(max) || max < 0 || max > FISCAL_NOTIFICATION_INPUT_LIMITS.maxCollectionItems) {
    throw new FiscalNotificationInputError("INVALID_INPUT", path);
  }
  const items = snapshotDataArray(
    value,
    path,
    max,
    max === FISCAL_NOTIFICATION_INPUT_LIMITS.maxEvidenceIds
      ? "TOO_MANY_EVIDENCE_IDS"
      : "COLLECTION_LIMIT_EXCEEDED",
  );

  const seen = new Set<string>();
  for (let index = 0; index < items.length; index += 1) {
    const itemPath = `${path}[${index}]`;
    const item = items[index];
    assertBoundedId(item, itemPath);
    if (seen.has(item)) {
      throw new FiscalNotificationInputError("INVALID_ID", itemPath);
    }
    seen.add(item);
  }
  if (!isFrozenArray(value)) {
    throw new FiscalNotificationInputError("INVALID_INPUT", path);
  }
  } catch (error) {
    if (error instanceof FiscalNotificationInputError) throw error;
    throw new FiscalNotificationInputError("INVALID_INPUT", path);
  }
}

export function assertNonNegativeIntegerCents(
  value: unknown,
  path: string,
): asserts value is number {
  if (!Number.isSafeInteger(value) || Number(value) < 0) {
    throw new FiscalNotificationInputError("INVALID_AMOUNT", path);
  }
}

export function assertNotAborted(signal?: AbortSignal): void {
  try {
    if (signal?.aborted) {
      throw new FiscalNotificationInputError("ABORTED", "signal");
    }
  } catch (error) {
    if (error instanceof FiscalNotificationInputError) throw error;
    throw new FiscalNotificationInputError("INVALID_INPUT", "signal");
  }
}

export function assertBoundedDocumentInput(
  value: unknown,
): asserts value is BoundedDocumentInput {
  try {
  const input = snapshotDataRecord(value);
  if (!input) {
    throw new FiscalNotificationInputError("INVALID_INPUT", "$");
  }
  assertKnownKeys(input, DOCUMENT_INPUT_KEYS, "$");

  const signal = input.signal;
  if (signal !== undefined && !isAbortSignal(signal)) {
    throw new FiscalNotificationInputError("INVALID_INPUT", "signal");
  }
  assertNotAborted(signal);
  assertBoundedOwnerScope(input.ownerScope, "ownerScope");
  assertBoundedId(input.documentId, "documentId");

  const pages = snapshotDataArray(
    input.pages,
    "pages",
    FISCAL_NOTIFICATION_INPUT_LIMITS.maxPages,
    "TOO_MANY_PAGES",
  );
  if (pages.length === 0) {
    throw new FiscalNotificationInputError("INVALID_INPUT", "pages");
  }

  let totalTextChars = 0;
  for (let index = 0; index < pages.length; index += 1) {
    assertNotAborted(signal);
    const pagePath = `pages[${index}]`;
    const page = snapshotDataRecord(pages[index]);
    if (!page) {
      throw new FiscalNotificationInputError("INVALID_INPUT", pagePath);
    }
    assertKnownKeys(page, PAGE_INPUT_KEYS, pagePath);
    if (!Number.isSafeInteger(page.pageNumber) || page.pageNumber !== index + 1) {
      throw new FiscalNotificationInputError(
        "INVALID_INPUT",
        `${pagePath}.pageNumber`,
      );
    }
    if (typeof page.text !== "string") {
      throw new FiscalNotificationInputError("INVALID_INPUT", `${pagePath}.text`);
    }
    if (typeof page.isBlank !== "boolean") {
      throw new FiscalNotificationInputError(
        "INVALID_INPUT",
        `${pagePath}.isBlank`,
      );
    }
    totalTextChars += page.text.length;
    if (totalTextChars > FISCAL_NOTIFICATION_INPUT_LIMITS.maxTextChars) {
      throw new FiscalNotificationInputError("TEXT_TOO_LARGE", "pages");
    }
  }
  assertNotAborted(signal);
  if (
    !isFrozenRecord(value) ||
    !isFrozenArray(input.pages) ||
    pages.some((page) => !isFrozenRecord(page))
  ) {
    throw new FiscalNotificationInputError("INVALID_INPUT", "$frozen");
  }
  } catch (error) {
    if (error instanceof FiscalNotificationInputError) throw error;
    throw new FiscalNotificationInputError("INVALID_INPUT", "$");
  }
}

function isFrozenRecord(value: unknown): boolean {
  try {
    return (
      value !== null &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      Object.isFrozen(value)
    );
  } catch {
    return false;
  }
}

function isFrozenArray(value: unknown): boolean {
  try {
    return Array.isArray(value) && Object.isFrozen(value);
  } catch {
    return false;
  }
}

function assertStrictBoundedString(
  value: unknown,
  path: string,
  maxChars: number,
  code: "OWNER_SCOPE_REQUIRED" | "INVALID_ID",
): asserts value is string {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length > maxChars ||
    value !== value.trim() ||
    CONTROL_CHARACTER_PATTERN.test(value)
  ) {
    throw new FiscalNotificationInputError(code, path);
  }
}

function assertKnownKeys(
  value: Record<string, unknown>,
  allowedKeys: ReadonlySet<string>,
  path: string,
): void {
  for (const key of Reflect.ownKeys(value)) {
    if (typeof key !== "string" || !allowedKeys.has(key)) {
      throw new FiscalNotificationInputError(
        "INVALID_INPUT",
        path === "$" ? "$.$unknown" : `${path}.$unknown`,
      );
    }
  }
}

function isAbortSignal(value: unknown): value is AbortSignal {
  try {
    return (
      value !== null &&
      typeof value === "object" &&
      typeof (value as AbortSignal).aborted === "boolean" &&
      typeof (value as AbortSignal).addEventListener === "function" &&
      typeof (value as AbortSignal).removeEventListener === "function"
    );
  } catch {
    return false;
  }
}

function snapshotDataRecord(value: unknown): Record<string, unknown> | null {
  try {
    if (value === null || typeof value !== "object" || Array.isArray(value)) {
      return null;
    }
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) return null;
    const snapshot: Record<string, unknown> = Object.create(null);
    for (const key of Reflect.ownKeys(value)) {
      if (typeof key !== "string") return null;
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (!descriptor || !("value" in descriptor)) return null;
      snapshot[key] = descriptor.value;
    }
    return snapshot;
  } catch {
    return null;
  }
}

function snapshotDataArray(
  value: unknown,
  path: string,
  max: number,
  limitCode:
    | "TOO_MANY_PAGES"
    | "TOO_MANY_EVIDENCE_IDS"
    | "COLLECTION_LIMIT_EXCEEDED",
): readonly unknown[] {
  try {
    if (!Array.isArray(value)) {
      throw new FiscalNotificationInputError("INVALID_INPUT", path);
    }
    if (Object.getPrototypeOf(value) !== Array.prototype) {
      throw new FiscalNotificationInputError("INVALID_INPUT", path);
    }
    const lengthDescriptor = Object.getOwnPropertyDescriptor(value, "length");
    if (
      !lengthDescriptor ||
      !("value" in lengthDescriptor) ||
      !Number.isSafeInteger(lengthDescriptor.value) ||
      Number(lengthDescriptor.value) < 0
    ) {
      throw new FiscalNotificationInputError("INVALID_INPUT", path);
    }
    const length = Number(lengthDescriptor.value);
    if (length > max) {
      throw new FiscalNotificationInputError(limitCode, path);
    }
    for (const key of Reflect.ownKeys(value)) {
      if (key === "length") continue;
      if (typeof key !== "string" || !/^(?:0|[1-9]\d*)$/u.test(key)) {
        throw new FiscalNotificationInputError("INVALID_INPUT", path);
      }
      const index = Number(key);
      if (!Number.isSafeInteger(index) || index < 0 || index >= length) {
        throw new FiscalNotificationInputError("INVALID_INPUT", path);
      }
    }
    const snapshot: unknown[] = new Array(length);
    for (let index = 0; index < length; index += 1) {
      const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
      if (!descriptor || !("value" in descriptor)) {
        throw new FiscalNotificationInputError("INVALID_INPUT", path);
      }
      snapshot[index] = descriptor.value;
    }
    return Object.freeze(snapshot);
  } catch (error) {
    if (error instanceof FiscalNotificationInputError) throw error;
    throw new FiscalNotificationInputError("INVALID_INPUT", path);
  }
}
