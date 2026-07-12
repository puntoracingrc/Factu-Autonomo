import type { ManualScreenshot } from "./types";
import { manualSections } from "./sections";

export interface ManualScreenshotUsage {
  sectionSlug: string;
  stepTitle: string;
  screenshot: ManualScreenshot;
}

export function collectManualScreenshotUsages(): ManualScreenshotUsage[] {
  return manualSections.flatMap((section) =>
    section.steps.flatMap((step) =>
      step.screenshot
        ? [
            {
              sectionSlug: section.slug,
              stepTitle: step.title,
              screenshot: step.screenshot,
            },
          ]
        : [],
    ),
  );
}

export function collectManualScreenshots(): ManualScreenshot[] {
  const seen = new Set<string>();
  const screenshots: ManualScreenshot[] = [];

  for (const { screenshot } of collectManualScreenshotUsages()) {
    if (!screenshot.src || seen.has(screenshot.src)) continue;
    seen.add(screenshot.src);
    screenshots.push(screenshot);
  }

  return screenshots.sort((a, b) => a.src.localeCompare(b.src));
}

/** Ruta en disco bajo `public/` a partir de `screenshot.src`. */
export function manualScreenshotPublicPath(src: string): string {
  return src.replace(/^\//, "");
}
