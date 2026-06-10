import { MAX_IMAGE_BYTES, MAX_PDF_BYTES } from "./limits";
import { buildExpenseScanPrompt } from "./prompt";
import { normalizeExpenseScanPayload, type ExpenseScanPayload } from "./schema";

const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

export function resolveScanMimeType(file: File): string {
  if (file.type) return file.type;
  const name = file.name.toLowerCase();
  if (name.endsWith(".pdf")) return "application/pdf";
  if (name.endsWith(".png")) return "image/png";
  if (name.endsWith(".webp")) return "image/webp";
  if (name.endsWith(".gif")) return "image/gif";
  return "image/jpeg";
}

export function isOpenAiConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

export function validateScanFile(file: File): string | null {
  const mimeType = resolveScanMimeType(file);
  const isPdf = mimeType === "application/pdf";
  const isImage = ALLOWED_IMAGE_TYPES.has(mimeType);

  if (!isPdf && !isImage) {
    return "Formato no soportado. Usa una foto (JPG, PNG, WebP) o un PDF de la factura.";
  }

  const maxBytes = isPdf ? MAX_PDF_BYTES : MAX_IMAGE_BYTES;
  if (file.size > maxBytes) {
    return isPdf
      ? "El PDF es demasiado grande (máx. 8 MB)."
      : "La imagen es demasiado grande (máx. 4 MB). Si es una foto del móvil, debería optimizarse sola; inténtalo de nuevo.";
  }

  return null;
}

function buildScanContent(base64: string, mimeType: string) {
  const prompt = { type: "text" as const, text: buildExpenseScanPrompt() };

  if (mimeType === "application/pdf") {
    return [
      prompt,
      {
        type: "file" as const,
        file: {
          filename: "factura.pdf",
          file_data: `data:application/pdf;base64,${base64}`,
        },
      },
    ];
  }

  return [
    prompt,
    {
      type: "image_url" as const,
      image_url: {
        url: `data:${mimeType};base64,${base64}`,
        detail: "high" as const,
      },
    },
  ];
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
          content: buildScanContent(base64, mimeType),
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
        `No se pudo analizar el documento (error ${response.status}).`,
    };
  }

  const json = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = json.choices?.[0]?.message?.content;
  if (!content) {
    return {
      error: "La IA no devolvió datos. Prueba con otra foto o PDF más legible.",
    };
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
        "No se encontraron datos suficientes (proveedor, descripción o importe). Revisa el archivo.",
    };
  }

  return { data };
}

export async function fileToBase64(file: File): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer());
  return buffer.toString("base64");
}
