import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { DOCUMENT_EMPTY_ACTION_LABELS } from "./document-list-copy";
import { normalizeFactuEmptyActionCopy } from "./factu/action-copy";
import { FACTU_EMPTY_MESSAGES } from "./factu/copy";
import { FACTU_EMPTY_TITLES } from "./factu/empty-state-copy";
import {
  HOME_CREATE_ACTIONS,
  HOME_REVIEW_ACTIONS,
} from "./product-home-actions";
import {
  canConvertQuoteToInvoice,
  findInvoiceCreatedFromQuote,
} from "./quote-to-invoice";
import type { Document } from "./types";

const quote: Document = {
  id: "quote",
  type: "presupuesto",
  number: "P-2026-0001",
  date: "2026-06-27",
  client: { name: "Ana Garcia" },
  items: [],
  status: "borrador",
  createdAt: "2026-06-27T10:00:00.000Z",
  updatedAt: "2026-06-27T10:00:00.000Z",
};

const invoice: Document = {
  ...quote,
  id: "invoice",
  type: "factura",
  number: "F-2026-0001",
};

describe("MVP usability polish", () => {
  it("expone acciones principales de entrada para crear y revisar", () => {
    expect(HOME_CREATE_ACTIONS.map((action) => action.label)).toEqual([
      "Nuevo cliente",
    ]);
    expect(HOME_CREATE_ACTIONS.map((action) => action.href)).toEqual([
      "/clientes/nuevo?from=/",
    ]);
    expect(HOME_REVIEW_ACTIONS.map((action) => action.label)).toEqual(
      expect.arrayContaining([
        "Ver clientes",
        "Ver presupuestos",
        "Ver facturas",
      ]),
    );
  });

  it("mantiene estados vacios con CTA claro", () => {
    expect(FACTU_EMPTY_TITLES).toMatchObject({
      cliente: "Aún no tienes clientes",
      presupuesto: "Aún no tienes presupuestos",
      factura: "Aún no tienes facturas",
    });
    expect(FACTU_EMPTY_MESSAGES.cliente).toContain("Aún no tienes clientes");
    expect(FACTU_EMPTY_MESSAGES.presupuesto).toContain(
      "Aún no tienes presupuestos",
    );
    expect(FACTU_EMPTY_MESSAGES.factura).toContain("Aún no tienes facturas");
    expect(DOCUMENT_EMPTY_ACTION_LABELS).toMatchObject({
      factura: "Crear factura",
      presupuesto: "Crear presupuesto",
    });
  });

  it("normaliza el CTA del estado vacio de clientes", () => {
    const action = normalizeFactuEmptyActionCopy(
      "cliente",
      createElement("button", null, "Nuevo cliente"),
    );
    const html = renderToStaticMarkup(createElement("div", null, action));

    expect(html).toContain("Crear cliente");
    expect(html).not.toContain(">Nuevo cliente<");
  });

  it("mantiene convertir a factura solo para presupuestos activos", () => {
    expect(canConvertQuoteToInvoice(quote)).toBe(true);
    expect(canConvertQuoteToInvoice(invoice)).toBe(false);
    expect(canConvertQuoteToInvoice({ ...quote, status: "anulada" })).toBe(
      false,
    );
    expect(canConvertQuoteToInvoice({ ...quote, status: "rechazado" })).toBe(
      false,
    );
  });

  it("reconoce presupuestos ya convertidos a factura", () => {
    const converted = {
      ...invoice,
      sourceQuoteDocumentId: quote.id,
      sourceQuoteNumber: quote.number,
    };

    expect(findInvoiceCreatedFromQuote([quote, converted], quote.id)).toBe(
      converted,
    );
  });

  it("evita claims prohibidos en copy de uso diario", () => {
    const serialized = JSON.stringify({
      empty: FACTU_EMPTY_MESSAGES,
      create: HOME_CREATE_ACTIONS.map((action) => action.label),
      review: HOME_REVIEW_ACTIONS.map((action) => action.label),
      documentActions: DOCUMENT_EMPTY_ACTION_LABELS,
    });

    expect(serialized).not.toContain("AEAT validado");
    expect(serialized).not.toContain("QR oficial");
    expect(serialized).not.toContain("cumplimiento garantizado");
    expect(serialized).not.toContain("VeriFactu productivo");
  });

  it("mantiene foco visible y etiquetas en acciones compactas", () => {
    const buttonSource = readFileSync(
      new URL("../components/ui/Button.tsx", import.meta.url),
      "utf8",
    );
    const iconActionSource = readFileSync(
      new URL("../components/ui/IconAction.tsx", import.meta.url),
      "utf8",
    );

    expect(buttonSource).toContain("focus-visible:outline");
    expect(iconActionSource).toContain("focus-visible:outline");
    expect(iconActionSource).toContain("MobileLabel");
  });

  it("mantiene una pista visual de desplazamiento en el menu movil", () => {
    const appShellSource = readFileSync(
      new URL("../components/layout/AppShell.tsx", import.meta.url),
      "utf8",
    );

    expect(appShellSource).toContain("nav-scroll");
    expect(appShellSource).toContain("canScrollLeft");
    expect(appShellSource).toContain("canScrollRight");
    expect(appShellSource).toContain("Ver opciones anteriores del menú");
    expect(appShellSource).toContain("Ver más opciones del menú");
    expect(appShellSource).toContain("ChevronLeft");
    expect(appShellSource).toContain("ChevronRight");
    expect(appShellSource).toContain("bg-gradient-to-l");
    expect(appShellSource).toContain("bg-gradient-to-r");
    expect(appShellSource).toContain("sm:hidden");
  });

  it("distingue exportacion gratis de importador Pro en cuenta", () => {
    const cloudAccountSource = readFileSync(
      new URL("../components/cloud/CloudAccountCard.tsx", import.meta.url),
      "utf8",
    );

    expect(cloudAccountSource).toContain("importador de datos");
    expect(cloudAccountSource).toContain("exportar una copia manual");
    expect(cloudAccountSource).not.toContain("exportar/importar copia");
  });

  it("lleva el inicio de sesion directamente a la seccion de cuenta", () => {
    const appShellSource = readFileSync(
      new URL("../components/layout/AppShell.tsx", import.meta.url),
      "utf8",
    );
    const authCallbackSource = readFileSync(
      new URL("../app/auth/callback/page.tsx", import.meta.url),
      "utf8",
    );
    const cloudAccountSource = readFileSync(
      new URL("../components/cloud/CloudAccountCard.tsx", import.meta.url),
      "utf8",
    );

    expect(appShellSource).toContain('href="/cuenta#inicio-sesion"');
    expect(authCallbackSource).toContain("/cuenta?auth=");
    expect(authCallbackSource).toContain("#inicio-sesion");
    expect(cloudAccountSource).toContain('id="inicio-sesion"');
  });

  it("permite volver al inicio publico aunque haya datos locales sin sesion", () => {
    const appShellSource = readFileSync(
      new URL("../components/layout/AppShell.tsx", import.meta.url),
      "utf8",
    );
    const conditionalShellSource = readFileSync(
      new URL("../components/layout/ConditionalAppShell.tsx", import.meta.url),
      "utf8",
    );
    const landingSource = readFileSync(
      new URL("../components/marketing/PublicLanding.tsx", import.meta.url),
      "utf8",
    );

    expect(appShellSource).toContain('href="/inicio"');
    expect(appShellSource).toContain("Volver al inicio");
    expect(conditionalShellSource).toContain('pathname === "/inicio"');
    expect(landingSource).toContain('href="/inicio"');
  });

  it("explica el modo local sin sesion y envia altas a crear cuenta", () => {
    const guestBannerSource = readFileSync(
      new URL("../components/cloud/GuestLocalDataBanner.tsx", import.meta.url),
      "utf8",
    );
    const appShellSource = readFileSync(
      new URL("../components/layout/AppShell.tsx", import.meta.url),
      "utf8",
    );
    const cloudAccountSource = readFileSync(
      new URL("../components/cloud/CloudAccountCard.tsx", import.meta.url),
      "utf8",
    );
    const landingSource = readFileSync(
      new URL("../components/marketing/PublicLanding.tsx", import.meta.url),
      "utf8",
    );
    const documentShareSource = readFileSync(
      new URL(
        "../components/documents/DocumentShareActions.tsx",
        import.meta.url,
      ),
      "utf8",
    );
    const paymentReminderSource = readFileSync(
      new URL(
        "../components/documents/PaymentReminderButton.tsx",
        import.meta.url,
      ),
      "utf8",
    );

    expect(appShellSource).toContain("GuestLocalDataBanner");
    expect(guestBannerSource).toContain("Estás probando sin cuenta");
    expect(guestBannerSource).toContain(
      "Tienes datos guardados solo en este navegador",
    );
    expect(guestBannerSource).toContain("Crear cuenta gratis");
    expect(guestBannerSource).toContain("Seguir probando");
    expect(guestBannerSource).toContain("/cuenta?modo=crear#inicio-sesion");
    expect(cloudAccountSource).toContain(
      "Hemos encontrado datos en este navegador",
    );
    expect(cloudAccountSource).toContain('requestedMode === "crear"');
    expect(landingSource).toContain("/cuenta?modo=crear#inicio-sesion");
    expect(documentShareSource).toContain(
      "Inicia sesión para enviar documentos reales",
    );
    expect(paymentReminderSource).toContain(
      "Inicia sesión para enviar recordatorios reales",
    );
  });

  it("muestra terminos solo en el modo de crear cuenta", () => {
    const cloudAccountSource = readFileSync(
      new URL("../components/cloud/CloudAccountCard.tsx", import.meta.url),
      "utf8",
    );

    expect(cloudAccountSource).toContain('authMode === "signup"');
    expect(cloudAccountSource).toContain("Al crear cuenta acepto");
    expect(cloudAccountSource).not.toContain("Al iniciar sesión acepto");
  });

  it("pide permiso antes de subir datos locales a una cuenta", () => {
    const cloudAccountSource = readFileSync(
      new URL("../components/cloud/CloudAccountCard.tsx", import.meta.url),
      "utf8",
    );
    const cloudContextSource = readFileSync(
      new URL("../context/CloudSyncContext.tsx", import.meta.url),
      "utf8",
    );
    const guestBannerSource = readFileSync(
      new URL("../components/cloud/GuestLocalDataBanner.tsx", import.meta.url),
      "utf8",
    );

    expect(cloudContextSource).toContain("localDataHandoffStatus");
    expect(cloudContextSource).toContain("hasUndecidedLocalData");
    expect(cloudContextSource).toContain("allowLocalDataUpload");
    expect(cloudContextSource).toContain("saveLocalDataToAccount");
    expect(cloudContextSource).toContain("keepLocalDataOnDevice");
    expect(cloudContextSource).not.toContain("Sesión iniciada — sincronizando");
    expect(cloudAccountSource).toContain("Datos locales encontrados");
    expect(cloudAccountSource).toContain("Guardar estos datos en mi cuenta");
    expect(cloudAccountSource).toContain("Descargar copia antes de continuar");
    expect(cloudAccountSource).toContain("Seguir solo en este navegador");
    expect(cloudAccountSource).toContain(
      "te preguntaremos si quieres guardarlos",
    );
    expect(guestBannerSource).toContain(
      "te preguntaremos si quieres guardarlos",
    );
  });

  it("bloquea nube y acciones reales hasta confirmar email", () => {
    const cloudContextSource = readFileSync(
      new URL("../context/CloudSyncContext.tsx", import.meta.url),
      "utf8",
    );
    const cloudAccountSource = readFileSync(
      new URL("../components/cloud/CloudAccountCard.tsx", import.meta.url),
      "utf8",
    );
    const documentShareSource = readFileSync(
      new URL(
        "../components/documents/DocumentShareActions.tsx",
        import.meta.url,
      ),
      "utf8",
    );
    const paymentReminderSource = readFileSync(
      new URL(
        "../components/documents/PaymentReminderButton.tsx",
        import.meta.url,
      ),
      "utf8",
    );
    const paymentReminderClientSource = readFileSync(
      new URL("../lib/payment-reminder-client.ts", import.meta.url),
      "utf8",
    );
    const paymentReminderRouteSource = readFileSync(
      new URL("../app/api/email/payment-reminder/route.ts", import.meta.url),
      "utf8",
    );
    const driveTokenRouteSource = readFileSync(
      new URL("../app/api/google-drive/token/route.ts", import.meta.url),
      "utf8",
    );
    const serverAuthSource = readFileSync(
      new URL("../lib/billing/server-auth.ts", import.meta.url),
      "utf8",
    );
    const serverDocumentsRouteSource = readFileSync(
      new URL("../lib/server-documents/route-handler.ts", import.meta.url),
      "utf8",
    );
    const driveBackupSource = readFileSync(
      new URL("../components/cloud/GoogleDriveBackupCard.tsx", import.meta.url),
      "utf8",
    );

    expect(cloudContextSource).toContain("emailConfirmed");
    expect(cloudContextSource).toContain("requiresEmailConfirmation");
    expect(cloudContextSource).toContain("EMAIL_CONFIRMATION_REQUIRED_MESSAGE");
    expect(cloudAccountSource).toContain("Email pendiente de confirmar");
    expect(documentShareSource).toContain(
      "Confirma tu email para enviar documentos reales",
    );
    expect(paymentReminderSource).toContain(
      "Confirma tu email para enviar recordatorios reales",
    );
    expect(paymentReminderClientSource).toContain("Authorization");
    expect(paymentReminderRouteSource).toContain("requireEmailConfirmed: true");
    expect(driveTokenRouteSource).toContain("requireEmailConfirmed: true");
    expect(serverAuthSource).toContain("isUserEmailConfirmed");
    expect(serverDocumentsRouteSource).toContain("requireEmailConfirmed: true");
    expect(driveBackupSource).toContain("Confirma tu email para activar Drive");
  });

  it("presenta la demo como sandbox separado y reiniciable", () => {
    const homePageSource = readFileSync(
      new URL("../app/page.tsx", import.meta.url),
      "utf8",
    );
    const landingSource = readFileSync(
      new URL("../components/marketing/PublicLanding.tsx", import.meta.url),
      "utf8",
    );
    const demoBannerSource = readFileSync(
      new URL("../components/demo/DemoModeBanner.tsx", import.meta.url),
      "utf8",
    );
    const demoPanelSource = readFileSync(
      new URL("../components/demo/DemoSandboxPanel.tsx", import.meta.url),
      "utf8",
    );
    const demoWorkspaceSource = readFileSync(
      new URL("../lib/demo-workspace.ts", import.meta.url),
      "utf8",
    );
    const storageSource = readFileSync(
      new URL("../lib/storage.ts", import.meta.url),
      "utf8",
    );

    expect(homePageSource).toContain("DemoSandboxPanel");
    expect(landingSource).toContain("Demo sin registro");
    expect(demoBannerSource).toContain("Sandbox separado");
    expect(demoBannerSource).toContain("Reiniciar demo");
    expect(demoPanelSource).toContain("Sandbox de prueba");
    expect(demoPanelSource).toContain("Estás viendo una empresa ficticia");
    expect(demoPanelSource).toContain("Abrir factura pendiente");
    expect(demoPanelSource).toContain("Ver presupuesto aceptado");
    expect(demoPanelSource).toContain("Registrar gasto ficticio");
    expect(demoPanelSource).toContain("createDemoWorkspaceData");
    expect(demoPanelSource).toContain("resetDemoWorkspaceData");
    expect(demoPanelSource).toContain("/cuenta?modo=crear#inicio-sesion");
    expect(demoWorkspaceSource).toContain("DEMO_WORKSPACE_STORAGE_KEY");
    expect(storageSource).toContain("isDemoWorkspaceMode()");
  });

  it("prepara Google como acceso opcional sin pedir Drive todavia", () => {
    const cloudAccountSource = readFileSync(
      new URL("../components/cloud/CloudAccountCard.tsx", import.meta.url),
      "utf8",
    );
    const driveBackupSource = readFileSync(
      new URL("../components/cloud/GoogleDriveBackupCard.tsx", import.meta.url),
      "utf8",
    );
    const driveConfigSource = readFileSync(
      new URL("../lib/google-drive/config.ts", import.meta.url),
      "utf8",
    );
    const driveBackupLibSource = readFileSync(
      new URL("../lib/google-drive/backup.ts", import.meta.url),
      "utf8",
    );
    const cloudContextSource = readFileSync(
      new URL("../context/CloudSyncContext.tsx", import.meta.url),
      "utf8",
    );
    const supabaseConfigSource = readFileSync(
      new URL("../lib/supabase/config.ts", import.meta.url),
      "utf8",
    );
    const googleAuthConfigSource = readFileSync(
      new URL("../lib/google-auth/config.ts", import.meta.url),
      "utf8",
    );
    const googleAuthBrowserSource = readFileSync(
      new URL("../lib/google-auth/browser.ts", import.meta.url),
      "utf8",
    );
    const googleAuthCallbackSource = readFileSync(
      new URL("../app/google-auth/callback/page.tsx", import.meta.url),
      "utf8",
    );

    expect(supabaseConfigSource).toContain("NEXT_PUBLIC_GOOGLE_AUTH_ENABLED");
    expect(googleAuthConfigSource).toContain(
      "NEXT_PUBLIC_GOOGLE_AUTH_CLIENT_ID",
    );
    expect(cloudAccountSource).toContain("googleAuthEnabled");
    expect(cloudAccountSource).toContain("Continuar con Google");
    expect(cloudAccountSource).toContain("Crear cuenta con Google");
    expect(cloudAccountSource).toContain(
      "Google solo se usa para iniciar sesión",
    );
    expect(cloudContextSource).toContain("startGoogleLoginRedirect");
    expect(googleAuthBrowserSource).toContain("accounts.google.com/gsi/client");
    expect(googleAuthBrowserSource).toContain("openid email profile");
    expect(googleAuthBrowserSource).toContain("include_granted_scopes: false");
    expect(googleAuthBrowserSource).toContain('ux_mode: "redirect"');
    expect(googleAuthBrowserSource).toContain("/google-auth/callback");
    expect(googleAuthBrowserSource).toContain("initCodeClient");
    expect(googleAuthCallbackSource).toContain("/api/google-auth/token");
    expect(googleAuthCallbackSource).toContain("signInWithIdToken");
    expect(googleAuthCallbackSource).toContain('provider: "google"');
    expect(googleAuthCallbackSource).toContain("token: payload.idToken");
    expect(googleAuthConfigSource).not.toContain("GOOGLE_DRIVE_CLIENT_ID");
    expect(googleAuthConfigSource).not.toContain(
      "NEXT_PUBLIC_GOOGLE_DRIVE_CLIENT_ID",
    );
    expect(cloudContextSource).not.toContain("drive.file");
    expect(cloudContextSource).not.toContain("drive.metadata");
    expect(driveConfigSource).toContain("NEXT_PUBLIC_GOOGLE_DRIVE_CLIENT_ID");
    expect(driveBackupSource).toContain("Copia extra en Google Drive");
    expect(driveBackupSource).toContain("Drive no sirve para iniciar sesión");
    expect(driveBackupSource).toContain("Google pedirá el permiso limitado");
    expect(driveBackupSource).toContain("Drive necesita reconectar");
    expect(driveBackupSource).toContain("Reconectar Drive");
    expect(driveBackupSource).toContain("clearDriveAccessToken");
    expect(driveBackupLibSource).toContain(
      "https://www.googleapis.com/auth/drive.file",
    );
    expect(driveBackupLibSource).toContain("/drive/callback");
    expect(driveBackupLibSource).toContain("response_type");
    expect(driveBackupLibSource).toContain("code");
  });

  it("muestra invitacion con CTA real cuando falta sesion", () => {
    const referralSource = readFileSync(
      new URL("../components/referrals/ReferralCard.tsx", import.meta.url),
      "utf8",
    );

    expect(referralSource).toContain("if (!user)");
    expect(referralSource).toContain('href="/cuenta?modo=crear#inicio-sesion"');
    expect(referralSource).toContain("Crear cuenta");
    expect(referralSource).not.toContain("Crea cuenta abajo");
  });

  it("mantiene accesos de configuracion como pastillas compactas", () => {
    const settingsSource = readFileSync(
      new URL("../app/configuracion/page.tsx", import.meta.url),
      "utf8",
    );
    const verifactuSource = readFileSync(
      new URL(
        "../components/verifactu/VerifactuSettingsCard.tsx",
        import.meta.url,
      ),
      "utf8",
    );

    expect(settingsSource).toContain("rounded-full");
    expect(settingsSource).toContain("flex flex-wrap gap-2");
    expect(settingsSource).toContain("openSectionFromHash");
    expect(settingsSource).toContain("hashchange");
    expect(settingsSource).toContain("scrollIntoView");
    expect(settingsSource).not.toContain("Datos, logo y contacto");
    expect(settingsSource).not.toContain("Plan, datos y ayuda");
    expect(settingsSource).not.toContain("Plan por fases");
    expect(settingsSource).not.toContain("Cómo usar la app");
    expect(settingsSource).not.toContain("docs/FASES.md");
    expect(settingsSource).toContain('href="/cuenta"');
    expect(settingsSource).toContain("Abrir Cuenta");
    expect(settingsSource).toContain("copia extra en Drive");
    expect(verifactuSource).toContain("Conexión con AEAT");
    expect(verifactuSource).toContain("Modo simulado");
    expect(verifactuSource).toContain("no guarda ni muestra claves privadas");
    expect(verifactuSource).not.toContain("docs/FASES.md");
  });

  it("mantiene accesos rapidos de cuenta hacia sus secciones", () => {
    const accountPageSource = readFileSync(
      new URL("../app/cuenta/page.tsx", import.meta.url),
      "utf8",
    );

    expect(accountPageSource).toContain("Opciones de cuenta");
    expect(accountPageSource).toContain("flex flex-wrap gap-2");
    expect(accountPageSource).toContain("#inicio-sesion");
    expect(accountPageSource).toContain("#drive-backup");
    expect(accountPageSource).toContain("#importar-datos");
    expect(accountPageSource).toContain("#datos-privacidad");
    expect(accountPageSource).toContain("#legal-privacidad");
    expect(accountPageSource).not.toContain("#manual-cuenta");
    expect(accountPageSource).not.toContain("#instalar-app");
    expect(accountPageSource).not.toContain("ManualHelpLink");
    expect(accountPageSource).not.toContain("InstallAppCard");
    expect(accountPageSource).toContain('id="importar-datos"');
    expect(accountPageSource).toContain('id="datos-privacidad"');
    expect(accountPageSource).toContain('id="legal-privacidad"');
  });

  it("encapsula acciones y filtros de clientes en bloques separados", () => {
    const customersPageSource = readFileSync(
      new URL("../app/clientes/page.tsx", import.meta.url),
      "utf8",
    );
    const customerSearchSource = readFileSync(
      new URL("../components/clients/CustomerListSearch.tsx", import.meta.url),
      "utf8",
    );

    expect(customersPageSource).toContain("Acciones");
    expect(customersPageSource).toContain("Buscar y ordenar");
    expect(customersPageSource).toContain(
      '<Card className="mb-4 space-y-2 p-4">',
    );
    expect(customersPageSource).toContain('<Card className="space-y-3 p-4">');
    expect(customerSearchSource).not.toContain("relative mb-4");
  });

  it("evita overflow movil con clientes de texto largo", () => {
    const customersPageSource = readFileSync(
      new URL("../app/clientes/page.tsx", import.meta.url),
      "utf8",
    );

    expect(customersPageSource).toContain("min-w-0 flex-1");
    expect(customersPageSource).toContain("break-words font-bold");
    expect(customersPageSource).toContain("inline-flex min-w-0 max-w-full");
    expect(customersPageSource).toContain("break-words text-sm text-slate-400");
  });

  it("carga clientes por bloques para listas grandes", () => {
    const customersPageSource = readFileSync(
      new URL("../app/clientes/page.tsx", import.meta.url),
      "utf8",
    );

    expect(customersPageSource).toContain("CUSTOMER_LIST_BATCH_SIZE = 30");
    expect(customersPageSource).toContain("visibleCustomers");
    expect(customersPageSource).toContain("hiddenCustomerCount");
    expect(customersPageSource).toContain("Cargar");
    expect(customersPageSource).toContain("Mostrando");
  });

  it("carga facturas, presupuestos y recibos por bloques", () => {
    const documentListSource = readFileSync(
      new URL("../components/documents/DocumentList.tsx", import.meta.url),
      "utf8",
    );

    expect(documentListSource).toContain("DOCUMENT_LIST_BATCH_SIZE = 30");
    expect(documentListSource).toContain('"factura"');
    expect(documentListSource).toContain('"presupuesto"');
    expect(documentListSource).toContain('"recibo"');
    expect(documentListSource).toContain("visibleDocuments");
    expect(documentListSource).toContain("hiddenCount");
    expect(documentListSource).toContain("Cargar");
    expect(documentListSource).toContain("Mostrando");
    expect(documentListSource).toContain("TimelineMonthDivider");
    expect(documentListSource).toContain("formatTimelineMonthLabel");
  });

  it("carga gastos por bloques y muestra separadores por mes", () => {
    const expensesPageSource = readFileSync(
      new URL("../app/gastos/page.tsx", import.meta.url),
      "utf8",
    );

    expect(expensesPageSource).toContain("EXPENSE_LIST_BATCH_SIZE = 30");
    expect(expensesPageSource).toContain("visibleExpenses");
    expect(expensesPageSource).toContain("hiddenExpenseCount");
    expect(expensesPageSource).toContain("TimelineMonthDivider");
    expect(expensesPageSource).toContain("formatTimelineMonthLabel");
    expect(expensesPageSource).toContain("Cargar");
    expect(expensesPageSource).toContain("Mostrando");
  });

  it("pide confirmacion antes de autorrellenar ajustes detectados en importaciones", () => {
    const importPageSource = readFileSync(
      new URL("../app/importar/page.tsx", import.meta.url),
      "utf8",
    );

    expect(importPageSource).toContain(
      "Hemos detectado configuración de empresa en tus datos importados",
    );
    expect(importPageSource).toContain("Actual");
    expect(importPageSource).toContain("Detectado");
    expect(importPageSource).toContain(
      "Rellenar ajustes vacíos con estos datos al importar",
    );
    expect(importPageSource).toContain(
      "Los campos que ya tengan valor no se cambian",
    );
    expect(importPageSource).toContain(
      "applyBusinessProfileAutofillSuggestion",
    );
  });

  it("expone instalacion PWA con iconos de marca", () => {
    const manifest = JSON.parse(
      readFileSync(
        new URL("../../public/manifest.json", import.meta.url),
        "utf8",
      ),
    );
    const layoutSource = readFileSync(
      new URL("../app/layout.tsx", import.meta.url),
      "utf8",
    );
    const appShellSource = readFileSync(
      new URL("../components/layout/AppShell.tsx", import.meta.url),
      "utf8",
    );
    const homePageSource = readFileSync(
      new URL("../app/page.tsx", import.meta.url),
      "utf8",
    );
    const helpButtonSource = readFileSync(
      new URL("../components/manual/FactuHelpButton.tsx", import.meta.url),
      "utf8",
    );
    const installCardSource = readFileSync(
      new URL("../components/pwa/InstallAppCard.tsx", import.meta.url),
      "utf8",
    );
    const serviceWorkerSource = readFileSync(
      new URL("../components/pwa/RegisterServiceWorker.tsx", import.meta.url),
      "utf8",
    );

    expect(manifest.icons.map((icon: { src: string }) => icon.src)).toEqual(
      expect.arrayContaining([
        "/icon-192.png",
        "/icon-512.png",
        "/maskable-icon-192.png",
        "/maskable-icon-512.png",
        "/apple-touch-icon.png",
      ]),
    );
    expect(layoutSource).toContain("RegisterServiceWorker");
    expect(appShellSource).toContain("/brand/app-icon.png");
    expect(appShellSource).toContain("object-contain");
    expect(appShellSource).not.toContain("object-cover");
    expect(appShellSource).not.toContain(">FA<");
    expect(homePageSource).toContain("InstallAppCard");
    expect(helpButtonSource).toContain('section?.title ?? "Manual de usuario"');
    expect(helpButtonSource).toContain("const href = manualHelpHref(pathname)");
    expect(helpButtonSource).not.toContain(
      "if (!href || !section) return null",
    );
    expect(installCardSource).toContain("beforeinstallprompt");
    expect(installCardSource).toContain("appinstalled");
    expect(installCardSource).toContain("object-contain");
    expect(installCardSource).not.toContain("object-cover");
    expect(serviceWorkerSource).toContain('register("/sw.js")');
  });
});
