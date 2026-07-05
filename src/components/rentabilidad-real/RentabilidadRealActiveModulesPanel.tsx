"use client";

import { CheckCircle2, CircleDotDashed } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { getRentabilidadRealProductById } from "@/lib/rentabilidad-real/catalog";
import type {
  RentabilidadRealProduct,
  RentabilidadRealProductId,
} from "@/lib/rentabilidad-real/types";

export function RentabilidadRealActiveModulesPanel({
  activeProductIds,
}: {
  activeProductIds: readonly RentabilidadRealProductId[];
}) {
  const activeProducts = activeProductIds
    .map((productId) => getRentabilidadRealProductById(productId))
    .filter((product): product is RentabilidadRealProduct => Boolean(product));

  return (
    <Card className="border-slate-200/80 bg-white dark:border-slate-700 dark:bg-slate-900">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/45 dark:text-emerald-200">
          {activeProducts.length > 0 ? (
            <CheckCircle2 className="h-5 w-5" />
          ) : (
            <CircleDotDashed className="h-5 w-5" />
          )}
        </span>
        <div className="min-w-0">
          <h2 className="text-base font-black text-slate-950 dark:text-slate-50">
            Módulos activos
          </h2>
          {activeProducts.length === 0 ? (
            <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
              Todavía no has activado módulos. Haz el test o activa un módulo
              incluido para empezar a preparar tu panel.
            </p>
          ) : (
            <div className="mt-3 flex flex-wrap gap-2">
              {activeProducts.map((product) => (
                <span
                  key={product.id}
                  className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 dark:bg-emerald-950/45 dark:text-emerald-200"
                >
                  {product.name}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
