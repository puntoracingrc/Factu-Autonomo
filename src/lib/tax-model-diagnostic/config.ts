export const TAX_MODEL_DIAGNOSTIC_FLAG =
  "NEXT_PUBLIC_TAX_MODEL_DIAGNOSTIC_ENABLED" as const;

export function resolveTaxModelDiagnosticFlag(env: {
  configured: string | undefined;
  nodeEnv: string | undefined;
  vercelEnv?: string | undefined;
}): boolean {
  if (env.configured !== undefined) return env.configured === "true";

  // Vercel builds previews with NODE_ENV=production as well. Use its explicit
  // deployment target so preview QA stays available without opening production.
  if (env.vercelEnv === "preview") return true;
  if (env.vercelEnv === "production") return false;

  return env.nodeEnv !== "production";
}

export function isTaxModelDiagnosticEnabled(): boolean {
  return resolveTaxModelDiagnosticFlag({
    configured: process.env.NEXT_PUBLIC_TAX_MODEL_DIAGNOSTIC_ENABLED,
    nodeEnv: process.env.NODE_ENV,
    vercelEnv:
      process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.VERCEL_ENV,
  });
}
