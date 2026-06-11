import Link from "next/link";
import { ArrowLeft, ChevronLeft } from "lucide-react";
import { buildManualHref, returnPathLabel } from "@/lib/manual/return-url";

interface ManualReturnBarProps {
  returnTo: string;
  showManualIndexLink?: boolean;
}

export function ManualReturnBar({
  returnTo,
  showManualIndexLink = true,
}: ManualReturnBarProps) {
  const label = returnPathLabel(returnTo);

  return (
    <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <Link
        href={returnTo}
        className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver a {label}
      </Link>
      {showManualIndexLink && (
        <Link
          href={buildManualHref("/ayuda", returnTo)}
          className="inline-flex items-center gap-1 text-sm font-semibold text-blue-600 underline"
        >
          <ChevronLeft className="h-4 w-4" />
          Índice del manual
        </Link>
      )}
    </div>
  );
}
