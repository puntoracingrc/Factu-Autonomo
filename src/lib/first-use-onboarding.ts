import { isBusinessProfileReadyForIssuedInvoices } from "@/lib/business-profile";
import type { AppData } from "@/lib/types";

export type FirstUseStepId = "email" | "profile" | "document";

export const FIRST_USE_ONBOARDING_PROFILE_SECTION_ID = "ajustes-negocio";
export const FIRST_USE_ONBOARDING_PROFILE_SOURCE_PARAM = "origen";
export const FIRST_USE_ONBOARDING_PROFILE_SOURCE_VALUE = "primeros-pasos";
export const FIRST_USE_ONBOARDING_PROFILE_SAVED_PARAM = "primerosPasos";
export const FIRST_USE_ONBOARDING_PROFILE_SAVED_VALUE =
  "datos-negocio-guardados";
export const FIRST_USE_ONBOARDING_DOCUMENT_DISMISSED_STORAGE_PREFIX =
  "factu:first-use-onboarding:first-document-dismissed";

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
  firstDocumentStepDismissed: boolean;
  steps: FirstUseStep[];
}

export function firstUseBusinessProfileHref(): string {
  const params = new URLSearchParams({
    [FIRST_USE_ONBOARDING_PROFILE_SOURCE_PARAM]:
      FIRST_USE_ONBOARDING_PROFILE_SOURCE_VALUE,
  });
  return `/configuracion?${params.toString()}#${FIRST_USE_ONBOARDING_PROFILE_SECTION_ID}`;
}

export function firstUseProfileSavedHref(): string {
  const params = new URLSearchParams({
    [FIRST_USE_ONBOARDING_PROFILE_SAVED_PARAM]:
      FIRST_USE_ONBOARDING_PROFILE_SAVED_VALUE,
  });
  return `/?${params.toString()}`;
}

export function firstUseDocumentDismissedStorageKey(userId: string): string {
  return `${FIRST_USE_ONBOARDING_DOCUMENT_DISMISSED_STORAGE_PREFIX}:${userId}`;
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
  firstDocumentStepDismissed = false,
  hasUser,
}: {
  data: AppData;
  demoMode: boolean;
  emailConfirmed: boolean;
  firstDocumentStepDismissed?: boolean;
  hasUser: boolean;
}): FirstUseOnboardingState {
  const profileReady = isBusinessProfileReadyForIssuedInvoices(data.profile);
  const hasFirstDocument = hasFirstBusinessDocument(data);
  const documentStepDismissed =
    profileReady && Boolean(firstDocumentStepDismissed);
  const documentDone = hasFirstDocument || documentStepDismissed;

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
      href: firstUseBusinessProfileHref(),
      done: profileReady,
    },
    {
      id: "document",
      title: hasFirstDocument ? "Primer documento creado" : "Primera factura",
      description: hasFirstDocument
        ? "Ya hay actividad real en esta cuenta."
        : profileReady
        ? "La ficha de cliente se crea sola al rellenar los datos en una nueva factura. Si lo deseas, omite este paso y ya puedes navegar por tu nuevo software."
        : "No hace falta crear cliente antes: rellena sus datos en la factura y se guarda solo.",
      actionLabel: hasFirstDocument ? "Ver facturas" : "Crear factura",
      href: hasFirstDocument ? "/facturas" : "/facturas/nuevo",
      done: documentDone,
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
    firstDocumentStepDismissed: documentStepDismissed,
    steps,
  };
}
