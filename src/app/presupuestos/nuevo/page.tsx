"use client";

import { PageHeader } from "@/components/ui/Card";
import { DocumentForm } from "@/components/forms/DocumentForm";

export default function NuevoPresupuestoPage() {
  return (
    <div>
      <PageHeader title="Nuevo presupuesto" subtitle="Oferta para tu cliente" />
      <DocumentForm type="presupuesto" />
    </div>
  );
}
