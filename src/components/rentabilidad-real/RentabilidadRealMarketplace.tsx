"use client";

import { RentabilidadRealProductCard } from "./RentabilidadRealProductCard";
import type { RentabilidadRealProductId } from "@/lib/rentabilidad-real/types";
import type { RentabilidadRealMarketplaceProductViewModel } from "@/lib/rentabilidad-real/view-model";

export function RentabilidadRealMarketplace({
  availableProducts,
  comingSoonProducts,
  onActivate,
  onDeactivate,
}: {
  availableProducts: readonly RentabilidadRealMarketplaceProductViewModel[];
  comingSoonProducts: readonly RentabilidadRealMarketplaceProductViewModel[];
  onActivate: (productId: RentabilidadRealProductId) => void;
  onDeactivate: (productId: RentabilidadRealProductId) => void;
}) {
  return (
    <>
      <section id="modulos-disponibles" className="scroll-mt-24">
        <div className="mb-4">
          <h2 className="text-xl font-black text-slate-950 dark:text-slate-50">
            Módulos disponibles
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Productos preparados para autónomos persona física de niveles 1 a 4.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {availableProducts.map((item) => (
            <RentabilidadRealProductCard
              key={item.product.id}
              item={item}
              onActivate={onActivate}
              onDeactivate={onDeactivate}
            />
          ))}
        </div>
      </section>

      <section className="mt-8">
        <div className="mb-4">
          <h2 className="text-xl font-black text-slate-950 dark:text-slate-50">
            Próximamente
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Casos detectables desde el test, pero reservados para fases futuras.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {comingSoonProducts.map((item) => (
            <RentabilidadRealProductCard
              key={item.product.id}
              item={item}
              onActivate={onActivate}
              onDeactivate={onDeactivate}
            />
          ))}
        </div>
      </section>
    </>
  );
}
