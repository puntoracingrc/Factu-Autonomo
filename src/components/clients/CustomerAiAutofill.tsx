"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronDown, ClipboardList, Loader2, Sparkles } from "lucide-react";
import { UpgradeModal } from "@/components/billing/UpgradeModal";
import {
  AiProcessingConsentNotice,
  useAiProcessingConsent,
} from "@/components/legal/AiProcessingConsentNotice";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Field";
import { useBilling } from "@/context/BillingContext";
import { useCloudSync } from "@/context/CloudSyncContext";
import { useDemoWorkspaceMode } from "@/hooks/useDemoWorkspaceMode";
import type { AiUsageMeter, ScanQuota } from "@/lib/billing/scan-limits";
import type { AddressResidenceType } from "@/lib/types";

export interface CustomerAiAutofillValues {
  customerType: "person" | "company";
  firstName: string;
  lastName: string;
  contactName: string;
  nif: string;
  email: string;
  phone: string;
  streetType: string;
  residenceType: AddressResidenceType;
  address: string;
  addressExtra: string;
  city: string;
  postalCode: string;
  notes: string;
}

interface CustomerAiAutofillProps {
  onApply: (values: Partial<CustomerAiAutofillValues>) => void;
}

interface AiUsageResponse {
  meter: AiUsageMeter;
  quota: {
    period: "month" | "lifetime";
    monthKey?: string;
  };
}

export function CustomerAiAutofill({ onApply }: CustomerAiAutofillProps) {
  const { billingEnabled, isPro, limits } = useBilling();
  const { user } = useCloudSync();
  const demoMode = useDemoWorkspaceMode();
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [usage, setUsage] = useState<AiUsageResponse | null>(null);
  const [usageLoading, setUsageLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [aiRetryAvailable, setAiRetryAvailable] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [upgradeReason, setUpgradeReason] = useState<string | undefined>();
  const [upgradeMode, setUpgradeMode] = useState<"upgrade" | "scanPack">(
    "upgrade",
  );
  const aiConsent = useAiProcessingConsent();

  const locked = billingEnabled && !limits.aiTextAutofill;

  const loadUsage = useCallback(async () => {
    if (demoMode) {
      setUsage(null);
      return;
    }
    if (!billingEnabled || !user) {
      setUsage(null);
      return;
    }

    setUsageLoading(true);
    try {
      const { getSupabaseClientAsync } = await import("@/lib/supabase/client");
      const supabase = await getSupabaseClientAsync();
      const { data: sessionData } = await supabase?.auth.getSession() ?? {
        data: { session: null },
      };
      const token = sessionData.session?.access_token;
      if (!token) return;

      const res = await fetch("/api/billing/ai-usage", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = (await res.json()) as AiUsageResponse | { error?: string };
      if (res.ok && "meter" in body) setUsage(body);
    } finally {
      setUsageLoading(false);
    }
  }, [billingEnabled, demoMode, user]);

  useEffect(() => {
    void loadUsage();
  }, [loadUsage]);

  const usageLabel = useMemo(() => {
    if (!billingEnabled || !user) return null;
    if (usageLoading && !usage) return "calculando";
    if (!usage) return null;
    return `${usage.meter.percentRemaining}% restante`;
  }, [billingEnabled, usage, usageLoading, user]);

  async function handleAutofill(options: { allowAi?: boolean } = {}) {
    const allowAi = options.allowAi === true;
    const rawText = text.trim();
    setError(null);
    setWarnings([]);
    setAiRetryAvailable(false);

    if (demoMode && allowAi) {
      setError("En modo demo no se usa IA. Revisa el relleno local a mano.");
      return;
    }

    if (locked && allowAi) {
      setUpgradeMode("upgrade");
      setUpgradeReason("El autorrelleno de clientes con IA requiere plan Pro.");
      setUpgradeOpen(true);
      return;
    }

    if (allowAi && !aiConsent.accepted) {
      setError("Acepta primero el aviso de tratamiento con IA.");
      setAiRetryAvailable(true);
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
          confidence?: number;
        };
        error?: string;
        quota?: ScanQuota;
        canRetryWithAi?: boolean;
        source?: "local" | "ai";
      };

      if (!res.ok || !body.data) {
        setAiRetryAvailable(Boolean(body.canRetryWithAi));
        if (res.status === 402) {
          const quotaPlan = body.quota?.plan;
          const needsExtraAiBalance =
            isPro || quotaPlan === "pro" || quotaPlan === "trial";
          setUpgradeMode(needsExtraAiBalance ? "scanPack" : "upgrade");
          setUpgradeReason(body.error);
          setUpgradeOpen(true);
        } else {
          setError(body.error ?? "No se pudo analizar el texto.");
        }
        return;
      }

      onApply(body.data.customer);
      setWarnings(body.data.warnings ?? []);
      setAiRetryAvailable(Boolean(body.canRetryWithAi));
      void loadUsage();
    } catch {
      setError("Error de conexión. Comprueba internet e inténtalo de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-lg border border-sky-200 bg-sky-50/70 p-3">
      <button
        type="button"
        className="flex w-full items-center gap-3 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500"
        onClick={() => setExpanded((current) => !current)}
        aria-expanded={expanded}
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-sky-100 text-sky-700">
          <ClipboardList className="h-5 w-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className="font-bold text-slate-900">Rellenar desde texto</span>
            {usageLabel ? (
              <span className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-sky-800 ring-1 ring-sky-100">
                {usageLabel}
              </span>
            ) : null}
          </span>
        </span>
        <ChevronDown
          className={`h-5 w-5 shrink-0 text-slate-500 transition-transform ${
            expanded ? "rotate-180" : ""
          }`}
        />
      </button>

      {expanded ? (
        <div className="mt-3 space-y-3">
          <p className="text-sm text-slate-600">
            Pega aquí los datos que te hayan pasado y Factu intentará organizarlos.
          </p>
          <Textarea
            aria-label="Datos para rellenar desde texto"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Nombre o empresa, NIF, dirección, email, teléfono... aunque venga desordenado."
            rows={3}
          />
          <Button
            variant="secondary"
            onClick={() => void handleAutofill()}
            disabled={loading}
            fullWidth
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Analizando…
              </>
            ) : (
              <>
                <ClipboardList className="h-4 w-4" />
                Rellenar campos
              </>
            )}
          </Button>
          {aiRetryAvailable && !locked && !demoMode ? (
            <AiProcessingConsentNotice
              accepted={aiConsent.accepted}
              onAccepted={() => {
                aiConsent.accept();
                setError(null);
              }}
              compact
            />
          ) : null}
          {aiRetryAvailable ? (
            <Button
              variant="secondary"
              onClick={() => void handleAutofill({ allowAi: true })}
              disabled={loading || demoMode}
              fullWidth
            >
              <Sparkles className="h-4 w-4" />
              Mejorar con IA
            </Button>
          ) : null}
          {locked && aiRetryAvailable && (
            <p className="text-sm text-sky-800">
              La mejora con IA es Pro. El relleno local sigue disponible.
            </p>
          )}
          {demoMode && aiRetryAvailable && (
            <p className="text-sm text-amber-800">
              La mejora con IA está desactivada en demo para no consumir créditos.
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
        </div>
      ) : null}

      <UpgradeModal
        open={upgradeOpen}
        onClose={() => setUpgradeOpen(false)}
        reason={upgradeReason}
        mode={upgradeMode}
      />
    </section>
  );
}
