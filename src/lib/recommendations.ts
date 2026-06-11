import { PLANS, type PlanId } from "./billing/plans";
import type { ScanQuota } from "./billing/scan-limits";
import {
  shouldShowDeadlineReminder,
  upcomingIvaDeadline,
} from "./billing/tax-deadlines";
import { documentTotals, formatMoney, formatShortDate } from "./calculations";
import { isPendingInvoicePayment } from "./income";
import {
  daysBetweenIso,
  dueSoonLabel,
  getDueSoonRecurringAlerts,
} from "./recurring-expenses";
import type { AppData, Document } from "./types";

export type RecommendationPriority = "critical" | "warning" | "info" | "tip";

export type RecommendationCategory =
  | "profile"
  | "billing"
  | "invoices"
  | "expenses"
  | "tax"
  | "sync"
  | "onboarding";

export interface AppRecommendation {
  id: string;
  priority: RecommendationPriority;
  category: RecommendationCategory;
  title: string;
  message: string;
  href?: string;
  actionLabel?: string;
}

export interface RecommendationBillingContext {
  billingEnabled: boolean;
  plan: PlanId;
  isPro: boolean;
  documentsThisMonth: number;
  showUsageWarning: boolean;
  trialDaysLeft: number | null;
  quarterlyExport: boolean;
}

export interface RecommendationCloudContext {
  cloudEnabled: boolean;
  hasUser: boolean;
  pendingChangeCount: number;
}

export interface RecommendationContext {
  data: AppData;
  referenceDate?: string;
  billing?: RecommendationBillingContext;
  cloud?: RecommendationCloudContext;
  scanQuota?: ScanQuota | null;
}

const PRIORITY_RANK: Record<RecommendationPriority, number> = {
  critical: 0,
  warning: 1,
  info: 2,
  tip: 3,
};

export const INVOICE_DUE_SOON_DAYS = 7;

function todayIso(referenceDate?: string): string {
  return referenceDate ?? new Date().toISOString().split("T")[0];
}

function sortRecommendations(items: AppRecommendation[]): AppRecommendation[] {
  return [...items].sort(
    (a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority],
  );
}

function profileRecommendations(data: AppData): AppRecommendation[] {
  const { profile } = data;
  const items: AppRecommendation[] = [];

  if (!profile.name.trim() || !profile.nif.trim()) {
    items.push({
      id: "profile-incomplete",
      priority: "critical",
      category: "profile",
      title: "Completa tus datos de empresa",
      message:
        "Necesitamos tu nombre y NIF para emitir facturas legales con tus datos.",
      href: "/configuracion",
      actionLabel: "Ir a configuración",
    });
    return items;
  }

  if (!profile.address.trim() || !profile.city.trim() || !profile.postalCode.trim()) {
    items.push({
      id: "profile-address",
      priority: "info",
      category: "profile",
      title: "Añade tu dirección fiscal",
      message:
        "La dirección completa aparece en tus facturas y mejora la imagen profesional.",
      href: "/configuracion",
      actionLabel: "Completar dirección",
    });
  }

  if (!profile.iban?.trim()) {
    items.push({
      id: "profile-iban",
      priority: "info",
      category: "profile",
      title: "Añade tu IBAN",
      message:
        "Facilita el cobro: el IBAN sale en facturas pendientes y en los recordatorios de pago.",
      href: "/configuracion",
      actionLabel: "Añadir IBAN",
    });
  }

  if (!profile.email.trim()) {
    items.push({
      id: "profile-email",
      priority: "tip",
      category: "profile",
      title: "Añade tu email de contacto",
      message: "Tus clientes podrán responderte más fácil si lo incluyes en los documentos.",
      href: "/configuracion",
      actionLabel: "Añadir email",
    });
  }

  return items;
}

function billingRecommendations(
  billing: RecommendationBillingContext,
  scanQuota: ScanQuota | null | undefined,
): AppRecommendation[] {
  const items: AppRecommendation[] = [];

  if (!billing.billingEnabled) return items;

  const maxDocs = PLANS.free.limits.maxDocumentsPerMonth ?? 0;

  if (!billing.isPro && billing.documentsThisMonth >= maxDocs) {
    items.push({
      id: "doc-limit-reached",
      priority: "critical",
      category: "billing",
      title: "Has llegado al límite de documentos",
      message: `Este mes has usado los ${maxDocs} documentos del plan Gratis. Pasa a Pro para facturar sin límite.`,
      href: "/precios",
      actionLabel: "Ver planes Pro",
    });
  } else if (billing.showUsageWarning) {
    items.push({
      id: "doc-limit-warning",
      priority: "warning",
      category: "billing",
      title: "Te quedan pocos documentos este mes",
      message: `Llevas ${billing.documentsThisMonth} de ${maxDocs} documentos en el plan Gratis.`,
      href: "/precios",
      actionLabel: "Ampliar plan",
    });
  }

  if (
    billing.plan === "trial" &&
    billing.trialDaysLeft !== null &&
    billing.trialDaysLeft > 0
  ) {
    const urgent = billing.trialDaysLeft <= 3;
    items.push({
      id: "trial-ending",
      priority: urgent ? "warning" : "info",
      category: "billing",
      title: urgent ? "Tu prueba Pro termina pronto" : "Prueba Pro activa",
      message: `Te quedan ${billing.trialDaysLeft} día(s) de acceso Pro.`,
      href: "/precios",
      actionLabel: "Ver planes",
    });
  }

  if (scanQuota && billing.billingEnabled) {
    if (scanQuota.remaining === 0) {
      items.push({
        id: "scan-quota-empty",
        priority: "warning",
        category: "billing",
        title: "Sin escaneos IA disponibles",
        message: billing.isPro
          ? "Has agotado los escaneos de este mes. Puedes comprar un pack extra o esperar al mes que viene."
          : "Has usado tus escaneos de prueba. Pasa a Pro para digitalizar más facturas de gasto.",
        href: billing.isPro ? "/gastos/nuevo" : "/precios",
        actionLabel: billing.isPro ? "Comprar escaneos" : "Ver Pro",
      });
    } else if (scanQuota.remaining <= 2) {
      items.push({
        id: "scan-quota-low",
        priority: "info",
        category: "billing",
        title: "Pocos escaneos IA restantes",
        message: `Te quedan ${scanQuota.remaining} escaneo(s) para digitalizar tickets y facturas de compra.`,
        href: "/gastos/nuevo",
        actionLabel: "Escanear gasto",
      });
    }
  }

  return items;
}

function invoicePaymentRecommendations(
  documents: Document[],
  referenceDate: string,
): AppRecommendation[] {
  const items: AppRecommendation[] = [];
  const coveredIds = new Set<string>();

  const pending = documents.filter(isPendingInvoicePayment);

  for (const doc of pending) {
    const { total } = documentTotals(doc);
    const client = doc.client.name || "cliente";

    if (doc.dueDate) {
      const daysUntil = daysBetweenIso(referenceDate, doc.dueDate);
      const dueLabel = formatShortDate(doc.dueDate);

      if (daysUntil < 0) {
        coveredIds.add(doc.id);
        items.push({
          id: `invoice-overdue-${doc.id}`,
          priority: "critical",
          category: "invoices",
          title: `Factura impagada: ${doc.number}`,
          message: `${client} · ${formatMoney(total)} · venció el ${dueLabel}.`,
          href: `/facturas/${doc.id}`,
          actionLabel: "Recordar cobro",
        });
        continue;
      }

      if (daysUntil <= INVOICE_DUE_SOON_DAYS) {
        coveredIds.add(doc.id);
        items.push({
          id: `invoice-due-soon-${doc.id}`,
          priority: daysUntil <= 1 ? "warning" : "info",
          category: "invoices",
          title: `Cobro próximo: ${doc.number}`,
          message: `${client} · ${formatMoney(total)} · ${dueSoonLabel(daysUntil)} (${dueLabel}).`,
          href: `/facturas/${doc.id}`,
          actionLabel: "Ver factura",
        });
        continue;
      }
    }

    if (doc.status === "vencido") {
      coveredIds.add(doc.id);
      items.push({
        id: `invoice-unpaid-${doc.id}`,
        priority: "critical",
        category: "invoices",
        title: `Factura impagada: ${doc.number}`,
        message: `${client} · ${formatMoney(total)} · marcada como vencida.`,
        href: `/facturas/${doc.id}`,
        actionLabel: "Recordar cobro",
      });
    }
  }

  for (const doc of pending) {
    if (coveredIds.has(doc.id)) continue;

    const { total } = documentTotals(doc);
    const client = doc.client.name || "cliente";
    const daysSinceIssue = daysBetweenIso(doc.date, referenceDate);
    const issueLabel = formatShortDate(doc.date);

    let message = `${client} · ${formatMoney(total)} · emitida el ${issueLabel}`;
    if (doc.dueDate) {
      message += ` · vence el ${formatShortDate(doc.dueDate)}`;
    }

    items.push({
      id: `invoice-unpaid-${doc.id}`,
      priority:
        daysSinceIssue >= 30 ? "warning" : daysSinceIssue >= 14 ? "info" : "info",
      category: "invoices",
      title: `Pendiente de cobro: ${doc.number}`,
      message,
      href: `/facturas/${doc.id}`,
      actionLabel: "Recordar cobro",
    });
  }

  const unpaidTotal = pending.filter((doc) => !coveredIds.has(doc.id)).length;
  if (pending.length >= 3) {
    const totalAmount = pending.reduce(
      (sum, doc) => sum + documentTotals(doc).total,
      0,
    );
    items.unshift({
      id: "invoices-unpaid-summary",
      priority: "warning",
      category: "invoices",
      title: `${pending.length} facturas impagadas`,
      message: `Tienes ${formatMoney(totalAmount)} pendientes de cobro${unpaidTotal > 0 ? ` (${unpaidTotal} sin vencimiento próximo)` : ""}. Revisa cada una y envía recordatorio si hace falta.`,
      href: "/facturas",
      actionLabel: "Ver facturas",
    });
  }

  const oldDrafts = documents.filter(
    (doc) =>
      doc.status === "borrador" &&
      daysBetweenIso(doc.updatedAt.split("T")[0], referenceDate) >= 7,
  );

  if (oldDrafts.length > 0) {
    items.push({
      id: "drafts-old",
      priority: "tip",
      category: "invoices",
      title:
        oldDrafts.length === 1
          ? "Tienes un borrador sin terminar"
          : `Tienes ${oldDrafts.length} borradores sin terminar`,
      message: "Revisa tus borradores y emítelos o elimínalos para mantener el listado al día.",
      href: "/facturas",
      actionLabel: "Ver facturas",
    });
  }

  const pendingQuotes = documents.filter(
    (doc) => doc.type === "presupuesto" && doc.status === "enviado",
  );

  for (const doc of pendingQuotes.slice(0, 5)) {
    items.push({
      id: `quote-pending-${doc.id}`,
      priority: "info",
      category: "invoices",
      title: `Presupuesto pendiente: ${doc.number}`,
      message: `${doc.client.name || "Cliente"} aún no lo ha aceptado.`,
      href: `/presupuestos/${doc.id}`,
      actionLabel: "Ver presupuesto",
    });
  }

  if (pendingQuotes.length > 5) {
    items.push({
      id: "quotes-pending-more",
      priority: "tip",
      category: "invoices",
      title: "Más presupuestos en espera",
      message: `Hay ${pendingQuotes.length - 5} presupuesto(s) adicional(es) enviados sin respuesta.`,
      href: "/presupuestos",
      actionLabel: "Ver presupuestos",
    });
  }

  return items;
}

function expenseRecommendations(
  data: AppData,
  referenceDate: string,
): AppRecommendation[] {
  return getDueSoonRecurringAlerts(data, referenceDate).map((alert) => ({
    id: `recurring-${alert.templateId}-${alert.date}`,
    priority: alert.daysUntil <= 1 ? "warning" : "info",
    category: "expenses" as const,
    title: `Gasto fijo: ${alert.description}`,
    message: `${alert.supplierName} · ${formatMoney(alert.amount)} · ${formatShortDate(alert.date)} · ${dueSoonLabel(alert.daysUntil)}.`,
    href: "/gastos/fijos",
    actionLabel: "Ver gastos fijos",
  }));
}

function taxRecommendations(
  billing: RecommendationBillingContext | undefined,
  reference = new Date(),
): AppRecommendation[] {
  const upcoming = upcomingIvaDeadline(reference);
  if (!upcoming || !shouldShowDeadlineReminder(upcoming.daysLeft)) {
    return [];
  }

  const dueText = upcoming.dueDate.toLocaleDateString("es-ES", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const items: AppRecommendation[] = [
    {
      id: "tax-deadline",
      priority: upcoming.daysLeft <= 7 ? "warning" : "info",
      category: "tax",
      title: `Plazo IVA trimestral (${upcoming.label})`,
      message: `Presentación orientativa hasta el ${dueText} — te quedan ${upcoming.daysLeft} día(s).`,
      href: "/impuestos",
      actionLabel: "Ver resumen fiscal",
    },
  ];

  if (billing?.billingEnabled && !billing.quarterlyExport) {
    items.push({
      id: "tax-export-pro",
      priority: "tip",
      category: "tax",
      title: "Exporta el trimestre para tu gestor",
      message:
        "Con Pro puedes descargar el resumen trimestral en CSV antes de presentar el modelo 303.",
      href: "/precios",
      actionLabel: "Ver Pro",
    });
  }

  return items;
}

function syncRecommendations(
  cloud: RecommendationCloudContext | undefined,
  data: AppData,
): AppRecommendation[] {
  if (!cloud?.cloudEnabled) return [];

  const items: AppRecommendation[] = [];

  if (cloud.pendingChangeCount > 0) {
    items.push({
      id: "sync-pending",
      priority: "warning",
      category: "sync",
      title: "Cambios sin subir a la nube",
      message: `Tienes ${cloud.pendingChangeCount} cambio(s) pendiente(s) de sincronizar.`,
      href: "/configuracion",
      actionLabel: "Sincronizar",
    });
  }

  const hasData =
    data.documents.length > 0 ||
    data.expenses.length > 0 ||
    data.customers.length > 0;

  if (!cloud.hasUser && hasData) {
    items.push({
      id: "cloud-backup",
      priority: "info",
      category: "sync",
      title: "Protege tus datos en la nube",
      message:
        "Crea una cuenta para hacer copia de seguridad y acceder desde otros dispositivos.",
      href: "/configuracion",
      actionLabel: "Activar cuenta",
    });
  }

  return items;
}

function onboardingRecommendations(data: AppData): AppRecommendation[] {
  const profileReady = Boolean(data.profile.name.trim() && data.profile.nif.trim());
  if (!profileReady) return [];

  const items: AppRecommendation[] = [];

  if (data.customers.length === 0) {
    items.push({
      id: "onboarding-customers",
      priority: "tip",
      category: "onboarding",
      title: "Añade tu primer cliente",
      message: "Guardar clientes te ahorra tiempo al crear facturas y presupuestos.",
      href: "/clientes",
      actionLabel: "Ir a clientes",
    });
  }

  const hasInvoices = data.documents.some((doc) => doc.type === "factura");
  if (!hasInvoices && data.documents.length === 0) {
    items.push({
      id: "onboarding-first-invoice",
      priority: "tip",
      category: "onboarding",
      title: "Emite tu primera factura",
      message: "Empieza por una factura sencilla: la numeración se genera sola.",
      href: "/facturas/nuevo",
      actionLabel: "Nueva factura",
    });
  }

  if (
    data.recurringExpenses.length === 0 &&
    data.expenses.length >= 3
  ) {
    items.push({
      id: "onboarding-recurring",
      priority: "tip",
      category: "onboarding",
      title: "¿Tienes gastos que se repiten?",
      message:
        "Configura alquiler, seguros o suscripciones como gastos fijos y recibe avisos antes de que venzan.",
      href: "/gastos/fijos",
      actionLabel: "Crear gasto fijo",
    });
  }

  return items;
}

/** Recopila avisos y recomendaciones contextuales según el estado de la app. */
export function collectAppRecommendations(
  context: RecommendationContext,
): AppRecommendation[] {
  const referenceDate = todayIso(context.referenceDate);
  const reference = new Date(`${referenceDate}T12:00:00`);

  const items = [
    ...profileRecommendations(context.data),
    ...billingRecommendations(context.billing ?? defaultBilling(), context.scanQuota),
    ...invoicePaymentRecommendations(context.data.documents, referenceDate),
    ...expenseRecommendations(context.data, referenceDate),
    ...taxRecommendations(context.billing, reference),
    ...syncRecommendations(context.cloud, context.data),
    ...onboardingRecommendations(context.data),
  ];

  return sortRecommendations(items);
}

function defaultBilling(): RecommendationBillingContext {
  return {
    billingEnabled: false,
    plan: "pro",
    isPro: true,
    documentsThisMonth: 0,
    showUsageWarning: false,
    trialDaysLeft: null,
    quarterlyExport: true,
  };
}

export function recommendationCount(context: RecommendationContext): number {
  return collectAppRecommendations(context).length;
}

export function priorityStyles(priority: RecommendationPriority): {
  card: string;
  badge: string;
} {
  switch (priority) {
    case "critical":
      return {
        card: "border-red-200 bg-red-50",
        badge: "bg-red-600 text-white",
      };
    case "warning":
      return {
        card: "border-amber-200 bg-amber-50",
        badge: "bg-amber-600 text-white",
      };
    case "info":
      return {
        card: "border-sky-200 bg-sky-50",
        badge: "bg-sky-600 text-white",
      };
    case "tip":
      return {
        card: "border-slate-200 bg-slate-50",
        badge: "bg-slate-600 text-white",
      };
  }
}

export const CATEGORY_LABELS: Record<RecommendationCategory, string> = {
  profile: "Perfil",
  billing: "Plan y límites",
  invoices: "Facturas y cobros",
  expenses: "Gastos",
  tax: "Impuestos",
  sync: "Copia en la nube",
  onboarding: "Primeros pasos",
};
