export interface TaxInsightsRatio {
  numerator: number;
  denominator: number;
  rate: number | null;
}

export interface TaxDiagnosticInsightsReport {
  schemaVersion: string;
  generatedAt: string;
  period: { from: string; to: string } | null;
  retentionDays: number;
  eventVolume: number;
  funnel: Record<string, number | TaxInsightsRatio>;
  questions: Array<Record<string, unknown>>;
  models: Array<Record<string, unknown>>;
  documents: Array<Record<string, unknown>>;
  versions: Record<string, number>;
  signals: Array<Record<string, unknown>>;
  regressions: Array<Record<string, unknown>>;
  recommendations: string[];
  safeguards: {
    changesRulesAutomatically: false;
    approvesFiscalRules: false;
    authorizedFiscalExclusion: false;
    allModelsViewRequired: true;
  };
}

export const initialProductThresholds: Readonly<Record<string, unknown>>;
export const TAX_INSIGHTS_ACTION_CODES: readonly string[];
export function aggregateTaxDiagnosticInsights(
  events: Array<Record<string, unknown>>,
  options?: Record<string, unknown>,
): TaxDiagnosticInsightsReport;
export function renderTaxDiagnosticInsightsMarkdown(
  report: TaxDiagnosticInsightsReport,
): string;
