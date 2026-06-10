"use client";

import { ButtonLink } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/Card";
import { DocumentList } from "@/components/documents/DocumentList";

export default function PresupuestosPage() {
  return (
    <div>
      <PageHeader
        title="Presupuestos"
        subtitle="Crea presupuestos y envíalos por email o WhatsApp"
        action={
          <ButtonLink href="/presupuestos/nuevo">+ Nuevo presupuesto</ButtonLink>
        }
      />
      <DocumentList
        type="presupuesto"
        basePath="/presupuestos"
      />
    </div>
  );
}
