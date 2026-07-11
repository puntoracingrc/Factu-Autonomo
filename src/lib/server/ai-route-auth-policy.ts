import { isBillingEnforced } from "@/lib/billing/config";

assertServerOnlyModule();

type AiRouteAuthEnvironment = Partial<
  Pick<
    NodeJS.ProcessEnv,
    | "APP_ENV"
    | "CI"
    | "DEPLOY_ENV"
    | "NEXT_PUBLIC_BILLING_ENABLED"
    | "NEXT_PUBLIC_VERCEL_ENV"
    | "NODE_ENV"
    | "VERCEL"
    | "VERCEL_ENV"
  >
>;

function assertServerOnlyModule() {
  if (typeof window !== "undefined") {
    throw new Error(
      "La política de autenticación de rutas IA solo puede cargarse en servidor.",
    );
  }
}

function hasRemoteRuntimeMarker(env: AiRouteAuthEnvironment): boolean {
  return Boolean(
    env.CI ||
      env.VERCEL ||
      env.VERCEL_ENV ||
      env.NEXT_PUBLIC_VERCEL_ENV ||
      env.APP_ENV ||
      env.DEPLOY_ENV,
  );
}

export function isExplicitLocalDevelopment(
  env: AiRouteAuthEnvironment = process.env,
): boolean {
  return env.NODE_ENV === "development" && !hasRemoteRuntimeMarker(env);
}

function isLocalRequest(request: Request): boolean {
  const hostname = new URL(request.url).hostname.toLowerCase();
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "[::1]"
  );
}

export function isAiRouteAuthenticationRequired(
  request: Request,
  env: AiRouteAuthEnvironment = process.env,
): boolean {
  return (
    isBillingEnforced(env) ||
    !isExplicitLocalDevelopment(env) ||
    !isLocalRequest(request)
  );
}
