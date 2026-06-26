import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { inspectLocalXsdImportGraph } from "./local-xsd-import-graph";

function makeTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "phase2b7r-graph-"));
}

function writeFile(filePath: string, body: string): void {
  fs.writeFileSync(filePath, body, "utf8");
}

describe("inspectLocalXsdImportGraph", () => {
  it("detecta include local completo", () => {
    const directory = makeTempDir();
    const root = path.join(directory, "Root.xsd");
    const common = path.join(directory, "Common.xsd");
    writeFile(root, "<xs:include schemaLocation=\"Common.xsd\" />");
    writeFile(common, "<xs:schema xmlns:xs=\"urn:test\" />");

    const result = inspectLocalXsdImportGraph({
      filePath: root,
      baseDirectory: directory,
    });

    expect(result.status).toBe("ready");
    expect(result.dependencies).toEqual([
      {
        kind: "include",
        schemaLocation: "Common.xsd",
        resolvedSafeName: "Common.xsd",
        exists: true,
      },
    ]);
    expect(result.networkUsed).toBe(false);
    expect(result.contentPrinted).toBe(false);
  });

  it("detecta dependencia local faltante", () => {
    const directory = makeTempDir();
    const root = path.join(directory, "Root.xsd");
    writeFile(root, "<xs:import schemaLocation=\"Missing.xsd\" />");

    const result = inspectLocalXsdImportGraph({
      filePath: root,
      baseDirectory: directory,
    });

    expect(result.status).toBe("blocked");
    expect(result.missingDependencies).toEqual(["Missing.xsd"]);
    expect(result.blockers).toContain("BLOCKED_LOCAL_XSD_DEPENDENCY_MISSING");
  });

  it("bloquea referencias remotas", () => {
    const directory = makeTempDir();
    const root = path.join(directory, "Root.xsd");
    writeFile(root, "<xs:import schemaLocation=\"https://example.invalid/Remote.xsd\" />");

    const result = inspectLocalXsdImportGraph({
      filePath: root,
      baseDirectory: directory,
    });
    const serialized = JSON.stringify(result);

    expect(result.status).toBe("blocked");
    expect(result.blockedRemoteReferences).toEqual([
      "https://example.invalid/Remote.xsd",
    ]);
    expect(result.blockers).toContain("BLOCKED_LOCAL_XSD_REMOTE_REFERENCE");
    expect(serialized).not.toContain("<xs:import");
  });

  it("bloquea traversal fuera del directorio base", () => {
    const directory = makeTempDir();
    const root = path.join(directory, "Root.xsd");
    writeFile(root, "<xs:include schemaLocation=\"../Outside.xsd\" />");

    const result = inspectLocalXsdImportGraph({
      filePath: root,
      baseDirectory: directory,
    });

    expect(result.status).toBe("blocked");
    expect(result.blockedTraversalReferences).toEqual(["../Outside.xsd"]);
    expect(result.blockers).toContain("BLOCKED_LOCAL_XSD_TRAVERSAL_REFERENCE");
  });
});
