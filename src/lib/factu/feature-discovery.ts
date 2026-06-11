import type { AppRecommendation, RecommendationContext } from "../recommendations";
import type { AppData } from "../types";
import {
  defaultFactuFeatureUsage,
  type FactuFeatureUsage,
} from "./feature-usage";

export interface FactuDiscoveryContext extends RecommendationContext {
  usage?: FactuFeatureUsage;
}

function profileReady(data: AppData): boolean {
  return Boolean(data.profile.name.trim() && data.profile.nif.trim());
}

function hasFacturas(data: AppData): boolean {
  return data.documents.some((doc) => doc.type === "factura");
}

function isActiveUser(data: AppData): boolean {
  return data.documents.length > 0 || data.expenses.length > 0;
}

/** Consejos de Factu para funciones de la app que el usuario aún no ha probado. */
export function collectFactuFeatureTips(
  context: FactuDiscoveryContext,
): AppRecommendation[] {
  const { data } = context;
  const usage = context.usage ?? defaultFactuFeatureUsage();

  if (!profileReady(data)) return [];

  const tips: AppRecommendation[] = [];

  if (!usage.userReminders && data.userReminders.length === 0) {
    tips.push({
      id: "factu-tip-reminders",
      priority: "tip",
      category: "factu",
      title: "Tus propios recordatorios",
      message:
        "Jefe, puedes apuntarme cosas como «facturar a María esta tarde». Las ves en Inicio, les haces check y listo. Very Bonito.",
      href: "/avisos",
      actionLabel: "Crear recordatorio",
    });
  }

  if (!usage.expenseScan && isActiveUser(data)) {
    tips.push({
      id: "factu-tip-expense-scan",
      priority: "tip",
      category: "factu",
      title: "Escanea tickets con IA",
      message:
        "¿Foto de una factura de compra? La leo yo y relleno el gasto. Menos tecleo, más facturar.",
      href: "/gastos/nuevo",
      actionLabel: "Probar escáner",
    });
  }

  if (!usage.impuestos && isActiveUser(data)) {
    tips.push({
      id: "factu-tip-impuestos",
      priority: "tip",
      category: "factu",
      title: "Resumen fiscal en un vistazo",
      message:
        "En Impuestos tienes trimestre, año o todo el historial: ingresos, gastos, IVA e IRPF orientativos. Yo no sustituyo al gestor, pero aclaran mucho.",
      href: "/impuestos",
      actionLabel: "Ver Impuestos",
    });
  }

  if (!usage.recurringExpenses && data.recurringExpenses.length === 0 && data.expenses.length >= 2) {
    tips.push({
      id: "factu-tip-recurring",
      priority: "tip",
      category: "factu",
      title: "Gastos fijos con aviso",
      message:
        "Alquiler, seguro, internet… Configúralos una vez y te aviso antes de que venzan. Así no se te olvida apuntarlos.",
      href: "/gastos/fijos",
      actionLabel: "Gastos fijos",
    });
  }

  if (!usage.presupuestos && hasFacturas(data)) {
    const hasQuote = data.documents.some((doc) => doc.type === "presupuesto");
    if (!hasQuote) {
      tips.push({
        id: "factu-tip-presupuestos",
        priority: "tip",
        category: "factu",
        title: "Presupuestos antes de facturar",
        message:
          "Si el cliente quiere ver precio antes de pagar, un presupuesto queda Veri Legal. Luego lo pasas a factura en un toque.",
        href: "/presupuestos/nuevo",
        actionLabel: "Nuevo presupuesto",
      });
    }
  }

  const pendingWithContact = data.documents.some(
    (doc) =>
      doc.type === "factura" &&
      doc.status !== "pagado" &&
      doc.status !== "borrador" &&
      doc.status !== "anulada" &&
      Boolean(doc.client.email?.trim() || doc.client.phone?.trim()),
  );

  if (!usage.paymentReminder && pendingWithContact) {
    tips.push({
      id: "factu-tip-payment-reminder",
      priority: "tip",
      category: "factu",
      title: "Recordar cobros con tacto",
      message:
        "En una factura pendiente verás la campana: mensaje amable por email o WhatsApp, con PDF. Yo redacto el borrador, tú solo envías.",
      href: "/facturas",
      actionLabel: "Ver facturas",
    });
  }

  if (
    !usage.referrals &&
    context.billing?.billingEnabled &&
    data.documents.filter((doc) => doc.type === "factura" && doc.status !== "borrador").length >= 2
  ) {
    tips.push({
      id: "factu-tip-referrals",
      priority: "tip",
      category: "factu",
      title: "Invita a un colega autónomo",
      message:
        "Si traes a alguien con tu código, los dos ganáis escaneos IA extra. Buen trato para quien factura como tú.",
      href: "/configuracion",
      actionLabel: "Ver referidos",
    });
  }

  return tips.slice(0, 4);
}
