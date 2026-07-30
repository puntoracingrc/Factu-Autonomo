import { describe, expect, it } from "vitest";

import { createSerialMutationRunner } from "./serial-mutation";

describe("createSerialMutationRunner", () => {
  it("runs consecutive mutations in order", async () => {
    const run = createSerialMutationRunner();
    const order: string[] = [];
    let releaseFirst: () => void = () => undefined;
    const firstGate = new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });

    const first = run(async () => {
      order.push("first:start");
      await firstGate;
      order.push("first:end");
      return "first";
    });
    const second = run(async () => {
      order.push("second:start");
      return "second";
    });

    await Promise.resolve();
    expect(order).toEqual(["first:start"]);

    releaseFirst();
    await expect(Promise.all([first, second])).resolves.toEqual([
      "first",
      "second",
    ]);
    expect(order).toEqual(["first:start", "first:end", "second:start"]);
  });

  it("continues after a rejected mutation", async () => {
    const run = createSerialMutationRunner();

    await expect(
      run(async () => {
        throw new Error("synthetic failure");
      }),
    ).rejects.toThrow("synthetic failure");

    await expect(run(async () => "recovered")).resolves.toBe("recovered");
  });
});
