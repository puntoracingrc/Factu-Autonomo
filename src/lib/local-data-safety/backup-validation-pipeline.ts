import { buildLocalDataBackupIntegrityDigest } from "./backup-integrity";
import {
  buildLocalDataBackupManifest,
  validateLocalDataBackupManifest,
} from "./backup-manifest";
import {
  inspectLocalDataBackupIntakeCandidate,
  summarizeLocalDataBackupIntake,
} from "./backup-intake";
import { LocalDataSafetyError } from "./errors";
import { cloneJson, isPlainObject, nowIso, uniqueRiskFlags } from "./helpers";
import { planLocalDataImportDryRun, summarizeLocalDataImportDryRun } from "./import-dry-run";
import { buildLocalDataSafetyReport } from "./local-data-safety-report";
import {
  detectMalformedLocalDataBackup,
  summarizeMalformedBackupFindings,
} from "./malformed-backup-hardening";
import {
  buildPreImportRecoverySnapshot,
  summarizePreImportRecoverySnapshot,
} from "./recovery-snapshot";
import type {
  LocalDataBackupIntakeCandidate,
  LocalDataBackupValidationPipelineError,
  LocalDataBackupValidationPipelineOptions,
  LocalDataBackupValidationPipelineResult,
  LocalDataBackupValidationPipelineSummary,
  LocalDataBackupValidationStage,
  LocalDataRiskFlag,
  LocalDataSafetyAppData,
} from "./types";

// PHASE2D12_BACKUP_VALIDATION_PIPELINE_V1

function failure(
  stage: LocalDataBackupValidationStage,
  code: string,
  message: string,
): LocalDataBackupValidationPipelineError {
  return { stage, code, message };
}

function toAppData(value: unknown): LocalDataSafetyAppData {
  if (!isPlainObject(value)) {
    throw new LocalDataSafetyError("MALFORMED_BACKUP", "Backup parsed object must be a plain object.");
  }
  return value as LocalDataSafetyAppData;
}

function invalidResult(
  base: Omit<LocalDataBackupValidationPipelineResult, "status" | "stoppedAt">,
  stoppedAt: LocalDataBackupValidationStage,
  errors: LocalDataBackupValidationPipelineError[],
  riskFlags: LocalDataRiskFlag[],
): LocalDataBackupValidationPipelineResult {
  return {
    ...base,
    status: "invalid",
    stoppedAt,
    errors,
    riskFlags: uniqueRiskFlags([...base.riskFlags, ...riskFlags, "backup_validation_failed"]),
  };
}

export function runLocalDataBackupValidationPipeline(
  currentData: LocalDataSafetyAppData,
  intakeCandidate: LocalDataBackupIntakeCandidate,
  options: LocalDataBackupValidationPipelineOptions = {},
): LocalDataBackupValidationPipelineResult {
  const validatedAt = options.validatedAt ?? nowIso();
  const intake = inspectLocalDataBackupIntakeCandidate(intakeCandidate, {
    inspectedAt: validatedAt,
    ...options.intake,
  });
  const base = {
    marker: "PHASE2D12_BACKUP_VALIDATION_PIPELINE_V1" as const,
    validatedAt,
    intake,
    errors: [],
    riskFlags: [] as LocalDataRiskFlag[],
  };

  if (!intake.accepted) {
    return invalidResult(
      base,
      "intake",
      intake.errors.map((entry) => failure("intake", entry.code, entry.message)),
      ["backup_intake_rejected"],
    );
  }
  if (intakeCandidate.parsedObject === undefined) {
    return invalidResult(
      base,
      "intake",
      [failure("intake", "MISSING_PARSED_OBJECT", "Backup parsed object is required for validation.")],
      ["backup_intake_rejected"],
    );
  }

  const malformed = detectMalformedLocalDataBackup(intakeCandidate.parsedObject);
  const malformedSummary = summarizeMalformedBackupFindings(malformed);
  if (!malformed.safe) {
    return invalidResult(
      {
        ...base,
        malformedFindings: malformedSummary,
      },
      "malformed_hardening",
      malformed.findings.map((finding) => failure("malformed_hardening", finding.code, "Backup object is malformed.")),
      ["backup_malformed"],
    );
  }

  try {
    const incomingData = toAppData(cloneJson(intakeCandidate.parsedObject));
    const currentClone = cloneJson(currentData);
    const digest = buildLocalDataBackupIntegrityDigest(incomingData, validatedAt);
    const manifest = validateLocalDataBackupManifest(
      buildLocalDataBackupManifest(incomingData, {
        generatedAt: validatedAt,
        source: "import_preview",
        integrityDigest: digest.value,
      }),
    );
    const importPlan = planLocalDataImportDryRun(currentClone, incomingData, {
      plannedAt: validatedAt,
    });
    const recoverySnapshot = buildPreImportRecoverySnapshot(currentClone, {
      createdAt: validatedAt,
      reason: "before_import",
    });
    const safeReport = buildLocalDataSafetyReport({
      manifest,
      integrityDigest: digest,
      importPlan,
      recoverySnapshot,
      generatedAt: validatedAt,
    });

    return {
      ...base,
      status: "valid",
      stoppedAt: "completed",
      malformedFindings: malformedSummary,
      manifest,
      integrityDigest: digest,
      importPlan,
      recoverySnapshot: summarizePreImportRecoverySnapshot(recoverySnapshot),
      safeReport,
      errors: [],
      riskFlags: uniqueRiskFlags([
        ...manifest.riskFlags,
        ...importPlan.riskFlags,
        ...safeReport.riskFlags,
      ]),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Backup validation failed.";
    const code = error instanceof LocalDataSafetyError ? error.code : "VALIDATION_ERROR";
    return invalidResult(
      {
        ...base,
        malformedFindings: malformedSummary,
      },
      code === "INVALID_MANIFEST" ? "manifest" : "safe_report",
      [failure(code === "INVALID_MANIFEST" ? "manifest" : "safe_report", code, message)],
      [],
    );
  }
}

export function summarizeLocalDataBackupValidationPipeline(
  result: LocalDataBackupValidationPipelineResult,
): LocalDataBackupValidationPipelineSummary {
  return {
    status: result.status,
    validatedAt: result.validatedAt,
    stoppedAt: result.stoppedAt,
    intake: summarizeLocalDataBackupIntake(result.intake),
    totals: result.manifest?.totals,
    importPlan: result.importPlan ? summarizeLocalDataImportDryRun(result.importPlan) : undefined,
    recoverySnapshotPresent: Boolean(result.recoverySnapshot),
    safeReportPresent: Boolean(result.safeReport),
    errorCodes: result.errors.map((entry) => entry.code),
    riskFlags: [...result.riskFlags],
  };
}
