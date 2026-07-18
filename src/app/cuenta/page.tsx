"use client";

import { Suspense, type ReactNode } from "react";
import {
  Cloud,
  CreditCard,
  Gift,
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
import { PromoCodeRedeemer } from "@/components/promotions/PromoCodeRedeemer";
import { DataOwnershipCard } from "@/components/settings/DataOwnershipCard";
import { ExpenseWorkAllocationRepairCard } from "@/components/settings/ExpenseWorkAllocationRepairCard";
import { AppIssuedDocumentRecoveryCard } from "@/components/settings/AppIssuedDocumentRecoveryCard";
import { ImportedLegacyDocumentRepairCard } from "@/components/settings/ImportedLegacyDocumentRepairCard";
import { TestDocumentRetirementCard } from "@/components/settings/TestDocumentRetirementCard";
import { ButtonLink } from "@/components/ui/Button";
import { Card, PageHeader } from "@/components/ui/Card";

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
    <nav aria-label="Opciones de cuenta" className="mb-6 flex flex-wrap gap-2">
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
          <p className="mt-1 text-sm leading-6 text-slate-600">{description}</p>
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
        description="Consulta tu plan, límites de uso y facturación."
        Icon={CreditCard}
      >
        <PlanStatusCard />
        <AiUsageMeterCard />
        <SubscriptionBillingCard />
        <PromoCodeRedeemer />
        <Card className="mb-6 flex flex-col gap-4 border-violet-200 bg-violet-50/60 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
              <Gift className="h-5 w-5" />
            </span>
            <div>
              <h3 className="font-bold text-slate-900">Afiliados</h3>
              <p className="mt-1 text-sm text-slate-600">
                Comparte tu enlace y consulta las ventajas conseguidas por tus invitaciones.
              </p>
            </div>
          </div>
          <ButtonLink href="/afiliados" variant="secondary">
            Abrir Afiliados
          </ButtonLink>
        </Card>
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
        <div id="reparacion-repartos-gastos" className="scroll-mt-24">
          <ExpenseWorkAllocationRepairCard />
        </div>
        <div id="mantenimiento-documentos-prueba" className="scroll-mt-24">
          <TestDocumentRetirementCard />
        </div>
        <div id="recuperacion-documentos-factu" className="scroll-mt-24">
          <AppIssuedDocumentRecoveryCard />
        </div>
      </AccountSection>

      <AccountSection
        id="importar-datos"
        title="Importación"
        description="Trae datos desde otros programas con una previsualización antes de aplicar cambios."
        Icon={Upload}
      >
        <ImportedLegacyDocumentRepairCard />
        <Card className="mb-6 space-y-3">
          <h3 className="text-lg font-bold text-slate-900">Importar datos</h3>
          <p className="text-sm text-slate-600">
            Trae clientes, presupuestos, facturas y datos de empresa desde
            archivos compatibles. Revisa una previsualización antes de aplicar
            la importación.
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
