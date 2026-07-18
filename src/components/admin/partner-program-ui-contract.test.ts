import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const adminPanelSource = readFileSync(
  new URL("./AdminPartnersPanel.tsx", import.meta.url),
  "utf8",
);
const partnerPageSource = readFileSync(
  new URL("../../app/partners/page.tsx", import.meta.url),
  "utf8",
);
const appShellSource = readFileSync(
  new URL("../layout/AppShell.tsx", import.meta.url),
  "utf8",
);
const navigationSource = readFileSync(
  new URL("../layout/app-navigation.ts", import.meta.url),
  "utf8",
);

describe("Partner UI contracts", () => {
  it("keeps authorization controlled by Admin email selection", () => {
    expect(adminPanelSource).toContain('type="email"');
    expect(adminPanelSource).toContain("Dar acceso");
    expect(adminPanelSource).toContain("Pausar");
    expect(adminPanelSource).toContain("Reactivar");
    expect(adminPanelSource).toContain("/api/admin/partners");
    expect(adminPanelSource).toContain("schemaReady");
    expect(adminPanelSource).toContain(
      "La estructura del programa está preparada",
    );
  });

  it("shows only aggregate customer metrics in the Partner dashboard", () => {
    expect(partnerPageSource).toContain("Registrados");
    expect(partnerPageSource).toContain("Pagando ahora");
    expect(partnerPageSource).toContain("Solo mostramos cifras agregadas");
    expect(partnerPageSource).not.toContain("referee_user_id");
    expect(partnerPageSource).not.toContain("referred_user_id");
  });

  it("shows administrators the real Partner layout as a read-only preview", () => {
    expect(partnerPageSource).toContain("Vista previa del panel que verá un Partner autorizado.");
    expect(partnerPageSource).toContain("isAdminPreview");
    expect(partnerPageSource).toContain("ADMIN_PREVIEW_PLAN_COUNTS");
    expect(partnerPageSource).not.toContain("Estás viendo la misma estructura que verá una gestoría autorizada");
    expect(partnerPageSource).not.toContain("Abrir gestión de Partners");
  });

  it("keeps payout details masked and manual in the foundation phase", () => {
    expect(partnerPageSource).toContain("ibanMasked");
    expect(partnerPageSource).not.toContain("payout_iban");
    expect(partnerPageSource).toContain("solo mostramos los cuatro últimos dígitos");
    expect(partnerPageSource).toContain("Cambiar cuenta");
    expect(partnerPageSource).toContain("Guardar nueva cuenta");
    expect(partnerPageSource).toContain("Los pagos se revisan manualmente");
    expect(partnerPageSource).toContain(
      "La generación automática de movimientos y la orden de transferencia",
    );
  });

  it("keeps the private destination out of desktop and mobile navigation", () => {
    expect(navigationSource).not.toContain("/partners");
    expect(navigationSource).not.toContain("PARTNER_NAV_ITEM");
    expect(appShellSource).not.toContain('fetch("/api/partners/access"');
    expect(appShellSource).not.toContain("partnerAuthorized");
  });
});
