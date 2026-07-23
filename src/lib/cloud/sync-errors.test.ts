import { describe, expect, it } from "vitest";
import {
  classifyCloudSyncReviewIssue,
  CLOUD_SNAPSHOT_INCOMPLETE_SYNC_ISSUE,
  cloudSnapshotIncompleteSyncError,
  DOCUMENT_FISCAL_IDENTITY_CONFLICT_SYNC_ISSUE,
  documentFiscalIdentityConflictSyncError,
  FISCAL_WORKSPACE_DIVERGED_SYNC_ISSUE,
  fiscalWorkspaceDivergedSyncError,
} from "./sync-errors";

describe("cloud sync review issues", () => {
  it("clasifica la divergencia fiscal por codigo estable", () => {
    const error = fiscalWorkspaceDivergedSyncError();

    expect(classifyCloudSyncReviewIssue(error)).toEqual(
      FISCAL_WORKSPACE_DIVERGED_SYNC_ISSUE,
    );
    expect(error.message).toBe("El expediente fiscal remoto ha divergido");
  });

  it("reconoce el mensaje legado y no bloquea errores transitorios", () => {
    expect(
      classifyCloudSyncReviewIssue(
        new Error("El expediente fiscal remoto ha divergido"),
      ),
    ).toEqual(FISCAL_WORKSPACE_DIVERGED_SYNC_ISSUE);
    expect(classifyCloudSyncReviewIssue(new Error("Timeout"))).toBeNull();
  });

  it("clasifica un conflicto de identidad fiscal documental", () => {
    const error = documentFiscalIdentityConflictSyncError();

    expect(classifyCloudSyncReviewIssue(error)).toEqual(
      DOCUMENT_FISCAL_IDENTITY_CONFLICT_SYNC_ISSUE,
    );
    expect(error.message).toBe(
      "La nube contiene una factura con la misma identidad fiscal",
    );
  });

  it("clasifica una copia local incompleta frente a nube", () => {
    const error = cloudSnapshotIncompleteSyncError();

    expect(classifyCloudSyncReviewIssue(error)).toEqual(
      CLOUD_SNAPSHOT_INCOMPLETE_SYNC_ISSUE,
    );
    expect(error.message).toBe(
      "Este dispositivo no contiene toda la copia activa de la nube",
    );
  });
});
