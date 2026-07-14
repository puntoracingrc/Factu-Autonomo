import type { AeatCensusScreenshotKind } from "./aeat-census-screenshot";

export const MAX_AEAT_SCREENSHOT_BYTES = 8 * 1024 * 1024;
export const MAX_AEAT_SCREENSHOTS = 8;
const MAX_OCR_TEXT_CHARS = 160_000;

const SUPPORTED_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

export type AeatScreenshotFileErrorCode =
  | "UNSUPPORTED_FILE"
  | "FILE_TOO_LARGE"
  | "TOO_MANY_FILES"
  | "INVALID_IMAGE"
  | "NO_READABLE_TEXT"
  | "OCR_FAILED";

export class AeatScreenshotFileError extends Error {
  constructor(
    readonly code: AeatScreenshotFileErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "AeatScreenshotFileError";
  }
}

export interface AeatScreenshotOcrInput {
  kind: AeatCensusScreenshotKind;
  file: File;
}

export interface AeatScreenshotOcrResult {
  kind: AeatCensusScreenshotKind;
  text: string;
  confidence: number;
}

export interface AeatScreenshotOcrProgress {
  fileIndex: number;
  fileCount: number;
  progress: number;
  status: string;
}

function inferredType(file: File): string {
  if (file.type) return file.type.toLowerCase();
  const name = file.name.toLowerCase();
  if (name.endsWith(".png")) return "image/png";
  if (name.endsWith(".webp")) return "image/webp";
  if (name.endsWith(".jpg") || name.endsWith(".jpeg")) return "image/jpeg";
  return "";
}

export function validateAeatScreenshotFile(file: File): void {
  if (!SUPPORTED_TYPES.has(inferredType(file))) {
    throw new AeatScreenshotFileError(
      "UNSUPPORTED_FILE",
      "Usa capturas PNG, JPG o WebP.",
    );
  }
  if (file.size > MAX_AEAT_SCREENSHOT_BYTES) {
    throw new AeatScreenshotFileError(
      "FILE_TOO_LARGE",
      "Cada captura puede ocupar como máximo 8 MB.",
    );
  }
}

async function hasValidMagicBytes(file: File): Promise<boolean> {
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const png =
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a;
  const jpeg = bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const webp =
    bytes.length >= 12 &&
    String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
  return png || jpeg || webp;
}

function progressLabel(status: string): string {
  const labels: Record<string, string> = {
    "loading tesseract core": "Preparando el lector local",
    "initializing tesseract": "Iniciando el lector local",
    "loading language traineddata": "Cargando el idioma",
    "initializing api": "Preparando el reconocimiento",
    "recognizing text": "Leyendo la captura",
  };
  return labels[status] ?? "Procesando en este dispositivo";
}

export async function recognizeAeatScreenshotFiles(
  inputs: AeatScreenshotOcrInput[],
  onProgress?: (progress: AeatScreenshotOcrProgress) => void,
): Promise<AeatScreenshotOcrResult[]> {
  if (inputs.length === 0) return [];
  if (inputs.length > MAX_AEAT_SCREENSHOTS) {
    throw new AeatScreenshotFileError(
      "TOO_MANY_FILES",
      `Puedes leer hasta ${MAX_AEAT_SCREENSHOTS} capturas a la vez.`,
    );
  }
  for (const { file } of inputs) {
    validateAeatScreenshotFile(file);
    if (!(await hasValidMagicBytes(file))) {
      throw new AeatScreenshotFileError(
        "INVALID_IMAGE",
        "Una de las capturas no es una imagen válida.",
      );
    }
  }

  let activeIndex = 0;
  let worker: Awaited<ReturnType<typeof import("tesseract.js")["createWorker"]>> | null = null;
  try {
    const { createWorker, OEM, PSM } = await import("tesseract.js");
    worker = await createWorker("spa", OEM.LSTM_ONLY, {
      workerPath: "/ocr/tesseract-worker.min.js",
      corePath: "/ocr/tesseract-core-lstm.wasm.js",
      langPath: "/ocr/lang",
      logger: (message) =>
        onProgress?.({
          fileIndex: activeIndex,
          fileCount: inputs.length,
          progress: Math.max(0, Math.min(1, message.progress || 0)),
          status: progressLabel(message.status),
        }),
    });
    await worker.setParameters({
      tessedit_pageseg_mode: PSM.AUTO,
      preserve_interword_spaces: "1",
      user_defined_dpi: "150",
    });

    const results: AeatScreenshotOcrResult[] = [];
    for (let index = 0; index < inputs.length; index += 1) {
      activeIndex = index;
      const input = inputs[index];
      onProgress?.({
        fileIndex: index,
        fileCount: inputs.length,
        progress: 0,
        status: "Leyendo la captura",
      });
      const recognized = await worker.recognize(
        input.file,
        { rotateAuto: false },
        { text: true },
      );
      const text = recognized.data.text.trim();
      if (!text) {
        throw new AeatScreenshotFileError(
          "NO_READABLE_TEXT",
          "Una captura no contiene texto legible. Incluye el título y amplía la tabla.",
        );
      }
      if (text.length > MAX_OCR_TEXT_CHARS) {
        throw new AeatScreenshotFileError(
          "OCR_FAILED",
          "Una captura contiene demasiado texto para revisarlo con seguridad.",
        );
      }
      results.push({
        kind: input.kind,
        text,
        confidence: Math.max(0, Math.min(1, recognized.data.confidence / 100)),
      });
    }
    return results;
  } catch (error) {
    if (error instanceof AeatScreenshotFileError) throw error;
    throw new AeatScreenshotFileError(
      "OCR_FAILED",
      "No se han podido leer las capturas en este navegador. Puedes completar los datos manualmente.",
    );
  } finally {
    await worker?.terminate();
  }
}
