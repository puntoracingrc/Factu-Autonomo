"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { DocumentTemplateDesignerCard } from "@/components/settings/DocumentTemplateDesignerCard";
import { ButtonLink } from "@/components/ui/Button";
import { Card, PageHeader } from "@/components/ui/Card";
import { ManualHelpLink } from "@/components/manual/ManualHelpLink";
import { useAppStore } from "@/context/AppStore";
import { useBilling } from "@/context/BillingContext";
import { normalizeDocumentTemplate } from "@/lib/document-templates";
import type { DocumentTemplateSettings } from "@/lib/types";

export default function PlantillasPage() {
  const { data, updateProfile } = useAppStore();
  const { billingEnabled, limits } = useBilling();
  const [saved, setSaved] = useState(false);
  const template = normalizeDocumentTemplate(data.profile.documentTemplate);

  useEffect(() => {
    if (!saved) return;
    const timer = window.setTimeout(() => setSaved(false), 2500);
    return () => window.clearTimeout(timer);
  }, [saved]);

  function handleTemplateChange(nextTemplate: DocumentTemplateSettings) {
    updateProfile({
      ...data.profile,
      documentTemplate: normalizeDocumentTemplate(nextTemplate),
    });
    setSaved(true);
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
          {saved ? (
            <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-sm font-semibold text-emerald-700">
              <CheckCircle2 className="h-4 w-4" />
              Guardado
            </span>
          ) : null}
        </div>
      </Card>

      <DocumentTemplateDesignerCard
        settings={template}
        locked={billingEnabled && !limits.documentTemplateDesigner}
        onChange={handleTemplateChange}
      />
    </div>
  );
}
