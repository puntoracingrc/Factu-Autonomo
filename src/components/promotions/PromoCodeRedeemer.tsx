"use client";

import { useState } from "react";
import { Gift, TicketCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { getSupabaseClientAsync } from "@/lib/supabase/client";

export function PromoCodeRedeemer() {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const redeem = async () => {
    setBusy(true);
    setMessage(null);
    setSuccess(false);
    try {
      const supabase = await getSupabaseClientAsync();
      const { data } = (await supabase?.auth.getSession()) ?? { data: { session: null } };
      const token = data.session?.access_token;
      if (!token) throw new Error("Inicia sesión para canjear el código.");
      const response = await fetch("/api/promotions/redeem", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ code }),
      });
      const body = (await response.json()) as { message?: string; error?: string };
      if (!response.ok) throw new Error(body.message ?? body.error ?? "No se pudo aplicar el código.");
      setSuccess(true);
      setMessage(body.message ?? "Código aplicado correctamente.");
      setCode("");
      window.dispatchEvent(new Event("fa-billing-refresh"));
    } catch (redeemError) {
      setMessage(redeemError instanceof Error ? redeemError.message : "No se pudo aplicar el código.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="mt-4 border-emerald-200" aria-labelledby="promo-redeem-title">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
          <Gift className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 id="promo-redeem-title" className="font-bold text-slate-900">Código promocional</h2>
          <p className="mt-1 text-sm text-slate-600">Canjea aquí ventajas temporales o packs IA creados por Facturación Autónomos.</p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <label className="min-w-0 flex-1">
              <span className="sr-only">Código promocional</span>
              <input value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} autoComplete="off" placeholder="FACTU-..." className="w-full rounded-xl border border-slate-200 px-4 py-3 font-mono text-base uppercase" />
            </label>
            <Button type="button" onClick={() => void redeem()} disabled={busy || code.trim().length < 8}>
              <TicketCheck className="h-4 w-4" /> {busy ? "Aplicando..." : "Canjear"}
            </Button>
          </div>
          {message && (
            <p role="status" className={`mt-3 text-sm font-semibold ${success ? "text-emerald-700" : "text-red-700"}`}>{message}</p>
          )}
        </div>
      </div>
    </Card>
  );
}
