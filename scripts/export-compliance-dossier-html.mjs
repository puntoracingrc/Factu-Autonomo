import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(new URL("../", import.meta.url).pathname);
const sourcePath = "docs/compliance-evidence-v1.md";
const metadataPath = "docs/audit/compliance-dossier-snapshot-metadata-v1.json";
const defaultOutputPath = "docs/audit/exports/compliance-evidence-v1-snapshot.html";
const outputPath = process.argv[2] || defaultOutputPath;
const banner = "Evidencia técnica interna / No certificación / No cumplimiento productivo";

function absolute(relativePath) {
  return path.join(root, relativePath);
}

function read(relativePath) {
  return fs.readFileSync(absolute(relativePath), "utf8");
}

function safeExec(command, args) {
  try {
    return execFileSync(command, args, {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return "unavailable";
  }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function renderInline(value) {
  return escapeHtml(value).replace(/`([^`]+)`/g, "<code>$1</code>");
}

function isTableDivider(line) {
  return /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(line);
}

function splitTableRow(line) {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => renderInline(cell.trim()));
}

function flushParagraph(paragraph, output) {
  if (paragraph.length === 0) return;
  output.push(`<p>${renderInline(paragraph.join(" "))}</p>`);
  paragraph.length = 0;
}

function flushList(listItems, output) {
  if (listItems.length === 0) return;
  output.push("<ul>");
  for (const item of listItems) output.push(`<li>${renderInline(item)}</li>`);
  output.push("</ul>");
  listItems.length = 0;
}

function renderMarkdown(markdown) {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const output = [];
  const paragraph = [];
  const listItems = [];
  let inCode = false;
  let codeLines = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const trimmed = line.trim();

    if (trimmed.startsWith("```")) {
      flushParagraph(paragraph, output);
      flushList(listItems, output);
      if (inCode) {
        output.push(`<pre><code>${escapeHtml(codeLines.join("\n"))}</code></pre>`);
        codeLines = [];
        inCode = false;
      } else {
        inCode = true;
      }
      continue;
    }

    if (inCode) {
      codeLines.push(line);
      continue;
    }

    if (trimmed === "") {
      flushParagraph(paragraph, output);
      flushList(listItems, output);
      continue;
    }

    if (trimmed.includes("|") && lines[index + 1] && isTableDivider(lines[index + 1])) {
      flushParagraph(paragraph, output);
      flushList(listItems, output);
      const headers = splitTableRow(trimmed);
      index += 2;
      const rows = [];
      while (index < lines.length && lines[index].trim().includes("|")) {
        rows.push(splitTableRow(lines[index]));
        index += 1;
      }
      index -= 1;
      output.push("<table>");
      output.push(`<thead><tr>${headers.map((cell) => `<th>${cell}</th>`).join("")}</tr></thead>`);
      output.push("<tbody>");
      for (const row of rows) {
        output.push(`<tr>${row.map((cell) => `<td>${cell}</td>`).join("")}</tr>`);
      }
      output.push("</tbody></table>");
      continue;
    }

    const heading = /^(#{1,6})\s+(.+)$/.exec(trimmed);
    if (heading) {
      flushParagraph(paragraph, output);
      flushList(listItems, output);
      const level = heading[1].length;
      output.push(`<h${level}>${renderInline(heading[2])}</h${level}>`);
      continue;
    }

    const list = /^[-*]\s+(.+)$/.exec(trimmed);
    if (list) {
      flushParagraph(paragraph, output);
      listItems.push(list[1]);
      continue;
    }

    paragraph.push(trimmed);
  }

  flushParagraph(paragraph, output);
  flushList(listItems, output);
  if (inCode) output.push(`<pre><code>${escapeHtml(codeLines.join("\n"))}</code></pre>`);
  return output.join("\n");
}

const markdown = read(sourcePath);
const metadata = JSON.parse(read(metadataPath));
const generatedAt = new Date().toISOString();
const sourceCommit = safeExec("git", ["rev-parse", "HEAD"]);
const workingTreeStatus = safeExec("git", ["status", "--short"]) || "clean";

const html = `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Factura Autónomo - compliance dossier snapshot</title>
  <style>
    @page { size: A4; margin: 18mm; }
    :root { color-scheme: light; }
    body {
      margin: 0;
      color: #17202a;
      background: #ffffff;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      font-size: 12px;
      line-height: 1.55;
    }
    main { max-width: 1040px; margin: 0 auto; padding: 28px; }
    .banner {
      border: 2px solid #7a1f1f;
      background: #fff4f2;
      color: #631515;
      font-weight: 700;
      padding: 12px 14px;
      margin-bottom: 18px;
    }
    .metadata {
      border: 1px solid #cfd7df;
      background: #f8fafc;
      padding: 12px 14px;
      margin-bottom: 24px;
    }
    .metadata dl {
      display: grid;
      grid-template-columns: minmax(150px, 220px) 1fr;
      gap: 6px 12px;
      margin: 0;
    }
    .metadata dt { font-weight: 700; }
    .metadata dd { margin: 0; overflow-wrap: anywhere; }
    h1, h2, h3, h4, h5, h6 { line-height: 1.25; page-break-after: avoid; }
    h1 { font-size: 24px; margin: 0 0 18px; }
    h2 { font-size: 18px; margin: 26px 0 10px; border-bottom: 1px solid #d7dee7; padding-bottom: 5px; }
    h3 { font-size: 15px; margin: 20px 0 8px; }
    p { margin: 0 0 10px; }
    ul { margin: 0 0 12px 22px; padding: 0; }
    li { margin: 0 0 4px; }
    table { width: 100%; border-collapse: collapse; margin: 12px 0 18px; page-break-inside: auto; }
    th, td { border: 1px solid #d7dee7; padding: 6px 8px; vertical-align: top; overflow-wrap: anywhere; }
    th { background: #eef3f7; text-align: left; }
    tr { page-break-inside: avoid; }
    code {
      font-family: ui-monospace, "SFMono-Regular", Consolas, monospace;
      font-size: 0.92em;
      background: #f1f5f9;
      padding: 1px 4px;
      border-radius: 3px;
    }
    pre {
      white-space: pre-wrap;
      border: 1px solid #d7dee7;
      background: #f8fafc;
      padding: 10px;
      page-break-inside: avoid;
    }
    @media print {
      main { max-width: none; padding: 0; }
      .banner, .metadata { break-inside: avoid; }
    }
  </style>
</head>
<body>
  <main>
    <div class="banner">${escapeHtml(banner)}</div>
    <section class="metadata" aria-label="Snapshot metadata">
      <dl>
        <dt>Snapshot version</dt><dd>${escapeHtml(metadata.snapshotVersion)}</dd>
        <dt>Source document</dt><dd>${escapeHtml(metadata.sourceDocument)}</dd>
        <dt>Generated from</dt><dd>${escapeHtml(metadata.generatedFrom)}</dd>
        <dt>Product</dt><dd>${escapeHtml(metadata.product)}</dd>
        <dt>Status</dt><dd>${escapeHtml(metadata.status)}</dd>
        <dt>Generated at</dt><dd>${escapeHtml(generatedAt)}</dd>
        <dt>Source commit</dt><dd>${escapeHtml(sourceCommit)}</dd>
        <dt>Working tree</dt><dd>${escapeHtml(workingTreeStatus === "clean" ? "clean" : "contains local changes")}</dd>
        <dt>Limits</dt><dd>${escapeHtml(metadata.limits.join(", "))}</dd>
      </dl>
    </section>
    ${renderMarkdown(markdown)}
  </main>
</body>
</html>
`;

fs.mkdirSync(path.dirname(absolute(outputPath)), { recursive: true });
fs.writeFileSync(absolute(outputPath), html);
console.log(`Compliance dossier HTML snapshot written to ${outputPath}`);
