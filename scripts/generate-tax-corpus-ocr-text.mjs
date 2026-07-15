#!/usr/bin/env node

/**
 * Generate deterministic first-page OCR transcripts for the synthetic forms.
 *
 * The form backgrounds are raster images while the filled values are a native
 * PDF overlay. The browser uses the same sparse-text strategy and merges both
 * sources. Keeping the merged transcript in the corpus lets CI exercise all
 * 41 semantic cases without running OCR during every test run.
 */

import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createCanvas, DOMMatrix, ImageData, Path2D } from "@napi-rs/canvas";
import { createWorker, OEM, PSM } from "tesseract.js";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const corpusRoot = join(
  repositoryRoot,
  "test/fixtures/tax-model-diagnostic",
);
const manifestsRoot = join(corpusRoot, "manifests");

globalThis.DOMMatrix ??= DOMMatrix;
globalThis.ImageData ??= ImageData;
globalThis.Path2D ??= Path2D;

const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
const worker = await createWorker("spa", OEM.LSTM_ONLY, {
  workerPath: resolve(
    repositoryRoot,
    "node_modules/tesseract.js/src/worker-script/node/index.js",
  ),
  corePath: resolve(
    repositoryRoot,
    "node_modules/tesseract.js-core/tesseract-core-lstm.wasm.js",
  ),
  langPath: join(repositoryRoot, "public/ocr/lang"),
  cacheMethod: "none",
});

await worker.setParameters({
  tessedit_pageseg_mode: PSM.SPARSE_TEXT,
  preserve_interword_spaces: "1",
  user_defined_dpi: "180",
});

let generated = 0;
try {
  for (const name of readdirSync(manifestsRoot).sort()) {
    if (!name.endsWith(".json")) continue;
    const manifest = JSON.parse(
      readFileSync(join(manifestsRoot, name), "utf8"),
    );
    if (manifest.source.kind !== "SYNTHETIC_OFFICIAL_FORM") continue;

    const pdfPath = join(corpusRoot, manifest.asset.pdfPath);
    const textPath = join(corpusRoot, manifest.asset.extractedTextPath);
    const nativeText = readFileSync(textPath, "utf8").trim();
    const document = await pdfjs.getDocument({
      data: new Uint8Array(readFileSync(pdfPath)),
      isEvalSupported: false,
      disableWorker: true,
      standardFontDataUrl: `${join(
        repositoryRoot,
        "node_modules/pdfjs-dist/standard_fonts",
      )}/`,
    }).promise;
    try {
      const page = await document.getPage(1);
      const unitViewport = page.getViewport({ scale: 1 });
      const scale = Math.min(
        2,
        2_200 / Math.max(unitViewport.width, unitViewport.height),
      );
      const viewport = page.getViewport({ scale });
      const canvas = createCanvas(
        Math.ceil(viewport.width),
        Math.ceil(viewport.height),
      );
      await page.render({
        canvasContext: canvas.getContext("2d"),
        viewport,
      }).promise;
      const recognized = await worker.recognize(
        await canvas.encode("png"),
        { rotateAuto: false },
        { text: true },
      );
      const merged = [recognized.data.text.trim(), nativeText]
        .filter(Boolean)
        .join("\n");
      writeFileSync(textPath, `${merged}\n`, "utf8");
      generated += 1;
    } finally {
      await document.destroy();
    }
  }
} finally {
  await worker.terminate();
}

process.stdout.write(
  `OCR fiscal generado para ${generated} formularios sintéticos.\n`,
);
