"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  completeSupabaseAuthCallback,
  type AuthCallbackResult,
} from "@/lib/supabase/auth-callback";
import { getSupabaseClientAsync } from "@/lib/supabase/client";

async function completeAuthCallback(): Promise<AuthCallbackResult> {
  const supabase = await getSupabaseClientAsync();
  if (!supabase) return "error";
  return completeSupabaseAuthCallback({
    search: window.location.search,
    hash: window.location.hash,
    dependencies: {
      getSession: () => supabase.auth.getSession(),
      signOutLocal: () => supabase.auth.signOut({ scope: "local" }),
      exchangeCodeForSession: (code) =>
        supabase.auth.exchangeCodeForSession(code),
      verifyOtp: (input) => supabase.auth.verifyOtp(input),
      setSession: (input) => supabase.auth.setSession(input),
    },
  });
}

export default function AuthCallbackPage() {
  const router = useRouter();
  const [message, setMessage] = useState("Confirmando tu cuenta…");

  useEffect(() => {
    void (async () => {
      try {
        const result = await completeAuthCallback();
        if (result === "error") {
          setMessage("El servicio de cuenta no está configurado en este servidor.");
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
