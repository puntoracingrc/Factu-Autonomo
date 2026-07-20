import { describe, expect, it } from "vitest";
import {
  buildFirstUseOnboardingState,
  firstUseDriveDismissedStorageKey,
  firstUseDocumentDismissedStorageKey,
  firstUseBusinessProfileHref,
  firstUseProfileSavedHref,
  hasFirstBusinessDocument,
  shouldShowFirstUseDriveBackup,
} from "./first-use-onboarding";
import type { AppData, Document } from "./types";
import { EMPTY_DATA } from "./types";

function baseData(): AppData {
  return {
    ...EMPTY_DATA,
    profile: { ...EMPTY_DATA.profile },
    documents: [],
    expenses: [],
    recurringExpenses: [],
    userReminders: [],
    suppliers: [],
    products: [],
    customers: [],
    counters: { ...EMPTY_DATA.counters },
  };
}

function readyProfile(data: AppData): AppData {
  return {
    ...data,
    profile: {
      ...data.profile,
      name: "Ana Garcia",
      nif: "12345678Z",
      address: "Calle Mayor 1",
      postalCode: "28001",
      city: "Madrid",
    },
  };
}

function invoice(): Document {
  return {
    id: "invoice-1",
    type: "factura",
    number: "F-2026-0001",
    date: "2026-07-04",
    client: { name: "Cliente Demo" },
    items: [],
    status: "borrador",
    createdAt: "2026-07-04T10:00:00.000Z",
    updatedAt: "2026-07-04T10:00:00.000Z",
  };
}

describe("first-use onboarding", () => {
  it("no aparece sin usuario o en demo", () => {
    const data = baseData();

    expect(
      buildFirstUseOnboardingState({
        data,
        demoMode: false,
        emailConfirmed: true,
        hasUser: false,
      }).visible,
    ).toBe(false);
    expect(
      buildFirstUseOnboardingState({
        data,
        demoMode: true,
        emailConfirmed: true,
        hasUser: true,
      }).visible,
    ).toBe(false);
  });

  it("marca el email como primer paso si la cuenta no esta confirmada", () => {
    const state = buildFirstUseOnboardingState({
      data: baseData(),
      demoMode: false,
      emailConfirmed: false,
      hasUser: true,
    });

    expect(state.visible).toBe(true);
    expect(state.steps[0]).toMatchObject({
      id: "email",
      current: true,
      done: false,
      href: "/cuenta#inicio-sesion",
    });
  });

  it("guia hacia datos de negocio y factura sin cliente previo", () => {
    const state = buildFirstUseOnboardingState({
      data: baseData(),
      demoMode: false,
      emailConfirmed: true,
      hasUser: true,
    });

    expect(state.visible).toBe(true);
    expect(state.steps[1]).toMatchObject({
      id: "profile",
      current: true,
      href: firstUseBusinessProfileHref(),
    });
    expect(firstUseBusinessProfileHref()).toBe(
      "/configuracion?origen=primeros-pasos#ajustes-negocio",
    );
    expect(firstUseProfileSavedHref()).toBe(
      "/?primerosPasos=datos-negocio-guardados",
    );
    expect(state.steps[2].description).toContain(
      "No hace falta crear cliente antes",
    );
  });

  it("marca los datos de negocio como completos cuando los campos obligatorios estan guardados", () => {
    const state = buildFirstUseOnboardingState({
      data: readyProfile(baseData()),
      demoMode: false,
      emailConfirmed: true,
      hasUser: true,
    });

    expect(state.visible).toBe(true);
    expect(state.completedCount).toBe(2);
    expect(state.profileReady).toBe(true);
    expect(state.steps[1]).toMatchObject({
      id: "profile",
      title: "Negocio preparado",
      done: true,
      current: false,
    });
    expect(state.steps[2]).toMatchObject({
      id: "document",
      done: false,
      current: true,
    });
    expect(state.steps[2].description).toContain(
      "La ficha de cliente se crea sola",
    );
    expect(state.steps[2].description).toContain(
      "omite este paso y ya puedes navegar",
    );
  });

  it("permite cerrar los primeros pasos al crear u omitir la primera factura", () => {
    const state = buildFirstUseOnboardingState({
      data: readyProfile(baseData()),
      demoMode: false,
      emailConfirmed: true,
      firstDocumentStepDismissed: true,
      hasUser: true,
    });

    expect(firstUseDocumentDismissedStorageKey("user-123")).toBe(
      "factu:first-use-onboarding:first-document-dismissed:user-123",
    );
    expect(state.visible).toBe(false);
    expect(state.completedCount).toBe(3);
    expect(state.hasFirstDocument).toBe(false);
    expect(state.firstDocumentStepDismissed).toBe(true);
    expect(state.steps[2]).toMatchObject({
      id: "document",
      done: true,
      current: false,
    });
  });

  it("separa por usuario la decision de omitir la copia extra en Drive", () => {
    expect(firstUseDriveDismissedStorageKey("user-123")).toBe(
      "factu:first-use-onboarding:drive-backup-dismissed:user-123",
    );
  });

  it("muestra la sugerencia de Drive solo cuando sigue pendiente", () => {
    const pending = {
      dismissed: false,
      driveConfigured: true,
      driveEnabled: false,
      hydrated: true,
    };

    expect(shouldShowFirstUseDriveBackup(pending)).toBe(true);
    expect(
      shouldShowFirstUseDriveBackup({ ...pending, hydrated: false }),
    ).toBe(false);
    expect(
      shouldShowFirstUseDriveBackup({ ...pending, driveConfigured: false }),
    ).toBe(false);
    expect(
      shouldShowFirstUseDriveBackup({ ...pending, dismissed: true }),
    ).toBe(false);
    expect(
      shouldShowFirstUseDriveBackup({ ...pending, driveEnabled: true }),
    ).toBe(false);
  });

  it("desaparece cuando la cuenta ya tiene perfil y primer documento", () => {
    const data = readyProfile(baseData());
    data.documents = [invoice()];

    const state = buildFirstUseOnboardingState({
      data,
      demoMode: false,
      emailConfirmed: true,
      hasUser: true,
    });

    expect(hasFirstBusinessDocument(data)).toBe(true);
    expect(state.visible).toBe(false);
    expect(state.completedCount).toBe(3);
  });
});
