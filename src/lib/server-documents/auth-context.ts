assertServerOnlyModule();

export interface AuthenticatedServerDocumentContext {
  authenticatedUserId: string;
}

export type ServerDocumentAuthResolution =
  | {
      status: "authenticated";
      context: AuthenticatedServerDocumentContext;
    }
  | {
      status: "unauthorized";
      reason: "missing_user";
      message: string;
    };

export interface ServerDocumentAuthSource {
  authenticatedUserId?: string | null;
}

export type ServerDocumentAuthResolver<TSource> = (
  source: TSource,
) => Promise<ServerDocumentAuthSource | null> | ServerDocumentAuthSource | null;

function assertServerOnlyModule() {
  if (typeof window !== "undefined") {
    throw new Error(
      "El contexto auth de documentos canonicos solo puede cargarse en servidor.",
    );
  }
}

function nonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function authenticatedServerDocumentContext(
  authenticatedUserId: string | null | undefined,
): ServerDocumentAuthResolution {
  const userId = nonEmptyString(authenticatedUserId);
  if (!userId) {
    return {
      status: "unauthorized",
      reason: "missing_user",
      message: "No autorizado.",
    };
  }

  return {
    status: "authenticated",
    context: { authenticatedUserId: userId },
  };
}

export async function resolveAuthenticatedServerDocumentContext<TSource>(
  source: TSource,
  resolver: ServerDocumentAuthResolver<TSource>,
): Promise<ServerDocumentAuthResolution> {
  const resolved = await resolver(source);
  return authenticatedServerDocumentContext(resolved?.authenticatedUserId);
}
