"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  FileText,
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

const demoActions = [
  {
    label: "Abrir factura pendiente",
    description: "Revisa una factura emitida con cobro pendiente.",
    documentId: "demo-invoice-1",
    Icon: FileText,
  },
  {
    label: "Ver presupuesto aceptado",
    description: "Prueba el flujo de convertir presupuesto a factura.",
    documentId: "demo-quote-1",
    Icon: Wallet,
  },
  {
    label: "Registrar gasto ficticio",
    description: "Crea compras y tickets de ejemplo sin tocar nada real.",
    href: "/gastos/nuevo",
    Icon: ShoppingCart,
  },
];

type DemoSandboxAction = {
  label: string;
  description: string;
  href: string;
  Icon: LucideIcon;
};

export function DemoSandboxPanel() {
  const router = useRouter();
  const demoMode = useDemoWorkspaceMode();
  const { data, replaceData } = useAppStore();

  if (!demoMode) return null;

  const actions: DemoSandboxAction[] = demoActions.map((action) => {
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
            Estás viendo una empresa ficticia
          </h2>
          <p className="mt-2 text-sm leading-6 text-amber-950">
            Puedes crear clientes, facturas, gastos y productos de prueba. Todo
            se guarda solo en este navegador y no se sincroniza con la nube.
          </p>
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

      <div className="mt-5 grid gap-3 md:grid-cols-3">
        {actions.map(({ label, description, href, Icon }) => (
          <Link
            key={label}
            href={href}
            className="group flex min-h-28 flex-col justify-between rounded-2xl border border-amber-200 bg-white p-4 text-slate-900 shadow-sm transition-colors hover:border-amber-300 hover:bg-amber-100/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500"
          >
            <span className="flex items-start justify-between gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-800">
                <Icon className="h-5 w-5" />
              </span>
              <ArrowRight className="h-5 w-5 text-amber-700 transition-transform group-hover:translate-x-0.5" />
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
