import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const cloudContext = readFileSync(
  new URL("../../context/CloudSyncContext.tsx", import.meta.url),
  "utf8",
);
const googleCallback = readFileSync(
  new URL("../../app/google-auth/callback/page.tsx", import.meta.url),
  "utf8",
);
const devicesCard = readFileSync(
  new URL("../../components/cloud/CloudDevicesCard.tsx", import.meta.url),
  "utf8",
);

describe("cloud device recovery after fresh authentication", () => {
  it("recovers revoked device identities only in explicit sign-in flows", () => {
    expect(cloudContext).toContain(
      "recoverRevokedCloudDeviceAfterFreshSignIn",
    );
    expect(googleCallback).toContain(
      "recoverRevokedCloudDeviceAfterFreshSignIn",
    );
    expect(devicesCard).not.toContain(
      "recoverRevokedCloudDeviceAfterFreshSignIn",
    );
  });

  it("explains how a revoked current device can return safely", () => {
    expect(devicesCard).toContain('payload?.reason === "device_revoked"');
    expect(devicesCard).toContain("Cierra sesión y vuelve a iniciarla");
  });
});
