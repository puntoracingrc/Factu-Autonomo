import { describe, expect, it } from "vitest";
import { createBackupBlob, readBackupFile } from "@/lib/backup";
import { normalizeLoadedData } from "@/lib/storage";
import { EMPTY_DATA, type AppData } from "@/lib/types";
import {
  appIssuedRecoveryBackupProofKey,
  appIssuedRecoveryExportableDataFingerprint,
  isAppIssuedRecoveryActionReady,
  isAppIssuedRecoveryBackupFileSizeAllowed,
  verifyAppIssuedRecoveryBackup,
  type AppIssuedRecoveryBackupProof,
} from "./app-issued-document-recovery-gate";

function makeData(name = "Empresa de prueba"): AppData {
  return normalizeLoadedData({
    ...EMPTY_DATA,
    profile: { ...EMPTY_DATA.profile, name },
    documents: [],
    expenses: [],
    recurringExpenses: [],
    userReminders: [],
    suppliers: [],
    products: [],
    customers: [],
    counters: { ...EMPTY_DATA.counters },
  });
}

const data = makeData();
const proof: AppIssuedRecoveryBackupProof<AppData> = {
  action: "apply",
  candidateKey: "candidate:one",
  precondition: "sha256:preview-one",
  data,
  filename: "factu-autonomo-backup-2026-07-13.json",
  exportableDataFingerprint: appIssuedRecoveryExportableDataFingerprint(data),
};
const proofKey = appIssuedRecoveryBackupProofKey(proof);

type GateInput = Parameters<typeof isAppIssuedRecoveryActionReady<AppData>>[0];

function gate(overrides: Partial<GateInput> = {}) {
  return isAppIssuedRecoveryActionReady({
    action: "apply",
    candidateKey: proof.candidateKey,
    precondition: proof.precondition,
    currentData: data,
    proof,
    verifiedBackupProofKey: proofKey,
    confirmedBackupProofKey: proofKey,
    confirmedGroupPrecondition: proof.precondition,
    requiredDocumentIds: ["invoice", "receipt"],
    confirmedDocumentIds: ["invoice", "receipt"],
    affectedCount: 2,
    requiredPdfCount: 0,
    unknownCandidateCount: 0,
    busy: false,
    storageStateUnknown: false,
    ...overrides,
  });
}

describe("app-issued recovery backup verification", () => {
  it("rechaza un JSON arbitrariamente grande antes de leerlo", () => {
    expect(isAppIssuedRecoveryBackupFileSizeAllowed(25 * 1024 * 1024)).toBe(
      true,
    );
    expect(isAppIssuedRecoveryBackupFileSizeAllowed(25 * 1024 * 1024 + 1)).toBe(
      false,
    );
  });

  it("verifica una copia portable que se puede releer y coincide con el estado exportable", async () => {
    const blob = createBackupBlob(data, "2026-07-13T19:42:00.000Z");
    const imported = await readBackupFile(
      new File([blob], proof.filename, { type: "application/json" }),
    );

    expect(
      verifyAppIssuedRecoveryBackup({
        action: "apply",
        candidateKey: proof.candidateKey,
        precondition: proof.precondition,
        currentData: data,
        proof,
        importedData: imported,
      }),
    ).toEqual({ status: "verified", proofKey });
  });

  it("rechaza una copia corrupta o perteneciente a otro estado", () => {
    expect(
      verifyAppIssuedRecoveryBackup({
        action: "apply",
        candidateKey: proof.candidateKey,
        precondition: proof.precondition,
        currentData: data,
        proof,
        importedData: { error: "JSON inválido" },
      }),
    ).toEqual({ status: "blocked", reason: "invalid_backup" });

    expect(
      verifyAppIssuedRecoveryBackup({
        action: "apply",
        candidateKey: proof.candidateKey,
        precondition: proof.precondition,
        currentData: data,
        proof,
        importedData: makeData("Otra empresa"),
      }),
    ).toEqual({ status: "blocked", reason: "backup_mismatch" });
  });

  it("rechaza una prueba obsoleta si cambian datos, scope o precondición", () => {
    expect(
      verifyAppIssuedRecoveryBackup({
        action: "apply",
        candidateKey: proof.candidateKey,
        precondition: proof.precondition,
        currentData: makeData(),
        proof,
        importedData: data,
      }),
    ).toEqual({ status: "blocked", reason: "stale_backup" });
    expect(
      verifyAppIssuedRecoveryBackup({
        action: "apply",
        candidateKey: "candidate:two",
        precondition: proof.precondition,
        currentData: data,
        proof,
        importedData: data,
      }),
    ).toEqual({ status: "blocked", reason: "stale_backup" });
    expect(
      verifyAppIssuedRecoveryBackup({
        action: "apply",
        candidateKey: proof.candidateKey,
        precondition: "sha256:preview-two",
        currentData: data,
        proof,
        importedData: data,
      }),
    ).toEqual({ status: "blocked", reason: "stale_backup" });
  });
});

describe("app-issued recovery UI gate", () => {
  it("abre únicamente con copia verificada y conservada, grupo y todos sus documentos", () => {
    expect(gate()).toBe(true);
    expect(gate({ verifiedBackupProofKey: null })).toBe(false);
    expect(gate({ confirmedBackupProofKey: null })).toBe(false);
    expect(gate({ confirmedDocumentIds: ["invoice"] })).toBe(false);
    expect(gate({ confirmedGroupPrecondition: null })).toBe(false);
  });

  it("permanece cerrado cuando la descarga o la relectura falla", () => {
    expect(
      gate({
        proof: null,
        verifiedBackupProofKey: null,
        confirmedBackupProofKey: null,
      }),
    ).toBe(false);
    expect(gate({ verifiedBackupProofKey: "otra-copia" })).toBe(false);
  });

  it("invalida la copia si cambia la identidad de datos o la precondición", () => {
    expect(gate({ currentData: makeData() })).toBe(false);
    expect(gate({ precondition: "sha256:preview-two" })).toBe(false);
  });

  it("bloquea una segunda acción y el estado durable desconocido", () => {
    expect(gate({ busy: true })).toBe(false);
    expect(gate({ storageStateUnknown: true })).toBe(false);
  });

  it("bloquea PDF pendiente, candidateKey desconocido y scope vacío", () => {
    expect(gate({ requiredPdfCount: 1 })).toBe(false);
    expect(gate({ unknownCandidateCount: 1 })).toBe(false);
    expect(gate({ affectedCount: 0 })).toBe(false);
  });
});
