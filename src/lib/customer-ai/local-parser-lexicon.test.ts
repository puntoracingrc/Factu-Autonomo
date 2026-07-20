import { describe, expect, it } from "vitest";
import { parseCustomerFieldSegment } from "./local-parser-lexicon";

describe("customer text field lexicon", () => {
  it.each([
    ["correo electrónico: prueba@example.test", "email"],
    ["correu electrònic: prova@example.test", "email"],
    ["enderezo electrónico: proba@example.test", "email"],
    ["helbide elektronikoa: proba@example.test", "email"],
    ["corrèu electronic: prova@example.test", "email"],
    ["corréu electrónicu: proba@example.test", "email"],
    ["adreça: Carrer Major 1", "address"],
    ["enderezo: Rúa Maior 1", "address"],
    ["helbidea: Kale Nagusia 1", "address"],
    ["posta kodea: 20001", "postalCode"],
    ["còdi postal: 25530", "postalCode"],
    ["códigu postal: 33001", "postalCode"],
  ])("recognizes %s", (input, field) => {
    expect(parseCustomerFieldSegment(input)?.field).toBe(field);
  });

  it.each([
    ["clietne: Taller Proba SL", "name"],
    ["emial: prova@example.test", "email"],
    ["telefoino: 600111222", "phone"],
    ["dirrecion: Calle Mayor 1", "address"],
    ["localdiad: Madird", "city"],
    ["codgio postal: 28013", "postalCode"],
  ])("accepts the unambiguous synthetic typo %s", (input, field) => {
    expect(parseCustomerFieldSegment(input)).toMatchObject({
      field,
      approximateLabel: true,
    });
  });

  it.each(["hombre: Alberto", "dominio: example.test", "importe: 100"])(
    "does not overcorrect the ordinary word %s",
    (input) => {
      expect(parseCustomerFieldSegment(input)).toBeNull();
    },
  );
});
