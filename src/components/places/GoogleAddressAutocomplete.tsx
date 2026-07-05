"use client";

import { useEffect, useRef, useState } from "react";
import { Crown, Loader2, MapPin } from "lucide-react";
import { UpgradeModal } from "@/components/billing/UpgradeModal";
import { Input } from "@/components/ui/Field";
import { useBilling } from "@/context/BillingContext";
import { useCloudSync } from "@/context/CloudSyncContext";
import { useDemoWorkspaceMode } from "@/hooks/useDemoWorkspaceMode";
import { isProPlan } from "@/lib/billing/plans";
import { buildAiUsageMeter, type ScanQuota } from "@/lib/billing/scan-limits";
import {
  type GooglePlaceAddressComponent,
  type GooglePlaceAddressSuggestion,
  parseGooglePlaceAddress,
} from "@/lib/google-places";

type GoogleMapsPlace = {
  address_components?: GooglePlaceAddressComponent[];
  formatted_address?: string;
  name?: string;
};

type GoogleMapsListener = {
  remove: () => void;
};

type GoogleAutocomplete = {
  addListener: (
    eventName: "place_changed",
    handler: () => void,
  ) => GoogleMapsListener;
  getPlace: () => GoogleMapsPlace;
};

type GoogleMapsNamespace = {
  maps: {
    places: {
      Autocomplete: new (
        input: HTMLInputElement,
        options?: {
          componentRestrictions?: { country: string | string[] };
          fields?: string[];
          types?: string[];
        },
      ) => GoogleAutocomplete;
    };
  };
};

declare global {
  interface Window {
    __factuGooglePlacesLoader?: Promise<void>;
  }
}

function getGooglePlacesNamespace(): GoogleMapsNamespace | null {
  const googleNamespace = window.google as unknown as GoogleMapsNamespace | undefined;
  return googleNamespace?.maps?.places?.Autocomplete ? googleNamespace : null;
}

interface GoogleAddressAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onAddressSelected: (address: GooglePlaceAddressSuggestion) => void;
  enabled?: boolean;
  disabled?: boolean;
  placeholder?: string;
  id?: string;
  name?: string;
  className?: string;
  displayStreetLineOnly?: boolean;
  "aria-invalid"?: boolean;
}

function loadGooglePlaces(apiKey: string): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (getGooglePlacesNamespace()) return Promise.resolve();
  if (window.__factuGooglePlacesLoader) return window.__factuGooglePlacesLoader;

  window.__factuGooglePlacesLoader = new Promise((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>(
      'script[data-factu-google-places="true"]',
    );

    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(), { once: true });
      existingScript.addEventListener(
        "error",
        () => reject(new Error("No se pudo cargar Google Places")),
        { once: true },
      );
      return;
    }

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(
      apiKey,
    )}&libraries=places&language=es&region=ES&v=weekly`;
    script.async = true;
    script.defer = true;
    script.dataset.factuGooglePlaces = "true";
    script.addEventListener("load", () => resolve(), { once: true });
    script.addEventListener(
      "error",
      () => reject(new Error("No se pudo cargar Google Places")),
      { once: true },
    );
    document.head.appendChild(script);
  });

  return window.__factuGooglePlacesLoader;
}

function addressFillAppliedMessage(
  billingEnabled: boolean,
  quota?: ScanQuota | null,
): string {
  if (!billingEnabled) return "Dirección aplicada.";
  if (!quota) return "Dirección aplicada. IA actualizada.";
  return `Dirección aplicada. IA ${buildAiUsageMeter(quota).percentRemaining}% restante.`;
}

export function GoogleAddressAutocomplete({
  value,
  onChange,
  onAddressSelected,
  enabled = false,
  disabled = false,
  placeholder,
  id,
  name,
  className,
  displayStreetLineOnly = false,
  "aria-invalid": ariaInvalid,
}: GoogleAddressAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const onAddressSelectedRef = useRef(onAddressSelected);
  const pendingRawGoogleAddressRef = useRef<string | null>(null);
  const pendingCleanGoogleAddressRef = useRef<string | null>(null);
  const { billingEnabled, isPro } = useBilling();
  const { user } = useCloudSync();
  const demoMode = useDemoWorkspaceMode();
  const [status, setStatus] = useState<string | null>(null);
  const [statusTone, setStatusTone] = useState<"success" | "warning">(
    "success",
  );
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [upgradeMode, setUpgradeMode] = useState<"upgrade" | "scanPack">(
    "upgrade",
  );
  const [upgradeReason, setUpgradeReason] = useState<string | undefined>();
  const [loadError, setLoadError] = useState<string | null>(null);
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() ?? "";
  const lockedByPlan = Boolean(enabled && !demoMode && billingEnabled && !isPro);
  const canUsePlaces = Boolean(
    enabled && !demoMode && apiKey && !lockedByPlan && !disabled,
  );

  useEffect(() => {
    onAddressSelectedRef.current = onAddressSelected;
  }, [onAddressSelected]);

  useEffect(() => {
    if (!canUsePlaces || !inputRef.current) return;

    let listener: GoogleMapsListener | null = null;
    let cancelled = false;

    setLoading(true);
    setLoadError(null);

    async function registerAddressFill(): Promise<{
      allowed: boolean;
      reason?: string;
      quota?: ScanQuota;
    }> {
      if (!billingEnabled) return { allowed: true };

      const headers: HeadersInit = {};
      if (user) {
        const { getSupabaseClientAsync } = await import("@/lib/supabase/client");
        const supabase = await getSupabaseClientAsync();
        const { data: sessionData } = await supabase?.auth.getSession() ?? {
          data: { session: null },
        };
        const token = sessionData.session?.access_token;
        if (token) headers.Authorization = `Bearer ${token}`;
      }

      const res = await fetch("/api/google-places/address-fill", {
        method: "POST",
        headers,
      });
      const body = (await res.json().catch(() => ({}))) as {
        error?: string;
        quota?: ScanQuota;
      };

      if (!res.ok) {
        return {
          allowed: false,
          reason:
            body.error ??
            "No se pudo registrar el autorrelleno. Puedes escribir la dirección a mano.",
          quota: body.quota,
        };
      }

      return { allowed: true, quota: body.quota };
    }

    async function applyPlace(autocomplete: GoogleAutocomplete) {
      const place = autocomplete.getPlace();
      const suggestion = parseGooglePlaceAddress(
        place.address_components ?? [],
        place.formatted_address ?? place.name ?? "",
      );

      if (!suggestion.address) {
        setStatusTone("warning");
        setStatus("No se pudo completar esa dirección. Puedes escribirla a mano.");
        return;
      }

      setApplying(true);
      setStatus(null);
      try {
        const usage = await registerAddressFill();
        if (!usage.allowed) {
          const isCreditTopUp =
            isPro || (usage.quota ? isProPlan(usage.quota.plan) : false);
          setUpgradeMode(isCreditTopUp ? "scanPack" : "upgrade");
          setUpgradeReason(usage.reason);
          if (usage.quota && isProPlan(usage.quota.plan)) {
            setUpgradeOpen(true);
          } else if (lockedByPlan || usage.reason?.includes("Pro")) {
            setUpgradeOpen(true);
          } else {
            setStatusTone("warning");
            setStatus(usage.reason ?? null);
          }
          return;
        }

        const cleanAddress = displayStreetLineOnly
          ? suggestion.streetLine || suggestion.address
          : suggestion.address;
        pendingRawGoogleAddressRef.current = suggestion.address;
        pendingCleanGoogleAddressRef.current = cleanAddress;
        if (inputRef.current) {
          inputRef.current.value = cleanAddress;
        }
        onAddressSelectedRef.current(suggestion);
        setStatusTone("success");
        setStatus(addressFillAppliedMessage(billingEnabled, usage.quota));
      } catch {
        setStatusTone("warning");
        setStatus(
          "No se pudo registrar el autorrelleno. Puedes escribir la dirección a mano.",
        );
      } finally {
        setApplying(false);
      }
    }

    void loadGooglePlaces(apiKey)
      .then(() => {
        if (cancelled || !inputRef.current) return;
        const Autocomplete = getGooglePlacesNamespace()?.maps.places.Autocomplete;
        if (!Autocomplete) {
          throw new Error("Google Places no está disponible");
        }

        const autocomplete = new Autocomplete(inputRef.current, {
          componentRestrictions: { country: "es" },
          fields: ["address_components", "formatted_address", "name"],
          types: ["address"],
        });

        listener = autocomplete.addListener("place_changed", () => {
          void applyPlace(autocomplete);
        });
      })
      .catch(() => {
        if (!cancelled) {
          setLoadError("No se pudo activar Google Places. Puedes escribir a mano.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
      listener?.remove();
    };
  }, [
    apiKey,
    billingEnabled,
    canUsePlaces,
    displayStreetLineOnly,
    isPro,
    lockedByPlan,
    user,
  ]);

  return (
    <div className="space-y-2">
      <div className="relative">
        <Input
          ref={inputRef}
          id={id}
          name={name}
          value={value}
          onChange={(event) => {
            const pendingRaw = pendingRawGoogleAddressRef.current;
            const pendingClean = pendingCleanGoogleAddressRef.current;
            if (pendingRaw && pendingClean && event.target.value === pendingRaw) {
              event.currentTarget.value = pendingClean;
              pendingRawGoogleAddressRef.current = null;
              pendingCleanGoogleAddressRef.current = null;
              return;
            }
            pendingRawGoogleAddressRef.current = null;
            pendingCleanGoogleAddressRef.current = null;
            setStatus(null);
            setStatusTone("success");
            onChange(event.target.value);
          }}
          disabled={disabled}
          placeholder={placeholder}
          className={`pr-12 ${className ?? ""}`.trim()}
          aria-invalid={ariaInvalid}
          autoComplete={canUsePlaces ? "off" : "street-address"}
        />
        <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
          {loading || applying ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <MapPin className="h-5 w-5" />
          )}
        </span>
      </div>

      {lockedByPlan && (
        <button
          type="button"
          onClick={() => setUpgradeOpen(true)}
          className="inline-flex items-center gap-1 text-xs font-semibold text-violet-700 underline-offset-2 hover:underline"
        >
          <Crown className="h-3.5 w-3.5" />
          Autorrellenar con Google es Pro
        </button>
      )}

      {enabled && demoMode && (
        <p className="text-xs text-amber-700">
          En modo demo no se consulta Google Places. Puedes escribir la dirección
          a mano.
        </p>
      )}

      {enabled && !demoMode && !apiKey && !lockedByPlan && (
        <p className="text-xs text-amber-700">
          Autorrelleno pendiente de configurar. Puedes escribir la dirección a mano.
        </p>
      )}

      {canUsePlaces && !loadError && (
        <p className="text-xs text-slate-400">
          Google sugiere direcciones. Solo descuenta IA al aplicar una.
        </p>
      )}

      {loadError && <p className="text-xs text-amber-700">{loadError}</p>}
      {status && (
        <p
          className={
            statusTone === "warning"
              ? "text-xs text-amber-700"
              : "text-xs text-emerald-700"
          }
        >
          {status}
        </p>
      )}

      <UpgradeModal
        open={upgradeOpen}
        onClose={() => setUpgradeOpen(false)}
        reason={
          upgradeReason ??
          "El autorrelleno de direcciones con Google Places está reservado para cuentas Pro."
        }
        mode={upgradeMode}
      />
    </div>
  );
}
