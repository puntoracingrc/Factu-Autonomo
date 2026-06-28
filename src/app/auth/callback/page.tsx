"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseClientAsync } from "@/lib/supabase/client";

async function completeAuthCallback(): Promise<"confirmed" | "pending" | "error"> {
  const supabase = await getSupabaseClientAsync();
  if (!supabase) return "error";

  const query = new URLSearchParams(window.location.search);
  const code = query.get("code");
  const tokenHash = query.get("token_hash");
  const type = query.get("type");

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) return "pending";
  } else if (tokenHash && type) {
    const otpType =
      type === "signup" || type === "email" || type === "recovery"
        ? type
        : "email";
    const { error } = await supabase.auth.verifyOtp({
      type: otpType,
      token_hash: tokenHash,
    });
    if (error) return "pending";
  }

  const hash = window.location.hash.startsWith("#")
    ? window.location.hash.slice(1)
    : window.location.hash;
  if (hash) {
    const hashParams = new URLSearchParams(hash);
    const accessToken = hashParams.get("access_token");
    const refreshToken = hashParams.get("refresh_token");
    if (accessToken && refreshToken) {
      const { error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
      if (error) return "pending";
    }
  }

  const { data } = await supabase.auth.getSession();
  return data.session ? "confirmed" : "pending";
}

export default function AuthCallbackPage() {
  const router = useRouter();
  const [message, setMessage] = useState("Confirmando tu cuenta…");

  useEffect(() => {
    void (async () => {
      try {
        const result = await completeAuthCallback();
        if (result === "error") {
          setMessage("La nube no está configurada en este servidor.");
          return;
        }
        router.replace(`/cuenta?auth=${result}#inicio-sesion`);
      } catch {
        setMessage(
          "No se pudo confirmar. Vuelve a Ajustes y pulsa «Reenviar email de confirmación».",
        );
      }
    })();
  }, [router]);

  return (
    <div className="mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
      <p className="text-4xl" aria-hidden>
        🤖
      </p>
      <p className="mt-3 text-sm font-medium text-slate-700" role="status">
        {message}
      </p>
    </div>
  );
}
