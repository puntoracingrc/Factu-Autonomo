import { beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { isOpenAiConfigured, requestOpenAiJson } from "@/lib/server/openai-client";
import { hasUnlimitedAiAccessForCompany } from "@/lib/billing/unlimited-ai-access";
import { consumeCustomerAiAutofill } from "@/lib/billing/scan-usage-server";
import { isBillingEnforced } from "@/lib/billing/config";
import { fetchUserSubscriptionServer } from "@/lib/billing/server-repository";
import { fillQuickWithAi, parseQuickAiInput } from "./ai-fill-server";
import { QUICK_AI_CONSENT_VERSION, QUICK_AI_IMAGE_BYTES } from "./ai-fill";
import type { QuickContext } from "./server";
vi.mock("@/lib/server/openai-client", () => ({ isOpenAiConfigured: vi.fn(), requestOpenAiJson: vi.fn() }));
vi.mock("@/lib/billing/unlimited-ai-access", () => ({ hasUnlimitedAiAccessForCompany: vi.fn() }));
vi.mock("@/lib/billing/scan-usage-server", () => ({ consumeCustomerAiAutofill: vi.fn() }));
vi.mock("@/lib/billing/config", () => ({ isBillingEnforced: vi.fn() }));
vi.mock("@/lib/billing/server-repository", () => ({ fetchUserSubscriptionServer: vi.fn() }));
const context = { scope: { actor_id: "actor", company_id: "company", billing_user_id: "billing-owner" }, email: "actor@example.test" } as QuickContext;
const base = { text: "Cliente sintético, cambio de cinta 50 euros", target: "document", kind: "factura", consent: QUICK_AI_CONSENT_VERSION };
const output = { client: { name: "Cliente sintético" }, items: [{ description: "Cambio de cinta", unitPrice: 50 }], notes: null, date: null, paymentMethod: null, warnings: [] };
function response(content: unknown = output, finish_reason = "stop") { return { data: { choices: [{ finish_reason, message: { content: JSON.stringify(content) } }] }, metrics: { attempts: 1, durationMs: 1 } }; }
beforeEach(() => {
  vi.clearAllMocks(); vi.mocked(isOpenAiConfigured).mockReturnValue(true); vi.mocked(isBillingEnforced).mockReturnValue(false);
  vi.mocked(hasUnlimitedAiAccessForCompany).mockResolvedValue(true);
  vi.mocked(requestOpenAiJson).mockResolvedValue(response());
});
describe("quick AI input validation", () => {
  it("accepts text, a photo alone or both, never remote image URLs", () => {
    expect(parseQuickAiInput(base).text).toContain("Cliente");
    const image = { mimeType: "image/png", base64: readFileSync("public/icon-128.png").toString("base64") };
    expect(parseQuickAiInput({ ...base, text: "", image })).toMatchObject({ image });
    expect(() => parseQuickAiInput({ ...base, image: { mimeType: "image/png", base64: "https://example.test/image" } })).toThrow();
  });
  it("validates a maximum-size base64 body without a recursive regex", () => {
    const bytes = Buffer.alloc(QUICK_AI_IMAGE_BYTES); bytes.set([137, 80, 78, 71, 13, 10, 26, 10]);
    expect(parseQuickAiInput({ ...base, image: { mimeType: "image/png", base64: bytes.toString("base64") } }).image).toBeDefined();
  });
  it.each([
    { ...base, consent: false }, { ...base, text: "" }, { ...base, text: "a".repeat(10_001) }, { ...base, target: "issuer" }, { ...base, kind: "recibo" },
    { ...base, image: { mimeType: "image/png", base64: Buffer.from("not a PNG").toString("base64") } },
    { ...base, image: { mimeType: "image/svg+xml", base64: "PHN2Zz4=" } },
    { ...base, image: { mimeType: "image/jpeg", base64: Buffer.alloc(QUICK_AI_IMAGE_BYTES + 1).toString("base64") } },
  ])("rejects invalid inputs before quota or provider use", value => { expect(() => parseQuickAiInput(value)).toThrow(); expect(requestOpenAiJson).not.toHaveBeenCalled(); });
});
describe("quick AI scoped provider and quota", () => {
  it("reuses the company's unlimited entitlement and sends only input, never its profile or catalog", async () => {
    const signal = new AbortController().signal;
    await fillQuickWithAi(context, parseQuickAiInput(base), signal);
    expect(hasUnlimitedAiAccessForCompany).toHaveBeenCalledWith({ user: { email: "actor@example.test" }, companyId: "company" });
    expect(consumeCustomerAiAutofill).not.toHaveBeenCalled();
    const request = vi.mocked(requestOpenAiJson).mock.calls[0][0];
    expect(request).toMatchObject({ endpoint: "chat/completions", timeoutMs: 25_000, signal, body: { store: false, response_format: { type: "json_schema", json_schema: { strict: true } } } });
    expect(JSON.stringify(request)).not.toContain("billing-owner");
    expect(JSON.stringify(request)).toContain("DATOS NO FIABLES");
  });
  it("uses base64 image content, not an uploaded or durable file", async () => {
    const image = { mimeType: "image/png", base64: readFileSync("public/icon-128.png").toString("base64") };
    await fillQuickWithAi(context, parseQuickAiInput({ ...base, image }));
    expect(vi.mocked(requestOpenAiJson).mock.calls[0][0].body).toMatchObject({ messages: [expect.anything(), { role: "user", content: [expect.anything(), { type: "image_url", image_url: { url: `data:image/png;base64,${image.base64}`, detail: "high" } }] }] });
  });
  it("fails closed if the usage reservation fails and bills the owner, not the collaborator", async () => {
    vi.mocked(hasUnlimitedAiAccessForCompany).mockResolvedValue(false);
    vi.mocked(consumeCustomerAiAutofill).mockResolvedValue({ allowed: false, blockedByQuota: false, reason: "No se pudo comprobar" } as never);
    await expect(fillQuickWithAi(context, parseQuickAiInput(base))).rejects.toMatchObject({ status: 503, code: "AI_USAGE_UNAVAILABLE" });
    expect(consumeCustomerAiAutofill).toHaveBeenCalledWith("billing-owner"); expect(requestOpenAiJson).not.toHaveBeenCalled();
  });
  it("enforces real quota exhaustion and plan limits", async () => {
    vi.mocked(hasUnlimitedAiAccessForCompany).mockResolvedValue(false);
    vi.mocked(consumeCustomerAiAutofill).mockResolvedValue({ allowed: false, blockedByQuota: true } as never);
    await expect(fillQuickWithAi(context, parseQuickAiInput(base))).rejects.toMatchObject({ status: 402, code: "AI_QUOTA_REACHED" });
    vi.mocked(isBillingEnforced).mockReturnValue(true); vi.mocked(fetchUserSubscriptionServer).mockResolvedValue(null);
    await expect(fillQuickWithAi(context, parseQuickAiInput(base))).rejects.toMatchObject({ status: 402, code: "AI_PLAN_REQUIRED" });
    expect(requestOpenAiJson).not.toHaveBeenCalled();
  });
  it("does not consume anything when the provider is not configured", async () => {
    vi.mocked(isOpenAiConfigured).mockReturnValue(false);
    await expect(fillQuickWithAi(context, parseQuickAiInput(base))).rejects.toMatchObject({ status: 503 });
    expect(consumeCustomerAiAutofill).not.toHaveBeenCalled();
  });
  it("does not claim to fill a client when only concepts were recognized", async () => {
    vi.mocked(requestOpenAiJson).mockResolvedValue(response({ ...output, client: {} }));
    await expect(fillQuickWithAi(context, parseQuickAiInput({ ...base, target: "client" }))).rejects.toMatchObject({ code: "AI_FILL_FAILED" });
  });
  it.each([response({}, "length"), response({}), { data: { choices: [{ finish_reason: "stop", message: { refusal: "no", content: "{}" } }] } }])("rejects incomplete, refused and invalid suggestions without partial success", async result => {
    vi.mocked(requestOpenAiJson).mockResolvedValue(result as never);
    await expect(fillQuickWithAi(context, parseQuickAiInput(base))).rejects.toMatchObject({ code: "AI_FILL_FAILED" });
  });
});
