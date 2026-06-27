import { describe, expect, it } from "vitest";
import { LocalDataSafetyError } from "./errors";
import {
  assertSafeParsedLocalDataBackupObject,
  detectMalformedLocalDataBackup,
  summarizeMalformedBackupFindings,
} from "./malformed-backup-hardening";

// PHASE2D17_MALFORMED_BACKUP_HARDENING_V1

describe("malformed backup hardening", () => {
  it("accepts a plain synthetic backup object", () => {
    const backup = { documents: [{ id: "SYNTHETIC_ONLY_doc_1", status: "borrador" }] };
    const result = detectMalformedLocalDataBackup(backup);

    expect(result.safe).toBe(true);
    expect(assertSafeParsedLocalDataBackupObject(backup)).toBe(backup);
  });

  it("detects prototype pollution keys", () => {
    const backup = JSON.parse('{"documents":[],"__proto__":{"polluted":true}}') as unknown;
    const result = detectMalformedLocalDataBackup(backup);

    expect(result.safe).toBe(false);
    expect(result.findings.map((finding) => finding.code)).toContain("UNSAFE_KEY");
  });

  it("detects circular refs, deep objects, arrays and unexpected instances", () => {
    const circular: Record<string, unknown> = { documents: [] };
    circular.self = circular;
    const tooDeep = { a: { b: { c: { d: true } } } };
    const hugeArray = { documents: new Array(4).fill({ id: "SYNTHETIC_ONLY_doc" }) };

    expect(detectMalformedLocalDataBackup(circular).findings.map((finding) => finding.code)).toContain(
      "CIRCULAR_REFERENCE",
    );
    expect(detectMalformedLocalDataBackup(tooDeep, { maxDepth: 2 }).findings.map((finding) => finding.code)).toContain(
      "TOO_DEEP",
    );
    expect(detectMalformedLocalDataBackup(hugeArray, { maxArrayLength: 2 }).findings.map((finding) => finding.code)).toContain(
      "ARRAY_TOO_LARGE",
    );
    expect(detectMalformedLocalDataBackup({ exportedAt: new Date() }).findings.map((finding) => finding.code)).toContain(
      "UNEXPECTED_INSTANCE",
    );
  });

  it("detects functions and suspicious strings without echoing payload", () => {
    const result = detectMalformedLocalDataBackup({
      documents: [{ id: "SYNTHETIC_ONLY_doc_1", render: () => "nope" }],
      note: "<script>alert(1)</script>",
    });
    const summary = summarizeMalformedBackupFindings(result);

    expect(summary.safe).toBe(false);
    expect(summary.findingCodes).toContain("UNEXPECTED_FUNCTION");
    expect(summary.findingCodes).toContain("SUSPICIOUS_STRING");
    expect(JSON.stringify(summary)).not.toContain("alert");
  });

  it("throws a typed error for unsafe parsed objects", () => {
    expect(() => assertSafeParsedLocalDataBackupObject({ apiToken: "SYNTHETIC_ONLY_token" })).toThrow(
      LocalDataSafetyError,
    );
  });
});
