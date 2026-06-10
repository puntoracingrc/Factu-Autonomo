import { describe, expect, it } from "vitest";
import {
  shouldShowDeadlineReminder,
  upcomingIvaDeadline,
} from "./tax-deadlines";

describe("tax deadlines", () => {
  it("encuentra el próximo plazo de IVA", () => {
    const next = upcomingIvaDeadline(new Date("2026-04-05"));
    expect(next).not.toBeNull();
    expect(next?.quarter).toBe(1);
    expect(next?.dueMonth).toBe(4);
  });

  it("muestra aviso cerca del plazo", () => {
    expect(shouldShowDeadlineReminder(10)).toBe(true);
    expect(shouldShowDeadlineReminder(40)).toBe(false);
  });
});
