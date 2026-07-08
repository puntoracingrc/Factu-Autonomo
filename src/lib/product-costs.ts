export function calculatePurchaseNetUnitCost(
  listPrice: number | undefined,
  discountPercent: number | undefined,
): number | undefined {
  if (listPrice === undefined || !Number.isFinite(listPrice)) return undefined;
  const discount =
    discountPercent !== undefined && Number.isFinite(discountPercent)
      ? discountPercent
      : 0;
  return Math.round(listPrice * (1 - discount / 100) * 100) / 100;
}

export function formatProductCostInput(value: number | undefined): string {
  if (value === undefined || !Number.isFinite(value)) return "";
  return value.toFixed(2).replace(".", ",");
}

export function purchaseNetUnitCostInputFromFields(
  listPriceInput: string,
  discountPercentInput: string,
  parseInput: (value: string) => number | undefined,
): string {
  return formatProductCostInput(
    calculatePurchaseNetUnitCost(
      parseInput(listPriceInput),
      parseInput(discountPercentInput),
    ),
  );
}
