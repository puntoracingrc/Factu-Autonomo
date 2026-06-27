import { describe, expect, it } from "vitest";
import {
  listAdversarialBackupCorpusCases,
  runAdversarialBackupCorpusCase,
  summarizeAdversarialBackupCorpus,
} from "./adversarial-backup-corpus";

// PHASE2D63_ADVERSARIAL_MALFORMED_BACKUP_CORPUS_V1

describe("adversarial malformed backup corpus", () => {
  it("runs all adversarial cases as rejected or safe without payload echo", () => {
    const cases = listAdversarialBackupCorpusCases();
    const results = cases.map(runAdversarialBackupCorpusCase);
    const summary = summarizeAdversarialBackupCorpus(results);

    expect(cases.length).toBeGreaterThanOrEqual(11);
    expect(summary.totalCases).toBe(cases.length);
    expect(summary.allRejectedOrSafe).toBe(true);
    expect(summary.payloadEchoed).toBe(false);
    expect(results.every((result) => result.payloadEchoed === false)).toBe(true);
  });

  it("blocks prototype pollution markers without mutating Object prototype", () => {
    const prototypeCase = listAdversarialBackupCorpusCases().find((entry) => entry.id === "SYNTHETIC_ONLY_PROTOTYPE_POLLUTION");
    expect(prototypeCase).toBeDefined();
    const result = runAdversarialBackupCorpusCase(prototypeCase!);

    expect(result.safe).toBe(false);
    expect(result.summary.findingCodes).toContain("UNSAFE_KEY");
    expect(({} as { polluted?: boolean }).polluted).toBeUndefined();
  });
});
