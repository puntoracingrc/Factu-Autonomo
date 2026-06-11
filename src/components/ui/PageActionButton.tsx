import { type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/Button";

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";

interface PageActionButtonProps {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  variant?: ButtonVariant;
  className?: string;
}

/** Acción principal secundaria a ancho completo (p. ej. unificar registros). */
export function PageActionButton({
  icon: Icon,
  label,
  onClick,
  variant = "secondary",
  className = "mb-6",
}: PageActionButtonProps) {
  return (
    <Button
      onClick={onClick}
      fullWidth
      variant={variant}
      className={`gap-2 ${className}`}
    >
      <Icon className="h-5 w-5" />
      {label}
    </Button>
  );
}
