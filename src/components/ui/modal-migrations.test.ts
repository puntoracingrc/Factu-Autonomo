import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migratedCriticalDialogs = [
  "../billing/UpgradeModal.tsx",
  "../documents/DeleteDocumentButton.tsx",
  "../documents/DocumentLinkManagerButton.tsx",
  "../documents/DocumentShareActions.tsx",
  "../documents/PaymentReminderButton.tsx",
  "../settings/DocumentTemplateDesignerCard.tsx",
  "./ResponsiveEntityPanel.tsx",
];

describe("migración de diálogos críticos", () => {
  it("el modal común conecta semántica, teclado, foco inicial y restauración", () => {
    const source = readFileSync(new URL("./Modal.tsx", import.meta.url), "utf8");

    expect(source).toContain("modalAriaProps(titleId, descriptionId)");
    expect(source).toContain("tabIndex={-1}");
    expect(source).toContain("handleModalKeyDown");
    expect(source).toContain("restoreModalFocus(previouslyFocused)");
    expect(source).toContain("document.addEventListener(\"focusin\"");
  });

  it.each(migratedCriticalDialogs)(
    "%s delega teclado, foco y semántica al modal común",
    (relativePath) => {
      const source = readFileSync(
        new URL(relativePath, import.meta.url),
        "utf8",
      );

      expect(source).toContain('import { Modal } from "@/components/ui/Modal"');
      expect(source).toContain("<Modal");
      expect(source).not.toContain('role="dialog"');
      expect(source).not.toContain('aria-modal="true"');
    },
  );

  it("el preview grande elimina la altura rígida y conserva cabecera fija", () => {
    const source = readFileSync(
      new URL("../settings/DocumentTemplateDesignerCard.tsx", import.meta.url),
      "utf8",
    );

    expect(source).not.toContain("min-h-[78rem]");
    expect(source).toContain("sticky top-0");
    expect(source).toContain("max-h-[calc(100dvh-1rem)]");
  });
});
