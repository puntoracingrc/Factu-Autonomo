import { describe, expect, it } from "vitest";
import {
  inspectLocalDataBackupIntakeCandidate,
  summarizeLocalDataBackupIntake,
} from "./backup-intake";

// PHASE2D11_BACKUP_FILE_INTAKE_CONTRACT_V1

describe("backup intake contract", () => {
  it("accepts a synthetic json candidate without reading a file", () => {
    const result = inspectLocalDataBackupIntakeCandidate(
      {
        fileName: "factura-autonomo-copia-2026-06-27.json",
        mimeType: "application/json",
        byteLength: 512,
        parsedObject: { documents: [] },
      },
      { inspectedAt: "2026-06-27T00:00:00.000Z" },
    );

    expect(result.accepted).toBe(true);
    expect(result.candidate.parsedObjectPresent).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it("rejects forbidden extensions and suspicious names", () => {
    const result = inspectLocalDataBackupIntakeCandidate({
      fileName: "../private.zip",
      mimeType: "application/json",
      byteLength: 10,
      parsedObject: { documents: [] },
    });

    expect(result.accepted).toBe(false);
    expect(result.errors.map((entry) => entry.code)).toContain("SUSPICIOUS_FILE_NAME");
    expect(result.errors.map((entry) => entry.code)).toContain("FORBIDDEN_EXTENSION");
  });

  it("rejects oversized candidates and odd mime types", () => {
    const result = inspectLocalDataBackupIntakeCandidate(
      {
        fileName: "backup.json",
        mimeType: "text/plain",
        byteLength: 20,
        parsedObject: { documents: [] },
      },
      { maxBytes: 8 },
    );

    expect(result.accepted).toBe(false);
    expect(result.errors.map((entry) => entry.code)).toContain("BACKUP_TOO_LARGE");
    expect(result.errors.map((entry) => entry.code)).toContain("UNEXPECTED_MIME_TYPE");
  });

  it("returns a safe summary without content echo", () => {
    const result = inspectLocalDataBackupIntakeCandidate({
      fileName: "backup.json",
      mimeType: "application/json",
      byteLength: 20,
      parsedObject: { documents: [{ id: "SYNTHETIC_ONLY_doc_1" }] },
    });

    const summary = summarizeLocalDataBackupIntake(result);
    expect(summary.accepted).toBe(true);
    expect(JSON.stringify(summary)).not.toContain("SYNTHETIC_ONLY_doc_1");
  });
});
