import { PrivatePreviewAccessGate } from "@/components/access/PrivatePreviewAccessGate";

export default function AfiliadosLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <PrivatePreviewAccessGate>{children}</PrivatePreviewAccessGate>;
}
