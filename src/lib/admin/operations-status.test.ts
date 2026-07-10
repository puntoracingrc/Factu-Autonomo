import { describe, expect, it } from "vitest";
import { buildAdminOperationsStatus } from "./operations-status";

const sha = "a".repeat(40);

function healthyInput() {
  return {
    githubCommit: {
      sha,
      commit: { committer: { date: "2026-07-10T17:00:00.000Z" } },
    },
    githubRuns: {
      workflow_runs: [
        {
          id: 10,
          name: "CI",
          status: "completed",
          conclusion: "success",
          head_sha: sha,
          updated_at: "2026-07-10T17:05:00.000Z",
          html_url: "https://github.com/example/actions/runs/10",
        },
        {
          id: 11,
          name: "CodeQL",
          status: "completed",
          conclusion: "success",
          head_sha: sha,
          updated_at: "2026-07-10T17:04:00.000Z",
          html_url: "https://github.com/example/actions/runs/11",
        },
      ],
    },
    vercelAlias: { deploymentId: "dpl_current" },
    vercelDeployments: {
      deployments: [
        {
          uid: "dpl_current",
          createdAt: 1_783_704_000_000,
          meta: { githubCommitSha: sha, githubCommitRef: "main" },
        },
      ],
    },
    vercelFirewallConfig: {
      firewallEnabled: true,
      managedRules: {
        bot_protection: { active: true, action: "log" },
        ai_bots: { active: true, action: "log" },
      },
    },
    vercelFirewallEvents: { actions: [] as Array<Record<string, unknown>> },
    domain: "facturacion-autonomos.app",
    now: new Date("2026-07-10T17:10:00.000Z"),
  };
}

describe("admin operations status", () => {
  it("marca produccion alineada cuando main, CI, alias y deployment coinciden", () => {
    const status = buildAdminOperationsStatus(healthyInput());

    expect(status.level).toBe("ok");
    expect(status.deployment.alignedWithMain).toBe(true);
    expect(status.deployment.domainPointsToLatest).toBe(true);
    expect(status.firewall.botProtection).toBe("log");
  });

  it("marca rojo si el dominio queda en un deployment anterior tras CI verde", () => {
    const input = healthyInput();
    input.vercelAlias = { deploymentId: "dpl_old" };
    input.vercelDeployments.deployments.push({
      uid: "dpl_old",
      createdAt: 1_783_703_000_000,
      meta: { githubCommitSha: "b".repeat(40), githubCommitRef: "main" },
    });

    const status = buildAdminOperationsStatus(input);

    expect(status.level).toBe("action");
    expect(status.deployment.level).toBe("action");
    expect(status.recommendations.join(" ")).toContain("Production Domain");
  });

  it("agrega eventos WAF sin exponer las direcciones IP de origen", () => {
    const input = healthyInput();
    input.vercelFirewallEvents = {
      actions: [
        {
          action_type: "bot_protection",
          host: "facturacion-autonomos.app",
          public_ip: "203.0.113.10",
          count: 600,
          endTime: "2026-07-10T17:08:00.000Z",
        },
      ],
    };

    const status = buildAdminOperationsStatus(input);

    expect(status.firewall.level).toBe("watch");
    expect(status.firewall.events24h).toBe(600);
    expect(JSON.stringify(status)).not.toContain("203.0.113.10");
  });

  it("marca rojo cuando falla el CI de main", () => {
    const input = healthyInput();
    input.githubRuns.workflow_runs[0].conclusion = "failure";

    const status = buildAdminOperationsStatus(input);

    expect(status.github.level).toBe("action");
    expect(status.level).toBe("action");
  });

  it("no crea una alerta permanente si el run semanal de CodeQL queda fuera de la ventana", () => {
    const input = healthyInput();
    input.githubRuns.workflow_runs = input.githubRuns.workflow_runs.filter(
      (run) => run.name !== "CodeQL",
    );

    const status = buildAdminOperationsStatus(input);

    expect(status.github.codeql).toBeNull();
    expect(status.level).toBe("ok");
  });
});
