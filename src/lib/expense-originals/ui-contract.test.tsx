import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { ExpenseOriginalField } from "@/components/expenses/ExpenseOriginalField";
import { ExpenseOriginalButton } from "@/components/expenses/ExpenseOriginalButton";

vi.mock("@/hooks/useExpenseOriginals", () => ({
  useExpenseOriginals: () => ({
    enabled: true,
    originals: {},
    loading: false,
    ownerScope: "company-1",
  }),
}));
describe("expense original UI integration", () => {
  it("offers manual attachment in the expense form with explicit type/size and privacy information", () => {
    const html = renderToStaticMarkup(
      <ExpenseOriginalField file={null} onChange={() => {}} />,
    );
    expect(html).toContain('type="file"');
    expect(html).toContain("Adjuntar archivo (opcional)");
    expect(html).toContain("Máximo 4 MB");
    expect(html).toContain("Se conserva el archivo exacto");
  });
  it("shows an accessible original action next to a saved expense", () => {
    const html = renderToStaticMarkup(
      <ExpenseOriginalButton
        expense={{ id: "e1", description: "Compra sintética" }}
        ownerScope="company-1"
        status="archived"
      />,
    );
    expect(html).toContain('title="Ver factura original"');
    expect(html).toContain(
      'aria-label="Ver factura original de Compra sintética"',
    );
    expect(html).not.toContain("storage/v1");
  });
  it("keeps a failed attachment retry out of the financial creation path", () => {
    const source = readFileSync(
      new URL("../../app/gastos/nuevo/page.tsx", import.meta.url),
      "utf8",
    );
    const panel = source.slice(
      source.indexOf("if (pendingOriginal)"),
      source.indexOf("<fieldset disabled={saveSubmitBusy}"),
    );
    expect(panel).toContain("Reintentar adjunto");
    expect(panel).toContain("uploadExpenseOriginal(pendingOriginal.expenseId");
    expect(panel).not.toContain("createExpense(");
    expect(panel).not.toContain("updateCentralExpense(");
    const upload = source.indexOf(
      "await uploadExpenseOriginal(originalExpenseId",
    );
    expect(upload).toBeGreaterThan(
      source.indexOf("const result = await createExpense(payload)"),
    );
    expect(source).toContain("saveSubmitBusyRef.current");
    expect(source).toContain(
      "sourceInboxItemId: activeInboxItemId ?? editingExpense?.sourceInboxItemId",
    );
  });
  it("does not store originals in AppData, IndexedDB, localStorage or an outbox", () => {
    for (const name of ["client.ts", "server.ts", "storage.ts"]) {
      const source = readFileSync(new URL(name, import.meta.url), "utf8");
      expect(source).not.toMatch(
        /localStorage|sessionStorage|indexedDB|\.outbox|createSignedUrl|getPublicUrl/,
      );
    }
  });
});
