import { extractPdfScanHintsFromPdfBase64 } from "./pdf-table-lines";
import { buildExpenseScanPrompt } from "./prompt";
import { normalizeExpenseScanPayload, type ExpenseScanPayload } from "./schema";

const EXPENSE_SCAN_MODEL =
  process.env.OPENAI_EXPENSE_SCAN_MODEL?.trim() || "gpt-4o";
const DEFAULT_EXPENSE_SCAN_MAX_TOKENS = 6000;
const MIN_EXPENSE_SCAN_MAX_TOKENS = 2000;
const MAX_EXPENSE_SCAN_MAX_TOKENS = 12000;

export function isOpenAiConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

export function resolveExpenseScanMaxTokens(
  value = process.env.OPENAI_EXPENSE_SCAN_MAX_TOKENS,
): number {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(parsed)) return DEFAULT_EXPENSE_SCAN_MAX_TOKENS;

  return Math.min(
    Math.max(parsed, MIN_EXPENSE_SCAN_MAX_TOKENS),
    MAX_EXPENSE_SCAN_MAX_TOKENS,
  );
}

function buildPdfTextHint(textRows: string): string {
  if (!textRows.trim()) return "";
  return `\n\nTexto seleccionable extraído del PDF por el servidor. Úsalo para no perder líneas de tablas largas o repetidas. Si el PDF visual y este texto difieren, prioriza el PDF visual para datos generales, pero conserva las filas de compra que aparezcan aquí:\n${textRows}`;
}

function buildScanContent(base64: string, mimeType: string, pdfTextRows = "") {
  const prompt = {
    type: "text" as const,
    text: `${buildExpenseScanPrompt()}${buildPdfTextHint(pdfTextRows)}`,
  };

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

  const pdfHints =
    mimeType === "application/pdf"
      ? await extractPdfScanHintsFromPdfBase64(base64)
      : null;

  if (pdfHints) {
    console.info("[expense-scan] PDF text extraction result", {
      items: pdfHints.debug.itemCount,
      rows: pdfHints.debug.rowCount,
      stilCondalLines: pdfHints.stilCondal.lines.length,
      hasError: Boolean(pdfHints.debug.error),
    });
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: EXPENSE_SCAN_MODEL,
      temperature: 0.1,
      max_tokens: resolveExpenseScanMaxTokens(),
      response_format: { type: "json_object" },
      messages: [
        {
          role: "user",
          content: buildScanContent(base64, mimeType, pdfHints?.textRows),
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

  if (pdfHints?.stilCondal.lines.length) {
    const pdfLines = pdfHints.stilCondal;
    const currentLineCount = data.expense.purchaseLines?.length ?? 0;
    if (pdfLines.lines.length > currentLineCount) {
      data.expense.purchaseLines = pdfLines.lines;
      data.warnings.push(...pdfLines.warnings);
    }
  }

  return { data };
}

export async function fileToBase64(file: File): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer());
  return buffer.toString("base64");
}
