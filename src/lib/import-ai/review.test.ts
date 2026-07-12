import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  isOpenAiConfigured,
  requestOpenAiJson,
} from "@/lib/server/openai-client";
import { reviewImportWithAi } from "./review";

vi.mock("@/lib/server/openai-client", () => ({
  isOpenAiConfigured: vi.fn(),
  requestOpenAiJson: vi.fn(),
}));

const INPUT = {
  sourceName: "Holded",
  summary: { invoices: 4 },
  warnings: [],
  unsupported: [],
};

describe("reviewImportWithAi / transporte compartido", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(isOpenAiConfigured).mockReturnValue(true);
  });

  it("conserva el contrato Chat Completions usando el cliente server-only común", async () => {
    vi.mocked(requestOpenAiJson).mockResolvedValue({
      data: {
        choices: [
          {
            message: {
              content: JSON.stringify({
                overallConfidence: "media",
                verdict: "Revisa los avisos antes de importar.",
                improvements: [],
                risks: [],
                questions: [],
                recommendedAction: "revisar",
              }),
            },
          },
        ],
      },
      metrics: { attempts: 1, durationMs: 2 },
    });

    const result = await reviewImportWithAi(INPUT);

    expect(result.data?.recommendedAction).toBe("revisar");
    expect(requestOpenAiJson).toHaveBeenCalledWith(
      expect.objectContaining({
        endpoint: "chat/completions",
        maxAttempts: 1,
        body: expect.objectContaining({
          model: "gpt-4o-mini",
          response_format: { type: "json_object" },
        }),
      }),
    );
  });

  it("sanea los fallos del transporte sin devolver el error del proveedor", async () => {
    vi.mocked(requestOpenAiJson).mockRejectedValue(
      new Error("sk-secret proveedor: factura de Persona SL"),
    );

    const result = await reviewImportWithAi(INPUT);

    expect(result.error).toContain("No se pudo completar");
    expect(result.error).not.toContain("sk-secret");
    expect(result.error).not.toContain("Persona SL");
  });
});
