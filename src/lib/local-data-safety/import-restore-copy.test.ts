import { describe, expect, it } from "vitest";
import {
  buildImportRestoreReviewCopy,
  summarizeImportRestoreReviewCopy,
  validateImportRestoreReviewCopy,
} from "./import-restore-copy";

// PHASE2D25_IMPORT_RESTORE_COPY_ACCESSIBILITY_CONTRACT_V1

describe("import restore copy accessibility contract", () => {
  it("includes prudent preview and no-apply messages", () => {
    const copy = buildImportRestoreReviewCopy();

    expect(copy.messages).toContain("Vista previa");
    expect(copy.messages).toContain("No se aplicaran cambios");
    expect(copy.messages).toContain("Requiere revision");
    expect(copy.ariaDescriptions.status).toContain("no indicado solo por color");
  });

  it("rejects prohibited product copy", () => {
    const copy = {
      ...buildImportRestoreReviewCopy(),
      messages: [...buildImportRestoreReviewCopy().messages, "Importar ahora"],
    };

    expect(() => validateImportRestoreReviewCopy(copy)).toThrow("Forbidden");
  });

  it("summarizes labels safely", () => {
    const summary = summarizeImportRestoreReviewCopy(buildImportRestoreReviewCopy());

    expect(summary.bannerTitle).toBe("Vista previa");
    expect(summary.sectionLabelIds).toContain("actions");
    expect(summary.safe).toBe(true);
  });
});
