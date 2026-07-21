import type {
  FiscalNotificationLibraryAiAuditInputV1,
  FiscalNotificationLibraryAiAuditResultV1,
} from "./library-ai-audit.v1";

const CURRENT_FUTURE_CLAIM =
  /\b(?:fecha\s+)?futur[ao]s?\b|\bposterior(?:es)?\s+(?:a\s+)?(?:hoy|la fecha (?:actual|de revisi[oó]n))\b|\b(?:todav[ií]a|a[uú]n)\s+no\s+ha(?:n)?\s+ocurrido\b/iu;
const CURRENT_PAST_CLAIM =
  /\b(?:fecha\s+)?pasad[ao]s?\b|\banterior(?:es)?\s+(?:a\s+)?(?:hoy|la fecha (?:actual|de revisi[oó]n))\b|\bya\s+ha(?:n)?\s+ocurrido\b/iu;
const DATE_CANDIDATE = /\b(?:\d{4}-\d{2}-\d{2}|\d{2}\/\d{2}\/\d{4})\b/gu;

export function resolveFiscalNotificationAuditReferenceDateIsoV1(
  now = new Date(),
): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const value = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );
  return `${value.year}-${value.month}-${value.day}`;
}

export function validateFiscalNotificationLibraryAiAuditTemporalClaimsV1(input: {
  readonly audit: FiscalNotificationLibraryAiAuditInputV1;
  readonly result: FiscalNotificationLibraryAiAuditResultV1;
  readonly referenceDateIso: string;
}): FiscalNotificationLibraryAiAuditResultV1 {
  const referenceDate = parseCalendarDate(input.referenceDateIso);
  if (referenceDate === null) return input.result;

  let rejectedFindings = 0;
  const findings = input.result.findings.filter((finding) => {
    if (finding.category !== "DATE_OR_REFERENCE") return true;
    const text = [
      finding.title,
      finding.detail,
      finding.recommendation,
      ...finding.evidence.flatMap((evidence) => [
        evidence.label,
        evidence.value,
      ]),
    ].join("\n");
    if (isSupportedCurrentRelativeClaim(text, referenceDate)) return true;
    rejectedFindings += 1;
    return false;
  });
  const summaryRejected = !isSupportedCurrentRelativeClaim(
    input.result.summary,
    referenceDate,
  );
  if (rejectedFindings === 0 && !summaryRejected) return input.result;

  const rejectedCount = rejectedFindings + (summaryRejected ? 1 : 0);
  const summary =
    `Revisión completada con ${findings.length} hallazgo${findings.length === 1 ? "" : "s"} verificable${findings.length === 1 ? "" : "s"}. ` +
    `Se descart${rejectedCount === 1 ? "ó" : "aron"} ${rejectedCount} afirmación${rejectedCount === 1 ? "" : "es"} temporal${rejectedCount === 1 ? "" : "es"} sin respaldo respecto al ${input.referenceDateIso}.`;

  return Object.freeze({
    ...input.result,
    summary,
    findings: Object.freeze(findings),
  });
}

function isSupportedCurrentRelativeClaim(
  text: string,
  referenceDate: number,
): boolean {
  const claimsFuture = CURRENT_FUTURE_CLAIM.test(text);
  const claimsPast = CURRENT_PAST_CLAIM.test(text);
  if (!claimsFuture && !claimsPast) return true;
  const dates = extractCalendarDates(text);
  if (dates.length === 0) return false;
  if (claimsFuture && !dates.some((date) => date > referenceDate)) return false;
  if (claimsPast && !dates.some((date) => date < referenceDate)) return false;
  return true;
}

function extractCalendarDates(text: string): readonly number[] {
  return [...text.matchAll(DATE_CANDIDATE)].flatMap((match) => {
    const parsed = parseCalendarDate(match[0]);
    return parsed === null ? [] : [parsed];
  });
}

function parseCalendarDate(value: string): number | null {
  const normalized = /^\d{2}\/\d{2}\/\d{4}$/u.test(value)
    ? `${value.slice(6, 10)}-${value.slice(3, 5)}-${value.slice(0, 2)}`
    : value;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/u.exec(normalized);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return year * 10_000 + month * 100 + day;
}
