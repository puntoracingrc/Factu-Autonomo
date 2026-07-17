"use client";

import { useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/ui/Card";
import { DocumentForm } from "@/components/forms/DocumentForm";
import { CUSTOMER_QUERY_PARAM } from "@/lib/customer-document-links";
import { whatsappDocumentPrefillFromSearchParams } from "@/lib/whatsapp-document-prefill";

export default function NuevaFacturaPage() {
  const searchParams = useSearchParams();
  const initialCustomerId = searchParams.get(CUSTOMER_QUERY_PARAM);
  const initialPrefill = whatsappDocumentPrefillFromSearchParams(searchParams);

  return (
    <div>
      <PageHeader title="Nueva factura" />
      <DocumentForm
        type="factura"
        initialCustomerId={initialCustomerId}
        initialPrefill={initialPrefill}
      />
    </div>
  );
}
