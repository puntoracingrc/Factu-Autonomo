import { describe, expect, it, vi } from "vitest";
import { buildSecurityAlertEmail } from "./security-alert";

describe("security alert email", () => {
  it("incluye solo un resumen operativo y escapa nombres inesperados", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://facturacion-autonomos.app");

    const email = buildSecurityAlertEmail({
      level: "action",
      label: "Ataque probable",
      headline: "Hay actividad anomala.",
      totalBuckets: 12,
      totalRequests: 320,
      latestAt: "2026-07-10T12:00:00.000Z",
      namespaces: [
        {
          namespace: "unexpected",
          label: '<img src=x onerror="alert(1)">',
          level: "action",
          buckets: 12,
          requests: 320,
          maxRequests: 140,
          latestAt: "2026-07-10T12:00:00.000Z",
          detail: "12 origenes",
        },
      ],
    });

    expect(email.subject).toBe("Alerta de seguridad en Factu");
    expect(email.text).toContain("320 solicitudes");
    expect(email.text).not.toContain("direccion IP:");
    expect(email.html).toContain("&lt;img src=x onerror=&quot;alert(1)&quot;&gt;");
    expect(email.html).not.toContain('<img src=x onerror="alert(1)">');
  });
});
