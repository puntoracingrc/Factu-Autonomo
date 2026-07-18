import { describe, expect, it } from "vitest";
import {
  APP_NAV_ITEMS,
  findActiveAppNavItem,
  isAppNavItemActive,
  MOBILE_MORE_NAV_ITEMS,
  MOBILE_PRIMARY_NAV_HREFS,
  MOBILE_PRIMARY_NAV_ITEMS,
} from "./app-navigation";

describe("app navigation", () => {
  it("limits the persistent mobile bar to four priority destinations", () => {
    expect(MOBILE_PRIMARY_NAV_HREFS).toEqual([
      "/",
      "/clientes",
      "/facturas",
      "/gastos",
    ]);
    expect(MOBILE_PRIMARY_NAV_ITEMS).toHaveLength(4);
    expect(MOBILE_MORE_NAV_ITEMS).toHaveLength(
      APP_NAV_ITEMS.length - MOBILE_PRIMARY_NAV_ITEMS.length,
    );
    expect(
      new Set(
        [...MOBILE_PRIMARY_NAV_ITEMS, ...MOBILE_MORE_NAV_ITEMS].map(
          (item) => item.href,
        ),
      ),
    ).toEqual(new Set(APP_NAV_ITEMS.map((item) => item.href)));
  });

  it("matches a section and its nested routes without prefix collisions", () => {
    expect(isAppNavItemActive("/", "/")).toBe(true);
    expect(isAppNavItemActive("/facturas", "/facturas")).toBe(true);
    expect(isAppNavItemActive("/facturas/nuevo", "/facturas")).toBe(true);
    expect(isAppNavItemActive("/facturas-antiguas", "/facturas")).toBe(false);
    expect(isAppNavItemActive("/clientes", "/")).toBe(false);
    expect(
      isAppNavItemActive(
        "/consultor-fiscal/calendario",
        "/consultor-fiscal/modelos",
        "/consultor-fiscal",
      ),
    ).toBe(true);
    expect(
      isAppNavItemActive(
        "/consultor-fiscalidad",
        "/consultor-fiscal/modelos",
        "/consultor-fiscal",
      ),
    ).toBe(false);
  });

  it("reports an overflow route as the active item behind More", () => {
    expect(
      findActiveAppNavItem("/productos/editar/42", MOBILE_MORE_NAV_ITEMS)?.href,
    ).toBe("/productos");
    expect(
      findActiveAppNavItem("/facturas/nuevo", MOBILE_MORE_NAV_ITEMS),
    ).toBeUndefined();
  });

  it("keeps the private Partner destination out of every menu", () => {
    expect(APP_NAV_ITEMS.some((item) => item.href === "/partners")).toBe(false);
    expect(MOBILE_PRIMARY_NAV_ITEMS.some((item) => item.href === "/partners")).toBe(
      false,
    );
    expect(MOBILE_MORE_NAV_ITEMS.some((item) => item.href === "/partners")).toBe(
      false,
    );
  });

  it("abre Asesoría fiscal en el configurador cuando está habilitado", () => {
    expect(
      APP_NAV_ITEMS.find(
        (item) => item.href === "/consultor-fiscal/diagnostico",
      ),
    ).toMatchObject({
      label: "Asesoría fiscal",
      shortLabel: "Asesoría",
      activeBase: "/consultor-fiscal",
    });
    expect(
      findActiveAppNavItem(
        "/consultor-fiscal/calendario",
        APP_NAV_ITEMS,
      )?.href,
    ).toBe("/consultor-fiscal/diagnostico");
    expect(
      findActiveAppNavItem(
        "/consultor-fiscal/notificaciones",
        APP_NAV_ITEMS,
      )?.href,
    ).toBe("/consultor-fiscal/diagnostico");
  });
});
