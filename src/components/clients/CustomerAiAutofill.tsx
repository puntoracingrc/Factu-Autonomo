"use client";

import { useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { UpgradeModal } from "@/components/billing/UpgradeModal";
import {
  AiProcessingConsentNotice,
  useAiProcessingConsent,
} from "@/components/legal/AiProcessingConsentNotice";
import { Button } from "@/components/ui/Button";
import { Field, Textarea } from "@/components/ui/Field";
import { useBilling } from "@/context/BillingContext";
import { useCloudSync } from "@/context/CloudSyncContext";

export interface CustomerAiAutofillValues {
  firstName: string;
  lastName: string;
  nif: string;
  email: string;
  phone: string;
  streetType: string;
  address: string;
  city: string;
  postalCode: string;
  notes: string;
}

interface CustomerAiAutofillProps {
  onApply: (values: Partial<CustomerAiAutofillValues>) => void;
}

export function CustomerAiAutofill({ onApply }: CustomerAiAutofillProps) {
  const { billingEnabled, limits } = useBilling();
  const { user } = useCloudSync();
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [upgradeReason, setUpgradeReason] = useState<string | undefined>();
  const aiConsent = useAiProcessingConsent();

  const locked = billingEnabled && !limits.aiTextAutofill;

  async function handleAutofill() {
    const rawText = text.trim();
    setError(null);
    setWarnings([]);

    if (locked) {
      setUpgradeReason("El autorrelleno de clientes con IA requiere plan Pro.");
      setUpgradeOpen(true);
      return;
    }

    if (!aiConsent.accepted) {
      setError("Acepta primero el aviso de tratamiento con IA.");
      return;
    }

    if (rawText.length < 10) {
      setError("Pega al menos una línea con datos de facturación.");
      return;
    }

    setLoading(true);
    try {
      const headers: HeadersInit = { "Content-Type": "application/json" };
      if (user) {
        const { getSupabaseClientAsync } = await import("@/lib/supabase/client");
        const supabase = await getSupabaseClientAsync();
        const { data: sessionData } = await supabase?.auth.getSession() ?? {
          data: { session: null },
        };
        const token = sessionData.session?.access_token;
        if (token) headers.Authorization = `Bearer ${token}`;
      }

      const res = await fetch("/api/customers/parse", {
        method: "POST",
        headers,
        body: JSON.stringify({ text: rawText }),
      });
      const body = (await res.json()) as {
        data?: {
          customer: Partial<CustomerAiAutofillValues>;
          warnings: string[];
        };
        error?: string;
      };

      if (!res.ok || !body.data) {
        if (res.status === 402) {
          setUpgradeReason(body.error);
          setUpgradeOpen(true);
        } else {
          setError(body.error ?? "No se pudo analizar el texto.");
        }
        return;
      }

      onApply(body.data.customer);
      setWarnings(body.data.warnings ?? []);
    } catch {
      setError("Error de conexión. Comprueba internet e inténtalo de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="space-y-3 rounded-lg border border-sky-200 bg-sky-50/70 p-3">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-sky-100 text-sky-700">
          <Sparkles className="h-5 w-5" />
        </div>
        <div>
          <h3 className="font-bold text-slate-900">Rellenar con IA</h3>
          <p className="mt-1 text-sm text-slate-600">
            Pega aquí los datos que te hayan pasado y Factu intentará organizarlos.
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Consume 1 unidad IA. 10 rellenos equivalen a 1 escaneo.
          </p>
        </div>
      </div>
      <AiProcessingConsentNotice
        accepted={aiConsent.accepted}
        onAccepted={() => {
          aiConsent.accept();
          setError(null);
        }}
        compact
      />
      <Field label="Texto recibido">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Nombre o empresa, NIF, dirección, email, teléfono... aunque venga desordenado."
          rows={3}
        />
      </Field>
      <Button
        variant="secondary"
        onClick={() => void handleAutofill()}
        disabled={loading || !aiConsent.accepted}
        fullWidth
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Analizando…
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4" />
            Rellenar campos
          </>
        )}
      </Button>
      {locked && (
        <p className="text-sm text-sky-800">
          Función Pro. Puedes seguir creando clientes manualmente en el plan Gratis.
        </p>
      )}
      {error && <p className="text-sm font-medium text-red-600">{error}</p>}
      {warnings.length > 0 && (
        <ul className="space-y-1 text-sm text-amber-800">
          {warnings.map((warning) => (
            <li key={warning}>{warning}</li>
          ))}
        </ul>
      )}

      <UpgradeModal
        open={upgradeOpen}
        onClose={() => setUpgradeOpen(false)}
        reason={upgradeReason}
      />
    </section>
  );
}
