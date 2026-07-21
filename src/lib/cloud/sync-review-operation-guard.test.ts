import { describe, expect, it, vi } from "vitest";
import {
  advanceCloudSyncReviewGeneration,
  captureCloudSyncReviewOperation,
  runCloudSyncReviewMutation,
} from "./sync-review-operation-guard";

describe("cloud sync review operation guard", () => {
  it.each(["push", "pull"] as const)(
    "invalida un %s antiguo aunque el issue vuelva a null",
    async () => {
      let generation = advanceCloudSyncReviewGeneration(
        { userId: null, generation: 0 },
        "user-a",
      );
      const operation = captureCloudSyncReviewOperation(generation);
      if (!operation) throw new Error("Falta el token sintético");
      let resolveRemote: () => void = () => undefined;
      const remote = new Promise<void>((resolve) => {
        resolveRemote = resolve;
      });
      const replaceData = vi.fn();
      const finalize = vi.fn();
      const clearPending = vi.fn();

      const running = (async () => {
        await remote;
        return runCloudSyncReviewMutation(generation, operation, () => {
          replaceData();
          finalize();
          clearPending();
        });
      })();

      generation = advanceCloudSyncReviewGeneration(generation, "user-a");
      generation = advanceCloudSyncReviewGeneration(generation, "user-a");
      resolveRemote();

      await expect(running).resolves.toBe(false);
      expect(replaceData).not.toHaveBeenCalled();
      expect(finalize).not.toHaveBeenCalled();
      expect(clearPending).not.toHaveBeenCalled();
    },
  );
});
