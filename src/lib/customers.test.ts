import { describe, expect, it } from "vitest";
import { attestNewImportedDocument } from "./document-integrity/legacy-import-attestation";
import {
  buildCustomerInvoicedTotals,
  clientInputToSnapshot,
  clientMatchesCustomer,
  createCustomerInCollection,
  customerFullName,
  customerListWindow,
  customerInvoicedTotal,
  customerPayloadFromInput,
  customerToClient,
  ensureCustomerForDocument,
  filterCustomers,
  findCustomerByClient,
  findCustomerByIdentity,
  findCustomerByNif,
  findDuplicateCustomerGroups,
  getCustomerDisplayName,
  inferCustomerTypeFromIdentity,
  migrateCustomer,
  normalizeCustomerNif,
  sortCustomers,
  sortCustomersByName,
  updateCustomerInCollection,
  upsertCustomerForDocumentInCollection,
  validateCustomerContact,
  validateCustomerInput,
  validateUniqueCustomer,
} from "./customers";
import { EMPTY_DATA, type BusinessProfile, type Customer, type Document } from "./types";

const sample: Customer[] = [
  {
    id: "1",
    firstName: "Zara",
    lastName: "Servicios",
    name: "Zara Servicios",
    nif: "11111111H",
    phone: "600111111",
    createdAt: "",
    updatedAt: "",
  },
  {
    id: "2",
    firstName: "Ana",
    lastName: "García",
    name: "Ana García",
    nif: "12345678A",
    email: "ana@test.com",
    createdAt: "",
    updatedAt: "",
  },
  {
    id: "3",
    firstName: "Beatriz",
    lastName: "López",
    name: "Beatriz López",
    address: "Calle Mayor 1",
    city: "Madrid",
    postalCode: "28001",
    createdAt: "",
    updatedAt: "",
  },
];

describe("sortCustomers", () => {
  const documents = [
    {
      id: "f1",
      type: "factura" as const,
      status: "enviado" as const,
      client: customerToClient(sample[1]),
      items: [
        {
          id: "1",
          description: "A",
          quantity: 1,
          unitPrice: 200,
          ivaPercent: 21,
        },
      ],
    },
    {
      id: "f2",
      type: "factura" as const,
      status: "enviado" as const,
      client: customerToClient(sample[0]),
      items: [
        {
          id: "2",
          description: "B",
          quantity: 1,
          unitPrice: 50,
          ivaPercent: 21,
        },
      ],
    },
  ];

  it("ordena por apellidos de la A a la Z", () => {
    const sorted = sortCustomers(sample, documents as never, "apellido", "asc");
    expect(sorted.map((c) => c.lastName)).toEqual(["García", "López", "Servicios"]);
  });

  it("ordena por últimos añadidos de más nuevo a más antiguo", () => {
    const customers: Customer[] = [
      { ...sample[0], createdAt: "2026-01-01T10:00:00.000Z" },
      { ...sample[1], createdAt: "2026-06-01T10:00:00.000Z" },
      { ...sample[2], createdAt: "2026-06-01T10:00:00.000Z" },
    ];
    const sorted = sortCustomers(customers, [], "reciente", "desc");

    expect(sorted.map((c) => c.id)).toEqual(["2", "3", "1"]);
  });

  it("ordena por volumen facturado de mayor a menor", () => {
    const sorted = sortCustomers(
      sample,
      documents as never,
      "facturacion",
      "desc",
    );
    expect(sorted.map((c) => c.id)).toEqual(["2", "1", "3"]);
  });

  it("puede ordenar por volumen facturado usando totales precalculados", () => {
    const totals = buildCustomerInvoicedTotals(sample, documents as never);
    const sorted = sortCustomers(
      sample,
      documents as never,
      "facturacion",
      "desc",
      totals,
    );
    expect(totals.get("2")).toBe(242);
    expect(sorted.map((c) => c.id)).toEqual(["2", "1", "3"]);
  });

  it("suma documentos vinculados por customerId y aliases fusionados", () => {
    const customers: Customer[] = [
      { ...sample[1], mergedCustomerIds: ["legacy-ana"] },
      sample[0],
    ];
    const totals = buildCustomerInvoicedTotals(customers, [
      {
        id: "legacy-doc",
        type: "factura" as const,
        status: "enviado" as const,
        customerId: "legacy-ana",
        client: { name: "Nombre histórico", nif: "99999999Z" },
        items: [
          {
            id: "1",
            description: "A",
            quantity: 1,
            unitPrice: 100,
            ivaPercent: 21,
          },
        ],
        date: "2026-06-24",
        number: "F-2026-0001",
        createdAt: "",
        updatedAt: "",
      },
    ]);

    expect(totals.get("2")).toBe(121);
  });

  it("usa customerId como referencia principal antes que el snapshot legacy", () => {
    const totals = buildCustomerInvoicedTotals(sample, [
      {
        id: "linked-doc",
        type: "factura" as const,
        status: "enviado" as const,
        customerId: sample[1].id,
        client: customerToClient(sample[0]),
        items: [
          {
            id: "1",
            description: "A",
            quantity: 1,
            unitPrice: 100,
            ivaPercent: 21,
          },
        ],
        date: "2026-06-24",
        number: "F-2026-0002",
        createdAt: "",
        updatedAt: "",
      },
    ]);

    expect(totals.get(sample[1].id)).toBe(121);
    expect(totals.get(sample[0].id)).toBe(0);
  });

  it("ordena por dirección", () => {
    const sorted = sortCustomers(sample, [], "direccion", "asc");
    expect(sorted.at(-1)?.id).toBe("3");
  });
});

describe("sortCustomersByName", () => {
  it("ordena alfabéticamente en español", () => {
    const sorted = sortCustomersByName(sample).map((c) => c.name);
    expect(sorted).toEqual(["Ana García", "Beatriz López", "Zara Servicios"]);
  });
});

describe("customerListWindow", () => {
  it("carga por tramos sin omitir ni repetir clientes", () => {
    const customers = Array.from({ length: 67 }, (_, index) => ({
      ...sample[index % sample.length],
      id: `customer-${index}`,
    }));

    const first = customerListWindow(customers, 30);
    const second = customerListWindow(customers, 60);
    const last = customerListWindow(customers, 90);

    expect(first.visible).toHaveLength(30);
    expect(first.hiddenCount).toBe(37);
    expect(second.visible).toHaveLength(60);
    expect(second.hiddenCount).toBe(7);
    expect(last.visible.map((customer) => customer.id)).toEqual(
      customers.map((customer) => customer.id),
    );
    expect(new Set(last.visible.map((customer) => customer.id)).size).toBe(67);
    expect(last.hiddenCount).toBe(0);
  });
});

describe("filterCustomers", () => {
  it("filtra por nombre", () => {
    expect(filterCustomers(sample, "ana").map((c) => c.name)).toEqual([
      "Ana García",
    ]);
  });

  it("filtra por apellidos", () => {
    expect(filterCustomers(sample, "lópez").map((c) => c.name)).toEqual([
      "Beatriz López",
    ]);
  });

  it("filtra por NIF", () => {
    expect(filterCustomers(sample, "1111").map((c) => c.name)).toEqual([
      "Zara Servicios",
    ]);
  });

  it("busca sin exigir tildes ni el formato del teléfono o NIF", () => {
    expect(filterCustomers(sample, "garcia").map((c) => c.id)).toEqual(["2"]);
    expect(filterCustomers(sample, "600 111 111").map((c) => c.id)).toEqual([
      "1",
    ]);
    expect(filterCustomers(sample, "1234-5678-a").map((c) => c.id)).toEqual([
      "2",
    ]);
  });

  it("admite varias palabras en distinto formato", () => {
    expect(filterCustomers(sample, "beatriz madrid").map((c) => c.id)).toEqual([
      "3",
    ]);
  });
});

describe("validateUniqueCustomer", () => {
  it("rechaza guardar sin nombre con un mensaje claro", () => {
    const result = validateUniqueCustomer(sample, "", "");
    expect(result.ok).toBe(false);
    expect(result.error).toBe("Añade al menos un nombre para guardar el cliente");
  });

  it("acepta nombre sin apellidos", () => {
    const result = validateUniqueCustomer(sample, "Pedro", "");
    expect(result.ok).toBe(true);
    expect(result.lastName).toBe("");
  });

  it("rechaza repetir exactamente un cliente sin apellidos", () => {
    const customers = [
      ...sample,
      {
        id: "teresa",
        firstName: "Teresa",
        lastName: "",
        name: "Teresa",
        createdAt: "",
        updatedAt: "",
      },
    ];

    expect(validateUniqueCustomer(customers, " Teresa ", "").ok).toBe(false);
    expect(validateUniqueCustomer(customers, "Teresa", "Martínez").ok).toBe(
      true,
    );
  });

  it("rechaza duplicado", () => {
    const result = validateUniqueCustomer(sample, "Ana", "García");
    expect(result.ok).toBe(false);
    expect(result.error).toContain("Ya existe");
  });

  it("acepta cliente nuevo", () => {
    const result = validateUniqueCustomer(sample, "Pedro", "Martínez");
    expect(result.ok).toBe(true);
  });

  it("permite editar el mismo cliente", () => {
    const result = validateUniqueCustomer(sample, "Ana", "García", "2");
    expect(result.ok).toBe(true);
  });

  it("rechaza NIF duplicado sin distinguir mayúsculas", () => {
    const result = validateUniqueCustomer(sample, "Pedro", "Martínez", undefined, "12345678a");
    expect(result.ok).toBe(false);
    expect(result.error).toContain("NIF");
  });

  it("permite editar conservando el mismo NIF", () => {
    const result = validateUniqueCustomer(sample, "Ana", "García", "2", "12345678A");
    expect(result.ok).toBe(true);
  });
});

describe("validateCustomerInput", () => {
  it("acepta cliente con nombre valido sin exigir NIF", () => {
    const result = validateCustomerInput(sample, {
      firstName: "Lucía",
      lastName: "Mesa",
      email: " lucia@example.com ",
      phone: " 612   345  678 ",
    });

    expect(result.ok).toBe(true);
    expect(result.email).toBe("lucia@example.com");
    expect(result.phone).toBe("612 345 678");
  });

  it("acepta cliente con nombre sin apellidos", () => {
    const result = validateCustomerInput(sample, {
      firstName: "Teresa",
      lastName: "",
      address: "Mandri, 26 2º-2º",
      city: "Barcelona",
      postalCode: "08022",
    });

    expect(result.ok).toBe(true);
    expect(result.firstName).toBe("Teresa");
    expect(result.lastName).toBe("");
  });

  it("rechaza apellidos demasiado cortos solo si se informan", () => {
    const result = validateCustomerInput(sample, {
      firstName: "Teresa",
      lastName: "M",
    });

    expect(result.ok).toBe(false);
    expect(result.error).toBe("Los apellidos deben tener al menos 2 letras");
  });

  it("rechaza email informado con formato invalido", () => {
    const result = validateCustomerInput(sample, {
      firstName: "Lucía",
      lastName: "Mesa",
      email: "lucia@",
    });

    expect(result.ok).toBe(false);
    expect(result.error).toBe("Revisa el formato del email");
  });

  it("normaliza contacto sin bloquear telefono no fiscal", () => {
    const result = validateCustomerContact({
      email: " cliente@example.com ",
      phone: " +34 600   111 222 ",
    });

    expect(result.ok).toBe(true);
    expect(result.email).toBe("cliente@example.com");
    expect(result.phone).toBe("+34 600 111 222");
  });

  it("prepara payload de cliente con contacto limpio", () => {
    const payload = customerPayloadFromInput({
      firstName: " Lucía ",
      lastName: " Mesa ",
      email: " lucia@example.com ",
      phone: " 612   345  678 ",
    });

    expect(payload).toMatchObject({
      firstName: "Lucía",
      lastName: "Mesa",
      name: "Lucía Mesa",
      email: "lucia@example.com",
      phone: "612 345 678",
    });
  });

  it("prepara payload de cliente sin apellidos", () => {
    const payload = customerPayloadFromInput({
      firstName: " Teresa ",
      lastName: "",
      address: " Mandri, 26 2º-2º ",
      city: " Barcelona ",
      postalCode: " 08022 ",
    });

    expect(payload).toMatchObject({
      firstName: "Teresa",
      lastName: "",
      name: "Teresa",
      address: "Mandri, 26 2º-2º",
    });
  });

  it("prepara payload de cliente con piso separado", () => {
    const payload = customerPayloadFromInput({
      firstName: " Jordi ",
      lastName: " Vinardell ",
      streetType: "calle",
      address: " Nena Casas 52 ",
      residenceType: "flat",
      addressExtra: " 2º 2ª ",
      city: " Barcelona ",
      postalCode: " 08017 ",
    });

    expect(payload).toMatchObject({
      firstName: "Jordi",
      lastName: "Vinardell",
      streetType: "calle",
      residenceType: "flat",
      address: "Nena Casas 52",
      addressExtra: "2º 2ª",
    });
  });

  it("prepara payload de empresa con persona de contacto opcional", () => {
    const payload = customerPayloadFromInput({
      customerType: "company",
      firstName: " Persianas Almar S.L. ",
      lastName: " Ignorado ",
      contactName: " Laura Gómez ",
      nif: " b12345678 ",
    });

    expect(payload).toMatchObject({
      customerType: "company",
      firstName: "Persianas Almar S.L.",
      lastName: "",
      name: "Persianas Almar S.L.",
      contactName: "Laura Gómez",
      nif: "B12345678",
    });
  });

  it("rechaza duplicado de empresa por razón social", () => {
    const result = validateCustomerInput(
      [
        ...sample,
        {
          id: "company-1",
          customerType: "company",
          firstName: "Metalúrgica Arandes S.L.",
          lastName: "",
          name: "Metalúrgica Arandes S.L.",
          createdAt: "",
          updatedAt: "",
        },
      ],
      {
        customerType: "company",
        firstName: "Metalúrgica Arandes S.L.",
        lastName: "",
      },
    );

    expect(result.ok).toBe(false);
    expect(result.error).toContain("Ya existe una empresa");
  });
});

describe("ensureCustomerForDocument", () => {
  it("crea cliente nuevo al guardar documento", () => {
    const result = ensureCustomerForDocument(
      sample,
      {
        firstName: "Luis",
        lastName: "Fernández",
        nif: "99999999Z",
        phone: "611222333",
        streetType: "calle",
        address: "Doctor Carulla 19",
        residenceType: "flat",
        addressExtra: "Bajos 1ª",
        postalCode: "08017",
        city: "Barcelona",
        notes: "Alta desde factura",
      },
      null,
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.created).toBe(true);
      expect(result.client.name).toBe("Luis Fernández");
      expect(result.client.nif).toBe("99999999Z");
      expect(result.customer.postalCode).toBe("08017");
      expect(result.customer.city).toBe("Barcelona");
      expect(result.customer.residenceType).toBe("flat");
      expect(result.customer.addressExtra).toBe("Bajos 1ª");
      expect(result.customer.notes).toBe("Alta desde factura");
      expect(result.client.address).toBe("C/ Doctor Carulla 19, Bajos 1ª, 08017 Barcelona");
      expect(result.client.addressExtra).toBe("Bajos 1ª");
      expect(result.client.postalCode).toBe("08017");
      expect(result.client.city).toBe("Barcelona");
    }
  });

  it("crea snapshot de documento con email y telefono del cliente", () => {
    const result = ensureCustomerForDocument(
      sample,
      {
        firstName: "Lucía",
        lastName: "Mesa",
        email: " lucia@example.com ",
        phone: " 612   345  678 ",
      },
      null,
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.client.email).toBe("lucia@example.com");
      expect(result.client.phone).toBe("612 345 678");
      expect(result.customer.email).toBe("lucia@example.com");
      expect(result.customer.phone).toBe("612 345 678");
    }
  });

  it("crea cliente desde documento aunque falten apellidos", () => {
    const result = ensureCustomerForDocument(
      sample,
      {
        firstName: "Teresa",
        lastName: "",
        address: "Mandri, 26 2º-2º",
        postalCode: "08022",
        city: "Barcelona",
      },
      null,
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.client.name).toBe("Teresa");
      expect(result.customer.lastName).toBe("");
      expect(result.customer.city).toBe("Barcelona");
    }
  });

  it("reutiliza un cliente sin apellidos en vez de duplicarlo", () => {
    const teresa: Customer = {
      id: "teresa",
      firstName: "Teresa",
      lastName: "",
      name: "Teresa",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    };
    const result = ensureCustomerForDocument(
      [...sample, teresa],
      { firstName: " Teresa ", lastName: "", phone: "600111222" },
      null,
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.created).toBe(false);
      expect(result.customer.id).toBe("teresa");
    }
  });

  it("crea empresa desde documento con contacto opcional", () => {
    const result = ensureCustomerForDocument(
      sample,
      {
        customerType: "company",
        firstName: "Persianas Almar S.L.",
        lastName: "",
        contactName: "Laura Gómez",
        nif: "b12345678",
        streetType: "calle",
        address: "Mayor 1",
        postalCode: "08001",
        city: "Barcelona",
      },
      null,
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.customer.customerType).toBe("company");
      expect(result.customer.name).toBe("Persianas Almar S.L.");
      expect(result.customer.lastName).toBe("");
      expect(result.customer.contactName).toBe("Laura Gómez");
      expect(result.client.customerType).toBe("company");
      expect(result.client.name).toBe("Persianas Almar S.L.");
      expect(result.client.contactName).toBe("Laura Gómez");
      expect(result.client.nif).toBe("B12345678");
    }
  });

  it("encuentra empresa existente al volver desde un documento", () => {
    const company: Customer = {
      id: "company-1",
      customerType: "company",
      firstName: "Persianas Almar S.L.",
      lastName: "",
      name: "Persianas Almar S.L.",
      contactName: "Laura Gómez",
      createdAt: "",
      updatedAt: "",
    };

    const client = customerToClient(company);
    expect(findCustomerByClient([company], client)?.id).toBe("company-1");
    expect(clientMatchesCustomer(client, company)).toBe(true);
  });

  it("rechaza email invalido al crear cliente desde documento", () => {
    const result = ensureCustomerForDocument(
      sample,
      {
        firstName: "Lucía",
        lastName: "Mesa",
        email: "lucia@",
      },
      null,
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("Revisa el formato del email");
    }
  });

  it("reutiliza cliente existente si se escribe manualmente en un documento", () => {
    const result = ensureCustomerForDocument(
      sample,
      { firstName: "Ana", lastName: "García", phone: "600333222" },
      null,
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.created).toBe(false);
      expect(result.customer.id).toBe("2");
      expect(result.customer.phone).toBe("600333222");
      expect(result.client.name).toBe("Ana García");
    }
  });

  it("reutiliza cliente existente por NIF al crear desde documento", () => {
    const result = ensureCustomerForDocument(
      sample,
      {
        firstName: "Ana",
        lastName: "García",
        nif: "12345678a",
        email: "ana.factura@test.com",
      },
      null,
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.created).toBe(false);
      expect(result.customer.id).toBe("2");
      expect(result.customer.nif).toBe("12345678A");
      expect(result.customer.email).toBe("ana.factura@test.com");
    }
  });

  it("no reutiliza otro cliente solo por NIF si el nombre escrito es distinto", () => {
    const result = ensureCustomerForDocument(
      sample,
      {
        customerType: "company",
        firstName: "Llefisa SL",
        lastName: "",
        nif: "12345678A",
      },
      null,
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("Ya existe un cliente con el NIF");
    }
  });

  it("actualiza cliente seleccionado", () => {
    const result = ensureCustomerForDocument(
      sample,
      {
        firstName: "Ana",
        lastName: "García",
        phone: "699888777",
        postalCode: "08018",
        city: "Barcelona",
      },
      "2",
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.created).toBe(false);
      expect(result.customer.phone).toBe("699888777");
      expect(result.customer.postalCode).toBe("08018");
      expect(result.customer.city).toBe("Barcelona");
    }
  });

  it("permite actualizar datos del cliente seleccionado aunque conserve el mismo NIF", () => {
    const result = ensureCustomerForDocument(
      sample,
      {
        firstName: "Ana",
        lastName: "García",
        nif: "12345678A",
        phone: "600222333",
        email: "ana.actualizada@test.com",
      },
      "2",
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.created).toBe(false);
      expect(result.customer.id).toBe("2");
      expect(result.customer.nif).toBe("12345678A");
      expect(result.customer.phone).toBe("600222333");
      expect(result.customer.email).toBe("ana.actualizada@test.com");
    }
  });

  it("permite vaciar contacto y dirección desde un documento", () => {
    const result = ensureCustomerForDocument(
      sample,
      {
        firstName: "Ana",
        lastName: "García",
        nif: "12345678A",
        email: "",
        phone: "",
        address: "",
        city: "",
        postalCode: "",
        notes: "",
      },
      "2",
      { now: "2026-07-14T10:00:00.000Z" },
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.customer.email).toBeUndefined();
      expect(result.customer.phone).toBeUndefined();
      expect(result.customer.address).toBeUndefined();
      expect(result.customer.city).toBeUndefined();
      expect(result.customer.postalCode).toBeUndefined();
      expect(result.customer.notes).toBeUndefined();
    }
  });
});

describe("customer collection writes", () => {
  it("valida contra la colección actual y bloquea un doble alta", () => {
    const first = createCustomerInCollection(
      sample,
      {
        firstName: "Teresa",
        lastName: "",
        name: "Teresa",
      },
      "new-1",
      "2026-07-14T10:00:00.000Z",
    );
    expect(first.ok).toBe(true);
    if (!first.ok) return;

    const second = createCustomerInCollection(
      first.customers,
      {
        firstName: " Teresa ",
        lastName: "",
        name: "Teresa",
      },
      "new-2",
      "2026-07-14T10:00:01.000Z",
    );
    expect(second.ok).toBe(false);
    expect(first.customers).toHaveLength(sample.length + 1);
  });

  it("actualiza solo la ficha existente y rechaza ids desaparecidos", () => {
    const updated = updateCustomerInCollection(
      sample,
      { ...sample[1], phone: "699 111 222" },
      "2026-07-14T10:00:00.000Z",
    );
    expect(updated.ok).toBe(true);
    if (updated.ok) {
      expect(updated.customers).toHaveLength(sample.length);
      expect(updated.customer.phone).toBe("699 111 222");
    }
    expect(
      updateCustomerInCollection(
        sample,
        { ...sample[1], id: "missing" },
        "2026-07-14T10:00:00.000Z",
      ).ok,
    ).toBe(false);
  });

  it("hace atómico el alta desde documento usando la colección más reciente", () => {
    const first = upsertCustomerForDocumentInCollection(
      sample,
      { firstName: "Teresa", lastName: "" },
      null,
      "new-1",
      "2026-07-14T10:00:00.000Z",
    );
    expect(first.ok).toBe(true);
    if (!first.ok) return;

    const second = upsertCustomerForDocumentInCollection(
      first.customers,
      { firstName: "Teresa", lastName: "" },
      null,
      "new-2",
      "2026-07-14T10:00:01.000Z",
    );
    expect(second.ok).toBe(true);
    if (second.ok) {
      expect(second.customerId).toBe("new-1");
      expect(second.customers).toHaveLength(sample.length + 1);
    }
  });
});

describe("customerToClient", () => {
  it("combina tipo de vía, dirección, CP y ciudad", () => {
    const client = customerToClient(sample[2]);
    expect(client.address).toBe("C/ Mayor 1, 28001 Madrid");
    expect(client.streetType).toBe("calle");
    expect(client.firstName).toBe("Beatriz");
    expect(client.lastName).toBe("López");
    expect(client.postalCode).toBe("28001");
    expect(client.city).toBe("Madrid");
  });

  it("incluye piso y puerta en el snapshot", () => {
    const client = customerToClient({
      ...sample[2],
      streetType: "calle",
      address: "Nena Casas 52",
      addressExtra: "2º 2ª",
      residenceType: "flat",
      city: "Barcelona",
      postalCode: "08017",
    });

    expect(client.address).toBe("C/ Nena Casas 52, 2º 2ª, 08017 Barcelona");
    expect(client.addressExtra).toBe("2º 2ª");
    expect(client.postalCode).toBe("08017");
    expect(client.city).toBe("Barcelona");
  });

  it("mantiene tipo empresa y contacto en el snapshot", () => {
    const client = customerToClient({
      id: "company-1",
      customerType: "company",
      firstName: "Persianas Almar S.L.",
      lastName: "",
      name: "Persianas Almar S.L.",
      contactName: "Laura Gómez",
      createdAt: "",
      updatedAt: "",
    });

    expect(client.customerType).toBe("company");
    expect(client.name).toBe("Persianas Almar S.L.");
    expect(client.contactName).toBe("Laura Gómez");
  });
});

describe("clientInputToSnapshot", () => {
  it("conserva CP y ciudad estructurados además del bloque visible", () => {
    const client = clientInputToSnapshot({
      firstName: " Ana ",
      lastName: " García ",
      nif: " 12345678a ",
      streetType: "calle",
      address: " Mayor 1 ",
      residenceType: "flat",
      addressExtra: " 2º 2ª ",
      postalCode: " 28001 ",
      city: " Madrid ",
    });

    expect(client).toMatchObject({
      name: "Ana García",
      nif: "12345678A",
      address: "C/ Mayor 1, 2º 2ª, 28001 Madrid",
      addressExtra: "2º 2ª",
      postalCode: "28001",
      city: "Madrid",
    });
  });
});

describe("migrateCustomer", () => {
  it("migra clientes antiguos con solo name", () => {
    const migrated = migrateCustomer({
      id: "x",
      name: "Carlos Ruiz",
      createdAt: "",
      updatedAt: "",
    } as Customer);
    expect(migrated.firstName).toBe("Carlos");
    expect(migrated.lastName).toBe("Ruiz");
    expect(customerFullName(migrated.firstName, migrated.lastName)).toBe(
      "Carlos Ruiz",
    );
  });

  it("clasifica como empresa clientes importados con CIF de sociedad", () => {
    const migrated = migrateCustomer({
      id: "company-cif",
      customerType: "person",
      firstName: "Ferrer",
      lastName: "Neurociencias, S.L.",
      name: "FERRER NEUROCIENCIAS, S.L.",
      nif: "B60896362",
      createdAt: "",
      updatedAt: "",
    });

    expect(migrated.customerType).toBe("company");
    expect(migrated.firstName).toBe("FERRER NEUROCIENCIAS, S.L.");
    expect(migrated.lastName).toBe("");
    expect(getCustomerDisplayName(migrated)).toBe("FERRER NEUROCIENCIAS, S.L.");
  });

  it("mantiene particular cuando no hay NIF ni forma juridica de empresa", () => {
    expect(
      inferCustomerTypeFromIdentity({
        name: "Pere Carmona Mas",
        nif: "12345678Z",
      }),
    ).toBe("person");
  });
});

describe("findCustomerByNif", () => {
  it("encuentra por NIF ignorando mayúsculas", () => {
    expect(findCustomerByNif(sample, "12345678a")?.id).toBe("2");
    expect(normalizeCustomerNif("46402457a")).toBe("46402457A");
  });
});

describe("findDuplicateCustomerGroups", () => {
  it("agrupa clientes con el mismo NIF", () => {
    const customers: Customer[] = [
      ...sample,
      {
        id: "4",
        firstName: "Paco",
        lastName: "García",
        name: "Paco García",
        nif: "46402457a",
        createdAt: "",
        updatedAt: "",
      },
      {
        id: "5",
        firstName: "María",
        lastName: "López",
        name: "María López",
        nif: "46402457A",
        createdAt: "",
        updatedAt: "",
      },
    ];
    const groups = findDuplicateCustomerGroups(customers);
    expect(groups).toHaveLength(1);
    expect(groups[0]).toHaveLength(2);
    expect(groups[0].map((c) => c.id).sort()).toEqual(["4", "5"]);
  });
});

describe("customerInvoicedTotal", () => {
  it("usa el importe congelado de un histórico V2 y deja a cero cualquier manipulación", () => {
    const customer = sample[1];
    const profile: BusinessProfile = {
      ...EMPTY_DATA.profile,
      name: "Negocio",
      nif: "12345678Z",
      address: "Calle Mayor 1",
      city: "Madrid",
      postalCode: "28001",
    };
    const historical = attestNewImportedDocument(
      {
        id: "pcfacturacion:factura:Factura_2F2940_2F",
        type: "factura",
        number: "Factura/2940/",
        date: "2026-06-12",
        customerId: customer.id,
        client: { name: customer.name },
        items: [
          {
            id: "legacy-line",
            description: "",
            quantity: 1,
            unitPrice: 100,
            ivaPercent: 21,
          },
        ],
        status: "pagado",
        issuer: {
          name: "",
          nif: "",
          address: "",
          city: "",
          postalCode: "",
          capturedAt: "2026-06-12T10:00:00.000Z",
        },
        documentLifecycle: "issued",
        integrityLock: "locked",
        createdAt: "2026-06-12T10:00:00.000Z",
        updatedAt: "2026-06-12T10:00:00.000Z",
      },
      profile,
      "pcfacturacion",
      "2026-07-13T08:00:00.000Z",
    );

    expect(customerInvoicedTotal([historical], customer)).toBe(121);
    expect(buildCustomerInvoicedTotals([customer], [historical]).get(customer.id)).toBe(
      121,
    );
    expect(customerInvoicedTotal([historical, historical], customer)).toBe(0);
    expect(
      buildCustomerInvoicedTotals(
        [customer],
        [historical, historical],
      ).get(customer.id),
    ).toBe(0);
    expect(historical.snapshotIntegrity).toBeUndefined();

    const tampered: Document = {
      ...historical,
      items: [{ ...historical.items[0], unitPrice: 999 }],
    };
    expect(customerInvoicedTotal([tampered], customer)).toBe(0);
    expect(buildCustomerInvoicedTotals([customer], [tampered]).get(customer.id)).toBe(
      0,
    );

    const appIssuedWithoutEvidence: Document = {
      ...historical,
      id: "app-issued-without-evidence",
      items: [{ ...historical.items[0], unitPrice: 999 }],
      documentSnapshot: undefined,
      legacyImportAttestation: undefined,
      legacyImportProvenance: undefined,
      snapshotIntegrity: undefined,
    };
    expect(customerInvoicedTotal([appIssuedWithoutEvidence], customer)).toBe(
      0,
    );
    expect(
      buildCustomerInvoicedTotals([customer], [appIssuedWithoutEvidence]).get(
        customer.id,
      ),
    ).toBe(0);
  });

  it("suma facturas y recibos emitidos del cliente", () => {
    const customer = sample[1];
    const documents = [
      {
        id: "f1",
        type: "factura" as const,
        status: "enviado" as const,
        client: customerToClient(customer),
        items: [
          {
            id: "1",
            description: "Servicio",
            quantity: 1,
            unitPrice: 100,
            ivaPercent: 21,
          },
        ],
      },
      {
        id: "p1",
        type: "presupuesto" as const,
        status: "enviado" as const,
        client: customerToClient(customer),
        items: [
          {
            id: "2",
            description: "Oferta",
            quantity: 1,
            unitPrice: 500,
            ivaPercent: 21,
          },
        ],
      },
      {
        id: "f2",
        type: "factura" as const,
        status: "borrador" as const,
        client: customerToClient(customer),
        items: [
          {
            id: "3",
            description: "Borrador",
            quantity: 1,
            unitPrice: 999,
            ivaPercent: 21,
          },
        ],
      },
    ];

    expect(customerInvoicedTotal(documents as never, customer)).toBe(121);
  });

  it("encuentra documentos de clientes fusionados por customerId", () => {
    const customer = { ...sample[1], mergedCustomerIds: ["old-ana"] };
    const documents = [
      {
        id: "f1",
        type: "factura" as const,
        status: "enviado" as const,
        customerId: "old-ana",
        client: { name: "Ana antigua", nif: "99999999Z" },
        items: [
          {
            id: "1",
            description: "Servicio",
            quantity: 1,
            unitPrice: 100,
            ivaPercent: 21,
          },
        ],
      },
    ];

    expect(customerInvoicedTotal(documents as never, customer)).toBe(121);
  });

  it("no cuenta por snapshot cuando customerId apunta a otro cliente", () => {
    const documents = [
      {
        id: "f1",
        type: "factura" as const,
        status: "enviado" as const,
        customerId: sample[1].id,
        client: customerToClient(sample[0]),
        items: [
          {
            id: "1",
            description: "Servicio",
            quantity: 1,
            unitPrice: 100,
            ivaPercent: 21,
          },
        ],
      },
    ];

    expect(customerInvoicedTotal(documents as never, sample[0])).toBe(0);
    expect(customerInvoicedTotal(documents as never, sample[1])).toBe(121);
  });
});

describe("clientMatchesCustomer", () => {
  it("empareja por NIF si el nombre tambien encaja", () => {
    expect(
      clientMatchesCustomer(
        { name: "Ana García", nif: "12345678a" },
        sample[1],
      ),
    ).toBe(true);
  });

  it("no empareja solo por NIF si el nombre apunta a otro cliente", () => {
    expect(
      clientMatchesCustomer(
        { name: "Llefisa SL", nif: "12345678a", customerType: "company" },
        sample[1],
      ),
    ).toBe(false);
  });

  it("mantiene el NIF como apoyo si el documento no trae nombre util", () => {
    expect(clientMatchesCustomer({ name: "", nif: "12345678a" }, sample[1])).toBe(
      true,
    );
  });

  it("no empareja dos fichas con el mismo nombre y NIF distintos", () => {
    expect(
      clientMatchesCustomer(
        { name: "Ana García", nif: "99999999Z" },
        sample[1],
      ),
    ).toBe(false);
  });
});

describe("findCustomerByClient", () => {
  it("encuentra por nombre y apellidos", () => {
    const found = findCustomerByClient(sample, {
      firstName: "Ana",
      lastName: "García",
      name: "Ana García",
    });
    expect(found?.id).toBe("2");
  });

  it("encuentra por identidad", () => {
    const found = findCustomerByIdentity(sample, "Zara", "Servicios");
    expect(found?.id).toBe("1");
  });

  it("no elige por nombre cuando el NIF informado contradice la ficha", () => {
    const found = findCustomerByClient(sample, {
      firstName: "Ana",
      lastName: "García",
      name: "Ana García",
      nif: "99999999Z",
    });
    expect(found).toBeUndefined();
  });
});
