"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Database, FileUp, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, PageHeader } from "@/components/ui/Card";
import { Field, Input } from "@/components/ui/Field";
import { useAppStore } from "@/context/AppStore";
import {
  readPcFacturacionMdb,
  type PcFacturacionImportResult,
} from "@/lib/importers/pcfacturacion";

function formatRange(from: string | null, to: string | null): string {
  if (!from || !to) return "Sin fechas";
  return `${from} a ${to}`;
}

export default function ImportarPage() {
  const { data, replaceData } = useAppStore();
  const [file, setFile] = useState<File | null>(null);
  const [includeUnusedCustomers, setIncludeUnusedCustomers] = useState(false);
  const [result, setResult] = useState<PcFacturacionImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const hasCurrentData = useMemo(
    () => data.customers.length > 0 || data.documents.length > 0,
    [data.customers.length, data.documents.length],
  );

  async function analyze(nextFile = file) {
    if (!nextFile) return;
    setBusy(true);
    setError(null);
    setDone(false);
    try {
      const parsed = await readPcFacturacionMdb(nextFile, data, {
        includeUnusedCustomers,
      });
      setResult(parsed);
    } catch (err) {
      setResult(null);
      setError(err instanceof Error ? err.message : "No se pudo leer el MDB.");
    } finally {
      setBusy(false);
    }
  }

  function handleFile(nextFile: File | undefined) {
    setFile(nextFile ?? null);
    setResult(null);
    setError(null);
    setDone(false);
    if (nextFile) void analyze(nextFile);
  }

  async function refreshAnalysis() {
    await analyze();
  }

  function importData() {
    if (!result) return;
    replaceData(result.data);
    setDone(true);
  }

  return (
    <div>
      <PageHeader
        title="Importar datos"
        subtitle="Importador para copias MDB de PC Facturación 3.0."
      />

      <Card className="mb-6 space-y-4">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
            <Database className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              PC Facturación 3.0
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Lee clientes, presupuestos, facturas, líneas y datos de empresa.
              Se importa como histórico y conserva la numeración original.
            </p>
          </div>
        </div>

        <Field label="Archivo MDB" hint="Selecciona la copia de seguridad del programa antiguo.">
          <Input
            type="file"
            accept=".mdb,application/msaccess,application/x-msaccess"
            onChange={(event) => handleFile(event.target.files?.[0])}
          />
        </Field>

        <label className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={includeUnusedCustomers}
            onChange={(event) => {
              setIncludeUnusedCustomers(event.target.checked);
              setResult(null);
              setDone(false);
            }}
            className="mt-1 h-4 w-4"
          />
          <span>
            Importar también clientes sin facturas ni presupuestos. Si no lo
            marcas, solo se importan los clientes usados en documentos.
          </span>
        </label>

        <div className="flex flex-wrap gap-3">
          <Button
            variant="secondary"
            onClick={() => void refreshAnalysis()}
            disabled={!file || busy}
          >
            {busy ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <FileUp className="h-4 w-4" />
            )}
            {busy ? "Analizando…" : "Analizar archivo"}
          </Button>
        </div>
      </Card>

      {error ? (
        <Card className="mb-6 border-red-200 bg-red-50 text-sm text-red-800">
          {error}
        </Card>
      ) : null}

      {result ? (
        <Card className="mb-6 space-y-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Previsualización
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Empresa detectada:{" "}
              <strong>{result.preview.companyName || "sin nombre"}</strong>
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-xs font-semibold uppercase text-slate-500">
                Clientes
              </p>
              <p className="mt-1 text-2xl font-bold text-slate-900">
                {result.preview.customersToImport}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {result.preview.customersWithDocuments} con documentos
                {result.preview.unusedCustomers > 0
                  ? `, ${result.preview.unusedCustomers} sin documentos`
                  : ""}
              </p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-xs font-semibold uppercase text-slate-500">
                Facturas
              </p>
              <p className="mt-1 text-2xl font-bold text-slate-900">
                {result.preview.invoices}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {result.preview.invoiceLines} líneas
              </p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-xs font-semibold uppercase text-slate-500">
                Presupuestos
              </p>
              <p className="mt-1 text-2xl font-bold text-slate-900">
                {result.preview.offers}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {result.preview.offerLines} líneas
              </p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-xs font-semibold uppercase text-slate-500">
                Fechas
              </p>
              <p className="mt-1 text-sm font-bold text-slate-900">
                {formatRange(result.preview.dateRange.from, result.preview.dateRange.to)}
              </p>
            </div>
          </div>

          {result.warnings.length > 0 ? (
            <div className="space-y-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
              <div className="flex items-center gap-2 font-semibold">
                <AlertTriangle className="h-4 w-4" />
                Avisos
              </div>
              <ul className="list-disc space-y-1 pl-5">
                {result.warnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {hasCurrentData ? (
            <p className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
              Si ya habías importado este MDB antes, se reemplazará esa
              importación. Los datos creados manualmente en la app se conservan.
            </p>
          ) : null}

          <Button onClick={importData}>Importar a esta cuenta</Button>

          {done ? (
            <p className="text-sm font-semibold text-emerald-700">
              Importación aplicada. Si tienes sesión en la nube, se sincronizará
              automáticamente.
            </p>
          ) : null}
        </Card>
      ) : null}
    </div>
  );
}
