import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CloudRepairPreviewModalTable } from "./CloudRepairPreviewModalTable";
import type { CloudRepairPreview } from "@/lib/cloud/device-repair-preview";

const source = readFileSync(
  new URL("./CloudRepairPreviewModal.tsx", import.meta.url),
  "utf8",
);
const tableSource = readFileSync(
  new URL("./CloudRepairPreviewModalTable.ts", import.meta.url),
  "utf8",
);
const combinedSource = `${source}\n${tableSource}`;

const preview: CloudRepairPreview = {
  id: "sha256:synthetic-preview",
  generatedAt: "2026-07-21T10:05:00.000Z",
  cloudSource: "entities",
  local: {
    recordedAt: "2026-07-21T10:00:00.000Z",
    fiscalRevision: null,
    fiscalUpdatedAt: null,
  },
  cloud: {
    recordedAt: "2026-07-21T09:00:00.000Z",
    fiscalRevision: null,
    fiscalUpdatedAt: null,
  },
  counts: [
    {
      key: "customers",
      label: "Clientes",
      local: 2,
      cloud: 1,
      delta: -1,
      reduction: true,
      protectedReduction: false,
    },
  ],
  exactBusinessStateMatches: false,
  hasReductions: true,
  hasProtectedReductions: false,
};

describe("CloudRepairPreviewModal contract", () => {
  it("shows dates, counts, download location and blocks reductions until acknowledged", () => {
    expect(source).toContain("Compara antes de conservar la nube");
    expect(source).toContain('title="Este dispositivo"');
    expect(source).toContain('title="Nube"');
    expect(combinedSource).toContain("entry.local");
    expect(combinedSource).toContain("entry.cloud");
    expect(combinedSource).toContain("menos en la nube");
    expect(source).toContain(
      "incluidos datos documentales o fiscales protegidos",
    );
    expect(source).toContain('type="checkbox"');
    expect(source).toContain("cloudRepairPreviewAllowsConfirmation");
    expect(source).toContain("disabled={props.busy || !canConfirm}");
    expect(source).toContain("previewId: preview.id");
    expect(source).toContain("reductionsAcknowledged,");
    expect(source).toContain("Descargas");
    expect(source).toContain("solicitará al navegador");
    expect(source).toContain("Comprueba");
    expect(source).not.toContain("que encontrarás");
    expect(source).toContain("factu-autonomo-backup-antes-restaurar-");
    expect(source).toContain("exactBusinessStateMatches");
    expect(source).toContain(
      "el contenido exacto de ambas versiones no es idéntico",
    );
  });

  it("renders a semantic table with associated row and column headers", () => {
    const html = renderToStaticMarkup(
      createElement(CloudRepairPreviewModalTable, {
        counts: preview.counts,
      }),
    );

    expect(html).toContain("<table");
    expect(html).toContain("<caption");
    expect(html).toContain('scope="col"');
    expect(html).toContain('scope="row"');
    expect(html).toContain("<td");
    expect(html).toContain("Clientes");
    expect(html).toContain("Dispositivo");
    expect(html).toContain("Nube");
  });

  it("states that timestamps are clues and the exact snapshots are revalidated", () => {
    expect(source).toContain("fecha orienta, pero no decide qué versión");
    expect(source).toContain("es correcta");
    expect(source).toContain("Factu volverá a comprobar que ambas versiones");
    expect(source).toContain("exactamente las comparadas");
    expect(source).toContain("Conservar esta copia de la nube");
  });
});
