"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen } from "lucide-react";
import { getManualSection } from "@/lib/manual/sections";
import { manualHelpHref, resolveManualSlug } from "@/lib/manual/route-help";

export function FactuHelpButton() {
  const pathname = usePathname();
  const slug = resolveManualSlug(pathname);
  const href = manualHelpHref(pathname);
  const section = slug ? getManualSection(slug) : undefined;
  const helpTitle = section?.title ?? "Manual de usuario";

  if (!href) return null;

  return (
    <Link
      href={href}
      className="group relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition-colors hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 active:scale-95"
      title={`Ayuda: ${helpTitle}`}
      aria-label={`Ayuda: ${helpTitle}. Abre el manual de usuario.`}
    >
      <BookOpen className="h-5 w-5" aria-hidden />
      <span
        aria-hidden
        className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold leading-none text-white shadow-sm"
      >
        ?
      </span>
    </Link>
  );
}
