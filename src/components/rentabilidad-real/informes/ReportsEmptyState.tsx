"use client";

import { ButtonLink } from "@/components/ui/Button";

export function ReportsEmptyState({
  hasDocuments,
}: {
  hasDocuments: boolean;
}) {
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/60 dark:bg-amber-950/35">
      <p className="text-sm font-black text-amber-900 dark:text-amber-100">
        {hasDocuments
          ? "Hay documentos, pero los filtros actuales no generan filas de informe."
          : "Aún no hay documentos suficientes para generar informes."}
      </p>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <ButtonLink href="/facturas/nuevo" variant="secondary">
          Crear factura
        </ButtonLink>
        <ButtonLink href="/presupuestos/nuevo" variant="secondary">
          Crear presupuesto
        </ButtonLink>
      </div>
    </div>
  );
}
