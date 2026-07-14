import { sha256Hex } from "@/lib/document-integrity/snapshot-hash";
import type { Document } from "@/lib/types";

export type TestDocumentRetirementReadinessBlocker =
  | "auth_loading"
  | "cloud_disabled"
  | "session_missing"
  | "email_unconfirmed"
  | "demo_workspace"
  | "local_handoff_pending"
  | "sync_not_current"
  | "pending_changes"
  | "never_synced"
  | "mfa_check_pending"
  | "mfa_session_required";

export interface TestDocumentRetirementReadinessInput {
  authReady: boolean;
  cloudEnabled: boolean;
  userId?: string | null;
  emailConfirmed: boolean;
  demoMode: boolean;
  localDataHandoffStatus: "none" | "pending" | "kept_local" | "syncing";
  syncStatus:
    | "disabled"
    | "offline"
    | "idle"
    | "pending"
    | "syncing"
    | "synced"
    | "error";
  pendingUpload: boolean;
  pendingChangeCount: number;
  lastSyncedAt?: string;
  mfaReady: boolean;
  currentAal?: string | null;
  nextAal?: string | null;
}

export interface ExactDocumentNumberResolution {
  numbers: string[];
  selectedDocumentIds: string[];
  unknownNumbers: string[];
  ambiguousNumbers: string[];
  duplicateNumbers: string[];
}

export function testDocumentRetirementTenantFingerprint(
  userId: string,
): string {
  const normalized = userId.trim();
  if (!normalized) return "";
  return `sha256:${sha256Hex(`test-document-retirement-owner:v1:${normalized}`)}`;
}

export function testDocumentRetirementReadiness(
  input: TestDocumentRetirementReadinessInput,
): {
  ready: boolean;
  blockers: TestDocumentRetirementReadinessBlocker[];
} {
  const blockers: TestDocumentRetirementReadinessBlocker[] = [];
  if (!input.authReady) blockers.push("auth_loading");
  if (!input.cloudEnabled) blockers.push("cloud_disabled");
  if (!input.userId?.trim()) blockers.push("session_missing");
  if (!input.emailConfirmed) blockers.push("email_unconfirmed");
  if (input.demoMode) blockers.push("demo_workspace");
  if (input.localDataHandoffStatus !== "none") {
    blockers.push("local_handoff_pending");
  }
  if (input.syncStatus !== "synced") blockers.push("sync_not_current");
  if (input.pendingUpload || input.pendingChangeCount > 0) {
    blockers.push("pending_changes");
  }
  if (!input.lastSyncedAt) blockers.push("never_synced");
  if (!input.mfaReady) blockers.push("mfa_check_pending");
  if (input.nextAal === "aal2" && input.currentAal !== "aal2") {
    blockers.push("mfa_session_required");
  }
  return { ready: blockers.length === 0, blockers };
}

export function parseExactDocumentNumbers(value: string): {
  numbers: string[];
  duplicateNumbers: string[];
} {
  const numbers: string[] = [];
  const duplicateNumbers: string[] = [];
  const seen = new Set<string>();
  for (const part of value.split(/[\n,;]+/u)) {
    const number = part.trim();
    if (!number) continue;
    if (seen.has(number)) {
      if (!duplicateNumbers.includes(number)) duplicateNumbers.push(number);
      continue;
    }
    seen.add(number);
    numbers.push(number);
  }
  return { numbers, duplicateNumbers };
}

export function resolveExactDocumentNumbers(
  documents: readonly Pick<Document, "id" | "number">[],
  value: string,
): ExactDocumentNumberResolution {
  const parsed = parseExactDocumentNumbers(value);
  const selectedDocumentIds: string[] = [];
  const unknownNumbers: string[] = [];
  const ambiguousNumbers: string[] = [];

  for (const number of parsed.numbers) {
    const matches = documents.filter((document) => document.number === number);
    if (matches.length === 0) {
      unknownNumbers.push(number);
    } else if (matches.length !== 1) {
      ambiguousNumbers.push(number);
    } else {
      selectedDocumentIds.push(matches[0]!.id);
    }
  }

  return {
    numbers: parsed.numbers,
    selectedDocumentIds,
    unknownNumbers,
    ambiguousNumbers,
    duplicateNumbers: parsed.duplicateNumbers,
  };
}

export function testDocumentRetirementSelectionCode(
  selectionFingerprint: string,
): string {
  const match = /^sha256:([a-f0-9]{64})$/u.exec(selectionFingerprint);
  return match ? match[1]!.slice(0, 8).toUpperCase() : "";
}

export function testDocumentRetirementConfirmationPhrase(
  count: number,
  selectionFingerprint: string,
): string {
  const code = testDocumentRetirementSelectionCode(selectionFingerprint);
  return Number.isInteger(count) && count > 0 && code
    ? `RETIRAR ${count} PRUEBAS ${code}`
    : "";
}

export function testDocumentRetirementRollbackPhrase(
  selectionFingerprint: string,
): string {
  const code = testDocumentRetirementSelectionCode(selectionFingerprint);
  return code ? `RESTAURAR LOTE ${code}` : "";
}

export function maskAccountEmail(email: string | null | undefined): string {
  if (!email) return "Cuenta sin email visible";
  const [local = "", domain = ""] = email.trim().split("@");
  if (!local || !domain) return "Cuenta identificada";
  const visibleLocal = local.length <= 2 ? local.slice(0, 1) : local.slice(0, 2);
  return `${visibleLocal}${"•".repeat(Math.max(3, local.length - visibleLocal.length))}@${domain}`;
}
