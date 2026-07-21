import { describe, expect, it } from "vitest";
import {
  advanceCloudAuthIdentity,
  captureCloudAuthOperation,
  isCloudAuthOperationCurrent,
} from "./auth-operation-guard";

describe("cloud auth operation guard", () => {
  it("invalida una operación al cerrar sesión o cambiar de cuenta", () => {
    const signedIn = advanceCloudAuthIdentity(
      { userId: null, generation: 0 },
      "user-a",
    );
    const operation = captureCloudAuthOperation(signedIn);
    if (!operation) throw new Error("Falta el token sintético");

    expect(isCloudAuthOperationCurrent(signedIn, operation)).toBe(true);
    expect(
      isCloudAuthOperationCurrent(
        advanceCloudAuthIdentity(signedIn, null),
        operation,
      ),
    ).toBe(false);
    expect(
      isCloudAuthOperationCurrent(
        advanceCloudAuthIdentity(signedIn, "user-b"),
        operation,
      ),
    ).toBe(false);
  });

  it("invalida una sesión nueva del mismo usuario", () => {
    const firstSession = { userId: "user-a", generation: 4 };
    const operation = captureCloudAuthOperation(firstSession);
    if (!operation) throw new Error("Falta el token sintético");

    expect(
      isCloudAuthOperationCurrent(
        advanceCloudAuthIdentity(firstSession, "user-a"),
        operation,
      ),
    ).toBe(false);
  });
});
