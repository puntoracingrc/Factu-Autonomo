import type { ReactNode } from "react";

type FormSectionVariant = "search" | "fields";

const VARIANT_CLASS: Record<FormSectionVariant, string> = {
  search: "border-sky-100 bg-sky-50/70",
  fields: "border-slate-200 bg-slate-50/50",
};

interface FormSectionProps {
  title: string;
  hint?: string;
  variant?: FormSectionVariant;
  children: ReactNode;
  className?: string;
}

/** Bloque visual dentro de un formulario (buscar vs completar datos). */
export function FormSection({
  title,
  hint,
  variant = "fields",
  children,
  className = "",
}: FormSectionProps) {
  const headingId = title.replace(/\s+/g, "-").toLowerCase();

  return (
    <section
      className={`rounded-xl border p-4 ${VARIANT_CLASS[variant]} ${className}`}
      aria-labelledby={headingId}
    >
      <header className="mb-4 border-b border-slate-200/70 pb-3">
        <h3
          id={headingId}
          className="text-sm font-bold tracking-tight text-slate-900"
        >
          {title}
        </h3>
        {hint ? (
          <p className="mt-1 text-xs leading-relaxed text-slate-500">{hint}</p>
        ) : null}
      </header>
      <div className="space-y-4">{children}</div>
    </section>
  );
}
