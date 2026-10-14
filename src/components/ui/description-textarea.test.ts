import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DescriptionTextarea } from "./DescriptionTextarea";

describe("expandable concept and description fields", () => {
  it("sizes to content without a fixed height and keeps native vertical resizing", () => {
    const html = renderToStaticMarkup(createElement(DescriptionTextarea, {
      defaultValue: "Synthetic description",
      className: "custom-class",
    }));
    expect(html).toContain("<textarea");
    expect(html).toContain('rows="1"');
    expect(html).toContain("[field-sizing:content]");
    expect(html).toContain("resize-y");
    expect(html).toContain("min-w-0");
    expect(html).toContain("max-w-full");
    expect(html).toContain("min-h-12");
    expect(html).toContain("custom-class");
    expect(html).not.toMatch(/(?:^|\s)h-\d|resize-none|height:/);
  });

  it("preserves multiline content, controlled handlers and accessibility props", () => {
    const value = "Synthetic long concept\nSecond line <unchanged>";
    const onChange = () => {};
    const element = DescriptionTextarea({
      id: "synthetic-description",
      "aria-label": "Concepto de la línea 1",
      "aria-invalid": true,
      disabled: true,
      value,
      onChange,
    });
    expect(element.props).toMatchObject({ value, onChange, disabled: true });
    const html = renderToStaticMarkup(element);
    expect(html).toContain('id="synthetic-description"');
    expect(html).toContain('aria-label="Concepto de la línea 1"');
    expect(html).toContain('aria-invalid="true"');
    expect(html).toContain("Synthetic long concept\nSecond line &lt;unchanged&gt;");
  });

  it.each([
    ["../forms/DocumentForm.tsx", "item.description"],
    ["../forms/RectificativaForm.tsx", "item.description"],
    ["../products/ProductFormFields.tsx", "draft.saleDescription"],
    ["../products/ProductFormFields.tsx", "draft.purchaseDescription"],
    ["../../app/gastos/nuevo/page.tsx", "description"],
    ["../../app/gastos/nuevo/page.tsx", "line.description"],
    ["../../app/gastos/fijos/page.tsx", "form.description"],
  ])("uses the shared textarea in %s for %s", (path, value) => {
    const source = readFileSync(new URL(path, import.meta.url), "utf8");
    expect(source).toContain(`<DescriptionTextarea\n`);
    expect(source).toMatch(new RegExp(`<DescriptionTextarea\\s+[^>]*value=\\{${value.replaceAll(".", "\\.")}\\}`));
    if (path.includes("DocumentForm")) {
      expect(source).toContain("handleLineDescriptionChange(item.id, e.target.value)");
      expect(source).toContain("onFocus={() => setFocusedProductLineId(item.id)}");
      expect(source).not.toContain("className={`${compactInputClass} placeholder:text-slate-400`}");
    }
  });

  it.each(["DocumentForm", "RectificativaForm"])(
    "places the same notes field between client and concepts in %s",
    (form) => {
      const source = readFileSync(new URL(`../forms/${form}.tsx`, import.meta.url), "utf8");
      const client = source.indexOf("<ClientPicker");
      const notes = source.indexOf("Notas (opcional)");
      const concepts = source.indexOf(form === "DocumentForm" ? ">Conceptos</h2>" : "Conceptos ({rectificationTypeLabel");
      expect(client).toBeGreaterThan(-1);
      expect(notes).toBeGreaterThan(client);
      expect(concepts).toBeGreaterThan(notes);
      expect(source.lastIndexOf("Notas (opcional)")).toBe(notes);
      expect(source).toContain("value={notes}");
      expect(source).toContain("onChange={(event) => setNotes(event.target.value)}");
    },
  );
});
