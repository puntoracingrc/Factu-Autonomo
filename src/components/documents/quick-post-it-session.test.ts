import { describe, expect, it } from "vitest";
import {
  parseQuickPostItSession,
  QUICK_POST_IT_MAX_LENGTH,
} from "./quick-post-it-session";

describe("quick post-it session", () => {
  it("restaura solo una nota abierta y válida", () => {
    expect(
      parseQuickPostItSession(JSON.stringify({ open: true, text: "Medidas" })),
    ).toEqual({ open: true, text: "Medidas" });
    expect(
      parseQuickPostItSession(JSON.stringify({ open: false, text: "Medidas" })),
    ).toBeNull();
    expect(parseQuickPostItSession("not-json")).toBeNull();
  });

  it("limita el contenido restaurado al máximo permitido", () => {
    const restored = parseQuickPostItSession(
      JSON.stringify({
        open: true,
        text: "x".repeat(QUICK_POST_IT_MAX_LENGTH + 50),
      }),
    );

    expect(restored?.text).toHaveLength(QUICK_POST_IT_MAX_LENGTH);
  });
});
