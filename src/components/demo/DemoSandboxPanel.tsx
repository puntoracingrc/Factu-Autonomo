"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  FileText,
  FilePlus2,
  type LucideIcon,
  LogIn,
  RotateCcw,
  ShieldCheck,
  ShoppingCart,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useAppStore } from "@/context/AppStore";
import { useDemoWorkspaceMode } from "@/hooks/useDemoWorkspaceMode";
import {
  createDemoWorkspaceData,
  resetDemoWorkspaceData,
  setDemoWorkspaceMode,
} from "@/lib/demo-workspace";
import { documentDetailPath } from "@/lib/document-links";
import { loadData } from "@/lib/storage";

const demoTourSteps = [
  {
    label: "Mira una factura pendiente",
    description: "PDF, cobro pendiente y recordatorio sin enviar nada real.",
    documentId: "demo-invoice-1",
    Icon: FileText,
  },
  {
    label: "Crea una factura de cero",
    description:
      "Escribe un cliente nuevo dentro de la factura y verás cómo se guarda.",
    href: "/facturas/nuevo",
    Icon: FilePlus2,
  },
  {
    label: "Convierte un presupuesto",
    description: "Prueba el flujo de presupuesto aceptado a factura.",
    documentId: "demo-quote-1",
    Icon: Wallet,
  },
  {
    label: "Registrar gasto ficticio",
    description: "Crea compras y tickets de ejemplo sin tocar nada real.",
    href: "/gastos/nuevo",
    Icon: ShoppingCart,
  },
  {
    label: "Revisa impuestos",
    description: "Consulta el resumen orientativo de IVA, IRPF e ingresos.",
    href: "/impuestos",
    Icon: BarChart3,
  },
];

type DemoSandboxAction = {
  label: string;
  description: string;
  href: string;
  Icon: LucideIcon;
};

function countLabel(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

export function DemoSandboxPanel() {
  const router = useRouter();
  const demoMode = useDemoWorkspaceMode();
  const { data, replaceData } = useAppStore();

  if (!demoMode) return null;

  const actions: DemoSandboxAction[] = demoTourSteps.map((action) => {
    if ("href" in action) {
      return {
        label: action.label,
        description: action.description,
        href: action.href ?? "/",
        Icon: action.Icon,
      };
    }
    const document = data.documents.find(
      (item) => item.id === action.documentId,
    );
    return {
      label: action.label,
      description: action.description,
      href: document ? documentDetailPath(document) : "/",
      Icon: action.Icon,
    };
  });
  const pendingInvoices = data.documents.filter(
    (document) =>
      document.type === "factura" &&
      document.paymentStatus === "pending" &&
      document.documentLifecycle === "issued",
  ).length;
  const acceptedQuotes = data.documents.filter(
    (document) =>
      document.type === "presupuesto" &&
      document.acceptanceStatus === "accepted",
  ).length;
  const demoStats = [
    countLabel(data.customers.length, "cliente de ejemplo", "clientes de ejemplo"),
    countLabel(pendingInvoices, "factura pendiente", "facturas pendientes"),
    countLabel(acceptedQuotes, "presupuesto aceptado", "presupuestos aceptados"),
    countLabel(data.expenses.length, "gasto cargado", "gastos cargados"),
  ];

  function resetDemo() {
    const nextData = createDemoWorkspaceData();
    resetDemoWorkspaceData();
    replaceData(nextData, { fromRemote: true });
    router.push("/");
  }

  function createRealAccount() {
    setDemoWorkspaceMode(false);
    replaceData(loadData(), { fromRemote: true });
    router.push("/cuenta?modo=crear#inicio-sesion");
  }

  return (
    <Card className="mb-6 border-amber-200 bg-amber-50">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-3xl">
          <p className="inline-flex items-center gap-2 text-sm font-black uppercase tracking-wide text-amber-800">
            <ShieldCheck className="h-4 w-4" />
            Sandbox de prueba
          </p>
          <h2 className="mt-2 text-2xl font-black text-slate-950">
            Prueba el producto en 3 minutos
          </h2>
          <p className="mt-2 text-sm leading-6 text-amber-950">
            Estás viendo una empresa ficticia. Sigue la ruta recomendada para
            tocar facturas, clientes automáticos, gastos e impuestos sin
            sincronizar nada con la nube.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {demoStats.map((stat) => (
              <span
                key={stat}
                className="inline-flex min-h-8 items-center gap-1.5 rounded-full border border-amber-200 bg-white px-3 text-xs font-bold text-amber-950"
              >
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                {stat}
              </span>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row lg:flex-col">
          <Button
            type="button"
            variant="secondary"
            onClick={resetDemo}
            className="border-amber-300 text-amber-950 hover:bg-amber-100"
          >
            <RotateCcw className="h-4 w-4" />
            Reiniciar demo
          </Button>
          <Button type="button" onClick={createRealAccount}>
            <LogIn className="h-4 w-4" />
            Crear cuenta real
          </Button>
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-black uppercase tracking-wide text-amber-900">
            Ruta recomendada
          </h3>
          <p className="mt-1 text-xs font-medium leading-5 text-amber-900">
            Puedes saltar a cualquier paso. Todo queda dentro del sandbox.
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        {actions.map(({ label, description, href, Icon }, index) => (
          <Link
            key={label}
            href={href}
            className="group flex min-h-28 flex-col justify-between rounded-2xl border border-amber-200 bg-white p-4 text-slate-900 shadow-sm transition-colors hover:border-amber-300 hover:bg-amber-100/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500"
          >
            <span className="flex items-start justify-between gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-800">
                <Icon className="h-5 w-5" />
              </span>
              <span className="flex items-center gap-1 text-xs font-black text-amber-800">
                {index + 1}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </span>
            </span>
            <span>
              <span className="block text-sm font-black">{label}</span>
              <span className="mt-1 block text-xs font-medium leading-5 text-slate-600">
                {description}
              </span>
            </span>
          </Link>
        ))}
      </div>
    </Card>
  );
}
