import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  new URL("./FiscalWatchPanel.tsx", import.meta.url),
  "utf8",
);

describe("FiscalWatchPanel UI contract", () => {
  it("distingue rojo, ámbar y verde con semántica accesible y modo oscuro", () => {
    expect(source).toContain("border-red-300 bg-red-50");
    expect(source).toContain("dark:border-red-800 dark:bg-red-950/35");
    expect(source).toContain("border-amber-300 bg-amber-50");
    expect(source).toContain("dark:border-amber-800 dark:bg-amber-950/35");
    expect(source).toContain("border-emerald-300 bg-emerald-50");
    expect(source).toContain("dark:border-emerald-800 dark:bg-emerald-950/35");
    expect(source).toContain('role={level === "action" ? "alert" : "status"}');
    expect(source).toContain('aria-labelledby="fiscal-watch-title"');
    expect(source).toContain("data-fiscal-watch-level");
  });

  it("falla visualmente cerrado ante estado ausente o contrato manipulado", () => {
    expect(source).toContain("status.sourcesValid === true");
    expect(source).toContain("rawIssues.length === issues.length");
    expect(source).toContain(
      'const level = statusContractValid ? safeLevel(status?.level) : "action"',
    );
    expect(source).toContain("La vigilancia fiscal no puede verificarse.");
    expect(source).toContain("exactGithubUrl");
    expect(source).toContain("OFFICIAL_SOURCE_LABELS");
    expect(source).not.toContain("sourceLabel}");
  });

  it("expone enlaces externos seguros para examinar incidencia y fuente oficial", () => {
    expect(source).toContain("Examinar aviso");
    expect(source).toContain("Abrir fuente oficial:");
    expect(source).toContain("Ver ejecución técnica en GitHub");
    expect(source.match(/rel="noopener noreferrer"/g)?.length).toBe(3);
    expect(source.match(/target="_blank"/g)?.length).toBe(3);
    expect(source).toContain("github.com");
    expect(source).toContain("sede.agenciatributaria.gob.es");
    expect(source).toContain("www.boe.es");
  });

  it("permite descartar un aviso revisado sin afirmar que borra la evidencia", () => {
    expect(source).toContain("Descartar aviso");
    expect(source).toContain("Guardando...");
    expect(source).toContain("reviewStoreAvailable");
    expect(source).toContain("reviewingIssueKey");
    expect(source).toContain(
      "Retira el aviso del panel sin borrar la evidencia oficial",
    );
    expect(source).toContain("el aviso seguirá");
    expect(source).toContain("visible para no perder la revisión pendiente");
    expect(source).not.toContain("Eliminar incidencia");
    expect(source).not.toContain("Marcar revisado");
  });

  it("explica el límite humano y que un día sin publicaciones es normal", () => {
    expect(source).toContain("nunca modifica automáticamente");
    expect(source).toContain("revisión humana");
    expect(source).toContain("no existan publicaciones nuevas");
    expect(source).toContain("no indica un fallo");
    expect(source).toContain("Avisos por revisar");
    expect(source).not.toContain("Cambios por revisar");
  });

  it("muestra las fichas candidatas sin afirmar que el modelo haya cambiado", () => {
    expect(source).toContain("Fichas candidatas a revisar");
    expect(source).toContain(
      "Modelos o formularios mencionados explícitamente",
    );
    expect(source).toContain("confirman por sí solas un cambio del modelo");
    expect(source).toContain("safeModelCodes");
    expect(source).toContain("MODEL_CODE_PATTERN");
  });

  it("es responsive, evita overflow y sanea los avisos", () => {
    expect(source).toContain("min-w-0 overflow-hidden");
    expect(source).toContain("grid-cols-1 gap-3 sm:grid-cols-3");
    expect(source).toContain("xl:grid-cols-2");
    expect(source).toContain("w-full");
    expect(source).toContain("sm:w-auto");
    expect(source).toContain("break-words");
    expect(source).toContain("SENSITIVE_NOTICE_PATTERN");
    expect(source).not.toMatch(/dangerouslySetInnerHTML|innerHTML\s*=/);
  });
});
