"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bot,
  FileText,
  Home,
  Receipt,
  Settings,
  ShoppingCart,
  Truck,
  Users,
  Wallet,
} from "lucide-react";

const navItems = [
  { href: "/", label: "Inicio", icon: Home },
  { href: "/clientes", label: "Clientes", icon: Users },
  { href: "/facturas", label: "Facturas", icon: FileText },
  { href: "/presupuestos", label: "Presupuestos", icon: Wallet },
  { href: "/recibos", label: "Recibos", icon: Receipt },
  { href: "/gastos", label: "Gastos", icon: ShoppingCart },
  { href: "/proveedores", label: "Proveedores", icon: Truck },
  { href: "/asistente", label: "Asistente", icon: Bot },
  { href: "/configuracion", label: "Ajustes", icon: Settings },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen flex-col bg-slate-100">
      <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white shadow-sm">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-sm font-bold text-white">
            FA
          </div>
          <div className="min-w-0">
            <p className="truncate text-base font-bold text-slate-900">
              Factura Autónomo
            </p>
            <p className="truncate text-xs text-slate-500">
              Tu negocio, simple y claro
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-5 pb-28">
        {children}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-slate-200 bg-white/95 shadow-[0_-8px_30px_rgba(15,23,42,0.08)] backdrop-blur-md nav-safe-bottom">
        <div className="nav-scroll mx-auto max-w-3xl overflow-x-auto px-2 py-2">
          <div className="flex w-max min-w-full items-stretch justify-start gap-1 sm:justify-center">
            {navItems.map(({ href, label, icon: Icon }) => {
              const active =
                href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex w-[4.5rem] shrink-0 flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 transition-colors sm:w-20 ${
                    active
                      ? "bg-blue-600 text-white shadow-md shadow-blue-600/25"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <Icon className="h-5 w-5" strokeWidth={active ? 2.5 : 2} />
                  <span className="w-full truncate text-center text-[10px] font-semibold leading-tight sm:text-[11px]">
                    {label}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </nav>
    </div>
  );
}
