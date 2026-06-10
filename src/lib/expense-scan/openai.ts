import { buildExpenseScanPrompt } from "./prompt";
import { normalizeExpenseScanPayload, type ExpenseScanPayload } from "./schema";

const MAX_BYTES = 4 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

export function isOpenAiConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

export function validateScanFile(file: File): string | null {
  if (!ALLOWED_TYPES.has(file.type)) {
    return "Formato no soportado. Usa una foto JPG, PNG o WebP del ticket o factura.";
  }
  if (file.size > MAX_BYTES) {
    return "La imagen es demasiado grande (máx. 4 MB).";
  }
  return null;
}

export async function extractExpenseFromImage(
  base64: string,
  mimeType: string,
): Promise<{ data?: ExpenseScanPayload; error?: string }> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    return { error: "Escaneo no configurado en el servidor (falta OPENAI_API_KEY)." };
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      temperature: 0.1,
      max_tokens: 900,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: buildExpenseScanPrompt() },
            {
              type: "image_url",
              image_url: {
                url: `data:${mimeType};base64,${base64}`,
                detail: "high",
              },
            },
          ],
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
        `No se pudo analizar la imagen (error ${response.status}).`,
    };
  }

  const json = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = json.choices?.[0]?.message?.content;
  if (!content) {
    return { error: "La IA no devolvió datos. Prueba con otra foto más nítida." };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    return { error: "No se pudo interpretar la respuesta. Inténtalo de nuevo." };
  }

  const data = normalizeExpenseScanPayload(parsed);
  if (!data) {
    return {
      error:
        "No se encontraron datos suficientes (proveedor, descripción o importe). Revisa la imagen.",
    };
  }

  return { data };
}

export async function fileToBase64(file: File): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer());
  return buffer.toString("base64");
}
