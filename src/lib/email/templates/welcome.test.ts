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
  });
});
