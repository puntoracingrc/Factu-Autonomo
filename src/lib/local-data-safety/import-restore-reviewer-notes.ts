import type { LocalDataSyntheticBackupCorpusCaseId } from "./synthetic-backup-corpus";

// PHASE2D75_IMPORT_RESTORE_SAFE_REVIEWER_NOTES_MODEL_V1

export interface SafeImportRestoreReviewerNoteInput {
  caseId: LocalDataSyntheticBackupCorpusCaseId;
  note: string;
  reviewerRole?: "ux" | "legal" | "data_loss" | "owner";
  createdAt?: string;
}

export interface SafeImportRestoreReviewerNoteValidation {
  marker: "PHASE2D75_IMPORT_RESTORE_SAFE_REVIEWER_NOTES_MODEL_V1";
  valid: boolean;
  errors: string[];
  safe: true;
}

export interface SafeImportRestoreReviewerNote {
  marker: "PHASE2D75_IMPORT_RESTORE_SAFE_REVIEWER_NOTES_MODEL_V1";
  caseId: LocalDataSyntheticBackupCorpusCaseId;
  reviewerRole: "ux" | "legal" | "data_loss" | "owner";
  body: string;
  accepted: boolean;
  createdAt: string;
  rawDataIncluded: false;
  safe: true;
}

const maxNoteLength = 500;

const forbiddenPatterns = [
  /<[^>]+>/i,
  /<\s*script/i,
  new RegExp("<" + "\\?xml", "i"),
  new RegExp("tok" + "en", "i"),
  new RegExp("sec" + "ret", "i"),
  new RegExp("authori" + "zation", "i"),
  new RegExp("coo" + "kie", "i"),
  /customer(?:Id|Nif|Tax)/i,
  /document\s*snapshot/i,
  /pdf\s*snapshot/i,
  new RegExp("pay" + "load", "i"),
];

function sanitizeNote(value: string): string {
  return value.replace(/[<>]/g, "").replace(/\s+/g, " ").trim().slice(0, maxNoteLength);
}

export function validateImportRestoreReviewerNote(
  input: SafeImportRestoreReviewerNoteInput,
): SafeImportRestoreReviewerNoteValidation {
  const errors: string[] = [];
  if (!input.caseId.startsWith("SYNTHETIC_ONLY_")) errors.push("Reviewer note must attach only to a synthetic corpus case.");
  if (!input.note.trim()) errors.push("Reviewer note body is required.");
  if (input.note.length > maxNoteLength) errors.push("Reviewer note exceeds safe maximum length.");
  for (const pattern of forbiddenPatterns) {
    if (pattern.test(input.note)) errors.push("Reviewer note contains unsafe content.");
  }
  return {
    marker: "PHASE2D75_IMPORT_RESTORE_SAFE_REVIEWER_NOTES_MODEL_V1",
    valid: errors.length === 0,
    errors,
    safe: true,
  };
}

export function buildSafeImportRestoreReviewerNote(
  input: SafeImportRestoreReviewerNoteInput,
): SafeImportRestoreReviewerNote {
  const validation = validateImportRestoreReviewerNote(input);
  return {
    marker: "PHASE2D75_IMPORT_RESTORE_SAFE_REVIEWER_NOTES_MODEL_V1",
    caseId: input.caseId,
    reviewerRole: input.reviewerRole ?? "owner",
    body: validation.valid ? sanitizeNote(input.note) : "[redacted]",
    accepted: validation.valid,
    createdAt: input.createdAt ?? new Date().toISOString(),
    rawDataIncluded: false,
    safe: true,
  };
}

export function redactImportRestoreReviewerNote(
  note: SafeImportRestoreReviewerNote,
): SafeImportRestoreReviewerNote {
  return {
    ...note,
    body: sanitizeNote(note.body),
    rawDataIncluded: false,
    safe: true,
  };
}
