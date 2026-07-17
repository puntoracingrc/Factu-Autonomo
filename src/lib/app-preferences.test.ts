import { describe, expect, it } from "vitest";
import {
  APP_START_PAGE_OPTIONS,
  DOCUMENT_EMAIL_CONCRETE_METHOD_OPTIONS,
  DOCUMENT_EMAIL_METHOD_OPTIONS,
  DOCUMENT_WHATSAPP_CONCRETE_METHOD_OPTIONS,
  DOCUMENT_WHATSAPP_METHOD_OPTIONS,
  appStartPageHref,
  normalizeAppPreferences,
} from "./app-preferences";

describe("app preferences", () => {
  it("normaliza preferencias ausentes o inválidas", () => {
    expect(normalizeAppPreferences()).toEqual({
      theme: "system",
      density: "comfortable",
      startPage: "panel",
      reduceMotion: false,
      documentEmailMethod: "ask",
      documentWhatsAppMethod: "ask",
    });

    expect(
      normalizeAppPreferences({
        theme: "dark",
        density: "compact",
        startPage: "expenses",
        reduceMotion: true,
        documentEmailMethod: "gmail",
        documentWhatsAppMethod: "direct",
      }),
    ).toEqual({
      theme: "dark",
      density: "compact",
      startPage: "expenses",
      reduceMotion: true,
      documentEmailMethod: "gmail",
      documentWhatsAppMethod: "direct",
    });

    expect(
      normalizeAppPreferences({
        theme: "sepia" as never,
        density: "tiny" as never,
        startPage: "unknown" as never,
        reduceMotion: "yes" as never,
        documentEmailMethod: "fax" as never,
        documentWhatsAppMethod: "sms" as never,
      }),
    ).toEqual({
      theme: "system",
      density: "comfortable",
      startPage: "panel",
      reduceMotion: false,
      documentEmailMethod: "ask",
      documentWhatsAppMethod: "ask",
    });
  });

  it("mantiene rutas conocidas para pantalla inicial", () => {
    expect(APP_START_PAGE_OPTIONS.map((option) => option.value)).toEqual([
      "panel",
      "customers",
      "invoices",
      "expenses",
      "taxes",
      "settings",
    ]);
    expect(appStartPageHref("invoices")).toBe("/facturas");
    expect(appStartPageHref(undefined)).toBe("/");
  });

  it("ofrece metodos de envio de documentos", () => {
    expect(DOCUMENT_EMAIL_METHOD_OPTIONS.map((option) => option.value)).toEqual(
      ["ask", "gmail", "mailto", "native"],
    );
    expect(
      DOCUMENT_WHATSAPP_METHOD_OPTIONS.map((option) => option.value),
    ).toEqual(["ask", "direct", "native"]);
    expect(
      DOCUMENT_EMAIL_CONCRETE_METHOD_OPTIONS.map((option) => option.value),
    ).toEqual(["gmail", "mailto", "native"]);
    expect(
      DOCUMENT_WHATSAPP_CONCRETE_METHOD_OPTIONS.map((option) => option.value),
    ).toEqual(["direct", "native"]);
  });
});
