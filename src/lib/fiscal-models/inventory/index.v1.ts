import type {
  AeatOfficialModelInventoryListResultV1,
  AeatOfficialModelInventoryRecordV1,
  AeatOfficialModelInventoryResultV1,
} from "./contracts.v1";
import {
  AEAT_OFFICIAL_INDEX_RELEASE_V1,
  type AeatOfficialModelCodeV1,
} from "./official-aeat-index.release.v1";

type ParsedObject = Record<string, unknown>;

const OFFICIAL_MODEL_CODE_PATTERN =
  /^(?:\d{2,3}|\d{2}[A-Z]|[A-Z]\d{2})$/;

const recordsByCode = new Map(
  AEAT_OFFICIAL_INDEX_RELEASE_V1.records.map(
    (record) => [record.code, record] as const,
  ),
);

const inventoryIsConsistent =
  AEAT_OFFICIAL_INDEX_RELEASE_V1.rows.length === 218 &&
  AEAT_OFFICIAL_INDEX_RELEASE_V1.records.length === 228 &&
  recordsByCode.size === AEAT_OFFICIAL_INDEX_RELEASE_V1.records.length;

function parseExactObject(
  value: unknown,
  allowedKeys: readonly string[],
): ParsedObject | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;

  try {
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) return null;

    const parsed: ParsedObject = Object.create(null) as ParsedObject;
    const allowed = new Set(allowedKeys);
    for (const key of Reflect.ownKeys(value)) {
      if (typeof key !== "string" || !allowed.has(key)) return null;
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (!descriptor || !descriptor.enumerable || !("value" in descriptor)) {
        return null;
      }
      parsed[key] = descriptor.value;
    }
    return parsed;
  } catch {
    return null;
  }
}

function cloneRecord(
  record: AeatOfficialModelInventoryRecordV1<AeatOfficialModelCodeV1>,
): AeatOfficialModelInventoryRecordV1<AeatOfficialModelCodeV1> {
  return Object.freeze({
    ...record,
    sourceGroupCodes: Object.freeze([...record.sourceGroupCodes]) as readonly [
      string,
      ...string[],
    ],
  });
}

function blocked(
  reason: "INVALID_INPUT" | "MODEL_NOT_FOUND" | "INCONSISTENT_INVENTORY",
): Extract<
  AeatOfficialModelInventoryResultV1<AeatOfficialModelCodeV1>,
  { status: "BLOCKED" }
> {
  return Object.freeze({ status: "BLOCKED", reason });
}

export function listOfficialAeatModelInventoryV1(): AeatOfficialModelInventoryListResultV1<AeatOfficialModelCodeV1> {
  if (!inventoryIsConsistent) {
    return Object.freeze({
      status: "BLOCKED",
      reason: "INCONSISTENT_INVENTORY",
    });
  }

  return Object.freeze({
    status: "REVIEW_ONLY",
    data: Object.freeze(
      AEAT_OFFICIAL_INDEX_RELEASE_V1.records.map(cloneRecord),
    ),
  });
}

export function getOfficialAeatModelInventoryV1(
  input: unknown,
): AeatOfficialModelInventoryResultV1<AeatOfficialModelCodeV1> {
  const parsed = parseExactObject(input, ["code"]);
  if (!parsed || typeof parsed.code !== "string") {
    return blocked("INVALID_INPUT");
  }
  if (!OFFICIAL_MODEL_CODE_PATTERN.test(parsed.code)) {
    return blocked("INVALID_INPUT");
  }
  if (!inventoryIsConsistent) return blocked("INCONSISTENT_INVENTORY");

  const record = recordsByCode.get(parsed.code as AeatOfficialModelCodeV1);
  if (!record) return blocked("MODEL_NOT_FOUND");
  return Object.freeze({ status: "REVIEW_ONLY", data: cloneRecord(record) });
}
