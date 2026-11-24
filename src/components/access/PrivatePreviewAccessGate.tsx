"use client";

import { useEffect } from "react";
import { LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { usePrivatePreviewAccess } from "@/hooks/usePrivatePreviewAccess";

export function PrivatePreviewAccessGate({
  children,
  taxSummary = false,
}: Readonly<{ children: React.ReactNode; taxSummary?: boolean }>) {
  const router = useRouter();
  const { access, authReady, taxAccessReady } = usePrivatePreviewAccess();
  const ready = taxSummary ? taxAccessReady : authReady;
  const allowed = access === "full" || (taxSummary && access === "tax-summary");

  useEffect(() => {
    if (ready && !allowed) router.replace("/");
  }, [allowed, ready, router]);

  if (!ready || !allowed) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="flex min-h-40 items-center justify-center gap-2 text-sm font-semibold text-slate-600"
      >
        <LoaderCircle
          className="h-4 w-4 motion-safe:animate-spin"
          aria-hidden="true"
        />
        {ready ? "Volviendo al panel..." : "Comprobando acceso..."}
      </div>
    );
  }

  return children;
}
