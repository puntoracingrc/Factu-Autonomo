export const TAX_MODEL_DIAGNOSTIC_FLAG =
  "NEXT_PUBLIC_TAX_MODEL_DIAGNOSTIC_ENABLED" as const;

export function resolveTaxModelDiagnosticFlag(env: {
  configured: string | undefined;
  nodeEnv: string | undefined;
}): boolean {
  if (env.configured !== undefined) return env.configured === "true";
  return env.nodeEnv !== "production";
}

export function isTaxModelDiagnosticEnabled(): boolean {
  return resolveTaxModelDiagnosticFlag({
    configured: process.env.NEXT_PUBLIC_TAX_MODEL_DIAGNOSTIC_ENABLED,
    nodeEnv: process.env.NODE_ENV,
  });
}

