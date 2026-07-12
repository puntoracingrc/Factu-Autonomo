import { describe, expect, it } from "vitest";
import { getFiscalModelCatalogFocusPresentationV1 } from "@/lib/fiscal-models/model-pages/public-review-search.v2";

describe("FiscalModelCatalogBrowser focus presentation", () => {
  it("activates only the exact canonical card hash", () => {
    const target = "modelo-303";
    const hashes = [
      "#modelo-303",
      "#modelo-349",
      "#Modelo-303",
      "#modelo-303/extra",
      "#modelo-%33%30%33",
      "",
    ];
    expect(
      hashes.map(
        (currentHash) =>
          getFiscalModelCatalogFocusPresentationV1({
            focusedCardId: target,
            currentHash,
            reduceMotion: false,
          }).active,
      ),
    ).toEqual([true, false, false, false, false, false]);
  });

  it("models refresh and back-forward without retaining stale highlight", () => {
    const states = ["#modelo-130", "#modelo-349", "#modelo-130"].map(
      (currentHash) =>
        getFiscalModelCatalogFocusPresentationV1({
          focusedCardId: "modelo-130",
          currentHash,
          reduceMotion: false,
        }),
    );
    expect(states.map((state) => state.ariaCurrent)).toEqual([
      "location",
      null,
      "location",
    ]);
    expect(states.every(Object.isFrozen)).toBe(true);
  });

  it("does not focus direct access and respects reduced motion", () => {
    expect(
      getFiscalModelCatalogFocusPresentationV1({
        focusedCardId: null,
        currentHash: "#modelo-303",
        reduceMotion: false,
      }),
    ).toMatchObject({ active: false, ariaCurrent: null });
    expect(
      getFiscalModelCatalogFocusPresentationV1({
        focusedCardId: "modelo-303",
        currentHash: "#modelo-303",
        reduceMotion: true,
      }),
    ).toMatchObject({ active: true, scrollBehavior: "auto" });
  });
});
