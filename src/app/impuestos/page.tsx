"use client";

import { FiscalSummaryPanel } from "@/components/dashboard/FiscalSummaryPanel";
import { PageHeader } from "@/components/ui/Card";
import { useAppStore } from "@/context/AppStore";

export default function ImpuestosPage() {
  const { data, ready } = useAppStore();

  if (!ready) {
    return <p className="text-center text-slate-500">Cargando...</p>;
  }

  return (
    <div>
      <PageHeader
        title="Resumen fiscal"
        subtitle="IVA, IRPF y beneficio por trimestre, año o todo el historial. Cálculo orientativo — consulta con tu gestor."
      />
      <FiscalSummaryPanel data={data} />
    </div>
  );
}
