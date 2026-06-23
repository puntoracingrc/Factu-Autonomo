"use client";

import { Suspense } from "react";
import { CloudAccountCard } from "@/components/cloud/CloudAccountCard";
import { ManualHelpLink } from "@/components/manual/ManualHelpLink";
import { DataOwnershipCard } from "@/components/settings/DataOwnershipCard";
import { ButtonLink } from "@/components/ui/Button";
import { Card, PageHeader } from "@/components/ui/Card";

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

      <Card className="mb-6 space-y-3">
        <h2 className="text-lg font-bold text-slate-900">Importar programa antiguo</h2>
        <p className="text-sm text-slate-600">
          Trae clientes, presupuestos, facturas y datos de empresa desde una
          copia MDB de PC Facturación 3.0.
        </p>
        <ButtonLink href="/importar" variant="secondary">
          Importar MDB
        </ButtonLink>
      </Card>

      <DataOwnershipCard />
    </div>
  );
}
