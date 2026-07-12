import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const requestOpenAiJsonMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/server/openai-client", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/lib/server/openai-client")>();
  return {
    ...actual,
    requestOpenAiJson: requestOpenAiJsonMock,
  };
});

import {
  FISCAL_AI_OUTPUT_JSON_SCHEMA,
  FISCAL_AI_OUTPUT_SCHEMA_NAME,
  FISCAL_AI_OUTPUT_SCHEMA_VERSION,
} from "./output";
import type { FiscalAiContext } from "./legal-context";
import {
  buildFiscalAiSystemPrompt,
  createOpenAiFiscalFallbackProvider,
  FiscalAiProviderError,
} from "./provider";
import {
  FISCAL_AI_PROMPT_VERSION,
} from "./server-config";
import { OpenAiClientError } from "@/lib/server/openai-client";

function context(): FiscalAiContext {
  return {
    expense: {
      concept: "Servicio profesional no clasificado",
      paymentMethod: "CARD",
      invoiceType: "FULL_INVOICE",
    },
    tax: {
      jurisdiction: "ES_COMMON",
      taxpayerType: "SELF_EMPLOYED_IRPF",
      directTaxRegime: "DIRECT_ESTIMATION_SIMPLIFIED",
      vatRegime: "GENERAL",
      hasFullVatDeductionRight: true,
      fiscalYear: 2026,
    },
    legalContextMode: "VERIFIED_SUMMARIES_REVIEW_ONLY",
    legalFragments: [
      {
        id: "boe-lirpf-28-1:verified-summary:v1",
        sourceId: "boe-lirpf-28-1",
        authority: "BOE",
        legalReference: "Artículo 28.1",
        verifiedSummary: "Referencia verificada para revisión humana.",
        verificationStatus: "VERIFIED",
      },
    ],
  };
}

function validOutput() {
  return {
    schemaVersion: FISCAL_AI_OUTPUT_SCHEMA_VERSION,
    classification: "UNCLASSIFIED",
    confidenceBand: "LOW",
    sourcesSufficient: false,
    summary: "No hay base suficiente para una propuesta fiscal definitiva.",
    sourceIds: ["boe-lirpf-28-1"],
    missingInformation: ["Clasificación y vinculación con la actividad."],
    evidenceRequired: ["Factura y justificación de la correlación."],
    directTax: {
      taxType: "IRPF",
      proposedPercentage: null,
      proposedDeductibleAmountCents: null,
      explanation: "Pendiente de revisión profesional.",
    },
    indirectTax: {
      taxType: "IVA",
      proposedPercentage: null,
      proposedDeductibleAmountCents: null,
      explanation: "Pendiente de revisión profesional.",
    },
  };
}

const METRICS = {
  attempts: 1,
  durationMs: 37,
  inputTokens: 80,
  outputTokens: 35,
  totalTokens: 115,
};

beforeEach(() => {
  vi.stubEnv("OPENAI_FISCAL_FALLBACK_MODEL", "fiscal-model-from-env");
  vi.stubEnv("OPENAI_FISCAL_FALLBACK_TIMEOUT_MS", "2345");
  requestOpenAiJsonMock.mockReset();
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("OpenAI fiscal fallback provider", () => {
  it("usa Responses API con modelo configurado, store false y JSON Schema estricto", async () => {
    const suppliedContext = context();
    const output = validOutput();
    requestOpenAiJsonMock.mockResolvedValue({
      data: { output_text: JSON.stringify(output), usage: {} },
      metrics: METRICS,
    });

    const result = await createOpenAiFiscalFallbackProvider().evaluate({
      context: suppliedContext,
    });

    expect(result).toEqual({
      output,
      modelId: "fiscal-model-from-env",
      promptVersion: FISCAL_AI_PROMPT_VERSION,
      suppliedSourceIds: ["boe-lirpf-28-1"],
      metrics: METRICS,
    });
    expect(requestOpenAiJsonMock).toHaveBeenCalledTimes(1);
    const request = requestOpenAiJsonMock.mock.calls[0]?.[0] as {
      endpoint: string;
      timeoutMs: number;
      maxAttempts: number;
      body: {
        model: string;
        store: boolean;
        input: Array<{ role: string; content: string }>;
        text: {
          format: {
            type: string;
            name: string;
            strict: boolean;
            schema: unknown;
          };
        };
      };
    };
    expect(request.endpoint).toBe("responses");
    expect(request.timeoutMs).toBe(2345);
    expect(request.maxAttempts).toBe(2);
    expect(request.body).toMatchObject({
      model: "fiscal-model-from-env",
      store: false,
      text: {
        format: {
          type: "json_schema",
          name: FISCAL_AI_OUTPUT_SCHEMA_NAME,
          strict: true,
          schema: FISCAL_AI_OUTPUT_JSON_SCHEMA,
        },
      },
    });
    expect(request.body.input).toEqual([
      {
        role: "system",
        content: buildFiscalAiSystemPrompt(),
      },
      {
        role: "user",
        content: JSON.stringify(suppliedContext),
      },
    ]);
  });

  it("extrae y parsea output_text tanto del atajo como del array de mensajes", async () => {
    const output = validOutput();
    requestOpenAiJsonMock
      .mockResolvedValueOnce({
        data: { output_text: `  ${JSON.stringify(output)}  ` },
        metrics: METRICS,
      })
      .mockResolvedValueOnce({
        data: {
          output: [
            {
              type: "message",
              content: [
                {
                  type: "output_text",
                  text: JSON.stringify(output),
                },
              ],
            },
          ],
        },
        metrics: METRICS,
      });
    const provider = createOpenAiFiscalFallbackProvider();

    await expect(provider.evaluate({ context: context() })).resolves.toMatchObject({
      output,
    });
    await expect(provider.evaluate({ context: context() })).resolves.toMatchObject({
      output,
    });
  });

  it("rechaza una salida no JSON sin incluir el contenido en el error", async () => {
    const sensitiveOutput =
      "respuesta inválida con NIF 12345678Z y ES9121000418450200051332";
    requestOpenAiJsonMock.mockResolvedValue({
      data: { output_text: sensitiveOutput },
      metrics: METRICS,
    });

    let caught: unknown;
    try {
      await createOpenAiFiscalFallbackProvider().evaluate({ context: context() });
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(FiscalAiProviderError);
    expect(caught).toMatchObject({
      code: "PROVIDER_OUTPUT_NOT_JSON",
      durationMs: 37,
      attempts: 1,
      message: "El proveedor fiscal no devolvió una propuesta utilizable.",
    });
    expect(JSON.stringify(caught)).not.toContain("12345678Z");
    expect(JSON.stringify(caught)).not.toContain("ES9121000418450200051332");
  });

  it.each([
    ["NOT_CONFIGURED", false, "PROVIDER_NOT_CONFIGURED"],
    ["TIMEOUT", true, "PROVIDER_TIMEOUT"],
    ["ABORTED", false, "PROVIDER_ABORTED"],
    ["TRANSIENT_PROVIDER_ERROR", true, "PROVIDER_TRANSIENT_ERROR"],
    ["PROVIDER_REJECTED", false, "PROVIDER_NON_TRANSIENT_ERROR"],
  ] as const)(
    "mapea %s sin perder duración e intentos",
    async (clientCode, transient, providerCode) => {
      requestOpenAiJsonMock.mockRejectedValue(
        new OpenAiClientError({
          code: clientCode,
          status: clientCode === "PROVIDER_REJECTED" ? 400 : undefined,
          transient,
          attempts: 2,
          durationMs: 91,
        }),
      );

      await expect(
        createOpenAiFiscalFallbackProvider().evaluate({ context: context() }),
      ).rejects.toMatchObject({
        code: providerCode,
        attempts: 2,
        durationMs: 91,
      });
    },
  );

  it("propaga la señal al transporte y no registra entradas ni fallos sensibles", async () => {
    const controller = new AbortController();
    const sensitiveError =
      "NIF 12345678Z, IBAN ES9121000418450200051332 y sk-test-never-log";
    const consoleSpies = [
      vi.spyOn(console, "debug").mockImplementation(() => {}),
      vi.spyOn(console, "info").mockImplementation(() => {}),
      vi.spyOn(console, "warn").mockImplementation(() => {}),
      vi.spyOn(console, "error").mockImplementation(() => {}),
    ];
    requestOpenAiJsonMock.mockRejectedValue(new Error(sensitiveError));

    let caught: unknown;
    try {
      await createOpenAiFiscalFallbackProvider().evaluate({
        context: context(),
        signal: controller.signal,
      });
    } catch (error) {
      caught = error;
    }

    expect(caught).toMatchObject({
      code: "PROVIDER_NON_TRANSIENT_ERROR",
      message: "El proveedor fiscal no devolvió una propuesta utilizable.",
    });
    expect(requestOpenAiJsonMock).toHaveBeenCalledWith(
      expect.objectContaining({ signal: controller.signal }),
    );
    expect(JSON.stringify(caught)).not.toContain("12345678Z");
    expect(JSON.stringify(caught)).not.toContain("ES9121000418450200051332");
    expect(JSON.stringify(caught)).not.toContain("sk-test-never-log");
    expect(consoleSpies.flatMap((spy) => spy.mock.calls)).toEqual([]);
  });
});
