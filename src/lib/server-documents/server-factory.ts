import {
  ServerDocumentRepository,
  type ServerDocumentRepositoryOptions,
  type ServerDocumentRepositoryStore,
} from "./repository";
import {
  SupabaseServerDocumentStore,
  type SupabaseServerDocumentClient,
} from "./supabase-store";

assertServerOnlyModule();

function assertServerOnlyModule() {
  if (typeof window !== "undefined") {
    throw new Error(
      "La factory de documentos canonicos solo puede cargarse en servidor.",
    );
  }
}

export function createServerDocumentStoreForServer(
  client: SupabaseServerDocumentClient,
): ServerDocumentRepositoryStore {
  return new SupabaseServerDocumentStore(client);
}

export function createServerDocumentRepositoryForServer(
  client: SupabaseServerDocumentClient,
  options: ServerDocumentRepositoryOptions = {},
): ServerDocumentRepository {
  return new ServerDocumentRepository(
    createServerDocumentStoreForServer(client),
    options,
  );
}
