"use client";

import { Receipt } from "lucide-react";
import { PageHeader } from "@/components/ui/Card";
import { PageCreateButton } from "@/components/ui/PageCreateButton";
import { DocumentList } from "@/components/documents/DocumentList";

export default function RecibosPage() {
  return (
    <div>
      <PageHeader
        title="Recibos"
        subtitle="Crea recibos y envíalos por email o WhatsApp"
      />
      <PageCreateButton
        href="/recibos/nuevo"
        icon={Receipt}
        label="Nuevo recibo"
      />
      <DocumentList
        type="recibo"
        basePath="/recibos"
      />
    </div>
  );
}
