import Link from "next/link";
import { FileText, Wallet } from "lucide-react";
import { newDocumentUrl } from "@/lib/customer-document-links";

interface CustomerDocumentActionsProps {
  customerId: string;
}

const actionClass =
  "inline-flex min-w-[4.75rem] flex-col items-center gap-1 rounded-xl px-2 py-2 transition-colors";

export function CustomerDocumentActions({
  customerId,
}: CustomerDocumentActionsProps) {
  return (
    <>
      <Link
        href={newDocumentUrl("factura", customerId)}
        className={`${actionClass} bg-blue-50 text-blue-700 hover:bg-blue-100`}
        title="Crear factura para este cliente"
      >
        <FileText className="h-5 w-5" aria-hidden />
        <span className="text-[11px] font-bold leading-none">Factura</span>
      </Link>
      <Link
        href={newDocumentUrl("presupuesto", customerId)}
        className={`${actionClass} bg-indigo-50 text-indigo-700 hover:bg-indigo-100`}
        title="Crear presupuesto para este cliente"
      >
        <Wallet className="h-5 w-5" aria-hidden />
        <span className="text-[11px] font-bold leading-none">Presup.</span>
      </Link>
    </>
  );
}
