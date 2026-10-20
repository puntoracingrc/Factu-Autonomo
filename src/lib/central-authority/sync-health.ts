export type CentralSyncArea =
  "access" | "device" | "business" | "invoices" | "fiscal";

export type CentralSyncOutcome = { ok: true } | { ok: false; message: string };
export type CentralSyncFailures = Partial<Record<CentralSyncArea, string>>;

/** UI health only. This never authorizes a write, advances a cursor or clears a queue. */
export function recordCentralSyncOutcome(
  previous: CentralSyncFailures,
  area: CentralSyncArea,
  outcome: CentralSyncOutcome,
): CentralSyncFailures {
  if (!outcome.ok) {
    return previous[area] === outcome.message
      ? previous
      : { ...previous, [area]: outcome.message };
  }
  // Both event APIs independently verify company membership, plan, device and
  // session. A successful, durably applied page also proves access recovered.
  const recovered: CentralSyncArea[] =
    area === "business" || area === "invoices"
      ? [area, "access", "device"]
      : [area];
  if (!recovered.some((key) => previous[key] !== undefined)) return previous;
  const next = { ...previous };
  for (const key of recovered) delete next[key];
  return next;
}

export function centralSyncFailureMessage(
  failures: CentralSyncFailures,
): string | null {
  for (const area of ["access", "device", "invoices", "business", "fiscal"] as const) {
    if (failures[area]) return failures[area]!;
  }
  return null;
}
