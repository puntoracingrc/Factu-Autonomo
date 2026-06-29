const MONTH_LABEL_FORMATTER = new Intl.DateTimeFormat("es-ES", {
  month: "long",
  year: "numeric",
});

export function timelineMonthKey(date: string): string {
  const [year = "", month = ""] = date.split("-");
  return `${year}-${month}`;
}

export function formatTimelineMonthLabel(date: string): string {
  const [year = "", month = ""] = date.split("-");
  const parsedYear = Number(year);
  const parsedMonth = Number(month);

  if (!Number.isFinite(parsedYear) || !Number.isFinite(parsedMonth)) {
    return date;
  }

  const label = MONTH_LABEL_FORMATTER.format(
    new Date(parsedYear, parsedMonth - 1, 1),
  );

  return label.charAt(0).toUpperCase() + label.slice(1);
}
