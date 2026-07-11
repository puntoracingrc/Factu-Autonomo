import type { AppData, Document, Expense, Product, Supplier } from "./types";
import { DEFAULT_PROFILE, EMPTY_DATA } from "./types";
import { issueDocument, markDocumentSent } from "./document-integrity";

export const DEMO_MODE_STORAGE_KEY = "factura-autonomo-demo-mode";
export const DEMO_WORKSPACE_STORAGE_KEY = "factura-autonomo-demo-data";
export const DEMO_MODE_EVENT = "factura-autonomo-demo-mode-change";

export function isDemoWorkspaceMode(): boolean {
  if (typeof localStorage === "undefined") return false;
  return localStorage.getItem(DEMO_MODE_STORAGE_KEY) === "1";
}

export function setDemoWorkspaceMode(enabled: boolean): void {
  if (typeof localStorage === "undefined") return;
  if (enabled) {
    localStorage.setItem(DEMO_MODE_STORAGE_KEY, "1");
  } else {
    localStorage.removeItem(DEMO_MODE_STORAGE_KEY);
  }
  if (typeof window !== "undefined" && typeof window.dispatchEvent === "function") {
    window.dispatchEvent(new Event(DEMO_MODE_EVENT));
  }
}

export function resetDemoWorkspaceData(): void {
  if (typeof localStorage === "undefined") return;
  localStorage.removeItem(DEMO_WORKSPACE_STORAGE_KEY);
}

function isoDate(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function isoTimestamp(year: number, month: number, day: number, hour = 9): string {
  return `${isoDate(year, month, day)}T${String(hour).padStart(2, "0")}:00:00.000Z`;
}

export function createDemoWorkspaceData(referenceDate = new Date()): AppData {
  const year = referenceDate.getFullYear();
  const now = isoTimestamp(year, 7, 4, 10);
  const customerOneCreatedAt = isoTimestamp(year, 6, 3);
  const customerTwoCreatedAt = isoTimestamp(year, 6, 18);
  const supplierCreatedAt = isoTimestamp(year, 5, 28);

  const profile: AppData["profile"] = {
    ...DEFAULT_PROFILE,
    commercialName: "Reformas Martin Demo",
    name: "Reformas Martin Demo SL",
    nif: "B00000000",
    vatId: "ESB00000000",
    address: "Calle Demo, 1",
    city: "Valencia",
    postalCode: "46000",
    province: "Valencia",
    phone: "600 000 000",
    email: "demo@factura-autonomo.test",
    iban: "ES00 0000 0000 0000 0000 0000",
    numbering: {
      year,
      lastSequence: {
        factura: 1,
        factura_rectificativa: 0,
        presupuesto: 1,
        recibo: 0,
      },
      formats: {
        factura: { ...DEFAULT_PROFILE.numbering.formats.factura },
        factura_rectificativa: {
          ...DEFAULT_PROFILE.numbering.formats.factura_rectificativa,
        },
        presupuesto: { ...DEFAULT_PROFILE.numbering.formats.presupuesto },
        recibo: { ...DEFAULT_PROFILE.numbering.formats.recibo },
      },
    },
    verifactu: {
      enabled: false,
      environment: "test",
    },
  };

  const customers: AppData["customers"] = [
    {
      id: "demo-customer-bar-rincon",
      customerType: "company",
      firstName: "",
      lastName: "",
      name: "Bar El Rincon Demo",
      contactName: "Ana Lopez",
      nif: "B00000001",
      email: "ana.demo@example.com",
      phone: "600 000 001",
      streetType: "calle",
      address: "Mayor, 12",
      city: "Valencia",
      postalCode: "46001",
      notes: "Cliente ficticio para probar el flujo de facturas.",
      createdAt: customerOneCreatedAt,
      updatedAt: customerOneCreatedAt,
    },
    {
      id: "demo-customer-clinica-norte",
      customerType: "company",
      firstName: "",
      lastName: "",
      name: "Clinica Norte Demo",
      contactName: "Marta Gil",
      nif: "B00000002",
      email: "marta.demo@example.com",
      phone: "600 000 002",
      streetType: "avenida",
      address: "Mediterraneo, 8",
      city: "Alicante",
      postalCode: "03001",
      createdAt: customerTwoCreatedAt,
      updatedAt: customerTwoCreatedAt,
    },
  ];

  const suppliers: Supplier[] = [
    {
      id: "demo-supplier-materiales",
      name: "Materiales Levante Demo",
      nif: "B00000003",
      email: "proveedor.demo@example.com",
      phone: "600 000 003",
      category: "Material",
      createdAt: supplierCreatedAt,
    },
  ];

  const products: Product[] = [
    {
      id: "demo-product-hora",
      key: "hora-servicio-tecnico",
      name: "Hora de servicio tecnico",
      family: "Servicios",
      unit: "h",
      pvp: 38,
      cost: 0,
      ivaPercent: 21,
      sales: {
        enabled: true,
        description: "Hora de servicio tecnico",
        unit: "h",
        unitPrice: 38,
        ivaPercent: 21,
      },
      source: "manual",
      createdAt: isoTimestamp(year, 6, 1),
      updatedAt: isoTimestamp(year, 6, 1),
    },
    {
      id: "demo-product-material",
      key: "material-pequeno",
      name: "Material pequeño",
      family: "Materiales",
      unit: "ud",
      supplierId: "demo-supplier-materiales",
      supplierName: "Materiales Levante Demo",
      pvp: 18,
      cost: 11,
      ivaPercent: 21,
      sales: {
        enabled: true,
        description: "Material pequeño",
        unit: "ud",
        unitPrice: 18,
        ivaPercent: 21,
      },
      purchase: {
        enabled: true,
        description: "Material pequeño",
        unit: "ud",
        netUnitCost: 11,
        ivaPercent: 21,
        supplierId: "demo-supplier-materiales",
        supplierName: "Materiales Levante Demo",
      },
      source: "manual",
      createdAt: isoTimestamp(year, 6, 2),
      updatedAt: isoTimestamp(year, 6, 2),
    },
  ];

  const demoInvoice = markDocumentSent(
    issueDocument(
      {
        id: "demo-invoice-1",
        type: "factura",
        number: `F-${year}-0001`,
        date: isoDate(year, 6, 24),
        dueDate: isoDate(year, 7, 9),
        customerId: "demo-customer-bar-rincon",
        client: {
          name: "Bar El Rincon Demo",
          contactName: "Ana Lopez",
          nif: "B00000001",
          email: "ana.demo@example.com",
          phone: "600 000 001",
          streetType: "calle",
          address: "Mayor, 12",
        },
        items: [
          {
            id: "demo-invoice-1-line-1",
            description: "Revision de instalacion",
            quantity: 3,
            unit: "h",
            unitPrice: 38,
            ivaPercent: 21,
          },
          {
            id: "demo-invoice-1-line-2",
            description: "Material pequeño",
            quantity: 2,
            unit: "ud",
            unitPrice: 18,
            ivaPercent: 21,
          },
        ],
        notes: "Factura ficticia. No enviar ni usar fiscalmente.",
        paymentTerms: "Transferencia",
        status: "borrador",
        documentLifecycle: "draft",
        integrityLock: "unlocked",
        deliveryStatus: "not_sent",
        paymentStatus: "pending",
        acceptanceStatus: "not_applicable",
        createdAt: isoTimestamp(year, 6, 24, 11),
        updatedAt: isoTimestamp(year, 6, 24, 11),
      },
      profile,
      isoTimestamp(year, 6, 24, 12),
    ),
    isoTimestamp(year, 6, 24, 12),
  );

  const documents: Document[] = [
    demoInvoice,
    {
      id: "demo-invoice-draft",
      type: "factura",
      number: "BORRADOR",
      date: isoDate(year, 7, 4),
      customerId: "demo-customer-clinica-norte",
      client: {
        name: "Clinica Norte Demo",
        contactName: "Marta Gil",
        nif: "B00000002",
        email: "marta.demo@example.com",
        streetType: "avenida",
        address: "Mediterraneo, 8",
      },
      items: [
        {
          id: "demo-invoice-draft-line-1",
          description: "Mantenimiento preventivo",
          quantity: 2,
          unit: "h",
          unitPrice: 38,
          ivaPercent: 21,
        },
      ],
      notes: "Borrador de ejemplo.",
      paymentTerms: "Transferencia",
      status: "borrador",
      documentLifecycle: "draft",
      integrityLock: "unlocked",
      deliveryStatus: "not_sent",
      paymentStatus: "pending",
      acceptanceStatus: "not_applicable",
      createdAt: isoTimestamp(year, 7, 4, 9),
      updatedAt: isoTimestamp(year, 7, 4, 9),
    },
    {
      id: "demo-quote-1",
      type: "presupuesto",
      number: `P-${year}-0001`,
      date: isoDate(year, 6, 27),
      dueDate: isoDate(year, 7, 27),
      customerId: "demo-customer-clinica-norte",
      client: {
        name: "Clinica Norte Demo",
        contactName: "Marta Gil",
        nif: "B00000002",
        email: "marta.demo@example.com",
      },
      items: [
        {
          id: "demo-quote-1-line-1",
          description: "Instalacion y puesta a punto",
          quantity: 1,
          unit: "ud",
          unitPrice: 240,
          ivaPercent: 21,
        },
      ],
      notes: "Presupuesto ficticio para probar conversion a factura.",
      paymentTerms: "50% al aceptar, 50% al finalizar",
      status: "aceptado",
      documentLifecycle: "draft",
      integrityLock: "unlocked",
      deliveryStatus: "sent",
      paymentStatus: "not_applicable",
      acceptanceStatus: "accepted",
      acceptedAt: isoTimestamp(year, 6, 29, 16),
      createdAt: isoTimestamp(year, 6, 27, 10),
      updatedAt: isoTimestamp(year, 6, 29, 16),
    },
  ];

  const expenses: Expense[] = [
    {
      id: "demo-expense-materiales",
      date: isoDate(year, 6, 25),
      origin: "manual",
      businessKind: "purchase_invoice",
      supplierId: "demo-supplier-materiales",
      supplierName: "Materiales Levante Demo",
      description: "Material para trabajos de junio",
      amount: 84.7,
      ivaPercent: 21,
      category: "Material",
      paymentMethod: "Tarjeta",
      notes: "Gasto ficticio de ejemplo.",
      purchaseDocument: {
        invoiceNumber: `PROV-${year}-014`,
        issueDate: isoDate(year, 6, 25),
        supplierNif: "B00000003",
      },
      createdAt: isoTimestamp(year, 6, 25, 13),
    },
    {
      id: "demo-expense-ticket",
      date: isoDate(year, 7, 2),
      origin: "manual",
      businessKind: "quick_ticket",
      supplierName: "Gasolinera Demo",
      description: "Desplazamiento a cliente",
      amount: 32.4,
      ivaPercent: 0,
      category: "Transporte",
      paymentMethod: "Tarjeta",
      notes: "Ticket ficticio. Revisa deducibilidad en casos reales.",
      createdAt: isoTimestamp(year, 7, 2, 18),
    },
  ];

  return {
    ...EMPTY_DATA,
    profile,
    documents,
    expenses,
    recurringExpenses: [
      {
        id: "demo-recurring-gestoria",
        supplierName: "Gestoria Demo",
        description: "Cuota mensual gestor",
        amount: 55,
        ivaPercent: 21,
        category: "Profesionales",
        paymentMethod: "Domiciliacion",
        frequency: "monthly",
        dueTiming: { kind: "day_of_month", day: 5 },
        duration: { kind: "indefinite" },
        startDate: isoDate(year, 1, 1),
        enabled: true,
        notes: "Gasto fijo ficticio.",
        createdAt: isoTimestamp(year, 1, 1),
        updatedAt: isoTimestamp(year, 1, 1),
      },
    ],
    userReminders: [
      {
        id: "demo-reminder-review",
        text: "Revisar facturas pendientes antes del viernes",
        dueDate: isoDate(year, 7, 6),
        link: { kind: "document", entityId: "demo-invoice-1" },
        target: "self",
        origin: "field",
        completed: false,
        createdAt: now,
        updatedAt: now,
      },
    ],
    suppliers,
    products,
    customers,
    counters: {
      factura: 1,
      factura_rectificativa: 0,
      presupuesto: 1,
      recibo: 0,
    },
    verifactuChain: null,
    meta: {
      lastModified: now,
    },
  };
}
