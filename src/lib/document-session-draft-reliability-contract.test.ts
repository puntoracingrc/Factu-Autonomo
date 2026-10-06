import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const root = fileURLToPath(new URL("../../", import.meta.url));

function source(relativePath: string): string {
  return readFileSync(resolve(root, relativePath), "utf8");
}

describe("document session draft reliability contract", () => {
  it("restaura automaticamente sin mezclar empresas ni borradores", () => {
    const form = source("src/components/forms/DocumentForm.tsx");
    const storage = source("src/lib/document-session-draft.ts");

    expect(form).toContain("shouldRestoreDocumentSessionDraft(sessionDraft");
    expect(form).toContain("existingDocumentId: existing.id");
    expect(form).toContain("applySessionDraft(sessionDraft)");
    expect(storage).toContain("workspaceScopedBrowserStorageKey");
    expect(storage).toContain(
      "draft.localDocumentId !== options.existingDocumentId",
    );
  });

  it("guarda al ocultarse o descargarse la pestaña sin tocar documentos emitidos", () => {
    const form = source("src/components/forms/DocumentForm.tsx");

    expect(form).toContain('document.addEventListener("visibilitychange"');
    expect(form).toContain('window.addEventListener("pagehide"');
    expect(form).toContain("sessionDraftCompleted.current = true");
    expect(form).toContain("clearDocumentSessionDraft(type)");
    expect(form).not.toContain(
      "if (existing || !sessionDraftChecked || pendingSessionDraft)",
    );
  });
});
