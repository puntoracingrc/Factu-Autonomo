import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  new URL("./CloudRepairPreviewModal.tsx", import.meta.url),
  "utf8",
);

describe("CloudRepairPreviewModal contract", () => {
  it("shows dates, counts, download location and blocks reductions until acknowledged", () => {
    expect(source).toContain("Compara antes de conservar la nube");
    expect(source).toContain('title="Este dispositivo"');
    expect(source).toContain('title="Nube"');
    expect(source).toContain("entry.local");
    expect(source).toContain("entry.cloud");
    expect(source).toContain("menos en la nube");
    expect(source).toContain(
      "incluidos datos documentales o fiscales protegidos",
    );
    expect(source).toContain('type="checkbox"');
    expect(source).toContain("cloudRepairPreviewAllowsConfirmation");
    expect(source).toContain("disabled={props.busy || !canConfirm}");
    expect(source).toContain("previewId: preview.id");
    expect(source).toContain("reductionsAcknowledged,");
    expect(source).toContain("Descargas");
    expect(source).toContain("factu-autonomo-backup-antes-restaurar-");
    expect(source).toContain("exactBusinessStateMatches");
    expect(source).toContain(
      "el contenido exacto de ambas versiones no es idéntico",
    );
  });

  it("states that timestamps are clues and the exact snapshots are revalidated", () => {
    expect(source).toContain("fecha orienta, pero no decide qué versión");
    expect(source).toContain("es correcta");
    expect(source).toContain("Factu volverá a comprobar que ambas versiones");
    expect(source).toContain("exactamente las comparadas");
    expect(source).toContain("Conservar esta copia de la nube");
  });
});
