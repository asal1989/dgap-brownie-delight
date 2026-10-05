import Link from "next/link";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

export type ButtonVariant = "primary" | "caramel" | "outline" | "outline-light" | "ghost" | "light";
export type ButtonSize = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 rounded-sm font-bold uppercase tracking-[0.14em] transition-all duration-200 " +
  "active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 select-none whitespace-nowrap";

const variants: Record<ButtonVariant, string> = {
  primary: "bg-gold text-espresso hover:bg-[#dcae6d] hover:shadow-lift",
  caramel: "bg-gold text-espresso hover:bg-[#dcae6d] hover:shadow-lift",
  outline: "border border-gold/60 text-heading hover:border-gold hover:bg-gold hover:text-espresso",
  "outline-light": "border border-cream/50 text-cream hover:border-cream hover:bg-cream hover:text-espresso",
  ghost: "text-heading hover:bg-panel2",
  light: "bg-cream text-espresso hover:bg-white hover:shadow-lift",
};

const sizes: Record<ButtonSize, string> = {
  sm: "min-h-10 px-5 text-[11px]",
  md: "min-h-12 px-7 text-xs",
  lg: "min-h-14 px-9 text-xs sm:text-[13px]",
};

export function buttonClasses(variant: ButtonVariant = "primary", size: ButtonSize = "md", extra?: string) {
  return cn(base, variants[variant], sizes[size], extra);
}

interface CommonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: ReactNode;
}

export function Button({
  variant,
  size,
  className,
  children,
  type = "button",
  ...rest
}: CommonProps & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type={type} className={buttonClasses(variant, size, className)} {...rest}>
      {children}
    </button>
  );
}

export function ButtonLink({
  variant,
  size,
  className,
  children,
  href,
  external,
  ...rest
}: CommonProps & { href: string; external?: boolean } & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href">) {
  const cls = buttonClasses(variant, size, className);
  if (external) {
    return (
      <a href={href} className={cls} target="_blank" rel="noopener noreferrer" {...rest}>
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={cls} {...rest}>
      {children}
    </Link>
  );
}
