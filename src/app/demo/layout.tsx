import type { Metadata } from "next";
import { APP_BRAND_NAME } from "@/lib/brand";

export const metadata: Metadata = {
  title: "Demo sin registro",
  description:
    "Prueba Facturación Autónomos en un sandbox ficticio: facturas, clientes, gastos, productos e impuestos sin tocar datos reales.",
  alternates: {
    canonical: "/demo",
  },
  openGraph: {
    title: `Demo sin registro | ${APP_BRAND_NAME}`,
    description:
      "Recorre el producto con datos ficticios antes de crear tu cuenta gratis.",
    url: "/demo",
  },
};

export default function DemoLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
