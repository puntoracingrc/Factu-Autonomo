"use client";

type GoogleTokenResponse = {
  code?: string;
  error?: string;
  error_description?: string;
};

type GoogleAuthTokenPayload =
  | { idToken: string; accessToken?: string }
  | { error: string };

const GOOGLE_IDENTITY_SCRIPT = "https://accounts.google.com/gsi/client";

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

export async function requestGoogleLoginTokens(
  clientId: string,
): Promise<{ idToken: string; accessToken?: string }> {
  await loadGoogleIdentityScript();

  const initCodeClient = window.google?.accounts?.oauth2?.initCodeClient;
  if (!initCodeClient) {
    throw new Error("Google no está disponible en este navegador.");
  }

  return new Promise((resolve, reject) => {
    const codeClient = initCodeClient({
      client_id: clientId,
      scope: "openid email profile",
      ux_mode: "popup",
      include_granted_scopes: false,
      callback: async (response: GoogleTokenResponse) => {
        if (response.error) {
          reject(
            new Error(
              response.error_description || response.error || "Google canceló el acceso.",
            ),
          );
          return;
        }
        if (!response.code) {
          reject(new Error("Google no devolvió un código de acceso."));
          return;
        }
        try {
          const tokenResponse = await fetch("/api/google-auth/token", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ code: response.code }),
          });
          const payload = (await tokenResponse.json()) as GoogleAuthTokenPayload;
          if (!tokenResponse.ok || "error" in payload) {
            reject(
              new Error(
                "error" in payload
                  ? payload.error
                  : "No se pudo completar el acceso con Google.",
              ),
            );
            return;
          }
          resolve(payload);
        } catch (error) {
          reject(error);
        }
      },
      error_callback: (error: unknown) => {
        const record =
          error && typeof error === "object" ? (error as Record<string, unknown>) : {};
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
