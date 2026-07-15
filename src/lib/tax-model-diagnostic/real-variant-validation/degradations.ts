import type { RealVariantVisualVariant } from "./contracts";

export interface DegradationRecipe {
  id: Exclude<RealVariantVisualVariant, "NATIVE">;
  outputSuffix: string;
  dpi: 150 | 200 | 300;
  compressionQuality: number;
  rotationDegrees: number;
  perspectivePercent: number;
  lightingUnevenness: number;
  cropPercent: number;
  grayscale: boolean;
  monochromeThreshold: number | null;
}

export interface DeterministicDegradationPlan {
  planVersion: "tax-real-variant-degradation.2026-07.v1";
  fixtureId: string;
  parentSha256: string;
  seed: number;
  recipes: readonly DegradationRecipe[];
}

const SHA256_PATTERN = /^[a-f0-9]{64}$/;
const FIXTURE_ID_PATTERN = /^[a-z0-9][a-z0-9-]{2,127}$/;

function deterministicSeed(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function freezeRecipe(recipe: DegradationRecipe): DegradationRecipe {
  return Object.freeze({ ...recipe });
}

export function buildDeterministicDegradationPlan(
  fixtureId: string,
  parentSha256: string,
): DeterministicDegradationPlan {
  if (!FIXTURE_ID_PATTERN.test(fixtureId)) {
    throw new Error("INVALID_FIXTURE_ID");
  }
  if (!SHA256_PATTERN.test(parentSha256)) {
    throw new Error("INVALID_PARENT_SHA256");
  }
  const seed = deterministicSeed(`${fixtureId}:${parentSha256}`);
  const smallRotation = Number((((seed % 501) - 250) / 100).toFixed(2));
  const recipes: DegradationRecipe[] = [
    {
      id: "SCAN_300_DPI",
      outputSuffix: "scan-300dpi",
      dpi: 300,
      compressionQuality: 92,
      rotationDegrees: 0,
      perspectivePercent: 0,
      lightingUnevenness: 0,
      cropPercent: 0,
      grayscale: false,
      monochromeThreshold: null,
    },
    {
      id: "SCAN_200_DPI",
      outputSuffix: "scan-200dpi",
      dpi: 200,
      compressionQuality: 86,
      rotationDegrees: 0,
      perspectivePercent: 0,
      lightingUnevenness: 0,
      cropPercent: 0,
      grayscale: false,
      monochromeThreshold: null,
    },
    {
      id: "SCAN_150_DPI",
      outputSuffix: "scan-150dpi",
      dpi: 150,
      compressionQuality: 80,
      rotationDegrees: 0,
      perspectivePercent: 0,
      lightingUnevenness: 0,
      cropPercent: 0,
      grayscale: false,
      monochromeThreshold: null,
    },
    {
      id: "COMPRESSION_MODERATE",
      outputSuffix: "compression-moderate",
      dpi: 200,
      compressionQuality: 65,
      rotationDegrees: 0,
      perspectivePercent: 0,
      lightingUnevenness: 0,
      cropPercent: 0,
      grayscale: false,
      monochromeThreshold: null,
    },
    {
      id: "COMPRESSION_STRONG",
      outputSuffix: "compression-strong",
      dpi: 150,
      compressionQuality: 35,
      rotationDegrees: 0,
      perspectivePercent: 0,
      lightingUnevenness: 0,
      cropPercent: 0,
      grayscale: false,
      monochromeThreshold: null,
    },
    {
      id: "ROTATION_SMALL",
      outputSuffix: "rotation-small",
      dpi: 200,
      compressionQuality: 86,
      rotationDegrees: smallRotation === 0 ? 1.25 : smallRotation,
      perspectivePercent: 0,
      lightingUnevenness: 0,
      cropPercent: 0,
      grayscale: false,
      monochromeThreshold: null,
    },
    {
      id: "ROTATION_90",
      outputSuffix: "rotation-90",
      dpi: 200,
      compressionQuality: 86,
      rotationDegrees: 90,
      perspectivePercent: 0,
      lightingUnevenness: 0,
      cropPercent: 0,
      grayscale: false,
      monochromeThreshold: null,
    },
    {
      id: "PHOTOGRAPHED_PERSPECTIVE",
      outputSuffix: "photographed-perspective",
      dpi: 200,
      compressionQuality: 78,
      rotationDegrees: 0,
      perspectivePercent: 2,
      lightingUnevenness: 0.08,
      cropPercent: 0,
      grayscale: false,
      monochromeThreshold: null,
    },
    {
      id: "UNEVEN_LIGHTING",
      outputSuffix: "uneven-lighting",
      dpi: 200,
      compressionQuality: 82,
      rotationDegrees: 0,
      perspectivePercent: 0,
      lightingUnevenness: 0.18,
      cropPercent: 0,
      grayscale: false,
      monochromeThreshold: null,
    },
    {
      id: "PARTIAL_CROP",
      outputSuffix: "partial-crop",
      dpi: 200,
      compressionQuality: 86,
      rotationDegrees: 0,
      perspectivePercent: 0,
      lightingUnevenness: 0,
      cropPercent: 4,
      grayscale: false,
      monochromeThreshold: null,
    },
    {
      id: "GRAYSCALE",
      outputSuffix: "grayscale",
      dpi: 200,
      compressionQuality: 86,
      rotationDegrees: 0,
      perspectivePercent: 0,
      lightingUnevenness: 0,
      cropPercent: 0,
      grayscale: true,
      monochromeThreshold: null,
    },
    {
      id: "MONOCHROME",
      outputSuffix: "monochrome",
      dpi: 200,
      compressionQuality: 90,
      rotationDegrees: 0,
      perspectivePercent: 0,
      lightingUnevenness: 0,
      cropPercent: 0,
      grayscale: true,
      monochromeThreshold: 170,
    },
  ];
  return Object.freeze({
    planVersion: "tax-real-variant-degradation.2026-07.v1",
    fixtureId,
    parentSha256,
    seed,
    recipes: Object.freeze(recipes.map(freezeRecipe)),
  });
}
