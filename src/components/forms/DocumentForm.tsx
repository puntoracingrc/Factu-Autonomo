"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowDown,
  ArrowUp,
  CircleHelp,
  Edit3,
  Eye,
  GripVertical,
  History,
  PackageCheck,
  PackagePlus,
  PackageSearch,
  Plus,
  Trash2,
} from "lucide-react";
import {
  ClientPicker,
  clientToFormValues,
} from "@/components/clients/ClientPicker";
import type { ClientFormValues } from "@/components/clients/ClientPicker";
import {
  clientInputToSnapshot,
  customerToFormValues,
  findCustomerByClient,
} from "@/lib/customers";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { IvaPercentSelect } from "@/components/iva/IvaPercentSelect";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { NumericFieldInput } from "@/components/ui/NumericFieldInput";
import { UpgradeModal } from "@/components/billing/UpgradeModal";
import { useAppStore } from "@/context/AppStore";
import { useBilling } from "@/context/BillingContext";
import {
  formatMoney,
  formatShortDate,
  roundMoney,
  todayISO,
  unitPriceFromGross,
  unitPriceGross,
} from "@/lib/calculations";
import { isVatExempt, zeroIvaItems } from "@/lib/vat-regime";
import {
  applyConfirmedDocumentIvaToItems,
  applyLineMeasurementDraft,
  documentFormAmounts,
  documentFormItemsForEditing,
  documentFormItemsForSave,
  firstDocumentFormLineIssue,
  lineItemFormTotal,
} from "@/lib/document-form-flow";
import {
  isAreaDocumentUnit,
  isLinearDocumentUnit,
  lineMeasurementDescriptionSuffix,
  type LineMeasurementDraft,
} from "@/lib/area-calculation";
import { DocumentPaymentPicker } from "@/components/documents/DocumentPaymentPicker";
import { DocumentPhrasePicker } from "@/components/documents/DocumentPhrasePicker";
import { DocumentPdfShareActions } from "@/components/documents/DocumentPdfShareActions";
import {
  defaultPhraseForType,
  normalizeDocumentPhrases,
} from "@/lib/document-phrases";
import {
  defaultPaymentMethodForType,
  normalizeDocumentPaymentMethods,
} from "@/lib/document-payment-methods";
import {
  normalizeDocumentUnits,
  normalizeLineItemUnits,
} from "@/lib/document-units";
import { LineItemUnitSelect } from "@/components/documents/LineItemUnitSelect";
import {
  invoiceClientMissingDocumentLabels,
  ivaBreakdownByRate,
  validateDocumentEmission,
} from "@/lib/invoice-compliance";
import {
  businessProfileMissingDocumentLabels,
  hasUsualSpanishTaxIdShape,
} from "@/lib/business-profile";
import { attachIssuerSnapshot } from "@/lib/issuer-snapshot";
import { finishDocumentSave } from "@/lib/documents/save-feedback";
import { openDocumentPdfPreview } from "@/lib/pdf";
import { defaultQuoteDueDate } from "@/lib/quote-validity";
import { maybeCelebrateFirstInvoice } from "@/lib/factu/milestones";
import { finalizeSavedVerifactuDocument } from "@/lib/verifactu/save-outcome";
import { DocumentIntegrityError } from "@/lib/document-integrity";
import { resolveDocumentFormBusinessProfile } from "@/lib/document-integrity/document-form-profile";
import { buildPurchaseProductSummaries } from "@/lib/purchase-products";
import {
  applyDocumentProductToLine,
  buildDocumentProductSuggestionIndex,
  DOCUMENT_PRODUCT_MARKUPS,
  documentProductMentionQuery,
  documentProductSaleUnitPriceInfo,
  priceWithDocumentProductMarkup,
  replaceDocumentProductMention,
  searchDocumentProductSuggestions,
  type DocumentProductSalePriceSource,
} from "@/lib/document-product-suggestions";
import {
  consumeDocumentProductPickedLine,
  consumeDocumentProductReturnDraft,
  consumeProductDocumentDraft,
  type ProductDocumentDraftLine,
  saveDocumentProductPickRequest,
  saveDocumentProductReturnDraft,
} from "@/lib/product-document-draft";
import {
  clearDocumentSessionDraft,
  getDocumentSessionDraft,
  saveDocumentSessionDraft,
  type DocumentSessionDraft,
} from "@/lib/document-session-draft";
import { productFamilyMarkupPercent } from "@/lib/product-family-markups";
import type { Document, DocumentType, LineItem, Customer } from "@/lib/types";
import type { PurchaseProductSummary } from "@/lib/purchase-products";

function emptyLine(defaultIva: number, defaultUnit: string): LineItem {
  return {
    id: crypto.randomUUID(),
    description: "",
    quantity: 1,
    unit: defaultUnit,
    unitPrice: 0,
    ivaPercent: defaultIva,
  };
}

const TYPE_LABELS: Record<DocumentType, string> = {
  factura: "factura",
  presupuesto: "presupuesto",
  recibo: "recibo",
};

const TYPE_ARTICLES: Record<DocumentType, string> = {
  factura: "esta",
  presupuesto: "este",
  recibo: "este",
};

const TYPE_ROUTES: Record<DocumentType, string> = {
  factura: "facturas",
  presupuesto: "presupuestos",
  recibo: "recibos",
};

function documentFormReturnPath(
  type: DocumentType,
  existing?: Document,
): string {
  const route = TYPE_ROUTES[type];
  return existing ? `/${route}/${existing.id}` : `/${route}/nuevo`;
}

const EMPTY_CLIENT: ClientFormValues = {
  customerType: "person",
  firstName: "",
  lastName: "",
  contactName: "",
  nif: "",
  email: "",
  phone: "",
  streetType: "",
  residenceType: "",
  address: "",
  addressExtra: "",
  city: "",
  postalCode: "",
  notes: "",
};

interface LineProductPricingState {
  basePrice: number;
  markupPercent: number;
  priceSource: DocumentProductSalePriceSource;
  productKey?: string;
  productId?: string;
  productName: string;
  costUnitPrice?: number;
  costIvaPercent?: number;
}

interface LineMarginEstimate {
  saleBase: number;
  costBase: number;
  costIva: number;
  grossMargin: number;
  irpfEstimate: number;
  netMargin: number;
  missingCost: boolean;
  kind: "product" | "free";
}

function clientFormToDraft(values: ClientFormValues): Record<string, string> {
  return {
    customerType: values.customerType,
    firstName: values.firstName,
    lastName: values.lastName,
    contactName: values.contactName,
    nif: values.nif,
    email: values.email,
    phone: values.phone,
    streetType: values.streetType,
    residenceType: values.residenceType,
    address: values.address,
    addressExtra: values.addressExtra,
    city: values.city,
    postalCode: values.postalCode,
    notes: values.notes,
  };
}

function removeLineProductPricing(
  state: Record<string, LineProductPricingState>,
  id: string,
): Record<string, LineProductPricingState> {
  const next = { ...state };
  delete next[id];
  return next;
}

function productPriceSourceLabel(
  source: DocumentProductSalePriceSource,
): string {
  if (source === "sale") return "precio venta";
  if (source === "providerTariff") return "tarifa proveedor";
  if (source === "cost") return "coste, no venta";
  return "sin precio";
}

function productPriceSourceTone(
  source: DocumentProductSalePriceSource,
): string {
  return source === "sale" ? "text-emerald-700" : "text-amber-800";
}

function resolveLineCostUnitPrice(
  pricing: LineProductPricingState,
): number | undefined {
  if (
    Number.isFinite(pricing.costUnitPrice) &&
    (pricing.costUnitPrice ?? 0) > 0
  ) {
    return pricing.costUnitPrice;
  }
  if (pricing.priceSource === "cost" && pricing.basePrice > 0) {
    return pricing.basePrice;
  }
  return undefined;
}

function estimateLineMargin(
  item: LineItem,
  pricing: LineProductPricingState | undefined,
  irpfPercent: number,
  vatExempt: boolean,
): LineMarginEstimate {
  const quantity =
    Number.isFinite(item.quantity) && item.quantity > 0 ? item.quantity : 1;
  const saleBase = roundMoney(item.unitPrice * quantity);
  const costUnitPrice = pricing ? resolveLineCostUnitPrice(pricing) : 0;
  const missingCost = Boolean(pricing && costUnitPrice === undefined);
  const costBase = missingCost ? 0 : roundMoney((costUnitPrice ?? 0) * quantity);
  const costIva =
    vatExempt || missingCost || !pricing
      ? 0
      : roundMoney(
          costBase * ((pricing.costIvaPercent ?? item.ivaPercent ?? 0) / 100),
        );
  const grossMargin = roundMoney(saleBase - costBase);
  const irpfEstimate =
    grossMargin > 0 ? roundMoney(grossMargin * (irpfPercent / 100)) : 0;
  const netMargin = roundMoney(grossMargin - irpfEstimate);

  return {
    saleBase,
    costBase,
    costIva,
    grossMargin,
    irpfEstimate,
    netMargin,
    missingCost,
    kind: pricing ? "product" : "free",
  };
}

function lineMarginSummary(
  pricing: LineProductPricingState | undefined,
  item: LineItem,
  irpfPercent: number,
  vatExempt: boolean,
): {
  text: string;
  tone: string;
  tooltip: string;
} {
  if (!pricing) {
    const estimate = estimateLineMargin(item, undefined, irpfPercent, vatExempt);
    if (estimate.saleBase <= 0) {
      return {
        text: "Línea libre: sin coste de material vinculado",
        tone: "text-slate-500",
        tooltip:
          "Sin producto vinculado: cuenta como servicio y no suma coste de material. El IVA no se cuenta como beneficio.",
      };
    }
    return {
      text: `Servicio libre · Margen ${formatMoney(
        estimate.grossMargin,
      )} · Neto estimado ${formatMoney(estimate.netMargin)}`,
      tone: estimate.grossMargin < 0 ? "text-red-700" : "text-emerald-700",
      tooltip:
        `Sin producto vinculado: ingreso sin IVA y coste de material 0 €. El IVA no es beneficio; el neto descuenta el IRPF orientativo del ${irpfPercent}%.`,
    };
  }

  const estimate = estimateLineMargin(item, pricing, irpfPercent, vatExempt);
  if (estimate.missingCost) {
    return {
      text: `Referencia: ${formatMoney(pricing.basePrice)} ${productPriceSourceLabel(
        pricing.priceSource,
      )} sin IVA${pricing.markupPercent === -1 ? " · precio manual" : ""}`,
      tone: productPriceSourceTone(pricing.priceSource),
      tooltip:
        "Este producto no tiene coste guardado. Añádelo para que la app calcule el margen real de la línea.",
    };
  }

  const manualText = pricing.markupPercent === -1 ? " · precio manual" : "";

  return {
    text: `Coste: ${formatMoney(estimate.costBase)} + IVA deducible: ${formatMoney(
      estimate.costIva,
    )} · Margen: ${formatMoney(
      estimate.grossMargin,
    )} · Tras IRPF ${irpfPercent}%: ${formatMoney(
      estimate.netMargin,
    )}${manualText}`,
    tone: estimate.grossMargin < 0 ? "text-red-700" : "text-emerald-700",
    tooltip:
      `Margen estimado: venta sin IVA menos coste del material sin IVA. El IVA va aparte; el neto descuenta el IRPF orientativo del ${irpfPercent}%.`,
  };
}

function productPriceSourceWarning(
  source: DocumentProductSalePriceSource,
): string | null {
  if (source === "providerTariff") {
    return "Usa tarifa de proveedor como referencia. Revisa margen y precio final.";
  }
  if (source === "cost") {
    return "No hay precio de venta. La app usa el coste conocido como referencia.";
  }
  return null;
}

function normalizedMeasureDraft(
  draft?: LineMeasurementDraft,
): Required<LineMeasurementDraft> {
  return {
    pieces:
      Number.isFinite(draft?.pieces) && (draft?.pieces ?? 0) > 0
        ? draft?.pieces ?? 1
        : 1,
    width:
      Number.isFinite(draft?.width) && (draft?.width ?? 0) > 0
        ? draft?.width ?? 0
        : 0,
    height:
      Number.isFinite(draft?.height) && (draft?.height ?? 0) > 0
        ? draft?.height ?? 0
        : 0,
    length:
      Number.isFinite(draft?.length) && (draft?.length ?? 0) > 0
        ? draft?.length ?? 0
        : 0,
  };
}

function ensureMeasureDraftsForMeasuredLines(
  sourceItems: LineItem[],
  drafts: Record<string, LineMeasurementDraft> = {},
): Record<string, LineMeasurementDraft> {
  const next = { ...drafts };
  for (const item of sourceItems) {
    if (
      (isAreaDocumentUnit(item.unit) || isLinearDocumentUnit(item.unit)) &&
      !next[item.id]
    ) {
      next[item.id] = normalizedMeasureDraft();
    }
  }
  return next;
}

interface DocumentFormProps {
  type: DocumentType;
  existing?: Document;
  initialCustomerId?: string | null;
}

export function DocumentForm({
  type,
  existing,
  initialCustomerId,
}: DocumentFormProps) {
  const router = useRouter();
  const {
    data,
    ready,
    addDocument,
    updateDocument,
    upsertCustomerForDocument,
    registerVerifactuForDocument,
  } = useAppStore();
  const {
    billingEnabled,
    checkCanCreateDocument,
    isPro,
    recordDocumentCreated,
  } = useBilling();
  const pdfOptions = { freePlanBranding: billingEnabled && !isPro };
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [upgradeReason, setUpgradeReason] = useState<string | undefined>();
  const [saveAction, setSaveAction] = useState<"idle" | "save" | "save-pdf">(
    "idle",
  );
  const [previewLoading, setPreviewLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const saving = saveAction !== "idle";
  const label = TYPE_LABELS[type];
  const article = TYPE_ARTICLES[type];
  const isRectificationDraft =
    Boolean(existing?.rectification) && existing?.status === "borrador";
  const rectificationProfileResolution = useMemo(
    () =>
      resolveDocumentFormBusinessProfile(
        existing,
        data.documents,
        data.profile,
      ),
    [data.documents, data.profile, existing],
  );
  const effectiveDocumentProfile = rectificationProfileResolution.profile;
  const rectificationProfileBlocked = rectificationProfileResolution.blocked;
  const missingIssuerLabels = [
    ...businessProfileMissingDocumentLabels(effectiveDocumentProfile),
    ...(!hasUsualSpanishTaxIdShape(effectiveDocumentProfile.nif)
      ? ["NIF/CIF con formato válido"]
      : []),
  ];

  const [clientForm, setClientForm] = useState<ClientFormValues>(
    existing ? clientToFormValues(existing.client) : EMPTY_CLIENT,
  );
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(
    null,
  );
  const initialCustomerApplied = useRef(false);

  useEffect(() => {
    if (!existing || !ready) return;
    if (existing.customerId) {
      const byId = data.customers.find(
        (customer) => customer.id === existing.customerId,
      );
      if (byId) {
        setSelectedCustomerId(byId.id);
        return;
      }
    }
    const match = findCustomerByClient(data.customers, existing.client);
    if (match) setSelectedCustomerId(match.id);
  }, [existing, ready, data.customers]);

  useEffect(() => {
    if (
      existing ||
      !ready ||
      !initialCustomerId ||
      initialCustomerApplied.current
    ) {
      return;
    }
    const customer = data.customers.find(
      (item) => item.id === initialCustomerId,
    );
    if (!customer) return;
    setSelectedCustomerId(customer.id);
    setClientForm(customerToFormValues(customer));
    initialCustomerApplied.current = true;
  }, [existing, ready, initialCustomerId, data.customers]);

  const [date, setDate] = useState(existing?.date ?? todayISO());
  const [dueDate, setDueDate] = useState(existing?.dueDate ?? "");
  const automaticQuoteDueDate =
    type === "presupuesto" && !existing
      ? defaultQuoteDueDate(date, data.profile)
      : "";
  const effectiveDueDate =
    type === "presupuesto" && !existing ? automaticQuoteDueDate : dueDate;
  const [notes, setNotes] = useState(existing?.notes ?? "");
  const defaultNotesApplied = useRef(Boolean(existing?.notes));
  const [paymentTerms, setPaymentTerms] = useState(
    existing?.paymentTerms ?? "",
  );
  const defaultPaymentApplied = useRef(Boolean(existing?.paymentTerms));
  const [status, setStatus] = useState<Document["status"]>(
    existing?.status ?? "borrador",
  );
  const activeCustomerId =
    selectedCustomerId ??
    (clientForm.firstName.trim() ? existing?.customerId : undefined);
  const vatExempt = isVatExempt(effectiveDocumentProfile);
  const defaultIva = vatExempt
    ? 0
    : (effectiveDocumentProfile.iva?.defaultRate ?? 21);
  const unitsSettings = useMemo(
    () => normalizeDocumentUnits(data.profile.documentUnits),
    [data.profile.documentUnits],
  );
  const defaultUnit = unitsSettings.defaultUnitId;
  const [documentIvaPercent, setDocumentIvaPercent] = useState(() => {
    if (vatExempt) return 0;
    const existingIva = existing?.items.find((item) =>
      Number.isFinite(item.ivaPercent),
    )?.ivaPercent;
    return existingIva ?? defaultIva;
  });
  const effectiveDocumentIva = vatExempt ? 0 : documentIvaPercent;

  const [items, setItems] = useState<LineItem[]>(() => {
    const baseItems = existing?.items.length
      ? documentFormItemsForEditing(existing.items, vatExempt)
      : [emptyLine(effectiveDocumentIva, defaultUnit)];
    return normalizeLineItemUnits(baseItems, unitsSettings);
  });
  const itemsRef = useRef(items);
  const [lineAreaDrafts, setLineAreaDrafts] = useState<
    Record<string, LineMeasurementDraft>
  >({});
  const measuredItems = useMemo(
    () =>
      items.map((item) =>
        applyLineMeasurementDraft(item, lineAreaDrafts[item.id]),
      ),
    [items, lineAreaDrafts],
  );
  const safeItems = useMemo(
    () =>
      documentFormItemsForSave(items, vatExempt, {
        lineMeasurementDrafts: lineAreaDrafts,
        allowSignedAmounts: isRectificationDraft,
      }),
    [isRectificationDraft, items, lineAreaDrafts, vatExempt],
  );
  const productSummaries = useMemo(
    () => buildPurchaseProductSummaries(data.expenses, data.products),
    [data.expenses, data.products],
  );
  const productSuggestionIndex = useMemo(
    () => buildDocumentProductSuggestionIndex(productSummaries),
    [productSummaries],
  );
  const estimatedIrpfPercent = data.profile.irpfPercent ?? 20;
  const [focusedProductLineId, setFocusedProductLineId] = useState<
    string | null
  >(null);
  const [openMarginInfoLineId, setOpenMarginInfoLineId] = useState<
    string | null
  >(null);
  const [draggingLineId, setDraggingLineId] = useState<string | null>(null);
  const [lineProductPricing, setLineProductPricing] = useState<
    Record<string, LineProductPricingState>
  >({});
  const [pendingSessionDraft, setPendingSessionDraft] =
    useState<DocumentSessionDraft | null>(null);
  const [sessionDraftChecked, setSessionDraftChecked] = useState(
    Boolean(existing),
  );
  const productDocumentDraftApplied = useRef(false);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  const findProductSummaryForDraftLine = useCallback(
    (
      draftLine: Pick<ProductDocumentDraftLine, "productKey" | "productId">,
    ): PurchaseProductSummary | undefined =>
      productSummaries.find(
        (product) =>
          (draftLine.productId && product.productId === draftLine.productId) ||
          product.key === draftLine.productKey,
      ),
    [productSummaries],
  );

  const defaultMarkupForProductLine = useCallback(
    (
      product: PurchaseProductSummary | undefined,
      priceSource: DocumentProductSalePriceSource,
    ): number => {
      if (!product || priceSource === "sale" || priceSource === "none") {
        return 0;
      }
      return productFamilyMarkupPercent(
        product.family,
        data.profile.productFamilyMarkups,
      );
    },
    [data.profile.productFamilyMarkups],
  );

  useEffect(() => {
    const returnDraft = consumeDocumentProductReturnDraft(type);
    const pickedLine = consumeDocumentProductPickedLine(type);
    if (!returnDraft && !pickedLine) return;

    productDocumentDraftApplied.current = true;
    setSessionDraftChecked(true);
    setPendingSessionDraft(null);

    if (!returnDraft) return;
    const draftItems = returnDraft.form.items.length
      ? returnDraft.form.items
      : [emptyLine(effectiveDocumentIva, defaultUnit)];
    let restoredItems = draftItems;
    let restoredPricing = returnDraft.form.lineProductPricing ?? {};

    if (pickedLine) {
      const targetLineId = pickedLine.targetLineId || returnDraft.targetLineId;
      const currentTarget = restoredItems.find(
        (item) => item.id === targetLineId,
      );
      const pickedProduct = findProductSummaryForDraftLine(
        pickedLine.draftLine,
      );
      const markupPercent = defaultMarkupForProductLine(
        pickedProduct,
        pickedLine.draftLine.priceSource,
      );
      const nextLine: LineItem = {
        id: currentTarget?.id ?? targetLineId,
        ...pickedLine.draftLine.line,
        unitPrice: priceWithDocumentProductMarkup(
          pickedLine.draftLine.basePrice,
          markupPercent,
        ),
        quantity:
          currentTarget && currentTarget.quantity > 0
            ? currentTarget.quantity
            : pickedLine.draftLine.line.quantity,
        ivaPercent: vatExempt
          ? 0
          : (pickedLine.draftLine.line.ivaPercent ?? effectiveDocumentIva),
      };

      restoredItems = currentTarget
        ? restoredItems.map((item) =>
            item.id === currentTarget.id ? nextLine : item,
          )
        : [...restoredItems, nextLine];
      restoredPricing = {
        ...restoredPricing,
        [nextLine.id]: {
          basePrice: pickedLine.draftLine.basePrice,
          markupPercent,
          priceSource: pickedLine.draftLine.priceSource,
          productKey: pickedLine.draftLine.productKey,
          productId: pickedLine.draftLine.productId,
          productName: pickedLine.draftLine.productName,
          costUnitPrice: pickedLine.draftLine.costUnitPrice,
          costIvaPercent: pickedLine.draftLine.costIvaPercent,
        },
      };
    }

    setClientForm({
      ...EMPTY_CLIENT,
      ...returnDraft.form.clientForm,
    } as ClientFormValues);
    setSelectedCustomerId(returnDraft.form.selectedCustomerId);
    setDate(returnDraft.form.date);
    setDueDate(returnDraft.form.dueDate);
    setNotes(returnDraft.form.notes);
    setPaymentTerms(returnDraft.form.paymentTerms);
    setStatus(returnDraft.form.status);
    setDocumentIvaPercent(vatExempt ? 0 : returnDraft.form.documentIvaPercent);
    const normalizedRestoredItems = normalizeLineItemUnits(
      restoredItems,
      unitsSettings,
    );
    itemsRef.current = normalizedRestoredItems;
    setItems(normalizedRestoredItems);
    setLineProductPricing(restoredPricing);
    setLineAreaDrafts(
      ensureMeasureDraftsForMeasuredLines(
        normalizedRestoredItems,
        returnDraft.form.lineAreaDrafts ?? {},
      ),
    );
    setFocusedProductLineId(null);
  }, [
    defaultUnit,
    defaultMarkupForProductLine,
    effectiveDocumentIva,
    findProductSummaryForDraftLine,
    type,
    unitsSettings,
    vatExempt,
  ]);

  useEffect(() => {
    if (existing || productDocumentDraftApplied.current) return;
    const draft = consumeProductDocumentDraft();
    productDocumentDraftApplied.current = true;
    if (!draft || draft.documentType !== type) {
      setPendingSessionDraft(getDocumentSessionDraft(type));
      setSessionDraftChecked(true);
      return;
    }

    setPendingSessionDraft(null);
    setSessionDraftChecked(true);

    const restoredDraftLines = draft.lines.map((draftLine) => {
      const product = findProductSummaryForDraftLine(draftLine);
      const markupPercent = defaultMarkupForProductLine(
        product,
        draftLine.priceSource,
      );
      return {
        draftLine,
        markupPercent,
        item: {
          id: crypto.randomUUID(),
          ...draftLine.line,
          unitPrice: priceWithDocumentProductMarkup(
            draftLine.basePrice,
            markupPercent,
          ),
          ivaPercent: vatExempt
            ? 0
            : (draftLine.line.ivaPercent ?? effectiveDocumentIva),
        },
      };
    });
    const draftItems = restoredDraftLines.map((line) => line.item);
    const normalizedDraftItems = normalizeLineItemUnits(
      draftItems,
      unitsSettings,
    );
    itemsRef.current = normalizedDraftItems;
    setItems(normalizedDraftItems);
    setLineProductPricing(
      Object.fromEntries(
        restoredDraftLines.map(({ item, draftLine, markupPercent }) => [
          item.id,
          {
            basePrice: draftLine.basePrice,
            markupPercent,
            priceSource: draftLine.priceSource,
            productKey: draftLine.productKey,
            productId: draftLine.productId,
            productName: draftLine.productName,
            costUnitPrice: draftLine.costUnitPrice,
            costIvaPercent: draftLine.costIvaPercent,
          },
        ]),
      ),
    );
    setLineAreaDrafts(ensureMeasureDraftsForMeasuredLines(normalizedDraftItems));
  }, [
    defaultMarkupForProductLine,
    effectiveDocumentIva,
    existing,
    findProductSummaryForDraftLine,
    type,
    unitsSettings,
    vatExempt,
  ]);

  function applySessionDraft(draft: DocumentSessionDraft) {
    const form = draft.form;
    const restoredItems = form.items.length
      ? form.items
      : [emptyLine(effectiveDocumentIva, defaultUnit)];
    const normalizedRestoredItems = normalizeLineItemUnits(
      vatExempt ? zeroIvaItems(restoredItems) : restoredItems,
      unitsSettings,
    );

    defaultNotesApplied.current = true;
    defaultPaymentApplied.current = true;
    itemsRef.current = normalizedRestoredItems;
    setClientForm({ ...EMPTY_CLIENT, ...form.clientForm } as ClientFormValues);
    setSelectedCustomerId(form.selectedCustomerId);
    setDate(form.date || todayISO());
    setDueDate(form.dueDate);
    setNotes(form.notes);
    setPaymentTerms(form.paymentTerms);
    setStatus(form.status);
    setDocumentIvaPercent(vatExempt ? 0 : form.documentIvaPercent);
    setItems(normalizedRestoredItems);
    setLineProductPricing(form.lineProductPricing ?? {});
    setLineAreaDrafts(
      ensureMeasureDraftsForMeasuredLines(
        normalizedRestoredItems,
        form.lineAreaDrafts ?? {},
      ),
    );
    setFocusedProductLineId(null);
    setPendingSessionDraft(null);
    setFormError(null);
  }

  function handleRestoreSessionDraft() {
    if (!pendingSessionDraft) return;
    applySessionDraft(pendingSessionDraft);
  }

  function handleDiscardSessionDraft() {
    clearDocumentSessionDraft(type);
    setPendingSessionDraft(null);
    setSessionDraftChecked(true);
  }

  useEffect(() => {
    if (existing || !sessionDraftChecked || pendingSessionDraft) return;
    const timer = window.setTimeout(() => {
      saveDocumentSessionDraft(type, {
        clientForm: clientFormToDraft(clientForm),
        selectedCustomerId,
        date,
        dueDate,
        notes,
        paymentTerms,
        status,
        documentIvaPercent: effectiveDocumentIva,
        items: itemsRef.current,
        lineProductPricing,
        lineAreaDrafts,
      });
    }, 500);
    return () => window.clearTimeout(timer);
  }, [
    existing,
    sessionDraftChecked,
    pendingSessionDraft,
    type,
    clientForm,
    selectedCustomerId,
    date,
    dueDate,
    notes,
    paymentTerms,
    status,
    effectiveDocumentIva,
    items,
    lineProductPricing,
    lineAreaDrafts,
  ]);

  useEffect(() => {
    if (!vatExempt) return;
    setDocumentIvaPercent(0);
    setItems((prev) => {
      const next = zeroIvaItems(prev);
      itemsRef.current = next;
      return next;
    });
  }, [vatExempt]);

  useEffect(() => {
    setItems((prev) => {
      const next = normalizeLineItemUnits(prev, unitsSettings);
      itemsRef.current = next;
      return next;
    });
  }, [unitsSettings]);

  useEffect(() => {
    if (existing || defaultNotesApplied.current) return;
    const phrase = defaultPhraseForType(
      normalizeDocumentPhrases(data.profile.documentPhrases),
      type,
    );
    if (!phrase) return;
    setNotes(phrase.text);
    defaultNotesApplied.current = true;
  }, [existing, type, data.profile.documentPhrases]);

  useEffect(() => {
    if (existing || defaultPaymentApplied.current) return;
    const method = defaultPaymentMethodForType(
      normalizeDocumentPaymentMethods(data.profile.documentPaymentMethods),
      type,
    );
    if (!method) return;
    setPaymentTerms(method.text);
    defaultPaymentApplied.current = true;
  }, [existing, type, data.profile.documentPaymentMethods]);

  const previewDoc: Document = {
    id: existing?.id ?? "preview",
    type,
    number: existing?.number ?? "BORRADOR",
    date,
    dueDate: effectiveDueDate || undefined,
    customerId: activeCustomerId,
    client: clientInputToSnapshot(clientForm),
    items: safeItems,
    notes,
    paymentTerms: paymentTerms || undefined,
    status,
    rectification: existing?.rectification,
    rectifiedById: existing?.rectifiedById,
    sourceQuoteDocumentId: existing?.sourceQuoteDocumentId,
    sourceQuoteNumber: existing?.sourceQuoteNumber,
    sourceDocumentId: existing?.sourceDocumentId,
    receiptDocumentId: existing?.receiptDocumentId,
    createdAt: existing?.createdAt ?? new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const totals = documentFormAmounts(measuredItems, vatExempt, {
    allowSignedAmounts: isRectificationDraft,
  });
  const ivaBreakdown = useMemo(
    () => (vatExempt ? [] : ivaBreakdownByRate(safeItems)),
    [safeItems, vatExempt],
  );
  const documentMargin = useMemo(() => {
    return measuredItems.reduce(
      (summary, item) => {
        const hasContent =
          item.description.trim().length > 0 ||
          (Number.isFinite(item.unitPrice) && item.unitPrice > 0);
        if (!hasContent) return summary;

        const estimate = estimateLineMargin(
          item,
          lineProductPricing[item.id],
          estimatedIrpfPercent,
          vatExempt,
        );

        return {
          hasLines: true,
          saleBase: roundMoney(summary.saleBase + estimate.saleBase),
          costBase: roundMoney(summary.costBase + estimate.costBase),
          costIva: roundMoney(summary.costIva + estimate.costIva),
          grossMargin: roundMoney(
            summary.grossMargin + estimate.grossMargin,
          ),
          irpfEstimate: roundMoney(
            summary.irpfEstimate + estimate.irpfEstimate,
          ),
          netMargin: roundMoney(summary.netMargin + estimate.netMargin),
          missingCostLines:
            summary.missingCostLines + (estimate.missingCost ? 1 : 0),
        };
      },
      {
        hasLines: false,
        saleBase: 0,
        costBase: 0,
        costIva: 0,
        grossMargin: 0,
        irpfEstimate: 0,
        netMargin: 0,
        missingCostLines: 0,
      },
    );
  }, [estimatedIrpfPercent, measuredItems, lineProductPricing, vatExempt]);
  const isDraftStatus = status === "borrador";
  const canSaveDraft = !existing || isDraftStatus;
  const finalStatusOverride: Document["status"] = isDraftStatus
    ? "enviado"
    : status;
  const previewButtonLabel = "Vista previa PDF";
  const primarySaveButtonLabel =
    type === "factura" && isDraftStatus
      ? isRectificationDraft
        ? "Emitir rectificativa"
        : "Emitir factura"
      : `Guardar ${label}`;
  const downloadButtonLabel =
    type === "factura" && isDraftStatus
      ? isRectificationDraft
        ? "Emitir rectificativa y descargar PDF"
        : "Emitir y descargar PDF"
      : `Guardar ${label} y descargar PDF`;

  const shareDoc: Document | null = existing && !rectificationProfileBlocked
    ? {
        ...previewDoc,
        id: existing.id,
        number: existing.number,
        createdAt: existing.createdAt,
      }
    : null;

  const requiresConcept = type !== "presupuesto";
  const requiresInvoiceClientFields = type === "factura";
  const lineGridClass = vatExempt
    ? "lg:grid-cols-[2rem_minmax(12rem,1fr)_4.5rem_minmax(8rem,10rem)_5rem_6rem_5.5rem_6.5rem_7.5rem]"
    : "lg:grid-cols-[2rem_minmax(12rem,1fr)_4.5rem_minmax(8rem,10rem)_5rem_6rem_5.5rem_5.5rem_6rem_6.5rem_7.5rem]";
  const compactInputClass = "!h-10 !min-h-10 !rounded-lg !px-3 !text-sm";

  function updateItem(id: string, patch: Partial<LineItem>) {
    setFormError(null);
    const next = itemsRef.current.map((item) =>
      item.id === id ? { ...item, ...patch } : item,
    );
    itemsRef.current = next;
    setItems(next);
  }

  function removeLine(id: string) {
    setFormError(null);
    setItems((prev) => {
      const next = prev.filter((item) => item.id !== id);
      itemsRef.current = next;
      return next;
    });
    setLineProductPricing((prev) => removeLineProductPricing(prev, id));
    setLineAreaDrafts((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setFocusedProductLineId((current) => (current === id ? null : current));
  }

  function reorderLine(fromId: string, toId: string) {
    if (!fromId || fromId === toId) return;
    setFormError(null);
    setItems((prev) => {
      const fromIndex = prev.findIndex((item) => item.id === fromId);
      const toIndex = prev.findIndex((item) => item.id === toId);
      if (fromIndex < 0 || toIndex < 0) return prev;
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      itemsRef.current = next;
      return next;
    });
  }

  function moveLine(id: string, direction: -1 | 1) {
    const currentItems = itemsRef.current;
    const currentIndex = currentItems.findIndex((item) => item.id === id);
    const target = currentItems[currentIndex + direction];
    if (!target) return;
    reorderLine(id, target.id);
  }

  function handleLineDescriptionChange(id: string, description: string) {
    updateItem(id, { description });
    setFocusedProductLineId(id);
    setLineProductPricing((prev) => {
      const current = prev[id];
      if (!current || description.trim()) return prev;
      return removeLineProductPricing(prev, id);
    });
  }

  function handleApplyDocumentIva() {
    const currentItems = itemsRef.current;
    if (
      !currentItems.some(
        (item) => item.ivaPercent !== effectiveDocumentIva,
      )
    ) {
      return;
    }

    const confirmed = window.confirm(
      `Se sustituirá el IVA de todas las líneas por el ${effectiveDocumentIva} %. ¿Quieres continuar?`,
    );
    const next = applyConfirmedDocumentIvaToItems(
      currentItems,
      effectiveDocumentIva,
      confirmed,
      vatExempt,
    );
    if (next === currentItems) return;

    setFormError(null);
    itemsRef.current = next;
    setItems(next);
  }

  function handleSelectProductForLine(
    item: LineItem,
    product: (typeof productSummaries)[number],
  ) {
    const applied = applyDocumentProductToLine(product, item, {
      defaultIva: effectiveDocumentIva,
      vatExempt,
    });
    const markupPercent = defaultMarkupForProductLine(
      product,
      applied.priceSource,
    );
    const selectedDescription =
      applied.line.description ?? product.saleDescription ?? product.name;
    const nextUnit = applied.line.unit;
    const nextMeasureDraft =
      isAreaDocumentUnit(nextUnit) || isLinearDocumentUnit(nextUnit)
        ? normalizedMeasureDraft(lineAreaDrafts[item.id])
        : undefined;
    const nextLine = applyLineMeasurementDraft(
      {
        ...item,
        ...applied.line,
        description: replaceDocumentProductMention(
          item.description,
          selectedDescription,
        ),
        unitPrice: priceWithDocumentProductMarkup(
          applied.basePrice,
          markupPercent,
        ),
      },
      nextMeasureDraft,
    );

    updateItem(item.id, {
      ...applied.line,
      description: nextLine.description,
      unitPrice: nextLine.unitPrice,
      quantity: nextLine.quantity,
    });
    if (nextMeasureDraft) {
      setLineAreaDrafts((prev) => ({ ...prev, [item.id]: nextMeasureDraft }));
    } else {
      setLineAreaDrafts((prev) => {
        const next = { ...prev };
        delete next[item.id];
        return next;
      });
    }
    setLineProductPricing((prev) => ({
      ...prev,
      [item.id]: {
        basePrice: applied.basePrice,
        markupPercent,
        priceSource: applied.priceSource,
        productKey: product.key,
        productId: product.productId,
        productName: product.name,
        costUnitPrice:
          product.purchaseNetUnitCost ??
          product.lastUnitPrice ??
          product.averageUnitPrice,
        costIvaPercent: product.ivaPercent ?? product.saleIvaPercent,
      },
    }));
    setFocusedProductLineId(null);
  }

  function openProductFlowForLine(
    item: LineItem,
    destination: "/productos" | "/productos/nuevo",
    mode: "pick" | "edit" = "pick",
  ) {
    const currentItems = itemsRef.current;
    const currentItem =
      currentItems.find((entry) => entry.id === item.id) ?? item;
    const currentPricing =
      lineProductPricing[currentItem.id] ?? lineProductPricing[item.id];
    const returnPath = documentFormReturnPath(type, existing);
    const createdAt = new Date().toISOString();
    const description = currentItem.description.trim();
    const savedReturnDraft = saveDocumentProductReturnDraft({
      source: "document",
      documentType: type,
      returnPath,
      targetLineId: item.id,
      createdAt,
      form: {
        clientForm: clientFormToDraft(clientForm),
        selectedCustomerId,
        date,
        dueDate,
        notes,
        paymentTerms,
        status,
        documentIvaPercent: effectiveDocumentIva,
        items: currentItems,
        lineProductPricing,
        lineAreaDrafts,
      },
    });
    const savedPickRequest = saveDocumentProductPickRequest({
      source: "document",
      documentType: type,
      returnPath,
      targetLineId: item.id,
      createdAt,
      mode,
      productKey: currentPricing?.productKey,
      productId: currentPricing?.productId,
      prefill: {
        name: description || undefined,
        description: description || undefined,
        unit: currentItem.unit,
        unitPrice:
          currentItem.unitPrice > 0 ? currentItem.unitPrice : undefined,
        ivaPercent: currentItem.ivaPercent,
      },
    });

    if (!savedReturnDraft || !savedPickRequest) {
      setFormError("No se pudo preparar la vuelta al documento.");
      return;
    }
    router.push(`${destination}?desde=documento`);
  }

  function handleLineUnitPriceChange(id: string, unitPrice: number) {
    updateItem(id, { unitPrice });
    setLineProductPricing((prev) => {
      const current = prev[id];
      if (!current) return prev;
      return {
        ...prev,
        [id]: {
          ...current,
          markupPercent: -1,
        },
      };
    });
  }

  function handleLineMarkupChange(id: string, markupPercent: number) {
    const current = lineProductPricing[id];
    if (!current || markupPercent < 0) return;
    setLineProductPricing((prev) => ({
      ...prev,
      [id]: {
        ...current,
        markupPercent,
      },
    }));
    updateItem(id, {
      unitPrice: priceWithDocumentProductMarkup(
        current.basePrice,
        markupPercent,
      ),
    });
  }

  function handleLineUnitChange(id: string, unit: string) {
    const current = itemsRef.current.find((item) => item.id === id);
    const isMeasuredUnit =
      isAreaDocumentUnit(unit) || isLinearDocumentUnit(unit);

    if (!isMeasuredUnit) {
      setLineAreaDrafts((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      updateItem(id, { unit });
      return;
    }

    const nextDraft = normalizedMeasureDraft(lineAreaDrafts[id]);
    setLineAreaDrafts((prev) => ({ ...prev, [id]: nextDraft }));
    const measured = current
      ? applyLineMeasurementDraft({ ...current, unit }, nextDraft)
      : null;
    updateItem(id, {
      unit,
      quantity: measured ? measured.quantity : 0,
    });
  }

  function handleLineMeasureDraftChange(
    id: string,
    patch: Partial<LineMeasurementDraft>,
  ) {
    const currentItem = itemsRef.current.find((item) => item.id === id);
    if (!currentItem) return;
    const nextDraft = normalizedMeasureDraft({
      ...lineAreaDrafts[id],
      ...patch,
    });
    const measured = applyLineMeasurementDraft(currentItem, nextDraft);
    setLineAreaDrafts((prev) => ({ ...prev, [id]: nextDraft }));
    if (isAreaDocumentUnit(currentItem.unit) || isLinearDocumentUnit(currentItem.unit)) {
      updateItem(id, { quantity: measured.quantity });
    }
  }

  function handleSelectCustomer(customer: Customer) {
    setFormError(null);
    setSelectedCustomerId(customer.id);
    setClientForm(customerToFormValues(customer));
  }

  function handleClientFieldChange<K extends keyof ClientFormValues>(
    field: K,
    value: ClientFormValues[K],
  ) {
    setFormError(null);
    setClientForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handlePreview() {
    if (saving || previewLoading) return;
    if (rectificationProfileBlocked) {
      setFormError(
        "No se puede verificar el perfil fiscal histórico de la factura original. Repara su integridad antes de continuar.",
      );
      return;
    }

    const lineIssue = firstDocumentFormLineIssue(measuredItems, {
      requireConcept: requiresConcept,
      allowSignedAmounts: isRectificationDraft,
    });
    if (lineIssue) {
      setFormError(`${lineIssue} Revisa las líneas antes de abrir el PDF.`);
      return;
    }

    setPreviewLoading(true);
    try {
      const doc = attachIssuerSnapshot(previewDoc, effectiveDocumentProfile);
      await openDocumentPdfPreview(doc, effectiveDocumentProfile, pdfOptions);
    } catch (error) {
      alert(
        error instanceof Error && error.message === "popup_blocked"
          ? "Permite ventanas emergentes para ver la vista previa, o usa la descarga del PDF."
          : "No se pudo generar la vista previa del PDF.",
      );
    } finally {
      setPreviewLoading(false);
    }
  }

  async function handleSave(
    download = false,
    statusOverride?: Document["status"],
  ) {
    if (saving) return;
    if (rectificationProfileBlocked) {
      setFormError(
        "No se puede verificar el perfil fiscal histórico de la factura original. Repara su integridad antes de continuar.",
      );
      return;
    }

    const lineIssue = firstDocumentFormLineIssue(measuredItems, {
      requireConcept: requiresConcept,
      allowSignedAmounts: isRectificationDraft,
    });
    if (lineIssue) {
      setFormError(lineIssue);
      return;
    }

    const requestedStatus = statusOverride ?? status;
    const resolvedStatus =
      type === "presupuesto" && requestedStatus === "pagado"
        ? "aceptado"
        : requestedStatus;
    const clientLegalLabels =
      type === "factura" && resolvedStatus !== "borrador"
        ? invoiceClientMissingDocumentLabels({
            name: clientInputToSnapshot(clientForm).name,
            nif: clientForm.nif,
            address: clientForm.address,
            postalCode: clientForm.postalCode,
            city: clientForm.city,
          })
        : [];

    if (clientLegalLabels.length > 0) {
      setFormError(
        `Completa estos datos del cliente antes de emitir la factura: ${clientLegalLabels.join(", ")}.`,
      );
      return;
    }

    setSaveAction(download ? "save-pdf" : "save");

    if (!existing) {
      const gate = checkCanCreateDocument(data.customers.length);
      if (!gate.allowed) {
        setUpgradeReason(gate.reason);
        setUpgradeOpen(true);
        setSaveAction("idle");
        return;
      }
    }

    const shouldUpsertCustomer = Boolean(
      selectedCustomerId || clientForm.firstName.trim(),
    );
    let customerId = activeCustomerId;
    let client = clientInputToSnapshot(clientForm);

    if (shouldUpsertCustomer) {
      const customerResult = upsertCustomerForDocument(
        {
          firstName: clientForm.firstName,
          lastName: clientForm.lastName,
          customerType: clientForm.customerType,
          contactName: clientForm.contactName,
          nif: clientForm.nif,
          email: clientForm.email,
          phone: clientForm.phone,
          streetType: clientForm.streetType,
          residenceType: clientForm.residenceType,
          address: clientForm.address,
          addressExtra: clientForm.addressExtra,
          city: clientForm.city,
          postalCode: clientForm.postalCode,
          notes: clientForm.notes,
        },
        selectedCustomerId,
      );

      if (!customerResult.ok) {
        setFormError(customerResult.error);
        setSaveAction("idle");
        return;
      }

      customerId = customerResult.customerId;
      client = customerResult.client;
    }

    const payload = {
      type,
      date,
      dueDate: effectiveDueDate || undefined,
      customerId,
      client,
      items: normalizeLineItemUnits(safeItems, unitsSettings),
      notes: notes || undefined,
      paymentTerms: paymentTerms.trim() || undefined,
      status: resolvedStatus,
      rectification: existing?.rectification,
      rectifiedById: existing?.rectifiedById,
      sourceQuoteDocumentId: existing?.sourceQuoteDocumentId,
      sourceQuoteNumber: existing?.sourceQuoteNumber,
      sourceDocumentId: existing?.sourceDocumentId,
      receiptDocumentId: existing?.receiptDocumentId,
    };

    if (resolvedStatus !== "borrador") {
      const emissionCheck = validateDocumentEmission(
        { ...payload, type },
        effectiveDocumentProfile,
        type,
      );
      if (!emissionCheck.ok) {
        setFormError(
          emissionCheck.message ?? "Revisa los datos del documento.",
        );
        setSaveAction("idle");
        return;
      }
    }

    let saved: Document;
    if (existing) {
      saved = {
        ...existing,
        ...payload,
        updatedAt: new Date().toISOString(),
      };
      try {
        saved = await updateDocument(saved);
      } catch (error) {
        setSaveAction("idle");
        setFormError(
          error instanceof DocumentIntegrityError
            ? error.message
            : "No se pudo guardar el documento.",
        );
        return;
      }
    } else {
      saved = addDocument(payload);
      recordDocumentCreated();
    }

    saved = attachIssuerSnapshot(saved, effectiveDocumentProfile);

    const verifactuOutcome = await finalizeSavedVerifactuDocument({
      doc: saved,
      profile: effectiveDocumentProfile,
      chain: data.verifactuChain,
      registerLocal: registerVerifactuForDocument,
    });
    saved = verifactuOutcome.document;
    const verifactuNotice =
      verifactuOutcome.outcome === "saved_without_registration" ||
      verifactuOutcome.outcome === "saved_with_safety_block"
        ? verifactuOutcome.notice
        : undefined;
    const verifactuSafetyBlocked =
      verifactuOutcome.outcome === "saved_with_safety_block";

    maybeCelebrateFirstInvoice(data.documents, saved);
    if (!existing) clearDocumentSessionDraft(type);
    setFormError(null);
    setSaveAction("idle");
    await finishDocumentSave({
      type,
      number: saved.number,
      router,
      notice: verifactuNotice,
      download: download && !verifactuSafetyBlocked
        ? { doc: saved, profile: effectiveDocumentProfile, pdfOptions }
        : undefined,
    });
  }

  return (
    <div className="space-y-5">
      {pendingSessionDraft && (
        <Card className="border-blue-200 bg-blue-50/70">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-blue-700">
                <History className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  {label[0].toUpperCase() + label.slice(1)} sin terminar
                </h2>
                <p className="mt-1 text-sm font-medium text-slate-600">
                  Recupera lo que estabas escribiendo en esta sesión.
                </p>
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <Button
                type="button"
                variant="secondary"
                onClick={handleDiscardSessionDraft}
              >
                Descartar
              </Button>
              <Button type="button" onClick={handleRestoreSessionDraft}>
                Recuperar
              </Button>
            </div>
          </div>
        </Card>
      )}
      <Card>
        <h2 className="mb-4 text-lg font-bold text-slate-900">
          Datos del cliente
        </h2>
        <ClientPicker
          values={clientForm}
          selectedCustomerId={selectedCustomerId}
          onSelectCustomer={handleSelectCustomer}
          onClearSelection={() => setSelectedCustomerId(null)}
          onChange={handleClientFieldChange}
          requireInvoiceFields={requiresInvoiceClientFields}
        />
      </Card>

      <Card>
        <h2 className="mb-4 text-lg font-bold text-slate-900">Fechas</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Fecha">
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </Field>
          {type === "factura" && (
            <Field label="Fecha de vencimiento">
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </Field>
          )}
          {type === "presupuesto" && effectiveDueDate && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              <span className="font-semibold text-slate-900">
                Válido hasta:{" "}
              </span>
              {formatShortDate(effectiveDueDate)}
            </div>
          )}
          {existing && (
            <Field label="Estado">
              <Select
                value={
                  type === "presupuesto" && status === "pagado"
                    ? "aceptado"
                    : status
                }
                onChange={(e) =>
                  setStatus(e.target.value as Document["status"])
                }
              >
                <option value="borrador">Borrador</option>
                <option value="enviado">Enviado</option>
                {type === "presupuesto" ? (
                  <>
                    <option value="aceptado">Aceptado</option>
                  </>
                ) : (
                  <option value="pagado">Cobrado</option>
                )}
                {type === "factura" && <option value="vencido">Vencido</option>}
              </Select>
              {type === "presupuesto" && status !== "borrador" && (
                <span className="text-xs text-amber-700">
                  Estado comercial local. No crea firma ni portal de cliente.
                </span>
              )}
              {type === "factura" && status !== "borrador" && (
                <span className="text-xs text-amber-700">
                  Al guardar, la factura se emitirá, tendrá número definitivo y
                  quedará bloqueada.
                </span>
              )}
              {type === "factura" &&
                status !== "borrador" &&
                missingIssuerLabels.length > 0 && (
                  <span className="text-xs text-red-600">
                    Revisa en Ajustes: {missingIssuerLabels.join(", ")}. El NIF
                    no se valida con AEAT desde la app.
                  </span>
                )}
            </Field>
          )}
          {!existing && type === "factura" && (
            <p className="text-sm text-slate-500 sm:col-span-2">
              El borrador no reserva número fiscal. Al emitir se asignan número
              y fecha definitivos. El registro Veri*Factu y el QR tributario
              permanecen desactivados.
            </p>
          )}
        </div>
      </Card>

      <Card>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-bold text-slate-900">Conceptos</h2>
          </div>
          {!vatExempt && (
            <div className="w-full space-y-2 sm:w-64">
              <Field
                label="IVA para nuevas líneas"
                hint="Cada línea conserva su propio tipo."
              >
                <IvaPercentSelect
                  value={documentIvaPercent}
                  settings={effectiveDocumentProfile.iva}
                  onChange={(ivaPercent) => {
                    setFormError(null);
                    setDocumentIvaPercent(ivaPercent);
                  }}
                />
              </Field>
              <button
                type="button"
                onClick={handleApplyDocumentIva}
                disabled={items.every(
                  (item) => item.ivaPercent === effectiveDocumentIva,
                )}
                className="min-h-10 w-full rounded-xl border border-blue-200 bg-white px-3 text-sm font-bold text-blue-700 transition-colors hover:bg-blue-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400"
              >
                Aplicar a todas las líneas
              </button>
            </div>
          )}
        </div>
        <div className="space-y-3">
          <div className="space-y-3 lg:space-y-0 lg:overflow-x-auto lg:rounded-2xl lg:border lg:border-slate-200 lg:bg-white">
            <div
              className={`hidden ${lineGridClass} rounded-t-2xl bg-slate-100 px-2 py-2 text-xs font-bold uppercase tracking-wide text-slate-500 lg:grid lg:items-center lg:gap-2`}
            >
              <span aria-hidden="true" />
              <span>Concepto</span>
              <span className="text-right">Cant.</span>
              <span>Medidas</span>
              <span>Unidad</span>
              <span className="text-right">
                {vatExempt ? "Precio" : "Sin IVA"}
              </span>
              <span>Inc.</span>
              {!vatExempt && <span className="text-center">IVA</span>}
              {!vatExempt && <span className="text-right">Con IVA</span>}
              <span className="text-right">Total</span>
              <span aria-hidden="true" />
            </div>
            {items.map((item, index) => {
              const productMention = documentProductMentionQuery(
                item.description,
              );
              const suggestions =
                focusedProductLineId === item.id && productMention
                  ? searchDocumentProductSuggestions(
                      productSuggestionIndex,
                      productMention.query,
                    )
                  : [];
              const productPricing = lineProductPricing[item.id];
              const measureDraft = normalizedMeasureDraft(
                lineAreaDrafts[item.id],
              );
              const hasMeasureDraft = Boolean(lineAreaDrafts[item.id]);
              const isAreaLine = isAreaDocumentUnit(item.unit);
              const isLinearLine = isLinearDocumentUnit(item.unit);
              const isMeasuredLine = isAreaLine || isLinearLine;
              const displayedItem =
                isMeasuredLine && hasMeasureDraft
                  ? applyLineMeasurementDraft(item, measureDraft)
                  : item;
              const productCostSummary =
                productPricing || displayedItem.unitPrice > 0
                  ? lineMarginSummary(
                      productPricing,
                      displayedItem,
                      estimatedIrpfPercent,
                      vatExempt,
                    )
                  : null;
              const hasLinkedProduct = Boolean(
                productPricing?.productKey || productPricing?.productId,
              );
              const grossPrice = unitPriceGross(
                displayedItem.unitPrice,
                displayedItem.ivaPercent,
              );
              const lineTotal = lineItemFormTotal(displayedItem, vatExempt, {
                allowSignedAmounts: isRectificationDraft,
              });
              const measureSummary =
                isMeasuredLine && hasMeasureDraft
                  ? lineMeasurementDescriptionSuffix(item.unit, measureDraft)
                  : null;

              return (
                <div
                  key={item.id}
                  onDragOver={(event) => {
                    if (!draggingLineId || draggingLineId === item.id) return;
                    event.preventDefault();
                    event.dataTransfer.dropEffect = "move";
                  }}
                  onDrop={(event) => {
                    event.preventDefault();
                    const draggedId =
                      event.dataTransfer.getData("text/plain") ||
                      draggingLineId;
                    if (draggedId) reorderLine(draggedId, item.id);
                    setDraggingLineId(null);
                  }}
                  className={`grid gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-3 transition sm:grid-cols-2 lg:rounded-none lg:border-0 lg:border-t lg:border-slate-100 lg:bg-white lg:p-2 lg:gap-2 ${lineGridClass} ${
                    draggingLineId === item.id ? "lg:opacity-60" : ""
                  }`}
                >
                  <div className="flex min-w-0 items-center gap-2 sm:col-span-2 lg:col-span-1 lg:justify-center">
                    <button
                      type="button"
                      draggable={items.length > 1}
                      onDragStart={(event) => {
                        if (items.length <= 1) return;
                        setDraggingLineId(item.id);
                        event.dataTransfer.effectAllowed = "move";
                        event.dataTransfer.setData("text/plain", item.id);
                      }}
                      onDragEnd={() => setDraggingLineId(null)}
                      aria-label={`Reordenar línea ${index + 1}`}
                      title="Arrastrar para reordenar"
                      className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 ${
                        items.length > 1
                          ? "cursor-grab hover:bg-slate-50 active:cursor-grabbing"
                          : "cursor-default opacity-40"
                      }`}
                    >
                      <GripVertical className="h-4 w-4" />
                    </button>
                    <span className="text-xs font-bold uppercase tracking-wide text-slate-400 lg:hidden">
                      Línea {index + 1}
                    </span>
                    <div className="ml-auto flex gap-1 lg:hidden">
                      <button
                        type="button"
                        onClick={() => moveLine(item.id, -1)}
                        disabled={index === 0}
                        aria-label={`Subir línea ${index + 1}`}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 disabled:opacity-35"
                      >
                        <ArrowUp className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveLine(item.id, 1)}
                        disabled={index === items.length - 1}
                        aria-label={`Bajar línea ${index + 1}`}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 disabled:opacity-35"
                      >
                        <ArrowDown className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div className="min-w-0 sm:col-span-2 lg:col-span-1">
                    <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500 lg:hidden">
                      Concepto
                    </span>
                    <Input
                      value={item.description}
                      onChange={(e) =>
                        handleLineDescriptionChange(item.id, e.target.value)
                      }
                      onFocus={() => setFocusedProductLineId(item.id)}
                      onBlur={() => {
                        window.setTimeout(() => {
                          setFocusedProductLineId((current) =>
                            current === item.id ? null : current,
                          );
                        }, 120);
                      }}
                      placeholder="Concepto libre o @producto"
                      className={`${compactInputClass} placeholder:text-slate-400`}
                    />
                    {productCostSummary && (
                      <>
                        <p
                          className={`mt-1 flex items-center gap-1.5 text-xs font-semibold ${productCostSummary.tone}`}
                        >
                          <span>{productCostSummary.text}</span>
                          <button
                            type="button"
                            onClick={() =>
                              setOpenMarginInfoLineId((current) =>
                                current === item.id ? null : item.id,
                              )
                            }
                            aria-label="Qué significa el margen estimado"
                            title={productCostSummary.tooltip}
                            className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
                          >
                            <CircleHelp className="h-3.5 w-3.5" />
                          </button>
                        </p>
                        {openMarginInfoLineId === item.id ? (
                          <p className="mt-1 rounded-lg bg-slate-100 px-2 py-1 text-xs font-semibold leading-relaxed text-slate-600">
                            {productCostSummary.tooltip}
                          </p>
                        ) : null}
                      </>
                    )}
                    {suggestions.length > 0 && (
                      <div className="mt-2 overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-sm">
                        <div className="border-b border-blue-50 px-3 py-2 text-xs font-bold uppercase tracking-wide text-blue-700">
                          Productos detectados
                        </div>
                        <div className="max-h-72 overflow-y-auto">
                          {suggestions.map((product) => {
                            const price =
                              documentProductSaleUnitPriceInfo(product);
                            const warning = productPriceSourceWarning(
                              price.source,
                            );
                            return (
                              <button
                                key={product.key}
                                type="button"
                                onMouseDown={(event) => event.preventDefault()}
                                onClick={() =>
                                  handleSelectProductForLine(item, product)
                                }
                                className="flex w-full flex-col gap-1 border-b border-slate-100 px-3 py-2.5 text-left last:border-b-0 hover:bg-blue-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-blue-500"
                              >
                                <span className="flex items-center gap-2 text-sm font-bold text-slate-900">
                                  <PackageCheck className="h-4 w-4 text-blue-600" />
                                  {product.name}
                                </span>
                                <span className="text-xs font-semibold text-slate-500">
                                  {product.family}
                                  {product.usualSupplier
                                    ? ` · ${product.usualSupplier.supplierName}`
                                    : ""}
                                </span>
                                <span
                                  className={`text-xs font-bold ${productPriceSourceTone(
                                    price.source,
                                  )}`}
                                >
                                  {price.unitPrice > 0
                                    ? `${formatMoney(price.unitPrice)} ${productPriceSourceLabel(
                                        price.source,
                                      )}`
                                    : "Sin precio"}
                                </span>
                                {warning && (
                                  <span className="rounded-xl bg-amber-100 px-2 py-1 text-xs font-bold text-amber-900">
                                    {warning}
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="min-w-0">
                    <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500 lg:hidden">
                      Cant.
                    </span>
                    <NumericFieldInput
                      value={
                        isMeasuredLine && hasMeasureDraft
                          ? measureDraft.pieces
                          : item.quantity
                      }
                      onChange={(quantity) =>
                        isMeasuredLine
                          ? handleLineMeasureDraftChange(item.id, {
                              pieces: quantity,
                            })
                          : updateItem(item.id, { quantity })
                      }
                      className={compactInputClass}
                    />
                  </div>

                  <div className="min-w-0">
                    <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500 lg:hidden">
                      Medidas
                    </span>
                    {isAreaLine ? (
                      <div className="grid grid-cols-2 gap-2">
                        <label className="min-w-0">
                          <span className="mb-1 block text-[0.65rem] font-bold uppercase text-slate-500">
                            Ancho
                          </span>
                          <NumericFieldInput
                            value={hasMeasureDraft ? measureDraft.width : 0}
                            onChange={(width) =>
                              handleLineMeasureDraftChange(item.id, { width })
                            }
                            placeholder="0"
                            className={compactInputClass}
                          />
                        </label>
                        <label className="min-w-0">
                          <span className="mb-1 block text-[0.65rem] font-bold uppercase text-slate-500">
                            Alto
                          </span>
                          <NumericFieldInput
                            value={hasMeasureDraft ? measureDraft.height : 0}
                            onChange={(height) =>
                              handleLineMeasureDraftChange(item.id, { height })
                            }
                            placeholder="0"
                            className={compactInputClass}
                          />
                        </label>
                      </div>
                    ) : isLinearLine ? (
                      <label className="block min-w-0">
                        <span className="mb-1 block text-[0.65rem] font-bold uppercase text-slate-500">
                          Metros
                        </span>
                        <NumericFieldInput
                          value={hasMeasureDraft ? measureDraft.length : 0}
                          onChange={(length) =>
                            handleLineMeasureDraftChange(item.id, { length })
                          }
                          placeholder="0"
                          className={compactInputClass}
                        />
                      </label>
                    ) : (
                      <p className="hidden h-10 items-center rounded-lg bg-slate-50 px-3 text-sm font-semibold text-slate-400 ring-1 ring-slate-100 lg:flex">
                        --
                      </p>
                    )}
                  </div>

                  <div className="min-w-0">
                    <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500 lg:hidden">
                      Unidad
                    </span>
                    <LineItemUnitSelect
                      settings={data.profile.documentUnits}
                      value={item.unit ?? defaultUnit}
                      onChange={(unit) => handleLineUnitChange(item.id, unit)}
                      compact
                      className={compactInputClass}
                    />
                  </div>

                  <div className="min-w-0">
                    <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500 lg:hidden">
                      {vatExempt ? "Precio" : "Sin IVA"}
                    </span>
                    <NumericFieldInput
                      value={item.unitPrice}
                      onChange={(unitPrice) =>
                        handleLineUnitPriceChange(item.id, unitPrice)
                      }
                      className={compactInputClass}
                    />
                  </div>

                  <div className="min-w-0">
                    <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500 lg:hidden">
                      Inc.
                    </span>
                    {productPricing ? (
                      <Select
                        value={String(productPricing.markupPercent)}
                        onChange={(event) =>
                          handleLineMarkupChange(
                            item.id,
                            Number(event.target.value),
                          )
                        }
                        className={compactInputClass}
                      >
                        <option value="-1">Manual</option>
                        {DOCUMENT_PRODUCT_MARKUPS.map((markup) => (
                          <option key={markup} value={markup}>
                            +{markup}%
                          </option>
                        ))}
                      </Select>
                    ) : (
                      <p className="flex h-10 items-center rounded-lg bg-white px-3 text-sm font-semibold text-slate-400 ring-1 ring-slate-100 lg:bg-slate-50">
                        --
                      </p>
                    )}
                  </div>

                  {!vatExempt && (
                    <div className="min-w-0">
                      <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500 lg:hidden">
                        IVA
                      </span>
                      <IvaPercentSelect
                        value={item.ivaPercent}
                        settings={effectiveDocumentProfile.iva}
                        ariaLabel={`IVA de la línea ${index + 1}`}
                        onChange={(ivaPercent) =>
                          updateItem(item.id, { ivaPercent })
                        }
                        className={compactInputClass}
                      />
                    </div>
                  )}

                  {!vatExempt && (
                    <div className="min-w-0">
                      <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500 lg:hidden">
                        Con IVA
                      </span>
                      <NumericFieldInput
                        value={grossPrice}
                        onChange={(gross) =>
                          handleLineUnitPriceChange(
                            item.id,
                            unitPriceFromGross(gross, item.ivaPercent),
                          )
                        }
                        className={compactInputClass}
                      />
                    </div>
                  )}

                  <div className="min-w-0">
                    <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500 lg:hidden">
                      Total
                    </span>
                    <p className="flex h-10 items-center justify-end rounded-lg bg-white px-3 text-sm font-bold text-slate-900 ring-1 ring-slate-100 lg:bg-slate-50">
                      {formatMoney(lineTotal)}
                    </p>
                  </div>

                  <div className="flex min-w-0 justify-end gap-1 sm:col-span-2 lg:col-span-1">
                    <button
                      type="button"
                      onClick={() => openProductFlowForLine(item, "/productos")}
                      aria-label={`Buscar producto para línea ${index + 1}`}
                      title="Buscar en productos"
                      className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-blue-200 bg-white text-blue-700 transition-colors hover:bg-blue-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
                    >
                      <PackageSearch className="h-4 w-4" />
                    </button>
                    {hasLinkedProduct ? (
                      <button
                        type="button"
                        onClick={() =>
                          openProductFlowForLine(item, "/productos", "edit")
                        }
                        aria-label={`Editar producto de línea ${index + 1}`}
                        title="Editar producto"
                        className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-blue-200 bg-white text-blue-700 transition-colors hover:bg-blue-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() =>
                          openProductFlowForLine(item, "/productos/nuevo")
                        }
                        aria-label={`Crear producto desde línea ${index + 1}`}
                        title="Crear producto"
                        className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-blue-200 bg-white text-blue-700 transition-colors hover:bg-blue-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
                      >
                        <PackagePlus className="h-4 w-4" />
                      </button>
                    )}
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeLine(item.id)}
                        aria-label={`Eliminar línea ${index + 1}`}
                        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600 transition-colors hover:bg-red-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  {measureSummary && (
                    <p className="rounded-xl bg-blue-50 px-3 py-2 text-xs font-bold text-blue-800 sm:col-span-2 lg:col-span-full">
                      Cantidad facturable: {measureSummary}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
          <button
            type="button"
            onClick={() => {
              setFormError(null);
              setItems((prev) => {
                const next = [
                  ...prev,
                  emptyLine(effectiveDocumentIva, defaultUnit),
                ];
                itemsRef.current = next;
                return next;
              });
            }}
            className="flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-blue-200 bg-blue-50/60 px-4 py-3 text-base font-bold text-blue-700 transition hover:border-blue-300 hover:bg-blue-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
          >
            <Plus className="h-5 w-5" /> Añadir línea
          </button>
        </div>
      </Card>

      <Card className="space-y-4">
        <DocumentPaymentPicker
          documentType={type}
          settings={data.profile.documentPaymentMethods}
          value={paymentTerms}
          onChange={setPaymentTerms}
        />
        <DocumentPhrasePicker
          documentType={type}
          settings={data.profile.documentPhrases}
          onSelect={setNotes}
        />
        <Field label="Notas (opcional)">
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Condiciones de pago, garantía..."
          />
        </Field>
        <div className="mt-4 space-y-1 text-right text-slate-700">
          {!vatExempt && <p>Base: {formatMoney(totals.subtotal)}</p>}
          {!vatExempt && ivaBreakdown.length > 0 && (
            <div className="ml-auto max-w-md space-y-1 rounded-xl bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600">
              {ivaBreakdown.map((row) => (
                <p key={row.rate}>
                  IVA {row.rate}% · Base {formatMoney(row.base)} · Cuota{" "}
                  {formatMoney(row.quota)}
                </p>
              ))}
            </div>
          )}
          {!vatExempt && <p>IVA: {formatMoney(totals.iva)}</p>}
          <p className="text-xl font-bold text-blue-700">
            Total: {formatMoney(totals.total)}
          </p>
          {vatExempt && (
            <p className="text-xs text-slate-500">
              Sin IVA (exento de repercusión)
            </p>
          )}
          {documentMargin.hasLines && (
            <div className="ml-auto mt-3 max-w-xl rounded-2xl bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">
              <p>
                Coste materiales: {formatMoney(documentMargin.costBase)}
                {!vatExempt
                  ? ` + IVA deducible: ${formatMoney(documentMargin.costIva)}`
                  : ""}
              </p>
              <p
                className={
                  documentMargin.grossMargin < 0
                    ? "text-red-700"
                    : "text-emerald-700"
                }
              >
                Margen real: {formatMoney(documentMargin.grossMargin)}
              </p>
              <p className="text-slate-600">
                Tras IRPF {estimatedIrpfPercent}%:{" "}
                {formatMoney(documentMargin.netMargin)}
              </p>
              {documentMargin.missingCostLines > 0 && (
                <p className="text-xs text-amber-700">
                  {documentMargin.missingCostLines} línea(s) con coste de
                  producto pendiente.
                </p>
              )}
            </div>
          )}
        </div>
      </Card>

      {shareDoc && (
        <Card className="space-y-3">
          <div>
            <p className="font-semibold text-slate-900">Enviar al cliente</p>
            <p className="mt-1 text-sm text-slate-500">
              Comparte {article} {label} por email o WhatsApp. Guarda antes si
              has hecho cambios.
            </p>
          </div>
          <div className="action-scroll -mx-1 flex gap-2 overflow-x-auto px-1 pb-0.5 sm:pb-0">
            <DocumentPdfShareActions
              doc={shareDoc}
              profile={effectiveDocumentProfile}
              showPreview={false}
            />
          </div>
        </Card>
      )}

      {rectificationProfileBlocked && (
        <div
          role="alert"
          className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-900"
        >
          No se puede verificar el perfil fiscal histórico de la factura
          original. La rectificativa queda bloqueada hasta reparar su
          integridad.
        </div>
      )}

      {formError && (
        <div
          role="alert"
          className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-medium text-amber-900"
        >
          {formError}
        </div>
      )}

      <div className="flex flex-col gap-3">
        <Button
          variant="secondary"
          fullWidth
          onClick={() => void handlePreview()}
          disabled={saving || previewLoading || rectificationProfileBlocked}
        >
          <Eye className="h-5 w-5" />
          {previewLoading ? "Generando vista previa…" : previewButtonLabel}
        </Button>
        <div
          className={`grid gap-3 ${
            canSaveDraft ? "sm:grid-cols-3" : "sm:grid-cols-2"
          }`}
        >
          {canSaveDraft && (
            <Button
              variant="secondary"
              fullWidth
              onClick={() => void handleSave(false, "borrador")}
              disabled={
                saving || previewLoading || rectificationProfileBlocked
              }
            >
              {saveAction === "save" ? "Guardando…" : "Guardar borrador"}
            </Button>
          )}
          <Button
            fullWidth
            onClick={() => void handleSave(false, finalStatusOverride)}
            disabled={saving || previewLoading || rectificationProfileBlocked}
          >
            {saveAction === "save" ? "Guardando…" : primarySaveButtonLabel}
          </Button>
          <Button
            variant="secondary"
            fullWidth
            onClick={() => void handleSave(true, finalStatusOverride)}
            disabled={saving || previewLoading || rectificationProfileBlocked}
          >
            {saveAction === "save-pdf"
              ? "Guardando y preparando PDF…"
              : downloadButtonLabel}
          </Button>
        </div>
      </div>

      <UpgradeModal
        open={upgradeOpen}
        onClose={() => setUpgradeOpen(false)}
        reason={upgradeReason}
      />
    </div>
  );
}
