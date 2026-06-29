import { describe, expect, it } from "vitest";
import { formatTimelineMonthLabel, timelineMonthKey } from "./timeline";

describe("timeline helpers", () => {
  it("agrupa documentos por mes sin depender de la zona horaria", () => {
    expect(timelineMonthKey("2026-06-29")).toBe("2026-06");
    expect(formatTimelineMonthLabel("2026-06-29")).toBe("Junio de 2026");
  });
});
