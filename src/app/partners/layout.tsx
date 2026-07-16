import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Área Partners",
  robots: { index: false, follow: false, noarchive: true },
};

export default function PartnersLayout({ children }: { children: React.ReactNode }) {
  return children;
}
