import { describe, expect, it } from "vitest";
import { consultorFiscalSection } from "./sections/consultor-fiscal";

function notificationManualText(): string {
  const notificationStart = consultorFiscalSection.steps.findIndex((step) =>
    step.title.includes("Preparar y analizar un lote de notificaciones"),
  );

  return consultorFiscalSection.steps
    .slice(notificationStart)
    .flatMap((step) => [step.title, ...step.paragraphs, step.tip ?? ""])
    .join("\n");
}

describe("manual de Notificaciones y expedientes", () => {
  it("documenta el lote explícito, la revisión y la persistencia estructurada", () => {
    const text = notificationManualText();

    expect(text).toContain("Elegir varios PDF");
    expect(text).toContain("50 documentos");
    expect(text).toContain("Añadirlos no inicia el análisis");
    expect(text).toContain("mismo orden familiar del escáner de gastos");
    expect(text).toContain("**Guardar y revisar siguiente**");
    expect(text).toContain("se abre automáticamente el siguiente");
    expect(text).toContain("se cierra");
    expect(text).toContain("señala en verde la ficha recién guardada");
    expect(text).toContain("se guarda directamente en Factu");
    expect(text).toContain("no aparece un selector de destinos");
    expect(text).toContain("ni se intenta subir el PDF a Google Drive");
    expect(text).toContain("nunca el PDF original");
    expect(text).toContain("documentación solicitada");
    expect(text).toContain("denegación de aplazamiento o fraccionamiento");
    expect(text).toContain("motivo impreso");
    expect(text).toContain("carta de pago adjunta");
    expect(text).toContain("se mantiene dentro del acto principal");
    expect(text).toContain("no crea una segunda liquidación ni un pago");
    expect(text).toContain("la ficha válida se conserva");
    expect(text).toContain("la fase y un código seguro");
    expect(text).toContain("no crea automáticamente una deuda");
  });

  it("documenta que no se archivan originales nuevos y preserva los anteriores", () => {
    const text = notificationManualText();

    expect(text).toContain(
      "El escáner ya no ofrece archivar originales nuevos en Google Drive",
    );
    expect(text).toContain(
      "Los originales que se archivaron antes de este cambio permanecen",
    );
    expect(text).toContain("Abrir o descargar");
    expect(text).toContain("se trata como duplicado");
  });

  it("documenta la biblioteca cronológica y las relaciones revisables", () => {
    const text = notificationManualText();

    expect(text).toContain("Tus documentos");
    expect(text).toContain("organismo abreviado");
    expect(text).toContain("cadena horizontal");
    expect(text).toContain("cronología vertical");
    expect(text).toContain("primer documento");
    expect(text).toContain("último documento");
    expect(text).toContain("Relación sugerida");
    expect(text).toContain("no confirma por sí sola el efecto");
    expect(text).toContain("¿Eliminar este documento?");
    expect(text).toContain("¿Quieres eliminar también el documento original");
    expect(text).toContain("Solo ficha");
    expect(text).toContain("Ficha y original");
    expect(text).toContain("papelera de Drive");
  });

  it("documenta la expansión V9, la profundidad V10 y sus límites", () => {
    const text = notificationManualText();

    expect(text).toContain("122 familias documentales");
    expect(text).toContain("118 tienen lectura automática");
    expect(text).toContain("4 familias sectoriales");
    expect(text).toContain("11 familias prioritarias");
    expect(text).toContain("extracción profunda");
    expect(text).toContain("se añaden 11 cadenas");
    expect(text).toContain(
      "puede producir automáticamente la ampliación por la mitad",
    );
    expect(text).toContain(
      "resolución puede llegar directamente sin propuesta previa",
    );
    expect(text).toContain("mensual desde septiembre de 2024");
    expect(text).toContain("no se presenta como un recurso ordinario");
    expect(text).toContain("respuesta técnica VERI*FACTU no es una sanción");
  });
});
