import type { Metadata } from "next";
import { ExpenseLearningInsightsPanel } from "@/components/admin/ExpenseLearningInsightsPanel";

export const metadata: Metadata = {
  title: "Aprendizaje agregado de gastos | Administración",
  robots: { index: false, follow: false },
};

export default function ExpenseLearningInsightsPage() {
  return <ExpenseLearningInsightsPanel />;
}
