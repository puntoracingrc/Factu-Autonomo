"use client";

import { useEffect, useState } from "react";
import { Database, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useWorkspaceStorage } from "@/context/WorkspaceStorageContext";
import {
  formatStorageBytes,
  readDeviceStorageDiagnostics,
  type DeviceStorageDiagnostics,
} from "@/lib/device-storage-diagnostics";

export function DeviceStorageCard() {
  const { storageKey } = useWorkspaceStorage();
  const [refreshSequence, setRefreshSequence] = useState(0);
  const [measurement, setMeasurement] = useState<{
    storageKey: string;
    diagnostics: DeviceStorageDiagnostics;
  } | null>(null);
  const diagnostics =
    measurement?.storageKey === storageKey ? measurement.diagnostics : null;

  useEffect(() => {
    let cancelled = false;
    void readDeviceStorageDiagnostics(storageKey).then((next) => {
      if (!cancelled) setMeasurement({ storageKey, diagnostics: next });
    });
    return () => {
      cancelled = true;
    };
  }, [refreshSequence, storageKey]);

  return (
    <Card className="mb-6 space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sky-700">
            <Database className="h-5 w-5" />
          </span>
          <div>
            <h3 className="font-bold text-slate-900">
              Almacenamiento en este dispositivo
            </h3>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
              Medición local de este navegador. No analiza el contenido ni
              modifica los datos de la empresa.
            </p>
          </div>
        </div>
        <Button
          type="button"
          variant="secondary"
          className="shrink-0"
          onClick={() => setRefreshSequence((current) => current + 1)}
        >
          <RefreshCw className="h-4 w-4" />
          Actualizar medida
        </Button>
      </div>

      <dl
        className="grid divide-y divide-slate-200 border-y border-slate-200 sm:grid-cols-3 sm:divide-x sm:divide-y-0"
        aria-live="polite"
      >
        <div className="py-4 sm:px-4 sm:first:pl-0">
          <dt className="text-sm font-semibold text-slate-600">
            Copia de esta empresa
          </dt>
          <dd className="mt-1 text-xl font-black text-slate-950">
            {diagnostics
              ? formatStorageBytes(diagnostics.activeWorkspaceBytes)
              : "Midiendo..."}
          </dd>
        </div>
        <div className="py-4 sm:px-4">
          <dt className="text-sm font-semibold text-slate-600">
            Factu en este navegador
          </dt>
          <dd className="mt-1 text-xl font-black text-slate-950">
            {diagnostics
              ? formatStorageBytes(diagnostics.originUsageBytes)
              : "Midiendo..."}
          </dd>
        </div>
        <div className="py-4 sm:px-4 sm:last:pr-0">
          <dt className="text-sm font-semibold text-slate-600">
            Cupo general estimado
          </dt>
          <dd className="mt-1 text-xl font-black text-slate-950">
            {diagnostics
              ? formatStorageBytes(diagnostics.originQuotaBytes)
              : "Midiendo..."}
          </dd>
        </div>
      </dl>

      <p className="text-xs leading-5 text-slate-500">
        El total de Factu incluye las cuentas usadas en este navegador, la caché
        de arranque y los archivos instalables de la app. La copia de esta
        empresa se muestra por separado. El cupo general es una referencia para
        cachés del navegador, no el límite individual de esa copia.
      </p>
    </Card>
  );
}
