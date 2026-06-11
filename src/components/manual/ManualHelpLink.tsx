"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { buildManualHref } from "@/lib/manual/return-url";

export function ManualHelpLink() {
  const pathname = usePathname();

  return (
    <Link href={buildManualHref("/ayuda", pathname)} className="mb-6 block">
      <Card className="flex items-center gap-3 transition-colors hover:bg-slate-50">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
          <BookOpen className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-bold text-slate-900">Manual de usuario</p>
          <p className="text-sm text-slate-600">
            Guía paso a paso con capturas de cada sección
          </p>
        </div>
        <ChevronRight className="h-5 w-5 shrink-0 text-slate-400" />
      </Card>
    </Link>
  );
}
