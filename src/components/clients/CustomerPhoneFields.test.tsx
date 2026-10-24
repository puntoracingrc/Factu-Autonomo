import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CustomerPhoneFields } from "./CustomerPhoneFields";

describe("contactos telefónicos en los editores de clientes", () => {
  it("muestra dos pares sin campos obligatorios", () => {
    const html = renderToStaticMarkup(<CustomerPhoneFields
      values={{ phone: "600111222", phoneContactName: "Marta", phone2: "611222333", phone2ContactName: "José" }}
      onChange={() => {}}
    />);
    expect(html.match(/type="tel"/g)).toHaveLength(2);
    expect(html.match(/<input/g)).toHaveLength(4);
    expect(html).toContain("Contacto 1 (opcional)");
    expect(html).toContain("Contacto 2 (opcional)");
    expect(html).not.toContain("required");
  });

  it("conecta todos los campos tanto en alta como en edición sin cambiar el guardado central", () => {
    for (const filename of ["../../app/clientes/page.tsx", "../../app/clientes/nuevo/page.tsx"]) {
      const page = readFileSync(new URL(filename, import.meta.url), "utf8");
      expect(page).toContain("<CustomerPhoneFields values={form} onChange={updateFormField} />");
      for (const field of ["phoneContactName", "phone2", "phone2ContactName"]) {
        expect(page).toContain(`${field}: ""`);
        expect(page).toContain(`${field}: form.${field}`);
      }
      expect(page).toContain("useCentralCustomerCreate");
    }
  });
});
