import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { computeLocalArtifactSha256 } from "./local-xsd-checksum";

function makeTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "phase2b7r-checksum-"));
}

describe("computeLocalArtifactSha256", () => {
  it("calcula checksums deterministas", () => {
    const directory = makeTempDir();
    const filePath = path.join(directory, "Synthetic.xsd");
    fs.writeFileSync(filePath, "<xs:schema xmlns:xs=\"urn:test\" />", "utf8");

    const first = computeLocalArtifactSha256({ filePath });
    const second = computeLocalArtifactSha256({ filePath });

    expect(first.status).toBe("ready");
    expect(second.status).toBe("ready");
    if (first.status !== "ready" || second.status !== "ready") {
      throw new Error("Expected checksum to be ready.");
    }
    expect(first.sha256).toBe(second.sha256);
  });

  it("cambia el checksum si cambia el contenido", () => {
    const directory = makeTempDir();
    const filePath = path.join(directory, "Synthetic.xsd");
    fs.writeFileSync(filePath, "first", "utf8");
    const first = computeLocalArtifactSha256({ filePath });
    fs.writeFileSync(filePath, "second", "utf8");
    const second = computeLocalArtifactSha256({ filePath });

    if (first.status !== "ready" || second.status !== "ready") {
      throw new Error("Expected checksum to be ready.");
    }
    expect(first.sha256).not.toBe(second.sha256);
  });

  it("rechaza extensiones no permitidas sin imprimir contenido", () => {
    const directory = makeTempDir();
    const filePath = path.join(directory, "Synthetic.xml");
    fs.writeFileSync(filePath, "do-not-print", "utf8");

    const result = computeLocalArtifactSha256({ filePath });
    const serialized = JSON.stringify(result);

    expect(result.status).toBe("blocked");
    expect(result.blockers).toContain("BLOCKED_LOCAL_ARTIFACT_EXTENSION_NOT_ALLOWED");
    expect(serialized).not.toContain("do-not-print");
  });

  it("rechaza archivos demasiado grandes", () => {
    const directory = makeTempDir();
    const filePath = path.join(directory, "Synthetic.xsd");
    fs.writeFileSync(filePath, "0123456789", "utf8");

    const result = computeLocalArtifactSha256({ filePath, maxBytes: 4 });

    expect(result.status).toBe("blocked");
    expect(result.blockers).toContain("BLOCKED_LOCAL_ARTIFACT_TOO_LARGE");
  });
});
