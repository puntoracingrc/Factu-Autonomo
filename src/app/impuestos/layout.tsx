import { PrivatePreviewAccessGate } from "@/components/access/PrivatePreviewAccessGate";

export default function ImpuestosLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <PrivatePreviewAccessGate taxSummary>{children}</PrivatePreviewAccessGate>;
}
