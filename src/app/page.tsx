"use client";

import {
  FileText,
  Receipt,
  ShoppingCart,
  Users,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { FactuDailyGreeting } from "@/components/factu/FactuDailyGreeting";
import { TaxDeadlineBanner } from "@/components/billing/TaxDeadlineBanner";
import { RecurringDueBanner } from "@/components/expenses/RecurringDueBanner";
import { UsageBanner } from "@/components/billing/UsageBanner";
import { FiscalSummaryTeaser } from "@/components/dashboard/FiscalSummaryTeaser";
import { HomeGlobalSummary } from "@/components/dashboard/HomeGlobalSummary";
import { ButtonLink } from "@/components/ui/Button";
import { Card, PageHeader } from "@/components/ui/Card";
import { useAppStore } from "@/context/AppStore";

const quickActions = [
  {
    href: "/clientes",
    label: "Clientes",
    icon: Users,
    color: "bg-sky-600 text-white",
  },
  {
    href: "/facturas/nuevo",
    label: "Nueva factura",
    icon: FileText,
    color: "bg-blue-600 text-white",
  },
  {
    href: "/presupuestos/nuevo",
    label: "Nuevo presupuesto",
    icon: Wallet,
    color: "bg-indigo-500 text-white",
  },
  {
    href: "/recibos/nuevo",
    label: "Nuevo recibo",
    icon: Receipt,
    color: "bg-violet-500 text-white",
  },
  {
    href: "/gastos/nuevo",
    label: "Añadir gasto",
    icon: ShoppingCart,
    color: "bg-emerald-600 text-white",
  },
];

export default function HomePage() {
  const { data, ready } = useAppStore();
  const profileReady = Boolean(data.profile.name && data.profile.nif);

  if (!ready) {
    return <p className="text-center text-slate-500">Cargando...</p>;
  }

  return (
    <div>
      <FactuDailyGreeting enabled={ready} />
      <PageHeader
        title={`Hola${data.profile.name ? `, ${data.profile.name}` : ""}`}
        subtitle="Aquí tienes un resumen de tu negocio"
      />

      {!profileReady && (
        <Card className="mb-6 border-amber-200 bg-amber-50">
          <p className="font-semibold text-amber-900">
            Primero configura tus datos
          </p>
          <p className="mt-1 text-sm text-amber-800">
            Necesitamos tu nombre y NIF para ponerlos en las facturas.
          </p>
          <ButtonLink href="/configuracion" className="mt-4">
            Ir a configuración
          </ButtonLink>
        </Card>
      )}

      <UsageBanner />
      <TaxDeadlineBanner />
      <RecurringDueBanner data={data} />

      <FiscalSummaryTeaser data={data} />
      <HomeGlobalSummary data={data} />

      <h2 className="mb-3 text-lg font-bold text-slate-900">
        ¿Qué quieres hacer?
      </h2>
      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {quickActions.map(({ href, label, icon: Icon, color }) => (
          <Link
            key={href}
            href={href}
            className={`flex min-h-[5.25rem] flex-col items-center justify-center gap-2 rounded-2xl p-4 text-center font-semibold shadow-md transition-transform active:scale-[0.98] ${color}`}
          >
            <Icon className="h-6 w-6" />
            <span className="text-sm leading-tight">{label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
