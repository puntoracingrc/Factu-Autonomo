"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Send, ShieldCheck } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { useAppStore } from "@/context/AppStore";
import { verifyDocumentHashChain } from "@/lib/verifactu/chain-verify";
import {
  isVerifactuProductionModeAllowed,
  normalizeVerifactuSettings,
} from "@/lib/verifactu/eligibility";
import { getProducerConfigStatus } from "@/lib/verifactu/producer-config";
import { VERIFACTU_SOFTWARE } from "@/lib/verifactu/constants";
import {
  loadVerifactuRuntimeState,
  resolveVerifactuConnectionStatus,
  type VerifactuRuntimeState,
} from "@/lib/verifactu/runtime-status";
import type { BusinessProfile, VerifactuSettings } from "@/lib/types";

interface Props {
  form: BusinessProfile;
  onChange: (settings: VerifactuSettings) => void;
}

export function VerifactuSettingsCard({ form, onChange }: Props) {
  const { data } = useAppStore();
  const settings = normalizeVerifactuSettings(form.verifactu);
  const productionAllowed = isVerifactuProductionModeAllowed();
  const producer = getProducerConfigStatus();
  const [chainStatus, setChainStatus] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [runtimeStatus, setRuntimeStatus] = useState<VerifactuRuntimeState>({
    phase: "loading",
  });

  useEffect(() => {
    let cancelled = false;

    async function loadStatus() {
      try {
        const { getSupabaseClientAsync } = await import("@/lib/supabase/client");
        const supabase = await getSupabaseClientAsync();
        const { data: sessionData } = (await supabase?.auth.getSession()) ?? {
          data: { session: null },
        };
        const token = sessionData.session?.access_token;
        const status = await loadVerifactuRuntimeState(token);
        if (!cancelled) {
          setRuntimeStatus(status);
        }
      } catch {
        if (!cancelled) setRuntimeStatus({ phase: "unavailable" });
      }
    }

    void loadStatus();
    return () => {
      cancelled = true;
    };
  }, []);

  const connection = resolveVerifactuConnectionStatus(
    settings.enabled,
    runtimeStatus,
  );
  const connectionStyles = CONNECTION_STYLES[connection.tone];

  async function handleVerifyChain() {
    setChecking(true);
    setChainStatus(null);
    try {
      const result = await verifyDocumentHashChain({
        documents: data.documents,
        profile: data.profile,
      });
      if (result.checked === 0) {
        setChainStatus("No hay facturas con registro Veri*Factu todavía.");
        return;
      }
      if (result.ok) {
        setChainStatus(
          `Cadena OK: ${result.checked} registro(s) verificados según spec AEAT v0.1.2.`,
        );
        return;
      }
      setChainStatus(
        `Problemas en la cadena (${result.checked} registros):\n${result.errors.join("\n")}`,
      );
    } finally {
      setChecking(false);
    }
  }

  return (
    <Card className="mb-6 space-y-4">
      <div className="flex items-start gap-3">
        <ShieldCheck className="mt-0.5 h-6 w-6 shrink-0 text-emerald-600" />
        <div>
          <h2 className="text-lg font-bold text-slate-900">Veri*Factu</h2>
          <p className="mt-1 text-sm text-slate-600">
            Registro encadenado y QR tributario en PDF (entorno de pruebas por
            defecto). Fecha general de adaptación al RRSIF para contribuyentes
            no sujetos a Sociedades: <strong>1 julio 2027</strong>, según ámbito
            y excepciones.{" "}
            <Link
              href="/legal/verifactu"
              className="font-semibold text-blue-600 hover:underline"
            >
              Ver alcance y estado actual
            </Link>
            .
          </p>
        </div>
      </div>

      <div
        className={`rounded-xl border px-4 py-3 text-sm ${
          producer.complete
            ? "border-emerald-200 bg-emerald-50 text-emerald-900"
            : "border-amber-200 bg-amber-50 text-amber-900"
        }`}
      >
        <p className="font-semibold">
          Productor del software:{" "}
          {producer.complete ? "configuración completa" : "faltan datos"}
        </p>
        {!producer.complete && (
          <ul className="mt-2 list-inside list-disc space-y-1">
            {producer.missing.map((item) => (
              <li key={item}>
                <code className="text-xs">{item}</code>
              </li>
            ))}
          </ul>
        )}
        {producer.warnings.length > 0 && (
          <p className="mt-2 text-xs opacity-90">
            Recomendado: {producer.warnings.join(", ")}
          </p>
        )}
      </div>

      <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
        <input
          type="checkbox"
          checked={settings.enabled}
          onChange={(e) =>
            onChange({ ...settings, enabled: e.target.checked })
          }
          className="h-4 w-4 rounded border-slate-300"
        />
        <span className="text-sm font-medium text-slate-800">
          Activar Veri*Factu en facturas emitidas. Puedes dejarlo desactivado
          hasta que lo necesites.
        </span>
      </label>

      {settings.enabled && (
        <Field
          label="Entorno AEAT"
          hint="El envío real solo se activa cuando hay certificado y configuración de servidor completa."
        >
          <select
            value={settings.environment}
            onChange={(e) =>
              onChange(
                normalizeVerifactuSettings({
                  ...settings,
                  environment:
                    e.target.value === "production" ? "production" : "test",
                }),
              )
            }
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
          >
            <option value="test">Pruebas (prewww2.aeat.es)</option>
            <option value="production" disabled={!productionAllowed}>
              Producción
            </option>
          </select>
        </Field>
      )}

      <div
        className={`rounded-xl border px-4 py-3 text-sm ${connectionStyles.panelClass}`}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <Send
              className={`mt-0.5 h-5 w-5 shrink-0 ${connectionStyles.iconClass}`}
            />
            <div>
              <p className="font-semibold">Conexión con AEAT</p>
              <p className="mt-1 opacity-90">{connection.description}</p>
            </div>
          </div>
          <span
            className={`inline-flex w-fit shrink-0 rounded-full px-3 py-1 text-xs font-bold ${connectionStyles.badgeClass}`}
          >
            {connection.badge}
          </span>
        </div>

        <p className="mt-3 rounded-lg bg-white/60 px-3 py-2 text-sm text-slate-700">
          La configuración sensible se gestiona en servidor.{" "}
          {"Esta pantalla no guarda ni muestra claves privadas."}
        </p>
      </div>

      <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
        <p className="font-semibold">Verificación in situ (SIF)</p>
        <ul className="mt-2 space-y-1 text-emerald-800">
          <li>Productor: {VERIFACTU_SOFTWARE.developerName}</li>
          <li>NIF productor: {VERIFACTU_SOFTWARE.developerNif}</li>
          <li>Software: {VERIFACTU_SOFTWARE.softwareName}</li>
          <li>Código SIF: {VERIFACTU_SOFTWARE.softwareId}</li>
          <li>Versión: {VERIFACTU_SOFTWARE.softwareVersion}</li>
          <li>Instalación: {VERIFACTU_SOFTWARE.installationId}</li>
        </ul>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Button
          type="button"
          variant="secondary"
          onClick={handleVerifyChain}
          disabled={checking}
        >
          {checking ? "Verificando…" : "Verificar cadena de huellas"}
        </Button>
        <Link
          href="/legal/declaracion-responsable"
          className="text-sm font-semibold text-blue-600 hover:underline"
        >
          Estado de la declaración responsable →
        </Link>
      </div>

      {chainStatus && (
        <p className="whitespace-pre-line rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
          {chainStatus}
        </p>
      )}
    </Card>
  );
}

const CONNECTION_STYLES = {
  disabled: {
    panelClass: "border-slate-200 bg-slate-50 text-slate-700",
    badgeClass: "bg-slate-200 text-slate-700",
    iconClass: "text-slate-500",
  },
  loading: {
    panelClass: "border-slate-200 bg-slate-50 text-slate-700",
    badgeClass: "bg-slate-200 text-slate-700",
    iconClass: "text-slate-500",
  },
  unknown: {
    panelClass: "border-amber-200 bg-amber-50 text-amber-900",
    badgeClass: "bg-amber-600 text-white",
    iconClass: "text-amber-600",
  },
  unavailable: {
    panelClass: "border-amber-200 bg-amber-50 text-amber-900",
    badgeClass: "bg-amber-600 text-white",
    iconClass: "text-amber-600",
  },
} as const;
