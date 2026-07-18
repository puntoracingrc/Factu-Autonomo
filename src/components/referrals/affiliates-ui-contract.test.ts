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

  it("keeps manual referral entry only in registration", () => {
    expect(referralCardSource).not.toContain("Canjear código");
    expect(referralCardSource).not.toContain("handleRedeemManual");
    expect(cloudAccountSource).toContain('label="Código de invitación"');
    expect(cloudAccountSource).toContain('authMode === "signup"');
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
