import { describe, expect, it } from "vitest";
import {
  buildCustomerInvoicedTotals,
  clientMatchesCustomer,
  customerFullName,
  customerInvoicedTotal,
  customerPayloadFromInput,
  customerToClient,
  ensureCustomerForDocument,
  filterCustomers,
  findCustomerByClient,
  findCustomerByIdentity,
  findCustomerByNif,
  findDuplicateCustomerGroups,
  migrateCustomer,
  normalizeCustomerNif,
  sortCustomers,
  sortCustomersByName,
  validateCustomerContact,
  validateCustomerInput,
  validateUniqueCustomer,
} from "./customers";
import type { Customer } from "./types";

const sample: Customer[] = [
  {
    id: "1",
    firstName: "Zara",
    lastName: "Servicios",
    name: "Zara Servicios",
    nif: "B11111111",
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
    expect(filterCustomers(sample, "B111").map((c) => c.name)).toEqual([
      "Zara Servicios",
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
      expect(result.customer.notes).toBe("Alta desde factura");
      expect(result.client.address).toBe("C/ Doctor Carulla 19, 08017 Barcelona");
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

  it("bloquea duplicado si se escribe manualmente", () => {
    const result = ensureCustomerForDocument(
      sample,
      { firstName: "Ana", lastName: "García" },
      null,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("Ya existe");
    }
  });

  it("bloquea NIF duplicado al crear desde documento", () => {
    const result = ensureCustomerForDocument(
      sample,
      { firstName: "Pedro", lastName: "Ruiz", nif: "12345678a" },
      null,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("NIF");
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
});

describe("customerToClient", () => {
  it("combina tipo de vía, dirección, CP y ciudad", () => {
    const client = customerToClient(sample[2]);
    expect(client.address).toBe("C/ Mayor 1, 28001 Madrid");
    expect(client.streetType).toBe("calle");
    expect(client.firstName).toBe("Beatriz");
    expect(client.lastName).toBe("López");
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
  it("empareja por NIF en documentos", () => {
    expect(
      clientMatchesCustomer(
        { name: "Otro nombre", nif: "12345678a" },
        sample[1],
      ),
    ).toBe(true);
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
});
