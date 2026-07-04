import type { Metadata } from "next";
import { APP_BRAND_NAME } from "@/lib/brand";

export const metadata: Metadata = {
  title: "Precios",
  description:
    "Planes de Facturación Autónomos: Gratis con cuenta verificada, Pro para uso diario y Pro+ IA para automatizar gastos.",
  alternates: {
    canonical: "/precios",
  },
  openGraph: {
    title: `Precios | ${APP_BRAND_NAME}`,
    description:
      "Empieza gratis sin tarjeta y sube solo cuando necesites más documentos, nube, importación o IA.",
    url: "/precios",
  },
};

export default function PreciosLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
