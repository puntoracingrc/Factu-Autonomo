import { FactuManualLogo } from "@/components/manual/FactuManualLogo";

interface ManualPageHeaderProps {
  title: string;
  subtitle?: string;
  badge?: string;
}

export function ManualPageHeader({
  title,
  subtitle,
  badge = "Manual de usuario",
}: ManualPageHeaderProps) {
  return (
    <header className="mb-6 flex gap-4">
      <FactuManualLogo size="lg" />
      <div className="min-w-0 pt-0.5">
        <p className="text-xs font-bold uppercase tracking-wide text-blue-600">
          Factu · {badge}
        </p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-1 text-base text-slate-500">{subtitle}</p>
        )}
      </div>
    </header>
  );
}
