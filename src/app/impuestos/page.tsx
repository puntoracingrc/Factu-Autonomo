"use client";

import { PageHeader } from "@/components/ui/Card";
import { FiscalSummaryPanel } from "@/components/dashboard/FiscalSummaryPanel";
import { useFactuFeatureVisit } from "@/hooks/useFactuFeatureVisit";
import { useAppStore } from "@/context/AppStore";

export default function ImpuestosPage() {
  useFactuFeatureVisit("impuestos");
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
