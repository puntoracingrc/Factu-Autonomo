import { describe, expect, it } from "vitest";
import { buildWelcomeEmail, WELCOME_EMAIL_SUBJECT } from "./welcome";

describe("welcome email template", () => {
  it("includes subject and recipient name", () => {
    const content = buildWelcomeEmail({
      email: "alberto.ibanez@gmail.com",
    });

    expect(content.subject).toBe(WELCOME_EMAIL_SUBJECT);
    expect(content.html).toContain("Alberto Ibanez");
    expect(content.text).toContain("Alberto Ibanez");
    expect(content.html).toContain("/brand/robot-avatar.png");
    expect(content.html).toContain("Entrar a mi Panel de Control");
    expect(content.html).toContain("Veri*Factu");
    expect(content.text).toContain("Tu cuenta ya está confirmada");
    expect(content.text).not.toContain("si aún no has confirmado");
  });

  it("escapes an optional recipient name before rendering HTML", () => {
    const content = buildWelcomeEmail({
      email: "test@example.com",
      recipientName: '<img src=x onerror="alert(1)">',
    });

    expect(content.html).not.toContain("<img src=x");
    expect(content.html).toContain("&lt;img src=x onerror=&quot;alert(1)&quot;&gt;");
  });
});
