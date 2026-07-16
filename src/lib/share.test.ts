import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_PROFILE,
  type BusinessProfile,
  type Document,
} from "./types";
import { issueDocument, markDocumentPaid } from "./document-integrity";
import {
  buildGmailComposeUrl,
  buildMailtoUrl,
  buildShareMessage,
  buildWhatsAppUrl,
  canShareDocumentPdfNatively,
  greetingForDate,
  hasClientEmail,
  hasClientPhone,
  normalizePhoneForWhatsApp,
  NativeDocumentShareUnavailableError,
  openDocumentEmailMessage,
  openExternalUrl,
  openWhatsAppDocumentMessage,
  reserveExternalShareWindow,
  shareDocumentByEmail,
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

const profile: BusinessProfile = {
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

function issuedSampleDoc(issuer: BusinessProfile = profile): Document {
  return issueDocument(sampleDoc, issuer, "2025-06-09T09:00:00.000Z");
}

function paidSampleDoc(): Document {
  return markDocumentPaid(
    issuedSampleDoc(),
    "2025-06-10T09:00:00.000Z",
  );
}

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
    expect(url).toContain("https://web.whatsapp.com/send?");
    expect(url).toContain("phone=34612345678");
    expect(url).toContain("text=Hola");
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

describe("document email native sharing", () => {
  it("detecta de antemano si el navegador puede compartir un PDF", () => {
    vi.stubGlobal("navigator", {});
    expect(canShareDocumentPdfNatively()).toBe(false);

    vi.stubGlobal("navigator", { share: vi.fn() });
    expect(canShareDocumentPdfNatively()).toBe(true);

    vi.stubGlobal("navigator", {
      share: vi.fn(),
      canShare: vi.fn(() => false),
    });
    expect(canShareDocumentPdfNatively()).toBe(false);

    vi.stubGlobal("navigator", {
      share: vi.fn(),
      canShare: vi.fn(() => true),
    });
    expect(canShareDocumentPdfNatively()).toBe(true);
  });

  it("no cae silenciosamente a mailto si compartir falla", async () => {
    const open = vi.fn();
    vi.stubGlobal("navigator", {
      share: vi.fn().mockRejectedValue(new Error("share_failed")),
      canShare: vi.fn(() => true),
    });
    vi.stubGlobal("window", { open });

    await expect(
      shareDocumentByEmail(sampleDoc, profile, undefined, "native"),
    ).rejects.toBeInstanceOf(NativeDocumentShareUnavailableError);
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

describe("buildGmailComposeUrl", () => {
  it("genera enlace directo a Gmail con destinatario, asunto y cuerpo", () => {
    const url = buildGmailComposeUrl("a@b.com", "Factura F-1", "Hola");
    expect(url.startsWith("https://mail.google.com/mail/?")).toBe(true);
    expect(url).toContain("view=cm");
    expect(url).toContain("to=a%40b.com");
    expect(url).toContain("su=Factura+F-1");
    expect(url).toContain("body=Hola");
  });
});

describe("openDocumentEmailMessage", () => {
  it("no mete instrucciones internas de adjuntar en el cuerpo", () => {
    const open = vi.fn(() => ({}));
    vi.stubGlobal("window", { open });

    expect(openDocumentEmailMessage(sampleDoc, profile, "gmail")).toBe(true);

    const rawUrl = (open.mock.calls[0] as unknown as [string])[0];
    const url = new URL(rawUrl);
    const body = url.searchParams.get("body") ?? "";
    expect(body).toContain("Le adjuntamos la factura F-2025-001");
    expect(body).not.toContain("Adjunta el PDF");
    expect(body).not.toContain("Adjunto el PDF");
  });

  it("usa una ventana reservada si se pasa para no sustituir la app", () => {
    const open = vi.fn();
    const target = {
      closed: false,
      focus: vi.fn(),
      location: { href: "" },
    } as unknown as Window;
    vi.stubGlobal("window", { open });

    expect(openDocumentEmailMessage(sampleDoc, profile, "gmail", target)).toBe(
      true,
    );

    expect(open).not.toHaveBeenCalled();
    expect(target.location.href).toContain("https://mail.google.com/mail/");
  });
});

describe("openWhatsAppDocumentMessage", () => {
  it("no mete instrucciones internas de adjuntar en el mensaje", () => {
    const open = vi.fn(() => ({}));
    vi.stubGlobal("window", { open });

    expect(openWhatsAppDocumentMessage(sampleDoc, profile)).toBe(true);

    const rawUrl = (open.mock.calls[0] as unknown as [string])[0];
    const url = new URL(rawUrl);
    const text = url.searchParams.get("text") ?? "";
    expect(text).toContain("Le adjuntamos la factura F-2025-001");
    expect(text).not.toContain("Adjunta el PDF");
    expect(text).not.toContain("Adjunto el PDF");
  });

  it("usa una ventana reservada si se pasa para no sustituir la app", () => {
    const open = vi.fn();
    const target = {
      closed: false,
      focus: vi.fn(),
      location: { href: "" },
    } as unknown as Window;
    vi.stubGlobal("window", { open });

    expect(openWhatsAppDocumentMessage(sampleDoc, profile, target)).toBe(true);

    expect(open).not.toHaveBeenCalled();
    expect(target.location.href).toContain("https://web.whatsapp.com/send");
  });
});

describe("reserveExternalShareWindow", () => {
  it("reserva una pestaña temporal durante el gesto del usuario", () => {
    const opened = {
      document: { title: "", body: { textContent: "" } },
      opener: {},
    };
    const open = vi.fn(() => opened);
    vi.stubGlobal("window", { open });

    expect(reserveExternalShareWindow()).toBe(opened);
    expect(open).toHaveBeenCalledWith("about:blank", "_blank");
    expect(opened.opener).toBeNull();
    expect(opened.document.title).toBe("Preparando envío");
    expect(opened.document.body.textContent).toContain("Preparando el envío");
  });
});

describe("openExternalUrl", () => {
  it("reutiliza la pestaña reservada antes del trabajo asíncrono", () => {
    const open = vi.fn();
    const target = {
      closed: false,
      focus: vi.fn(),
      location: { href: "about:blank" },
    } as unknown as Window;
    vi.stubGlobal("window", { open });

    expect(
      openExternalUrl("https://mail.google.com/mail/?view=cm", target),
    ).toBe(true);
    expect(open).not.toHaveBeenCalled();
    expect(target.location.href).toContain("mail.google.com");
    expect(target.focus).toHaveBeenCalledOnce();
  });

  it("informa del bloqueo para permitir una navegación de respaldo", () => {
    const open = vi.fn(() => null);
    vi.stubGlobal("window", { open });

    expect(openExternalUrl("https://mail.google.com/mail/?view=cm")).toBe(
      false,
    );
    expect(open).toHaveBeenCalledWith(
      "https://mail.google.com/mail/?view=cm",
      "_blank",
      "noopener,noreferrer",
    );
  });
});

describe("buildShareMessage", () => {
  it("incluye número e importe en facturas pendientes de cobro", () => {
    const message = buildShareMessage(
      issuedSampleDoc(),
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
    const brandedProfile = { ...profile, commercialName: "Marca Visible" };
    const message = buildShareMessage(
      issuedSampleDoc(brandedProfile),
      brandedProfile,
    );

    expect(message).toContain("Marca Visible");
    expect(message).toContain("\nMi Negocio");
  });

  it("no incluye IBAN si la factura ya está cobrada", () => {
    const message = buildShareMessage(paidSampleDoc(), profile);
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
