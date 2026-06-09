"use client";

import { ButtonLink } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/Card";
import { DocumentList } from "@/components/documents/DocumentList";

export default function PresupuestosPage() {
  return (
    <div>
      <PageHeader
        title="Presupuestos"
        subtitle="Envía ofertas a tus clientes"
        action={
          <ButtonLink href="/presupuestos/nuevo">+ Nuevo presupuesto</ButtonLink>
        }
      />
      <DocumentList
        type="presupuesto"
        basePath="/presupuestos"
        emptyMessage="Sin presupuestos todavía. Crea uno para enviar a un cliente."
      />
    </div>
  );
}
