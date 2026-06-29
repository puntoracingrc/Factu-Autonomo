import { afterEach, describe, expect, it, vi } from "vitest";
import { getAuthCallbackUrl } from "./auth-redirect";

const originalAppUrl = process.env.NEXT_PUBLIC_APP_URL;
const originalWindowDescriptor = Object.getOwnPropertyDescriptor(
  globalThis,
  "window",
);

describe("getAuthCallbackUrl", () => {
  afterEach(() => {
    if (originalAppUrl === undefined) {
      delete process.env.NEXT_PUBLIC_APP_URL;
    } else {
      process.env.NEXT_PUBLIC_APP_URL = originalAppUrl;
    }

    if (originalWindowDescriptor) {
      Object.defineProperty(globalThis, "window", originalWindowDescriptor);
    } else {
      Reflect.deleteProperty(globalThis, "window");
    }
    vi.unstubAllEnvs();
  });

  it("usa NEXT_PUBLIC_APP_URL fuera del navegador", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://facturacion-autonomos.app/");

    expect(getAuthCallbackUrl()).toBe(
      "https://facturacion-autonomos.app/auth/callback",
    );
  });

  it("usa el origen real del navegador en local", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "http://localhost:3000");
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: {
        location: {
          origin: "http://localhost:3001",
        },
      },
    });

    expect(getAuthCallbackUrl()).toBe("http://localhost:3001/auth/callback");
  });
});
