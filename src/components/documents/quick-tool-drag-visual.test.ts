import { describe, expect, it } from "vitest";
import { quickToolDragVisualStyle } from "./quick-tool-drag-visual";

describe("quickToolDragVisualStyle", () => {
  it("eleva suavemente el post-it mientras se arrastra", () => {
    const resting = quickToolDragVisualStyle("post-it", false);
    const lifted = quickToolDragVisualStyle("post-it", true);

    expect(resting.transform).toBe("translate3d(0, 0, 0) scale(1)");
    expect(lifted.transform).toBe("translate3d(0, -4px, 0) scale(1.018)");
    expect(lifted.boxShadow).not.toBe(resting.boxShadow);
    expect(lifted.zIndex).toBeGreaterThan(resting.zIndex);
  });

  it("usa una elevacion mas contenida en la calculadora", () => {
    const lifted = quickToolDragVisualStyle("calculator", true);

    expect(lifted.transform).toBe("translate3d(0, -3px, 0) scale(1.012)");
    expect(lifted.transition).toContain("160ms");
    expect(lifted.willChange).toBe("transform");
  });
});
