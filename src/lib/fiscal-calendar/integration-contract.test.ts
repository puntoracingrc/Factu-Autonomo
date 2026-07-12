import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { FISCAL_CALENDAR_MODULE_DESCRIPTOR } from "./module-descriptor";

const envExample = readFileSync(
  new URL("../../../.env.example", import.meta.url),
  "utf8",
);
const apiSource = readFileSync(
  new URL("../../app/api/fiscal-calendar/events/route.ts", import.meta.url),
  "utf8",
);
const uiSource = readFileSync(
  new URL(
    "../../components/fiscal-calendar/FiscalCalendarView.tsx",
    import.meta.url,
  ),
  "utf8",
);
const navigationSource = readFileSync(
  new URL("../../components/layout/app-navigation.ts", import.meta.url),
  "utf8",
);
const smokeSource = readFileSync(
  new URL("../../../scripts/smoke-fiscal-calendar.mjs", import.meta.url),
  "utf8",
);
const modelAdapterSource = readFileSync(
  new URL("./model-page-links.server.ts", import.meta.url),
  "utf8",
);

describe("aislamiento del calendario fiscal", () => {
  it("queda descrito como módulo público review-only y sin escrituras", () => {
    expect(FISCAL_CALENDAR_MODULE_DESCRIPTOR).toMatchObject({
      route: "/consultor-fiscal/calendario",
      localOnly: false,
      lifecycleStatus: "public_review",
      readOnly: true,
      oauthEnabled: false,
      externalWritesEnabled: false,
      notificationsEnabled: false,
    });
  });

  it("documenta solo variables servidor y las deja apagadas por defecto", () => {
    expect(envExample).toContain("FISCAL_CALENDAR_ENABLED=false");
    expect(envExample).toContain("GOOGLE_CALENDAR_API_KEY=");
    expect(envExample).toContain("FISCAL_CALENDAR_LIVE_TEST=false");
    expect(envExample).not.toContain("NEXT_PUBLIC_GOOGLE_CALENDAR_API_KEY");
  });

  it("el navegador solo llama a la API propia y no a Google", () => {
    expect(uiSource).toContain("/api/fiscal-calendar/events");
    expect(uiSource).not.toContain("googleapis.com");
    expect(apiSource).not.toContain("GOOGLE_CALENDAR_API_KEY");
  });

  it("resuelve Modelos solo en servidor y entrega el href canónico", () => {
    expect(modelAdapterSource).toContain(
      "resolvePublicAeatModelCalendarNavigationV1",
    );
    expect(modelAdapterSource).toContain("resolvePublicAeatModelReviewPageV1");
    expect(apiSource).toContain("resolveFiscalCalendarModelPageLinkServer");
    expect(apiSource).toContain("collectFiscalCalendarModelPageLinks");
    expect(uiSource).toContain("href={segment.modelPage.href}");
    expect(uiSource).not.toContain("fiscal-models/model-pages");
    expect(uiSource).not.toMatch(/modelos\/\$\{/);
  });

  it("hace encontrable Asesoría sin aceptar calendarId del cliente", () => {
    expect(navigationSource).toContain('label: "Asesoría fiscal"');
    expect(navigationSource).toContain('href: "/consultor-fiscal/modelos"');
    expect(apiSource).toContain('searchParams.has("calendarId")');
    expect(apiSource).toContain("parseFiscalCalendarCategories");
  });

  it("mantiene el smoke real fuera de la suite y con triple opt-in", () => {
    expect(smokeSource).toContain('FISCAL_CALENDAR_ENABLED === "true"');
    expect(smokeSource).toContain('FISCAL_CALENDAR_LIVE_TEST === "true"');
    expect(smokeSource).toContain("GOOGLE_CALENDAR_API_KEY");
    expect(smokeSource).toContain('categories: "iva"');
  });
});
