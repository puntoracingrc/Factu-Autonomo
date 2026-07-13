import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const workflow = readFileSync(
  new URL("../../../.github/workflows/fiscal-watch.yml", import.meta.url),
  "utf8",
);

describe("programación del vigilante fiscal", () => {
  it("se ejecuta una vez al día y también admite una revisión manual", () => {
    expect(workflow.match(/cron:/g)).toHaveLength(1);
    expect(workflow).toContain('cron: "15 8 * * *"');
    expect(workflow).toContain("workflow_dispatch:");
    expect(workflow).toContain("concurrency:");
    expect(workflow).toContain("cancel-in-progress: false");
  });

  it("solo concede lectura del código y escritura de avisos", () => {
    expect(workflow).toContain("contents: read");
    expect(workflow).toContain("issues: write");
    expect(workflow).not.toMatch(/contents:\s*write/);
    expect(workflow).not.toMatch(/pull-requests:\s*write/);
    expect(workflow).not.toMatch(/actions:\s*write/);
  });

  it("no necesita secretos propios ni llama a producción", () => {
    expect(workflow).toContain("node scripts/fiscal-watch/run.mjs");
    expect(workflow).toContain("node-version: 22");
    expect(workflow).toContain("GITHUB_TOKEN: ${{ github.token }}");
    expect(workflow).not.toContain("secrets.");
    expect(workflow).not.toContain("facturacion-autonomos.app");
    expect(workflow).not.toContain("curl ");
  });
});
