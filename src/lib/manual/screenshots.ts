import type { ManualScreenshot } from "./types";
import { manualSections } from "./sections";

export function collectManualScreenshots(): ManualScreenshot[] {
  const seen = new Set<string>();
  const screenshots: ManualScreenshot[] = [];

  for (const section of manualSections) {
    for (const step of section.steps) {
      const shot = step.screenshot;
      if (!shot?.src || seen.has(shot.src)) continue;
      seen.add(shot.src);
      screenshots.push(shot);
    }
  }

  return screenshots.sort((a, b) => a.src.localeCompare(b.src));
}

/** Ruta en disco bajo `public/` a partir de `screenshot.src`. */
export function manualScreenshotPublicPath(src: string): string {
  return src.replace(/^\//, "");
}
