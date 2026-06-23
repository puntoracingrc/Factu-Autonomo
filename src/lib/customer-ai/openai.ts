import { buildCustomerTextExtractPrompt } from "./prompt";
import {
  normalizeCustomerTextExtractPayload,
  type CustomerTextExtractPayload,
} from "./schema";

export async function extractCustomerFromText(
  text: string,
): Promise<{ data?: CustomerTextExtractPayload; error?: string }> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    return {
      error:
        "Autorrelleno IA no configurado en el servidor (falta OPENAI_API_KEY).",
    };
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
      max_tokens: 700,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: buildCustomerTextExtractPrompt(),
        },
        {
          role: "user",
          content: text,
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
        `No se pudo analizar el texto (error ${response.status}).`,
    };
  }

  const json = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = json.choices?.[0]?.message?.content;
  if (!content) {
    return { error: "La IA no devolvió datos. Prueba con un texto más completo." };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    return { error: "No se pudo interpretar la respuesta. Inténtalo de nuevo." };
  }

  const data = normalizeCustomerTextExtractPayload(parsed);
  if (!data) {
    return {
      error:
        "No se encontraron datos suficientes de cliente. Revisa que haya nombre o razón social.",
    };
  }

  return { data };
}
