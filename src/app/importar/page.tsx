"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Crown, Database, FileCog, FileUp, Lock, RefreshCw } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card, PageHeader } from "@/components/ui/Card";
import { Field, Input, Select } from "@/components/ui/Field";
import { useBilling } from "@/context/BillingContext";
import { useAppStore } from "@/context/AppStore";
import {
  PC_FACTURACION_SOURCE_NAME,
  readPcFacturacionMdb,
  type PcFacturacionImportResult,
} from "@/lib/importers/pcfacturacion";

type ImportSource = "auto" | "pcfacturacion3" | "prestashop" | "csv";

const IMPORT_SOURCES: Array<{
  value: ImportSource;
  label: string;
  disabled?: boolean;
}> = [
  { value: "auto", label: "Detectar automáticamente" },
  { value: "pcfacturacion3", label: PC_FACTURACION_SOURCE_NAME },
  { value: "prestashop", label: "PrestaShop (próximamente)", disabled: true },
  { value: "csv", label: "Excel o CSV (próximamente)", disabled: true },
];

function formatRange(from: string | null, to: string | null): string {
  if (!from || !to) return "Sin fechas";
  return `${from} a ${to}`;
}

export default function ImportarPage() {
  const { data, replaceData } = useAppStore();
  const { billingEnabled, limits } = useBilling();
  const [source, setSource] = useState<ImportSource>("auto");
  const [file, setFile] = useState<File | null>(null);
  const [dwiFile, setDwiFile] = useState<File | null>(null);
  const [includeUnusedCustomers, setIncludeUnusedCustomers] = useState(false);
  const [result, setResult] = useState<PcFacturacionImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const hasCurrentData = useMemo(
    () => data.customers.length > 0 || data.documents.length > 0,
    [data.customers.length, data.documents.length],
  );
  const importLocked = billingEnabled && !limits.databaseImport;
  const showPcFacturacionOptions = source === "pcfacturacion3";

  async function readDwiText(nextDwiFile: File | null) {
    if (!nextDwiFile) return undefined;
    const buffer = await nextDwiFile.arrayBuffer();
    return new TextDecoder("windows-1252").decode(buffer);
  }

  async function analyze(nextFile = file, nextDwiFile = dwiFile) {
    if (!nextFile) return;
    setBusy(true);
    setError(null);
    setDone(false);
    try {
      if (importLocked) {
        throw new Error(
          "La importación de datos desde otros programas requiere plan Pro.",
        );
      }
      if (source !== "auto" && source !== "pcfacturacion3") {
        throw new Error("Ese origen todavía no tiene importador disponible.");
      }

      const dwiText = showPcFacturacionOptions
        ? await readDwiText(nextDwiFile)
        : undefined;
      const parsed = await readPcFacturacionMdb(nextFile, data, {
        includeUnusedCustomers,
        dwiText,
      });
      setResult(parsed);
    } catch (err) {
      setResult(null);
      const message =
        source === "auto"
          ? "No se pudo detectar el origen de este archivo. Prueba a seleccionar el programa de origen cuando esté disponible."
          : "No se pudo leer el archivo con el importador seleccionado.";
      setError(
        err instanceof Error && source !== "auto"
          ? err.message
          : message,
      );
    } finally {
      setBusy(false);
    }
  }

  function handleSource(nextSource: ImportSource) {
    setSource(nextSource);
    if (nextSource !== "pcfacturacion3") setDwiFile(null);
    setResult(null);
    setError(null);
    setDone(false);
  }

  function handleFile(nextFile: File | undefined) {
    setFile(nextFile ?? null);
    setResult(null);
    setError(null);
    setDone(false);
    if (nextFile && !importLocked) void analyze(nextFile);
  }

  function handleDwiFile(nextFile: File | undefined) {
    const nextDwiFile = nextFile ?? null;
    setDwiFile(nextDwiFile);
    setResult(null);
    setError(null);
    setDone(false);
    if (file) void analyze(file, nextDwiFile);
  }

  async function refreshAnalysis() {
    await analyze();
  }

  function importData() {
    if (!result) return;
    if (importLocked) {
      setError("La importación de datos desde otros programas requiere plan Pro.");
      return;
    }
    replaceData(result.data);
    setDone(true);
  }

  return (
    <div>
      <PageHeader
        title="Importar datos"
        subtitle="Elige de qué programa vienen los datos y revisa una previsualización antes de importarlos."
      />

      <Card className="mb-6 space-y-4">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
            <Database className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Origen de datos
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Cada programa guarda sus bases de datos de forma distinta. El
              importador usa el origen elegido para interpretar clientes,
              documentos y configuración.
            </p>
          </div>
        </div>

        {importLocked ? (
          <div className="rounded-xl border border-violet-200 bg-violet-50 p-4 text-sm text-violet-950">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
                <Lock className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold">
                  Importar bases de datos es una función Pro
                </p>
                <p className="mt-1 text-violet-900">
                  Puedes revisar los orígenes disponibles, pero para analizar e
                  importar datos desde otro programa necesitas activar Pro.
                </p>
                <ButtonLink href="/precios" className="mt-3" variant="secondary">
                  <Crown className="h-4 w-4" />
                  Ver planes Pro
                </ButtonLink>
              </div>
            </div>
          </div>
        ) : null}

        <Field label="Programa de origen">
          <Select
            value={source}
            onChange={(event) => handleSource(event.target.value as ImportSource)}
            disabled={importLocked}
          >
            {IMPORT_SOURCES.map((item) => (
              <option key={item.value} value={item.value} disabled={item.disabled}>
                {item.label}
              </option>
            ))}
          </Select>
        </Field>

        <Field
          label="Archivo de datos"
          hint="Para PC Facturación, selecciona la copia MDB."
        >
          <Input
            type="file"
            accept=".mdb,application/msaccess,application/x-msaccess"
            disabled={importLocked}
            onChange={(event) => handleFile(event.target.files?.[0])}
          />
        </Field>

        {showPcFacturacionOptions ? (
          <div className="space-y-4">
            <Field
              label="Archivo DWI opcional"
              hint="Sirve para continuar la numeración antigua. Suele estar en la misma carpeta que el MDB y tener el mismo nombre de empresa, por ejemplo Mi empresa.dwi."
            >
              <Input
                type="file"
                accept=".dwi,text/plain"
                disabled={importLocked}
                onChange={(event) => handleDwiFile(event.target.files?.[0])}
              />
            </Field>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
              <div className="flex items-center gap-2 font-semibold text-slate-900">
                <FileCog className="h-4 w-4" />
                ¿Dónde encuentro el DWI?
              </div>
              <p className="mt-1">
                Normalmente aparece junto a la base de datos MDB, dentro de la
                carpeta del programa o de la copia. No es obligatorio: si no lo
                tienes, importa solo el MDB.
              </p>
            </div>
          </div>
        ) : null}

        <label className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={includeUnusedCustomers}
            disabled={importLocked}
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
            disabled={!file || busy || importLocked}
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
              Origen detectado: <strong>{result.preview.sourceName}</strong>
              <br />
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

          {result.preview.numbering ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-950">
              <p className="font-semibold">Numeración detectada en el DWI</p>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {result.preview.numbering.nextInvoiceNumber ? (
                  <p>
                    Próxima factura:{" "}
                    <strong>{result.preview.numbering.nextInvoiceNumber}</strong>
                  </p>
                ) : null}
                {result.preview.numbering.nextOfferNumber ? (
                  <p>
                    Próximo presupuesto:{" "}
                    <strong>{result.preview.numbering.nextOfferNumber}</strong>
                  </p>
                ) : null}
                {result.preview.numbering.nextReceiptNumber ? (
                  <p>
                    Próximo recibo:{" "}
                    <strong>{result.preview.numbering.nextReceiptNumber}</strong>
                  </p>
                ) : null}
                {result.preview.numbering.nextCustomerNumber ? (
                  <p>
                    Próximo cliente antiguo:{" "}
                    <strong>{result.preview.numbering.nextCustomerNumber}</strong>
                  </p>
                ) : null}
              </div>
            </div>
          ) : null}

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

          <Button onClick={importData} disabled={importLocked}>
            Importar a esta cuenta
          </Button>

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
