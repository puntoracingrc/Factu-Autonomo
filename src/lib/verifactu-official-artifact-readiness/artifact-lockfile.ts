import path from "node:path";
import {
  OFFICIAL_ARTIFACT_MANIFEST,
  type OfficialArtifactManifestEntry,
} from "../verifactu-official-alignment";
import { DEFAULT_LOCAL_REQUIRED_XSD_ARTIFACTS } from "./local-artifact-intake";
import { computeLocalArtifactSha256 } from "./local-xsd-checksum";
import { inspectLocalXsdImportGraph } from "./local-xsd-import-graph";
import type { LocalOfficialArtifactCandidate } from "./types";

export const PHASE2B7V_LOCKFILE_CONTRACT_MARKER =
  "PHASE2B7V_OFFICIAL_ARTIFACT_LOCKFILE_CONTRACT_V1";

export const OFFICIAL_ARTIFACT_LOCKFILE_VERSION =
  "phase2b7v-official-artifact-lockfile-v1";

export type OfficialArtifactLockfileVersion =
  typeof OFFICIAL_ARTIFACT_LOCKFILE_VERSION;

export interface OfficialArtifactLockfileEntry {
  readonly artifactId: string;
  readonly expectedFilename: string;
  readonly localFilename: string;
  readonly officialUrl: string;
  readonly officialDomain: string;
  readonly version: string;
  readonly sha256: string;
  readonly byteLength: number;
  readonly contentTypeCandidate: string;
  readonly importedBy: readonly string[];
  readonly imports: readonly string[];
  readonly includes: readonly string[];
  readonly importGraphComplete: boolean;
  readonly safeForOfflineTests: boolean;
  readonly notes: string;
  readonly localPath?: string;
}

export interface OfficialArtifactLockfile {
  readonly lockfileVersion: OfficialArtifactLockfileVersion;
  readonly generatedAt: string;
  readonly generatedBy: string;
  readonly source: "manual_local_intake";
  readonly artifacts: readonly OfficialArtifactLockfileEntry[];
}

export type OfficialArtifactLockfileErrorCode =
  | "LOCKFILE_INVALID_VERSION"
  | "LOCKFILE_INVALID_SOURCE"
  | "LOCKFILE_ARTIFACTS_MISSING"
  | "LOCKFILE_UNKNOWN_ARTIFACT_ID"
  | "LOCKFILE_OFFICIAL_DOMAIN_INVALID"
  | "LOCKFILE_OFFICIAL_URL_INVALID"
  | "LOCKFILE_SHA256_INVALID"
  | "LOCKFILE_BYTE_LENGTH_INVALID"
  | "LOCKFILE_EXTENSION_INVALID"
  | "LOCKFILE_FORBIDDEN_EXTENSION"
  | "LOCKFILE_IMPORT_GRAPH_INCOMPLETE"
  | "LOCKFILE_UNSAFE_CONTENT"
  | "LOCKFILE_ABSOLUTE_PATH_EXPOSED"
  | "LOCKFILE_LOCAL_PATH_EXPOSED"
  | "LOCKFILE_UNKNOWN_FIELD";

export interface OfficialArtifactLockfileError {
  readonly code: OfficialArtifactLockfileErrorCode;
  readonly message: string;
  readonly artifactId?: string;
  readonly path?: string;
}

export type OfficialArtifactLockfileValidationResult =
  | {
      readonly marker: typeof PHASE2B7V_LOCKFILE_CONTRACT_MARKER;
      readonly status: "valid";
      readonly errors: [];
      readonly containsXmlOrXsdContent: false;
      readonly containsSecrets: false;
      readonly networkUsed: false;
      readonly certificatesUsed: false;
    }
  | {
      readonly marker: typeof PHASE2B7V_LOCKFILE_CONTRACT_MARKER;
      readonly status: "blocked";
      readonly errors: readonly OfficialArtifactLockfileError[];
      readonly containsXmlOrXsdContent: false;
      readonly containsSecrets: false;
      readonly networkUsed: false;
      readonly certificatesUsed: false;
    };

export type OfficialArtifactLockfileBuildResult =
  | {
      readonly status: "ready";
      readonly lockfile: OfficialArtifactLockfile;
      readonly errors: [];
    }
  | {
      readonly status: "blocked";
      readonly lockfile: OfficialArtifactLockfile | null;
      readonly errors: readonly OfficialArtifactLockfileError[];
    };

export interface BuildOfficialArtifactLockfileInput {
  readonly baseDirectory: string;
  readonly generatedAt?: string;
  readonly generatedBy?: string;
  readonly manifest?: readonly OfficialArtifactManifestEntry[];
  readonly requiredArtifacts?: readonly LocalOfficialArtifactCandidate[];
  readonly includeLocalPaths?: boolean;
}

const LOCKFILE_TOP_LEVEL_KEYS = new Set([
  "lockfileVersion",
  "generatedAt",
  "generatedBy",
  "source",
  "artifacts",
]);

const LOCKFILE_ENTRY_KEYS = new Set([
  "artifactId",
  "expectedFilename",
  "localFilename",
  "officialUrl",
  "officialDomain",
  "version",
  "sha256",
  "byteLength",
  "contentTypeCandidate",
  "importedBy",
  "imports",
  "includes",
  "importGraphComplete",
  "safeForOfflineTests",
  "notes",
  "localPath",
]);

const FORBIDDEN_LOCKFILE_EXTENSIONS = new Set([
  ".pfx",
  ".p12",
  ".pem",
  ".key",
  ".crt",
  ".cer",
  ".pdf",
  ".xlsx",
  ".xml",
]);

const SHA256_REGEX = /^[a-f0-9]{64}$/;
const UNSAFE_CONTENT_REGEX =
  /<\?xml|<xs:|<RegFactu|BEGIN CERTIFICATE|PRIVATE KEY|password\s*[:=]|token\s*[:=]/i;
const WINDOWS_ABSOLUTE_PATH_REGEX = /^[A-Za-z]:[\\/]/;

function unique<T>(items: readonly T[]): readonly T[] {
  return [...new Set(items)];
}

function findManifestEntry(
  artifactId: string,
  manifest: readonly OfficialArtifactManifestEntry[],
): OfficialArtifactManifestEntry | undefined {
  return manifest.find((artifact) => artifact.artifactId === artifactId);
}

function extensionBlocker(fileName: string): OfficialArtifactLockfileErrorCode | null {
  const extension = path.extname(fileName).toLowerCase();
  if (FORBIDDEN_LOCKFILE_EXTENSIONS.has(extension)) {
    return "LOCKFILE_FORBIDDEN_EXTENSION";
  }
  return extension === ".xsd" ? null : "LOCKFILE_EXTENSION_INVALID";
}

function isAbsolutePathLike(value: string): boolean {
  return path.isAbsolute(value) || WINDOWS_ABSOLUTE_PATH_REGEX.test(value);
}

function pushError(
  errors: OfficialArtifactLockfileError[],
  error: OfficialArtifactLockfileError,
): void {
  if (
    !errors.some(
      (existing) =>
        existing.code === error.code &&
        existing.artifactId === error.artifactId &&
        existing.path === error.path,
    )
  ) {
    errors.push(error);
  }
}

function inspectUnsafeValue(
  value: unknown,
  errors: OfficialArtifactLockfileError[],
  options: { readonly publicOutput: boolean; readonly pathPrefix?: string },
): void {
  if (typeof value === "string") {
    if (UNSAFE_CONTENT_REGEX.test(value)) {
      pushError(errors, {
        code: "LOCKFILE_UNSAFE_CONTENT",
        message: "Lockfile must not contain XML/XSD content, secrets or certificates.",
        path: options.pathPrefix,
      });
    }
    if (options.publicOutput && isAbsolutePathLike(value)) {
      pushError(errors, {
        code: "LOCKFILE_ABSOLUTE_PATH_EXPOSED",
        message: "Public lockfile output must not expose absolute local paths.",
        path: options.pathPrefix,
      });
    }
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      inspectUnsafeValue(item, errors, {
        ...options,
        pathPrefix: `${options.pathPrefix ?? "$"}[${index}]`,
      }),
    );
    return;
  }

  if (value && typeof value === "object") {
    for (const [key, nested] of Object.entries(value)) {
      if (options.publicOutput && key === "localPath") {
        pushError(errors, {
          code: "LOCKFILE_LOCAL_PATH_EXPOSED",
          message: "Public lockfile output must be redacted and omit localPath.",
          path: `${options.pathPrefix ?? "$"}.${key}`,
        });
      }
      inspectUnsafeValue(nested, errors, {
        ...options,
        pathPrefix: `${options.pathPrefix ?? "$"}.${key}`,
      });
    }
  }
}

function validateKnownKeys(
  lockfile: Record<string, unknown>,
  errors: OfficialArtifactLockfileError[],
): void {
  for (const key of Object.keys(lockfile)) {
    if (!LOCKFILE_TOP_LEVEL_KEYS.has(key)) {
      pushError(errors, {
        code: "LOCKFILE_UNKNOWN_FIELD",
        message: "Unknown top-level lockfile field is not allowed.",
        path: key,
      });
    }
  }

  const artifacts = Array.isArray(lockfile.artifacts) ? lockfile.artifacts : [];
  artifacts.forEach((entry, index) => {
    if (!entry || typeof entry !== "object") return;
    for (const key of Object.keys(entry)) {
      if (!LOCKFILE_ENTRY_KEYS.has(key)) {
        pushError(errors, {
          code: "LOCKFILE_UNKNOWN_FIELD",
          message: "Unknown artifact lockfile field is not allowed.",
          path: `artifacts[${index}].${key}`,
        });
      }
    }
  });
}

export function redactOfficialArtifactLockfile(
  lockfile: OfficialArtifactLockfile,
): OfficialArtifactLockfile {
  return {
    ...lockfile,
    artifacts: lockfile.artifacts.map((entry) => {
      const { localPath, ...artifact } = entry;
      void localPath;
      return {
        ...artifact,
        importedBy: [...artifact.importedBy],
        imports: [...artifact.imports],
        includes: [...artifact.includes],
      };
    }),
  };
}

export function validateOfficialArtifactLockfile(
  lockfile: unknown,
  options: {
    readonly manifest?: readonly OfficialArtifactManifestEntry[];
    readonly publicOutput?: boolean;
  } = {},
): OfficialArtifactLockfileValidationResult {
  const manifest = options.manifest ?? OFFICIAL_ARTIFACT_MANIFEST;
  const publicOutput = options.publicOutput ?? true;
  const errors: OfficialArtifactLockfileError[] = [];

  if (!lockfile || typeof lockfile !== "object" || Array.isArray(lockfile)) {
    pushError(errors, {
      code: "LOCKFILE_ARTIFACTS_MISSING",
      message: "Lockfile must be an object.",
    });
  } else {
    const record = lockfile as Record<string, unknown>;
    validateKnownKeys(record, errors);
    inspectUnsafeValue(record, errors, { publicOutput, pathPrefix: "$" });

    if (record.lockfileVersion !== OFFICIAL_ARTIFACT_LOCKFILE_VERSION) {
      pushError(errors, {
        code: "LOCKFILE_INVALID_VERSION",
        message: "Unsupported official artifact lockfile version.",
        path: "lockfileVersion",
      });
    }
    if (record.source !== "manual_local_intake") {
      pushError(errors, {
        code: "LOCKFILE_INVALID_SOURCE",
        message: "Lockfile source must be manual_local_intake.",
        path: "source",
      });
    }
    if (!Array.isArray(record.artifacts) || record.artifacts.length === 0) {
      pushError(errors, {
        code: "LOCKFILE_ARTIFACTS_MISSING",
        message: "Lockfile must include artifact entries.",
        path: "artifacts",
      });
    }

    if (Array.isArray(record.artifacts)) {
      record.artifacts.forEach((entry, index) => {
        if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
          pushError(errors, {
            code: "LOCKFILE_ARTIFACTS_MISSING",
            message: "Artifact entry must be an object.",
            path: `artifacts[${index}]`,
          });
          return;
        }

        const artifact = entry as Partial<OfficialArtifactLockfileEntry>;
        const artifactId = String(artifact.artifactId ?? "");
        const manifestEntry = findManifestEntry(artifactId, manifest);
        if (!manifestEntry) {
          pushError(errors, {
            code: "LOCKFILE_UNKNOWN_ARTIFACT_ID",
            message: "Artifact id must exist in the known official manifest.",
            artifactId,
            path: `artifacts[${index}].artifactId`,
          });
        } else {
          if (artifact.officialDomain !== manifestEntry.domain) {
            pushError(errors, {
              code: "LOCKFILE_OFFICIAL_DOMAIN_INVALID",
              message: "Artifact official domain must match the known manifest.",
              artifactId,
              path: `artifacts[${index}].officialDomain`,
            });
          }
          if (artifact.officialUrl !== manifestEntry.url) {
            pushError(errors, {
              code: "LOCKFILE_OFFICIAL_URL_INVALID",
              message: "Artifact official URL must match the known manifest.",
              artifactId,
              path: `artifacts[${index}].officialUrl`,
            });
          }
        }

        for (const [field, value] of [
          ["expectedFilename", artifact.expectedFilename],
          ["localFilename", artifact.localFilename],
        ] as const) {
          if (typeof value !== "string") {
            pushError(errors, {
              code: "LOCKFILE_EXTENSION_INVALID",
              message: "Artifact filename must be a string.",
              artifactId,
              path: `artifacts[${index}].${field}`,
            });
            continue;
          }
          const blocker = extensionBlocker(value);
          if (blocker) {
            pushError(errors, {
              code: blocker,
              message: "Artifact filename extension is not allowed.",
              artifactId,
              path: `artifacts[${index}].${field}`,
            });
          }
        }

        if (typeof artifact.sha256 !== "string" || !SHA256_REGEX.test(artifact.sha256)) {
          pushError(errors, {
            code: "LOCKFILE_SHA256_INVALID",
            message: "Artifact SHA-256 must be a lowercase 64-character hex string.",
            artifactId,
            path: `artifacts[${index}].sha256`,
          });
        }
        if (
          typeof artifact.byteLength !== "number" ||
          !Number.isInteger(artifact.byteLength) ||
          artifact.byteLength <= 0
        ) {
          pushError(errors, {
            code: "LOCKFILE_BYTE_LENGTH_INVALID",
            message: "Artifact byte length must be a positive integer.",
            artifactId,
            path: `artifacts[${index}].byteLength`,
          });
        }
        if (artifact.importGraphComplete !== true) {
          pushError(errors, {
            code: "LOCKFILE_IMPORT_GRAPH_INCOMPLETE",
            message: "Artifact import/include graph must be complete.",
            artifactId,
            path: `artifacts[${index}].importGraphComplete`,
          });
        }
      });
    }
  }

  if (errors.length > 0) {
    return {
      marker: PHASE2B7V_LOCKFILE_CONTRACT_MARKER,
      status: "blocked",
      errors,
      containsXmlOrXsdContent: false,
      containsSecrets: false,
      networkUsed: false,
      certificatesUsed: false,
    };
  }

  return {
    marker: PHASE2B7V_LOCKFILE_CONTRACT_MARKER,
    status: "valid",
    errors: [],
    containsXmlOrXsdContent: false,
    containsSecrets: false,
    networkUsed: false,
    certificatesUsed: false,
  };
}

export function buildOfficialArtifactLockfile(
  input: BuildOfficialArtifactLockfileInput,
): OfficialArtifactLockfileBuildResult {
  const manifest = input.manifest ?? OFFICIAL_ARTIFACT_MANIFEST;
  const requiredArtifacts = input.requiredArtifacts ?? DEFAULT_LOCAL_REQUIRED_XSD_ARTIFACTS;
  const baseDirectory = path.resolve(input.baseDirectory);
  const errors: OfficialArtifactLockfileError[] = [];
  const entries: OfficialArtifactLockfileEntry[] = [];

  for (const required of requiredArtifacts) {
    const manifestEntry = findManifestEntry(required.artifactId, manifest);
    const localPath = path.join(baseDirectory, required.expectedFileName);
    const checksum = computeLocalArtifactSha256({ filePath: localPath });
    const graph = inspectLocalXsdImportGraph({ filePath: localPath, baseDirectory });

    if (!manifestEntry) {
      pushError(errors, {
        code: "LOCKFILE_UNKNOWN_ARTIFACT_ID",
        message: "Artifact id must exist in the known official manifest.",
        artifactId: required.artifactId,
      });
      continue;
    }
    if (checksum.status !== "ready") {
      pushError(errors, {
        code: "LOCKFILE_SHA256_INVALID",
        message: "Cannot calculate a safe SHA-256 for the local artifact.",
        artifactId: required.artifactId,
      });
      continue;
    }

    entries.push({
      artifactId: required.artifactId,
      expectedFilename: required.expectedFileName,
      localFilename: checksum.safeFileName,
      officialUrl: manifestEntry.url,
      officialDomain: manifestEntry.domain,
      version: manifestEntry.version,
      sha256: checksum.sha256,
      byteLength: checksum.byteLength,
      contentTypeCandidate: "application/xml+schema",
      importedBy: [],
      imports: graph.dependencies
        .filter((dependency) => dependency.kind === "import")
        .map((dependency) => dependency.schemaLocation),
      includes: graph.dependencies
        .filter((dependency) => dependency.kind === "include")
        .map((dependency) => dependency.schemaLocation),
      importGraphComplete: graph.status === "ready",
      safeForOfflineTests: false,
      notes: "Generated from manual local intake; artifact content omitted.",
      ...(input.includeLocalPaths ? { localPath } : {}),
    });
  }

  const importedByByFilename = new Map<string, string[]>();
  for (const entry of entries) {
    for (const dependency of [...entry.imports, ...entry.includes]) {
      const dependencyFileName = path.basename(dependency);
      importedByByFilename.set(dependencyFileName, [
        ...(importedByByFilename.get(dependencyFileName) ?? []),
        entry.artifactId,
      ]);
    }
  }

  const lockfile: OfficialArtifactLockfile = {
    lockfileVersion: OFFICIAL_ARTIFACT_LOCKFILE_VERSION,
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    generatedBy: input.generatedBy ?? "phase2b7w-local-lockfile-generator",
    source: "manual_local_intake",
    artifacts: entries.map((entry) => ({
      ...entry,
      importedBy: unique(importedByByFilename.get(entry.localFilename) ?? []),
    })),
  };

  const validation = validateOfficialArtifactLockfile(
    input.includeLocalPaths ? redactOfficialArtifactLockfile(lockfile) : lockfile,
    { manifest },
  );
  if (validation.status === "blocked") {
    errors.push(...validation.errors);
  }

  return errors.length > 0
    ? { status: "blocked", lockfile: entries.length > 0 ? lockfile : null, errors }
    : { status: "ready", lockfile, errors: [] };
}
