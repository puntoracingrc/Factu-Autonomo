import { describe, expect, it } from "vitest";
import { consultorFiscalSection } from "./sections/consultor-fiscal";

function notificationManualText(): string {
  return consultorFiscalSection.steps
    .filter(
      (step) =>
        /^\d+\. /u.test(step.title) && Number.parseInt(step.title, 10) >= 7,
    )
    .flatMap((step) => [step.title, ...step.paragraphs, step.tip ?? ""])
    .join("\n");
}

describe("manual de Notificaciones y expedientes", () => {
  it("documenta el lote explícito, la revisión y la persistencia estructurada", () => {
    const text = notificationManualText();

    expect(text).toContain("Elegir varios PDF");
    expect(text).toContain("50 documentos");
    expect(text).toContain("Añadirlos no inicia el análisis");
    expect(text).toContain("**Mi cuenta**");
    expect(text).toContain("**Google Drive**");
    expect(text).toContain("**Ambas**");
    expect(text).toContain("no necesitas seleccionarlo ni escanearlo otra vez");
    expect(text).toContain("Factu nunca custodia el PDF");
    expect(text).toContain("documentación solicitada");
    expect(text).toContain("denegación de aplazamiento o fraccionamiento");
    expect(text).toContain("motivo impreso");
    expect(text).toContain("carta de pago adjunta");
    expect(text).toContain("no crea automáticamente una deuda");
  });

  it("documenta el archivado voluntario y verificable en Drive", () => {
    const text = notificationManualText();

    expect(text).toContain("Original registrado sin archivar");
    expect(text).toContain("Archivar original en Drive");
    expect(text).toContain("Conectar Drive y archivar");
    expect(text).toContain("Factu - documentos oficiales/AAAA/MM");
    expect(text).toContain("Fecha pendiente");
    expect(text).toContain("fecha del propio documento");
    expect(text).toContain("Abrir o descargar");
    expect(text).toContain("se rechaza como duplicado");
  });

  it("documenta la biblioteca cronológica y las relaciones revisables", () => {
    const text = notificationManualText();

    expect(text).toContain("Documentos escaneados y expedientes");
    expect(text).toContain("organismo abreviado");
    expect(text).toContain("meses y años");
    expect(text).toContain("Fecha del primer documento");
    expect(text).toContain("Fecha del último documento");
    expect(text).toContain("de izquierda a derecha");
    expect(text).toContain("Relación detectada · revisar");
    expect(text).toContain("no confirma por sí sola el efecto");
    expect(text).toContain("¿Eliminar este documento?");
    expect(text).toContain("¿Quieres eliminar también el documento original");
    expect(text).toContain("papelera de Drive");
  });
});
