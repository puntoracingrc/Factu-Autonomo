function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function inline(markdown: string): string {
  let html = escapeHtml(markdown);

  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_match, text, href) => {
    const normalizedHref = href.startsWith("/vida-factura-electronica")
      ? href.replace(/\/$/, "")
      : href;
    return `<a href="${escapeHtml(normalizedHref)}">${inline(text)}</a>`;
  });
  html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/`([^`]+)`/g, "<code>$1</code>");
  html = html.replace(/\*([^*]+)\*/g, "<em>$1</em>");

  return html;
}

function renderTable(lines: string[]): string {
  const rows = lines
    .filter((line) => !/^\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?$/.test(line))
    .map((line) =>
      line
        .trim()
        .replace(/^\|/, "")
        .replace(/\|$/, "")
        .split("|")
        .map((cell) => cell.trim()),
    );

  if (rows.length === 0) return "";
  const [head, ...body] = rows;
  const headHtml = head
    .map((cell) => `<th scope="col">${inline(cell)}</th>`)
    .join("");
  const bodyHtml = body
    .map((row) => `<tr>${row.map((cell) => `<td>${inline(cell)}</td>`).join("")}</tr>`)
    .join("\n");

  return `<div class="vida-table-wrap" tabindex="0"><table><thead><tr>${headHtml}</tr></thead><tbody>${bodyHtml}</tbody></table></div>`;
}

function renderMetaStrip(items: string[]): string {
  const entries = items.map((item) => item.match(/^\*\*([^*]+):\*\*\s*(.+)$/));
  if (entries.some((entry) => !entry)) return "";

  const requiredLabels = ["Última revisión", "Estado", "Fecha clave"];
  const labels = entries.map((entry) => entry?.[1]);
  if (!requiredLabels.every((label) => labels.includes(label))) return "";

  const html = entries
    .map((entry) => {
      const label = entry?.[1] ?? "";
      const value = entry?.[2] ?? "";
      return `<div class="vida-meta-item"><dt>${escapeHtml(label)}</dt><dd>${inline(value)}</dd></div>`;
    })
    .join("");

  return `<dl class="vida-meta-strip">${html}</dl>`;
}

export function renderMarkdownToHtml(markdown: string): string {
  const lines = markdown.split("\n");
  const html: string[] = [];
  let paragraph: string[] = [];
  let list: { type: "ul" | "ol"; items: string[] } | null = null;
  let table: string[] = [];

  function flushParagraph() {
    if (paragraph.length) {
      html.push(`<p>${inline(paragraph.join(" "))}</p>`);
      paragraph = [];
    }
  }

  function flushList() {
    if (list) {
      const metaStrip = list.type === "ul" ? renderMetaStrip(list.items) : "";
      html.push(
        metaStrip ||
          `<${list.type}>${list.items
            .map((item) => `<li>${inline(item)}</li>`)
            .join("")}</${list.type}>`,
      );
      list = null;
    }
  }

  function flushTable() {
    if (table.length) {
      html.push(renderTable(table));
      table = [];
    }
  }

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();

    if (!line.trim()) {
      flushParagraph();
      flushList();
      flushTable();
      continue;
    }

    if (line.startsWith("|") && line.endsWith("|")) {
      flushParagraph();
      flushList();
      table.push(line);
      continue;
    }

    flushTable();

    const heading = line.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      flushParagraph();
      flushList();
      const level = heading[1].length;
      html.push(`<h${level}>${inline(heading[2])}</h${level}>`);
      continue;
    }

    const unordered = line.match(/^-\s+(.+)$/);
    if (unordered) {
      flushParagraph();
      if (!list || list.type !== "ul") {
        flushList();
        list = { type: "ul", items: [] };
      }
      list.items.push(unordered[1]);
      continue;
    }

    const ordered = line.match(/^\d+\.\s+(.+)$/);
    if (ordered) {
      flushParagraph();
      if (!list || list.type !== "ol") {
        flushList();
        list = { type: "ol", items: [] };
      }
      list.items.push(ordered[1]);
      continue;
    }

    const quote = line.match(/^>\s+(.+)$/);
    if (quote) {
      flushParagraph();
      flushList();
      html.push(`<blockquote>${inline(quote[1])}</blockquote>`);
      continue;
    }

    paragraph.push(line.trim());
  }

  flushParagraph();
  flushList();
  flushTable();

  return html.join("\n");
}
