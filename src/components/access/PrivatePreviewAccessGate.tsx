"use client";

import { useEffect } from "react";
import { LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCloudSync } from "@/context/CloudSyncContext";
import { hasPrivatePreviewAccess } from "@/lib/private-preview-access";

export function PrivatePreviewAccessGate({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const router = useRouter();
  const { authReady, user } = useCloudSync();
  const allowed = authReady && hasPrivatePreviewAccess(user?.email);

  useEffect(() => {
    if (authReady && !allowed) router.replace("/");
  }, [allowed, authReady, router]);

  if (!allowed) {
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
        {authReady ? "Volviendo al panel..." : "Comprobando acceso..."}
      </div>
    );
  }

  return children;
}
