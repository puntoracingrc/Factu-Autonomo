import { describe, expect, it } from "vitest";
import {
  readJsonBody,
  readTextBody,
  rejectOversizedContentLength,
  validateRequestBodySize,
} from "./request-body";

describe("request body limits", () => {
  it("reads JSON below the configured limit", async () => {
    const request = new Request("https://example.test/api", {
      method: "POST",
      body: JSON.stringify({ ok: true }),
      headers: { "Content-Type": "application/json" },
    });

    const result = await readJsonBody<{ ok: boolean }>(request, {
      maxBytes: 100,
    });

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toEqual({ ok: true });
  });

  it("rejects a declared oversized body without reading it", () => {
    const request = new Request("https://example.test/api", {
      method: "POST",
      body: "small",
      headers: { "Content-Length": "1000" },
    });

    const response = rejectOversizedContentLength(request, 100);
    expect(response?.status).toBe(413);
  });

  it("rejects a streamed body that exceeds the configured limit", async () => {
    const request = new Request("https://example.test/api", {
      method: "POST",
      body: "123456",
    });

    const result = await readTextBody(request, { maxBytes: 5 });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.response.status).toBe(413);
  });

  it("validates binary body size without consuming the original request", async () => {
    const request = new Request("https://example.test/api", {
      method: "POST",
      body: new Uint8Array([0, 255, 1, 2]),
    });

    const response = await validateRequestBodySize(request, 10);

    expect(response).toBeNull();
    expect(new Uint8Array(await request.arrayBuffer())).toEqual(
      new Uint8Array([0, 255, 1, 2]),
    );
  });

  it("returns a safe 400 response for invalid JSON", async () => {
    const request = new Request("https://example.test/api", {
      method: "POST",
      body: "not-json",
    });

    const result = await readJsonBody(request, { maxBytes: 100 });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.response.status).toBe(400);
  });
});
