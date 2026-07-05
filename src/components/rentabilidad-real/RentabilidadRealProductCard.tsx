"use client";

import Link from "next/link";
import {
  BadgeCheck,
  CheckCircle2,
  CircleDashed,
  Clock3,
  LockKeyhole,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import type {
  RentabilidadRealAccessStatus,
  RentabilidadRealProduct,
  RentabilidadRealProductId,
} from "@/lib/rentabilidad-real/types";
import type { RentabilidadRealMarketplaceProductViewModel } from "@/lib/rentabilidad-real/view-model";

const CATEGORY_LABELS: Record<RentabilidadRealProduct["category"], string> = {
  base: "Base",
  trades: "Obras y oficios",
  hours_projects: "Horas y proyectos",
  fixed_costs: "Costes fijos",
  assets: "Estructura ligera",
  pricing: "Precio mínimo",
  advisor: "Gestor",
  stock_commerce: "Stock y comercio",
  tax_regimes: "Regímenes especiales",
  company: "Empresa",
};

const BADGE_CLASSES: Record<RentabilidadRealAccessStatus | "active", string> = {
  active:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-100",
  included_in_pro_plus:
    "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/45 dark:text-emerald-200",
  requires_pro_plus:
    "bg-blue-50 text-blue-700 dark:bg-blue-950/45 dark:text-blue-200",
  paid_addon:
    "bg-violet-50 text-violet-700 dark:bg-violet-950/45 dark:text-violet-200",
  coming_soon:
    "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  unavailable:
    "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
  decision_pending:
    "bg-amber-50 text-amber-700 dark:bg-amber-950/45 dark:text-amber-200",
};

function levelLabel(product: RentabilidadRealProduct): string {
  if (product.levelMin === product.levelMax) {
    return `Nivel ${product.levelMin}`;
  }
  return `Niveles ${product.levelMin} a ${product.levelMax}`;
}

function AccessIcon({
  status,
  active,
}: {
  status: RentabilidadRealAccessStatus;
  active: boolean;
}) {
  if (active) return <CheckCircle2 className="h-3.5 w-3.5" />;
  if (status === "coming_soon") return <Clock3 className="h-3.5 w-3.5" />;
  if (status === "requires_pro_plus") {
    return <LockKeyhole className="h-3.5 w-3.5" />;
  }
  if (status === "decision_pending") {
    return <CircleDashed className="h-3.5 w-3.5" />;
  }
  return <BadgeCheck className="h-3.5 w-3.5" />;
}

export function RentabilidadRealProductCard({
  item,
  onActivate,
  onDeactivate,
}: {
  item: RentabilidadRealMarketplaceProductViewModel;
  onActivate: (productId: RentabilidadRealProductId) => void;
  onDeactivate: (productId: RentabilidadRealProductId) => void;
}) {
  const { product } = item;
  const badgeTone = item.isActive ? "active" : item.accessStatus;
  const isActivePriceSimulator =
    item.isActive && product.id === "RR_PRICE_SIMULATOR";

  return (
    <Card className="flex h-full flex-col gap-4 border-slate-200/80 bg-white dark:border-slate-700 dark:bg-slate-900">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            {CATEGORY_LABELS[product.category]} · {levelLabel(product)}
          </p>
          <h2 className="mt-2 text-lg font-black leading-snug text-slate-950 dark:text-slate-50">
            {product.name}
          </h2>
        </div>
        <span
          className={`inline-flex max-w-[9.5rem] shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold leading-tight sm:max-w-none ${BADGE_CLASSES[badgeTone]}`}
        >
          <AccessIcon status={item.accessStatus} active={item.isActive} />
          {item.badgeLabel}
        </span>
      </div>

      {item.isIncludedInCurrentPlan && !item.isActive ? (
        <span className="w-fit rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 dark:bg-emerald-950/45 dark:text-emerald-200">
          Incluido en Pro+
        </span>
      ) : null}

      <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
        {product.shortDescription}
      </p>

      <div className="space-y-3 text-sm">
        <div>
          <p className="font-bold text-slate-900 dark:text-slate-100">
            Para quién
          </p>
          <ul className="mt-1 space-y-1 text-slate-600 dark:text-slate-300">
            {product.targetUsers.slice(0, 3).map((target) => (
              <li key={target}>- {target}</li>
            ))}
          </ul>
        </div>
        <div>
          <p className="font-bold text-slate-900 dark:text-slate-100">Cubre</p>
          <ul className="mt-1 space-y-1 text-slate-600 dark:text-slate-300">
            {product.covers.slice(0, 4).map((cover) => (
              <li key={cover}>- {cover}</li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-auto space-y-3 border-t border-slate-100 pt-4 dark:border-slate-800">
        <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">
          {item.commercialAccessNote}
        </p>
        {isActivePriceSimulator ? (
          <Link
            href="/rentabilidad-real/simulador-precio-minimo"
            className="inline-flex min-h-11 w-full items-center justify-center rounded-2xl bg-blue-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-blue-700 sm:w-auto"
          >
            Abrir simulador
          </Link>
        ) : item.accessStatus === "requires_pro_plus" ? (
          <Link
            href="/precios"
            className="inline-flex min-h-11 w-full items-center justify-center rounded-2xl border-2 border-blue-200 bg-white px-4 text-sm font-semibold text-blue-700 transition-colors hover:bg-blue-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 sm:w-auto dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
          >
            {item.ctaLabel}
          </Link>
        ) : (
          <Button
            variant={item.isActive ? "secondary" : "primary"}
            disabled={!item.isActive && !item.canActivate}
            onClick={() =>
              item.isActive
                ? onDeactivate(product.id)
                : onActivate(product.id)
            }
            className="w-full text-sm sm:w-auto dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
          >
            {item.ctaLabel}
          </Button>
        )}
      </div>
    </Card>
  );
}
