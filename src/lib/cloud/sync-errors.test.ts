import { describe, expect, it } from "vitest";
import {
  classifyCloudSyncReviewIssue,
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
});
