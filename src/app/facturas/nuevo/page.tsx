"use client";

import { PageHeader } from "@/components/ui/Card";
import { DocumentForm } from "@/components/forms/DocumentForm";

export default function NuevaFacturaPage() {
  return (
    <div>
      <PageHeader
        title="Nueva factura"
        subtitle="Rellena los datos paso a paso"
      />
      <DocumentForm type="factura" />
    </div>
  );
}
