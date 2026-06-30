"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Crown,
  Database,
  FileCog,
  FileUp,
  Loader2,
  Lock,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { UpgradeModal } from "@/components/billing/UpgradeModal";
import {
  AiProcessingConsentNotice,
  useAiProcessingConsent,
} from "@/components/legal/AiProcessingConsentNotice";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card, PageHeader } from "@/components/ui/Card";
import { Field, Input, Select } from "@/components/ui/Field";
import { useBilling } from "@/context/BillingContext";
import { useCloudSync } from "@/context/CloudSyncContext";
import { useAppStore } from "@/context/AppStore";
import type { ScanQuota } from "@/lib/billing/scan-limits";
import {
  PC_FACTURACION_SOURCE_NAME,
  readPcFacturacionMdb,
  type PcFacturacionImportResult,
} from "@/lib/importers/pcfacturacion";
import {
  FACTURADIRECTA_SOURCE_NAME,
  readFacturaDirectaFiles,
  type FacturaDirectaImportResult,
} from "@/lib/importers/facturadirecta";
import {
  HOLDED_CONFIDENCE,
  HOLDED_SOURCE_NAME,
  readHoldedWorkbook,
  type HoldedImportResult,
} from "@/lib/importers/holded";
import {
  GENERIC_DOCUMENTS_SOURCE_NAME,
  readGenericDocumentFiles,
  type GenericDocumentImportResult,
} from "@/lib/importers/generic-documents";
import {
  applyBusinessProfileAutofillSuggestion,
  hasBusinessProfileAutofillSuggestion,
} from "@/lib/business-profile-autofill";
import type {
  ImportAiReviewInput,
  ImportAiReviewResult,
} from "@/lib/import-ai/review";

type ImportSource =
  | "auto"
  | "pcfacturacion3"
  | "facturadirecta"
  | "holded"
  | "generic-documents"
  | "prestashop"
  | "csv";
type InvoicePaymentImportMode = "keep" | "markPaid";
type ImportResult =
  | PcFacturacionImportResult
  | FacturaDirectaImportResult
  | HoldedImportResult
  | GenericDocumentImportResult;

const IMPORT_SOURCES: Array<{
  value: ImportSource;
  label: string;
  disabled?: boolean;
}> = [
  { value: "auto", label: "Detectar automáticamente" },
  { value: "pcfacturacion3", label: PC_FACTURACION_SOURCE_NAME },
  { value: "facturadirecta", label: FACTURADIRECTA_SOURCE_NAME },
  { value: "holded", label: `${HOLDED_SOURCE_NAME} (en validación)` },
  { value: "generic-documents", label: GENERIC_DOCUMENTS_SOURCE_NAME },
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

function isFacturaDirectaResult(
  result: ImportResult,
): result is FacturaDirectaImportResult {
  return result.preview.sourceName === FACTURADIRECTA_SOURCE_NAME;
}

function isHoldedResult(result: ImportResult): result is HoldedImportResult {
  return result.preview.sourceName === HOLDED_SOURCE_NAME;
}

function isGenericDocumentResult(
  result: ImportResult,
): result is GenericDocumentImportResult {
  return result.preview.sourceName === GENERIC_DOCUMENTS_SOURCE_NAME;
}

function resultUnsupported(
  result: ImportResult,
): ImportAiReviewInput["unsupported"] {
  if (
    !isFacturaDirectaResult(result) &&
    !isHoldedResult(result) &&
    !isGenericDocumentResult(result)
  ) {
    return [];
  }
  return result.unsupported.map((item) => ({
    label: item.label,
    reason: item.reason,
    count: item.count,
  }));
}

function buildImportAiPayload(result: ImportResult): ImportAiReviewInput {
  if (isFacturaDirectaResult(result)) {
    return {
      sourceName: result.preview.sourceName,
      summary: {
        customers: result.preview.customers,
        suppliers: result.preview.suppliers,
        invoices: result.preview.invoices,
        invoiceLines: result.preview.invoiceLines,
        estimates: result.preview.estimates,
        expenses: result.preview.expenses,
        productsRead: result.preview.productsRead,
        productsUsedForLines: result.preview.productsUsedForLines,
        dateRange: formatRange(
          result.preview.dateRange.from,
          result.preview.dateRange.to,
        ),
        ignoredFiles: result.preview.ignoredFiles,
        partialDueDateDocuments: result.preview.partialDueDateDocuments,
      },
      warnings: result.warnings,
      unsupported: resultUnsupported(result),
    };
  }

  if (isHoldedResult(result)) {
    return {
      sourceName: result.preview.sourceName,
      confidenceLabel: result.preview.confidence,
      summary: {
        customers: result.preview.customers,
        suppliers: result.preview.suppliers,
        mixedRoleContacts: result.preview.mixedRoleContacts,
        invoices: result.preview.invoices,
        invoiceLines: result.preview.invoiceLines,
        estimates: result.preview.estimates,
        estimateLines: result.preview.estimateLines,
        expenses: result.preview.expenses,
        expenseLines: result.preview.expenseLines,
        productsRead: result.preview.productsRead,
        productsUsedForLines: result.preview.productsUsedForLines,
        attachments: result.preview.attachments,
        totalMismatches: result.preview.totalMismatches.length,
        dateRange: formatRange(
          result.preview.dateRange.from,
          result.preview.dateRange.to,
        ),
      },
      warnings: result.warnings,
      unsupported: resultUnsupported(result),
    };
  }

  if (isGenericDocumentResult(result)) {
    return {
      sourceName: result.preview.sourceName,
      confidenceLabel: result.preview.confidence,
      summary: {
        customers: result.preview.customers,
        suppliers: result.preview.suppliers,
        invoices: result.preview.invoices,
        invoiceLines: result.preview.invoiceLines,
        estimates: result.preview.estimates,
        estimateLines: result.preview.estimateLines,
        files: result.preview.files.length,
        unsupportedFiles: result.preview.unsupportedFiles,
        totalMismatches: result.preview.totalMismatches.length,
        dateRange: formatRange(
          result.preview.dateRange.from,
          result.preview.dateRange.to,
        ),
      },
      warnings: result.warnings,
      unsupported: resultUnsupported(result),
    };
  }

  return {
    sourceName: result.preview.sourceName,
    summary: {
      companyName: result.preview.companyName,
      customersToImport: result.preview.customersToImport,
      customersWithDocuments: result.preview.customersWithDocuments,
      unusedCustomers: result.preview.unusedCustomers,
      invoices: result.preview.invoices,
      invoiceLines: result.preview.invoiceLines,
      unpaidInvoices: result.preview.unpaidInvoices,
      offers: result.preview.offers,
      offerLines: result.preview.offerLines,
      orphanInvoiceLineDocuments: result.preview.orphanInvoiceLineDocuments,
      orphanOfferLineDocuments: result.preview.orphanOfferLineDocuments,
      dateRange: formatRange(
        result.preview.dateRange.from,
        result.preview.dateRange.to,
      ),
    },
    warnings: result.warnings,
    unsupported: [],
  };
}

export default function ImportarPage() {
  const { data, replaceData } = useAppStore();
  const { user } = useCloudSync();
  const { billingEnabled, isPro, limits } = useBilling();
  const [source, setSource] = useState<ImportSource>("auto");
  const [file, setFile] = useState<File | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [dwiFile, setDwiFile] = useState<File | null>(null);
  const [includeUnusedCustomers, setIncludeUnusedCustomers] = useState(false);
  const [invoicePaymentMode, setInvoicePaymentMode] =
    useState<InvoicePaymentImportMode>("keep");
  const [result, setResult] = useState<ImportResult | null>(null);
  const [applyDetectedProfile, setApplyDetectedProfile] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [aiReview, setAiReview] = useState<ImportAiReviewResult | null>(null);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [upgradeReason, setUpgradeReason] = useState<string | undefined>();
  const [upgradeMode, setUpgradeMode] = useState<"upgrade" | "scanPack">(
    "upgrade",
  );
  const aiConsent = useAiProcessingConsent();

  const hasCurrentData = useMemo(
    () => data.customers.length > 0 || data.documents.length > 0,
    [data.customers.length, data.documents.length],
  );
  const importLocked = billingEnabled && !limits.databaseImport;
  const showPcFacturacionOptions = source === "pcfacturacion3";
  const showFacturaDirectaOptions = source === "facturadirecta";
  const showHoldedOptions = source === "holded";
  const showGenericDocumentOptions = source === "generic-documents";
  const showMultiFileOptions =
    showFacturaDirectaOptions || showGenericDocumentOptions;

  function resetAiReview() {
    setAiReview(null);
    setAiError(null);
    setAiBusy(false);
  }

  async function readDwiText(nextDwiFile: File | null) {
    if (!nextDwiFile) return undefined;
    const buffer = await nextDwiFile.arrayBuffer();
    return new TextDecoder("windows-1252").decode(buffer);
  }

  async function analyze(
    nextFile = file,
    nextDwiFile = dwiFile,
    nextInvoicePaymentMode = invoicePaymentMode,
    nextFiles = files,
  ) {
    if (showMultiFileOptions ? nextFiles.length === 0 : !nextFile) return;
    setBusy(true);
    setError(null);
    setDone(false);
    setApplyDetectedProfile(false);
    resetAiReview();
    try {
      if (importLocked) {
        throw new Error(
          "La importación de datos desde otros programas requiere plan Pro.",
        );
      }
      if (
        source !== "auto" &&
        source !== "pcfacturacion3" &&
        source !== "facturadirecta" &&
        source !== "holded" &&
        source !== "generic-documents"
      ) {
        throw new Error("Ese origen todavía no tiene importador disponible.");
      }

      const parsed = showFacturaDirectaOptions
        ? await readFacturaDirectaFiles(nextFiles, data)
        : showGenericDocumentOptions
          ? await readGenericDocumentFiles(nextFiles, data)
        : showHoldedOptions
          ? await readHoldedWorkbook(nextFile as File, data)
          : await readPcFacturacionMdb(nextFile as File, data, {
              includeUnusedCustomers,
              dwiText: showPcFacturacionOptions
                ? await readDwiText(nextDwiFile)
                : undefined,
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
    setFile(null);
    setFiles([]);
    setResult(null);
    resetAiReview();
    setError(null);
    setDone(false);
    setApplyDetectedProfile(false);
  }

  function handleFile(nextFile: File | undefined) {
    setFile(nextFile ?? null);
    setResult(null);
    resetAiReview();
    setError(null);
    setDone(false);
    setApplyDetectedProfile(false);
    if (nextFile && !importLocked) void analyze(nextFile);
  }

  function handleMultiFiles(nextFiles: FileList | null) {
    const selected = Array.from(nextFiles ?? []);
    setFiles(selected);
    setFile(null);
    setResult(null);
    resetAiReview();
    setError(null);
    setDone(false);
    setApplyDetectedProfile(false);
    if (selected.length > 0 && !importLocked) {
      void analyze(file, dwiFile, invoicePaymentMode, selected);
    }
  }

  function handleDwiFile(nextFile: File | undefined) {
    const nextDwiFile = nextFile ?? null;
    setDwiFile(nextDwiFile);
    setResult(null);
    resetAiReview();
    setError(null);
    setDone(false);
    setApplyDetectedProfile(false);
    if (file) void analyze(file, nextDwiFile);
  }

  function handleInvoicePaymentMode(nextMode: InvoicePaymentImportMode) {
    setInvoicePaymentMode(nextMode);
    setDone(false);
    resetAiReview();
    if ((showFacturaDirectaOptions ? files.length > 0 : file) && !busy) {
      void analyze(file, dwiFile, nextMode, files);
    }
  }

  async function refreshAnalysis() {
    await analyze();
  }

  async function getAccessToken() {
    if (!user) return null;
    const { getSupabaseClientAsync } = await import("@/lib/supabase/client");
    const supabase = await getSupabaseClientAsync();
    const { data: sessionData } = await supabase?.auth.getSession() ?? {
      data: { session: null },
    };
    return sessionData.session?.access_token ?? null;
  }

  async function runAiReview() {
    if (!result) return;
    setAiError(null);

    if (billingEnabled && !limits.aiTextAutofill) {
      setUpgradeMode("upgrade");
      setUpgradeReason(
        "La revisión de importaciones con IA requiere plan Pro.",
      );
      setUpgradeOpen(true);
      return;
    }

    if (!aiConsent.accepted) {
      setAiError("Acepta primero el aviso de tratamiento con IA.");
      return;
    }

    setAiBusy(true);
    try {
      const headers: HeadersInit = { "Content-Type": "application/json" };
      const token = await getAccessToken();
      if (token) headers.Authorization = `Bearer ${token}`;

      const res = await fetch("/api/imports/review", {
        method: "POST",
        headers,
        body: JSON.stringify(buildImportAiPayload(result)),
      });
      const body = (await res.json()) as {
        data?: ImportAiReviewResult;
        error?: string;
        quota?: ScanQuota;
      };

      if (!res.ok || !body.data) {
        if (res.status === 402) {
          const quotaPlan = body.quota?.plan;
          const needsExtraAiBalance =
            isPro || quotaPlan === "pro" || quotaPlan === "trial";
          setUpgradeMode(needsExtraAiBalance ? "scanPack" : "upgrade");
          setUpgradeReason(body.error);
          setUpgradeOpen(true);
        } else {
          setAiError(body.error ?? "No se pudo revisar la importación con IA.");
        }
        return;
      }

      setAiReview(body.data);
    } catch {
      setAiError("Error de conexión. Comprueba internet e inténtalo de nuevo.");
    } finally {
      setAiBusy(false);
    }
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

        {showFacturaDirectaOptions ? (
          <div className="space-y-4">
            <Field
              label="Pack de archivos de FacturaDirecta"
              hint="Selecciona juntos los CSV, Excel, PDF, XSIG o ficheros contables exportados desde FacturaDirecta. Importaremos lo que la app soporte y te diremos qué queda fuera."
            >
              <Input
                type="file"
                multiple
                accept=".csv,.xlsx,.xls,.pdf,.xsig,.xml,.dat,.zip,text/csv,application/pdf"
                disabled={importLocked}
                onChange={(event) => handleMultiFiles(event.target.files)}
              />
            </Field>
            {files.length > 0 ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                <p className="font-semibold text-slate-900">
                  {files.length} archivo(s) seleccionados
                </p>
                <p className="mt-1">
                  Puedes mezclar contactos, productos, ventas, líneas,
                  vencimientos y compras. Los PDF/XSIG/contabilidad se mostrarán
                  como referencia o pendiente si la app todavía no lo soporta.
                </p>
              </div>
            ) : null}
          </div>
        ) : showGenericDocumentOptions ? (
          <div className="space-y-4">
            <Field
              label="Excel, Word o PDF"
              hint="Selecciona varios documentos sueltos: facturas, presupuestos, listados de clientes o listados de proveedores. La app previsualiza lo que entiende antes de importar."
            >
              <Input
                type="file"
                multiple
                accept=".xlsx,.xls,.docx,.pdf,application/pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                disabled={importLocked}
                onChange={(event) => handleMultiFiles(event.target.files)}
              />
            </Field>
            {files.length > 0 ? (
              <div className="rounded-xl border border-sky-200 bg-sky-50 p-3 text-sm text-sky-950">
                <p className="font-semibold">
                  {files.length} documento(s) seleccionados
                </p>
                <p className="mt-1">
                  Esta lectura es documental: detecta datos y dudas, pero no
                  guarda adjuntos ni replica la maquetación original. Si algo no
                  cuadra, puedes pedir una segunda revisión con IA.
                </p>
              </div>
            ) : null}
          </div>
        ) : showHoldedOptions ? (
          <div className="space-y-4">
            <Field
              label="Excel multihoja de Holded"
              hint="Primera versión en validación: acepta el fixture inferido de Holded para previsualizar contactos, productos, facturas, gastos y presupuestos. Antes de declarar compatibilidad real necesitaremos probar una exportación oficial."
            >
              <Input
                type="file"
                accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                disabled={importLocked}
                onChange={(event) => handleFile(event.target.files?.[0])}
              />
            </Field>
            {file ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
                <p className="font-semibold">Compatibilidad en validación</p>
                <p className="mt-1">
                  Este analizador de Holded trabaja con confianza{" "}
                  <strong>{HOLDED_CONFIDENCE}</strong>. Importará lo que encaje
                  con la app y mostrará aparte los campos que todavía no
                  soportamos.
                </p>
              </div>
            ) : null}
          </div>
        ) : (
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
        )}

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

        {source === "pcfacturacion3" ? (
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
        ) : null}

        <div className="flex flex-wrap gap-3">
          <Button
            variant="secondary"
            onClick={() => void refreshAnalysis()}
            disabled={
              (showMultiFileOptions ? files.length === 0 : !file) ||
              busy ||
              importLocked
            }
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
              {!isFacturaDirectaResult(result) &&
              !isHoldedResult(result) &&
              !isGenericDocumentResult(result) ? (
                <>
                  <br />
                  Empresa detectada:{" "}
                  <strong>{result.preview.companyName || "sin nombre"}</strong>
                </>
              ) : null}
            </p>
          </div>

          <DetectedBusinessSettings
            result={result}
            applyDetectedProfile={applyDetectedProfile}
            onApplyDetectedProfileChange={setApplyDetectedProfile}
          />

          {isFacturaDirectaResult(result) ? (
            <FacturaDirectaPreview result={result} />
          ) : isGenericDocumentResult(result) ? (
            <GenericDocumentPreview result={result} />
          ) : isHoldedResult(result) ? (
            <HoldedPreview result={result} />
          ) : (
            <PcFacturacionPreview result={result} />
          )}

          {!isFacturaDirectaResult(result) &&
          !isHoldedResult(result) &&
          !isGenericDocumentResult(result) &&
          result.preview.numbering ? (
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

          {!isFacturaDirectaResult(result) &&
          !isHoldedResult(result) &&
          !isGenericDocumentResult(result) &&
          result.preview.unpaidInvoices > 0 ? (
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

          {(isFacturaDirectaResult(result) ||
            isHoldedResult(result) ||
            isGenericDocumentResult(result)) &&
          result.unsupported.length > 0 ? (
            <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
              <div className="flex items-center gap-2 font-semibold text-slate-900">
                <FileCog className="h-4 w-4" />
                No importado todavía
              </div>
              <ul className="space-y-2">
                {result.unsupported.map((item) => (
                  <li key={item.label} className="rounded-lg bg-white p-3">
                    <p className="font-semibold text-slate-900">
                      {item.label}
                      {item.count ? ` (${item.count})` : ""}
                    </p>
                    <p className="mt-1 text-slate-600">{item.reason}</p>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <ImportAiReviewCard
            accepted={aiConsent.accepted}
            onAccept={() => {
              aiConsent.accept();
              setAiError(null);
            }}
            loading={aiBusy}
            error={aiError}
            review={aiReview}
            onReview={() => void runAiReview()}
            locked={billingEnabled && !limits.aiTextAutofill}
          />

          {hasCurrentData ? (
            <p className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
              Si ya habías importado este origen antes, se reemplazará esa
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

      <UpgradeModal
        open={upgradeOpen}
        onClose={() => setUpgradeOpen(false)}
        reason={upgradeReason}
        mode={upgradeMode}
      />
    </div>
  );
}

function ImportAiReviewCard({
  accepted,
  onAccept,
  loading,
  error,
  review,
  onReview,
  locked,
}: {
  accepted: boolean;
  onAccept: () => void;
  loading: boolean;
  error: string | null;
  review: ImportAiReviewResult | null;
  onReview: () => void;
  locked: boolean;
}) {
  return (
    <div className="space-y-3 rounded-xl border border-sky-200 bg-sky-50/70 p-3">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-sky-100 text-sky-700">
          <Sparkles className="h-5 w-5" />
        </div>
        <div>
          <p className="font-semibold text-slate-900">
            ¿Quieres una segunda revisión con IA?
          </p>
          <p className="mt-1 text-sm text-slate-600">
            Si algo no te cuadra, Factu puede revisar la previsualización,
            detectar riesgos y sugerir qué mirar antes de importar.
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Consume 1 unidad IA. No aplica cambios ni importa datos.
          </p>
        </div>
      </div>

      <AiProcessingConsentNotice
        accepted={accepted}
        onAccepted={onAccept}
        compact
      />

      <Button
        variant="secondary"
        onClick={onReview}
        disabled={loading || !accepted}
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Revisando…
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4" />
            Mejorar revisión con IA
          </>
        )}
      </Button>

      {locked ? (
        <p className="text-sm text-sky-800">
          Función Pro. Puedes seguir importando con la previsualización normal.
        </p>
      ) : null}

      {error ? <p className="text-sm font-medium text-red-600">{error}</p> : null}

      {review ? <ImportAiReviewResultView review={review} /> : null}
    </div>
  );
}

function ImportAiReviewResultView({
  review,
}: {
  review: ImportAiReviewResult;
}) {
  const confidenceClasses: Record<
    ImportAiReviewResult["overallConfidence"],
    string
  > = {
    alta: "bg-emerald-100 text-emerald-800",
    media: "bg-amber-100 text-amber-900",
    baja: "bg-red-100 text-red-800",
  };

  return (
    <div className="space-y-3 rounded-xl border border-sky-100 bg-white p-3 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`rounded-full px-3 py-1 text-xs font-bold ${confidenceClasses[review.overallConfidence]}`}
        >
          Confianza {review.overallConfidence}
        </span>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
          {recommendedActionLabel(review.recommendedAction)}
        </span>
      </div>
      <p className="font-semibold text-slate-900">{review.verdict}</p>

      {review.improvements.length > 0 ? (
        <ImportAiReviewList
          title="Mejoras o comprobaciones útiles"
          items={review.improvements}
        />
      ) : null}

      {review.risks.length > 0 ? (
        <ImportAiReviewList title="Riesgos a revisar" items={review.risks} />
      ) : null}

      {review.questions.length > 0 ? (
        <div>
          <p className="font-semibold text-slate-900">Dudas antes de importar</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-slate-700">
            {review.questions.map((question) => (
              <li key={question}>{question}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function ImportAiReviewList({
  title,
  items,
}: {
  title: string;
  items: ImportAiReviewResult["improvements"];
}) {
  return (
    <div>
      <p className="font-semibold text-slate-900">{title}</p>
      <ul className="mt-2 space-y-2">
        {items.map((item) => (
          <li key={`${item.title}-${item.detail}`} className="rounded-lg bg-slate-50 p-3">
            <p className="font-semibold text-slate-900">{item.title}</p>
            <p className="mt-1 text-slate-600">{item.detail}</p>
            {item.impact ? (
              <p className="mt-1 text-xs font-medium text-slate-500">
                {item.impact}
              </p>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

function recommendedActionLabel(action: ImportAiReviewResult["recommendedAction"]) {
  switch (action) {
    case "importar":
      return "IA: se puede importar";
    case "pedir_archivos":
      return "IA: faltan archivos";
    case "no_importar":
      return "IA: mejor no importar";
    case "revisar":
    default:
      return "IA: revisar antes";
  }
}

function PcFacturacionPreview({ result }: { result: PcFacturacionImportResult }) {
  return (
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
  );
}

function FacturaDirectaPreview({
  result,
}: {
  result: FacturaDirectaImportResult;
}) {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <PreviewStat
          label="Clientes"
          value={result.preview.customers}
          detail="Contactos marcados o usados como clientes"
        />
        <PreviewStat
          label="Proveedores"
          value={result.preview.suppliers}
          detail="Contactos marcados o usados como proveedores"
        />
        <PreviewStat
          label="Facturas"
          value={result.preview.invoices}
          detail={`${result.preview.invoiceLines} línea(s) importadas`}
        />
        <PreviewStat
          label="Presupuestos"
          value={result.preview.estimates}
          detail={
            result.preview.estimateFallbackLines > 0
              ? `${result.preview.estimateFallbackLines} con línea resumen`
              : "Con datos disponibles"
          }
        />
        <PreviewStat
          label="Gastos"
          value={result.preview.expenses}
          detail="Compras y tickets básicos"
        />
        <PreviewStat
          label="Productos leídos"
          value={result.preview.productsRead}
          detail={`${result.preview.productsUsedForLines} usados para líneas`}
        />
      </div>

      <div className="rounded-xl bg-slate-50 p-3">
        <p className="text-xs font-semibold uppercase text-slate-500">
          Fechas
        </p>
        <p className="mt-1 text-sm font-bold text-slate-900">
          {formatRange(result.preview.dateRange.from, result.preview.dateRange.to)}
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-3 text-sm">
        <p className="font-semibold text-slate-900">Archivos reconocidos</p>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {result.preview.files.map((file) => (
            <div
              key={`${file.name}-${file.kind}`}
              className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2"
            >
              <p className="truncate font-medium text-slate-900">{file.name}</p>
              <p className="text-xs text-slate-500">
                {facturaDirectaKindLabel(file.kind)}
                {file.rows > 0 ? ` · ${file.rows} fila(s)` : ""}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function GenericDocumentPreview({
  result,
}: {
  result: GenericDocumentImportResult;
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-sky-200 bg-sky-50 p-3 text-sm text-sky-950">
        <p className="font-semibold">Lectura documental</p>
        <p className="mt-1">
          Esta previsualización usa confianza{" "}
          <strong>{result.preview.confidence}</strong>. Sirve para traer datos
          desde Excel, Word o PDF sueltos; revisa siempre antes de importar.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <PreviewStat
          label="Clientes"
          value={result.preview.customers}
          detail="Detectados en listados o documentos"
        />
        <PreviewStat
          label="Proveedores"
          value={result.preview.suppliers}
          detail="Detectados en listados"
        />
        <PreviewStat
          label="Facturas"
          value={result.preview.invoices}
          detail={`${result.preview.invoiceLines} línea(s) leídas`}
        />
        <PreviewStat
          label="Presupuestos"
          value={result.preview.estimates}
          detail={`${result.preview.estimateLines} línea(s) leídas`}
        />
        <PreviewStat
          label="Archivos"
          value={result.preview.files.length}
          detail={
            result.preview.unsupportedFiles > 0
              ? `${result.preview.unsupportedFiles} sin clasificar`
              : "Clasificados por tipo"
          }
        />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-3 text-sm">
        <p className="font-semibold text-slate-900">Rango de fechas detectado</p>
        <p className="mt-1 text-slate-600">
          {formatRange(result.preview.dateRange.from, result.preview.dateRange.to)}
        </p>
      </div>

      {result.preview.totalMismatches.length > 0 ? (
        <div className="rounded-xl border border-amber-200 bg-white p-3 text-sm">
          <p className="font-semibold text-slate-900">Totales a revisar</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {result.preview.totalMismatches.slice(0, 6).map((item) => (
              <div
                key={`${item.fileName}-${item.documentNumber}`}
                className="rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-amber-950"
              >
                <p className="font-medium">{item.documentNumber}</p>
                <p className="text-xs">
                  Documento: {item.expected.toFixed(2)} · Recalculado:{" "}
                  {item.calculated.toFixed(2)}
                </p>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="rounded-xl border border-slate-200 bg-white p-3 text-sm">
        <p className="font-semibold text-slate-900">Archivos leídos</p>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {result.preview.files.map((file) => (
            <div
              key={`${file.name}-${file.kind}`}
              className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2"
            >
              <p className="truncate font-medium text-slate-900">{file.name}</p>
              <p className="text-xs text-slate-500">
                {genericDocumentFormatLabel(file.format)} ·{" "}
                {genericDocumentKindLabel(file.kind)}
                {file.rows > 0 ? ` · ${file.rows} fila(s)` : ""}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function HoldedPreview({ result }: { result: HoldedImportResult }) {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
        <p className="font-semibold">Holded en validación</p>
        <p className="mt-1">
          Esta previsualización usa confianza{" "}
          <strong>{result.preview.confidence}</strong>. Sirve para probar el
          parser con el fixture actual; antes de activar soporte público hará
          falta validar una exportación real de Holded.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <PreviewStat
          label="Clientes"
          value={result.preview.customers}
          detail={
            result.preview.mixedRoleContacts > 0
              ? `${result.preview.mixedRoleContacts} contacto(s) con doble rol`
              : "Contactos tipo cliente"
          }
        />
        <PreviewStat
          label="Proveedores"
          value={result.preview.suppliers}
          detail="Contactos tipo proveedor"
        />
        <PreviewStat
          label="Facturas"
          value={result.preview.invoices}
          detail={`${result.preview.invoiceLines} línea(s) leídas`}
        />
        <PreviewStat
          label="Presupuestos"
          value={result.preview.estimates}
          detail={`${result.preview.estimateLines} línea(s) leídas`}
        />
        <PreviewStat
          label="Gastos"
          value={result.preview.expenses}
          detail={`${result.preview.expenseLines} línea(s) leídas`}
        />
        <PreviewStat
          label="Productos leídos"
          value={result.preview.productsRead}
          detail={`${result.preview.productsUsedForLines} usados en líneas`}
        />
      </div>

      <div className="rounded-xl bg-slate-50 p-3">
        <p className="text-xs font-semibold uppercase text-slate-500">
          Fechas
        </p>
        <p className="mt-1 text-sm font-bold text-slate-900">
          {formatRange(result.preview.dateRange.from, result.preview.dateRange.to)}
        </p>
      </div>

      {result.preview.totalMismatches.length > 0 ? (
        <div className="rounded-xl border border-amber-200 bg-white p-3 text-sm">
          <p className="font-semibold text-slate-900">Totales a revisar</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {result.preview.totalMismatches.slice(0, 6).map((item) => (
              <div
                key={item.documentNumber}
                className="rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-amber-950"
              >
                <p className="font-medium">{item.documentNumber}</p>
                <p className="text-xs">
                  Holded: {item.expected.toFixed(2)} · Recalculado:{" "}
                  {item.calculated.toFixed(2)}
                </p>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="rounded-xl border border-slate-200 bg-white p-3 text-sm">
        <p className="font-semibold text-slate-900">Hojas reconocidas</p>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {result.preview.sheets.map((sheet) => (
            <div
              key={`${sheet.name}-${sheet.kind}`}
              className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2"
            >
              <p className="truncate font-medium text-slate-900">{sheet.name}</p>
              <p className="text-xs text-slate-500">
                {holdedKindLabel(sheet.kind)}
                {sheet.rows > 0 ? ` · ${sheet.rows} fila(s)` : ""}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function PreviewStat({
  label,
  value,
  detail,
}: {
  label: string;
  value: number;
  detail: string;
}) {
  return (
    <div className="rounded-xl bg-slate-50 p-3">
      <p className="text-xs font-semibold uppercase text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{detail}</p>
    </div>
  );
}

function genericDocumentFormatLabel(kind: string): string {
  switch (kind) {
    case "excel":
      return "Excel";
    case "word":
      return "Word";
    case "pdf":
      return "PDF";
    default:
      return "Formato no reconocido";
  }
}

function genericDocumentKindLabel(kind: string): string {
  switch (kind) {
    case "invoice":
      return "Factura";
    case "estimate":
      return "Presupuesto";
    case "customers":
      return "Clientes";
    case "suppliers":
      return "Proveedores";
    default:
      return "Sin clasificar";
  }
}

function facturaDirectaKindLabel(kind: string): string {
  switch (kind) {
    case "contacts":
      return "Contactos";
    case "products":
      return "Productos";
    case "sales":
      return "Ventas";
    case "invoiceLines":
      return "Líneas facturadas";
    case "salesDueDates":
      return "Vencimientos de ventas";
    case "purchases":
      return "Compras";
    case "purchaseDueDates":
      return "Vencimientos de compras";
    case "facturae":
      return "Facturae / XML";
    case "accounting":
      return "Contabilidad";
    case "pdf":
      return "PDF de referencia";
    default:
      return "No reconocido";
  }
}

function holdedKindLabel(kind: string): string {
  switch (kind) {
    case "contacts":
      return "Contactos";
    case "products":
      return "Productos";
    case "invoices":
      return "Facturas";
    case "invoiceLines":
      return "Líneas de factura";
    case "purchases":
      return "Gastos y compras";
    case "purchaseLines":
      return "Líneas de gasto";
    case "estimates":
      return "Presupuestos";
    case "estimateLines":
      return "Líneas de presupuesto";
    case "attachments":
      return "Adjuntos de referencia";
    case "fieldMap":
      return "Mapa de campos";
    case "sources":
      return "Fuentes";
    case "readme":
      return "Notas del fixture";
    default:
      return "Hoja informativa";
  }
}

function DetectedBusinessSettings({
  result,
  applyDetectedProfile,
  onApplyDetectedProfileChange,
}: {
  result: ImportResult;
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
