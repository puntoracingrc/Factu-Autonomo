import { VidaPage } from "@/components/vida/VidaPage";
import { getVidaMetadata, getVidaPage } from "@/lib/vida/content";

export const metadata = getVidaMetadata("index");

export default function VidaLandingPage() {
  return <VidaPage page={getVidaPage("index")} />;
}
