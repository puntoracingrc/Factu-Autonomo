"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { AppRecommendation } from "@/lib/recommendations";

interface FactuTipsListProps {
  items: AppRecommendation[];
}

export function FactuTipsList({ items }: FactuTipsListProps) {
  if (items.length === 0) return null;

  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item.id}>
          <div className="rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 to-white p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-violet-100 bg-white shadow-sm">
                <span className="text-xl" aria-hidden>
                  🤖
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold uppercase tracking-wide text-violet-700">
                  Factu te sugiere
                </p>
                <p className="mt-1 font-semibold text-slate-900">{item.title}</p>
                <p className="mt-1 text-sm leading-relaxed text-slate-700">
                  &ldquo;{item.message}&rdquo;
                </p>
                <p className="mt-1 text-xs font-semibold text-blue-600">— Factu</p>
              </div>
              {item.href ? (
                <Link
                  href={item.href}
                  className="inline-flex shrink-0 items-center gap-1 self-center rounded-xl bg-violet-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-700"
                >
                  {item.actionLabel ?? "Probar"}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              ) : null}
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
