import type { Metadata } from "next";
import {
  BadgeQuestionMark,
  FileText,
  MailCheck,
  MonitorPlay,
  Settings,
} from "lucide-react";
import { FactuManualLogo } from "@/components/manual/FactuManualLogo";
import { ManualPageHeader } from "@/components/manual/ManualPageHeader";
import { ManualReturnBar } from "@/components/manual/ManualReturnBar";
import { ManualSearch } from "@/components/manual/ManualSearch";
import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { APP_BRAND_NAME } from "@/lib/brand";
import { manualSections } from "@/lib/manual/sections";
import { sanitizeReturnPath } from "@/lib/manual/return-url";

export const metadata: Metadata = {
  title: "Ayuda",
  description:
    "Manual de Facturación Autónomos: demo, cuenta, email confirmado, facturas, clientes automáticos, gastos, nube y configuración.",
  alternates: {
    canonical: "/ayuda",
  },
  openGraph: {
    title: `Ayuda | ${APP_BRAND_NAME}`,
    description:
      "Guía paso a paso para empezar a facturar, registrar gastos y entender cada zona de la app.",
    url: "/ayuda",
  },
};

interface AyudaPageProps {
  searchParams: Promise<{ from?: string }>;
}

const QUICK_HELP = [
  {
    title: "Configurar el negocio",
    description:
      "Deja listos tus datos fiscales, logo, IVA e IRPF antes de emitir documentos.",
    href: "/ayuda/primeros-pasos",
    action: "Primeros pasos",
    Icon: Settings,
  },
  {
    title: "Crear la primera factura",
    description:
      "Puedes escribir los datos del cliente en la factura; si es nuevo, se guarda automáticamente.",
    href: "/ayuda/facturas",
    action: "Ver facturas",
    Icon: FileText,
  },
  {
    title: "Probar sin tocar datos reales",
    description:
      "La demo usa una empresa ficticia para ver el producto antes de crear cuenta.",
    href: "/demo",
    action: "Abrir demo",
    Icon: MonitorPlay,
  },
  {
    title: "Crear cuenta y confirmar email",
    description:
      "Alta gratis, correo de Factu, datos locales encontrados y primeros pasos reales.",
    href: "/ayuda/cuenta",
    action: "Ver cuenta",
    Icon: MailCheck,
  },
];

export default async function AyudaPage({ searchParams }: AyudaPageProps) {
  const returnTo = sanitizeReturnPath((await searchParams).from);

  return (
    <div>
      {returnTo && <ManualReturnBar returnTo={returnTo} showManualIndexLink={false} />}

      <ManualPageHeader
        title="Manual de usuario"
        subtitle={`Guía paso a paso de ${APP_BRAND_NAME}, sección por sección`}
      />

      <Card className="mb-6 border-violet-200 bg-violet-50/60">
        <div className="flex gap-3">
          <FactuManualLogo size="sm" />
          <div className="text-sm text-violet-950">
            <p className="font-semibold">Cómo usar este manual</p>
            <p className="mt-1 leading-relaxed text-violet-900/90">
              Empieza por <strong>Primeros pasos</strong> si es tu primera vez.
              Cada sección tiene pasos numerados y capturas de pantalla. Si
              vienes desde una pantalla concreta, puedes volver a ella desde la
              barra superior.
            </p>
          </div>
        </div>
      </Card>

      <section className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4" aria-label="Ayuda rápida">
        {QUICK_HELP.map(({ title, description, href, action, Icon }) => (
          <Card key={title} className="flex flex-col">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
              <Icon className="h-5 w-5" />
            </span>
            <h2 className="mt-4 text-base font-bold text-slate-950">
              {title}
            </h2>
            <p className="mt-2 flex-1 text-sm leading-6 text-slate-600">
              {description}
            </p>
            <ButtonLink href={href} variant="secondary" className="mt-4">
              {action}
            </ButtonLink>
          </Card>
        ))}
      </section>

      <Card className="mb-6 border-emerald-200 bg-emerald-50/60">
        <div className="flex gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-emerald-700 shadow-sm">
            <BadgeQuestionMark className="h-5 w-5" />
          </span>
          <div className="text-sm text-emerald-950">
            <p className="font-semibold">Duda típica al empezar</p>
            <p className="mt-1 leading-relaxed text-emerald-900/90">
              No tienes que crear un cliente antes de hacer una factura. Puedes
              rellenar sus datos en el documento y la ficha queda creada al
              guardar.
            </p>
          </div>
        </div>
      </Card>

      <ManualSearch sections={manualSections} returnTo={returnTo} />
    </div>
  );
}
