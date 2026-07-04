"use client";

import { useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/ui/Card";
import { DocumentForm } from "@/components/forms/DocumentForm";
import { CUSTOMER_QUERY_PARAM } from "@/lib/customer-document-links";

export default function NuevoReciboPage() {
  const searchParams = useSearchParams();
  const initialCustomerId = searchParams.get(CUSTOMER_QUERY_PARAM);

  return (
    <div>
      <PageHeader title="Nuevo recibo" />
      <DocumentForm type="recibo" initialCustomerId={initialCustomerId} />
    </div>
  );
}
