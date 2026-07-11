assertServerOnlyModule();

export const SERVER_DOCUMENT_INGEST_ROUTE_FLAG =
  "SERVER_DOCUMENT_INGEST_ROUTE_ENABLED";

function assertServerOnlyModule() {
  if (typeof window !== "undefined") {
    throw new Error(
      "El flag de ruta de ingest documental solo puede cargarse en servidor.",
    );
  }
}

export function isServerDocumentIngestRouteEnabled(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  const explicitlyEnabled =
    env[SERVER_DOCUMENT_INGEST_ROUTE_FLAG] === "true";
  if (!explicitlyEnabled) return false;

  const production =
    env.NODE_ENV === "production" ||
    env.VERCEL_ENV === "production" ||
    env.APP_ENV === "production" ||
    env.DEPLOY_ENV === "production";
  const remote =
    env.VERCEL === "1" ||
    env.VERCEL_ENV === "preview" ||
    env.VERCEL_ENV === "staging" ||
    env.APP_ENV === "staging" ||
    env.DEPLOY_ENV === "staging";

  return !production && !remote;
}
