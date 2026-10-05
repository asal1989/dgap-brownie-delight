export interface CartLine {
  productId: string;
  slug: string;
  name: string;
  price: number;
  image: string | null;
  quantity: number;
}

/** Serializable product shape passed to client components. */
export interface ProductCardData {
  id: string;
  slug: string;
  name: string;
  shortDescription: string | null;
  price: number;
  compareAtPrice: number | null;
  image: string | null;
  stock: number;
  rating: number | null;
  reviewCount: number;
  categoryName?: string;
  isBestSeller?: boolean;
  isSample?: boolean;
}

export interface BoxProduct {
  id: string;
  slug: string;
  name: string;
  price: number;
  image: string | null;
  stock: number;
}

export type ActionResult<T = undefined> =
  | { ok: true; data?: T; message?: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };
