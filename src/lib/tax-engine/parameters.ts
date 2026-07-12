export interface MaintenanceDailyLimitSet {
  version: string;
  effectiveFrom: string;
  domesticWithoutOvernightCents: number;
  foreignWithoutOvernightCents: number;
  domesticWithOvernightCents: number;
  foreignWithOvernightCents: number;
}

export const MAINTENANCE_DAILY_LIMITS: MaintenanceDailyLimitSet = {
  version: "2018-01",
  effectiveFrom: "2018-01-01",
  domesticWithoutOvernightCents: 2_667,
  foreignWithoutOvernightCents: 4_808,
  domesticWithOvernightCents: 5_334,
  foreignWithOvernightCents: 9_135,
};

export function maintenanceDailyLimitCents(
  location: "SPAIN" | "FOREIGN",
  overnight: boolean,
): number {
  if (location === "FOREIGN") {
    return overnight
      ? MAINTENANCE_DAILY_LIMITS.foreignWithOvernightCents
      : MAINTENANCE_DAILY_LIMITS.foreignWithoutOvernightCents;
  }
  return overnight
    ? MAINTENANCE_DAILY_LIMITS.domesticWithOvernightCents
    : MAINTENANCE_DAILY_LIMITS.domesticWithoutOvernightCents;
}
