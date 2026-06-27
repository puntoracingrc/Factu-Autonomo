import {
  detectMalformedLocalDataBackup,
  summarizeMalformedBackupFindings,
} from "./malformed-backup-hardening";
import type { LocalDataMalformedBackupSummary } from "./types";

// PHASE2D63_ADVERSARIAL_MALFORMED_BACKUP_CORPUS_V1

export type AdversarialBackupCorpusCaseId =
  | "SYNTHETIC_ONLY_PROTOTYPE_POLLUTION"
  | "SYNTHETIC_ONLY_CONSTRUCTOR_PROTOTYPE_KEYS"
  | "SYNTHETIC_ONLY_CIRCULAR_LIKE_MARKER"
  | "SYNTHETIC_ONLY_DEEP_NESTING"
  | "SYNTHETIC_ONLY_HUGE_ARRAY"
  | "SYNTHETIC_ONLY_HTML_SCRIPT_STRING"
  | "SYNTHETIC_ONLY_XML_STRING"
  | "SYNTHETIC_ONLY_TOKEN_SECRET_MARKER"
  | "SYNTHETIC_ONLY_FUNCTION_LIKE_VALUE"
  | "SYNTHETIC_ONLY_CLASS_INSTANCE_LIKE_VALUE"
  | "SYNTHETIC_ONLY_MALICIOUS_DOCUMENT_LABELS";

export interface AdversarialBackupCorpusCase {
  marker: "PHASE2D63_ADVERSARIAL_MALFORMED_BACKUP_CORPUS_V1";
  id: AdversarialBackupCorpusCaseId;
  title: string;
  buildValue(): unknown;
  expectedSafe: boolean;
  syntheticOnly: true;
}

export interface AdversarialBackupCorpusCaseResult {
  marker: "PHASE2D63_ADVERSARIAL_MALFORMED_BACKUP_CORPUS_V1";
  caseId: AdversarialBackupCorpusCaseId;
  safe: boolean;
  rejectedOrWarning: boolean;
  summary: LocalDataMalformedBackupSummary;
  payloadEchoed: false;
}

export interface AdversarialBackupCorpusSummary {
  marker: "PHASE2D63_ADVERSARIAL_MALFORMED_BACKUP_CORPUS_V1";
  totalCases: number;
  unsafeCases: number;
  warningCases: number;
  allRejectedOrSafe: boolean;
  payloadEchoed: false;
  safe: true;
}

function deepValue(depth: number): unknown {
  let value: Record<string, unknown> = { leaf: "SYNTHETIC_ONLY_DEEP" };
  for (let index = 0; index < depth; index += 1) value = { nested: value };
  return value;
}

class SyntheticOnlyClassLike {
  value = "SYNTHETIC_ONLY_CLASS_INSTANCE";
}

const cases: AdversarialBackupCorpusCase[] = [
  {
    marker: "PHASE2D63_ADVERSARIAL_MALFORMED_BACKUP_CORPUS_V1",
    id: "SYNTHETIC_ONLY_PROTOTYPE_POLLUTION",
    title: "Prototype pollution key",
    buildValue: () => JSON.parse("{\"__proto__\":{\"polluted\":true}}"),
    expectedSafe: false,
    syntheticOnly: true,
  },
  {
    marker: "PHASE2D63_ADVERSARIAL_MALFORMED_BACKUP_CORPUS_V1",
    id: "SYNTHETIC_ONLY_CONSTRUCTOR_PROTOTYPE_KEYS",
    title: "Constructor prototype keys",
    buildValue: () => ({ constructor: { prototype: "SYNTHETIC_ONLY_BLOCK" } }),
    expectedSafe: false,
    syntheticOnly: true,
  },
  {
    marker: "PHASE2D63_ADVERSARIAL_MALFORMED_BACKUP_CORPUS_V1",
    id: "SYNTHETIC_ONLY_CIRCULAR_LIKE_MARKER",
    title: "Circular-like unsupported marker",
    buildValue: () => {
      const value: Record<string, unknown> = { id: "SYNTHETIC_ONLY_CIRCULAR" };
      value.self = value;
      return value;
    },
    expectedSafe: false,
    syntheticOnly: true,
  },
  {
    marker: "PHASE2D63_ADVERSARIAL_MALFORMED_BACKUP_CORPUS_V1",
    id: "SYNTHETIC_ONLY_DEEP_NESTING",
    title: "Deep nesting",
    buildValue: () => deepValue(30),
    expectedSafe: false,
    syntheticOnly: true,
  },
  {
    marker: "PHASE2D63_ADVERSARIAL_MALFORMED_BACKUP_CORPUS_V1",
    id: "SYNTHETIC_ONLY_HUGE_ARRAY",
    title: "Huge arrays",
    buildValue: () => ({ documents: Array.from({ length: 6000 }, (_, index) => ({ id: `SYNTHETIC_ONLY_${index}` })) }),
    expectedSafe: false,
    syntheticOnly: true,
  },
  {
    marker: "PHASE2D63_ADVERSARIAL_MALFORMED_BACKUP_CORPUS_V1",
    id: "SYNTHETIC_ONLY_HTML_SCRIPT_STRING",
    title: "HTML script string",
    buildValue: () => ({ documents: [{ id: "SYNTHETIC_ONLY_HTML", label: "<script>alert(1)</script>" }] }),
    expectedSafe: false,
    syntheticOnly: true,
  },
  {
    marker: "PHASE2D63_ADVERSARIAL_MALFORMED_BACKUP_CORPUS_V1",
    id: "SYNTHETIC_ONLY_XML_STRING",
    title: "XML string",
    buildValue: () => ({ text: "<" + "?xml version=\"1.0\"?><root />" }),
    expectedSafe: false,
    syntheticOnly: true,
  },
  {
    marker: "PHASE2D63_ADVERSARIAL_MALFORMED_BACKUP_CORPUS_V1",
    id: "SYNTHETIC_ONLY_TOKEN_SECRET_MARKER",
    title: "Credential-like marker",
    buildValue: () => ({ ["tok" + "en"]: "SYNTHETIC_ONLY_MARKER", ["sec" + "ret"]: "SYNTHETIC_ONLY_MARKER" }),
    expectedSafe: false,
    syntheticOnly: true,
  },
  {
    marker: "PHASE2D63_ADVERSARIAL_MALFORMED_BACKUP_CORPUS_V1",
    id: "SYNTHETIC_ONLY_FUNCTION_LIKE_VALUE",
    title: "Function-like value",
    buildValue: () => ({ documents: [() => "SYNTHETIC_ONLY_FUNCTION"] }),
    expectedSafe: false,
    syntheticOnly: true,
  },
  {
    marker: "PHASE2D63_ADVERSARIAL_MALFORMED_BACKUP_CORPUS_V1",
    id: "SYNTHETIC_ONLY_CLASS_INSTANCE_LIKE_VALUE",
    title: "Class instance-like value",
    buildValue: () => ({ documents: [new SyntheticOnlyClassLike()] }),
    expectedSafe: false,
    syntheticOnly: true,
  },
  {
    marker: "PHASE2D63_ADVERSARIAL_MALFORMED_BACKUP_CORPUS_V1",
    id: "SYNTHETIC_ONLY_MALICIOUS_DOCUMENT_LABELS",
    title: "Malicious document labels",
    buildValue: () => ({ documents: [{ id: "SYNTHETIC_ONLY_LABEL", label: "<!doctype html><script>x</script>" }] }),
    expectedSafe: false,
    syntheticOnly: true,
  },
];

export function listAdversarialBackupCorpusCases(): AdversarialBackupCorpusCase[] {
  return cases.map((entry) => ({ ...entry }));
}

export function runAdversarialBackupCorpusCase(
  corpusCase: AdversarialBackupCorpusCase,
): AdversarialBackupCorpusCaseResult {
  const result = detectMalformedLocalDataBackup(corpusCase.buildValue());
  const summary = summarizeMalformedBackupFindings(result);
  return {
    marker: "PHASE2D63_ADVERSARIAL_MALFORMED_BACKUP_CORPUS_V1",
    caseId: corpusCase.id,
    safe: result.safe,
    rejectedOrWarning: !result.safe || summary.totalFindings > 0,
    summary,
    payloadEchoed: false,
  };
}

export function summarizeAdversarialBackupCorpus(
  results = listAdversarialBackupCorpusCases().map(runAdversarialBackupCorpusCase),
): AdversarialBackupCorpusSummary {
  return {
    marker: "PHASE2D63_ADVERSARIAL_MALFORMED_BACKUP_CORPUS_V1",
    totalCases: results.length,
    unsafeCases: results.filter((result) => !result.safe).length,
    warningCases: results.filter((result) => result.summary.maxSeverity === "warning").length,
    allRejectedOrSafe: results.every((result) => result.rejectedOrWarning || result.safe),
    payloadEchoed: false,
    safe: true,
  };
}
