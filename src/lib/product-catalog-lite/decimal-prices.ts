/** Product prices only: exact decimal ratios, rounded half-up to cents. */
function ratio(value: number): [bigint,bigint] {
  if(!Number.isFinite(value)||value<0||value>1e12)throw Error("Precio o porcentaje fuera de rango.");
  const [mantissa,exponent="0"]=String(value).toLowerCase().split("e");
  const [whole,fraction=""]=mantissa.split(".");
  const places=fraction.length-Number(exponent),coefficient=BigInt(whole+fraction);
  return places>=0?[coefficient,BigInt(10)**BigInt(places)]:[coefficient*BigInt(10)**BigInt(-places),BigInt(1)];
}
function cents(numerator: bigint, denominator: bigint) {
  return Number((numerator*BigInt(200)+denominator)/(denominator*BigInt(2)))/100;
}
export function discountedProductCost(listPrice: number, discountPercent: number): number {
  if(discountPercent<0||discountPercent>100)throw Error("Descuento fuera de rango.");
  const [price,priceScale]=ratio(listPrice),[discount,discountScale]=ratio(discountPercent);
  return cents(price*(BigInt(100)*discountScale-discount),priceScale*BigInt(100)*discountScale);
}
export function grossProductPrice(netPrice: number, vatPercent: number): number {
  if(vatPercent<0||vatPercent>100)throw Error("IVA fuera de rango.");
  const [price,priceScale]=ratio(netPrice),[vat,vatScale]=ratio(vatPercent);
  return cents(price*(BigInt(100)*vatScale+vat),priceScale*BigInt(100)*vatScale);
}
