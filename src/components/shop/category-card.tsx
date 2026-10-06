import { LabelTile } from "@/components/shop/label-tile";

export function CategoryCard({ name, slug, image, description }: { name: string; slug: string; image: string | null; description: string | null }) {
  return <LabelTile href={`/categories/${slug}`} label={name} image={image} sub={description} />;
}
