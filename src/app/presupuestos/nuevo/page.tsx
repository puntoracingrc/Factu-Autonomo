"use client";

import { useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/ui/Card";
import { DocumentForm } from "@/components/forms/DocumentForm";
import { CUSTOMER_QUERY_PARAM } from "@/lib/customer-document-links";

export default function NuevoPresupuestoPage() {
  const searchParams = useSearchParams();
  const initialCustomerId = searchParams.get(CUSTOMER_QUERY_PARAM);

  return (
    <div>
      <PageHeader title="Nuevo presupuesto" />
      <DocumentForm type="presupuesto" initialCustomerId={initialCustomerId} />
    </div>
  );
}
