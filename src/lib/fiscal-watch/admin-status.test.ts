import { describe, expect, it } from "vitest";
import { buildFiscalWatchAdminStatus } from "./admin-status";

const NOW = new Date("2026-07-13T09:15:00.000Z");

function workflow(overrides: Record<string, unknown> = {}) {
  return {
    workflow_runs: [
      {
        id: 9001,
        status: "completed",
        conclusion: "success",
        updated_at: "2026-07-13T08:55:00.000Z",
        html_url:
          "https://github.com/puntoracingrc/Factu-Autonomo/actions/runs/9001",
        head_sha: "must-never-be-exposed",
        ...overrides,
      },
    ],
  };
}

function issue(
  number: number,
  label: "fiscal-watch:unreviewed" | "fiscal-watch:baseline",
  overrides: Record<string, unknown> = {},
) {
  const marker =
    label === "fiscal-watch:unreviewed"
      ? "<!-- fiscal-watch-change:v1:aeat-all-news-rss:0123456789abcdef0123456789abcdef -->"
      : "<!-- fiscal-watch-baseline:v1:official-fiscal-watch.2026-07-13.v2:fiscal-watch-parser.2026-07-13.v2 -->";
  return {
    number,
    state: "open",
    title: `Cambio oficial ${number}`,
    html_url: `https://github.com/puntoracingrc/Factu-Autonomo/issues/${number}`,
    created_at: "2026-07-13T08:58:00.000Z",
    updated_at: "2026-07-13T09:00:00.000Z",
    labels: [{ name: label }],
    user: { login: "github-actions[bot]", type: "Bot" },
    body:
      `${marker}\nFuente: https://www.boe.es/diario_boe/txt.php?id=BOE-A-2026-1\n` +
      "Dato interno que no debe exponerse: secret-body-value",
    ...overrides,
  };
}

function build(
  overrides: Partial<Parameters<typeof buildFiscalWatchAdminStatus>[0]> = {},
) {
  return buildFiscalWatchAdminStatus({
    workflowRuns: workflow(),
    unreviewedIssues: [],
    baselineIssues: [],
    now: NOW,
    ...overrides,
  });
}

describe("buildFiscalWatchAdminStatus", () => {
  it("marca verde una ejecución reciente sin publicaciones pendientes", () => {
    const status = build();

    expect(status).toMatchObject({
      level: "ok",
      label: "Al día",
      pendingReviews: 0,
      baselinePending: false,
      lastRunAt: "2026-07-13T08:55:00.000Z",
      workflowUrl:
        "https://github.com/puntoracingrc/Factu-Autonomo/actions/runs/9001",
      sourcesValid: true,
    });
    expect(status.headline).toContain("no hay cambios pendientes");
    expect(status.issues).toEqual([]);
    expect(status.signalId).toBe(
      "fiscal-watch:ok:run-9001:changes-none:baseline-none",
    );
  });

  it("marca ámbar los cambios y solo expone enlaces oficiales saneados", () => {
    const status = build({
      unreviewedIssues: [
        issue(42, "fiscal-watch:unreviewed", {
          title: "  Nueva\norden\ttributaria  ",
        }),
      ],
    });
    const serialized = JSON.stringify(status);

    expect(status.level).toBe("watch");
    expect(status.pendingReviews).toBe(1);
    expect(status.headline).toContain("un aviso oficial");
    expect(status.issues).toEqual([
      {
        number: 42,
        kind: "change",
        title: "Nueva orden tributaria",
        url: "https://github.com/puntoracingrc/Factu-Autonomo/issues/42",
        sourceLabel: "BOE",
        sourceUrl: "https://www.boe.es/diario_boe/txt.php?id=BOE-A-2026-1",
        detectedAt: "2026-07-13T08:58:00.000Z",
      },
    ]);
    expect(serialized).not.toContain("secret-body-value");
    expect(serialized).not.toContain("must-never-be-exposed");
  });

  it("marca ámbar una línea base pendiente sin confundirla con un cambio", () => {
    const status = build({
      baselineIssues: [issue(7, "fiscal-watch:baseline")],
    });

    expect(status.level).toBe("watch");
    expect(status.pendingReviews).toBe(0);
    expect(status.baselinePending).toBe(true);
    expect(status.issues[0]?.kind).toBe("baseline");
  });

  it.each([["failure"], ["cancelled"], ["timed_out"]])(
    "marca rojo una ejecución terminada con %s",
    (conclusion) => {
      const status = build({
        workflowRuns: workflow({ conclusion }),
      });

      expect(status.level).toBe("action");
      expect(status.headline).toContain("terminó con error");
    },
  );

  it("marca rojo cuando la última ejecución supera 36 horas", () => {
    const status = build({
      workflowRuns: workflow({ updated_at: "2026-07-11T20:00:00.000Z" }),
    });

    expect(status.level).toBe("action");
    expect(status.workflow.stale).toBe(true);
    expect(status.headline).toContain("más de 36 horas");
  });

  it("marca ámbar una ejecución reciente todavía en curso", () => {
    const status = build({
      workflowRuns: workflow({ status: "in_progress", conclusion: null }),
    });

    expect(status.level).toBe("watch");
    expect(status.workflow.status).toBe("in_progress");
    expect(status.headline).toContain("está en curso");
  });

  it.each([
    ["respuesta workflow ausente", null, [], []],
    ["workflow sin ejecuciones", { workflow_runs: [] }, [], []],
    [
      "URL workflow ajena",
      workflow({ html_url: "https://evil.example/actions/runs/9001" }),
      [],
      [],
    ],
    ["issues sin schema", workflow(), { items: [] }, []],
    [
      "issue sin etiqueta esperada",
      workflow(),
      [issue(4, "fiscal-watch:baseline")],
      [],
    ],
  ])(
    "falla cerrado en rojo ante %s",
    (_label, workflowRuns, unreviewedIssues, baselineIssues) => {
      const status = build({ workflowRuns, unreviewedIssues, baselineIssues });

      expect(status.level).toBe("action");
      expect(status.sourcesValid && status.workflow.id !== null).toBe(false);
    },
  );

  it("no publica URLs no oficiales contenidas en el cuerpo de una incidencia", () => {
    const status = build({
      unreviewedIssues: [
        issue(12, "fiscal-watch:unreviewed", {
          body:
            "<!-- fiscal-watch-change:v1:aeat-all-news-rss:0123456789abcdef0123456789abcdef -->\n" +
            "Fuente https://evil.example/phishing?token=secret",
        }),
      ],
    });

    expect(status.issues[0]).toMatchObject({
      sourceLabel: null,
      sourceUrl: null,
    });
    expect(JSON.stringify(status)).not.toContain("evil.example");
    expect(JSON.stringify(status)).not.toContain("secret");
  });

  it("rechaza avisos etiquetados que no proceden de la automatización", () => {
    const status = build({
      unreviewedIssues: [
        issue(14, "fiscal-watch:unreviewed", {
          user: { login: "collaborator", type: "User" },
        }),
      ],
    });

    expect(status.level).toBe("action");
    expect(status.sourcesValid).toBe(false);
    expect(status.issues).toEqual([]);
  });

  it("hace signalId estable frente a la hora de lectura y al orden de incidencias", () => {
    const first = build({
      unreviewedIssues: [
        issue(20, "fiscal-watch:unreviewed"),
        issue(10, "fiscal-watch:unreviewed"),
      ],
    });
    const second = buildFiscalWatchAdminStatus({
      workflowRuns: workflow(),
      unreviewedIssues: [
        issue(10, "fiscal-watch:unreviewed"),
        issue(20, "fiscal-watch:unreviewed"),
      ],
      baselineIssues: [],
      now: new Date("2026-07-13T09:20:00.000Z"),
    });

    expect(first.generatedAt).not.toBe(second.generatedAt);
    expect(first.signalId).toBe(second.signalId);
  });

  it("falla cerrado si la cola supera el máximo visible", () => {
    const status = build({
      unreviewedIssues: Array.from({ length: 21 }, (_, index) =>
        issue(index + 1, "fiscal-watch:unreviewed"),
      ),
    });

    expect(status.level).toBe("action");
    expect(status.sourcesValid).toBe(false);
    expect(status.pendingReviews).toBe(0);
  });
});
