import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";
import { getAdminAiLearningAccessFromRequest } from "@/lib/admin/server-access";
import {
  correctExpenseScanPayloadWithInstruction,
  isExpenseScanCorrectionConfigured,
} from "@/lib/expense-scan/correction";
import type { ExpenseScanPayload } from "@/lib/expense-scan/schema";

vi.mock("@/lib/admin/server-access", () => ({
  getAdminAiLearningAccessFromRequest: vi.fn(),
}));

vi.mock("@/lib/expense-scan/correction", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/lib/expense-scan/correction")>();
  return {
    ...actual,
    isExpenseScanCorrectionConfigured: vi.fn(),
    correctExpenseScanPayloadWithInstruction: vi.fn(),
  };
});

function payload(): ExpenseScanPayload {
  return {
    document: { kind: "expense_invoice", isExpenseDocument: true },
    supplier: { name: "Proveedor" },
    expense: {
      date: "2026-07-03",
      businessKind: "purchase",
      description: "Material",
      amount: 100,
      ivaPercent: 21,
      category: "Material",
      paymentMethod: "Transferencia",
    },
    confidence: 0.9,
    warnings: [],
  };
}

function request(body: unknown) {
  return new Request("http://localhost/api/admin/ai-learning/correct", {
    method: "POST",
    headers: { Authorization: "Bearer token" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/admin/ai-learning/correct", () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  it("rechaza cuentas no autorizadas", async () => {
    vi.mocked(getAdminAiLearningAccessFromRequest).mockResolvedValue({
      ok: false,
      response: new Response(JSON.stringify({ error: "Cuenta no autorizada" }), {
        status: 403,
      }) as never,
    });

    const response = await POST(
      request({ original: payload(), instruction: "corrige unidad" }),
    );

    expect(response.status).toBe(403);
  });

  it("devuelve lectura corregida para cuenta autorizada", async () => {
    const corrected = {
      ...payload(),
      expense: { ...payload().expense, description: "Material corregido" },
    };
    vi.mocked(getAdminAiLearningAccessFromRequest).mockResolvedValue({
      ok: true,
      user: { id: "user-test", email: "puntoracingrc@gmail.com" } as never,
    });
    vi.mocked(isExpenseScanCorrectionConfigured).mockReturnValue(true);
    vi.mocked(correctExpenseScanPayloadWithInstruction).mockResolvedValue({
      data: corrected,
    });

    const response = await POST(
      request({ original: payload(), instruction: "corrige descripcion" }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.expense.description).toBe("Material corregido");
  });
});
