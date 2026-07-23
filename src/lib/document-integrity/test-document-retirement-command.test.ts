import { beforeEach, describe, expect, it, vi } from "vitest";
import { EMPTY_DATA, type AppData } from "@/lib/types";

const engine = vi.hoisted(() => ({
  apply: vi.fn(),
  rollback: vi.fn(),
  exportableFingerprint: vi.fn(() => `sha256:${"e".repeat(64)}`),
}));

vi.mock("./test-document-retirement", async () => {
  const actual = await vi.importActual<
    typeof import("./test-document-retirement")
  >("./test-document-retirement");
  return {
    ...actual,
    applyTestDocumentRetirement: engine.apply,
    rollbackTestDocumentRetirement: engine.rollback,
    testDocumentRetirementExportableDataFingerprint:
      engine.exportableFingerprint,
  };
});

import {
  runTestDocumentRetirementCommand,
  runTestDocumentRetirementRollbackCommand,
  runTestDocumentRetirementRollbackWithSafetyCopy,
  runTestDocumentRetirementWithSafetyCopy,
} from "./test-document-retirement-command";
import type {
  TestDocumentRetirementPreview,
  TestDocumentRetirementRollbackPreview,
} from "./test-document-retirement";

const NOW = "2026-07-14T06:30:00.000Z";
const TENANT = `sha256:${"b".repeat(64)}`;
const BACKUP = {
  filename:
    "factu-autonomo-backup-antes-retirar-pruebas-2026-07-14-06-30-00.json",
  createdAt: NOW,
  exportableDataFingerprint: `sha256:${"e".repeat(64)}`,
  contentSha256: `sha256:${"c".repeat(64)}`,
  byteLength: 1_024,
  disposition: "browser_download_requested" as const,
};
const preview = {
  schemaVersion: 1,
  precondition: `sha256:${"1".repeat(64)}`,
  selectionFingerprint: `sha256:${"2".repeat(64)}`,
  selectedDocumentIds: ["synthetic-document"],
  affectedCount: 1,
  candidate: {} as never,
  blockers: [],
} satisfies TestDocumentRetirementPreview;
const rollbackPreview = {
  schemaVersion: 1,
  precondition: `sha256:${"3".repeat(64)}`,
  batchId: "synthetic-batch",
  affectedCount: 1,
  candidate: {} as never,
  blockers: [],
  alreadyRolledBack: false,
} satisfies TestDocumentRetirementRollbackPreview;

describe("durable test document retirement command", () => {
  beforeEach(() => {
    engine.apply.mockReset();
    engine.rollback.mockReset();
    engine.exportableFingerprint.mockClear();
  });

  it("entrega apply al único commit durable", () => {
    const expected = { ...EMPTY_DATA };
    const candidate = { ...EMPTY_DATA, documents: [] };
    engine.apply.mockReturnValue({
      status: "applied",
      data: candidate,
      batchId: "synthetic-batch",
    });
    const commit = vi.fn((_expected, build) => {
      const transition = build(expected);
      return {
        status: "applied" as const,
        data: transition.data,
        value: transition.value,
        replayed: false,
      };
    });

    const result = runTestDocumentRetirementCommand({
      expected,
      preview,
      tenantFingerprint: TENANT,
      backup: BACKUP,
      now: NOW,
      commit,
    });

    expect(engine.apply).toHaveBeenCalledWith(
      expected,
      preview,
      NOW,
      TENANT,
      BACKUP,
    );
    expect(commit).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({
      status: "applied",
      value: { batchId: "synthetic-batch" },
      replayed: false,
    });
  });

  it("no persiste un bloqueo de dominio y reconoce replay idéntico", () => {
    const expected = { ...EMPTY_DATA };
    const commit = vi.fn();
    engine.apply.mockReturnValueOnce({
      status: "blocked",
      reason: "candidate_invalid",
    });
    expect(
      runTestDocumentRetirementCommand({
        expected,
        preview,
        tenantFingerprint: TENANT,
        backup: BACKUP,
        now: NOW,
        commit,
      }),
    ).toEqual({ status: "blocked", reason: "candidate_invalid" });

    engine.apply.mockReturnValueOnce({
      status: "already_applied",
      data: expected,
      batchId: "synthetic-batch",
    });
    expect(
      runTestDocumentRetirementCommand({
        expected,
        preview,
        tenantFingerprint: TENANT,
        backup: BACKUP,
        now: NOW,
        commit,
      }),
    ).toMatchObject({ status: "applied", replayed: true });
    expect(commit).not.toHaveBeenCalled();
  });

  it("entrega rollback al mismo commit durable", () => {
    const expected = { ...EMPTY_DATA };
    engine.rollback.mockReturnValue({
      status: "applied",
      data: expected,
      batchId: "synthetic-batch",
    });
    const commit = vi.fn((_expected, build) => {
      const transition = build(expected);
      return {
        status: "applied" as const,
        data: transition.data,
        value: transition.value,
        replayed: false,
      };
    });

    expect(
      runTestDocumentRetirementRollbackCommand({
        expected,
        preview: rollbackPreview,
        tenantFingerprint: TENANT,
        backup: BACKUP,
        now: NOW,
        commit,
      }),
    ).toMatchObject({ status: "applied", replayed: false });
    expect(engine.rollback).toHaveBeenCalledWith(
      expected,
      rollbackPreview,
      NOW,
      TENANT,
      BACKUP,
    );
    expect(commit).toHaveBeenCalledTimes(1);
  });
});

describe("test document retirement safety copy boundary", () => {
  const fixedDate = new Date(NOW);

  it("descarga el estado exacto y aplica sin ceder el control", () => {
    const expected = { ...EMPTY_DATA };
    const order: string[] = [];
    const apply = vi.fn((commandInput: unknown) => {
      expect(commandInput).toBeDefined();
      return {
        status: "applied" as const,
        data: expected,
        value: { batchId: "synthetic-batch" },
        replayed: false,
      };
    });
    const result = runTestDocumentRetirementWithSafetyCopy({
      getCurrent: () => expected,
      downloadCurrent: (current, createdAt) => {
        order.push("backup");
        expect(current).toBe(expected);
        expect(createdAt).toEqual(fixedDate);
        return {
          ok: true,
          filename: BACKUP.filename,
          contentSha256: BACKUP.contentSha256,
          byteLength: BACKUP.byteLength,
          disposition: BACKUP.disposition,
        };
      },
      preview,
      tenantFingerprint: TENANT,
      apply: (input) => {
        order.push("apply");
        expect(input.backup).toEqual(BACKUP);
        return apply(input);
      },
      now: () => fixedDate,
    });

    expect(order).toEqual(["backup", "apply"]);
    expect(result).toMatchObject({
      status: "action_attempted",
      safetyCopyFilename: BACKUP.filename,
      result: { status: "applied" },
    });
  });

  it("bloquea si la descarga falla o cambia el dominio de negocio vigente", () => {
    const expected = { ...EMPTY_DATA };
    const changed = {
      ...EMPTY_DATA,
      documents: [
        {
          id: "changed-document",
          type: "factura" as const,
          number: "F-CHANGED",
          date: "2026-07-23",
          client: { name: "Cliente" },
          items: [],
          status: "borrador" as const,
          createdAt: "2026-07-23T07:00:00.000Z",
          updatedAt: "2026-07-23T07:00:00.000Z",
        },
      ],
    };
    const apply = vi.fn();
    expect(
      runTestDocumentRetirementWithSafetyCopy({
        getCurrent: () => expected,
        downloadCurrent: () => ({ ok: false, error: "download_failed" }),
        preview,
        tenantFingerprint: TENANT,
        apply,
      }),
    ).toEqual({ status: "backup_failed", error: "download_failed" });

    expect(
      runTestDocumentRetirementWithSafetyCopy({
        getCurrent: () => expected,
        downloadCurrent: () => ({
          ok: true,
          filename: BACKUP.filename,
          contentSha256: "sha256:invalid",
          byteLength: BACKUP.byteLength,
          disposition: BACKUP.disposition,
        }),
        preview,
        tenantFingerprint: TENANT,
        apply,
      }),
    ).toEqual({
      status: "backup_failed",
      error: "No se pudo acreditar el JSON exacto solicitado al navegador.",
    });

    let current: AppData = expected;
    const stale = runTestDocumentRetirementWithSafetyCopy({
      getCurrent: () => current,
      downloadCurrent: () => {
        current = changed;
        return {
          ok: true,
          filename: BACKUP.filename,
          contentSha256: BACKUP.contentSha256,
          byteLength: BACKUP.byteLength,
          disposition: BACKUP.disposition,
        };
      },
      preview,
      tenantFingerprint: TENANT,
      apply,
      now: () => fixedDate,
    });
    expect(stale).toEqual({
      status: "stale_precondition",
      safetyCopyFilename: BACKUP.filename,
    });
    expect(apply).not.toHaveBeenCalled();
  });

  it("no bloquea si la misma data se reemite como otro objeto tras preparar la copia", () => {
    const expected = { ...EMPTY_DATA };
    let current: AppData = expected;
    const apply = vi.fn(() => ({
      status: "applied" as const,
      data: expected,
      value: { batchId: "synthetic-batch" },
      replayed: false,
    }));

    const result = runTestDocumentRetirementWithSafetyCopy({
      getCurrent: () => current,
      downloadCurrent: () => {
        current = { ...expected };
        return {
          ok: true,
          filename: BACKUP.filename,
          contentSha256: BACKUP.contentSha256,
          byteLength: BACKUP.byteLength,
          disposition: BACKUP.disposition,
        };
      },
      preview,
      tenantFingerprint: TENANT,
      apply,
      now: () => fixedDate,
    });

    expect(result).toMatchObject({ status: "action_attempted" });
    expect(apply).toHaveBeenCalledTimes(1);
  });

  it("aplica la misma frontera a rollback y captura errores inesperados", () => {
    const expected = { ...EMPTY_DATA };
    const rollback = vi.fn(() => ({
      status: "applied" as const,
      data: expected,
      value: { batchId: "synthetic-batch" },
      replayed: false,
    }));
    expect(
      runTestDocumentRetirementRollbackWithSafetyCopy({
        getCurrent: () => expected,
        downloadCurrent: () => ({
          ok: true,
          filename: BACKUP.filename,
          contentSha256: BACKUP.contentSha256,
          byteLength: BACKUP.byteLength,
          disposition: BACKUP.disposition,
        }),
        preview: rollbackPreview,
        tenantFingerprint: TENANT,
        rollback,
        now: () => fixedDate,
      }),
    ).toMatchObject({ status: "action_attempted" });
    expect(rollback).toHaveBeenCalledTimes(1);

    expect(
      runTestDocumentRetirementRollbackWithSafetyCopy({
        getCurrent: () => {
          throw new Error("synthetic");
        },
        downloadCurrent: () => ({
          ok: true,
          filename: BACKUP.filename,
          contentSha256: BACKUP.contentSha256,
          byteLength: BACKUP.byteLength,
          disposition: BACKUP.disposition,
        }),
        preview: rollbackPreview,
        tenantFingerprint: TENANT,
        rollback,
      }),
    ).toEqual({ status: "unexpected_failure" });
  });
});
