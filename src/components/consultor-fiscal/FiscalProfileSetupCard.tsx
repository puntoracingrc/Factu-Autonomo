"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  FileCheck2,
  FileUp,
  Loader2,
  Pencil,
  Plus,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field, Input, Select } from "@/components/ui/Field";
import type { BusinessProfile } from "@/lib/types";
import {
  buildTaxContextFromBusinessProfile,
  createImportedFiscalProfile,
  createManualFiscalProfile,
  createSkippedFiscalProfile,
  fiscalProfileMissingLabels,
  fiscalProfileToDraft,
  inferTaxpayerTypeFromSpanishTaxId,
  parseCensusCertificateText,
  readCensusDocumentText,
  reconcileCensusIdentity,
  type BusinessFiscalProfile,
  type CensusCertificateCandidate,
  type FiscalActivity,
  type FiscalProfileDraft,
} from "@/lib/fiscal-profile";

const AEAT_CSV_CHECK_URL =
  "https://sede.agenciatributaria.gob.es/Sede/procedimientos/ZZ05.shtml";

type SetupMode = "CHOICE" | "SUMMARY" | "MANUAL" | "IMPORT" | "IMPORT_REVIEW";

interface FiscalProfileSetupCardProps {
  businessProfile: BusinessProfile;
  onSave: (profile: BusinessFiscalProfile) => void;
}

function activityRows(draft: FiscalProfileDraft): FiscalActivity[] {
  return draft.activities.length > 0
    ? draft.activities
    : [{ description: "" }];
}

function taxpayerLabel(value: BusinessFiscalProfile["taxpayerType"]): string {
  if (value === "SELF_EMPLOYED_IRPF") return "Autónomo · IRPF";
  if (value === "COMPANY_IS") return "Sociedad · Impuesto sobre Sociedades";
  return "Sin indicar";
}

function jurisdictionLabel(value: BusinessFiscalProfile["jurisdiction"]): string {
  const labels: Record<BusinessFiscalProfile["jurisdiction"], string> = {
    UNKNOWN: "Sin indicar",
    ES_COMMON: "España · territorio común",
    ES_CANARY_IGIC: "Canarias · IGIC",
    ES_NAVARRA: "Navarra",
    ES_BASQUE_COUNTRY: "País Vasco",
    ES_CEUTA_MELILLA: "Ceuta o Melilla",
  };
  return labels[value];
}

function sourceLabel(profile: BusinessFiscalProfile): string {
  if (profile.source.kind === "AEAT_CENSUS_CERTIFICATE") {
    return "Certificado o documento censal de la AEAT";
  }
  if (profile.source.kind === "MANUAL") return "Confirmado manualmente";
  return "No configurado";
}

function FiscalProfileFields({
  draft,
  onChange,
}: {
  draft: FiscalProfileDraft;
  onChange: (next: FiscalProfileDraft) => void;
}) {
  const activities = activityRows(draft);

  function updateActivity(index: number, update: Partial<FiscalActivity>) {
    onChange({
      ...draft,
      activities: activities.map((activity, activityIndex) =>
        activityIndex === index ? { ...activity, ...update } : activity,
      ),
    });
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-5 md:grid-cols-2">
        <Field
          label="Tipo de contribuyente"
          hint="El formato del NIF solo sirve como sugerencia; confirma siempre este dato."
        >
          <Select
            value={draft.taxpayerType}
            onChange={(event) =>
              onChange({
                ...draft,
                taxpayerType: event.target.value as FiscalProfileDraft["taxpayerType"],
                directTaxRegime:
                  event.target.value === "COMPANY_IS"
                    ? "UNKNOWN"
                    : draft.directTaxRegime,
              })
            }
          >
            <option value="UNKNOWN">No lo sé todavía</option>
            <option value="SELF_EMPLOYED_IRPF">Autónomo · IRPF</option>
            <option value="COMPANY_IS">Sociedad · Impuesto sobre Sociedades</option>
          </Select>
        </Field>

        <Field
          label="Territorio fiscal"
          hint="No se decide automáticamente a partir de la dirección postal."
        >
          <Select
            value={draft.jurisdiction}
            onChange={(event) =>
              onChange({
                ...draft,
                jurisdiction: event.target.value as FiscalProfileDraft["jurisdiction"],
              })
            }
          >
            <option value="UNKNOWN">No lo sé todavía</option>
            <option value="ES_COMMON">España · territorio común</option>
            <option value="ES_CANARY_IGIC">Canarias · IGIC</option>
            <option value="ES_NAVARRA">Navarra</option>
            <option value="ES_BASQUE_COUNTRY">País Vasco</option>
            <option value="ES_CEUTA_MELILLA">Ceuta o Melilla</option>
          </Select>
        </Field>

        {draft.taxpayerType !== "COMPANY_IS" ? (
          <Field label="Régimen de IRPF">
            <Select
              value={draft.directTaxRegime}
              onChange={(event) =>
                onChange({
                  ...draft,
                  directTaxRegime:
                    event.target.value as FiscalProfileDraft["directTaxRegime"],
                })
              }
            >
              <option value="UNKNOWN">No lo sé todavía</option>
              <option value="DIRECT_ESTIMATION_SIMPLIFIED">
                Estimación directa simplificada
              </option>
              <option value="DIRECT_ESTIMATION_NORMAL">
                Estimación directa normal
              </option>
            </Select>
          </Field>
        ) : (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
            El motor actual no aplica reglas de IRPF de autónomos a sociedades.
            Guardaremos el tipo correcto y mostrará “no soportado” sin inventar una
            respuesta.
          </div>
        )}

        <Field label="Régimen de IVA">
          <Select
            value={draft.vatRegime}
            onChange={(event) =>
              onChange({
                ...draft,
                vatRegime: event.target.value as FiscalProfileDraft["vatRegime"],
              })
            }
          >
            <option value="UNKNOWN">No lo sé todavía</option>
            <option value="GENERAL">Régimen general</option>
            <option value="PRORATA">Prorrata o derecho parcial</option>
            <option value="EXEMPT">Actividad exenta</option>
          </Select>
        </Field>

        <Field
          label="Derecho general a deducir IVA"
          hint="El régimen general por sí solo no demuestra un derecho pleno."
        >
          <Select
            value={draft.vatDeductionRight}
            onChange={(event) =>
              onChange({
                ...draft,
                vatDeductionRight:
                  event.target.value as FiscalProfileDraft["vatDeductionRight"],
              })
            }
          >
            <option value="UNKNOWN">No lo sé todavía</option>
            <option value="FULL">Pleno</option>
            <option value="PARTIAL">Parcial</option>
            <option value="NONE">Sin derecho</option>
          </Select>
        </Field>
      </div>

      <fieldset className="space-y-3">
        <legend className="text-sm font-semibold text-slate-700">
          Actividades económicas e IAE
        </legend>
        <p className="text-xs leading-5 text-slate-500">
          Puedes guardar varias actividades. Para cada gasto se utilizará la que
          corresponda.
        </p>
        {activities.map((activity, index) => (
          <div
            key={`${index}-${activity.code ?? "activity"}`}
            className="grid gap-3 rounded-xl border border-slate-200 p-3 sm:grid-cols-[9rem_1fr_auto]"
          >
            <Input
              aria-label={`Epígrafe IAE ${index + 1}`}
              value={activity.code ?? ""}
              onChange={(event) => updateActivity(index, { code: event.target.value })}
              placeholder="IAE"
              maxLength={40}
            />
            <Input
              aria-label={`Descripción de actividad ${index + 1}`}
              value={activity.description}
              onChange={(event) =>
                updateActivity(index, { description: event.target.value })
              }
              placeholder="Ej.: consultoría de software"
              maxLength={240}
            />
            <Button
              type="button"
              variant="ghost"
              aria-label={`Eliminar actividad ${index + 1}`}
              disabled={activities.length === 1}
              onClick={() =>
                onChange({
                  ...draft,
                  activities: activities.filter((_, activityIndex) => activityIndex !== index),
                })
              }
              className="min-h-12 px-3"
            >
              <Trash2 className="h-5 w-5" aria-hidden="true" />
            </Button>
          </div>
        ))}
        <Button
          type="button"
          variant="secondary"
          onClick={() =>
            onChange({
              ...draft,
              activities: [...activities, { description: "" }],
            })
          }
        >
          <Plus className="h-5 w-5" aria-hidden="true" />
          Añadir actividad
        </Button>
      </fieldset>
    </div>
  );
}

export function FiscalProfileSetupCard({
  businessProfile,
  onSave,
}: FiscalProfileSetupCardProps) {
  const savedProfile = businessProfile.fiscalProfile;
  const [mode, setMode] = useState<SetupMode>(
    savedProfile ? "SUMMARY" : "CHOICE",
  );
  const suggestedTaxpayer = useMemo(
    () => inferTaxpayerTypeFromSpanishTaxId(businessProfile.nif),
    [businessProfile.nif],
  );
  const [draft, setDraft] = useState<FiscalProfileDraft>(() => {
    const initial = fiscalProfileToDraft(savedProfile);
    return initial.taxpayerType === "UNKNOWN" && suggestedTaxpayer
      ? { ...initial, taxpayerType: suggestedTaxpayer }
      : initial;
  });
  const [candidate, setCandidate] = useState<CensusCertificateCandidate | null>(
    null,
  );
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [csvVerified, setCsvVerified] = useState(false);
  const identity = candidate
    ? reconcileCensusIdentity(businessProfile.nif, candidate.detectedNif)
    : null;

  useEffect(() => {
    if (savedProfile && mode === "CHOICE") setMode("SUMMARY");
  }, [mode, savedProfile]);

  function openManual() {
    const next = fiscalProfileToDraft(savedProfile);
    setDraft(
      next.taxpayerType === "UNKNOWN" && suggestedTaxpayer
        ? { ...next, taxpayerType: suggestedTaxpayer }
        : next,
    );
    setError(null);
    setMode("MANUAL");
  }

  async function selectCensusFile(file: File | null) {
    if (!file) return;
    setParsing(true);
    setError(null);
    setCandidate(null);
    setCsvVerified(false);
    try {
      const text = await readCensusDocumentText(file);
      const parsed = parseCensusCertificateText(text);
      setCandidate(parsed);
      setDraft({
        taxpayerType: parsed.taxpayerType,
        jurisdiction: parsed.jurisdiction,
        directTaxRegime: parsed.directTaxRegime,
        vatRegime: parsed.vatRegime,
        vatDeductionRight: parsed.vatDeductionRight,
        activities: parsed.activities,
      });
      setMode("IMPORT_REVIEW");
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "No se ha podido leer el documento censal.",
      );
    } finally {
      setParsing(false);
    }
  }

  function saveManual() {
    onSave(createManualFiscalProfile(draft, new Date().toISOString()));
    setMode("SUMMARY");
    setError(null);
  }

  function saveImported() {
    if (
      !candidate ||
      candidate.documentKind === "UNKNOWN" ||
      identity?.status !== "MATCHED"
    ) {
      return;
    }
    onSave(
      createImportedFiscalProfile(
        { ...candidate, ...draft },
        new Date().toISOString(),
        "MATCHED",
        { csvVerifiedByUser: csvVerified },
      ),
    );
    setCandidate(null);
    setMode("SUMMARY");
    setError(null);
  }

  if (mode === "SUMMARY") {
    if (!savedProfile || savedProfile.setupStatus === "SKIPPED") {
      return (
        <Card className="border-amber-200 bg-amber-50/50">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="flex items-center gap-2 text-lg font-bold text-slate-950">
                <AlertTriangle className="h-5 w-5 text-amber-600" aria-hidden="true" />
                Perfil fiscal sin completar
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-700">
                Puedes analizar igualmente. Si falta un dato relevante, el motor lo
                marcará como pendiente; nunca lo interpretará automáticamente como
                “no deducible”.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="secondary" onClick={() => setMode("IMPORT")}>
                <FileUp className="h-5 w-5" aria-hidden="true" />
                Importar
              </Button>
              <Button type="button" onClick={openManual}>
                <Pencil className="h-5 w-5" aria-hidden="true" />
                Completar
              </Button>
            </div>
          </div>
        </Card>
      );
    }

    const missing = fiscalProfileMissingLabels(savedProfile);
    const profileWarnings = buildTaxContextFromBusinessProfile(
      businessProfile,
      new Date().getFullYear(),
    ).warnings;
    return (
      <Card className="border-blue-200 bg-blue-50/40">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h2 className="flex items-center gap-2 text-lg font-bold text-slate-950">
              <ShieldCheck className="h-5 w-5 text-blue-700" aria-hidden="true" />
              Datos fiscales reutilizados
            </h2>
            <p className="mt-2 text-sm text-slate-700">
              {taxpayerLabel(savedProfile.taxpayerType)} ·{" "}
              {jurisdictionLabel(savedProfile.jurisdiction)}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Fuente: {sourceLabel(savedProfile)}
            </p>
            {savedProfile.activities.length > 0 ? (
              <ul className="mt-3 space-y-1 text-sm text-slate-700">
                {savedProfile.activities.map((activity, index) => (
                  <li key={`${activity.code ?? "activity"}-${index}`}>
                    {activity.code ? `${activity.code} · ` : ""}
                    {activity.description || "Actividad sin descripción"}
                  </li>
                ))}
              </ul>
            ) : null}
            {missing.length > 0 ? (
              <p className="mt-3 text-sm font-semibold text-amber-800">
                Pendiente: {missing.join(", ")}.
              </p>
            ) : profileWarnings.length === 0 ? (
              <p className="mt-3 flex items-center gap-2 text-sm font-semibold text-emerald-700">
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                Contexto fiscal listo para reutilizar.
              </p>
            ) : null}
            {profileWarnings.length > 0 ? (
              <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                {profileWarnings.map((warning) => (
                  <p key={warning}>{warning}</p>
                ))}
              </div>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" onClick={() => setMode("IMPORT")}>
              <FileUp className="h-5 w-5" aria-hidden="true" />
              Importar otro
            </Button>
            <Button type="button" onClick={openManual}>
              <Pencil className="h-5 w-5" aria-hidden="true" />
              Editar
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  if (mode === "CHOICE") {
    return (
      <Card className="border-blue-200">
        <h2 className="text-xl font-bold text-slate-950">
          Ajusta el análisis a tu situación fiscal
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-700">
          Estos datos se piden aquí porque sirven para elegir las reglas correctas.
          Solo tendrás que confirmarlos una vez y podrás cambiarlos después.
        </p>
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <Button type="button" fullWidth onClick={() => setMode("IMPORT")}>
            <FileUp className="h-5 w-5" aria-hidden="true" />
            Importar certificado censal
          </Button>
          <Button type="button" fullWidth variant="secondary" onClick={openManual}>
            <Pencil className="h-5 w-5" aria-hidden="true" />
            Rellenar manualmente
          </Button>
          <Button
            type="button"
            fullWidth
            variant="ghost"
            onClick={() => {
              onSave(createSkippedFiscalProfile(new Date().toISOString()));
              setMode("SUMMARY");
            }}
          >
            Continuar sin completar
          </Button>
        </div>
        <p className="mt-4 text-xs leading-5 text-slate-500">
          El NIF guardado solo se utilizará para comprobar que el documento pertenece
          a esta empresa y para sugerir el tipo aparente de contribuyente. No se envía
          a la IA ni permite averiguar automáticamente la actividad.
        </p>
      </Card>
    );
  }

  return (
    <Card>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-950">
            {mode === "MANUAL"
              ? "Completar datos fiscales"
              : mode === "IMPORT_REVIEW"
                ? "Revisar datos detectados"
                : "Importar documento censal"}
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-700">
            {mode === "IMPORT" || mode === "IMPORT_REVIEW"
              ? "El PDF se lee localmente en este navegador. No se guarda el archivo, no se conserva su texto y no se envía a la IA."
              : "Puedes guardar un perfil parcial. Los datos desconocidos se pedirán solo cuando sean necesarios."}
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          onClick={() => {
            setError(null);
            setMode(savedProfile ? "SUMMARY" : "CHOICE");
          }}
        >
          Cancelar
        </Button>
      </div>

      {mode === "IMPORT" ? (
        <div className="mt-5 space-y-4">
          <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-blue-200 bg-blue-50 px-5 py-8 text-center hover:bg-blue-100/60">
            {parsing ? (
              <Loader2 className="h-8 w-8 animate-spin text-blue-700" aria-hidden="true" />
            ) : (
              <FileCheck2 className="h-8 w-8 text-blue-700" aria-hidden="true" />
            )}
            <span className="mt-3 font-bold text-slate-950">
              {parsing ? "Leyendo documento…" : "Seleccionar PDF de la AEAT"}
            </span>
            <span className="mt-1 text-xs text-slate-500">
              Certificado de situación censal o modelo 036 · máximo 4 MB
            </span>
            <input
              className="sr-only"
              type="file"
              accept="application/pdf,.pdf"
              disabled={parsing}
              onChange={(event) => void selectCensusFile(event.target.files?.[0] ?? null)}
            />
          </label>
          <p className="text-xs leading-5 text-slate-500">
            Si el PDF es una imagen escaneada sin texto, utiliza la opción manual. No
            activamos OCR externo automáticamente con documentación fiscal.
          </p>
        </div>
      ) : null}

      {mode === "MANUAL" || mode === "IMPORT_REVIEW" ? (
        <div className="mt-6 space-y-5">
          {mode === "IMPORT_REVIEW" && candidate && identity ? (
            <div
              role={identity.status === "MISMATCH" ? "alert" : undefined}
              className={`rounded-xl border p-4 text-sm leading-6 ${
                identity.status === "MATCHED"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                  : "border-red-200 bg-red-50 text-red-900"
              }`}
            >
              <p className="font-bold">{identity.message}</p>
              {candidate.warnings.map((warning) => (
                <p key={warning}>{warning}</p>
              ))}
              {candidate.documentKind === "UNKNOWN" ? (
                <p className="font-bold">
                  No puedes guardar este archivo como documento de la AEAT. Usa
                  “Completar manualmente” si quieres conservar los datos revisados.
                </p>
              ) : null}
            </div>
          ) : null}

          <FiscalProfileFields draft={draft} onChange={setDraft} />

          {mode === "IMPORT_REVIEW" && candidate?.csv ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700">
              <p className="font-bold text-slate-950">CSV detectado</p>
              <p className="mt-1 break-all font-mono text-xs">{candidate.csv}</p>
              <a
                href={AEAT_CSV_CHECK_URL}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-flex items-center gap-1 font-semibold text-blue-700 underline"
              >
                Cotejar en la Sede de la AEAT
                <ExternalLink className="h-4 w-4" aria-hidden="true" />
              </a>
              <p className="mt-2 text-xs text-amber-800">
                El CSV permite acceder al documento: no lo compartas con terceros.
              </p>
              <label className="mt-3 flex items-start gap-2">
                <input
                  type="checkbox"
                  checked={csvVerified}
                  onChange={(event) => setCsvVerified(event.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-slate-300"
                />
                <span>He comprobado el CSV en la Sede de la AEAT.</span>
              </label>
            </div>
          ) : null}

          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              onClick={mode === "MANUAL" ? saveManual : saveImported}
              disabled={
                mode === "IMPORT_REVIEW" &&
                (identity?.status !== "MATCHED" ||
                  candidate?.documentKind === "UNKNOWN")
              }
            >
              <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
              Confirmar y guardar
            </Button>
            {mode === "IMPORT_REVIEW" ? (
              <Button type="button" variant="secondary" onClick={openManual}>
                Completar manualmente
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}

      {error ? (
        <div
          role="alert"
          className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-800"
        >
          {error}
        </div>
      ) : null}
    </Card>
  );
}
