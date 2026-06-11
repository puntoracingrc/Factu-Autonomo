"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { getManualSection } from "@/lib/manual/sections";
import { manualHelpHref } from "@/lib/manual/route-help";

export function FactuHelpButton() {
  const pathname = usePathname();
  const href = manualHelpHref(pathname);
  const slug = href?.split("/").pop();
  const section = slug ? getManualSection(slug) : undefined;

  if (!href || !section) return null;

  return (
    <Link
      href={href}
      className="group relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-xl transition-colors hover:border-blue-200 hover:bg-blue-50 active:scale-95"
      title={`Ayuda: ${section.title}`}
      aria-label={`Ayuda sobre ${section.title}. Abre el manual de usuario.`}
    >
      <span aria-hidden className="transition-transform group-hover:scale-105">
        🤖
      </span>
      <span
        aria-hidden
        className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white shadow-sm"
      >
        ?
      </span>
    </Link>
  );
}
