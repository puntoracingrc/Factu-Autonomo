import { describe, expect, it } from "vitest";
import { DEFAULT_PROFILE, type Document } from "./types";
import {
  buildMailtoUrl,
  buildShareMessage,
  buildWhatsAppUrl,
  hasClientEmail,
  hasClientPhone,
  normalizePhoneForWhatsApp,
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
  iban: "ES00 0000 0000 0000 0000 0000",
};

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
    );
    expect(message).toContain("F-2025-001");
    expect(message).toContain("la factura");
    expect(message).toContain("Mi Negocio");
    expect(message).toContain("IBAN:");
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
});

describe("contact helpers", () => {
  it("detecta email y teléfono válidos", () => {
    expect(hasClientEmail(sampleDoc)).toBe(true);
    expect(hasClientPhone(sampleDoc)).toBe(true);
  });
});
