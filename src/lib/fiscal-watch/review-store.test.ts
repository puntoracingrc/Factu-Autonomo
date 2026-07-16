import { beforeEach, describe, expect, it, vi } from "vitest";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import {
  fiscalWatchReviewEventCode,
  fiscalWatchReviewEventId,
  listFiscalWatchReviewKeys,
  recordFiscalWatchReview,
} from "./review-store";

vi.mock("@/lib/supabase/admin", () => ({
  getSupabaseAdmin: vi.fn(),
}));

describe("fiscal watch review store contract", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("deriva códigos exactos sin contenido oficial ni identidad del actor", () => {
    expect(fiscalWatchReviewEventCode("change", 81)).toBe(
      "fiscal-watch:reviewed:v1:change:81",
    );
    expect(fiscalWatchReviewEventCode("baseline", 12)).toBe(
      "fiscal-watch:reviewed:v1:baseline:12",
    );
    expect(fiscalWatchReviewEventCode("change", 0)).toBeNull();
  });

  it("produce un UUID determinista e idempotente por aviso", () => {
    const first = fiscalWatchReviewEventId("change", 81);
    const repeated = fiscalWatchReviewEventId("change", 81);
    const different = fiscalWatchReviewEventId("change", 82);

    expect(first).toBe(repeated);
    expect(first).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
    expect(different).not.toBe(first);
  });

  it("falla cerrado cuando el almacenamiento no está disponible", async () => {
    vi.mocked(getSupabaseAdmin).mockReturnValue(null);

    await expect(listFiscalWatchReviewKeys()).resolves.toEqual({
      available: false,
      keys: [],
    });
    await expect(
      recordFiscalWatchReview({
        actorUserId: "admin-1",
        kind: "change",
        issueNumber: 81,
      }),
    ).resolves.toBe(false);
  });

  it("lee únicamente atestaciones resueltas, exactas y deduplicadas", async () => {
    const limit = vi.fn().mockResolvedValue({
      data: [
        { code: "fiscal-watch:reviewed:v1:change:81" },
        { code: "fiscal-watch:reviewed:v1:baseline:12" },
        { code: "fiscal-watch:reviewed:v1:change:81" },
      ],
      error: null,
    });
    const chain = {
      select: vi.fn(),
      eq: vi.fn(),
      not: vi.fn(),
      order: vi.fn(),
      limit,
    };
    chain.select.mockReturnValue(chain);
    chain.eq.mockReturnValue(chain);
    chain.not.mockReturnValue(chain);
    chain.order.mockReturnValue(chain);
    const from = vi.fn().mockReturnValue(chain);
    vi.mocked(getSupabaseAdmin).mockReturnValue({ from } as never);

    await expect(listFiscalWatchReviewKeys()).resolves.toEqual({
      available: true,
      keys: ["baseline:12", "change:81"],
    });
    expect(from).toHaveBeenCalledWith("app_error_events");
    expect(chain.eq).toHaveBeenCalledWith("area", "fiscal_watch_review");
    expect(chain.not).toHaveBeenCalledWith("resolved_at", "is", null);
    expect(limit).toHaveBeenCalledWith(500);
  });

  it("guarda una atestación resuelta e idempotente sin texto de la fuente", async () => {
    const upsert = vi.fn().mockResolvedValue({ error: null });
    const from = vi.fn().mockReturnValue({ upsert });
    vi.mocked(getSupabaseAdmin).mockReturnValue({ from } as never);

    await expect(
      recordFiscalWatchReview({
        actorUserId: "admin-1",
        kind: "change",
        issueNumber: 81,
      }),
    ).resolves.toBe(true);

    expect(from).toHaveBeenCalledWith("app_error_events");
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        id: fiscalWatchReviewEventId("change", 81),
        user_id: "admin-1",
        severity: "info",
        area: "fiscal_watch_review",
        code: "fiscal-watch:reviewed:v1:change:81",
        resolved_at: expect.any(String),
        metadata: {
          schemaVersion: 1,
          issueKind: "change",
          issueNumber: 81,
        },
      }),
      { onConflict: "id" },
    );
    expect(JSON.stringify(upsert.mock.calls[0])).not.toContain("github.com");
    expect(JSON.stringify(upsert.mock.calls[0])).not.toContain("boe.es");
  });
});
