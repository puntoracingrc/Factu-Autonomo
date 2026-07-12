import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  resolvePublicAeatModelCalendarNavigationV1,
  resolvePublicAeatModelReviewPageV1,
} from "@/lib/fiscal-models/model-pages";
import {
  buildFiscalCalendarModelPageLinkFromResolverResults,
  resolveFiscalCalendarModelPageLinkServer,
} from "./model-page-links.server";

function canonicalResults(code: string) {
  return {
    code,
    navigation: resolvePublicAeatModelCalendarNavigationV1({ code }),
    reviewPage: resolvePublicAeatModelReviewPageV1({ code }),
  };
}

describe("adaptador server-only Calendario a fichas de Modelos", () => {
  it.each(["303", "130", "349", "01C", "A22"])(
    "consume el href canónico del catálogo para %s",
    (code) => {
      const result = resolveFiscalCalendarModelPageLinkServer(code);
      expect(result).toEqual({
        code,
        href: `/consultor-fiscal/modelos?origen=calendario&foco=${code}#modelo-${code}`,
        historical: false,
      });
      expect(Object.isFrozen(result)).toBe(true);
    },
  );

  it("marca 037 como histórico únicamente desde el descriptor", () => {
    expect(resolveFiscalCalendarModelPageLinkServer("037")).toEqual({
      code: "037",
      href: "/consultor-fiscal/modelos?origen=calendario&foco=037#modelo-037",
      historical: true,
    });
  });

  it.each(["000", "601", "999", "01c", "303 ", "303/extra", ""])(
    "falla cerrado para el código %j",
    (code) => {
      expect(resolveFiscalCalendarModelPageLinkServer(code)).toBeNull();
    },
  );

  it("rechaza resultados incoherentes aunque parezcan desplegados", () => {
    const canonical = canonicalResults("303");
    expect(canonical.navigation.status).toBe("REVIEW_ONLY");
    expect(canonical.reviewPage.status).toBe("REVIEW_ONLY");
    if (
      canonical.navigation.status !== "REVIEW_ONLY" ||
      canonical.reviewPage.status !== "REVIEW_ONLY"
    ) {
      return;
    }

    const cases = [
      {
        ...canonical,
        navigation: {
          ...canonical.navigation,
          catalogFocusHref:
            "/consultor-fiscal/modelos?origen=calendario&foco=130#modelo-130",
        },
      },
      {
        ...canonical,
        navigation: {
          ...canonical.navigation,
          data: { ...canonical.navigation.data, returnHref: "/evil" },
        },
      },
      {
        ...canonical,
        navigation: {
          ...canonical.navigation,
          data: {
            ...canonical.navigation.data,
            catalogFocusHref:
              "/consultor-fiscal/modelos?foco=303&origen=calendario#modelo-303",
          },
        },
      },
      {
        ...canonical,
        navigation: {
          ...canonical.navigation,
          data: { ...canonical.navigation.data, catalogCardId: "modelo-130" },
        },
      },
      {
        ...canonical,
        reviewPage: {
          ...canonical.reviewPage,
          data: { ...canonical.reviewPage.data, lifecycleStatus: "ACTIVE" },
        },
      },
      {
        ...canonical,
        reviewPage: {
          ...canonical.reviewPage,
          data: {
            ...canonical.reviewPage.data,
            routeDeploymentStatus: "PENDING",
          },
        },
      },
    ];

    for (const input of cases) {
      expect(
        buildFiscalCalendarModelPageLinkFromResolverResults(input),
      ).toBeNull();
    }
  });

  it("permanece fuera de barrels y de componentes cliente", () => {
    const source = readFileSync(
      new URL("./model-page-links.server.ts", import.meta.url),
      "utf8",
    );
    const clientSource = readFileSync(
      new URL(
        "../../components/fiscal-calendar/FiscalCalendarView.tsx",
        import.meta.url,
      ),
      "utf8",
    );
    expect(source).toContain("assertServerOnlyModule()");
    expect(source).toContain("resolvePublicAeatModelCalendarNavigationV1");
    expect(clientSource).not.toContain("fiscal-models/model-pages");
    expect(clientSource).not.toContain("model-page-links.server");
  });
});
