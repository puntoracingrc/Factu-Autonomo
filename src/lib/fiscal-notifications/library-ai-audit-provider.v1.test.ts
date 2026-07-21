import { afterEach, describe, expect, it, vi } from "vitest";

const requestOpenAiJsonMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/server/openai-client", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/lib/server/openai-client")>();
  return { ...actual, requestOpenAiJson: requestOpenAiJsonMock };
});

import {
  FISCAL_NOTIFICATION_LIBRARY_AI_AUDIT_MODEL_V1,
  FISCAL_NOTIFICATION_LIBRARY_AI_AUDIT_SCHEMA_VERSION_V1,
  type FiscalNotificationLibraryAiAuditInputV1,
} from "./library-ai-audit.v1";
import {
  buildFiscalNotificationLibraryAiAuditSystemPromptV1,
  FISCAL_NOTIFICATION_LIBRARY_AI_AUDIT_OUTPUT_SCHEMA_V1,
  FISCAL_NOTIFICATION_LIBRARY_AI_AUDIT_PROMPT_VERSION_V1,
  FiscalNotificationLibraryAiAuditProviderErrorV1,
  reviewFiscalNotificationLibraryWithAiV1,
} from "./library-ai-audit-provider.v1";
import { OpenAiClientError } from "@/lib/server/openai-client";

const METRICS = Object.freeze({
  attempts: 1,
  durationMs: 42,
  inputTokens: 320,
  outputTokens: 80,
  totalTokens: 400,
});

function audit(): FiscalNotificationLibraryAiAuditInputV1 {
  return Object.freeze({
    schemaVersion: FISCAL_NOTIFICATION_LIBRARY_AI_AUDIT_SCHEMA_VERSION_V1,
    documents: Object.freeze([
      Object.freeze({
        alias: "DOC-001",
        family: "Providencia de apremio",
        type: "Acto ejecutivo",
        authority: "AEAT",
        documentDate: "2026-01-10",
        documentDateBasis: "Fecha de emisión",
        pageCount: 2,
        reviewStatus: "PENDING" as const,
        sourceFileAliases: Object.freeze(["FILE-001"]),
        references: Object.freeze([
          Object.freeze({
            label: "Expediente",
            referenceAlias: "REF-001",
            pages: Object.freeze([1]),
          }),
        ]),
        facts: Object.freeze([
          Object.freeze({
            kind: "REFERENCE" as const,
            label: "Expediente",
            value: "REF-001",
            page: 1,
          }),
        ]),
        amounts: Object.freeze([]),
        installments: Object.freeze([]),
        arithmeticReview: null,
        integrityReview: null,
        explanation: Object.freeze({
          whatItIs: "Una providencia inicia la vía ejecutiva.",
          whyReceived: "La ficha refleja una deuda pendiente.",
          result: "Resultado pendiente de revisión.",
          nextStep: "Revisa referencias, fechas e importes.",
          deadline: "Comprueba la fecha de notificación efectiva.",
        }),
        officialSources: Object.freeze([
          Object.freeze({
            authority: "BOE" as const,
            title: "Ley 58/2003, General Tributaria",
          }),
        ]),
      }),
    ]),
    relations: Object.freeze([]),
  });
}

function validOutput() {
  return {
    schemaVersion: FISCAL_NOTIFICATION_LIBRARY_AI_AUDIT_SCHEMA_VERSION_V1,
    summary: "Una ficha revisada; no se aplicó ningún cambio.",
    documentsReviewed: 1,
    relationsReviewed: 0,
    findings: [],
  };
}

afterEach(() => {
  requestOpenAiJsonMock.mockReset();
  vi.restoreAllMocks();
});

describe("fiscal notification library AI audit provider v1", () => {
  it("usa exactamente gpt-4o, Responses API, store false y esquema estricto", async () => {
    requestOpenAiJsonMock.mockResolvedValue({
      data: { output_text: JSON.stringify(validOutput()) },
      metrics: METRICS,
    });

    const result = await reviewFiscalNotificationLibraryWithAiV1({
      audit: audit(),
    });

    expect(result).toEqual({
      data: validOutput(),
      modelId: "gpt-4o",
      promptVersion: FISCAL_NOTIFICATION_LIBRARY_AI_AUDIT_PROMPT_VERSION_V1,
      metrics: METRICS,
    });
    const request = requestOpenAiJsonMock.mock.calls[0]?.[0] as {
      endpoint: string;
      timeoutMs: number;
      maxAttempts: number;
      body: {
        model: string;
        store: boolean;
        input: readonly { role: string; content: string }[];
        text: { format: { type: string; strict: boolean; schema: unknown } };
      };
    };
    expect(request).toMatchObject({
      endpoint: "responses",
      timeoutMs: 30_000,
      maxAttempts: 2,
      body: {
        model: FISCAL_NOTIFICATION_LIBRARY_AI_AUDIT_MODEL_V1,
        store: false,
        text: {
          format: {
            type: "json_schema",
            strict: true,
            schema: FISCAL_NOTIFICATION_LIBRARY_AI_AUDIT_OUTPUT_SCHEMA_V1,
          },
        },
      },
    });
    expect(request.body.input).toEqual([
      {
        role: "system",
        content: buildFiscalNotificationLibraryAiAuditSystemPromptV1(),
      },
      { role: "user", content: JSON.stringify(audit()) },
    ]);
  });

  it("ordena revisar todas las fichas, exigir identificadores fuertes y no aplicar cambios", () => {
    const prompt = buildFiscalNotificationLibraryAiAuditSystemPromptV1();
    expect(prompt).toContain(
      "Revisa todos los documentos y todas las relaciones suministradas, uno por uno.",
    );
    expect(prompt).toContain("identificadores fuertes compartidos");
    expect(prompt).toContain(
      "Importes, nombres, proximidad temporal, organismo o parecido textual no son identificadores fuertes",
    );
    expect(prompt).toContain(
      "No propongas crear, borrar, confirmar ni modificar automáticamente",
    );
    expect(prompt).toContain("No tienes el PDF ni texto bruto");
    expect(prompt).toContain("contrasta cada ecuación");
    expect(prompt).toContain("No uses un identificador fiscal descartado como importe");
    expect(
      buildFiscalNotificationLibraryAiAuditSystemPromptV1("2026-07-21"),
    ).toContain("La fecha de referencia de esta revisión es 2026-07-21");
  });

  it("rechaza JSON inválido o tokens internos sin filtrarlos a la interfaz", async () => {
    requestOpenAiJsonMock
      .mockResolvedValueOnce({
        data: { output_text: "respuesta no JSON con 12345678Z" },
        metrics: METRICS,
      })
      .mockResolvedValueOnce({
        data: {
          output_text: JSON.stringify({
            ...validOutput(),
            summary: "EXPLANATION:internal.summary",
          }),
        },
        metrics: METRICS,
      });

    for (let index = 0; index < 2; index += 1) {
      let caught: unknown;
      try {
        await reviewFiscalNotificationLibraryWithAiV1({ audit: audit() });
      } catch (error) {
        caught = error;
      }
      expect(caught).toBeInstanceOf(
        FiscalNotificationLibraryAiAuditProviderErrorV1,
      );
      expect(caught).toMatchObject({
        code: "INVALID_OUTPUT",
        message: "No se pudo completar la revisión de fichas con IA.",
      });
      expect(JSON.stringify(caught)).not.toContain("12345678Z");
      expect(JSON.stringify(caught)).not.toContain("internal.summary");
    }
  });

  it("mapea errores del cliente y rechazos sin exponer su contenido", async () => {
    requestOpenAiJsonMock
      .mockRejectedValueOnce(
        new OpenAiClientError({
          code: "TIMEOUT",
          transient: true,
          attempts: 2,
          durationMs: 30_000,
        }),
      )
      .mockResolvedValueOnce({
        data: {
          output: [
            {
              type: "message",
              content: [{ type: "refusal", refusal: "dato privado" }],
            },
          ],
        },
        metrics: METRICS,
      });

    await expect(
      reviewFiscalNotificationLibraryWithAiV1({ audit: audit() }),
    ).rejects.toMatchObject({ code: "TIMEOUT" });
    await expect(
      reviewFiscalNotificationLibraryWithAiV1({ audit: audit() }),
    ).rejects.toMatchObject({ code: "REFUSED" });
  });
});
