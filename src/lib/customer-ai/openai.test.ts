import { afterEach, describe, expect, it, vi } from "vitest";

const extractedCustomer = {
  customer: {
    firstName: "Teresa",
    lastName: "",
    address: "Mandri, 26 2º-2º",
    city: "Barcelona",
    postalCode: "08022",
  },
  confidence: 0.9,
  warnings: [],
};

async function runExtractWithEnv(model?: string) {
  vi.resetModules();
  process.env.OPENAI_API_KEY = "test-openai-key";
  if (model) {
    process.env.OPENAI_CUSTOMER_AI_MODEL = model;
  } else {
    delete process.env.OPENAI_CUSTOMER_AI_MODEL;
  }

  const fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      choices: [
        {
          message: {
            content: JSON.stringify(extractedCustomer),
          },
        },
      ],
    }),
  });
  vi.stubGlobal("fetch", fetchMock);

  const { extractCustomerFromText } = await import("./openai");
  await extractCustomerFromText("Teresa\nMandri, 26 2º-2º. Barcelona\n08022");

  const request = fetchMock.mock.calls[0]?.[1] as { body: string } | undefined;
  return JSON.parse(request?.body ?? "{}") as { model?: string };
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
  delete process.env.OPENAI_API_KEY;
  delete process.env.OPENAI_CUSTOMER_AI_MODEL;
});

describe("extractCustomerFromText", () => {
  it("uses the lightweight customer extraction model by default", async () => {
    const body = await runExtractWithEnv();

    expect(body.model).toBe("gpt-4o-mini");
  });

  it("allows overriding only the customer extraction model", async () => {
    const body = await runExtractWithEnv("gpt-4o");

    expect(body.model).toBe("gpt-4o");
  });
});
