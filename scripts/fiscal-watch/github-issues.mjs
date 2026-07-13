import { createHash } from "node:crypto";
import { gunzipSync, gzipSync } from "node:zlib";

import { FiscalWatchError, validateOfficialSourceUrl } from "./core.mjs";

const SOURCE_MARKER = "fiscal-watch-source-state:v1";
const CHANGE_MARKER = "fiscal-watch-change:v1";
const BASELINE_MARKER = "fiscal-watch-baseline:v1";
const STATE_BLOCK = /```fiscal-watch-state-v1\n([A-Za-z0-9_-]+)\n```/;
const MAX_ISSUE_BODY_CODE_POINTS = 60_000;
const MAX_GITHUB_RESPONSE_BYTES = 2 * 1024 * 1024;
const MAX_CHANGE_ISSUE_ITEMS = 20;
const MAX_CHANGES_PER_SOURCE_RUN = 500;
const MAX_ISSUE_PAGES_PER_LABEL = 20;
const LABELS = Object.freeze([
  { name: "fiscal-watch:state", color: "6e7781", description: "Estado técnico del monitor fiscal" },
  { name: "fiscal-watch:unreviewed", color: "d4a72c", description: "Cambio oficial pendiente de revisión humana" },
  { name: "fiscal-watch:baseline", color: "0969da", description: "Línea base pendiente de revisión humana" },
]);

function codePoints(value, maximum) {
  return Array.from(value).slice(0, maximum).join("");
}

export function sanitizeMarkdownText(value, maximum = 500) {
  return codePoints(String(value ?? ""), maximum)
    .normalize("NFC")
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, " ")
    .replace(/\r\n?/g, "\n")
    .replace(/@/g, "@\u200b")
    .replace(/([\\`*_{}\[\]()#+.!|<>~-])/g, "\\$1")
    .replace(/[ \t]+/g, " ")
    .trim();
}

function officialMarkdownUrl(value, kind) {
  return validateOfficialSourceUrl(value, kind).href;
}

function sourceMarker(sourceId) {
  return `<!-- ${SOURCE_MARKER}:${sourceId} -->`;
}

function changeMarker(sourceId, fingerprint) {
  return `<!-- ${CHANGE_MARKER}:${sourceId}:${fingerprint} -->`;
}

export function encodeSourceState(state) {
  const compressed = gzipSync(Buffer.from(JSON.stringify(state), "utf8"), {
    level: 9,
    mtime: 0,
  }).toString("base64url");
  if (compressed.length > 48_000) {
    throw new FiscalWatchError(
      "STATE_TOO_LARGE",
      "El estado técnico no cabe en el Issue cerrado.",
    );
  }
  return compressed;
}

export function decodeSourceState(body) {
  const encoded = STATE_BLOCK.exec(String(body ?? ""))?.[1];
  if (!encoded) return null;
  try {
    const raw = gunzipSync(Buffer.from(encoded, "base64url"), {
      maxOutputLength: 2 * 1024 * 1024,
    }).toString("utf8");
    const value = JSON.parse(raw);
    if (
      !value ||
      value.schemaVersion !== "fiscal-watch-source-state.v1" ||
      typeof value.sourceId !== "string"
    ) {
      return null;
    }
    return value;
  } catch {
    return null;
  }
}

export function createChangeFingerprint(sourceId, changes) {
  const canonical = [...changes]
    .map((change) => [
      change.type,
      change.key,
      change.beforeDigest ?? null,
      change.afterDigest ?? null,
    ])
    .sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right)));
  return createHash("sha256")
    .update(JSON.stringify([sourceId, canonical]))
    .digest("hex")
    .slice(0, 32);
}

export function buildSourceStateIssue(result) {
  const sourceId = result.sourceId;
  const state = encodeSourceState(result.state);
  const body = [
    sourceMarker(sourceId),
    "## Estado técnico del monitor fiscal",
    "",
    `- Fuente: ${sanitizeMarkdownText(result.label, 160)}`,
    `- Estado: \`${result.status}\``,
    `- Última comprobación: \`${result.state.lastCheckedAt}\``,
    `- Entradas observadas: ${Number(result.itemCount)}`,
    "",
    "Este Issue cerrado conserva solo estado técnico para comparar capturas. No valida vigencia, aplicabilidad, plazos ni modelos y nunca modifica reglas fiscales.",
    "",
    "```fiscal-watch-state-v1",
    state,
    "```",
  ].join("\n");
  if (Array.from(body).length > MAX_ISSUE_BODY_CODE_POINTS) {
    throw new FiscalWatchError("STATE_TOO_LARGE", "Issue de estado fuera de límites.");
  }
  return {
    title: `[Fiscal Watch · estado] ${sanitizeMarkdownText(result.label, 120)}`,
    body,
    labels: ["fiscal-watch:state"],
    state: "closed",
  };
}

const CHANGE_LABELS = Object.freeze({
  ADDED: "Entrada nueva o reintroducida",
  REAPPEARED: "Entrada reintroducida",
  CONTENT_CHANGED: "Contenido modificado",
  NO_LONGER_PRESENT: "Ya no aparece en dos capturas completas",
  SOURCE_CONTENT_CHANGED: "La captura de la fuente cambió",
});

function evidenceLine(label, evidence) {
  if (!evidence) return `  - ${label}: sin contenido.`;
  const date = evidence.effectiveDate
    ? `; fecha \`${sanitizeMarkdownText(evidence.effectiveDate, 10)}\``
    : "";
  const title = sanitizeMarkdownText(evidence.title, 240);
  const excerpt = sanitizeMarkdownText(evidence.excerpt, 600).replace(/\n/g, " ");
  return `  - ${label}: ${title}${date}${excerpt ? ` — “${excerpt}”` : ""}`;
}

function buildChangeIssueChunk(result, checkedAt, changes, chunkIndex, chunkCount) {
  const fingerprint = createChangeFingerprint(result.sourceId, changes);
  const rows = changes.map((change) => {
    const label = CHANGE_LABELS[change.type] ?? "Cambio técnico detectado";
    const title = sanitizeMarkdownText(change.title, 240);
    const url = officialMarkdownUrl(
      change.officialUrl,
      change.officialUrlKind === "page" ? "page" : "item",
    );
    return [
      `- **${label}:** ${title} — [examinar fuente oficial](<${url}>)`,
      evidenceLine("Antes", change.before),
      evidenceLine("Después", change.after),
    ].join("\n");
  });
  const body = [
    changeMarker(result.sourceId, fingerprint),
    "## Cambios oficiales pendientes de revisión humana",
    "",
    `Fuente monitorizada: [${sanitizeMarkdownText(result.label, 160)}](<${officialMarkdownUrl(result.officialPageUrl, "page")}>)`,
    `Detectado: \`${checkedAt}\``,
    "",
    ...rows,
    "",
    "> Detección mecánica, no interpretación jurídica. No confirma vigencia, aplicabilidad, fechas, modelos afectados ni obligaciones. Una persona debe revisar la fuente oficial antes de cambiar Calendar, Modelos o cálculos fiscales.",
  ].join("\n");
  if (Array.from(body).length > MAX_ISSUE_BODY_CODE_POINTS) {
    throw new FiscalWatchError("CHANGE_ISSUE_TOO_LARGE", "Issue de cambios fuera de límites.");
  }
  return {
    title: `[Fiscal Watch] ${sanitizeMarkdownText(result.label, 100)} — revisión pendiente${chunkCount > 1 ? ` (${chunkIndex + 1}/${chunkCount})` : ""}`,
    body,
    labels: ["fiscal-watch:unreviewed"],
    state: "open",
    fingerprint,
  };
}

export function buildChangeIssues(result, checkedAt) {
  if (!result.changes.length) return [];
  if (result.changes.length > MAX_CHANGES_PER_SOURCE_RUN) {
    throw new FiscalWatchError(
      "TOO_MANY_CHANGES",
      "El lote de cambios supera el límite revisable.",
    );
  }
  const chunkCount = Math.ceil(result.changes.length / MAX_CHANGE_ISSUE_ITEMS);
  return Array.from({ length: chunkCount }, (_value, chunkIndex) =>
    buildChangeIssueChunk(
      result,
      checkedAt,
      result.changes.slice(
        chunkIndex * MAX_CHANGE_ISSUE_ITEMS,
        (chunkIndex + 1) * MAX_CHANGE_ISSUE_ITEMS,
      ),
      chunkIndex,
      chunkCount,
    ),
  );
}

export function buildChangeIssue(result, checkedAt) {
  return buildChangeIssues(result, checkedAt)[0] ?? null;
}

function validateRepository(value) {
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(value ?? "")) {
    throw new FiscalWatchError("INVALID_REPOSITORY", "Repositorio GitHub no válido.");
  }
  return value;
}

async function readGithubJson(response) {
  const type = response.headers.get("content-type")?.split(";", 1)[0]?.toLowerCase();
  if (type !== "application/json" && type !== "application/vnd.github+json") {
    throw new FiscalWatchError("GITHUB_INVALID_RESPONSE", "MIME GitHub inesperado.");
  }
  const contentLength = response.headers.get("content-length");
  if (contentLength && (!/^\d+$/.test(contentLength) || Number(contentLength) > MAX_GITHUB_RESPONSE_BYTES)) {
    await response.body?.cancel();
    throw new FiscalWatchError("GITHUB_INVALID_RESPONSE", "Respuesta GitHub excesiva.");
  }
  if (!response.body) throw new FiscalWatchError("GITHUB_INVALID_RESPONSE");
  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8", { fatal: true });
  const chunks = [];
  let bytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > MAX_GITHUB_RESPONSE_BYTES) {
        await reader.cancel();
        throw new FiscalWatchError("GITHUB_INVALID_RESPONSE", "Respuesta GitHub excesiva.");
      }
      chunks.push(decoder.decode(value, { stream: true }));
    }
    chunks.push(decoder.decode());
    return JSON.parse(chunks.join(""));
  } catch (error) {
    if (error instanceof FiscalWatchError) throw error;
    throw new FiscalWatchError("GITHUB_INVALID_RESPONSE", "JSON GitHub inválido.");
  } finally {
    try {
      reader.releaseLock();
    } catch {
      // reader cancelado
    }
  }
}

export function createGithubIssuesClient({ token, repository, fetchImpl = fetch }) {
  if (typeof token !== "string" || token.length < 10 || /[\r\n]/.test(token)) {
    throw new FiscalWatchError("MISSING_GITHUB_TOKEN", "Token GitHub ausente.");
  }
  const repo = validateRepository(repository);
  async function request(method, path, body, allowedStatuses = []) {
    if (!/^\/(?:issues|labels)(?:\/|\?|$)/.test(path)) {
      throw new FiscalWatchError("GITHUB_PATH_BLOCKED", "Ruta GitHub no permitida.");
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8_000);
    try {
      const response = await fetchImpl(`https://api.github.com/repos/${repo}${path}`, {
        method,
        redirect: "error",
        signal: controller.signal,
        headers: {
          Accept: "application/vnd.github+json",
          Authorization: `Bearer ${token}`,
          "User-Agent": "FactuAutonomo-FiscalWatch/1.0",
          "X-GitHub-Api-Version": "2022-11-28",
          ...(body === undefined ? {} : { "Content-Type": "application/json" }),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      if (response.redirected) throw new FiscalWatchError("GITHUB_REDIRECT_BLOCKED");
      if (!response.ok && !allowedStatuses.includes(response.status)) {
        await response.body?.cancel();
        throw new FiscalWatchError("GITHUB_HTTP_FAILURE", `GitHub HTTP ${response.status}.`);
      }
      if (response.status === 204 || allowedStatuses.includes(response.status) && !response.ok) {
        await response.body?.cancel();
        return { status: response.status, data: null };
      }
      return { status: response.status, data: await readGithubJson(response) };
    } catch (error) {
      if (error instanceof FiscalWatchError) throw error;
      throw new FiscalWatchError(
        controller.signal.aborted ? "GITHUB_TIMEOUT" : "GITHUB_NETWORK_FAILURE",
        "GitHub no disponible.",
      );
    } finally {
      clearTimeout(timer);
    }
  }
  return Object.freeze({
    async listIssues() {
      const contracts = [
        { label: "fiscal-watch:state", state: "all" },
        { label: "fiscal-watch:baseline", state: "all" },
        { label: "fiscal-watch:unreviewed", state: "open" },
      ];
      const byNumber = new Map();
      for (const contract of contracts) {
        let exhausted = false;
        for (let page = 1; page <= MAX_ISSUE_PAGES_PER_LABEL; page += 1) {
          const { data } = await request(
            "GET",
            `/issues?state=${contract.state}&labels=${encodeURIComponent(contract.label)}&per_page=100&page=${page}`,
          );
          if (!Array.isArray(data)) {
            throw new FiscalWatchError("GITHUB_INVALID_RESPONSE", "Listado GitHub inválido.");
          }
          for (const issue of data) {
            if (!issue.pull_request && Number.isInteger(issue.number)) byNumber.set(issue.number, issue);
          }
          if (data.length < 100) {
            exhausted = true;
            break;
          }
        }
        if (!exhausted) {
          throw new FiscalWatchError(
            "GITHUB_ISSUE_SCAN_LIMIT",
            "El listado de Issues supera el límite seguro.",
          );
        }
      }
      return [...byNumber.values()];
    },
    async ensureLabel(label) {
      return request("POST", "/labels", label, [422]);
    },
    async createIssue(issue) {
      return (await request("POST", "/issues", issue)).data;
    },
    async updateIssue(number, issue) {
      if (!Number.isInteger(number) || number < 1) throw new FiscalWatchError("INVALID_ISSUE");
      return (await request("PATCH", `/issues/${number}`, issue)).data;
    },
  });
}

function labelsOf(issue) {
  return new Set((issue.labels ?? []).map((label) => (typeof label === "string" ? label : label.name)));
}

function hasExactFiscalWatchLabel(labels, expected) {
  const contractLabels = [
    "fiscal-watch:state",
    "fiscal-watch:baseline",
    "fiscal-watch:unreviewed",
  ];
  return contractLabels.filter((label) => labels.has(label)).length === 1 && labels.has(expected);
}

function trustedAutomationAuthor(issue) {
  return issue?.user?.login === "github-actions[bot]" && issue?.user?.type === "Bot";
}

function exactKeys(value, required, optional = []) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const allowed = new Set([...required, ...optional]);
  const keys = Object.keys(value);
  return required.every((key) => keys.includes(key)) && keys.every((key) => allowed.has(key));
}

function validIsoInstant(value, nullable = false) {
  if (nullable && value === null) return true;
  return (
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value) &&
    Number.isFinite(Date.parse(value))
  );
}

function validOfficialStoredUrl(value) {
  if (typeof value !== "string" || value.length > 2_048) return false;
  try {
    validateOfficialSourceUrl(value, "item");
    return true;
  } catch {
    try {
      validateOfficialSourceUrl(value, "page");
      return true;
    } catch {
      return false;
    }
  }
}

function validDateOnly(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value ?? "");
  if (!match) return false;
  const [year, month, day] = match.slice(1).map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() + 1 === month &&
    date.getUTCDate() === day
  );
}

function validTrackedItem(item) {
  if (
    !exactKeys(
      item,
      [
        "key",
        "title",
        "officialUrl",
        "publishedAt",
        "effectiveDate",
        "excerpt",
        "digest",
        "missingChecks",
      ],
    ) ||
    typeof item.key !== "string" ||
    item.key.length < 1 ||
    item.key.length > 512 ||
    typeof item.title !== "string" ||
    item.title.length < 1 ||
    item.title.length > 500 ||
    !validOfficialStoredUrl(item.officialUrl) ||
    !(item.publishedAt === null || (typeof item.publishedAt === "string" && item.publishedAt.length <= 80)) ||
    !(
      item.effectiveDate === null ||
      (typeof item.effectiveDate === "string" && validDateOnly(item.effectiveDate))
    ) ||
    typeof item.excerpt !== "string" ||
    Array.from(item.excerpt).length > 600 ||
    !/^[a-f0-9]{64}$/.test(item.digest ?? "") ||
    !Number.isInteger(item.missingChecks) ||
    item.missingChecks < 0 ||
    item.missingChecks > 2
  ) {
    return false;
  }
  return true;
}

function validatePersistedSourceState(value, source, catalog) {
  const limits = catalog.limits;
  if (
    !exactKeys(
      value,
      [
        "schemaVersion",
        "sourceId",
        "mode",
        "catalogVersion",
        "parserContractVersion",
        "status",
        "initializedAt",
        "lastCheckedAt",
        "lastSuccessAt",
        "snapshot",
      ],
      ["failure"],
    ) ||
    value.schemaVersion !== "fiscal-watch-source-state.v1" ||
    value.sourceId !== source.id ||
    value.mode !== source.mode ||
    value.catalogVersion !== catalog.catalogVersion ||
    value.parserContractVersion !== catalog.parserContractVersion ||
    !["BASELINE_REVIEW_REQUIRED", "PENDING_REVIEW", "HEALTHY", "DEGRADED"].includes(
      value.status,
    ) ||
    !validIsoInstant(value.initializedAt) ||
    !validIsoInstant(value.lastCheckedAt) ||
    !validIsoInstant(value.lastSuccessAt, true) ||
    (value.status === "DEGRADED") !== (value.failure !== undefined) ||
    (value.status !== "DEGRADED" && value.lastSuccessAt === null)
  ) {
    return null;
  }
  if (
    value.failure !== undefined &&
    (!exactKeys(value.failure, ["code"]) ||
      typeof value.failure.code !== "string" ||
      !/^[A-Z][A-Z0-9_]{1,63}$/.test(value.failure.code))
  ) {
    return null;
  }
  if (value.snapshot === null) {
    return value.status === "DEGRADED" && value.failure !== undefined ? value : null;
  }
  if (
    !exactKeys(value.snapshot, ["semanticHash", "itemCount", "tracking", "items"]) ||
    !/^[a-f0-9]{64}$/.test(value.snapshot.semanticHash ?? "") ||
    !Number.isInteger(value.snapshot.itemCount) ||
    value.snapshot.itemCount < 0 ||
    value.snapshot.itemCount > limits.maxItemsPerSource ||
    !["ITEMS", "AGGREGATE"].includes(value.snapshot.tracking) ||
    !Array.isArray(value.snapshot.items) ||
    value.snapshot.items.length > limits.maxTrackedItems ||
    value.snapshot.items.some((item) => !validTrackedItem(item)) ||
    new Set(value.snapshot.items.map((item) => item.key)).size !== value.snapshot.items.length ||
    (value.snapshot.tracking === "AGGREGATE" && value.snapshot.items.length !== 0) ||
    (value.snapshot.tracking === "ITEMS" &&
      value.snapshot.items.filter((item) => item.missingChecks === 0).length !==
        value.snapshot.itemCount)
  ) {
    return null;
  }
  return value;
}

export function inspectExistingFiscalWatchIssues(issues, catalog) {
  const sourceById = new Map(catalog.sources.map((source) => [source.id, source]));
  const sourceIds = new Set(sourceById.keys());
  const previousStates = new Map();
  const baselineAcceptedSourceIds = new Set();
  const openReviewSourceIds = new Set();
  const sourceIssues = new Map();
  const changeFingerprints = new Set();
  let baselineIssue = null;
  for (const issue of issues) {
    if (
      !issue ||
      typeof issue.body !== "string" ||
      !Number.isInteger(issue.number) ||
      !trustedAutomationAuthor(issue)
    ) {
      continue;
    }
    const issueLabels = labelsOf(issue);
    const sourceMatches = [
      ...issue.body.matchAll(new RegExp(`<!-- ${SOURCE_MARKER}:([a-z0-9-]+) -->`, "g")),
    ];
    const changeMatches = [
      ...issue.body.matchAll(
        new RegExp(`<!-- ${CHANGE_MARKER}:([a-z0-9-]+):([a-f0-9]{32}) -->`, "g"),
      ),
    ];
    const baselineMatches = [
      ...issue.body.matchAll(
        new RegExp(
          `<!-- ${BASELINE_MARKER}:([A-Za-z0-9._-]+):([A-Za-z0-9._-]+) -->`,
          "g",
        ),
      ),
    ];
    if (sourceMatches.length + changeMatches.length + baselineMatches.length !== 1) continue;
    const sourceMatch = sourceMatches[0] ?? null;
    const changeMatch = changeMatches[0] ?? null;
    const baselineMatch = baselineMatches[0] ?? null;

    if (
      sourceMatch &&
      sourceIds.has(sourceMatch[1]) &&
      issue.state === "closed" &&
      hasExactFiscalWatchLabel(issueLabels, "fiscal-watch:state")
    ) {
      const decoded = decodeSourceState(issue.body);
      const state = validatePersistedSourceState(
        decoded,
        sourceById.get(sourceMatch[1]),
        catalog,
      );
      if (!state) continue;
      if (!sourceIssues.has(sourceMatch[1])) sourceIssues.set(sourceMatch[1], issue);
      if (state.snapshot) previousStates.set(state.sourceId, state);
      continue;
    }
    if (
      changeMatch &&
      sourceIds.has(changeMatch[1]) &&
      issue.state === "open" &&
      hasExactFiscalWatchLabel(issueLabels, "fiscal-watch:unreviewed")
    ) {
      changeFingerprints.add(changeMatch[2]);
      openReviewSourceIds.add(changeMatch[1]);
      continue;
    }
    if (
      baselineMatch?.[1] === catalog.catalogVersion &&
      baselineMatch?.[2] === catalog.parserContractVersion &&
      hasExactFiscalWatchLabel(issueLabels, "fiscal-watch:baseline") &&
      ["open", "closed"].includes(issue.state) &&
      !baselineIssue
    ) {
      baselineIssue = issue;
    }
  }
  if (baselineIssue?.state === "closed") {
    for (const sourceId of sourceIds) baselineAcceptedSourceIds.add(sourceId);
  }
  return {
    previousStates,
    baselineAcceptedSourceIds,
    openReviewSourceIds,
    sourceIssues,
    changeFingerprints,
    baselineIssue,
  };
}

export function buildBaselineIssue(run) {
  if (
    !/^[A-Za-z0-9._-]+$/.test(run.catalogVersion ?? "") ||
    !/^[A-Za-z0-9._-]+$/.test(run.parserContractVersion ?? "")
  ) {
    throw new FiscalWatchError("INVALID_CATALOG_VERSION", "Versión de catálogo no válida.");
  }
  const sources = run.results.map((result) => {
    const hash = result.state.snapshot?.semanticHash?.slice(0, 12) ?? "sin-captura";
    return `- ${sanitizeMarkdownText(result.label, 140)} — \`${result.status}\` — ${Number(result.itemCount)} entradas — huella \`${hash}\``;
  });
  return {
    title: "[Fiscal Watch] Revisar la primera línea base oficial",
    body: [
      `<!-- ${BASELINE_MARKER}:${run.catalogVersion}:${run.parserContractVersion} -->`,
      "## Primera línea base pendiente de revisión",
      "",
      "Se ha guardado la primera captura de cada fuente sin crear alertas masivas por sus entradas actuales.",
      "Cierra este Issue solo después de comprobar que las fuentes y conteos son razonables. Cerrarlo habilita las comparaciones diarias posteriores.",
      "",
      ...sources,
      "",
      "> Esta revisión no valida normativa ni modifica Calendar, Modelos o cálculos fiscales.",
    ].join("\n"),
    labels: ["fiscal-watch:baseline"],
  };
}

export async function publishFiscalWatchIssues(client, run, existingContext) {
  for (const label of LABELS) await client.ensureLabel(label);
  let createdChanges = 0;
  for (const result of run.results) {
    for (const changeDraft of buildChangeIssues(result, run.checkedAt)) {
      if (!existingContext.changeFingerprints.has(changeDraft.fingerprint)) {
        await client.createIssue({
          title: changeDraft.title,
          body: changeDraft.body,
          labels: changeDraft.labels,
        });
        createdChanges += 1;
      }
    }
    const draft = buildSourceStateIssue(result);
    const existing = existingContext.sourceIssues.get(result.sourceId);
    if (existing) {
      await client.updateIssue(existing.number, draft);
    } else {
      const created = await client.createIssue({ ...draft, state: undefined });
      await client.updateIssue(created.number, { state: "closed" });
    }
  }
  if (
    !existingContext.baselineIssue &&
    run.degradedCount === 0 &&
    run.results.some((result) => result.status === "BASELINE_REVIEW_REQUIRED")
  ) {
    await client.createIssue(buildBaselineIssue(run));
  }
  return { createdChanges, updatedSources: run.results.length };
}

export const __test = Object.freeze({
  CHANGE_MARKER,
  BASELINE_MARKER,
  SOURCE_MARKER,
  labelsOf,
});
