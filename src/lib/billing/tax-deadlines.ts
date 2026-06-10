/**
 * Plazos orientativos IVA trimestral (modelo 303) para autónomos en España.
 * Presentación habitual: días 1–20 del mes siguiente al trimestre
 * (abril, julio, octubre; enero del año siguiente para T4).
 */

export interface TaxDeadline {
  quarter: 1 | 2 | 3 | 4;
  year: number;
  model: "IVA 303";
  dueMonth: number;
  dueDay: number;
  label: string;
}

export function quarterlyIvaDeadlines(year: number): TaxDeadline[] {
  return [
    {
      quarter: 1,
      year,
      model: "IVA 303",
      dueMonth: 4,
      dueDay: 20,
      label: `1.er trimestre ${year}`,
    },
    {
      quarter: 2,
      year,
      model: "IVA 303",
      dueMonth: 7,
      dueDay: 20,
      label: `2.º trimestre ${year}`,
    },
    {
      quarter: 3,
      year,
      model: "IVA 303",
      dueMonth: 10,
      dueDay: 20,
      label: `3.er trimestre ${year}`,
    },
    {
      quarter: 4,
      year,
      model: "IVA 303",
      dueMonth: 1,
      dueDay: 20,
      label: `4.º trimestre ${year}`,
    },
  ];
}

function deadlineDate(deadline: TaxDeadline): Date {
  const dueYear = deadline.quarter === 4 ? deadline.year + 1 : deadline.year;
  return new Date(dueYear, deadline.dueMonth - 1, deadline.dueDay);
}

export function upcomingIvaDeadline(
  reference = new Date(),
): (TaxDeadline & { daysLeft: number; dueDate: Date }) | null {
  const years = [reference.getFullYear() - 1, reference.getFullYear(), reference.getFullYear() + 1];
  const candidates = years.flatMap((y) => quarterlyIvaDeadlines(y));

  const future = candidates
    .map((deadline) => {
      const dueDate = deadlineDate(deadline);
      const daysLeft = Math.ceil(
        (dueDate.getTime() - reference.getTime()) / (1000 * 60 * 60 * 24),
      );
      return { ...deadline, daysLeft, dueDate };
    })
    .filter((item) => item.daysLeft >= 0)
    .sort((a, b) => a.daysLeft - b.daysLeft);

  return future[0] ?? null;
}

export function shouldShowDeadlineReminder(
  daysLeft: number,
  windowDays = 25,
): boolean {
  return daysLeft <= windowDays;
}
