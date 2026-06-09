"use client";

import { PageHeader } from "@/components/ui/Card";
import { DocumentForm } from "@/components/forms/DocumentForm";

export default function NuevoReciboPage() {
  return (
    <div>
      <PageHeader title="Nuevo recibo" subtitle="Justificante de cobro" />
      <DocumentForm type="recibo" />
    </div>
  );
}
