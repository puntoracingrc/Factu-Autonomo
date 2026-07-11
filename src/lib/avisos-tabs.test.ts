import { describe, expect, it } from "vitest";
import { nextAvisosTabForKey } from "./avisos-tabs";

describe("nextAvisosTabForKey", () => {
  it("recorre las pestanas con las flechas y vuelve al inicio", () => {
    expect(nextAvisosTabForKey("mine", "ArrowRight")).toBe("auto");
    expect(nextAvisosTabForKey("auto", "ArrowRight")).toBe("mine");
    expect(nextAvisosTabForKey("mine", "ArrowLeft")).toBe("auto");
  });

  it("admite Inicio y Fin sin interceptar otras teclas", () => {
    expect(nextAvisosTabForKey("auto", "Home")).toBe("mine");
    expect(nextAvisosTabForKey("mine", "End")).toBe("auto");
    expect(nextAvisosTabForKey("mine", "Tab")).toBeNull();
  });
});
