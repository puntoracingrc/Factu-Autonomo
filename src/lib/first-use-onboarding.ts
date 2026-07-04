import { isBusinessProfileReadyForIssuedInvoices } from "@/lib/business-profile";
import type { AppData } from "@/lib/types";

export type FirstUseStepId = "email" | "profile" | "document";

export interface FirstUseStep {
  id: FirstUseStepId;
  title: string;
  description: string;
  actionLabel: string;
  href: string;
  done: boolean;
  current: boolean;
}

export interface FirstUseOnboardingState {
  visible: boolean;
  completedCount: number;
  totalCount: number;
  emailConfirmed: boolean;
  profileReady: boolean;
  hasFirstDocument: boolean;
  steps: FirstUseStep[];
}

export function hasFirstBusinessDocument(data: AppData): boolean {
  return data.documents.some((doc) =>
    ["factura", "presupuesto", "recibo"].includes(doc.type),
  );
}

export function buildFirstUseOnboardingState({
  data,
  demoMode,
  emailConfirmed,
  hasUser,
}: {
  data: AppData;
  demoMode: boolean;
  emailConfirmed: boolean;
  hasUser: boolean;
}): FirstUseOnboardingState {
  const profileReady = isBusinessProfileReadyForIssuedInvoices(data.profile);
  const hasFirstDocument = hasFirstBusinessDocument(data);

  const baseSteps: Array<Omit<FirstUseStep, "current">> = [
    {
      id: "email",
      title: emailConfirmed ? "Cuenta activada" : "Confirma tu email",
      description: emailConfirmed
        ? "La cuenta ya puede usar nube y acciones reales."
        : "Activa la cuenta desde el correo de Supabase para desbloquear nube y acciones reales.",
      actionLabel: emailConfirmed ? "Ver cuenta" : "Ir a cuenta",
      href: "/cuenta#inicio-sesion",
      done: emailConfirmed,
    },
    {
      id: "profile",
      title: profileReady ? "Negocio preparado" : "Datos de tu negocio",
      description: profileReady
        ? "Los datos fiscales básicos ya están listos para documentos reales."
        : "Completa nombre fiscal, NIF, dirección, código postal y ciudad una sola vez.",
      actionLabel: profileReady ? "Ver ajustes" : "Completar datos",
      href: "/configuracion#ajustes-negocio",
      done: profileReady,
    },
    {
      id: "document",
      title: hasFirstDocument ? "Primer documento creado" : "Primera factura",
      description: hasFirstDocument
        ? "Ya hay actividad real en esta cuenta."
        : "No hace falta crear cliente antes: rellena sus datos en la factura y se guarda solo.",
      actionLabel: hasFirstDocument ? "Ver facturas" : "Crear factura",
      href: hasFirstDocument ? "/facturas" : "/facturas/nuevo",
      done: hasFirstDocument,
    },
  ];

  const firstPending = baseSteps.find((step) => !step.done)?.id ?? null;
  const steps = baseSteps.map((step) => ({
    ...step,
    current: step.id === firstPending,
  }));

  return {
    visible: hasUser && !demoMode && steps.some((step) => !step.done),
    completedCount: steps.filter((step) => step.done).length,
    totalCount: steps.length,
    emailConfirmed,
    profileReady,
    hasFirstDocument,
    steps,
  };
}
