"use client";

import { ClipboardPlus } from "lucide-react";
import { PageHeader } from "@/components/ui/Card";
import { PageCreateButton } from "@/components/ui/PageCreateButton";
import { DocumentList } from "@/components/documents/DocumentList";

export default function PresupuestosPage() {
  return (
    <div>
      <PageHeader
        title="Presupuestos"
        subtitle="Crea presupuestos y envíalos por email o WhatsApp"
      />
      <PageCreateButton
        href="/presupuestos/nuevo"
        icon={ClipboardPlus}
        label="Nuevo presupuesto"
      />
      <DocumentList
        type="presupuesto"
        basePath="/presupuestos"
      />
    </div>
  );
}
