import {
  resolveAuthenticatedServerDocumentContext,
  type ServerDocumentAuthResolver,
} from "./auth-context";
import { ingestServerDocument } from "./ingest";
import { createServerDocumentRepositoryForServer } from "./server-factory";
import {
  safeUnauthorizedResponse,
  sanitizeServerDocumentIngestResult,
  type SafeServerDocumentResponse,
} from "./safe-response";
import type { ServerDocumentRepositoryOptions } from "./repository";
import type { SupabaseServerDocumentClient } from "./supabase-store";

assertServerOnlyModule();

export interface ServerDocumentIngestWiringInput<TAuthSource> {
  authSource: TAuthSource;
  authResolver: ServerDocumentAuthResolver<TAuthSource>;
  supabaseClient: SupabaseServerDocumentClient;
  body: unknown;
  repositoryOptions?: ServerDocumentRepositoryOptions;
}

function assertServerOnlyModule() {
  if (typeof window !== "undefined") {
    throw new Error(
      "El wiring de ingest documental solo puede cargarse en servidor.",
    );
  }
}

export async function handleServerDocumentIngestForServer<TAuthSource>({
  authSource,
  authResolver,
  supabaseClient,
  body,
  repositoryOptions,
}: ServerDocumentIngestWiringInput<TAuthSource>): Promise<SafeServerDocumentResponse> {
  const auth = await resolveAuthenticatedServerDocumentContext(
    authSource,
    authResolver,
  );

  if (auth.status !== "authenticated") {
    return safeUnauthorizedResponse();
  }

  const repository = createServerDocumentRepositoryForServer(
    supabaseClient,
    repositoryOptions,
  );
  const result = await ingestServerDocument(repository, auth.context, body);
  return sanitizeServerDocumentIngestResult(result);
}
