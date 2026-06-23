import { FactuManualLogo } from "@/components/manual/FactuManualLogo";
import { ManualPageHeader } from "@/components/manual/ManualPageHeader";
import { ManualReturnBar } from "@/components/manual/ManualReturnBar";
import { ManualSearch } from "@/components/manual/ManualSearch";
import { Card } from "@/components/ui/Card";
import { manualSections } from "@/lib/manual/sections";
import { sanitizeReturnPath } from "@/lib/manual/return-url";

interface AyudaPageProps {
  searchParams: Promise<{ from?: string }>;
}

export default async function AyudaPage({ searchParams }: AyudaPageProps) {
  const returnTo = sanitizeReturnPath((await searchParams).from);

  return (
    <div>
      {returnTo && <ManualReturnBar returnTo={returnTo} showManualIndexLink={false} />}

      <ManualPageHeader
        title="Manual de usuario"
        subtitle="Guía paso a paso de Factura Autónomo, sección por sección"
      />

      <Card className="mb-6 border-violet-200 bg-violet-50/60">
        <div className="flex gap-3">
          <FactuManualLogo size="sm" />
          <div className="text-sm text-violet-950">
            <p className="font-semibold">Cómo usar este manual</p>
            <p className="mt-1 leading-relaxed text-violet-900/90">
              Empieza por <strong>Primeros pasos</strong> si es tu primera vez.
              Cada sección tiene pasos numerados y capturas de pantalla.
            </p>
          </div>
        </div>
      </Card>

      <ManualSearch sections={manualSections} returnTo={returnTo} />
    </div>
  );
}
