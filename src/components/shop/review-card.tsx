import { Quote } from "lucide-react";
import { RatingStars } from "@/components/ui/primitives";

export function ReviewCard({
  name,
  rating,
  text,
  productName,
  date,
}: {
  name: string;
  rating: number;
  text: string;
  productName?: string;
  date?: Date;
}) {
  return (
    <figure className="flex h-full flex-col rounded-3xl border border-beige bg-white p-6">
      <Quote className="size-7 text-gold" aria-hidden />
      <RatingStars rating={rating} />
      <blockquote className="mt-3 flex-1 text-pretty text-ink/80">{text}</blockquote>
      <figcaption className="mt-5 flex items-center gap-3">
        <span aria-hidden className="grid size-10 place-items-center rounded-full bg-choc font-display text-gold">
          {name.charAt(0).toUpperCase()}
        </span>
        <span className="text-sm">
          <span className="block font-semibold text-choc">{name}</span>
          <span className="text-xs text-ink/70">
            {productName ? `${productName}` : "Customer review"}
            {date ? ` · ${date.toLocaleDateString("en-IN", { month: "short", year: "numeric" })}` : ""}
          </span>
        </span>
      </figcaption>
    </figure>
  );
}
