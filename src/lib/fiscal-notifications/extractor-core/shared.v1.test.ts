import { describe, expect, it } from "vitest";
import { FiscalNotificationInputError } from "../input-contract";
import {
  assertConfidenceV1,
  assertSourceCoordinatesV1,
  freezeUniqueIdsV1,
} from "./shared.v1";

describe("extractor core shared contract v1", () => {
  it.each([0, 0.5, 1])("accepts finite bounded confidence %s", (value) => {
    expect(() => assertConfidenceV1(value, "confidence")).not.toThrow();
  });

  it.each([-0.01, 1.01, Number.NaN, Infinity, "1"])("rejects invalid confidence %s", (value) => {
    expect(() => assertConfidenceV1(value, "confidence")).toThrowError(
      expect.objectContaining({ code: "INVALID_INPUT", path: "confidence" }),
    );
  });

  it("validates normalized source coordinates and defensive ID snapshots", () => {
    expect(() => assertSourceCoordinatesV1({ x: 0.1, y: 0.2, width: 0.3, height: 0.4 }, "box")).not.toThrow();
    expect(() => assertSourceCoordinatesV1({ x: 0.9, y: 0.2, width: 0.2, height: 0.4 }, "box")).toThrow(FiscalNotificationInputError);

    const input = ["evidence-a"];
    const output = freezeUniqueIdsV1(input, "ids");
    input[0] = "changed";
    expect(output).toEqual(["evidence-a"]);
    expect(Object.isFrozen(output)).toBe(true);
  });
});
