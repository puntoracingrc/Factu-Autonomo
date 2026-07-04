export const HOME_CREATE_ACTIONS = [
  { href: "/clientes/nuevo?from=/", label: "Nuevo cliente" },
] as const;

export const HOME_REVIEW_ACTIONS = [
  { href: "/clientes", label: "Ver clientes" },
  { href: "/presupuestos", label: "Ver presupuestos" },
  { href: "/facturas", label: "Ver facturas" },
  { href: "/avisos", label: "Avisos", showBadge: true },
  { href: "/recibos/nuevo", label: "Nuevo recibo" },
  { href: "/gastos", label: "Ver gastos" },
] as const;
