import { describe, expect, it } from "vitest";
import {
  findReminderVoiceCustomerMatch,
  interpretReminderVoiceIntent,
  isReminderVoiceResetCommand,
  normalizeReminderVoiceText,
} from "./reminder-voice-intent";
import type { Customer, Document } from "./types";

function customer(overrides: Partial<Customer>): Customer {
  return {
    id: "c1",
    firstName: "Maria",
    lastName: "Lopez",
    name: "Maria Lopez",
    createdAt: "2026-01-01",
    updatedAt: "2026-01-01",
    ...overrides,
  };
}

function document(overrides: Partial<Document>): Document {
  return {
    id: "d1",
    type: "factura",
    number: "F-2026-0001",
    date: "2026-06-01",
    client: { name: "Vilfer 24H SL" },
    items: [
      {
        id: "i1",
        description: "Trabajo",
        quantity: 1,
        unitPrice: 208.8,
        ivaPercent: 0,
      },
    ],
    status: "enviado",
    createdAt: "2026-06-01",
    updatedAt: "2026-06-01",
    ...overrides,
  };
}

describe("reminder voice intent", () => {
  it("normaliza acentos y puntuacion", () => {
    expect(normalizeReminderVoiceText("Factura a María López, mañana")).toBe(
      "factura a maria lopez manana",
    );
  });

  it("encuentra clientes aunque OpenAI transcriba llado como yado", () => {
    const match = findReminderVoiceCustomerMatch(
      [
        customer({
          id: "llado",
          firstName: "Pere",
          lastName: "Lladó",
          name: "Pere Lladó",
        }),
      ],
      "Haz una factura a Yado mañana",
    );

    expect(match?.customer.id).toBe("llado");
    expect(match?.confidence).toBe("alta");
  });

  it("mueve filtros para factura y preselecciona cliente cercano", () => {
    const intent = interpretReminderVoiceIntent({
      transcript: "Crear factura para Metalurgica Arandes",
      customers: [
        customer({
          id: "arandes",
          firstName: "",
          lastName: "",
          name: "METALURGICA ARANDES S.L.",
        }),
      ],
    });

    expect(intent.linkMode).toBe("generate");
    expect(intent.generateType).toBe("factura");
    expect(intent.customerMatch?.customer.id).toBe("arandes");
  });

  it("acepta la orden corta factura a cliente con busqueda fonetica", () => {
    const intent = interpretReminderVoiceIntent({
      transcript: "Factura a Yado",
      customers: [
        customer({
          id: "llado",
          firstName: "Pere",
          lastName: "Lladó",
          name: "Pere Lladó",
        }),
      ],
    });

    expect(intent.linkMode).toBe("generate");
    expect(intent.generateType).toBe("factura");
    expect(intent.customerMatch?.customer.id).toBe("llado");
  });


  it("distingue presupuesto y recibo", () => {
    expect(
      interpretReminderVoiceIntent({
        transcript: "Preparar presupuesto para Maria Lopez",
        customers: [customer({ id: "maria" })],
      }).generateType,
    ).toBe("presupuesto");

    expect(
      interpretReminderVoiceIntent({
        transcript: "Crear recibo para Maria Lopez",
        customers: [customer({ id: "maria" })],
      }).generateType,
    ).toBe("recibo");
  });

  it("no fuerza enlace si solo es una nota de recordatorio", () => {
    const intent = interpretReminderVoiceIntent({
      transcript: "Llamar a Maria mañana por la tarde",
      customers: [customer({ id: "maria" })],
    });

    expect(intent.linkMode).toBe("none");
  });

  it("prepara rectificacion y encuentra documento claro", () => {
    const intent = interpretReminderVoiceIntent({
      transcript: "Rectificar factura Vilfer 208,80",
      customers: [],
      documents: [document({ id: "vilfer" })],
    });

    expect(intent.linkMode).toBe("rectify");
    expect(intent.rectifyType).toBe("factura");
    expect(intent.documentMatch?.document.id).toBe("vilfer");
  });

  it("entiende comandos naturales para limpiar y empezar de nuevo", () => {
    expect(isReminderVoiceResetCommand("Ostras, borra todo que me he liado")).toBe(
      true,
    );
    expect(
      interpretReminderVoiceIntent({
        transcript: "Empezamos de nuevo",
        customers: [customer({ id: "maria" })],
      }).linkMode,
    ).toBe("reset");
  });

  it("no confunde una tarea normal de borrar con reiniciar el dictado", () => {
    expect(
      interpretReminderVoiceIntent({
        transcript: "Recordarme borrar el recibo antiguo mañana",
        customers: [],
      }).linkMode,
    ).toBe("none");
  });
});
