"use client";

type GoogleTokenResponse = {
  code?: string;
  error?: string;
  error_description?: string;
};

const GOOGLE_IDENTITY_SCRIPT = "https://accounts.google.com/gsi/client";
const GOOGLE_AUTH_STATE_KEY = "factura-autonomo-google-auth-state";

let googleScriptPromise: Promise<void> | null = null;

function loadGoogleIdentityScript(): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Google solo puede abrirse en el navegador."));
  }

  if (window.google?.accounts?.oauth2) {
    return Promise.resolve();
  }

  if (googleScriptPromise) return googleScriptPromise;

  googleScriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${GOOGLE_IDENTITY_SCRIPT}"]`,
    );
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener(
        "error",
        () => reject(new Error("No se pudo cargar Google.")),
        { once: true },
      );
      return;
    }

    const script = document.createElement("script");
    script.src = GOOGLE_IDENTITY_SCRIPT;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("No se pudo cargar Google."));
    document.head.appendChild(script);
  });

  return googleScriptPromise;
}

function makeGoogleAuthCallbackUrl(): string {
  return `${window.location.origin}/google-auth/callback`;
}

function makeState(): string {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function getPendingGoogleLoginState(): string {
  if (typeof window === "undefined") return "";
  return window.sessionStorage.getItem(GOOGLE_AUTH_STATE_KEY) || "";
}

export function clearPendingGoogleLoginState(): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(GOOGLE_AUTH_STATE_KEY);
}

export async function startGoogleLoginRedirect(clientId: string): Promise<void> {
  await loadGoogleIdentityScript();

  const initCodeClient = window.google?.accounts?.oauth2?.initCodeClient;
  if (!initCodeClient) {
    throw new Error("Google no está disponible en este navegador.");
  }

  return new Promise((resolve, reject) => {
    const state = makeState();
    window.sessionStorage.setItem(GOOGLE_AUTH_STATE_KEY, state);

    const codeClient = initCodeClient({
      client_id: clientId,
      scope: "openid email profile",
      ux_mode: "redirect",
      redirect_uri: makeGoogleAuthCallbackUrl(),
      state,
      include_granted_scopes: false,
      callback: (response: GoogleTokenResponse) => {
        if (response.error) {
          clearPendingGoogleLoginState();
          reject(
            new Error(
              response.error_description || response.error || "Google canceló el acceso.",
            ),
          );
          return;
        }
        if (!response.code) {
          clearPendingGoogleLoginState();
          reject(new Error("Google no devolvió un código de acceso."));
          return;
        }
        resolve();
      },
      error_callback: (error: unknown) => {
        const record =
          error && typeof error === "object" ? (error as Record<string, unknown>) : {};
        clearPendingGoogleLoginState();
        reject(
          new Error(
            (typeof record.message === "string" && record.message) ||
              (typeof record.type === "string" && record.type) ||
              "No se pudo abrir la ventana de Google.",
          ),
        );
      },
    });

    codeClient.requestCode();
    resolve();
  });
}

export function friendlyGoogleLoginError(error: unknown): string {
  const raw =
    error instanceof Error ? error.message : "No se pudo iniciar sesión con Google.";
  const message = raw.toLowerCase();

  if (message.includes("popup") || message.includes("ventana")) {
    return "No se pudo abrir Google. Revisa si el navegador ha bloqueado la ventana emergente.";
  }
  if (message.includes("access_denied") || message.includes("denied")) {
    return "Google no ha autorizado el acceso. Si la app sigue en pruebas, añade este email como usuario de prueba en Google Cloud o publica la app.";
  }
  if (message.includes("origin") || message.includes("redirect")) {
    return "Google no reconoce este dominio. Revisa los orígenes autorizados del cliente OAuth.";
  }
  if (message.includes("token")) {
    return "Google no devolvió una sesión válida. Cierra esta ventana e inténtalo otra vez.";
  }

  return raw;
}
