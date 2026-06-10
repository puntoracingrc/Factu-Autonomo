"use client";

import { ButtonLink } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/Card";
import { DocumentList } from "@/components/documents/DocumentList";

export default function FacturasPage() {
  return (
    <div>
      <PageHeader
        title="Facturas"
        subtitle="Crea, envía y descarga facturas en PDF"
        action={
          <ButtonLink href="/facturas/nuevo">+ Nueva factura</ButtonLink>
        }
      />
      <DocumentList
        type="factura"
        basePath="/facturas"
        emptyMessage="Aún no tienes facturas. Pulsa el botón de arriba para crear la primera."
      />
    </div>
  );
}
