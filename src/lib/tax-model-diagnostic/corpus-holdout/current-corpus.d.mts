import type { FiscalDocumentType } from "../extractors/contracts";
import type { TaxCorpusManifestRecord } from "./contracts";

export const REQUIRED_TAX_CORPUS_FAMILIES: readonly FiscalDocumentType[];

export function loadPublicTaxCorpus(
  repositoryRoot?: string,
): Promise<readonly TaxCorpusManifestRecord[]>;

export function loadEngineeringHoldoutCorpus(
  repositoryRoot?: string,
): Promise<readonly TaxCorpusManifestRecord[]>;

export function loadIndependentHoldoutCorpus(
  holdoutRoot: string,
): Promise<readonly TaxCorpusManifestRecord[]>;
