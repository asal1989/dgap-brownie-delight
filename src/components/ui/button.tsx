import Link from "next/link";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

export type ButtonVariant = "primary" | "caramel" | "outline" | "outline-light" | "ghost" | "light";
export type ButtonSize = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 rounded-full font-semibold tracking-wide transition-all duration-200 " +
  "active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 select-none whitespace-nowrap";

const variants: Record<ButtonVariant, string> = {
  primary: "bg-choc text-cream hover:bg-espresso hover:shadow-lift",
  caramel: "bg-caramel text-white hover:bg-[#9e5f27] hover:shadow-lift",
  outline: "border-2 border-choc text-choc hover:bg-choc hover:text-cream",
  "outline-light": "border-2 border-cream/70 text-cream hover:bg-cream hover:text-choc",
  ghost: "text-choc hover:bg-beige/60",
  light: "bg-cream text-choc hover:bg-white hover:shadow-lift",
};

const sizes: Record<ButtonSize, string> = {
  sm: "min-h-10 px-4 text-xs",
  md: "min-h-12 px-6 text-sm",
  lg: "min-h-14 px-8 text-sm sm:text-base",
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
