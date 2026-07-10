import {
  parseProviderInvoiceSummaryText,
  type ParsedProviderInvoiceSummary,
} from "./provider-summary-expenses";

export const MAX_PROVIDER_SUMMARY_FILE_BYTES = 12 * 1024 * 1024;
const MAX_PROVIDER_SUMMARY_PAGES = 250;
const MAX_PROVIDER_SUMMARY_TEXT_CHARS = 1_000_000;

type PdfjsWorkerGlobal = typeof globalThis & {
  pdfjsWorker?: unknown;
};

export interface ParsedProviderSummaryFile extends ParsedProviderInvoiceSummary {
  fileName: string;
}

function isPdf(file: File): boolean {
  return (
    file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")
  );
}

function isTextFile(file: File): boolean {
  const name = file.name.toLowerCase();
  return (
    file.type.startsWith("text/") ||
    file.type === "application/csv" ||
    name.endsWith(".txt") ||
    name.endsWith(".csv")
  );
}

function validateFile(file: File): void {
  if (file.size > MAX_PROVIDER_SUMMARY_FILE_BYTES) {
    throw new Error("El archivo es demasiado grande (máx. 12 MB).");
  }
  if (!isPdf(file) && !isTextFile(file)) {
    throw new Error("Usa un resumen en PDF, TXT o CSV.");
  }
}

function validateExtractedText(text: string): string {
  const normalized = text.trim();
  if (!normalized) {
    throw new Error("El archivo no contiene texto que se pueda leer.");
  }
  if (normalized.length > MAX_PROVIDER_SUMMARY_TEXT_CHARS) {
    throw new Error("El resumen contiene demasiado texto para procesarlo.");
  }
  return normalized;
}

async function extractPdfText(file: File): Promise<string> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const pdfjsWorker = await import("pdfjs-dist/legacy/build/pdf.worker.mjs");
  (globalThis as PdfjsWorkerGlobal).pdfjsWorker ??= pdfjsWorker;

  const document = await pdfjs.getDocument({
    data: new Uint8Array(await file.arrayBuffer()),
    isEvalSupported: false,
  }).promise;

  try {
    if (document.numPages > MAX_PROVIDER_SUMMARY_PAGES) {
      throw new Error(
        `El PDF tiene demasiadas páginas (máx. ${MAX_PROVIDER_SUMMARY_PAGES}).`,
      );
    }

    const parts: string[] = [];
    let characters = 0;
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const content = await page.getTextContent();
      for (const item of content.items) {
        if (!("str" in item) || !item.str.trim()) continue;
        characters += item.str.length + 1;
        if (characters > MAX_PROVIDER_SUMMARY_TEXT_CHARS) {
          throw new Error("El resumen contiene demasiado texto para procesarlo.");
        }
        parts.push(item.str);
      }
    }
    return parts.join("\n");
  } finally {
    await document.destroy();
  }
}

export async function parseProviderSummaryFile(
  file: File,
): Promise<ParsedProviderSummaryFile> {
  validateFile(file);
  const text = validateExtractedText(
    isPdf(file) ? await extractPdfText(file) : await file.text(),
  );

  return {
    fileName: file.name,
    ...parseProviderInvoiceSummaryText(text),
  };
}
