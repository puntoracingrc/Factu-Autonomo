import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { validateXML } from "xmllint-wasm";
import {
  OFFICIAL_VERIFACTU_ARTIFACTS,
  OFFICIAL_VERIFACTU_FIXTURE_ROOT,
  OFFICIAL_VERIFACTU_SCHEMA_ROOTS,
  OFFICIAL_XMLDSIG_IMPORT_URL,
  type OfficialVerifactuArtifact,
  type OfficialVerifactuSchema,
} from "./official-schema-artifacts";

const MAX_SYNTHETIC_XML_BYTES = 5 * 1024 * 1024;
const LOCAL_XMLDSIG_FILE_NAME = "xmldsig-core-schema.xsd";
const FORBIDDEN_INPUT_DECLARATION_PATTERN = /<!DOCTYPE|<!ENTITY/i;
const SCHEMA_LOCATION_PATTERN =
  /<\s*(?:[A-Za-z_][\w.-]*:)?(?:include|import)\b[^>]*\bschemaLocation\s*=\s*["']([^"']+)["'][^>]*>/g;
const REMOTE_REFERENCE_PATTERN = /^[a-z][a-z0-9+.-]*:\/\//i;

export const OFFICIAL_XSD_VALIDATOR_CAPABILITIES = {
  validatesOffline: true,
  usesNetwork: false,
  usesCertificate: false,
  usesJava: false,
  usesNativeBinary: false,
  printsXml: false,
  syntheticOnly: true,
} as const;

export interface OfficialArtifactIntegritySummary {
  readonly artifactCount: number;
  readonly schemaCount: number;
  readonly importGraphComplete: true;
  readonly checksumsVerified: true;
  readonly networkUsed: false;
  readonly certificatesUsed: false;
}

export type OfficialArtifactIntegrityResult =
  | {
      readonly status: "ready";
      readonly summary: OfficialArtifactIntegritySummary;
      readonly errors: [];
    }
  | {
      readonly status: "blocked";
      readonly summary: null;
      readonly errors: readonly OfficialXsdValidationError[];
    };

export interface OfficialXsdValidationError {
  readonly code:
    | "ARTIFACT_INTEGRITY_ERROR"
    | "SCHEMA_VALIDATION_ERROR"
    | "VALIDATOR_INPUT_ERROR"
    | "VALIDATOR_RUNTIME_ERROR";
  readonly message: string;
  readonly line?: number;
}

export type OfficialXsdValidationResult =
  | {
      readonly status: "accepted";
      readonly accepted: true;
      readonly schema: OfficialVerifactuSchema;
      readonly errors: [];
    }
  | {
      readonly status: "rejected" | "blocked";
      readonly accepted: false;
      readonly schema: OfficialVerifactuSchema;
      readonly errors: readonly OfficialXsdValidationError[];
    };

interface LoadedArtifact extends OfficialVerifactuArtifact {
  readonly contents: string;
}

interface ArtifactLoadOptions {
  readonly fixtureRoot?: string;
}

function artifactDirectory(
  artifact: OfficialVerifactuArtifact,
  fixtureRoot: string,
): string {
  return path.join(fixtureRoot, artifact.kind === "xsd" ? "xsd" : "wsdl");
}

function sha256(contents: Uint8Array): string {
  return createHash("sha256").update(contents).digest("hex");
}

function integrityError(message: string): OfficialXsdValidationError {
  return { code: "ARTIFACT_INTEGRITY_ERROR", message };
}

async function loadVerifiedArtifacts(
  options: ArtifactLoadOptions = {},
): Promise<LoadedArtifact[]> {
  const fixtureRoot = path.resolve(
    options.fixtureRoot ??
      path.join(process.cwd(), OFFICIAL_VERIFACTU_FIXTURE_ROOT),
  );

  return Promise.all(
    OFFICIAL_VERIFACTU_ARTIFACTS.map(async (artifact) => {
      const filePath = path.join(
        artifactDirectory(artifact, fixtureRoot),
        artifact.fileName,
      );
      const bytes = await fs.readFile(filePath);
      if (bytes.byteLength !== artifact.byteLength) {
        throw new Error(`Unexpected byte length for ${artifact.fileName}.`);
      }
      if (sha256(bytes) !== artifact.sha256) {
        throw new Error(`Checksum mismatch for ${artifact.fileName}.`);
      }
      return { ...artifact, contents: bytes.toString("utf8") };
    }),
  );
}

function verifyImportGraph(artifacts: readonly LoadedArtifact[]): void {
  const localXsdNames = new Set(
    artifacts
      .filter((artifact) => artifact.kind === "xsd")
      .map((artifact) => artifact.fileName),
  );

  for (const artifact of artifacts) {
    for (const match of artifact.contents.matchAll(SCHEMA_LOCATION_PATTERN)) {
      const schemaLocation = match[1] ?? "";
      if (REMOTE_REFERENCE_PATTERN.test(schemaLocation)) {
        if (
          artifact.fileName !== "SuministroInformacion.xsd" ||
          schemaLocation !== OFFICIAL_XMLDSIG_IMPORT_URL
        ) {
          throw new Error(
            `Unexpected remote schema reference in ${artifact.fileName}.`,
          );
        }
        continue;
      }

      if (
        path.isAbsolute(schemaLocation) ||
        path.basename(schemaLocation) !== schemaLocation ||
        !localXsdNames.has(schemaLocation)
      ) {
        throw new Error(
          `Missing or unsafe schema dependency in ${artifact.fileName}.`,
        );
      }
    }
  }
}

function localizeKnownImports(artifact: LoadedArtifact): string {
  if (artifact.fileName !== "SuministroInformacion.xsd") {
    return artifact.contents;
  }

  const localized = artifact.contents.replace(
    OFFICIAL_XMLDSIG_IMPORT_URL,
    LOCAL_XMLDSIG_FILE_NAME,
  );
  if (localized === artifact.contents) {
    throw new Error("Pinned XMLDSIG import was not found.");
  }
  return localized;
}

function safeValidationMessage(message: string): string {
  const withoutPaths = message
    .replaceAll(process.cwd(), "")
    .replace(/(?:[A-Za-z]:)?(?:[\\/][^\s:]+)+/g, "[path]")
    .replace(/<[^>]*>/g, "[xml]")
    .replace(/\s+/g, " ")
    .trim();
  return withoutPaths.slice(0, 300) || "XML does not match the selected schema.";
}

export async function verifyOfficialVerifactuArtifacts(
  options: ArtifactLoadOptions = {},
): Promise<OfficialArtifactIntegrityResult> {
  try {
    const artifacts = await loadVerifiedArtifacts(options);
    verifyImportGraph(artifacts);
    return {
      status: "ready",
      summary: {
        artifactCount: artifacts.length,
        schemaCount: artifacts.filter((artifact) => artifact.kind === "xsd")
          .length,
        importGraphComplete: true,
        checksumsVerified: true,
        networkUsed: false,
        certificatesUsed: false,
      },
      errors: [],
    };
  } catch (error) {
    return {
      status: "blocked",
      summary: null,
      errors: [
        integrityError(
          error instanceof Error
            ? safeValidationMessage(error.message)
            : "Official artifact verification failed.",
        ),
      ],
    };
  }
}

export async function validateVerifactuXmlOffline(input: {
  readonly xml: string;
  readonly schema: OfficialVerifactuSchema;
  readonly syntheticOnly: true;
  readonly fixtureRoot?: string;
}): Promise<OfficialXsdValidationResult> {
  if (
    input.syntheticOnly !== true ||
    typeof input.xml !== "string" ||
    input.xml.trim() === "" ||
    Buffer.byteLength(input.xml, "utf8") > MAX_SYNTHETIC_XML_BYTES ||
    FORBIDDEN_INPUT_DECLARATION_PATTERN.test(input.xml)
  ) {
    return {
      status: "rejected",
      accepted: false,
      schema: input.schema,
      errors: [
        {
          code: "VALIDATOR_INPUT_ERROR",
          message:
            "Synthetic XML is empty, too large or contains a forbidden declaration.",
        },
      ],
    };
  }

  const rootFileName = OFFICIAL_VERIFACTU_SCHEMA_ROOTS[input.schema];
  if (!rootFileName) {
    return {
      status: "rejected",
      accepted: false,
      schema: input.schema,
      errors: [
        {
          code: "VALIDATOR_INPUT_ERROR",
          message: "Unknown official schema selection.",
        },
      ],
    };
  }

  try {
    const artifacts = await loadVerifiedArtifacts({
      fixtureRoot: input.fixtureRoot,
    });
    verifyImportGraph(artifacts);
    const schemas = artifacts.filter((artifact) => artifact.kind === "xsd");
    const root = schemas.find(
      (artifact) => artifact.fileName === rootFileName,
    );
    if (!root) {
      throw new Error(`Missing schema root ${rootFileName}.`);
    }

    const result = await validateXML({
      xml: {
        fileName: "synthetic-verifactu.xml",
        contents: input.xml,
      },
      schema: {
        fileName: root.fileName,
        contents: localizeKnownImports(root),
      },
      preload: schemas
        .filter((artifact) => artifact.fileName !== root.fileName)
        .map((artifact) => ({
          fileName: artifact.fileName,
          contents: localizeKnownImports(artifact),
        })),
    });

    if (result.valid) {
      return {
        status: "accepted",
        accepted: true,
        schema: input.schema,
        errors: [],
      };
    }

    return {
      status: "rejected",
      accepted: false,
      schema: input.schema,
      errors: result.errors.slice(0, 20).map((error) => ({
        code: "SCHEMA_VALIDATION_ERROR" as const,
        message: safeValidationMessage(error.message),
        ...(error.loc?.lineNumber
          ? { line: error.loc.lineNumber }
          : {}),
      })),
    };
  } catch (error) {
    return {
      status: "blocked",
      accepted: false,
      schema: input.schema,
      errors: [
        {
          code: "VALIDATOR_RUNTIME_ERROR",
          message:
            error instanceof Error
              ? safeValidationMessage(error.message)
              : "Offline XSD validation failed.",
        },
      ],
    };
  }
}
