import { afterEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_PROFILE, type Document } from "./types";
import { issueDocument } from "./document-integrity";
import {
  buildMailtoUrl,
  buildShareMessage,
  buildWhatsAppUrl,
  greetingForDate,
  hasClientEmail,
  hasClientPhone,
  normalizePhoneForWhatsApp,
  shareDocumentByWhatsApp,
} from "./share";

const sampleDoc: Document = {
  id: "1",
  type: "factura",
  number: "F-2025-001",
  date: "2025-06-09",
  dueDate: "2025-07-09",
  client: {
    name: "Juan Pérez",
    email: "juan@example.com",
    phone: "612 345 678",
  },
  items: [
    {
      id: "l1",
      description: "Servicio",
      quantity: 1,
      unitPrice: 100,
      ivaPercent: 21,
    },
  ],
  status: "borrador",
  createdAt: "2025-06-09",
  updatedAt: "2025-06-09",
};

const profile = {
  ...DEFAULT_PROFILE,
  name: "Mi Negocio",
  nif: "12345678Z",
  address: "Calle Original 1",
  city: "Barcelona",
  postalCode: "08001",
  phone: "600000000",
  email: "hola@example.com",
  iban: "ES00 0000 0000 0000 0000 0000",
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("normalizePhoneForWhatsApp", () => {
  it("normaliza móvil español de 9 dígitos", () => {
    expect(normalizePhoneForWhatsApp("612 34 56 78")).toBe("34612345678");
  });

  it("respeta prefijo internacional", () => {
    expect(normalizePhoneForWhatsApp("+34 612 345 678")).toBe("34612345678");
  });

  it("rechaza números demasiado cortos", () => {
    expect(normalizePhoneForWhatsApp("12345")).toBeNull();
  });
});

describe("buildWhatsAppUrl", () => {
  it("genera enlace wa.me con mensaje", () => {
    const url = buildWhatsAppUrl("612345678", "Hola");
    expect(url).toContain("https://wa.me/34612345678");
    expect(url).toContain(encodeURIComponent("Hola"));
  });
});

describe("shareDocumentByWhatsApp", () => {
  it("comparte el PDF nativo sin abrir después un enlace de WhatsApp", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    const canShare = vi.fn().mockReturnValue(true);
    const open = vi.fn();

    vi.stubGlobal("navigator", {
      share,
      canShare,
    });
    vi.stubGlobal("window", {
      open,
    });

    await shareDocumentByWhatsApp(sampleDoc, profile);

    expect(share).toHaveBeenCalledTimes(1);
    expect(share.mock.calls[0][0].files[0].type).toBe("application/pdf");
    expect(open).not.toHaveBeenCalled();
  });
});

describe("buildMailtoUrl", () => {
  it("genera mailto con asunto y cuerpo", () => {
    const url = buildMailtoUrl("a@b.com", "Factura F-1", "Hola");
    expect(url.startsWith("mailto:a@b.com?")).toBe(true);
    expect(url).toContain("subject=");
    expect(url).toContain("body=");
  });
});

describe("buildShareMessage", () => {
  it("incluye número e importe en facturas pendientes de cobro", () => {
    const message = buildShareMessage(
      { ...sampleDoc, status: "enviado" },
      profile,
      new Date("2026-06-24T09:00:00"),
    );
    expect(message).toContain("Buenos días, Juan");
    expect(message).toContain("F-2025-001");
    expect(message).toContain("la factura");
    expect(message).toContain("Mi Negocio");
    expect(message).toContain("NIF: 12345678Z");
    expect(message).toContain("Tel.: 600000000");
    expect(message).toContain("IBAN:");
  });

  it("usa el nombre comercial como firma cuando existe", () => {
    const message = buildShareMessage(
      { ...sampleDoc, status: "enviado" },
      { ...profile, commercialName: "Marca Visible" },
    );

    expect(message).toContain("Marca Visible");
    expect(message).toContain("\nMi Negocio");
  });

  it("no incluye IBAN si la factura ya está cobrada", () => {
    const message = buildShareMessage(
      { ...sampleDoc, status: "pagado" },
      profile,
    );
    expect(message).toContain("F-2025-001");
    expect(message).not.toContain("IBAN:");
  });

  it("adapta el mensaje a presupuestos", () => {
    const message = buildShareMessage(
      { ...sampleDoc, type: "presupuesto", number: "P-2025-003" },
      profile,
    );
    expect(message).toContain("el presupuesto P-2025-003");
    expect(message).not.toContain("IBAN:");
  });

  it("adapta el mensaje a recibos", () => {
    const message = buildShareMessage(
      { ...sampleDoc, type: "recibo", number: "R-2025-007" },
      profile,
    );
    expect(message).toContain("el recibo R-2025-007");
  });

  it("usa snapshot para documentos emitidos aunque cambien datos vivos", () => {
    const issued = issueDocument(
      sampleDoc,
      { ...profile, commercialName: "Marca Original" },
      "2026-06-24T10:00:00.000Z",
    );
    const message = buildShareMessage(
      {
        ...issued,
        number: "F-2099-999",
        date: "2099-01-01",
        client: { name: "Cliente cambiado" },
        items: [
          {
            id: "changed",
            description: "Linea cambiada",
            quantity: 10,
            unitPrice: 999,
            ivaPercent: 0,
          },
        ],
      },
      {
        ...profile,
        commercialName: "Marca cambiada",
        name: "Negocio cambiado",
        iban: "ES99 9999 9999 9999 9999 9999",
      },
    );

    expect(message).toContain("Juan");
    expect(message).toContain("F-2025-001");
    expect(message).toContain("121,00");
    expect(message).toContain("Marca Original");
    expect(message).not.toContain("Cliente cambiado");
    expect(message).not.toContain("F-2099-999");
    expect(message).not.toContain("Negocio cambiado");
    expect(message).not.toContain("Marca cambiada");
  });
});

describe("greetingForDate", () => {
  it("saluda según la franja horaria", () => {
    expect(greetingForDate(new Date("2026-06-24T09:00:00"))).toBe("Buenos días");
    expect(greetingForDate(new Date("2026-06-24T17:00:00"))).toBe("Buenas tardes");
    expect(greetingForDate(new Date("2026-06-24T22:00:00"))).toBe("Buenas noches");
  });
});

describe("contact helpers", () => {
  it("detecta email y teléfono válidos", () => {
    expect(hasClientEmail(sampleDoc)).toBe(true);
    expect(hasClientPhone(sampleDoc)).toBe(true);
  });

  it("el email informado habilita email en documento", () => {
    expect(
      hasClientEmail({
        ...sampleDoc,
        client: { ...sampleDoc.client, email: "cliente@example.com" },
      }),
    ).toBe(true);
  });

  it("el teléfono informado habilita WhatsApp en documento", () => {
    expect(
      hasClientPhone({
        ...sampleDoc,
        client: { ...sampleDoc.client, phone: "+34 612 345 678" },
      }),
    ).toBe(true);
  });

  it("no habilita email con formato inválido", () => {
    expect(
      hasClientEmail({
        ...sampleDoc,
        client: { ...sampleDoc.client, email: "cliente@" },
      }),
    ).toBe(false);
  });
});
