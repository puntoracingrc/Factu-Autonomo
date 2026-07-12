import {
  ChartNoAxesCombined,
  FileText,
  Home,
  Landmark,
  PackageSearch,
  Receipt,
  Scale,
  Settings,
  ShoppingCart,
  Truck,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
export type AppNavItem = {
  href: string;
  activeBase?: string;
  label: string;
  shortLabel: string;
  icon: LucideIcon;
};

const CONSULTOR_FISCAL_NAV_ITEM: AppNavItem = {
  href: "/consultor-fiscal/modelos",
  activeBase: "/consultor-fiscal",
  label: "Asesoría fiscal",
  shortLabel: "Asesoría",
  icon: Scale,
};

export const APP_NAV_ITEMS: readonly AppNavItem[] = [
  { href: "/", label: "Panel", shortLabel: "Panel", icon: Home },
  { href: "/clientes", label: "Clientes", shortLabel: "Clientes", icon: Users },
  {
    href: "/presupuestos",
    label: "Presupuestos",
    shortLabel: "Presup.",
    icon: Wallet,
  },
  {
    href: "/facturas",
    label: "Facturas",
    shortLabel: "Facturas",
    icon: FileText,
  },
  { href: "/recibos", label: "Recibos", shortLabel: "Recibos", icon: Receipt },
  {
    href: "/gastos",
    label: "Gastos",
    shortLabel: "Gastos",
    icon: ShoppingCart,
  },
  {
    href: "/productos",
    label: "Productos",
    shortLabel: "Productos",
    icon: PackageSearch,
  },
  {
    href: "/rentabilidad-real",
    label: "Rentabilidad Real",
    shortLabel: "Rentab.",
    icon: ChartNoAxesCombined,
  },
  {
    href: "/proveedores",
    label: "Proveedores",
    shortLabel: "Proveedor",
    icon: Truck,
  },
  {
    href: "/impuestos",
    label: "Impuestos",
    shortLabel: "Impuestos",
    icon: Landmark,
  },
  CONSULTOR_FISCAL_NAV_ITEM,
  {
    href: "/configuracion",
    label: "Ajustes",
    shortLabel: "Ajustes",
    icon: Settings,
  },
];

export const MOBILE_PRIMARY_NAV_HREFS = [
  "/",
  "/clientes",
  "/facturas",
  "/gastos",
] as const;

const mobilePrimaryHrefSet = new Set<string>(MOBILE_PRIMARY_NAV_HREFS);

export const MOBILE_PRIMARY_NAV_ITEMS = APP_NAV_ITEMS.filter((item) =>
  mobilePrimaryHrefSet.has(item.href),
);

export const MOBILE_MORE_NAV_ITEMS = APP_NAV_ITEMS.filter(
  (item) => !mobilePrimaryHrefSet.has(item.href),
);

export function isAppNavItemActive(
  pathname: string,
  href: string,
  activeBase = href,
): boolean {
  if (activeBase === "/") return pathname === activeBase;
  return (
    pathname === activeBase || pathname.startsWith(`${activeBase}/`)
  );
}

export function findActiveAppNavItem(
  pathname: string,
  items: readonly AppNavItem[] = APP_NAV_ITEMS,
): AppNavItem | undefined {
  return items.find((item) =>
    isAppNavItemActive(pathname, item.href, item.activeBase),
  );
}
