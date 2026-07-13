import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AppDataDurabilityResult } from "@/lib/app-data-durability";
import {
  DEFAULT_PROFILE,
  EMPTY_DATA,
  type AppData,
  type Document,
  type DocumentSnapshot,
} from "@/lib/types";

const engine = vi.hoisted(() => ({
  apply: vi.fn(),
  rollback: vi.fn(),
  inspect: vi.fn(),
  inspectCollection: vi.fn(),
}));

const evidence = vi.hoisted(() => ({
  usable: vi.fn(),
}));

vi.mock("./app-issued-recovery", () => ({
  applyAppIssuedDocumentRecovery: engine.apply,
  rollbackAppIssuedDocumentRecovery: engine.rollback,
  inspectAppIssuedDocumentRecovery: engine.inspect,
  inspectAppIssuedDocumentRecoveryCollection: engine.inspectCollection,
}));

vi.mock("./legacy-import-attestation", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("./legacy-import-attestation")>();
  return {
    ...actual,
    inspectUsableHistoricalDocumentEvidence: evidence.usable,
  };
});

import {
  runAppIssuedDocumentRecoveryCommand,
  runAppIssuedDocumentRecoveryRollbackCommand,
  type AppIssuedDocumentRecoveryPreview,
  type AppIssuedDocumentRecoveryRollbackPreview,
} from "./app-issued-recovery-command";
import { withDocumentRelationshipIntegritySignals } from "./relationships";
import {
  buildDocumentPdfSnapshot,
  buildDocumentSnapshot,
  buildDocumentSnapshotSeal,
} from "./snapshots";

const NOW = "2026-07-13T12:00:00.000Z";

const FISCAL_SNAPSHOT = {
  documentType: "factura",
  documentKind: "factura",
  number: "F-TEST-9001",
  date: "2026-07-06",
  issuer: { name: "Emisor sintético", nif: "B12345678" },
  customer: { name: "Cliente sintético", nif: "B87654321" },
  items: [],
  taxSummary: { subtotal: 100, iva: 21, total: 121 },
} as unknown as DocumentSnapshot;

function data(marker: string): AppData {
  return {
    ...EMPTY_DATA,
    profile: { ...EMPTY_DATA.profile, name: marker },
  };
}

function recoveryDocument(input?: {
  id?: string;
  status?: "applied" | "rolled_back";
  number?: string;
}): Document {
  const id = input?.id ?? "recovered-document";
  const snapshot = {
    ...FISCAL_SNAPSHOT,
    number: input?.number ?? FISCAL_SNAPSHOT.number,
  };
  return {
    id,
    type: "factura",
    number: snapshot.number,
    date: snapshot.date,
    client: snapshot.customer,
    items: [],
    status: "enviado",
    documentLifecycle: "issued",
    integrityLock: "locked",
    createdAt: NOW,
    updatedAt: NOW,
    appIssuedRecoveryAttestation: {
      schemaVersion: 1,
      kind: "app_issued_document_recovery",
      recoveryKind: "pre_canonical_rectification_v1",
      repairId: `repair:${id}`,
      status: input?.status ?? "applied",
      documentId: id,
      role: "rectification",
      counterpartDocumentId: "synthetic-counterpart",
      groupFingerprint: "sha256:group",
      acceptedState: {} as never,
      beforeEvidence: {} as never,
      beforeFingerprint: "sha256:before",
      afterFingerprint: "sha256:after",
      recoveredSnapshot: snapshot,
      events: [
        {
          action: input?.status === "rolled_back" ? "rolled_back" : "applied",
          at: NOW,
        },
      ],
      attestationHash: "sha256:attestation",
    },
  } as Document;
}

function externalFiscalDuplicate(): Document {
  const base: Document = {
    id: "external-duplicate",
    type: "factura",
    number: FISCAL_SNAPSHOT.number,
    date: FISCAL_SNAPSHOT.date,
    client: FISCAL_SNAPSHOT.customer,
    items: [
      {
        id: "external-line",
        description: "Servicio sintético",
        quantity: 1,
        unitPrice: 100,
        ivaPercent: 21,
      },
    ],
    status: "enviado",
    documentLifecycle: "issued",
    integrityLock: "locked",
    createdAt: NOW,
    updatedAt: NOW,
    issuedAt: NOW,
    snapshotIntegrityRequired: true,
  };
  const profile = {
    ...DEFAULT_PROFILE,
    name: "Emisor sintético",
    nif: FISCAL_SNAPSHOT.issuer.nif,
    address: "Calle Sintética 1",
    postalCode: "28001",
    city: "Madrid",
  };
  const documentSnapshot = buildDocumentSnapshot(base, profile, {
    capturedAt: NOW,
    source: "issue",
  });
  const pdfSnapshot = buildDocumentPdfSnapshot(documentSnapshot, profile, NOW);
  return {
    ...base,
    issuer: documentSnapshot.issuer,
    documentSnapshot,
    pdfSnapshot,
    snapshotSeal: buildDocumentSnapshotSeal(
      base.id,
      documentSnapshot,
      pdfSnapshot,
    ),
  };
}

function applyPreviewFor(documentId: string) {
  return {
    schemaVersion: 1,
    precondition: "sha256:apply-target",
    candidates: [
      {
        members: [{ documentId }],
        documentIds: [documentId],
        repairIds: [`repair:${documentId}`],
      },
    ],
  } as unknown as AppIssuedDocumentRecoveryPreview;
}

function rollbackPreviewFor(documentId: string) {
  return {
    schemaVersion: 1,
    precondition: "sha256:rollback-target",
    candidates: [
      {
        documentIds: [documentId],
        repairIds: [`repair:${documentId}`],
      },
    ],
  } as unknown as AppIssuedDocumentRecoveryRollbackPreview;
}

function appliedCommitSpy() {
  const calls = vi.fn();
  const commit = <T>(
    expected: AppData,
    build: (previous: AppData) => { data: AppData; value: T },
  ): AppDataDurabilityResult<T> => {
    calls(expected, build);
    const transition = build(expected);
    return {
      status: "applied",
      data: transition.data,
      value: transition.value,
      replayed: false,
    };
  };
  return { calls, commit };
}

describe("app-issued-recovery-command", () => {
  beforeEach(() => {
    engine.apply.mockReset();
    engine.rollback.mockReset();
    engine.inspect.mockReset();
    engine.inspectCollection.mockReset();
    evidence.usable.mockReset();
    engine.inspect.mockImplementation((document: Document) => {
      const attestation = document.appIssuedRecoveryAttestation;
      if (!attestation || !attestation.recoveredSnapshot) {
        return { ok: false, issues: ["app_issued_recovery_invalid"] };
      }
      return {
        ok: true,
        active: attestation.status === "applied",
        kind: attestation.recoveryKind,
        snapshot: attestation.recoveredSnapshot,
        attestation,
      };
    });
    engine.inspectCollection.mockImplementation((documents: Document[]) => {
      const claimed = documents.filter(
        (document) => document.appIssuedRecoveryAttestation,
      );
      return {
        claimedDocumentIds: new Set(claimed.map((document) => document.id)),
        validDocumentIds: new Set(
          claimed
            .filter(
              (document) =>
                document.appIssuedRecoveryAttestation?.status === "applied",
            )
            .map((document) => document.id),
        ),
        issuesByDocumentId: new Map<string, string[]>(),
      };
    });
    evidence.usable.mockImplementation((document: Document) => {
      if (
        document.snapshotIntegrity?.issues.includes(
          "document_relationship_invalid",
        )
      ) {
        return { ok: false, issues: ["document_relationship_invalid"] };
      }
      const snapshot =
        document.appIssuedRecoveryAttestation?.recoveredSnapshot ??
        document.documentSnapshot;
      return snapshot
        ? { ok: true, kind: "app_issued_pdf_recovered", snapshot }
        : { ok: false, issues: ["document_snapshot_missing"] };
    });
  });

  it("entrega el apply completo a un único commit durable", () => {
    const expected = data("before");
    const recovered = data("after");
    const preview = {
      schemaVersion: 1,
      precondition: "sha256:apply",
    } as unknown as AppIssuedDocumentRecoveryPreview;
    engine.apply.mockReturnValue({
      status: "applied",
      data: recovered,
      appliedRepairIds: ["repair:invoice-rectification"],
    });
    const { calls, commit } = appliedCommitSpy();

    const result = runAppIssuedDocumentRecoveryCommand({
      expected,
      preview,
      now: NOW,
      commit,
    });

    expect(engine.apply).toHaveBeenCalledTimes(1);
    expect(engine.apply).toHaveBeenCalledWith(expected, preview, NOW);
    expect(calls).toHaveBeenCalledTimes(1);
    expect(calls.mock.calls[0]?.[0]).toBe(expected);
    expect(result).toEqual({
      status: "applied",
      data: recovered,
      value: { appliedRepairIds: ["repair:invoice-rectification"] },
      replayed: false,
    });
    expect(expected.profile.name).toBe("before");
  });

  it("entrega el rollback y su auditoría a un único commit durable", () => {
    const expected = data("recovered");
    const restored = data("restored");
    const preview = {
      schemaVersion: 1,
      precondition: "sha256:rollback",
    } as unknown as AppIssuedDocumentRecoveryRollbackPreview;
    engine.rollback.mockReturnValue({
      status: "applied",
      data: restored,
      rolledBackRepairIds: ["repair:receipt"],
    });
    const { calls, commit } = appliedCommitSpy();

    const result = runAppIssuedDocumentRecoveryRollbackCommand({
      expected,
      preview,
      now: NOW,
      commit,
    });

    expect(engine.rollback).toHaveBeenCalledTimes(1);
    expect(engine.rollback).toHaveBeenCalledWith(expected, preview, NOW);
    expect(calls).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      status: "applied",
      data: restored,
      value: { rolledBackRepairIds: ["repair:receipt"] },
      replayed: false,
    });
  });

  it.each([
    ["apply", "stale_preview"],
    ["rollback", "candidate_invalid"],
  ] as const)(
    "no persiste un %s bloqueado por el dominio",
    (action, reason) => {
      const expected = data("unchanged");
      const commit = vi.fn();
      const preview = {
        schemaVersion: 1,
        precondition: `sha256:${action}`,
      };

      if (action === "apply") {
        engine.apply.mockReturnValue({ status: "blocked", reason });
        expect(
          runAppIssuedDocumentRecoveryCommand({
            expected,
            preview: preview as unknown as AppIssuedDocumentRecoveryPreview,
            now: NOW,
            commit,
          }),
        ).toEqual({ status: "blocked", reason });
      } else {
        engine.rollback.mockReturnValue({ status: "blocked", reason });
        expect(
          runAppIssuedDocumentRecoveryRollbackCommand({
            expected,
            preview:
              preview as unknown as AppIssuedDocumentRecoveryRollbackPreview,
            now: NOW,
            commit,
          }),
        ).toEqual({ status: "blocked", reason });
      }

      expect(commit).not.toHaveBeenCalled();
      expect(expected.profile.name).toBe("unchanged");
    },
  );

  it.each([
    { status: "blocked", reason: "quota_exceeded" },
    { status: "indeterminate", reason: "storage_state_unknown" },
  ] as const)(
    "propaga $status del commit sin publicar por una ruta alternativa",
    (outcome) => {
      const expected = data("before");
      const recovered = data("candidate-not-published");
      const preview = {
        schemaVersion: 1,
        precondition: "sha256:durability",
      } as unknown as AppIssuedDocumentRecoveryPreview;
      engine.apply.mockReturnValue({
        status: "applied",
        data: recovered,
        appliedRepairIds: ["repair:durability"],
      });
      const commitCalls = vi.fn();
      const commit = <T>(
        baseline: AppData,
        build: (previous: AppData) => { data: AppData; value: T },
      ): AppDataDurabilityResult<T> => {
        commitCalls(baseline, build);
        return outcome as AppDataDurabilityResult<T>;
      };

      expect(
        runAppIssuedDocumentRecoveryCommand({
          expected,
          preview,
          now: NOW,
          commit,
        }),
      ).toEqual(outcome);
      expect(commitCalls).toHaveBeenCalledTimes(1);
      expect(expected.profile.name).toBe("before");
    },
  );

  it("bloquea antes de persistir cuando el grafo global detecta un duplicado fiscal externo", () => {
    const recovered = recoveryDocument();
    const expected = {
      ...data("before"),
      documents: [recovered, externalFiscalDuplicate()],
    };
    const preview = applyPreviewFor(recovered.id);
    const globallySignaled = withDocumentRelationshipIntegritySignals(
      expected.documents,
    );
    expect(
      globallySignaled.find((document) => document.id === recovered.id)
        ?.snapshotIntegrity?.issues,
    ).toContain("document_relationship_invalid");
    engine.apply.mockReturnValue({
      status: "applied",
      data: expected,
      appliedRepairIds: [recovered.appIssuedRecoveryAttestation!.repairId],
    });
    const commit = vi.fn();

    expect(
      runAppIssuedDocumentRecoveryCommand({
        expected,
        preview,
        now: NOW,
        commit,
      }),
    ).toEqual({ status: "blocked", reason: "candidate_invalid" });

    expect(commit).not.toHaveBeenCalled();
    expect(
      evidence.usable.mock.calls.some((call) => {
        const document = call[0] as Document;
        return (
          document.id === recovered.id &&
          document.snapshotIntegrity?.issues.includes(
            "document_relationship_invalid",
          )
        );
      }),
    ).toBe(true);
  });

  it("resuelve un replay apply idéntico sin invocar persistencia", () => {
    const recovered = recoveryDocument();
    const expected = { ...data("already-applied"), documents: [recovered] };
    const preview = applyPreviewFor(recovered.id);
    engine.apply.mockReturnValue({
      status: "applied",
      data: expected,
      appliedRepairIds: [],
    });
    const commit = vi.fn();

    expect(
      runAppIssuedDocumentRecoveryCommand({
        expected,
        preview,
        now: NOW,
        commit,
      }),
    ).toEqual({
      status: "applied",
      data: expected,
      value: { appliedRepairIds: [] },
      replayed: true,
    });
    expect(commit).not.toHaveBeenCalled();
    expect(evidence.usable).toHaveBeenCalled();
  });

  it("resuelve un replay rollback idéntico sin invocar persistencia", () => {
    const rolledBack = {
      ...recoveryDocument({ status: "rolled_back" }),
      snapshotIntegrity: {
        status: "blocked" as const,
        issues: ["document_relationship_invalid" as const],
      },
    };
    const expected = {
      ...data("already-rolled-back"),
      documents: [rolledBack],
    };
    const preview = rollbackPreviewFor(rolledBack.id);
    engine.rollback.mockReturnValue({
      status: "applied",
      data: expected,
      rolledBackRepairIds: [],
    });
    const commit = vi.fn();

    expect(
      runAppIssuedDocumentRecoveryRollbackCommand({
        expected,
        preview,
        now: NOW,
        commit,
      }),
    ).toEqual({
      status: "applied",
      data: expected,
      value: { rolledBackRepairIds: [] },
      replayed: true,
    });
    expect(commit).not.toHaveBeenCalled();
    expect(engine.inspectCollection).toHaveBeenCalled();
    expect(engine.inspect).toHaveBeenCalledWith(
      expect.objectContaining({ id: rolledBack.id }),
    );
  });
});
