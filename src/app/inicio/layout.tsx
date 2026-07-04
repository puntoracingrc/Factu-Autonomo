import type { Metadata } from "next";
import { APP_BRAND_NAME } from "@/lib/brand";

export const metadata: Metadata = {
  title: "Inicio",
  description:
    "Facturación sencilla para autónomos: facturas, gastos, impuestos orientativos y VeriFactu desde el plan Gratis.",
  alternates: {
    canonical: "/inicio",
  },
  openGraph: {
    title: `${APP_BRAND_NAME} | Facturación sencilla para autónomos`,
    description:
      "Crea facturas, controla gastos y revisa impuestos orientativos sin pelearte con hojas de cálculo.",
    url: "/inicio",
  },
};

export default function InicioLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
