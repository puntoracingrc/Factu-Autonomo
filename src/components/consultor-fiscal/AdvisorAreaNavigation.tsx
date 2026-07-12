"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, FileSearch, LibraryBig, Scale } from "lucide-react";

interface AdvisorAreaNavigationProps {
  expenseAnalysisEnabled?: boolean;
  notificationsEnabled?: boolean;
}

export function AdvisorAreaNavigation({
  expenseAnalysisEnabled = false,
  notificationsEnabled = false,
}: AdvisorAreaNavigationProps) {
  const pathname = usePathname();
  const items = [
    ...(expenseAnalysisEnabled
      ? [
          {
            href: "/consultor-fiscal",
            label: "Gastos deducibles",
            icon: Scale,
            active: pathname === "/consultor-fiscal",
          },
        ]
      : []),
    {
      href: "/consultor-fiscal/modelos",
      label: "Modelos AEAT",
      icon: LibraryBig,
      active: pathname.startsWith("/consultor-fiscal/modelos"),
    },
    {
      href: "/consultor-fiscal/calendario",
      label: "Calendario fiscal",
      icon: CalendarDays,
      active: pathname === "/consultor-fiscal/calendario",
    },
    ...(notificationsEnabled
      ? [
          {
            href: "/consultor-fiscal/notificaciones",
            label: "Notificaciones y expedientes",
            icon: FileSearch,
            active: pathname.startsWith(
              "/consultor-fiscal/notificaciones",
            ),
          },
        ]
      : []),
  ];

  return (
    <nav
      aria-label="Herramientas de Asesoría fiscal"
      className="mb-5 flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm dark:border-slate-700 dark:bg-slate-900"
    >
      {items.map(({ href, label, icon: Icon, active }) => (
        <Link
          key={href}
          href={href}
          aria-current={active ? "page" : undefined}
          className={`inline-flex min-h-11 items-center gap-2 rounded-xl px-4 text-sm font-bold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 ${
            active
              ? "bg-blue-600 text-white"
              : "text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
          }`}
        >
          <Icon aria-hidden="true" className="h-4 w-4" />
          {label}
        </Link>
      ))}
    </nav>
  );
}
