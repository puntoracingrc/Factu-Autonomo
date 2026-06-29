"use client";

import { Suspense } from "react";
import dynamic from "next/dynamic";
import {
  Cloud,
  CreditCard,
  HardDrive,
  Scale,
  Shield,
  Upload,
  type LucideIcon,
} from "lucide-react";
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
  { href: "#inicio-sesion", label: "Cuenta y nube", Icon: Cloud },
  { href: "#plan-cuenta", label: "Plan", Icon: CreditCard },
  { href: "#drive-backup", label: "Drive", Icon: HardDrive },
  { href: "#importar-datos", label: "Importar", Icon: Upload },
  { href: "#datos-privacidad", label: "Tus datos", Icon: Shield },
  { href: "#legal-privacidad", label: "Legal", Icon: Scale },
];

function AccountQuickLinks() {
  return (
    <nav aria-label="Opciones de cuenta" className="mb-5 flex flex-wrap gap-2">
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

export default function CuentaPage() {
  return (
    <div>
      <PageHeader
        title="Cuenta"
        subtitle="Inicia sesión, sincroniza tus dispositivos y guarda una copia de seguridad."
      />

      <AccountQuickLinks />

      <Suspense
        fallback={
          <p className="mb-6 text-sm text-slate-500">Cargando cuenta…</p>
        }
      >
        <CloudAccountCard />
      </Suspense>

      <section id="plan-cuenta" className="scroll-mt-24">
        <PlanStatusCard />
        <SubscriptionBillingCard />
        <Suspense fallback={null}>
          <ReferralCard />
        </Suspense>
      </section>

      <GoogleDriveBackupCard />

      <section id="importar-datos" className="scroll-mt-24">
        <Card className="mb-6 space-y-3">
          <h2 className="text-lg font-bold text-slate-900">Importar datos</h2>
          <p className="text-sm text-slate-600">
            Trae clientes, presupuestos, facturas y datos de empresa desde
            archivos compatibles. Revisa una previsualización antes de aplicar la
            importación.
          </p>
          <ButtonLink href="/importar" variant="secondary">
            Abrir importador
          </ButtonLink>
        </Card>
      </section>

      <div id="datos-privacidad" className="scroll-mt-24">
        <DataOwnershipCard />
      </div>

      <div id="legal-privacidad" className="scroll-mt-24">
        <LegalLinksCard />
      </div>
    </div>
  );
}
