export const CENTRAL_AUTHORITY_PLAN_LOADING_ERROR =
  "Estamos preparando el acceso al servidor central. Espera un momento y vuelve a guardar. Si el aviso no desaparece, ve a Cuenta > Migración central para revisar las diferencias.";

export type CentralAuthorityPlanGateMode = "local" | "loading" | "central";

export interface CentralAuthorityPlanGate {
  mode: CentralAuthorityPlanGateMode;
  authenticatedUserId: string | null;
  centralUserId: string | null;
}

export interface CentralAuthorityPlanGateInput {
  resolvedUserId: string | null;
  cloudUserId: string | null;
  billingLoading: boolean;
  cloudSyncIncluded: boolean;
  centralBootstrapReady: boolean;
}

function normalizeUserId(userId: string | null): string | null {
  const normalized = userId?.trim() ?? "";
  return normalized || null;
}

export function evaluateCentralAuthorityPlanGate(
  input: CentralAuthorityPlanGateInput,
): CentralAuthorityPlanGate {
  const authenticatedUserId = normalizeUserId(input.resolvedUserId);
  const cloudUserId = normalizeUserId(input.cloudUserId);

  if (!authenticatedUserId) {
    return {
      mode: "local",
      authenticatedUserId: null,
      centralUserId: null,
    };
  }

  if (
    input.billingLoading ||
    !cloudUserId ||
    cloudUserId !== authenticatedUserId
  ) {
    return {
      mode: "loading",
      authenticatedUserId,
      centralUserId: null,
    };
  }

  if (!input.cloudSyncIncluded) {
    return {
      mode: "local",
      authenticatedUserId,
      centralUserId: null,
    };
  }

  if (!input.centralBootstrapReady) {
    return {
      mode: "loading",
      authenticatedUserId,
      centralUserId: null,
    };
  }

  return {
    mode: "central",
    authenticatedUserId,
    centralUserId: authenticatedUserId,
  };
}

export function centralAuthorityPlanLoadingFailure(): {
  ok: false;
  error: string;
} {
  return {
    ok: false,
    error: CENTRAL_AUTHORITY_PLAN_LOADING_ERROR,
  };
}
