import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import robots from "@/app/robots";
import sitemap from "@/app/sitemap";

const SITE_URL = "https://facturacion-autonomos.app";
const OFFICIAL_CODES = [
  "01",
  "01C",
  "04",
  "05",
  "06",
  "030",
  "035",
  "036",
  "038",
  "039",
  "040",
  "043",
  "044",
  "045",
  "100",
  "102",
  "111",
  "113",
  "115",
  "117",
  "121",
  "122",
  "123",
  "124",
  "126",
  "128",
  "130",
  "131",
  "136",
  "140",
  "143",
  "145",
  "146",
  "147",
  "149",
  "150",
  "151",
  "156",
  "159",
  "165",
  "170",
  "171",
  "172",
  "173",
  "174",
  "179",
  "180",
  "181",
  "182",
  "184",
  "185",
];

describe("AEAT model official-content SEO", () => {
  it("publishes only the completed model pages in the sitemap", () => {
    const urls = sitemap().map((entry) => entry.url);
    expect(urls).toContain(`${SITE_URL}/consultor-fiscal/modelos`);
    expect(
      urls.filter((url) =>
        url.startsWith(`${SITE_URL}/consultor-fiscal/modelos/`),
      ),
    ).toEqual(
      OFFICIAL_CODES.map(
        (code) => `${SITE_URL}/consultor-fiscal/modelos/${code}`,
      ),
    );
    expect(urls).not.toContain(`${SITE_URL}/consultor-fiscal/modelos/037`);
    expect(urls).not.toContain(`${SITE_URL}/consultor-fiscal/modelos/186`);
  });

  it("allows the public Modelos prefix while retaining the Consultor block", () => {
    const metadata = robots();
    const rule = Array.isArray(metadata.rules)
      ? metadata.rules[0]
      : metadata.rules;
    expect(rule.allow).toEqual(
      expect.arrayContaining(["/", "/consultor-fiscal/modelos"]),
    );
    expect(rule.disallow).toEqual(
      expect.arrayContaining(["/consultor-fiscal"]),
    );
  });

  it("indexes completed pages and keeps structural-only pages noindex", () => {
    const catalogPage = readFileSync(
      new URL("../../../../app/consultor-fiscal/modelos/page.tsx", import.meta.url),
      "utf8",
    );
    const detailPage = readFileSync(
      new URL(
        "../../../../app/consultor-fiscal/modelos/[codigo]/page.tsx",
        import.meta.url,
      ),
      "utf8",
    );
    expect(catalogPage).toContain(
      'alternates: { canonical: "/consultor-fiscal/modelos" }',
    );
    expect(catalogPage).toContain("index: true");
    expect(catalogPage).toContain("follow: true");
    expect(detailPage).toContain(
      'officialContent.status === "OFFICIAL_INFORMATION"',
    );
    expect(detailPage).toContain("canonical: result.data.href");
    expect(detailPage).toContain("? { index: true, follow: true }");
    expect(detailPage).toContain(
      ": { index: false, follow: false, noarchive: true }",
    );
  });
});
