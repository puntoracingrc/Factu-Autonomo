import type {
  FiscalModelCode,
  FiscalModelDefinition,
} from "./contracts";
import { FISCAL_MODEL_FOUNDATION_FIXTURES_V1 } from "./fixtures/foundation-catalog.v1";

export interface ListFiscalModelsOptions {
  readonly includeHistorical?: boolean;
}

function copyModel(model: FiscalModelDefinition): FiscalModelDefinition {
  return Object.freeze({
    ...model,
    supportedTaxYears: Object.freeze([...model.supportedTaxYears]),
    sourceIds: Object.freeze([...model.sourceIds]),
  });
}

export function isFiscalModelCode(value: unknown): value is FiscalModelCode {
  return value === "036" || value === "037" || value === "303";
}

export function listFiscalModels(
  options: ListFiscalModelsOptions = {},
): readonly FiscalModelDefinition[] {
  const includeHistorical = options.includeHistorical === true;
  const models = FISCAL_MODEL_FOUNDATION_FIXTURES_V1.filter(
    (model) => includeHistorical || model.lifecycleStatus !== "HISTORICAL",
  )
    .map(copyModel)
    .sort((left, right) => left.code.localeCompare(right.code));

  return Object.freeze(models);
}

export function getFiscalModelByCode(
  code: unknown,
): FiscalModelDefinition | undefined {
  if (!isFiscalModelCode(code)) return undefined;
  const model = FISCAL_MODEL_FOUNDATION_FIXTURES_V1.find(
    (candidate) => candidate.code === code,
  );
  return model ? copyModel(model) : undefined;
}
