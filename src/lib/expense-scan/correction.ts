import { EXPENSE_SCAN_JSON_SCHEMA, normalizeExpenseScanPayload } from "./schema";
import type { ExpenseScanPayload } from "./schema";

const EXPENSE_SCAN_CORRECTION_MODEL =
  process.env.OPENAI_EXPENSE_SCAN_MODEL?.trim() || "gpt-4o";

function cleanInstruction(value: unknown): string {
  return typeof value === "string" ? value.trim().slice(0, 2000) : "";
}

export function normalizeExpenseScanCorrectionInput(value: unknown): {
  original: ExpenseScanPayload;
  instruction: string;
} | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const original = normalizeExpenseScanPayload(record.original);
  const instruction = cleanInstruction(record.instruction);
  if (!original || !instruction) return null;
  return { original, instruction };
}

export function isExpenseScanCorrectionConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

export async function correctExpenseScanPayloadWithInstruction(input: {
  original: ExpenseScanPayload;
  instruction: string;
}): Promise<{ data?: ExpenseScanPayload; error?: string }> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    return { error: "Corrección IA no configurada en el servidor." };
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: EXPENSE_SCAN_CORRECTION_MODEL,
      temperature: 0,
      max_tokens: 1800,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "Corrige un JSON de escaneo de factura de gasto siguiendo la instrucción del usuario. Devuelve solo JSON válido con el mismo esquema. No inventes campos fuera del esquema; si algo no cabe, ponlo de forma breve en warnings o notes.",
        },
        {
          role: "user",
          content: JSON.stringify({
            schema: EXPENSE_SCAN_JSON_SCHEMA,
            original: input.original,
            instruction: input.instruction,
          }),
        },
      ],
    }),
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as {
      error?: { message?: string };
    };
    return {
      error:
        body.error?.message ??
        `No se pudo corregir la lectura (error ${response.status}).`,
    };
  }

  const json = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = json.choices?.[0]?.message?.content;
  if (!content) {
    return { error: "La IA no devolvió una corrección." };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    return { error: "No se pudo interpretar la corrección." };
  }

  const data = normalizeExpenseScanPayload(parsed);
  if (!data) {
    return { error: "La corrección no tiene datos suficientes para guardarse." };
  }

  return { data };
}
