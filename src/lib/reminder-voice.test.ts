import { describe, expect, it } from "vitest";
import {
  appendVoiceTranscript,
  normalizeVoiceTranscript,
} from "./reminder-voice";

describe("reminder voice transcript helpers", () => {
  it("normaliza espacios del texto transcrito", () => {
    expect(normalizeVoiceTranscript("  llamar   a   Maria\npor la tarde  ")).toBe(
      "llamar a Maria por la tarde",
    );
  });

  it("crea el texto inicial con mayuscula", () => {
    expect(appendVoiceTranscript("", "llamar a Maria")).toBe("Llamar a Maria");
  });

  it("anade una frase nueva sin machacar lo escrito", () => {
    expect(
      appendVoiceTranscript("Hacer factura a Maria", "enviar por email"),
    ).toBe("Hacer factura a Maria. Enviar por email");
  });

  it("respeta puntuacion existente", () => {
    expect(appendVoiceTranscript("Llamar a Maria.", "pedir datos")).toBe(
      "Llamar a Maria. Pedir datos",
    );
  });

  it("ignora transcripciones vacias", () => {
    expect(appendVoiceTranscript("Texto previo", "   ")).toBe("Texto previo");
  });
});
