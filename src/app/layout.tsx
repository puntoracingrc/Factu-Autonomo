import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import { ConditionalAppShell } from "@/components/layout/ConditionalAppShell";
import { AppErrorMonitor } from "@/components/monitoring/AppErrorMonitor";
import { RegisterServiceWorker } from "@/components/pwa/RegisterServiceWorker";
import { AppStoreProvider } from "@/context/AppStore";
import { BillingProvider } from "@/context/BillingContext";
import { CloudSyncProvider } from "@/context/CloudSyncContext";
import { APP_BRAND_NAME } from "@/lib/brand";
import "./globals.css";

const geist = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  applicationName: APP_BRAND_NAME,
  title: {
    default: `${APP_BRAND_NAME} | Facturación sencilla para autónomos`,
    template: `%s | ${APP_BRAND_NAME}`,
  },
  description:
    "Programa sencillo de facturación para autónomos: facturas, presupuestos, recibos, gastos e impuestos orientativos en un solo sitio.",
  manifest: "/manifest.json",
  openGraph: {
    title: APP_BRAND_NAME,
    description:
      "Facturación sencilla para autónomos: documentos, gastos e impuestos orientativos sin hojas de cálculo.",
    url: "https://facturacion-autonomos.app",
    siteName: APP_BRAND_NAME,
    locale: "es_ES",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: APP_BRAND_NAME,
    description:
      "Facturas, gastos e impuestos orientativos para autónomos y pequeños negocios.",
  },
  icons: {
    icon: [
      { url: "/favicon-16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: APP_BRAND_NAME,
  },
};

export const viewport: Viewport = {
  themeColor: "#2563eb",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${geist.variable} h-full`}>
      <body className="min-h-full bg-slate-100 font-sans text-slate-900 antialiased">
        <AppStoreProvider>
          <CloudSyncProvider>
            <BillingProvider>
              <ConditionalAppShell>{children}</ConditionalAppShell>
              <AppErrorMonitor />
              <RegisterServiceWorker />
            </BillingProvider>
          </CloudSyncProvider>
        </AppStoreProvider>
      </body>
    </html>
  );
}
