import type {
  DocumentPaymentMethod,
  DocumentPaymentMethodsSettings,
  DocumentType,
} from "./types";

export const DOCUMENT_PAYMENT_TYPE_LABELS: Record<DocumentType, string> = {
  factura: "Facturas",
  presupuesto: "Presupuestos",
  recibo: "Recibos",
};

export const EMPTY_DOCUMENT_PAYMENT_METHODS: DocumentPaymentMethodsSettings = {
  methods: [],
  defaultMethodId: {},
};

interface NormalizeDocumentPaymentMethodsOptions {
  keepEmpty?: boolean;
}

function newMethodId(): string {
  return crypto.randomUUID();
}

export function normalizeDocumentPaymentMethods(
  settings?: Partial<DocumentPaymentMethodsSettings> | null,
  options: NormalizeDocumentPaymentMethodsOptions = {},
): DocumentPaymentMethodsSettings {
  const methods = (settings?.methods ?? [])
    .map((method) => {
      const text = method.text ?? "";
      return {
        id: method.id || newMethodId(),
        text: options.keepEmpty ? text : text.trim(),
        documentType: method.documentType,
      };
    })
    .filter((method) => options.keepEmpty || method.text.length > 0);

  const methodIds = new Set(methods.map((method) => method.id));
  const defaultMethodId: Partial<Record<DocumentType, string>> = {};

  for (const type of Object.keys(
    settings?.defaultMethodId ?? {},
  ) as DocumentType[]) {
    const id = settings?.defaultMethodId?.[type];
    if (!id || !methodIds.has(id)) continue;
    const method = methods.find((item) => item.id === id);
    if (method?.documentType === type) {
      defaultMethodId[type] = id;
    }
  }

  return { methods, defaultMethodId };
}

export function paymentMethodsForType(
  settings: DocumentPaymentMethodsSettings,
  type: DocumentType,
): DocumentPaymentMethod[] {
  return settings.methods.filter((method) => method.documentType === type);
}

export function defaultPaymentMethodForType(
  settings: DocumentPaymentMethodsSettings,
  type: DocumentType,
): DocumentPaymentMethod | undefined {
  const id = settings.defaultMethodId[type];
  if (!id) return undefined;
  return settings.methods.find(
    (method) => method.id === id && method.documentType === type,
  );
}

export function paymentMethodPreview(text: string, max = 72): string {
  const trimmed = text.trim().replace(/\s+/g, " ");
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1)}…`;
}

export function addDocumentPaymentMethod(
  settings: DocumentPaymentMethodsSettings,
  type: DocumentType,
  text = "",
): DocumentPaymentMethodsSettings {
  const method: DocumentPaymentMethod = {
    id: newMethodId(),
    text,
    documentType: type,
  };
  const next = {
    ...settings,
    methods: [...settings.methods, method],
  };
  if (!settings.defaultMethodId[type] && method.text) {
    return setDefaultDocumentPaymentMethod(next, type, method.id);
  }
  return next;
}

export function updateDocumentPaymentMethod(
  settings: DocumentPaymentMethodsSettings,
  methodId: string,
  text: string,
): DocumentPaymentMethodsSettings {
  return {
    ...settings,
    methods: settings.methods.map((method) =>
      method.id === methodId ? { ...method, text } : method,
    ),
  };
}

export function removeDocumentPaymentMethod(
  settings: DocumentPaymentMethodsSettings,
  methodId: string,
): DocumentPaymentMethodsSettings {
  const removed = settings.methods.find((method) => method.id === methodId);
  const methods = settings.methods.filter((method) => method.id !== methodId);
  const defaultMethodId = { ...settings.defaultMethodId };
  if (removed && defaultMethodId[removed.documentType] === methodId) {
    delete defaultMethodId[removed.documentType];
  }
  return { methods, defaultMethodId };
}

export function setDefaultDocumentPaymentMethod(
  settings: DocumentPaymentMethodsSettings,
  type: DocumentType,
  methodId: string,
): DocumentPaymentMethodsSettings {
  const method = settings.methods.find((item) => item.id === methodId);
  if (!method || method.documentType !== type || !method.text.trim()) {
    return settings;
  }
  return {
    ...settings,
    defaultMethodId: {
      ...settings.defaultMethodId,
      [type]: methodId,
    },
  };
}

export function clearDefaultDocumentPaymentMethod(
  settings: DocumentPaymentMethodsSettings,
  type: DocumentType,
): DocumentPaymentMethodsSettings {
  const defaultMethodId = { ...settings.defaultMethodId };
  delete defaultMethodId[type];
  return { ...settings, defaultMethodId };
}
