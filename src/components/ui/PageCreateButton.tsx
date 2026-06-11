import { type LucideIcon } from "lucide-react";
import { ButtonLink } from "@/components/ui/Button";

interface PageCreateButtonProps {
  href: string;
  icon: LucideIcon;
  label: string;
}

/** Botón principal de creación, mismo estilo que «Nuevo cliente». */
export function PageCreateButton({
  href,
  icon: Icon,
  label,
}: PageCreateButtonProps) {
  return (
    <ButtonLink href={href} fullWidth className="mb-6 gap-2">
      <Icon className="h-5 w-5" />
      {label}
    </ButtonLink>
  );
}
