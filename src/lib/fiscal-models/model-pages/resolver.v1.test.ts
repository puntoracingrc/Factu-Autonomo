import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { createFiscalModelPageDescriptorResolverV1 } from "./resolver.v1";
import * as publicApi from "./index";

function enabledResolver() {
  return createFiscalModelPageDescriptorResolverV1({ featureEnabled: true });
}

describe("fiscal model page descriptor resolver v1", () => {
  it("is default-off and does not inspect input while disabled", () => {
    const hostileInput = new Proxy(
      {},
      {
        getPrototypeOf: () => {
          throw new Error("disabled resolver must not inspect input");
        },
        ownKeys: () => {
          throw new Error("disabled resolver must not inspect input");
        },
      },
    );

    for (const resolver of [
      createFiscalModelPageDescriptorResolverV1(),
      createFiscalModelPageDescriptorResolverV1({}),
      createFiscalModelPageDescriptorResolverV1({ featureEnabled: false }),
    ]) {
      expect(resolver.resolve(hostileInput)).toEqual({
        status: "BLOCKED",
        reason: "FEATURE_DISABLED",
        href: null,
      });
      expect(resolver.list({})).toEqual({
        status: "BLOCKED",
        reason: "FEATURE_DISABLED",
      });
    }
  });

  it("rejects coerced, accessor, extra-key, and non-plain configuration", () => {
    let getterCalls = 0;
    const accessorConfiguration = {};
    Object.defineProperty(accessorConfiguration, "featureEnabled", {
      enumerable: true,
      get: () => {
        getterCalls += 1;
        throw new Error("configuration getter must not run");
      },
    });

    for (const options of [
      "true",
      1,
      { featureEnabled: "true" },
      { featureEnabled: true, extra: true },
      accessorConfiguration,
      new Date(),
    ]) {
      expect(
        createFiscalModelPageDescriptorResolverV1(options).resolve({
          code: "036",
        }),
      ).toEqual({
        status: "BLOCKED",
        reason: "INVALID_CONFIGURATION",
        href: null,
      });
    }
    expect(getterCalls).toBe(0);
  });

  it("keeps every initial known descriptor under manual review with no href", () => {
    const resolver = enabledResolver();

    for (const code of ["036", "037", "303"] as const) {
      const result = resolver.resolve({ code });
      expect(result.status).toBe("MANUAL_REVIEW");
      if (result.status === "MANUAL_REVIEW") {
        expect(result.href).toBeNull();
        expect(result.data).toMatchObject({
          code,
          publicationStatus: "UNPUBLISHED",
          contentReviewStatus: "PENDING_REVIEW",
          href: null,
        });
        expect(result.reasons).toEqual([
          "DRAFT_RELEASE",
          "PAGE_UNPUBLISHED",
          "PAGE_REVIEW_REQUIRED",
          "MODEL_REVIEW_REQUIRED",
          "SOURCE_HASH_PENDING",
          "SOURCE_REVIEW_REQUIRED",
        ]);
      }
    }
  });

  it("keeps 037 as historical information without inferring a replacement", () => {
    const result = enabledResolver().resolve({ code: "037" });
    expect(result.status).toBe("MANUAL_REVIEW");
    if (result.status === "MANUAL_REVIEW") {
      expect(result.data).toMatchObject({
        lifecycleStatus: "HISTORICAL",
        modelAvailability: "HISTORICAL_ONLY",
        contentLevel: "HISTORICAL_INFO_ONLY",
        effectiveTo: "2025-02-02",
        href: null,
      });
      expect(result.data).not.toHaveProperty("replacementModel");
    }
  });

  it("returns MODEL_NOT_FOUND without a route for uncatalogued model codes", () => {
    const resolver = enabledResolver();
    for (const code of ["130", "349", "999", "000"]) {
      const result = resolver.resolve({ code });
      expect(result).toEqual({
        status: "BLOCKED",
        reason: "MODEL_NOT_FOUND",
        href: null,
      });
      expect(result).not.toHaveProperty("data");
      expect(result).not.toHaveProperty("canonicalPath");
    }
  });

  it("rejects malformed, coerced, decorated, inherited, and accessor inputs", () => {
    const resolver = enabledResolver();
    let getterCalls = 0;
    const accessorInput = {};
    Object.defineProperty(accessorInput, "code", {
      enumerable: true,
      get: () => {
        getterCalls += 1;
        throw new Error("input getter must not run");
      },
    });
    const nonEnumerableInput = {};
    Object.defineProperty(nonEnumerableInput, "code", {
      enumerable: false,
      value: "036",
    });

    const invalidInputs: unknown[] = [
      null,
      undefined,
      [],
      new Date(),
      new String("036"),
      {},
      { code: 36 },
      { code: true },
      { code: "36" },
      { code: " 036 " },
      { code: "036\n" },
      { code: "０３６" },
      { code: "0".repeat(10_001) },
      { code: "../036" },
      { code: "036?next=303" },
      { code: "036#303" },
      { code: "javascript:alert(1)" },
      { code: "036", extra: true },
      { code: "036", [Symbol("extra")]: true },
      Object.create({ code: "036" }),
      accessorInput,
      nonEnumerableInput,
    ];

    for (const input of invalidInputs) {
      expect(resolver.resolve(input)).toEqual({
        status: "BLOCKED",
        reason: "INVALID_INPUT",
        href: null,
      });
    }
    expect(getterCalls).toBe(0);
  });

  it("accepts null-prototype data objects and never reads through get traps", () => {
    const resolver = enabledResolver();
    const nullPrototype = Object.assign(Object.create(null), { code: "036" });
    let getCalls = 0;
    const proxy = new Proxy(
      { code: "303" },
      {
        get: () => {
          getCalls += 1;
          throw new Error("get trap must not run");
        },
      },
    );

    expect(resolver.resolve(nullPrototype).status).toBe("MANUAL_REVIEW");
    expect(resolver.resolve(proxy).status).toBe("MANUAL_REVIEW");
    expect(getCalls).toBe(0);
  });

  it("turns proxy validation failures into INVALID_INPUT instead of throwing", () => {
    const resolver = enabledResolver();
    const traps = [
      { getPrototypeOf: () => { throw new Error("prototype trap"); } },
      { ownKeys: () => { throw new Error("own keys trap"); } },
      {
        getOwnPropertyDescriptor: () => {
          throw new Error("descriptor trap");
        },
      },
    ];

    for (const handler of traps) {
      const proxy = new Proxy({ code: "036" }, handler);
      expect(resolver.resolve(proxy)).toEqual({
        status: "BLOCKED",
        reason: "INVALID_INPUT",
        href: null,
      });
    }
  });

  it("lists active descriptors by default and historical metadata explicitly", () => {
    const resolver = enabledResolver();
    const active = resolver.list({});
    const withHistorical = resolver.list({ includeHistorical: true });

    expect(active.status).toBe("MANUAL_REVIEW");
    if (active.status === "MANUAL_REVIEW") {
      expect(active.data.map((descriptor) => descriptor.code)).toEqual([
        "036",
        "303",
      ]);
      expect(active.data.every((descriptor) => descriptor.href === null)).toBe(
        true,
      );
    }
    expect(withHistorical.status).toBe("MANUAL_REVIEW");
    if (withHistorical.status === "MANUAL_REVIEW") {
      expect(withHistorical.data.map((descriptor) => descriptor.code)).toEqual([
        "036",
        "037",
        "303",
      ]);
    }
  });

  it("requires an exact bounded list input", () => {
    const resolver = enabledResolver();
    for (const input of [
      undefined,
      null,
      [],
      { includeHistorical: "true" },
      { includeHistorical: true, extra: true },
      Object.create({ includeHistorical: true }),
      { [Symbol("extra")]: true },
    ]) {
      expect(resolver.list(input)).toEqual({
        status: "BLOCKED",
        reason: "INVALID_INPUT",
      });
    }
  });

  it("returns fresh deeply frozen copies that cannot corrupt later reads", () => {
    const resolver = enabledResolver();
    const first = resolver.resolve({ code: "036" });
    const second = resolver.resolve({ code: "036" });

    expect(first).toEqual(second);
    expect(first).not.toBe(second);
    expect(Object.isFrozen(resolver)).toBe(true);
    expect(Object.isFrozen(first)).toBe(true);
    if (first.status === "MANUAL_REVIEW" && second.status === "MANUAL_REVIEW") {
      expect(first.data).not.toBe(second.data);
      expect(first.data.provenance).not.toBe(second.data.provenance);
      expect(Object.isFrozen(first.data)).toBe(true);
      expect(Object.isFrozen(first.data.sourceIds)).toBe(true);
      expect(Object.isFrozen(first.data.provenance)).toBe(true);
      expect(Object.isFrozen(first.data.provenance[0])).toBe(true);
      expect(Object.isFrozen(first.reasons)).toBe(true);
      expect(() => {
        (first.data as { canonicalName: string }).canonicalName = "Manipulado";
      }).toThrow(TypeError);
      const official = first.data.provenance.find(
        (entry) => entry.origin === "OFFICIAL_SOURCE",
      );
      expect(Object.isFrozen(official?.sourceIds)).toBe(true);
    }

    const third = resolver.resolve({ code: "036" });
    if (third.status === "MANUAL_REVIEW") {
      expect(third.data.canonicalName).not.toBe("Manipulado");
    }
  });

  it("keeps fixtures private and the resolver free of forbidden dependencies", () => {
    expect(publicApi).not.toHaveProperty("FISCAL_MODEL_PAGE_DESCRIPTORS_V1");
    expect(publicApi).not.toHaveProperty(
      "FISCAL_MODEL_PAGE_DESCRIPTOR_RELEASE_V1",
    );

    const resolverSource = readFileSync(
      new URL("./resolver.v1.ts", import.meta.url),
      "utf8",
    );
    const indexSource = readFileSync(new URL("./index.ts", import.meta.url),
      "utf8",
    );
    expect(resolverSource).not.toMatch(/\bfetch\s*\(/);
    expect(resolverSource).not.toContain("Date.now");
    expect(resolverSource).not.toContain("process.env");
    expect(resolverSource).not.toMatch(
      /localStorage|sessionStorage|supabase|stripe|openai/i,
    );
    expect(resolverSource).not.toMatch(
      /fiscal-calendar|fiscal-notifications|AppStore|tax-engine|taxes\.ts/i,
    );
    expect(resolverSource).not.toMatch(/\/modelos\/\$\{/);
    expect(indexSource).not.toContain("fixtures/");
    expect(indexSource).not.toMatch(/fiscal-calendar|fiscal-notifications/);
  });
});
