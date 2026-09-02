import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import {
  OFFICIAL_VERIFACTU_ARTIFACTS,
  OFFICIAL_VERIFACTU_FIXTURE_ROOT,
  OFFICIAL_VERIFACTU_SCHEMA_ROOTS,
} from "./official-schema-artifacts";
import {
  OFFICIAL_XSD_VALIDATOR_CAPABILITIES,
  validateVerifactuXmlOffline,
  verifyOfficialVerifactuArtifacts,
} from "./official-xsd-validator";

describe("official VeriFactu artifact set", () => {
  it("verifies every pinned checksum and the complete local import graph", async () => {
    const result = await verifyOfficialVerifactuArtifacts();

    expect(result).toEqual({
      status: "ready",
      summary: {
        artifactCount: 7,
        schemaCount: 6,
        importGraphComplete: true,
        checksumsVerified: true,
        networkUsed: false,
        certificatesUsed: false,
      },
      errors: [],
    });
  });

  it("pins only AEAT and W3C source artifacts", () => {
    expect(OFFICIAL_VERIFACTU_ARTIFACTS).toHaveLength(7);
    for (const artifact of OFFICIAL_VERIFACTU_ARTIFACTS) {
      const url = new URL(artifact.sourceUrl);
      expect([
        "prewww2.aeat.es",
        "www2.agenciatributaria.gob.es",
        "www.w3.org",
      ]).toContain(url.hostname);
      expect(artifact.sha256).toMatch(/^[a-f0-9]{64}$/);
      expect(artifact.byteLength).toBeGreaterThan(0);
    }
  });

  it("fails closed when a pinned artifact changes", async () => {
    const tempRoot = await fs.mkdtemp(
      path.join(os.tmpdir(), "factu-verifactu-xsd-"),
    );
    const fixtureRoot = path.join(
      process.cwd(),
      OFFICIAL_VERIFACTU_FIXTURE_ROOT,
    );
    await fs.cp(fixtureRoot, tempRoot, { recursive: true });
    await fs.appendFile(
      path.join(tempRoot, "xsd", "SuministroLR.xsd"),
      "\n",
      "utf8",
    );

    const result = await verifyOfficialVerifactuArtifacts({
      fixtureRoot: tempRoot,
    });

    expect(result.status).toBe("blocked");
    expect(JSON.stringify(result)).not.toContain(tempRoot);
  });
});

describe("official offline XSD validator", () => {
  it("has no network, certificate, Java or native-binary capability", () => {
    expect(OFFICIAL_XSD_VALIDATOR_CAPABILITIES).toEqual({
      validatesOffline: true,
      usesNetwork: false,
      usesCertificate: false,
      usesJava: false,
      usesNativeBinary: false,
      printsXml: false,
      syntheticOnly: true,
    });
  });

  it("compiles every official root without making a network request", async () => {
    const fetchSpy = vi.fn(() => {
      throw new Error("network must not be used");
    });
    vi.stubGlobal("fetch", fetchSpy);

    for (const schema of Object.keys(
      OFFICIAL_VERIFACTU_SCHEMA_ROOTS,
    ) as Array<keyof typeof OFFICIAL_VERIFACTU_SCHEMA_ROOTS>) {
      const result = await validateVerifactuXmlOffline({
        xml: "<?xml version=\"1.0\"?><invalid />",
        schema,
        syntheticOnly: true,
      });
      expect(result.status, schema).toBe("rejected");
      expect(result.accepted, schema).toBe(false);
    }

    expect(fetchSpy).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it("does not echo the input XML in controlled errors", async () => {
    const xml =
      "<?xml version=\"1.0\"?><private-marker>DO_NOT_ECHO_WHOLE_XML</private-marker>";
    const result = await validateVerifactuXmlOffline({
      xml,
      schema: "registration",
      syntheticOnly: true,
    });
    const serialized = JSON.stringify(result);

    expect(result.status).toBe("rejected");
    expect(serialized).not.toContain(xml);
    expect(serialized).not.toContain("<private-marker>");
  });

  it("rejects document type and entity declarations before parsing", async () => {
    const result = await validateVerifactuXmlOffline({
      xml: '<!DOCTYPE x [<!ENTITY payload SYSTEM "file:///etc/passwd">]><x>&payload;</x>',
      schema: "registration",
      syntheticOnly: true,
    });

    expect(result).toMatchObject({
      status: "rejected",
      accepted: false,
      errors: [{ code: "VALIDATOR_INPUT_ERROR" }],
    });
  });
});
