import { describe,expect,it } from "vitest";
import { readFileSync } from "node:fs";
import { escapeHtml } from "./html";
describe("quick form text and attribute escaping",()=>{
  it("does not reinterpret document/client text as HTML",()=>{
    expect(escapeHtml('<img src=x onerror="alert(1)"> & \'quoted\''))
      .toBe("&lt;img src=x onerror=&quot;alert(1)&quot;&gt; &amp; &#39;quoted&#39;");
    expect(escapeHtml('2026-10-21\" autofocus onfocus=\"alert(1)'))
      .toBe("2026-10-21&quot; autofocus onfocus=&quot;alert(1)");
  });
  it("escapes even typed date and number inputs before HTML rendering",()=>{
    const app=readFileSync(new URL("./app.ts",import.meta.url),"utf8");
    expect(app).toContain('value="${escape(intent.date)}"');
    expect(app).toContain('value="${escape(item.quantity)}"');
    expect(app).toContain('value="${escape(item.unitPrice)}"');
  });
});
