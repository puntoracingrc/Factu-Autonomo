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
import {
  applyBusinessProfileAutofillSuggestion,
  hasBusinessProfileAutofillSuggestion,
} from "@/lib/business-profile-autofill";

type ImportSource = "auto" | "pcfacturacion3" | "prestashop" | "csv";
type InvoicePaymentImportMode = "keep" | "markPaid";

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

function formatDetectedValue(value: string): string {
  return value || "Vacío";
}

function formatIvaRates(rates: number[]): string {
  return rates.map((rate) => `${rate}%`).join(", ");
}

export default function ImportarPage() {
  const { data, replaceData } = useAppStore();
  const { billingEnabled, limits } = useBilling();
  const [source, setSource] = useState<ImportSource>("auto");
  const [file, setFile] = useState<File | null>(null);
  const [dwiFile, setDwiFile] = useState<File | null>(null);
  const [includeUnusedCustomers, setIncludeUnusedCustomers] = useState(false);
  const [invoicePaymentMode, setInvoicePaymentMode] =
    useState<InvoicePaymentImportMode>("keep");
  const [result, setResult] = useState<PcFacturacionImportResult | null>(null);
  const [applyDetectedProfile, setApplyDetectedProfile] = useState(false);
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

  async function analyze(
    nextFile = file,
    nextDwiFile = dwiFile,
    nextInvoicePaymentMode = invoicePaymentMode,
  ) {
    if (!nextFile) return;
    setBusy(true);
    setError(null);
    setDone(false);
    setApplyDetectedProfile(false);
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
        markUnpaidInvoicesAsPaid: nextInvoicePaymentMode === "markPaid",
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
    setApplyDetectedProfile(false);
  }

  function handleFile(nextFile: File | undefined) {
    setFile(nextFile ?? null);
    setResult(null);
    setError(null);
    setDone(false);
    setApplyDetectedProfile(false);
    if (nextFile && !importLocked) void analyze(nextFile);
  }

  function handleDwiFile(nextFile: File | undefined) {
    const nextDwiFile = nextFile ?? null;
    setDwiFile(nextDwiFile);
    setResult(null);
    setError(null);
    setDone(false);
    setApplyDetectedProfile(false);
    if (file) void analyze(file, nextDwiFile);
  }

  function handleInvoicePaymentMode(nextMode: InvoicePaymentImportMode) {
    setInvoicePaymentMode(nextMode);
    setDone(false);
    if (file && !busy) void analyze(file, dwiFile, nextMode);
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
    const dataToImport =
      applyDetectedProfile &&
      hasBusinessProfileAutofillSuggestion(result.profileSuggestion)
        ? {
            ...result.data,
            profile: applyBusinessProfileAutofillSuggestion(
              result.data.profile,
              result.profileSuggestion,
            ),
          }
        : result.data;
    replaceData(dataToImport);
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
          hint="Selecciona el archivo principal generado por el programa de origen."
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
              label="Archivo auxiliar opcional"
              hint="Si el origen lo genera, puede ayudar a continuar numeraciones antiguas."
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
                ¿Dónde encuentro el archivo auxiliar?
              </div>
              <p className="mt-1">
                Normalmente aparece junto al archivo principal, dentro de la
                carpeta del programa o de la copia. No es obligatorio: si no lo
                tienes, importa solo el archivo principal.
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

          <DetectedBusinessSettings
            result={result}
            applyDetectedProfile={applyDetectedProfile}
            onApplyDetectedProfileChange={setApplyDetectedProfile}
          />

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
                {result.preview.unpaidInvoices > 0
                  ? ` · ${result.preview.unpaidInvoices} sin pagar`
                  : ""}
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

          {result.preview.unpaidInvoices > 0 ? (
            <div className="space-y-3 rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-950">
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  <p className="font-semibold">
                    Hay facturas marcadas como impagadas
                  </p>
                  <p className="mt-1 text-blue-900">
                    El archivo trae {result.preview.unpaidInvoices} factura(s)
                    sin marcar como pagadas. ¿Quieres mantenerlas así o
                    marcarlas como pagadas al importar?
                  </p>
                </div>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <label className="flex items-start gap-2 rounded-lg border border-blue-200 bg-white p-3">
                  <input
                    type="radio"
                    name="invoice-payment-mode"
                    value="keep"
                    checked={invoicePaymentMode === "keep"}
                    disabled={busy}
                    onChange={() => handleInvoicePaymentMode("keep")}
                    className="mt-1 h-4 w-4"
                  />
                  <span>
                    <span className="block font-semibold">
                      Mantenerlas como vienen
                    </span>
                    <span className="block text-xs text-slate-600">
                      Las facturas sin pagar seguirán pendientes.
                    </span>
                  </span>
                </label>
                <label className="flex items-start gap-2 rounded-lg border border-blue-200 bg-white p-3">
                  <input
                    type="radio"
                    name="invoice-payment-mode"
                    value="markPaid"
                    checked={invoicePaymentMode === "markPaid"}
                    disabled={busy}
                    onChange={() => handleInvoicePaymentMode("markPaid")}
                    className="mt-1 h-4 w-4"
                  />
                  <span>
                    <span className="block font-semibold">
                      Marcarlas como pagadas
                    </span>
                    <span className="block text-xs text-slate-600">
                      Útil si es una importación histórica ya cerrada.
                    </span>
                  </span>
                </label>
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
              Si ya habías importado este archivo antes, se reemplazará esa
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

function DetectedBusinessSettings({
  result,
  applyDetectedProfile,
  onApplyDetectedProfileChange,
}: {
  result: PcFacturacionImportResult;
  applyDetectedProfile: boolean;
  onApplyDetectedProfileChange: (value: boolean) => void;
}) {
  const suggestion = result.profileSuggestion;
  if (!hasBusinessProfileAutofillSuggestion(suggestion)) return null;

  return (
    <div className="space-y-3 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-950">
      <div>
        <p className="font-semibold">
          Hemos detectado configuración de empresa en tus datos importados
        </p>
        <p className="mt-1 text-blue-900">
          Si lo aceptas, se rellenarán solo los campos vacíos y se añadirán los
          tipos de IVA que falten. Los campos que ya tengan valor no se cambian
          automáticamente.
        </p>
      </div>

      {suggestion.fields.length > 0 ? (
        <div className="overflow-x-auto rounded-xl border border-blue-100 bg-white">
          <table className="min-w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-3 py-2 font-bold uppercase">Campo</th>
                <th className="px-3 py-2 font-bold uppercase">Actual</th>
                <th className="px-3 py-2 font-bold uppercase">Detectado</th>
                <th className="px-3 py-2 font-bold uppercase">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {suggestion.fields.map((field) => (
                <tr key={field.field}>
                  <td className="px-3 py-2 font-semibold text-slate-900">
                    {field.label}
                  </td>
                  <td className="px-3 py-2">
                    {formatDetectedValue(field.currentValue)}
                  </td>
                  <td className="px-3 py-2 font-medium">
                    {field.detectedValue}
                  </td>
                  <td className="px-3 py-2">
                    {field.willFillEmptyField
                      ? "Se rellenará si lo aceptas"
                      : "No se cambia automáticamente"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {suggestion.differentCurrentValueCount > 0 ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-amber-900">
          Hay {suggestion.differentCurrentValueCount} campo(s) con valor actual
          distinto al detectado. Los dejamos como están para evitar pisar una
          corrección manual.
        </p>
      ) : null}

      {suggestion.missingIvaRates.length > 0 ? (
        <p className="rounded-lg border border-blue-100 bg-white px-3 py-2">
          Tipos de IVA actuales:{" "}
          <strong>{formatIvaRates(suggestion.currentIvaRates)}</strong>
          <br />
          Tipos detectados que faltan:{" "}
          <strong>{formatIvaRates(suggestion.missingIvaRates)}</strong>
        </p>
      ) : null}

      <label className="flex items-start gap-3 rounded-xl border border-blue-200 bg-white p-3 text-slate-800">
        <input
          type="checkbox"
          checked={applyDetectedProfile}
          onChange={(event) =>
            onApplyDetectedProfileChange(event.target.checked)
          }
          className="mt-1 h-4 w-4"
        />
        <span>
          <span className="block font-semibold">
            Rellenar ajustes vacíos con estos datos al importar
          </span>
          <span className="block text-xs text-slate-600">
            Si no lo marcas, se importarán documentos y clientes, pero no se
            tocarán tus ajustes de empresa.
          </span>
        </span>
      </label>
    </div>
  );
}
