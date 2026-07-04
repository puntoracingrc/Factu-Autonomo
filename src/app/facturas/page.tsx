"use client";

import { FilePlus } from "lucide-react";
import { PageHeader } from "@/components/ui/Card";
import { PageCreateButton } from "@/components/ui/PageCreateButton";
import { DocumentList } from "@/components/documents/DocumentList";

export default function FacturasPage() {
  return (
    <div>
      <PageHeader title="Facturas" />
      <PageCreateButton
        href="/facturas/nuevo"
        icon={FilePlus}
        label="Nueva factura"
      />
      <DocumentList
        type="factura"
        basePath="/facturas"
      />
    </div>
  );
}
