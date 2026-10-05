import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";

export function Logo({ logo, brandName, tone = "dark", className }: { logo?: string; brandName: string; tone?: "dark" | "light"; className?: string }) {
  return (
    <Link href="/" title={brandName} className={cn("flex items-center gap-2.5", className)}>
      {logo ? (
        <Image src={logo} alt="" width={40} height={40} className="size-10 rounded-full object-cover" unoptimized={logo.endsWith(".svg")} />
      ) : (
        <span
          aria-hidden
          className={cn(
            "grid size-10 place-items-center rounded-full font-display text-lg font-bold",
            "bg-gold text-espresso",
          )}
        >
          D
        </span>
      )}
      <span className="flex flex-col leading-none">
        <span className={cn("font-display text-xl font-bold tracking-wide", tone === "light" ? "text-cream" : "text-heading")}>DGAP</span>
        <span className={cn("mt-0.5 text-[10px] font-bold uppercase tracking-[0.28em]", "text-gold")}>
          Brownie Delight
        </span>
      </span>
    </Link>
  );
}
