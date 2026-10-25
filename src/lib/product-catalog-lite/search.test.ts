import { describe, expect, it } from "vitest";
import { catalogSearchFilter } from "./search";

describe("catalog search vocabulary and exclusions", () => {
  it("treats mando/emisor and their plurals as the same kind", () => {
    const filter = catalogSearchFilter("mando");
    for (const term of ["mandos", "emisor", "emisores", "MANDÓ"]) expect(catalogSearchFilter(term)).toBe(filter);
    expect(catalogSearchFilter("mando emisor")).toBe(filter);
    expect(filter).not.toContain("sales->>description");
    expect(filter).toContain('current_payload->>family.imatch."^');
    expect(filter).toContain("current_payload->>family.not.imatch.");
    expect(filter).toContain("current_payload->>name.not.imatch.");
  });
  it("distinguishes guide products from basculadores mentioning a guide", () => {
    const filter = catalogSearchFilter("guía");
    expect(catalogSearchFilter("GUIAS")).toBe(filter);
    expect(filter).toContain("basculador(es)?");
    expect(filter).not.toContain("purchase->>description");
    expect(filter).toContain("current_payload->>subfamily.is.null");
  });
  it("keeps attributes, references and descriptions available for other terms", () => {
    const filter = catalogSearchFilter("mando blanco");
    expect(filter).toContain('current_payload->sales->>description.imatch."bl[aáàäâ][nñ]c[oóòöô]"');
    expect(filter).toContain("current_payload->>attributes.imatch.");
    expect(filter).toContain("current_payload->purchase->>supplierReference.imatch.");
  });
  it("excludes words across all fields, including missing optional fields", () => {
    const filter = catalogSearchFilter("motor -somfy");
    expect(filter).toContain('or(current_payload->>notes.is.null,current_payload->>notes.not.imatch."s[oóòöô]mfy")');
    expect(filter).toContain("current_payload->sales->>description.not.imatch.");
    expect(catalogSearchFilter("motor -mando")).toBe(catalogSearchFilter("motor -emisor"));
    expect(catalogSearchFilter("mando -a-ok")).toContain("[aáàäâ][^[:alnum:]]*[oóòöô]k");
  });
  it("does not interpret internal reference hyphens or a standalone dash as exclusions", () => {
    expect(catalogSearchFilter("AM45-15/17")).not.toContain("not.imatch");
    expect(catalogSearchFilter("guia -")).toBe(catalogSearchFilter("guia"));
    expect(catalogSearchFilter("--")).toBeNull();
  });
  it("finds references without requiring exact punctuation, case or spacing", () => {
    const filter = catalogSearchFilter("AM45-15/17");
    for (const query of ["am45 15 17", "Am45 / 15 / 17", "am45   15-17"]) expect(catalogSearchFilter(query)).toBe(filter);
    expect(filter).toContain("current_payload->>sku.imatch.");
    expect(filter).toContain("current_payload->purchase->>supplierReference.imatch.");
  });
  it("bounds and sanitizes user input without accepting filter or regex syntax", () => {
    expect(catalogSearchFilter('x),user_id.neq.foreign,(.*')).not.toContain("user_id.neq");
    expect(catalogSearchFilter("   ")).toBeNull();
    expect(catalogSearchFilter("a b c d e f g h extra")).toBe(catalogSearchFilter("a b c d e f g h"));
    expect(catalogSearchFilter("z".repeat(200))).toBe(catalogSearchFilter("z".repeat(100)));
    expect(catalogSearchFilter("-a -b -c -d -e -f -g -h")!.length).toBeLessThan(15000);
  });
});
