import { beforeEach, describe, expect, it, vi } from "vitest";
import { authenticateQuick, QuickError } from "@/lib/quick-invoicing/server";
import { fillQuickWithAi } from "@/lib/quick-invoicing/ai-fill-server";
import { QUICK_AI_CONSENT_VERSION } from "@/lib/quick-invoicing/ai-fill";
import { POST } from "./route";
vi.mock("@/lib/quick-invoicing/server", async original => {
  const actual = await original<typeof import("@/lib/quick-invoicing/server")>();
  return { ...actual, authenticateQuick: vi.fn() };
});
vi.mock("@/lib/quick-invoicing/ai-fill-server", async original => {
  const actual = await original<typeof import("@/lib/quick-invoicing/ai-fill-server")>();
  return { ...actual, fillQuickWithAi: vi.fn() };
});
const body = { text: "Cliente de prueba", target: "client", kind: "factura", consent: QUICK_AI_CONSENT_VERSION };
const request = (value: unknown = body) => new Request("https://fast.example.test/api/factu-rapido/autofill", { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer synthetic", "X-Factu-Company-Id": "company", "X-Factu-Device-Token": "synthetic" }, body: JSON.stringify(value) });
beforeEach(() => { vi.clearAllMocks(); vi.mocked(authenticateQuick).mockResolvedValue({ scope: { company_id: "company" } } as never); vi.mocked(fillQuickWithAi).mockResolvedValue({ client: { name: "Prueba" }, items: [], notes: null, date: null, paymentMethod: null, warnings: [] }); });
describe("private quick AI endpoint", () => {
  it("authenticates with company pin and independent rate bucket before parsing or spending", async () => {
    const req = request(); const result = await POST(req);
    expect(authenticateQuick).toHaveBeenCalledWith(req, { purpose: "autofill" });
    expect(result.status).toBe(200); expect(result.headers.get("Cache-Control")).toBe("no-store, private");
    expect(result.headers.get("Vary")).toContain("X-Factu-Company-Id");
    expect(await result.json()).toMatchObject({ ok: true, suggestion: { client: { name: "Prueba" } } });
  });
  it.each([[401, "SIGN_IN_REQUIRED"], [403, "PILOT_ONLY"], [403, "COMPANY_NOT_ALLOWED"], [409, "COMPANY_REFRESH_REQUIRED"], [429, "RATE_LIMITED"]])("propagates access denial %s %s without provider use", async (status, code) => {
    vi.mocked(authenticateQuick).mockRejectedValue(new QuickError(status as number, code as string, "Denegado"));
    const result = await POST(request()); expect(result.status).toBe(status); expect(fillQuickWithAi).not.toHaveBeenCalled();
  });
  it("rejects unsupported images, missing consent, oversize and bad JSON before provider use", async () => {
    for (const value of [{ ...body, consent: null }, { ...body, image: { mimeType: "image/svg+xml", base64: "PHN2Zz4=" } }, { ...body, text: "x".repeat(3_000_000) }]) {
      const result = await POST(request(value)); expect([400, 413]).toContain(result.status); expect(result.headers.get("Cache-Control")).toContain("no-store");
    }
    const req = new Request("https://fast.example.test/api/factu-rapido/autofill", { method: "POST", body: "not JSON" });
    expect((await POST(req)).status).toBe(400); expect(fillQuickWithAi).not.toHaveBeenCalled();
  });
  it("never reflects errors or provider secrets", async () => {
    vi.mocked(fillQuickWithAi).mockRejectedValue(new Error("SECRET provider payload"));
    const result = await POST(request()); expect(result.status).toBe(503); expect(await result.text()).not.toContain("SECRET");
  });
});
