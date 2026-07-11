export interface VerifactuRuntimeStatus {
  submissionMode: "disabled";
}

export type VerifactuRuntimeState =
  | { phase: "loading" }
  | { phase: "unknown" }
  | { phase: "unavailable" };

export interface VerifactuConnectionStatus {
  badge: string;
  description: string;
  tone: "disabled" | "loading" | "unknown" | "unavailable";
}

type StatusFetcher = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

function isRuntimeStatus(value: unknown): value is VerifactuRuntimeStatus {
  return (
    typeof value === "object" &&
    value !== null &&
    "submissionMode" in value &&
    value.submissionMode === "disabled"
  );
}

export async function loadVerifactuRuntimeState(
  accessToken: string | null | undefined,
  fetcher: StatusFetcher = fetch,
): Promise<VerifactuRuntimeState> {
  if (!accessToken) return { phase: "unavailable" };

  try {
    const response = await fetcher("/api/verifactu/status", {
      cache: "no-store",
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok) return { phase: "unavailable" };

    const payload: unknown = await response.json();
    if (!isRuntimeStatus(payload)) return { phase: "unavailable" };
    return { phase: "unavailable" };
  } catch {
    return { phase: "unavailable" };
  }
}

export function resolveVerifactuConnectionStatus(
  enabled: boolean,
  runtime: VerifactuRuntimeState,
): VerifactuConnectionStatus {
  if (!enabled) {
    return {
      badge: "Desactivado",
      description:
        "No se registran facturas en Veri*Factu mientras esta opción esté apagada.",
      tone: "disabled",
    };
  }

  if (runtime.phase === "loading") {
    return {
      badge: "Comprobando",
      description:
        "Comprobando el estado de envío antes de mostrar una conclusión.",
      tone: "loading",
    };
  }

  if (runtime.phase === "unknown") {
    return {
      badge: "Estado no verificado",
      description:
        "Esta pantalla no puede confirmar el modo de envío. Revisa la configuración antes de registrar facturas.",
      tone: "unknown",
    };
  }

  return {
    badge: "Estado no disponible",
    description:
      "No se pudo verificar el estado de envío. No se presume ningún modo.",
    tone: "unavailable",
  };
}
