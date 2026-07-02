"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  clearPendingGoogleLoginState,
  getPendingGoogleLoginState,
} from "@/lib/google-auth/browser";
import { getSupabaseClientAsync } from "@/lib/supabase/client";

type GoogleAuthTokenPayload =
  | { idToken: string; accessToken?: string }
  | { error: string };

async function completeGoogleLogin(): Promise<void> {
  const params = new URLSearchParams(window.location.search);
  const error = params.get("error");
  if (error) {
    throw new Error(params.get("error_description") || "Google canceló el acceso.");
  }

  const code = params.get("code") || "";
  if (!code) {
    throw new Error("Google no devolvió una sesión válida.");
  }

  const state = params.get("state") || "";
  const pendingState = getPendingGoogleLoginState();
  if (!state || !pendingState || state !== pendingState) {
    throw new Error("No se pudo verificar la respuesta de Google.");
  }

  const tokenResponse = await fetch("/api/google-auth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      code,
      redirectUri: `${window.location.origin}/google-auth/callback`,
    }),
  });
  const payload = (await tokenResponse.json()) as GoogleAuthTokenPayload;
  if (!tokenResponse.ok || "error" in payload) {
    throw new Error(
      "error" in payload
        ? payload.error
        : "No se pudo completar el acceso con Google.",
    );
  }

  const supabase = await getSupabaseClientAsync();
  if (!supabase) {
    throw new Error("La nube no está configurada en este servidor.");
  }

  const { error: signInError } = await supabase.auth.signInWithIdToken({
    provider: "google",
    token: payload.idToken,
    access_token: payload.accessToken,
  });
  if (signInError) throw new Error(signInError.message);

  clearPendingGoogleLoginState();
}

export default function GoogleAuthCallbackPage() {
  const router = useRouter();
  const [message, setMessage] = useState("Terminando inicio de sesión con Google…");
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        await completeGoogleLogin();
        router.replace("/cuenta?auth=google#inicio-sesion");
      } catch (error) {
        clearPendingGoogleLoginState();
        setFailed(true);
        setMessage(
          error instanceof Error
            ? error.message
            : "No se pudo iniciar sesión con Google.",
        );
      }
    })();
  }, [router]);

  return (
    <main className="mx-auto flex min-h-[60vh] max-w-md items-center justify-center px-4">
      <section className="w-full rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
        <p className="text-4xl font-black text-blue-600" aria-hidden>
          FA
        </p>
        <h1 className="mt-3 text-2xl font-black text-slate-950">
          {failed ? "Google no pudo iniciar sesión" : "Conectando con Google"}
        </h1>
        <p className="mt-3 text-sm font-medium text-slate-700" role="status">
          {message}
        </p>
        {failed ? (
          <Link
            href="/cuenta#inicio-sesion"
            className="mt-5 inline-flex min-h-12 items-center justify-center rounded-xl border border-blue-200 px-5 font-bold text-blue-700"
          >
            Volver a Cuenta
          </Link>
        ) : null}
      </section>
    </main>
  );
}
