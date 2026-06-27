import Link from "next/link";
import { type ButtonHTMLAttributes, type ReactNode } from "react";

type Variant = "primary" | "secondary" | "danger" | "ghost";

const variants: Record<Variant, string> = {
  primary:
    "bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 shadow-sm",
  secondary:
    "bg-white text-blue-700 border-2 border-blue-200 hover:bg-blue-50",
  danger: "bg-red-50 text-red-700 border border-red-200 hover:bg-red-100",
  ghost: "bg-transparent text-slate-600 hover:bg-slate-100",
};

const focusClass =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  children: ReactNode;
  fullWidth?: boolean;
}

export function Button({
  variant = "primary",
  children,
  fullWidth,
  className = "",
  ...props
}: ButtonProps) {
  return (
    <button
      className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl px-5 text-base font-semibold transition-colors disabled:opacity-50 ${focusClass} ${variants[variant]} ${fullWidth ? "w-full" : ""} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

interface ButtonLinkProps {
  href: string;
  variant?: Variant;
  children: ReactNode;
  fullWidth?: boolean;
  className?: string;
}

export function ButtonLink({
  href,
  variant = "primary",
  children,
  fullWidth,
  className = "",
}: ButtonLinkProps) {
  return (
    <Link
      href={href}
      className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl px-5 text-base font-semibold transition-colors ${focusClass} ${variants[variant]} ${fullWidth ? "w-full" : ""} ${className}`}
    >
      {children}
    </Link>
  );
}
