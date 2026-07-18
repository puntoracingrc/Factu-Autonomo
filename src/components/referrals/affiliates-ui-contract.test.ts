import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const affiliatesPageSource = readFileSync(
  new URL("../../app/afiliados/page.tsx", import.meta.url),
  "utf8",
);
const accountPageSource = readFileSync(
  new URL("../../app/cuenta/page.tsx", import.meta.url),
  "utf8",
);
const referralCardSource = readFileSync(
  new URL("./ReferralCard.tsx", import.meta.url),
  "utf8",
);
const partnerAccessSource = readFileSync(
  new URL("../../app/partners/acceso/page.tsx", import.meta.url),
  "utf8",
);
const cloudAccountSource = readFileSync(
  new URL("../cloud/CloudAccountCard.tsx", import.meta.url),
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
const conditionalShellSource = readFileSync(
  new URL("../layout/ConditionalAppShell.tsx", import.meta.url),
  "utf8",
);

describe("Affiliates UI contract", () => {
  it("moves the referral dashboard from Account into Affiliates", () => {
    expect(affiliatesPageSource).toContain("<ReferralCard />");
    expect(accountPageSource).not.toContain("<ReferralCard />");
    expect(accountPageSource).toContain('href="/afiliados"');
  });

  it("accepts manual Affiliate attribution without granting value", () => {
    expect(referralCardSource).toContain("handleRedeemManual");
    expect(referralCardSource).toContain("Asociar código");
    expect(referralCardSource).toContain("primer pago válido");
    expect(cloudAccountSource).toContain('label="Código de invitación"');
    expect(cloudAccountSource).toContain('authMode === "signup"');
  });

  it("explains paid recurring rewards and exposes aggregate results", () => {
    expect(affiliatesPageSource).toContain("cada renovación pagada y verificada");
    expect(affiliatesPageSource).toContain("un plan anual, cuando se confirma su pago anual");
    expect(referralCardSource).toContain("profile.registeredCount");
    expect(referralCardSource).toContain("profile.payingCount");
    expect(referralCardSource).toContain("profile.planCounts.map");
    expect(referralCardSource).not.toContain("email");
  });

  it("captures referral URLs globally and exposes Affiliates in navigation", () => {
    expect(appShellSource).toContain("<ReferralCapture />");
    expect(appShellSource).toContain("<ReferralRedeemOnLogin />");
    expect(navigationSource).toContain('href: "/afiliados"');
  });

  it("gives professional Partners a dedicated access surface", () => {
    expect(partnerAccessSource).toContain('<CloudAccountCard surface="partner" />');
    expect(partnerAccessSource).toContain('href="/partners"');
    expect(partnerAccessSource).toContain("No necesitas utilizar el resto del programa");
    expect(conditionalShellSource).toContain(
      'pathname === "/partners/acceso"',
    );
  });
});
