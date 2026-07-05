"use client";

import { Suspense, type ReactNode } from "react";
import dynamic from "next/dynamic";
import {
  Cloud,
  CreditCard,
  HardDrive,
  LogIn,
  RefreshCw,
  Scale,
  Upload,
  type LucideIcon,
} from "lucide-react";
import { AiUsageMeterCard } from "@/components/billing/AiUsageMeterCard";
import { PlanStatusCard } from "@/components/billing/PlanStatusCard";
import { SubscriptionBillingCard } from "@/components/billing/SubscriptionBillingCard";
import { CloudAccountCard } from "@/components/cloud/CloudAccountCard";
import { GoogleDriveBackupCard } from "@/components/cloud/GoogleDriveBackupCard";
import { LegalLinksCard } from "@/components/legal/LegalLinksCard";
import { DataOwnershipCard } from "@/components/settings/DataOwnershipCard";
import { ButtonLink } from "@/components/ui/Button";
import { Card, PageHeader } from "@/components/ui/Card";

const ReferralCard = dynamic(
  () =>
    import("@/components/referrals/ReferralCard").then((mod) => mod.ReferralCard),
  {
    ssr: false,
    loading: () => null,
  },
);

const ACCOUNT_NAV_ITEMS: Array<{
  href: string;
  label: string;
  Icon: LucideIcon;
}> = [
  { href: "#inicio-sesion", label: "Acceso", Icon: LogIn },
  { href: "#plan-cuenta", label: "Plan", Icon: CreditCard },
  { href: "#sincronizacion-cuenta", label: "Sincronización", Icon: RefreshCw },
  { href: "#copias-cuenta", label: "Copias", Icon: HardDrive },
  { href: "#importar-datos", label: "Importación", Icon: Upload },
  { href: "#legal-privacidad", label: "Legal", Icon: Scale },
];

function AccountQuickLinks() {
  return (
    <nav
      aria-label="Opciones de cuenta"
      className="mb-6 flex flex-wrap gap-2"
    >
      {ACCOUNT_NAV_ITEMS.map(({ href, label, Icon }) => (
        <a
          key={href}
          href={href}
          className="group inline-flex min-h-10 items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-bold text-slate-900 shadow-sm transition-colors hover:border-blue-200 hover:bg-blue-50/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
        >
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-700 group-hover:bg-blue-100 group-hover:text-blue-700">
            <Icon className="h-4 w-4" />
          </span>
          <span>{label}</span>
        </a>
      ))}
    </nav>
  );
}

function AccountSection({
  id,
  title,
  description,
  Icon,
  children,
}: {
  id: string;
  title: string;
  description: string;
  Icon: LucideIcon;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24">
      <div className="mb-3 flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <h2 className="text-xl font-black text-slate-950">{title}</h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            {description}
          </p>
        </div>
      </div>
      <div className="mb-8">{children}</div>
    </section>
  );
}

export default function CuentaPage() {
  return (
    <div>
      <PageHeader
        title="Cuenta"
        subtitle="Acceso, plan, sincronización, copias, importación y documentos legales."
      />

      <AccountQuickLinks />

      <AccountSection
        id="inicio-sesion"
        title="Acceso"
        description="Crea cuenta, inicia sesión, confirma el email y decide qué hacer con los datos locales."
        Icon={LogIn}
      >
        <Suspense
          fallback={
            <p className="mb-6 text-sm text-slate-500">Cargando cuenta…</p>
          }
        >
          <CloudAccountCard />
        </Suspense>
      </AccountSection>

      <AccountSection
        id="plan-cuenta"
        title="Plan"
        description="Consulta tu plan, límites de uso, facturación y ventajas de invitación."
        Icon={CreditCard}
      >
        <PlanStatusCard />
        <AiUsageMeterCard />
        <SubscriptionBillingCard />
        <Suspense fallback={null}>
          <ReferralCard />
        </Suspense>
      </AccountSection>

      <AccountSection
        id="sincronizacion-cuenta"
        title="Sincronización"
        description="La nube de Factu mantiene tus datos entre móvil y ordenador cuando tu cuenta está activa."
        Icon={RefreshCw}
      >
        <Card className="mb-6 space-y-3 border-sky-100 bg-sky-50/70">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-sky-700">
              <Cloud className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Nube de Factu
              </h3>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                Los controles de sesión, subida de datos locales y reparación de
                nube están en el bloque Acceso para mantener el flujo de entrada
                en un solo sitio.
              </p>
            </div>
          </div>
          <ButtonLink href="#inicio-sesion" variant="secondary">
            Ir a Acceso
          </ButtonLink>
        </Card>
      </AccountSection>

      <AccountSection
        id="copias-cuenta"
        title="Copias"
        description="Descarga una copia manual, restaura un JSON revisado o guarda una copia extra en Google Drive."
        Icon={HardDrive}
      >
        <GoogleDriveBackupCard />

        <div id="datos-privacidad" className="scroll-mt-24">
          <DataOwnershipCard />
        </div>
      </AccountSection>

      <AccountSection
        id="importar-datos"
        title="Importación"
        description="Trae datos desde otros programas con una previsualización antes de aplicar cambios."
        Icon={Upload}
      >
        <Card className="mb-6 space-y-3">
          <h3 className="text-lg font-bold text-slate-900">Importar datos</h3>
          <p className="text-sm text-slate-600">
            Trae clientes, presupuestos, facturas y datos de empresa desde
            archivos compatibles. Revisa una previsualización antes de aplicar la
            importación.
          </p>
          <ButtonLink href="/importar" variant="secondary">
            Abrir importador
          </ButtonLink>
        </Card>
      </AccountSection>

      <AccountSection
        id="legal-privacidad"
        title="Legal"
        description="Condiciones, privacidad, cookies, tratamiento de datos y notas sobre VeriFactu."
        Icon={Scale}
      >
        <LegalLinksCard />
      </AccountSection>
    </div>
  );
}
