"use client";

import { Suspense } from "react";
import { CloudAccountCard } from "@/components/cloud/CloudAccountCard";
import { ManualHelpLink } from "@/components/manual/ManualHelpLink";
import { DataOwnershipCard } from "@/components/settings/DataOwnershipCard";
import { PageHeader } from "@/components/ui/Card";

export default function CuentaPage() {
  return (
    <div>
      <PageHeader
        title="Cuenta"
        subtitle="Inicia sesión, sincroniza tus dispositivos y guarda una copia de seguridad."
      />

      <ManualHelpLink />

      <Suspense
        fallback={
          <p className="mb-6 text-sm text-slate-500">Cargando cuenta…</p>
        }
      >
        <CloudAccountCard />
      </Suspense>

      <DataOwnershipCard />
    </div>
  );
}
