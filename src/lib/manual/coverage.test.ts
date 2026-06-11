import { describe, expect, it } from "vitest";
import { APP_ROUTES_WITH_MANUAL } from "./coverage";
import { resolveManualSlug } from "./route-help";
import { getManualSection } from "./sections";

describe("manual coverage", () => {
  it("cada ruta principal de navegación tiene sección y ayuda contextual", () => {
    for (const route of APP_ROUTES_WITH_MANUAL) {
      const slug = resolveManualSlug(route);
      expect(slug, `sin manual para ${route}`).not.toBeNull();
      expect(getManualSection(slug!), `slug huérfano ${slug}`).toBeDefined();
    }
  });
});
