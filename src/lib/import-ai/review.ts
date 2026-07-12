import {
  isOpenAiConfigured,
  requestOpenAiJson,
} from "@/lib/server/openai-client";

export type ImportAiRecommendedAction =
  | "importar"
  | "revisar"
  | "pedir_archivos"
  | "no_importar";

export interface ImportAiReviewInput {
  sourceName: string;
  confidenceLabel?: string;
  summary: Record<string, string | number | boolean | null | undefined>;
  warnings: string[];
  unsupported: Array<{ label: string; reason: string; count?: number }>;
}

export interface ImportAiReviewItem {
  title: string;
  detail: string;
  impact?: string;
}

export interface ImportAiReviewResult {
  overallConfidence: "alta" | "media" | "baja";
  verdict: string;
  improvements: ImportAiReviewItem[];
  risks: ImportAiReviewItem[];
  questions: string[];
  recommendedAction: ImportAiRecommendedAction;
}

const MAX_ARRAY_ITEMS = 12;
const MAX_TEXT_LENGTH = 500;

function cleanText(value: unknown, fallback = ""): string {
  if (typeof value !== "string") return fallback;
  return value.trim().slice(0, MAX_TEXT_LENGTH);
}

function cleanCount(value: unknown): number | undefined {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) return undefined;
  return Math.round(number);
}

function cleanStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => cleanText(item))
    .filter(Boolean)
    .slice(0, MAX_ARRAY_ITEMS);
}

function cleanUnsupported(value: unknown): ImportAiReviewInput["unsupported"] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const record = item as Record<string, unknown>;
      const label = cleanText(record.label);
      const reason = cleanText(record.reason);
      if (!label || !reason) return null;
      const count = cleanCount(record.count);
      return {
        label,
        reason,
        ...(count === undefined ? {} : { count }),
      };
    })
    .filter((item): item is ImportAiReviewInput["unsupported"][number] =>
      Boolean(item),
    )
    .slice(0, MAX_ARRAY_ITEMS);
}

function cleanSummary(value: unknown): ImportAiReviewInput["summary"] {
  if (!value || typeof value !== "object") return {};
  const output: ImportAiReviewInput["summary"] = {};
  for (const [key, rawValue] of Object.entries(value)) {
    if (Object.keys(output).length >= 30) break;
    if (!/^[a-zA-Z0-9_.-]{1,60}$/.test(key)) continue;
    if (
      typeof rawValue === "string" ||
      typeof rawValue === "number" ||
      typeof rawValue === "boolean" ||
      rawValue === null
    ) {
      output[key] =
        typeof rawValue === "string"
          ? rawValue.trim().slice(0, MAX_TEXT_LENGTH)
          : rawValue;
    }
  }
  return output;
}

export function normalizeImportAiReviewInput(
  value: unknown,
): ImportAiReviewInput | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const sourceName = cleanText(record.sourceName);
  if (!sourceName) return null;

  return {
    sourceName,
    confidenceLabel: cleanText(record.confidenceLabel),
    summary: cleanSummary(record.summary),
    warnings: cleanStringArray(record.warnings),
    unsupported: cleanUnsupported(record.unsupported),
  };
}

function cleanItem(value: unknown): ImportAiReviewItem | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const title = cleanText(record.title);
  const detail = cleanText(record.detail);
  if (!title || !detail) return null;
  return {
    title,
    detail,
    impact: cleanText(record.impact) || undefined,
  };
}

function cleanItems(value: unknown): ImportAiReviewItem[] {
  if (!Array.isArray(value)) return [];
  return value
    .map(cleanItem)
    .filter((item): item is ImportAiReviewItem => Boolean(item))
    .slice(0, 6);
}

function cleanConfidence(value: unknown): ImportAiReviewResult["overallConfidence"] {
  return value === "alta" || value === "media" || value === "baja"
    ? value
    : "media";
}

function cleanRecommendedAction(value: unknown): ImportAiRecommendedAction {
  return value === "importar" ||
    value === "revisar" ||
    value === "pedir_archivos" ||
    value === "no_importar"
    ? value
    : "revisar";
}

export function normalizeImportAiReviewResult(
  value: unknown,
): ImportAiReviewResult | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const verdict = cleanText(record.verdict);
  if (!verdict) return null;

  return {
    overallConfidence: cleanConfidence(record.overallConfidence),
    verdict,
    improvements: cleanItems(record.improvements),
    risks: cleanItems(record.risks),
    questions: cleanStringArray(record.questions).slice(0, 6),
    recommendedAction: cleanRecommendedAction(record.recommendedAction),
  };
}

export function buildImportAiReviewPrompt(): string {
  return [
    "Eres un asistente experto en migracion de datos de facturacion para autonomos espanoles.",
    "Revisa una previsualizacion de importacion ya generada por reglas deterministas.",
    "No inventes datos, no prometas cumplimiento legal y no digas que algo se importara si aparece como no soportado.",
    "Tu objetivo es ayudar al usuario a decidir si importar, revisar dudas, pedir mas archivos o no importar.",
    "Responde solo JSON valido con esta forma exacta:",
    "{",
    '  "overallConfidence": "alta|media|baja",',
    '  "verdict": "frase corta en espanol",',
    '  "improvements": [{"title": "...", "detail": "...", "impact": "..."}],',
    '  "risks": [{"title": "...", "detail": "...", "impact": "..."}],',
    '  "questions": ["..."],',
    '  "recommendedAction": "importar|revisar|pedir_archivos|no_importar"',
    "}",
  ].join("\n");
}

export function isImportAiReviewConfigured(): boolean {
  return isOpenAiConfigured();
}

export async function reviewImportWithAi(
  input: ImportAiReviewInput,
): Promise<{ data?: ImportAiReviewResult; error?: string }> {
  if (!isOpenAiConfigured()) {
    return {
      error:
        "Revisión IA no configurada en el servidor (falta OPENAI_API_KEY).",
    };
  }

  let json: {
    choices?: Array<{ message?: { content?: string } }>;
  };
  try {
    const response = await requestOpenAiJson<typeof json>({
      endpoint: "chat/completions",
      timeoutMs: 15_000,
      maxAttempts: 1,
      body: {
        model: "gpt-4o-mini",
        temperature: 0.1,
        max_tokens: 900,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: buildImportAiReviewPrompt(),
          },
          {
            role: "user",
            content: JSON.stringify(input),
          },
        ],
      },
    });
    json = response.data;
  } catch {
    return {
      error: "No se pudo completar la revisión IA. Inténtalo de nuevo.",
    };
  }
  const content = json.choices?.[0]?.message?.content;
  if (!content) {
    return { error: "La IA no devolvio una revision. Intentalo de nuevo." };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    return { error: "No se pudo interpretar la revision IA." };
  }

  const data = normalizeImportAiReviewResult(parsed);
  if (!data) {
    return { error: "La revision IA no tenia un formato util." };
  }

  return { data };
}
