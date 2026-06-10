"use client";

import { ButtonLink } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/Card";
import { DocumentList } from "@/components/documents/DocumentList";

export default function RecibosPage() {
  return (
    <div>
      <PageHeader
        title="Recibos"
        subtitle="Crea recibos y envíalos por email o WhatsApp"
        action={<ButtonLink href="/recibos/nuevo">+ Nuevo recibo</ButtonLink>}
      />
      <DocumentList
        type="recibo"
        basePath="/recibos"
      />
    </div>
  );
}
