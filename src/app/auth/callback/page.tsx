"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseClientAsync } from "@/lib/supabase/client";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [message, setMessage] = useState("Confirmando tu cuenta…");

  useEffect(() => {
    void (async () => {
      const supabase = await getSupabaseClientAsync();
      if (!supabase) {
        setMessage("La nube no está configurada en este servidor.");
        return;
      }

      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          setMessage(
            "No se pudo confirmar el enlace. Prueba a reenviar el email de confirmación desde Ajustes.",
          );
          return;
        }
      }

      const { data } = await supabase.auth.getSession();
      if (data.session) {
        router.replace("/configuracion?auth=confirmed");
        return;
      }

      router.replace("/configuracion?auth=pending");
    })();
  }, [router]);

  return (
    <p className="py-16 text-center text-slate-600" role="status">
      {message}
    </p>
  );
}
