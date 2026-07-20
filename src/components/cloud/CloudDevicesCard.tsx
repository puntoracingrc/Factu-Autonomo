"use client";

import { useEffect, useState } from "react";
import { Laptop, RefreshCw, Smartphone, Tablet, XCircle } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useBilling } from "@/context/BillingContext";
import { useCloudSync } from "@/context/CloudSyncContext";
import {
  registerCurrentCloudDevice,
  revokeCloudDevice,
  type CloudDeviceApiPayload,
} from "@/lib/cloud/device-client";
import type { CloudDeviceKind, CloudDeviceRecord } from "@/lib/cloud/devices";

function deviceIcon(kind: CloudDeviceKind) {
  if (kind === "mobile") return Smartphone;
  if (kind === "tablet") return Tablet;
  return Laptop;
}

function formatDate(value: string | null): string {
  if (!value) return "Sin actividad";
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function activeCount(devices: readonly CloudDeviceRecord[]) {
  return devices.filter((device) => device.status === "active").length;
}

export function CloudDevicesCard() {
  const { user, emailConfirmed } = useCloudSync();
  const { billingEnabled, plan, limits } = useBilling();
  const [payload, setPayload] = useState<CloudDeviceApiPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [busyDeviceId, setBusyDeviceId] = useState<string | null>(null);

  const canUseCloud = Boolean(limits.cloudSync && user && emailConfirmed);
  const maxDevices = limits.maxCloudDevices;

  useEffect(() => {
    if (!billingEnabled || !user || !emailConfirmed || !canUseCloud) return;
    let cancelled = false;
    setLoading(true);
    void registerCurrentCloudDevice()
      .then((next) => {
        if (!cancelled) setPayload(next);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [billingEnabled, canUseCloud, emailConfirmed, user]);

  async function revoke(device: CloudDeviceRecord) {
    setBusyDeviceId(device.id);
    try {
      setPayload(await revokeCloudDevice(device.id));
    } finally {
      setBusyDeviceId(null);
    }
  }

  if (!billingEnabled) return null;

  if (!user) {
    return (
      <Card className="mb-6 border-slate-200 bg-white">
        <h3 className="text-base font-bold text-slate-900">Dispositivos</h3>
        <p className="mt-1 text-sm leading-6 text-slate-600">
          Inicia sesión para gestionar los dispositivos que sincronizan con la
          nube.
        </p>
      </Card>
    );
  }

  if (!limits.cloudSync) {
    return (
      <Card className="mb-6 border-slate-200 bg-white">
        <h3 className="text-base font-bold text-slate-900">
          Este plan guarda en local
        </h3>
        <p className="mt-1 text-sm leading-6 text-slate-600">
          En Gratis tus datos se guardan solo en este navegador: es tu único
          dispositivo local. Para compartir los mismos datos entre dispositivos,
          activa Pro.
        </p>
        <div className="mt-4">
          <ButtonLink href="/precios">Ver planes Pro</ButtonLink>
        </div>
      </Card>
    );
  }

  const devices = payload?.devices ?? [];
  const count = activeCount(devices);

  return (
    <Card className="mb-6 border-sky-100 bg-white">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-base font-bold text-slate-900">
            Dispositivos con nube
          </h3>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            Plan {plan}: {count}
            {maxDevices === null ? "" : `/${maxDevices}`} dispositivos activos.
            Si pierdes uno, inicia sesión en el nuevo y desactiva aquí el
            anterior para liberar su plaza.
          </p>
        </div>
        <Button
          variant="secondary"
          onClick={() => void registerCurrentCloudDevice().then(setPayload)}
          disabled={loading}
        >
          <RefreshCw className="h-4 w-4" />
          Actualizar
        </Button>
      </div>

      {payload?.error && (
        <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {payload.error}
        </p>
      )}
      {payload?.reason === "device_limit_reached" && (
        <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          <p>
            Has alcanzado el límite de dispositivos. Desactiva uno antiguo para
            sincronizar este navegador.
          </p>
        </div>
      )}

      <div className="mt-4 divide-y divide-slate-100 rounded-lg border border-slate-200">
        {loading && devices.length === 0 ? (
          <p className="px-3 py-3 text-sm text-slate-500">
            Cargando dispositivos...
          </p>
        ) : devices.length === 0 ? (
          <p className="px-3 py-3 text-sm text-slate-500">
            Aún no hay dispositivos registrados.
          </p>
        ) : (
          devices.map((device) => {
            const Icon = deviceIcon(device.kind);
            const revoked = device.status === "revoked";
            return (
              <div
                key={device.id}
                className="flex flex-col gap-3 px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                    <Icon className="h-5 w-5" />
                  </span>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-bold text-slate-900">{device.name}</p>
                      {device.isCurrent && (
                        <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs font-bold text-sky-800">
                          Este dispositivo
                        </span>
                      )}
                      {revoked && (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-600">
                          Desactivado
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-slate-500">
                      Última actividad: {formatDate(device.lastSeenAt)}
                    </p>
                  </div>
                </div>
                {!revoked && !device.isCurrent && (
                  <Button
                    variant="secondary"
                    onClick={() => void revoke(device)}
                    disabled={busyDeviceId === device.id}
                  >
                    <XCircle className="h-4 w-4" />
                    Desactivar
                  </Button>
                )}
              </div>
            );
          })
        )}
      </div>
    </Card>
  );
}
