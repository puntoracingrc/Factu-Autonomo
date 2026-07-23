import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const pdfActionsSource = readFileSync(
  new URL("./DocumentPdfShareActions.tsx", import.meta.url),
  "utf8",
);
const shareActionsSource = readFileSync(
  new URL("./DocumentShareActions.tsx", import.meta.url),
  "utf8",
);
const iconActionSource = readFileSync(
  new URL("../ui/IconAction.tsx", import.meta.url),
  "utf8",
);

describe("document share menu", () => {
  it("agrupa descargar, imprimir, email y WhatsApp bajo una accion Compartir", () => {
    expect(pdfActionsSource).toContain("Share2");
    expect(pdfActionsSource).toContain('label="Compartir"');
    expect(pdfActionsSource).toContain('role="menu"');
    expect(pdfActionsSource).toContain("Descargar PDF");
    expect(pdfActionsSource).toContain("Imprimir");
    expect(pdfActionsSource).toContain('variant="menu"');
    expect(shareActionsSource).toContain('title="Email"');
    expect(shareActionsSource).toContain('title="WhatsApp"');
    expect(shareActionsSource).toContain('role={variant === "menu" ? "menuitem" : undefined}');
  });

  it("mantiene vista previa separada y posiciona el menu fuera del scroll horizontal", () => {
    expect(pdfActionsSource).toContain('label="Vista previa"');
    expect(pdfActionsSource).toContain("shareMenuPositionFor(trigger)");
    expect(pdfActionsSource).toContain('className="fixed z-50 w-72');
    expect(iconActionSource).toContain("forwardRef");
  });

  it("no vuelve a importar el motor PDF en runtime hasta que el usuario actua", () => {
    expect(pdfActionsSource).toContain(
      'const { downloadDocumentPdf } = await import("@/lib/pdf");',
    );
    expect(pdfActionsSource).toContain(
      'const { printDocumentPdf } = await import("@/lib/pdf");',
    );
    expect(pdfActionsSource).not.toContain('from "@/lib/pdf"');
    expect(shareActionsSource).toContain(
      'const { downloadDocumentPdf } = await import("@/lib/pdf");',
    );
    expect(shareActionsSource).not.toContain(
      'import { downloadDocumentPdf } from "@/lib/pdf";',
    );
  });
});
