const PERCENT_DENOMINATOR = 100;

export function minimumCents(amountCents: number, limitCents: number): number {
  return Math.min(amountCents, limitCents);
}

export function percentageOfCents(
  amountCents: number,
  percentage: number,
): number {
  return Number(
    (BigInt(amountCents) * BigInt(percentage)) / BigInt(PERCENT_DENOMINATOR),
  );
}

export function proportionalCents(
  amountCents: number,
  deductibleBasisCents: number,
  totalBasisCents: number,
): number {
  if (amountCents <= 0 || deductibleBasisCents <= 0 || totalBasisCents <= 0) {
    return 0;
  }
  const proportional = Number(
    (BigInt(amountCents) * BigInt(deductibleBasisCents)) /
      BigInt(totalBasisCents),
  );
  return Math.min(amountCents, proportional);
}

export function percentageFromAmounts(
  deductibleAmountCents: number,
  totalAmountCents: number,
): number {
  if (deductibleAmountCents <= 0 || totalAmountCents <= 0) return 0;
  return Math.min(
    100,
    Number(
      (BigInt(deductibleAmountCents) * BigInt(100)) /
        BigInt(totalAmountCents),
    ),
  );
}

export function annualOnePercentLimitCents(netTurnoverCents: number): number {
  return Math.floor(netTurnoverCents / 100);
}

export function remainingLimitCents(
  limitCents: number,
  consumedCents: number,
): number {
  return Math.max(0, limitCents - consumedCents);
}
