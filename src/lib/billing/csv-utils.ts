export const CSV_DELIMITER = ";";

export function csvEscape(value: string | number): string {
  const text = String(value);
  if (/[";\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export function csvRow(values: (string | number)[]): string {
  return values.map(csvEscape).join(CSV_DELIMITER);
}

/** Formato decimal español para Excel (coma como separador). */
export function formatCsvAmount(amount: number): string {
  return amount.toFixed(2).replace(".", ",");
}

export function withUtf8Bom(content: string): string {
  return `\uFEFF${content}`;
}

export function downloadCsvFile(content: string, filename: string): void {
  const blob = new Blob([withUtf8Bom(content)], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function formatCsvExportDate(reference = new Date()): string {
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(reference);
}
