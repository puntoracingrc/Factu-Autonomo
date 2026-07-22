"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save } from "lucide-react";
import {
  ProductDuplicateNotice,
  ProductFormFields,
} from "@/components/products/ProductFormFields";
import { ProductUnsavedChangesDialog } from "@/components/products/ProductUnsavedChangesDialog";
import { Button } from "@/components/ui/Button";
import { Card, PageHeader } from "@/components/ui/Card";
import { useAppStore } from "@/context/AppStore";
import { useBilling } from "@/context/BillingContext";
import { normalizeDocumentUnitId } from "@/lib/document-units";
import {
  clearDocumentProductPickRequest,
  getDocumentProductPickRequest,
  productSummaryToPickedLine,
  saveDocumentProductPickedLine,
  type DocumentProductPickRequest,
} from "@/lib/product-document-draft";
import { productAttributesFromText } from "@/lib/product-attributes";
import {
  EMPTY_PRODUCT_FORM_DRAFT,
  findProductDuplicateCandidates,
  normalizeProductCalculationKind,
  productCalculationUnit,
  productFormDraftFromDocumentPrefill,
  productFormHasChanges,
  type ProductDuplicateCandidate,
  type ProductFormDraft,
} from "@/lib/product-form";
import { saveProductCatalogEditRequest } from "@/lib/product-form-navigation";
import {
  buildPurchaseProductSummaries,
  purchaseProductKey,
} from "@/lib/purchase-products";
import {
  calculatePurchaseNetUnitCost,
  purchaseNetUnitCostInputFromFields,
} from "@/lib/product-costs";
import {
  parseOptionalProductNumber,
  PRODUCT_NUMERIC_FIELD_ORDER,
  validateProductNumericInputs,
  type ProductNumericErrors,
  type ProductNumericField,
} from "@/lib/product-form-validation";

export default function NuevoProductoPage() {
  const router = useRouter();
  const { data, addProduct } = useAppStore();
  const { checkCanAddProduct } = useBilling();
  const [form, setForm] = useState<ProductFormDraft>(EMPTY_PRODUCT_FORM_DRAFT);
  const [initialForm, setInitialForm] = useState<ProductFormDraft>(
    EMPTY_PRODUCT_FORM_DRAFT,
  );
  const [purchaseCostManual, setPurchaseCostManual] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<ProductNumericErrors>({});
  const [saving, setSaving] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);
  const savingRef = useRef(false);
  const pendingExitRef = useRef<(() => void) | null>(null);
  const [documentPickRequest, setDocumentPickRequest] =
    useState<DocumentProductPickRequest | null>(null);

  const productSummaries = useMemo(
    () => buildPurchaseProductSummaries(data.expenses, data.products),
    [data.expenses, data.products],
  );

  useLayoutEffect(() => {
    const request = getDocumentProductPickRequest();
    setDocumentPickRequest(request);
    const prefill = request?.prefill;
    if (!prefill) return;
    const next = productFormDraftFromDocumentPrefill(prefill);
    setForm(next);
    setInitialForm(next);
  }, []);

  const dirty = productFormHasChanges(initialForm, form);

  useEffect(() => {
    if (!dirty) return;
    const warnBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", warnBeforeUnload);
    return () => window.removeEventListener("beforeunload", warnBeforeUnload);
  }, [dirty]);

  const familyOptions = useMemo(
    () =>
      [
        ...new Set(
          [
            ...productSummaries.map((product) => product.family),
            ...data.products.map((product) => product.family),
          ]
            .map((family) => family.trim())
            .filter(Boolean),
        ),
      ].sort((a, b) => a.localeCompare(b, "es")),
    [data.products, productSummaries],
  );

  const subfamilyOptions = useMemo(
    () =>
      [
        ...new Set(
          [
            ...productSummaries
              .filter(
                (product) =>
                  !form.family.trim() || product.family === form.family.trim(),
              )
              .map((product) => product.subfamily),
            ...data.products
              .filter(
                (product) =>
                  !form.family.trim() || product.family === form.family.trim(),
              )
              .map((product) => product.subfamily),
          ]
            .map((subfamily) => subfamily?.trim())
            .filter((value): value is string => Boolean(value)),
        ),
      ].sort((a, b) => a.localeCompare(b, "es")),
    [data.products, form.family, productSummaries],
  );

  const supplierOptions = useMemo(
    () => data.suppliers.map((supplier) => supplier.name).sort(),
    [data.suppliers],
  );

  const duplicateCandidates = useMemo(
    () => findProductDuplicateCandidates(form, productSummaries),
    [form, productSummaries],
  );

  function updateField(field: keyof ProductFormDraft, value: string) {
    setForm((current) => {
      const next = {
        ...current,
        [field]: value,
        ...(field === "family" ? { subfamily: "" } : {}),
        ...(field === "calculationKind"
          ? {
              saleUnit: productCalculationUnit(
                normalizeProductCalculationKind(value),
                current.saleUnit,
              ),
            }
          : {}),
      } as ProductFormDraft;

      if (field === "purchaseNetUnitCost") {
        const manual = value.trim().length > 0;
        setPurchaseCostManual(manual);
        if (!manual) {
          next.purchaseNetUnitCost = purchaseNetUnitCostInputFromFields(
            next.purchaseListPrice,
            next.purchaseDiscountPercent,
            parseOptionalProductNumber,
          );
        }
        return next;
      }

      if (
        !purchaseCostManual &&
        (field === "purchaseListPrice" || field === "purchaseDiscountPercent")
      ) {
        next.purchaseNetUnitCost = purchaseNetUnitCostInputFromFields(
          next.purchaseListPrice,
          next.purchaseDiscountPercent,
          parseOptionalProductNumber,
        );
      }

      return next;
    });
    if (PRODUCT_NUMERIC_FIELD_ORDER.includes(field as ProductNumericField)) {
      setFieldErrors((current) => {
        if (!current[field as ProductNumericField]) return current;
        const next = { ...current };
        delete next[field as ProductNumericField];
        return next;
      });
    }
    setError(null);
  }

  function handleSave() {
    if (savingRef.current) return;
    const name = form.name.trim();
    if (!name) {
      setError("Escribe el nombre del producto.");
      return;
    }

    const numericValidation = validateProductNumericInputs({
      salePrice: form.salePrice,
      saleIvaPercent: form.saleIvaPercent,
      purchaseListPrice: form.purchaseListPrice,
      purchaseDiscountPercent: form.purchaseDiscountPercent,
      purchaseNetUnitCost: form.purchaseNetUnitCost,
    });
    if (!numericValidation.ok) {
      setFieldErrors(numericValidation.errors);
      setError("Revisa los importes indicados antes de guardar el producto.");
      requestAnimationFrame(() => {
        if (numericValidation.firstInvalidField) {
          document
            .getElementById(
              `new-product-${numericValidation.firstInvalidField}`,
            )
            ?.focus();
        }
      });
      return;
    }
    setFieldErrors({});

    const key = purchaseProductKey(name);
    if (data.products.some((product) => product.key === key)) {
      setError(
        "Ya existe un producto muy parecido. Ábrelo desde la coincidencia indicada.",
      );
      return;
    }

    const productLimit = checkCanAddProduct(
      data.products.filter((product) => !product.hidden).length,
    );
    if (!productLimit.allowed) {
      setError(
        productLimit.reason ??
          "No puedes añadir más productos con tu plan actual.",
      );
      return;
    }

    savingRef.current = true;
    setSaving(true);

    const supplierName = form.supplierName.trim();
    const supplier = data.suppliers.find(
      (entry) => entry.name.toLowerCase() === supplierName.toLowerCase(),
    );
    const {
      salePrice,
      saleIvaPercent,
      purchaseListPrice,
      purchaseDiscountPercent,
    } = numericValidation.values;
    const purchaseNetUnitCost =
      numericValidation.values.purchaseNetUnitCost ??
      calculatePurchaseNetUnitCost(purchaseListPrice, purchaseDiscountPercent);
    const calculationKind = normalizeProductCalculationKind(
      form.calculationKind,
    );
    const manualSaleUnit =
      (normalizeDocumentUnitId(form.saleUnit) ?? form.saleUnit.trim()) || "ud";
    const saleUnit = productCalculationUnit(calculationKind, manualSaleUnit);
    const purchaseUnit =
      (normalizeDocumentUnitId(form.purchaseUnit) ??
        form.purchaseUnit.trim()) ||
      saleUnit;

    let created: ReturnType<typeof addProduct>;
    try {
      created = addProduct({
        key,
        aliases: [],
        sku: form.sku.trim() || undefined,
        name,
        family: form.family.trim() || "Sin familia",
        subfamily: form.subfamily.trim() || undefined,
        unit: saleUnit,
        supplierId: supplier?.id,
        supplierName: supplier?.name ?? (supplierName || undefined),
        pvp: purchaseListPrice,
        cost: purchaseNetUnitCost,
        ivaPercent: saleIvaPercent,
        sales: {
          enabled: true,
          description: form.saleDescription.trim() || undefined,
          unit: saleUnit,
          unitPrice: salePrice,
          ivaPercent: saleIvaPercent,
        },
        purchase: {
          enabled: Boolean(
            supplierName ||
            form.purchaseDescription.trim() ||
            form.supplierReference.trim() ||
            purchaseListPrice ||
            purchaseDiscountPercent ||
            purchaseNetUnitCost,
          ),
          description: form.purchaseDescription.trim() || undefined,
          unit: purchaseUnit,
          listPrice: purchaseListPrice,
          discountPercent: purchaseDiscountPercent,
          netUnitCost: purchaseNetUnitCost,
          ivaPercent: saleIvaPercent,
          supplierId: supplier?.id,
          supplierName: supplier?.name ?? (supplierName || undefined),
          supplierReference: form.supplierReference.trim() || undefined,
        },
        calculation:
          calculationKind !== "none"
            ? {
                kind: calculationKind,
                unit: saleUnit,
                roundingDecimals: form.calculationRoundingDecimals,
              }
            : undefined,
        attributes: productAttributesFromText(form.attributesText),
        notes: form.notes.trim() || undefined,
        source: "manual",
      });
    } catch {
      savingRef.current = false;
      setSaving(false);
      setError("No se ha podido guardar el producto. Inténtalo de nuevo.");
      return;
    }

    if (documentPickRequest) {
      const createdSummary = buildPurchaseProductSummaries([], [created])[0];
      if (
        !createdSummary ||
        !saveDocumentProductPickedLine(
          productSummaryToPickedLine(
            createdSummary,
            documentPickRequest,
            data.profile.iva?.defaultRate ?? 21,
          ),
        )
      ) {
        setError(
          "El producto se ha guardado, pero no se pudo llevar al documento.",
        );
        return;
      }
      clearDocumentProductPickRequest();
      router.push(documentPickRequest.returnPath);
      return;
    }
    router.push("/productos");
  }

  function leaveForm() {
    if (documentPickRequest) {
      clearDocumentProductPickRequest();
      router.push(documentPickRequest.returnPath);
      return;
    }
    router.push("/productos");
  }

  function requestExit(action: () => void) {
    if (!dirty) {
      action();
      return;
    }
    pendingExitRef.current = action;
    setDiscardOpen(true);
  }

  function handleOpenCandidate(candidate: ProductDuplicateCandidate) {
    requestExit(() => {
      saveProductCatalogEditRequest(candidate.key);
      router.push("/productos");
    });
  }

  function discardAndExit() {
    const action = pendingExitRef.current;
    pendingExitRef.current = null;
    setDiscardOpen(false);
    action?.();
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Nuevo producto"
        subtitle={
          documentPickRequest
            ? "Se guardará en Productos y volverá al documento."
            : "Crea un material o servicio habitual para reutilizarlo."
        }
        action={
          <Button
            type="button"
            variant="secondary"
            onClick={() => requestExit(leaveForm)}
          >
            <ArrowLeft className="h-5 w-5" />
            {documentPickRequest ? "Volver al documento" : "Volver"}
          </Button>
        }
      />

      <form
        onSubmit={(event) => {
          event.preventDefault();
          handleSave();
        }}
      >
        <Card className="overflow-hidden !rounded-lg !p-0">
          {error ? (
            <div className="px-4 pt-4 sm:px-5">
              <div
                role="alert"
                className="rounded-lg border border-red-200 bg-red-50 px-3 py-3 text-sm font-semibold text-red-700"
              >
                {error}
              </div>
            </div>
          ) : null}

          <div className="px-4 pt-5 sm:px-5">
            <ProductFormFields
              idPrefix="new-product"
              draft={form}
              source="manual"
              fieldErrors={fieldErrors}
              familyOptions={familyOptions}
              subfamilyOptions={subfamilyOptions}
              supplierOptions={supplierOptions}
              onChange={updateField}
            />
          </div>

          <ProductDuplicateNotice
            candidates={duplicateCandidates}
            onOpen={handleOpenCandidate}
          />

          <div className="flex flex-col gap-2 border-t border-slate-200 bg-slate-50 px-4 py-4 sm:flex-row sm:justify-end sm:px-5">
            <Button
              type="button"
              variant="secondary"
              onClick={() => requestExit(leaveForm)}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              <Save className="h-5 w-5" />
              {saving
                ? "Guardando..."
                : documentPickRequest
                  ? "Guardar y volver"
                  : "Guardar producto"}
            </Button>
          </div>
        </Card>
      </form>

      <ProductUnsavedChangesDialog
        open={discardOpen}
        onContinue={() => {
          pendingExitRef.current = null;
          setDiscardOpen(false);
        }}
        onDiscard={discardAndExit}
      />
    </div>
  );
}
