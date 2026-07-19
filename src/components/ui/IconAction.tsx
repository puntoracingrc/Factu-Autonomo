"use client";

import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";

function actionShellClass(className?: string) {
  return `group relative flex min-h-11 shrink-0 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-xl px-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 sm:min-w-11 sm:px-0 ${className ?? ""}`;
}

function TooltipBubble({ text }: { text: string }) {
  return (
    <span
      role="tooltip"
      className="pointer-events-none absolute bottom-[calc(100%+6px)] left-1/2 z-20 hidden max-w-72 -translate-x-1/2 whitespace-normal rounded-lg bg-slate-800 px-2.5 py-1 text-center text-xs font-medium text-white opacity-0 shadow-md transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100 sm:inline-block"
    >
      {text}
      <span
        aria-hidden
        className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-slate-800"
      />
    </span>
  );
}

function MobileLabel({ text }: { text: string }) {
  return (
    <span className="max-w-[4.5rem] truncate text-center text-[10px] font-semibold leading-tight sm:hidden">
      {text}
    </span>
  );
}

type IconActionCommon = {
  label: string;
  tooltip?: string;
  showTooltip?: boolean;
  children: ReactNode;
  className?: string;
};

export function IconActionButton({
  label,
  tooltip,
  showTooltip = true,
  children,
  className,
  title,
  ...props
}: IconActionCommon & ButtonHTMLAttributes<HTMLButtonElement>) {
  const tip = tooltip ?? label;

  return (
    <button
      type="button"
      aria-label={tip}
      title={showTooltip ? (title ?? tip) : undefined}
      className={actionShellClass(className)}
      {...props}
    >
      {showTooltip && <TooltipBubble text={tip} />}
      {children}
      <MobileLabel text={label} />
    </button>
  );
}

export function IconActionLink({
  label,
  tooltip,
  showTooltip = true,
  children,
  className,
  href,
}: IconActionCommon & { href: string }) {
  const tip = tooltip ?? label;

  return (
    <Link
      href={href}
      aria-label={tip}
      title={showTooltip ? tip : undefined}
      className={actionShellClass(className)}
    >
      {showTooltip && <TooltipBubble text={tip} />}
      {children}
      <MobileLabel text={label} />
    </Link>
  );
}
