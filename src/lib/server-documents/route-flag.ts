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
  return env[SERVER_DOCUMENT_INGEST_ROUTE_FLAG] === "true";
}
