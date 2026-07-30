"use client";

import { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { DocumentTemplateDesignerCard } from "@/components/settings/DocumentTemplateDesignerCard";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card, PageHeader } from "@/components/ui/Card";
import { ManualHelpLink } from "@/components/manual/ManualHelpLink";
import { useAppStore } from "@/context/AppStore";
import { useBilling } from "@/context/BillingContext";
import { useCentralProfileMutation } from "@/hooks/useCentralProfileMutation";
import { normalizeDocumentTemplate } from "@/lib/document-templates";
import type { DocumentTemplateSettings } from "@/lib/types";

export default function PlantillasPage() {
  const { data } = useAppStore();
  const { updateProfile } = useCentralProfileMutation();
  const { billingEnabled, limits } = useBilling();
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [template, setTemplate] = useState(() =>
    normalizeDocumentTemplate(data.profile.documentTemplate),
  );
  const editRevisionRef = useRef(0);
  const unconfirmedDraftRef = useRef(false);

  useEffect(() => {
    if (unconfirmedDraftRef.current) return;
    setTemplate(normalizeDocumentTemplate(data.profile.documentTemplate));
  }, [data.profile.documentTemplate]);

  useEffect(() => {
    if (!saved) return;
    const timer = window.setTimeout(() => setSaved(false), 2500);
    return () => window.clearTimeout(timer);
  }, [saved]);

  async function persistTemplate(nextTemplate: DocumentTemplateSettings) {
    const normalized = normalizeDocumentTemplate(nextTemplate);
    const revision = editRevisionRef.current + 1;
    editRevisionRef.current = revision;
    unconfirmedDraftRef.current = true;
    setSaved(false);
    setSaving(true);
    setSaveError(null);

    const result = await updateProfile((profile) => ({
      ...profile,
      documentTemplate: normalized,
    }));
    if (revision !== editRevisionRef.current) return;

    setSaving(false);
    if (!result.ok) {
      setSaveError(result.error);
      return;
    }

    unconfirmedDraftRef.current = false;
    setTemplate(normalizeDocumentTemplate(result.value.documentTemplate));
    setSaved(true);
  }

  function handleTemplateChange(nextTemplate: DocumentTemplateSettings) {
    const normalized = normalizeDocumentTemplate(nextTemplate);
    setTemplate(normalized);
    void persistTemplate(normalized);
  }

  return (
    <div>
      <PageHeader
        title="Diseñador de formularios"
        subtitle="Plantillas visuales para facturas, presupuestos y recibos"
        action={
          <ButtonLink href="/configuracion" variant="secondary">
            <ArrowLeft className="h-4 w-4" />
            Volver a ajustes
          </ButtonLink>
        }
      />

      <ManualHelpLink />

      <Card className="mb-6 border-blue-200 bg-blue-50 text-sm text-blue-900">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="leading-relaxed">
            Los cambios se guardan automáticamente y se aplican al descargar
            documentos nuevos o existentes con el formato actual.
          </p>
          {saving ? (
            <span className="inline-flex items-center gap-2 text-sm font-semibold text-blue-700">
              <Loader2 className="h-4 w-4 animate-spin" />
              Guardando
            </span>
          ) : saved ? (
            <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-sm font-semibold text-emerald-700">
              <CheckCircle2 className="h-4 w-4" />
              Guardado
            </span>
          ) : null}
        </div>
        {saveError ? (
          <div
            role="alert"
            className="mt-3 flex flex-col gap-3 border-t border-red-200 pt-3 text-red-800 sm:flex-row sm:items-center sm:justify-between"
          >
            <span className="inline-flex items-start gap-2 text-sm">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              No se pudo confirmar el guardado: {saveError}
            </span>
            <Button
              type="button"
              variant="secondary"
              disabled={saving}
              onClick={() => void persistTemplate(template)}
            >
              Reintentar
            </Button>
          </div>
        ) : null}
      </Card>

      <DocumentTemplateDesignerCard
        settings={template}
        locked={billingEnabled && !limits.documentTemplateDesigner}
        onChange={handleTemplateChange}
      />
    </div>
  );
}
