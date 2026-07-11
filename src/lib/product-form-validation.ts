export const PRODUCT_NUMERIC_FIELD_ORDER = [
  "salePrice",
  "saleIvaPercent",
  "purchaseListPrice",
  "purchaseDiscountPercent",
  "purchaseNetUnitCost",
] as const;

export type ProductNumericField = (typeof PRODUCT_NUMERIC_FIELD_ORDER)[number];

export type ProductNumericInputs = Record<ProductNumericField, string>;
export type ProductNumericValues = Record<
  ProductNumericField,
  number | undefined
>;
export type ProductNumericErrors = Partial<Record<ProductNumericField, string>>;

export interface ProductNumericValidation {
  ok: boolean;
  values: ProductNumericValues;
  errors: ProductNumericErrors;
  firstInvalidField?: ProductNumericField;
}

const DECIMAL_INPUT_PATTERN = /^[+-]?(?:\d+(?:[.,]\d*)?|[.,]\d+)$/;

export function parseOptionalProductNumber(value: string): number | undefined {
  const normalized = value.trim();
  if (!normalized || !DECIMAL_INPUT_PATTERN.test(normalized)) return undefined;
  const parsed = Number(normalized.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : undefined;
}

const FIELD_CONSTRAINTS: Record<
  ProductNumericField,
  { min: number; max?: number; error: string }
> = {
  salePrice: {
    min: 0,
    error: "Introduce un precio de venta válido (0 o superior).",
  },
  saleIvaPercent: {
    min: 0,
    max: 100,
    error: "Introduce un IVA válido entre 0 y 100.",
  },
  purchaseListPrice: {
    min: 0,
    error: "Introduce una tarifa de proveedor válida (0 o superior).",
  },
  purchaseDiscountPercent: {
    min: 0,
    max: 100,
    error: "Introduce un descuento válido entre 0 y 100.",
  },
  purchaseNetUnitCost: {
    min: 0,
    error: "Introduce un coste real válido (0 o superior).",
  },
};

export function validateProductNumericInputs(
  input: ProductNumericInputs,
): ProductNumericValidation {
  const values = {} as ProductNumericValues;
  const errors: ProductNumericErrors = {};

  for (const field of PRODUCT_NUMERIC_FIELD_ORDER) {
    const rawValue = input[field].trim();
    const value = parseOptionalProductNumber(rawValue);
    values[field] = value;
    if (!rawValue) continue;

    const constraint = FIELD_CONSTRAINTS[field];
    if (
      value === undefined ||
      value < constraint.min ||
      (constraint.max !== undefined && value > constraint.max)
    ) {
      errors[field] = constraint.error;
    }
  }

  const firstInvalidField = PRODUCT_NUMERIC_FIELD_ORDER.find(
    (field) => errors[field],
  );
  return {
    ok: !firstInvalidField,
    values,
    errors,
    firstInvalidField,
  };
}
