"use client";

import { useRef, useState } from "react";
import {
  Crown,
  Database,
  FileUp,
  Lock,
  RefreshCw,
  Users,
} from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card, PageHeader } from "@/components/ui/Card";
import { Field, Input, Select } from "@/components/ui/Field";
import { useBilling } from "@/context/BillingContext";
import { useAppStore } from "@/context/AppStore";
import { buildContactOnlyImportData } from "@/lib/importers/contact-only";
import {
  FACTURADIRECTA_SOURCE_NAME,
  readFacturaDirectaFiles,
  type FacturaDirectaImportResult,
} from "@/lib/importers/facturadirecta";
import {
  GENERIC_DOCUMENTS_SOURCE_NAME,
  readGenericDocumentFiles,
  type GenericDocumentImportResult,
} from "@/lib/importers/generic-documents";
import {
  HOLDED_SOURCE_NAME,
  readHoldedWorkbook,
  type HoldedImportResult,
} from "@/lib/importers/holded";
import {
  PC_FACTURACION_SOURCE_NAME,
  readPcFacturacionMdb,
  type PcFacturacionImportResult,
} from "@/lib/importers/pcfacturacion";
import { reanalyzeImportAgainstCurrent } from "@/lib/importers/protected-documents";
import type { AppData } from "@/lib/types";

type ImportSource =
  | "auto"
  | "pcfacturacion3"
  | "facturadirecta"
  | "holded"
  | "generic-documents"
  | "prestashop"
  | "csv";

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
  { value: "generic-documents", label: "Excel, Word o PDF de contactos" },
  { value: "prestashop", label: "PrestaShop (próximamente)", disabled: true },
  { value: "csv", label: "Excel o CSV genérico (próximamente)", disabled: true },
];

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

function contactCounts(result: ImportResult): {
  customers: number;
  suppliers: number;
} {
  if (
    isFacturaDirectaResult(result) ||
    isHoldedResult(result) ||
    isGenericDocumentResult(result)
  ) {
    return {
      customers: result.preview.customers,
      suppliers: result.preview.suppliers,
    };
  }

  return { customers: result.preview.customersToImport, suppliers: 0 };
}

export default function ImportarPage() {
  const { data, getCurrentData, replaceDataIfCurrent } = useAppStore();
  const { billingEnabled, limits } = useBilling();
  const analysisGenerationRef = useRef(0);
  const resultGenerationRef = useRef<number | null>(null);
  const resultBaseDataRef = useRef<AppData | null>(null);
  const [source, setSource] = useState<ImportSource>("auto");
  const [file, setFile] = useState<File | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const hasCurrentContacts =
    data.customers.length > 0 || data.suppliers.length > 0;
  const importLocked = billingEnabled && !limits.databaseImport;
  const showFacturaDirectaOptions = source === "facturadirecta";
  const showHoldedOptions = source === "holded";
  const showGenericDocumentOptions = source === "generic-documents";
  const showMultiFileOptions =
    showFacturaDirectaOptions || showGenericDocumentOptions;
  const previewCounts = result ? contactCounts(result) : null;
  const hasDetectedContacts = Boolean(
    previewCounts && previewCounts.customers + previewCounts.suppliers > 0,
  );

  function invalidateAnalysis() {
    analysisGenerationRef.current += 1;
    resultGenerationRef.current = null;
    resultBaseDataRef.current = null;
    setBusy(false);
  }

  async function parseSelectedImport(
    currentData: AppData,
    nextFile = file,
    nextFiles = files,
  ): Promise<ImportResult> {
    if (showFacturaDirectaOptions) {
      return readFacturaDirectaFiles(nextFiles, currentData);
    }
    if (showGenericDocumentOptions) {
      return readGenericDocumentFiles(nextFiles, currentData);
    }
    if (showHoldedOptions) {
      return readHoldedWorkbook(nextFile as File, currentData);
    }
    return readPcFacturacionMdb(nextFile as File, currentData, {
      includeUnusedCustomers: true,
      markUnpaidInvoicesAsPaid: false,
    });
  }

  async function analyze(nextFile = file, nextFiles = files) {
    if (showMultiFileOptions ? nextFiles.length === 0 : !nextFile) return;
    const generation = ++analysisGenerationRef.current;
    const analysisBaseData = getCurrentData();
    setBusy(true);
    setError(null);
    setDone(false);
    try {
      if (importLocked) {
        throw new Error(
          "La importación de clientes y proveedores requiere plan Pro.",
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

      const parsed = await parseSelectedImport(
        analysisBaseData,
        nextFile,
        nextFiles,
      );
      if (analysisGenerationRef.current !== generation) return;
      resultGenerationRef.current = generation;
      resultBaseDataRef.current = analysisBaseData;
      setResult(parsed);
    } catch (caught) {
      if (analysisGenerationRef.current !== generation) return;
      resultGenerationRef.current = null;
      resultBaseDataRef.current = null;
      setResult(null);
      const fallback =
        source === "auto"
          ? "No se pudo detectar el origen. Selecciona el programa que creó el archivo."
          : "No se pudo leer el archivo con el importador seleccionado.";
      setError(caught instanceof Error ? caught.message : fallback);
    } finally {
      if (analysisGenerationRef.current === generation) setBusy(false);
    }
  }

  function handleSource(nextSource: ImportSource) {
    invalidateAnalysis();
    setSource(nextSource);
    setFile(null);
    setFiles([]);
    setResult(null);
    setError(null);
    setDone(false);
  }

  function handleFile(nextFile: File | undefined) {
    invalidateAnalysis();
    const selected = nextFile ?? null;
    setFile(selected);
    setResult(null);
    setError(null);
    setDone(false);
    if (selected && !importLocked) void analyze(selected);
  }

  function handleMultiFiles(nextFiles: FileList | null) {
    invalidateAnalysis();
    const selected = Array.from(nextFiles ?? []);
    setFiles(selected);
    setFile(null);
    setResult(null);
    setError(null);
    setDone(false);
    if (selected.length > 0 && !importLocked) {
      void analyze(file, selected);
    }
  }

  async function importContacts() {
    if (!result) return;
    if (importLocked) {
      setError("La importación de clientes y proveedores requiere plan Pro.");
      return;
    }
    if (!hasDetectedContacts) {
      setError("No hay clientes ni proveedores que importar.");
      return;
    }
    if (
      resultGenerationRef.current === null ||
      resultGenerationRef.current !== analysisGenerationRef.current
    ) {
      setError(
        "La selección cambió desde la última vista previa. Analiza de nuevo los archivos antes de importar.",
      );
      return;
    }

    const previewBaseData = resultBaseDataRef.current;
    const requiresRenewedApproval = previewBaseData !== getCurrentData();
    const generation = ++analysisGenerationRef.current;
    const selectedFile = file;
    const selectedFiles = files;
    setBusy(true);
    setError(null);
    try {
      let analyzedBaseData: AppData | null = null;
      const freshResult = await reanalyzeImportAgainstCurrent({
        getCurrentData,
        analyze: (currentData) => {
          analyzedBaseData = currentData;
          return parseSelectedImport(currentData, selectedFile, selectedFiles);
        },
      });
      if (analysisGenerationRef.current !== generation || !analyzedBaseData) {
        return;
      }
      setResult(freshResult);
      resultGenerationRef.current = generation;
      resultBaseDataRef.current = analyzedBaseData;
      if (requiresRenewedApproval) {
        setDone(false);
        setError(
          "La cuenta cambió desde la vista previa. La hemos actualizado con el estado actual: revísala y vuelve a importar.",
        );
        return;
      }

      const nextData = buildContactOnlyImportData(
        analyzedBaseData,
        freshResult.data,
      );
      if (analysisGenerationRef.current !== generation) return;
      if (!replaceDataIfCurrent(nextData, analyzedBaseData)) {
        resultGenerationRef.current = null;
        resultBaseDataRef.current = null;
        setDone(false);
        setError(
          "La cuenta volvió a cambiar antes de aplicar la importación. No se aplicó ningún cambio; analiza de nuevo los archivos.",
        );
        return;
      }
      setDone(true);
    } catch (caught) {
      if (analysisGenerationRef.current !== generation) return;
      setDone(false);
      setError(
        caught instanceof Error
          ? caught.message
          : "No se pudo revalidar la importación. No se aplicó ningún cambio.",
      );
    } finally {
      if (analysisGenerationRef.current === generation) setBusy(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Importar clientes y proveedores"
        subtitle="Trae tus contactos desde otro programa sin modificar documentos, numeración ni ajustes."
      />

      <Card className="mb-6 space-y-4">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
            <Database className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Origen de los contactos
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Elige el programa que creó el archivo para localizar sus clientes
              y proveedores.
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950">
          <p className="font-semibold">Solo se importarán contactos</p>
          <p className="mt-1 text-emerald-900">
            Facturas, presupuestos, recibos, gastos, productos, numeración,
            datos de empresa y ajustes permanecerán exactamente como están.
          </p>
        </div>

        {importLocked ? (
          <div className="rounded-xl border border-violet-200 bg-violet-50 p-4 text-sm text-violet-950">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
                <Lock className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold">
                  Importar contactos es una función Pro
                </p>
                <p className="mt-1 text-violet-900">
                  Para analizar e importar clientes y proveedores desde otro
                  programa necesitas activar Pro.
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
            disabled={importLocked || busy}
          >
            {IMPORT_SOURCES.map((item) => (
              <option key={item.value} value={item.value} disabled={item.disabled}>
                {item.label}
              </option>
            ))}
          </Select>
        </Field>

        {showFacturaDirectaOptions ? (
          <MultiFileInput
            label="Archivo de contactos de FacturaDirecta"
            hint="Selecciona los CSV o Excel de contactos. Solo se aplicarán las fichas detectadas como clientes o proveedores."
            accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
            count={files.length}
            disabled={importLocked || busy}
            onChange={handleMultiFiles}
          />
        ) : showGenericDocumentOptions ? (
          <MultiFileInput
            label="Listados de clientes o proveedores"
            hint="Selecciona uno o varios Excel, Word o PDF con contactos. La app mostrará las fichas que puede importar."
            accept=".xlsx,.xls,.docx,.pdf,application/pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            count={files.length}
            disabled={importLocked || busy}
            onChange={handleMultiFiles}
          />
        ) : showHoldedOptions ? (
          <Field
            label="Excel multihoja de Holded"
            hint="Selecciona una exportación Excel de Holded. Solo se aplicarán sus contactos."
          >
            <Input
              type="file"
              accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
              disabled={importLocked || busy}
              onChange={(event) => handleFile(event.target.files?.[0])}
            />
          </Field>
        ) : (
          <Field
            label="Base de datos de contactos"
            hint="Selecciona el archivo principal. Se leerán todos los clientes, aunque todavía no tengan documentos."
          >
            <Input
              type="file"
              accept=".mdb,application/msaccess,application/x-msaccess"
              disabled={importLocked || busy}
              onChange={(event) => handleFile(event.target.files?.[0])}
            />
          </Field>
        )}

        <Button
          variant="secondary"
          onClick={() => void analyze()}
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
          {busy ? "Analizando…" : "Analizar contactos"}
        </Button>
      </Card>

      {error ? (
        <Card className="mb-6 border-red-200 bg-red-50 text-sm text-red-800">
          {error}
        </Card>
      ) : null}

      {result && previewCounts ? (
        <Card className="mb-6 space-y-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Contactos detectados
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Origen: <strong>{result.preview.sourceName}</strong>
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <ContactStat label="Clientes" value={previewCounts.customers} />
            <ContactStat label="Proveedores" value={previewCounts.suppliers} />
          </div>

          {!hasDetectedContacts ? (
            <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
              No se han encontrado clientes ni proveedores en los archivos
              seleccionados.
            </p>
          ) : null}

          <p className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
            Ningún documento ni ajuste se importará. La app volverá a comprobar
            el estado actual de la cuenta justo antes de guardar los contactos.
          </p>

          {hasCurrentContacts ? (
            <p className="text-sm text-slate-600">
              Las fichas importadas anteriormente desde este mismo origen se
              actualizarán para evitar duplicados. Los contactos creados
              manualmente se conservan.
            </p>
          ) : null}

          <Button
            onClick={() => void importContacts()}
            disabled={importLocked || busy || !hasDetectedContacts}
          >
            <Users className="h-4 w-4" />
            {busy ? "Revalidando…" : "Importar clientes y proveedores"}
          </Button>

          {done ? (
            <p className="text-sm font-semibold text-emerald-700">
              Clientes y proveedores importados. No se ha modificado ningún
              documento ni ajuste. Si tienes sesión en la nube, los contactos
              se sincronizarán automáticamente.
            </p>
          ) : null}
        </Card>
      ) : null}
    </div>
  );
}

function MultiFileInput({
  label,
  hint,
  accept,
  count,
  disabled,
  onChange,
}: {
  label: string;
  hint: string;
  accept: string;
  count: number;
  disabled: boolean;
  onChange: (files: FileList | null) => void;
}) {
  return (
    <div className="space-y-3">
      <Field label={label} hint={hint}>
        <Input
          type="file"
          multiple
          accept={accept}
          disabled={disabled}
          onChange={(event) => onChange(event.target.files)}
        />
      </Field>
      {count > 0 ? (
        <p className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
          {count} archivo(s) seleccionados. Cualquier contenido que no sea un
          cliente o proveedor se ignorará al guardar.
        </p>
      ) : null}
    </div>
  );
}

function ContactStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3">
      <p className="text-xs font-semibold uppercase text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
      <p className="mt-1 text-xs text-slate-500">
        {value === 1 ? "1 ficha preparada" : `${value} fichas preparadas`}
      </p>
    </div>
  );
}
