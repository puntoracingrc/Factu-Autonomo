"use client";

import Link from "next/link";
import {
  ArrowRight,
  FileCheck2,
  FileInput,
  FileText,
  ReceiptText,
  WalletCards,
  X,
} from "lucide-react";
import { formatMoney, formatShortDate } from "@/lib/calculations";
import type { DocumentChainItem } from "@/lib/document-links";
import { documentAmounts } from "@/lib/vat-regime";

const ROLE_STYLES: Record<
  DocumentChainItem["role"],
  { shell: string; icon: string }
> = {
  factura: {
    shell:
      "border-blue-200 bg-blue-50/70 text-blue-950 dark:border-blue-800 dark:bg-blue-950/35 dark:text-blue-100",
    icon: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200",
  },
  rectificativa: {
    shell:
      "border-orange-200 bg-orange-50/70 text-orange-950 dark:border-orange-800 dark:bg-orange-950/35 dark:text-orange-100",
    icon:
      "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-200",
  },
  presupuesto: {
    shell:
      "border-violet-200 bg-violet-50/70 text-violet-950 dark:border-violet-800 dark:bg-violet-950/35 dark:text-violet-100",
    icon:
      "bg-violet-100 text-violet-700 dark:bg-violet-900 dark:text-violet-200",
  },
  recibo: {
    shell:
      "border-emerald-200 bg-emerald-50/70 text-emerald-950 dark:border-emerald-800 dark:bg-emerald-950/35 dark:text-emerald-100",
    icon:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-200",
  },
  gastos: {
    shell:
      "border-amber-200 bg-amber-50/70 text-amber-950 dark:border-amber-800 dark:bg-amber-950/35 dark:text-amber-100",
    icon:
      "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-200",
  },
};

function RoleIcon({ role }: { role: DocumentChainItem["role"] }) {
  const className = "h-5 w-5";
  if (role === "factura") return <FileText className={className} />;
  if (role === "rectificativa") return <FileCheck2 className={className} />;
  if (role === "presupuesto") return <FileInput className={className} />;
  if (role === "recibo") return <ReceiptText className={className} />;
  return <WalletCards className={className} />;
}

export function DocumentRelationshipFlow({
  items,
  vatExempt,
  compact = false,
  onExpensesClick,
  removableRoles = [],
  onRemoveItem,
}: {
  items: DocumentChainItem[];
  vatExempt: boolean;
  compact?: boolean;
  onExpensesClick?: () => void;
  removableRoles?: DocumentChainItem["role"][];
  onRemoveItem?: (item: DocumentChainItem) => void;
}) {
  return (
    <div
      className="flex min-w-0 items-stretch gap-2 overflow-x-auto pb-1"
      aria-label="Documentos y gastos vinculados"
    >
      {items.map((item, index) => {
        const styles = ROLE_STYLES[item.role];
        const subtitle =
          item.role === "gastos" && item.expenseAmount !== undefined
            ? `${formatMoney(item.expenseAmount)} asignados`
            : item.document
              ? compact
                ? formatMoney(documentAmounts(item.document, vatExempt).total)
                : `${formatShortDate(item.document.date)} · ${formatMoney(
                    documentAmounts(item.document, vatExempt).total,
                  )}`
              : item.value;
        const content = (
          <>
            <span
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${styles.icon}`}
            >
              <RoleIcon role={item.role} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1.5 text-xs font-black uppercase">
                {item.title}
                {item.current ? (
                  <span className="rounded-full bg-white/80 px-1.5 py-0.5 text-[9px] font-black text-slate-500 dark:bg-slate-900/70 dark:text-slate-300">
                    actual
                  </span>
                ) : null}
              </span>
              <span className="mt-0.5 block truncate text-sm font-black">
                {item.value}
              </span>
              <span className="mt-0.5 block whitespace-nowrap text-xs opacity-70">
                {subtitle}
              </span>
            </span>
          </>
        );
        const className = `flex min-w-[9.5rem] flex-1 items-center gap-2 rounded-xl border px-3 py-2 text-left transition-colors ${styles.shell} ${
          item.current ? "ring-2 ring-blue-500 ring-offset-1 dark:ring-offset-slate-900" : ""
        } ${removableRoles.includes(item.role) ? "pr-9" : ""}`;
        const removable =
          removableRoles.includes(item.role) && Boolean(onRemoveItem);
        const relationshipNode =
          item.role === "gastos" && onExpensesClick ? (
            <button type="button" className={className} onClick={onExpensesClick}>
              {content}
            </button>
          ) : item.href ? (
            <Link
              href={item.href}
              className={className}
              aria-label={`Abrir ${item.title} ${item.value}`}
            >
              {content}
            </Link>
          ) : (
            <div className={className}>{content}</div>
          );

        return (
          <div key={item.id} className="flex min-w-0 items-center gap-2">
            {index > 0 ? (
              <ArrowRight
                aria-hidden
                className="h-4 w-4 shrink-0 text-slate-300 dark:text-slate-600"
              />
            ) : null}
            <div className="relative flex min-w-0 flex-1">
              {relationshipNode}
              {removable ? (
                <button
                  type="button"
                  onClick={() => onRemoveItem?.(item)}
                  className="absolute right-1.5 top-1.5 inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-slate-500 shadow-sm transition-colors hover:bg-red-50 hover:text-red-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue-500 dark:bg-slate-900/90 dark:text-slate-300 dark:hover:bg-red-950 dark:hover:text-red-200"
                  aria-label={
                    item.role === "gastos"
                      ? "Elegir gasto para desvincular"
                      : `Desvincular ${item.title} ${item.value}`
                  }
                  title={
                    item.role === "gastos"
                      ? "Elegir qué gasto desvincular"
                      : "Desvincular; no borra el documento"
                  }
                >
                  <X className="h-4 w-4" />
                </button>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
